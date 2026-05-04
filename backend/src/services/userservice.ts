import { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { connection } from "../config/mysql.js";
import { hashPassword } from "../lib/passwordhash.js";
import { generateTicketCode } from "../lib/ticketgenerator.js";
import { AuthPayload } from "../middleware/authmiddleware.js";
import { invalidateCache, withCache } from "../utils/cache.js";

// ─── Constants ────────────────────────────────────────────────────────────────
const BOATS_TTL   = 300;
const BOOKING_TTL = 60;
const HISTORY_TTL = 120;
const PROFILE_TTL = 300;
const MATRIX_TTL  = 120;

const REPEAT_INTERACTION_PENALTY = 0.40;
const BOOKED_PENALTY             = 0.12;
const DECAY_HALF_LIFE_DAYS       = 30;
const MIN_SIMILARITY             = 0.10;
const MAX_NEIGHBOURS             = 50;

// ─── Types ────────────────────────────────────────────────────────────────────
export type InteractionType = "book" | "click" | "search";

type UserVector     = Record<string, number>;
type UserBoatMatrix = Record<string, UserVector>;

interface BoatRow extends RowDataPacket {
  boat_id:              string;
  boat_name:            string;
  vessel_type:          string;
  image:                string;
  capacity_information: string;
  route_from:           string;
  route_to:             string;
  schedules:            string | object[];
  ticket_price:         number;
  operatorName:         string;
  bookingCount?:        number;
  score?:               number;
}

interface ScoredBoatRow extends BoatRow {
  score: number;
}

const INTERACTION_WEIGHTS: Record<InteractionType, number> = {
  book:   3.0,
  click:  1.0,
  search: 0.5,
};

// ─── Logger ───────────────────────────────────────────────────────────────────
async function insertLog(
  action_type: string,
  user_id:     number | null,
  role:        string | null,
  user_agent:  string | null
) {
  try {
    await connection.execute(
      `INSERT INTO system_logs (user_id, role, action_type, user_agent)
       VALUES (?, ?, ?, ?)`,
      [user_id, role, action_type, user_agent]
    );
  } catch (logErr) {
    console.error("Failed to write system log:", logErr);
  }
}

// ─── Cosine similarity ────────────────────────────────────────────────────────
function cosineSimilarity(vecA: UserVector, vecB: UserVector): number {
  let dot = 0, magA = 0, magB = 0;
  for (const key in vecA) {
    magA += vecA[key] * vecA[key];
    if (vecB[key] !== undefined) dot += vecA[key] * vecB[key];
  }
  for (const key in vecB) magB += vecB[key] * vecB[key];
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Time decay ───────────────────────────────────────────────────────────────
function decayWeight(createdAt: Date | string | null): number {
  if (!createdAt) return 1.0;
  const ageMs   = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, ageDays / DECAY_HALF_LIFE_DAYS);
}

// ─── L2 normalise ─────────────────────────────────────────────────────────────
function l2Normalise(raw: Record<string, number>): UserVector {
  let mag = 0;
  for (const k in raw) mag += raw[k] * raw[k];
  if (mag === 0) return {};
  const scale = 1 / Math.sqrt(mag);
  const out: UserVector = {};
  for (const k in raw) out[k] = raw[k] * scale;
  return out;
}

// ─── All Boats ────────────────────────────────────────────────────────────────
export async function getAllBoats(): Promise<BoatRow[]> {
  return withCache("boats:all", BOATS_TTL, async () => {
    const [boats] = await connection.execute<BoatRow[]>(
      `SELECT b.boat_id, b.boat_name, b.vessel_type, b.image, b.schedules,
              b.capacity_information, b.route_from, b.route_to,
              b.ticket_price,
              CONCAT(bo.firstName, ' ', bo.lastName) AS operatorName
       FROM boats b
       INNER JOIN boatoperators bo ON b.operator_id = bo.operator_id
       WHERE b.registration_status = 'verified' AND b.status = 'active'`
    );
    return boats.map(boat => ({
      ...boat,
      schedules:
        typeof boat.schedules === "string"
          ? JSON.parse(boat.schedules)
          : boat.schedules ?? [],
    }));
  });
}

// ─── Track interaction ────────────────────────────────────────────────────────
export async function trackInteraction(
  userId:      number,
  boatId:      number,
  type:        InteractionType,
  routeQuery?: string
): Promise<void> {
  if (!boatId || boatId === 0) return;
  try {
    await connection.execute(
      `INSERT INTO user_interactions (user_id, boat_id, interaction_type, route_query)
       VALUES (?, ?, ?, ?)`,
      [userId, boatId, type, routeQuery ?? null]
    );
    await invalidateCache(
      `interactions:weighted:${userId}`,
      `cf:matrix:all`,
      `user:booked:${userId}`
    );
  } catch (err) {
    console.error("[trackInteraction] non-fatal:", err);
  }
}

// ─── Build global user-boat matrix ───────────────────────────────────────────
async function buildDecayedMatrix(): Promise<{
  matrix:        UserBoatMatrix;
  rawPopularity: Record<string, number>;
  validBoatIds:  Set<string>;
}> {
  return withCache("cf:matrix:all", MATRIX_TTL, async () => {
    const [boatIdRows] = await connection.execute<RowDataPacket[]>(
      `SELECT boat_id FROM boats
       WHERE registration_status = 'verified' AND status = 'active'`
    );
    const validBoatIds = new Set<string>(boatIdRows.map(r => String(r.boat_id)));

    const rawMatrix:     Record<string, Record<string, number>> = {};
    const rawPopularity: Record<string, number>                 = {};

    const [bookingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT fk_booking_userId AS user_id, fk_booking_boatId AS boat_id
       FROM bookings
       WHERE bookingstatus IN ('completed', 'accepted')
         AND fk_booking_boatId IS NOT NULL
         AND fk_booking_boatId > 0`
    );

    for (const row of bookingRows) {
      const uid = String(row.user_id);
      const bid = String(row.boat_id);
      if (!validBoatIds.has(bid)) continue;
      if (!rawMatrix[uid]) rawMatrix[uid] = {};
      rawMatrix[uid][bid]  = (rawMatrix[uid][bid]  ?? 0) + INTERACTION_WEIGHTS.book;
      rawPopularity[bid]   = (rawPopularity[bid]   ?? 0) + INTERACTION_WEIGHTS.book;
    }

    const [interactionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT user_id, boat_id, interaction_type, created_at
       FROM user_interactions
       WHERE boat_id IS NOT NULL AND boat_id > 0`
    );

    for (const row of interactionRows) {
      const uid    = String(row.user_id);
      const bid    = String(row.boat_id);
      if (!validBoatIds.has(bid)) continue;
      const base   = INTERACTION_WEIGHTS[row.interaction_type as InteractionType] ?? 0;
      const weight = base * decayWeight(row.created_at);
      if (!rawMatrix[uid]) rawMatrix[uid] = {};
      rawMatrix[uid][bid]  = (rawMatrix[uid][bid]  ?? 0) + weight;
      rawPopularity[bid]   = (rawPopularity[bid]   ?? 0) + weight;
    }

    const matrix: UserBoatMatrix = {};
    for (const uid in rawMatrix) {
      matrix[uid] = l2Normalise(rawMatrix[uid]);
    }

    return { matrix, rawPopularity, validBoatIds };
  });
}

// ─── Weighted + decay CF recommendations ─────────────────────────────────────
export async function getRecommendedBoatsWeighted(
  userId: string,
  limit  = 6
): Promise<BoatRow[]> {
  const [{ matrix, rawPopularity, validBoatIds }, allBoats, bookedBoatIds] =
    await Promise.all([
      buildDecayedMatrix(),
      getAllBoats(),
      withCache(`user:booked:${userId}`, BOOKING_TTL, async () => {
        const [rows] = await connection.execute<RowDataPacket[]>(
          `SELECT DISTINCT fk_booking_boatId AS boat_id
           FROM bookings
           WHERE fk_booking_userId = ?
             AND bookingstatus IN ('completed', 'accepted', 'pending')
             AND fk_booking_boatId IS NOT NULL`,
          [userId]
        );
        return new Set<string>(rows.map(r => String(r.boat_id)));
      }),
    ]);

  const boatMap = new Map<string, BoatRow>(
    (allBoats as BoatRow[])
      .filter(b => validBoatIds.has(String(b.boat_id)))
      .map(b => [String(b.boat_id), b])
  );

  const currentVec       = matrix[userId] ?? {};
  const interactedByUser = new Set(Object.keys(currentVec));
  const hasHistory       = interactedByUser.size > 0;

  if (!hasHistory) {
    return (allBoats as BoatRow[])
      .filter(b => validBoatIds.has(String(b.boat_id)))
      .map(b => ({ ...b, score: rawPopularity[String(b.boat_id)] ?? 0 }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
  }

  const neighbours: Array<{ uid: string; sim: number }> = [];
  for (const otherUid in matrix) {
    if (otherUid === userId) continue;
    const sim = cosineSimilarity(currentVec, matrix[otherUid]);
    if (sim >= MIN_SIMILARITY) neighbours.push({ uid: otherUid, sim });
  }
  neighbours.sort((a, b) => b.sim - a.sim);
  const topNeighbours = neighbours.slice(0, MAX_NEIGHBOURS);

  const boatScore: Record<string, number> = {};
  for (const { uid, sim } of topNeighbours) {
    for (const bid in matrix[uid]) {
      if (!boatMap.has(bid)) continue;
      boatScore[bid] = (boatScore[bid] ?? 0) + sim * matrix[uid][bid];
    }
  }

  if (topNeighbours.length === 0) {
    return (allBoats as BoatRow[])
      .filter(b => {
        const bid = String(b.boat_id);
        return validBoatIds.has(bid) && !(bookedBoatIds as Set<string>).has(bid);
      })
      .map(b => ({ ...b, score: rawPopularity[String(b.boat_id)] ?? 0 }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
  }

  const penaltyFor = (bid: string): number => {
    if ((bookedBoatIds as Set<string>).has(bid)) return BOOKED_PENALTY;
    if (interactedByUser.has(bid))               return REPEAT_INTERACTION_PENALTY;
    return 1.0;
  };

  const scored: ScoredBoatRow[] = Array.from(boatMap.values())
    .map((boat): ScoredBoatRow | undefined => {
      const bid     = String(boat.boat_id);
      const cfScore = boatScore[bid];
      if (cfScore === undefined && !interactedByUser.has(bid) && !(bookedBoatIds as Set<string>).has(bid)) {
        return undefined;
      }
      return { ...boat, score: (cfScore ?? 0) * penaltyFor(bid) };
    })
    .filter((b): b is ScoredBoatRow => b !== undefined)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (scored.length < limit) {
    const scoredIds = new Set(scored.map(b => String(b.boat_id)));
    const popular   = (allBoats as BoatRow[])
      .filter(b => {
        const bid = String(b.boat_id);
        return (
          validBoatIds.has(bid) &&
          !scoredIds.has(bid) &&
          !(bookedBoatIds as Set<string>).has(bid) &&
          !interactedByUser.has(bid)
        );
      })
      .map(b => ({ ...b, score: rawPopularity[String(b.boat_id)] ?? 0 }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit - scored.length);
    return [...scored, ...popular];
  }

  return scored;
}

// ─── Legacy CF ────────────────────────────────────────────────────────────────
async function buildUserBoatMatrix(): Promise<Record<string, Record<string, number>>> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT fk_booking_userId AS user_id, fk_booking_boatId AS boat_id
     FROM bookings
     WHERE bookingstatus IN ('completed', 'accepted')`
  );
  const matrix: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    const uid = String(row.user_id);
    const bid = String(row.boat_id);
    if (!matrix[uid]) matrix[uid] = {};
    matrix[uid][bid] = 1;
  }
  return matrix;
}

export async function getRecommendedBoats(userId: string, limit = 6): Promise<BoatRow[]> {
  const [matrix, allBoats] = await Promise.all([buildUserBoatMatrix(), getAllBoats()]);
  const currentUserVec     = matrix[userId] ?? {};
  const hasHistory         = Object.keys(currentUserVec).length > 0;

  const popularityMap: Record<string, number> = {};
  for (const uid in matrix)
    for (const bid in matrix[uid])
      popularityMap[bid] = (popularityMap[bid] ?? 0) + 1;

  if (!hasHistory) {
    return (allBoats as BoatRow[])
      .map(b => ({ ...b, bookingCount: popularityMap[String(b.boat_id)] ?? 0 }))
      .sort((a, b) => (b.bookingCount ?? 0) - (a.bookingCount ?? 0))
      .slice(0, limit);
  }

  const boatScore: Record<string, number> = {};
  for (const otherUserId in matrix) {
    if (otherUserId === userId) continue;
    const sim = cosineSimilarity(currentUserVec, matrix[otherUserId]);
    if (sim <= 0) continue;
    for (const boatId in matrix[otherUserId]) {
      if (currentUserVec[boatId]) continue;
      boatScore[boatId] = (boatScore[boatId] ?? 0) + sim;
    }
  }

  const boatMap = new Map<string, BoatRow>(
    (allBoats as BoatRow[]).map(b => [String(b.boat_id), b])
  );

  const scored = Object.entries(boatScore)
    .map(([boatId]) => boatMap.get(boatId))
    .filter((b): b is BoatRow => b !== undefined)
    .slice(0, limit);

  if (scored.length < limit) {
    const scoredIds = new Set(scored.map(b => String(b.boat_id)));
    const popular   = (allBoats as BoatRow[])
      .filter(b => !scoredIds.has(String(b.boat_id)) && !currentUserVec[String(b.boat_id)])
      .map(b => ({ ...b, bookingCount: popularityMap[String(b.boat_id)] ?? 0 }))
      .sort((a, b) => (b.bookingCount ?? 0) - (a.bookingCount ?? 0))
      .slice(0, limit - scored.length);
    return [...scored, ...popular];
  }

  return scored;
}

// ─── Search ───────────────────────────────────────────────────────────────────
export async function searchrouteandtime(query: any = {}) {
  const routeFrom     = query.routeFrom     ?? null;
  const routeTo       = query.routeTo       ?? null;
  const departureTime = query.departureTime ?? null;
  const arrivalTime   = query.arrivalTime   ?? null;

  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT
      b.boat_id, b.boat_name, b.vessel_type, b.capacity_information,
      b.route_from, b.route_to, b.schedules, b.ticket_price, b.status,
      CONCAT(bo.firstName, ' ', bo.lastName) AS operatorName
     FROM boats b
     JOIN boatoperators bo ON b.operator_id = bo.operator_id
     WHERE b.status = 'active'
       AND b.registration_status = 'verified'
       AND (? IS NULL OR b.route_from LIKE CONCAT('%', ?, '%'))
       AND (? IS NULL OR b.route_to   LIKE CONCAT('%', ?, '%'))
     ORDER BY b.ticket_price ASC`,
    [routeFrom, routeFrom, routeTo, routeTo]
  );

  const parsed = rows.map(boat => ({
    ...boat,
    schedules:
      typeof boat.schedules === "string"
        ? JSON.parse(boat.schedules)
        : boat.schedules ?? [],
  }));

  if (!departureTime && !arrivalTime) return parsed;

  return parsed.filter(boat =>
    boat.schedules.some((slot: { departureTime: string; arrivalTime: string }) => {
      const depMatch = !departureTime || slot.departureTime === departureTime;
      const arrMatch = !arrivalTime   || slot.arrivalTime   === arrivalTime;
      return depMatch && arrMatch;
    })
  );
}

export async function bookBoatdetails(boatID: string) {
  return withCache(`bookboats:${boatID}`, BOATS_TTL, async () => {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT b.boat_id AS boatId, b.boat_name AS boatName, b.image,
              b.vessel_type AS vesselType, b.capacity_information AS capacity,
              b.operator_id AS operatorId, b.fk_boats_company_id AS companyId,
              c.companyName, CONCAT(bo.firstName, ' ', bo.lastName) AS operatorName,
              b.route_from AS departureLocation, b.route_to AS arrivalLocation,
              b.schedules, b.ticket_price AS ticketPrice
       FROM boats b
       JOIN boatoperators bo ON b.operator_id = bo.operator_id
       LEFT JOIN companies c ON b.fk_boats_company_id = c.company_id
       WHERE b.boat_id = ?`,
      [parseInt(boatID)]
    );
    if (!rows || rows.length === 0) throw { status: 404, message: "Boat not found" };
    const boat = rows[0];
    return {
      ...boat,
      schedules:
        typeof boat.schedules === "string"
          ? JSON.parse(boat.schedules)
          : boat.schedules ?? [],
    };
  });
}

// ─── Slot booking counts (for frontend seat display) ─────────────────────────
// Returns { "7:00 AM": 3, "9:00 AM": 12 } — active bookings per departure slot
// for a specific boat + trip date. Frontend uses this to show "X seats left".

// ─── Physical Booking Transaction ─────────────────────────────────────────────
//
//  Capacity logic:
//  1. Lock the boat row (FOR UPDATE) and read capacity_information from boats table.
//  2. Count active bookings for this boat WHERE trip_date = ? AND departure slot = ?.
//     This gives per-slot occupancy — not global across all dates/times.
//  3. If slot is full → 409. Otherwise insert booking with boatcapacity snapshot.
//
//  The bookings.boatcapacity column stores the total capacity at the time of
//  booking (snapshot). It does NOT change. Per-slot occupancy is always derived
//  live from COUNT(*) so it stays accurate across concurrent requests.
//
export async function physicalbookTransaction(
  userId:    number,
  body:      any,
  userRole:  string | null = null,
  userAgent: string | null = null
) {
  const {
    boatId, operatorId, companyId, routeFrom, routeTo,
    schedules, ticketPrice, boatName, tripDate,
  } = body;

  // schedules arriving from the frontend is the selected slot object:
  // { departureTime: "7:00 AM", arrivalTime: "8:00 AM" }
  const departureTime: string = schedules?.departureTime ?? "";
  const arrivalTime:   string = schedules?.arrivalTime   ?? "";

  while (true) {
    const ticketCode = generateTicketCode();
    const conn = await (connection as any).getConnection() as PoolConnection;

    try {
      await conn.beginTransaction();

      // ── 1. Lock boat row, read capacity from source of truth ──────────────
      const [boatRows] = await conn.execute(
        `SELECT capacity_information FROM boats WHERE boat_id = ? FOR UPDATE`,
        [boatId]
      ) as [RowDataPacket[], any];

      if (!boatRows || boatRows.length === 0) {
        await conn.rollback();
        conn.release();
        throw { status: 404, message: "Boat not found" };
      }

      const boatCapacity = Number(boatRows[0].capacity_information);

      // ── 2. Count active bookings for this specific date + slot ────────────
      //    JSON_UNQUOTE + JSON_EXTRACT reads the departureTime field from the
      //    stored JSON column so we match exactly the slot the user selected.
      const [countRows] = await conn.execute(
        `SELECT COUNT(*) AS activeBookings
         FROM bookings
         WHERE fk_booking_boatId = ?
           AND trip_date = ?
           AND JSON_UNQUOTE(JSON_EXTRACT(schedules, '$.departureTime')) = ?
           AND bookingstatus NOT IN ('cancelled')`,
        [boatId, tripDate, departureTime]
      ) as [RowDataPacket[], any];

      const activeBookings = Number(countRows[0].activeBookings);

      if (activeBookings >= boatCapacity) {
        await conn.rollback();
        conn.release();
        throw {
          status: 409,
          message: `This slot (${departureTime} → ${arrivalTime}) is fully booked`,
        };
      }

      const remainingSeats = boatCapacity - activeBookings; // informational only

      // ── 3. Insert booking — boatcapacity is a snapshot of total capacity ──
      const [result] = await conn.execute(
        `INSERT INTO bookings (
           ticketcode, fk_booking_userId, fk_booking_boatId,
           fk_booking_operatorId, fk_booking_companyId, boatName,
           booking_date, trip_date, route_from, route_to,
           schedules, payment_method, bookingstatus, boatstatus,
           total_price, boatcapacity
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ticketCode   || null,
          userId       || null,
          boatId       || null,
          operatorId   || null,
          companyId    || null,
          boatName     || null,
          new Date().toISOString().slice(0, 19).replace("T", " "),
          tripDate     || null,
          routeFrom    || null,
          routeTo      || null,
          JSON.stringify(schedules),   // stores { departureTime, arrivalTime }
          "physical",
          "pending",
          "active",
          ticketPrice  || null,
          boatCapacity,                // snapshot from boats.capacity_information
        ]
      );
      const bookingId = (result as any).insertId;

      // ── 4. Insert payment record ──────────────────────────────────────────
      await conn.execute(
        `INSERT INTO payments (payment_method, user_id, booking_id, amount, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          "physical",
          String(userId),
          String(bookingId),
          Number(ticketPrice) || 0,
          "pending",
          new Date().toISOString().slice(0, 19).replace("T", " "),
        ]
      );

      await conn.commit();
      conn.release();

      await invalidateCache(
        `bookings:pending:${userId}`,
        `bookings:history:${userId}`,
        `user:booked:${userId}`,
        `cf:matrix:all`,
        `boats:all`,
        `bookboats:${boatId}`,
        `operator:bookings:pending:${operatorId}`,
        `operator:bookings:history:${operatorId}`
      );

      await trackInteraction(userId, Number(boatId), "book");
      await insertLog("BOOK_TICKET", userId, userRole, userAgent);

      return { bookingId, ticketCode, remainingSeats: remainingSeats - 1 };

    } catch (err: any) {
      try { await conn.rollback(); } catch (_) {}
      conn.release();
      if (err.code === "ER_DUP_ENTRY") continue;
      await insertLog("BOOK_TICKET_FAILED", userId, userRole, userAgent);
      throw err;
    }
  }
}

// ─── Pending Bookings ─────────────────────────────────────────────────────────
export async function getPendingBookings(userID: number) {
  return withCache(`bookings:pending:${userID}`, BOOKING_TTL, async () => {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT booking_id, boatName, ticketcode, booking_date, trip_date,
              schedules, total_price, boatstatus
       FROM bookings
       WHERE fk_booking_userId = ? AND bookingstatus = 'pending'`,
      [userID]
    );
    return rows.map(row => ({
      ...row,
      schedules: (() => {
        const p =
          typeof row.schedules === "string" ? JSON.parse(row.schedules) : row.schedules ?? null;
        return Array.isArray(p) ? (p[0] ?? null) : p;
      })(),
    }));
  });
}

// ─── Accepted Bookings ────────────────────────────────────────────────────────
export async function getAcceptedBookings(userID: number) {
  return withCache(`bookings:accepted:${userID}`, BOOKING_TTL, async () => {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT booking_id, boatName, ticketcode, booking_date, trip_date,
              schedules, boatstatus, bookingstatus, total_price
       FROM bookings
       WHERE fk_booking_userId = ? AND bookingstatus = 'accepted'`,
      [userID]
    );
    return rows.map(row => ({
      ...row,
      schedules: (() => {
        const p =
          typeof row.schedules === "string" ? JSON.parse(row.schedules) : row.schedules ?? null;
        return Array.isArray(p) ? (p[0] ?? null) : p;
      })(),
    }));
  });
}

// ─── Current Booking Details ──────────────────────────────────────────────────
export async function getCurrentBookingDetails(userID: number, bookingId: string) {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT
       b.booking_id, fk_booking_operatorId AS operatorId,
       b.boatName, b.ticketcode, b.booking_date, b.trip_date,
       b.route_from, b.route_to, b.schedules, b.total_price,
       b.payment_method, b.bookingstatus,
       p.status AS payment_status, p.amount AS payment_amount,
       p.created_at AS payment_created_at
     FROM bookings b
     LEFT JOIN payments p
       ON CAST(p.booking_id AS CHAR) COLLATE utf8mb4_0900_ai_ci
        = CAST(b.booking_id AS CHAR) COLLATE utf8mb4_0900_ai_ci
     WHERE b.booking_id = ? AND b.fk_booking_userId = ?`,
    [bookingId, userID]
  );
  if (!rows[0]) throw new Error(`Booking ${bookingId} not found`);
  const row    = rows[0];
  const parsed =
    typeof row.schedules === "string" ? JSON.parse(row.schedules) : row.schedules ?? null;
  return { ...row, schedules: Array.isArray(parsed) ? (parsed[0] ?? null) : parsed };
}

// ─── Cancel Booking ───────────────────────────────────────────────────────────
export async function cancelBooking(
  userID:    number,
  bookingId: number,
  userRole:  string | null = null,
  userAgent: string | null = null
) {
  if (!userID || !bookingId) throw { status: 400, message: "Invalid request" };

  const [bookingRows] = await connection.execute<RowDataPacket[]>(
    `SELECT bo.user_id AS operatorUserId, b.fk_booking_boatId AS boatId
     FROM bookings b
     JOIN boatoperators bo ON b.fk_booking_operatorId = bo.operator_id
     WHERE b.booking_id = ? AND b.fk_booking_userId = ?`,
    [bookingId, userID]
  );

  const [result]: any = await connection.execute(
    `UPDATE bookings
     SET bookingstatus = 'cancelled'
     WHERE booking_id = ? AND fk_booking_userId = ? AND bookingstatus = 'pending'`,
    [bookingId, userID]
  );

  if (result.affectedRows === 0) {
    await insertLog("CANCEL_BOOKING_FAILED", userID, userRole, userAgent);
    throw { status: 404, message: "Booking not found, unauthorized, or not pending" };
  }

  const keysToInvalidate = [
    `bookings:pending:${userID}`,
    `bookings:history:${userID}`,
  ];

  if (bookingRows.length > 0) {
    const { operatorUserId, boatId } = bookingRows[0];
    keysToInvalidate.push(
      `operator:bookings:pending:${operatorUserId}`,
      `operator:bookings:history:${operatorUserId}`,
      `boats:all`,
      `bookboats:${boatId}`,
      `user:booked:${userID}`
    );
  }

  await invalidateCache(...keysToInvalidate);
  await insertLog("CANCEL_BOOKING", userID, userRole, userAgent);
  return { bookingId, status: "cancelled" };
}

// ─── Booking History ──────────────────────────────────────────────────────────
export async function getBookingHistory(userID: number) {
  return withCache(`bookings:history:${userID}`, HISTORY_TTL, async () => {
    const [rows]: any = await connection.query(
      `SELECT booking_id, boatName, ticketcode, booking_date AS bookDate,
              route_from, route_to, schedules, boatstatus, trip_date,
              total_price AS bookPrice, payment_method, bookingstatus AS status
       FROM bookings
       WHERE fk_booking_userId = ?
       ORDER BY booking_date DESC`,
      [userID]
    );
    return rows.map((row: any) => ({
      ...row,
      schedules: (() => {
        const p =
          typeof row.schedules === "string" ? JSON.parse(row.schedules) : row.schedules ?? null;
        return Array.isArray(p) ? (p[0] ?? null) : p;
      })(),
    }));
  });
}

// ─── User Profile ─────────────────────────────────────────────────────────────
export async function userCurrentDetails(userID: number) {
  return withCache(`user:profile:${userID}`, PROFILE_TTL, async () => {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT firstName, lastName, userName, email, password,
              phone_number, address, gender, birthdate
       FROM users WHERE user_id = ?`,
      [userID]
    );
    return rows[0];
  });
}

export async function confirmEditUser(body: {
  firstName: string; lastName: string; userName: string;
  email: string; password: string | null;
  phone_number: string; address: string; gender: string;
  birthdate: string; userId: number;
}) {
  try {
    if (body.password) {
      const hashed = await hashPassword(body.password);
      await connection.execute(
        `UPDATE users SET firstName=?, lastName=?, userName=?, email=?,
         password=?, phone_number=?, address=?, gender=?, birthdate=?
         WHERE user_id=?`,
        [
          body.firstName, body.lastName, body.userName, body.email,
          hashed, body.phone_number, body.address, body.gender,
          body.birthdate, body.userId,
        ]
      );
    } else {
      await connection.execute(
        `UPDATE users SET firstName=?, lastName=?, userName=?, email=?,
         phone_number=?, address=?, gender=?, birthdate=?
         WHERE user_id=?`,
        [
          body.firstName, body.lastName, body.userName, body.email,
          body.phone_number, body.address, body.gender, body.birthdate, body.userId,
        ]
      );
    }
    await invalidateCache(`user:profile:${body.userId}`, `user:${body.userId}`);
    return { message: "User updated successfully" };
  } catch (error: any) {
    if (error.status) throw error;
    throw { status: 500, message: "Failed to update user details" };
  }
}

// ─── Support & Refund ─────────────────────────────────────────────────────────
export async function submitTicket(body: any, userId: number) {
  const [rows] = await connection.execute(
    `INSERT INTO support_ticket (fk_support_userId, ticketSubject, detailedDescription, status)
     VALUES (?, ?, ?, ?)`,
    [userId, body.ticketSubject, body.detailedDescription, "pending"]
  );
  await invalidateCache("admin:tickets:pending");
  return rows;
}

export async function refundTicket(body: any, user: AuthPayload) {
  const { operatorId, image, message, ticketCode } = body;
  const { sub } = user;

  if (!operatorId || !ticketCode) throw { status: 400, message: "Missing required fields" };

  const [checkOp]: any = await connection.execute(
    `SELECT operator_id FROM boatoperators WHERE operator_id = ?`,
    [operatorId]
  );
  if (!Array.isArray(checkOp) || checkOp.length === 0)
    throw { status: 404, message: "Operator not found" };

  const [insert]: any = await connection.execute(
    `INSERT INTO requestrefund (ticketcode, operator_id, fk_refund_userId, imageproof, message, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [ticketCode, operatorId, sub, image, message, "pending"]
  );
  return { success: true, refundId: insert.insertId };
}

export async function getRefundTickets(userId: number) {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT r.request_id, r.ticketcode, r.operator_id,
            CONCAT(o.firstName,' ',o.lastName) AS operatorName,
            COALESCE(r.status, 'pending') AS status
     FROM requestrefund r
     LEFT JOIN boatoperators o ON r.operator_id = o.operator_id
     WHERE r.fk_refund_userId = ?
     ORDER BY r.request_id DESC`,
    [userId]
  );
  return rows;
}

export async function getSupportTickets(userId: number) {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT ticket_id, fk_support_adminId AS adminId, ticketSubject,
            COALESCE(status, 'open') AS status
     FROM support_ticket
     WHERE fk_support_userId = ?
     ORDER BY ticket_id DESC`,
    [userId]
  );
  return rows;
}

export async function getTicketDetails(ticketId: number, user: AuthPayload) {
  const { sub } = user;
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT t.ticket_id, t.ticketSubject, t.detailedDescription,
            t.status, t.fk_support_adminId AS adminId, t.adminReply
     FROM support_ticket t
     JOIN users u ON t.fk_support_userId = u.user_id
     WHERE t.ticket_id = ? AND t.fk_support_userId = ?`,
    [ticketId, sub]
  );
  return rows.length === 0 ? null : rows[0];
}

export async function getRefundDetails(refundId: number, user: AuthPayload) {
  const { sub } = user;
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT r.request_id, r.ticketcode, r.operator_id,
            CONCAT(o.firstName,' ',o.lastName) AS operatorName,
            r.imageproof, r.message, r.operatorreply, r.operatorimageproof,
            COALESCE(r.status, 'pending') AS status
     FROM requestrefund r
     LEFT JOIN boatoperators o ON r.operator_id = o.operator_id
     WHERE r.request_id = ? AND r.fk_refund_userId = ?`,
    [refundId, sub]
  );
  return rows.length === 0 ? null : rows[0];
}