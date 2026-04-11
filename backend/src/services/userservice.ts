import { connection } from "../config/mysql.js";
import { RowDataPacket } from "mysql2";
import { AuthPayload } from "../middleware/authmiddleware.js";
import { generateTicketCode } from "../lib/ticketgenerator.js";
import { hashPassword } from "../lib/passwordhash.js";
import { withCache, invalidateCache } from '../utils/cache.js';

const PROFILE_TTL = 300;
const HISTORY_TTL = 120;
const BOATS_TTL   = 300;
type UserBoatMatrix = Record<string, Record<string, number>>;
 
interface BoatRow extends RowDataPacket {
  boat_id: string;
  boat_name: string;
  vessel_type: string;
  image: string;
  capacity_information: string;
  route_from: string;
  route_to: string;
  schedules: string | object[];
  ticket_price: number;
  operatorName: string;
  bookingCount?: number; // populated by getPopularBoats
}
// ─── Logger Helper ──────────────────────────────────────────────────────────
async function insertLog(
  action_type: string,
  user_id: number | null,
  role: string | null,
  user_agent: string | null
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

// ─── Read-only (no logs needed) ─────────────────────────────────────────────
let matrix = {}

export async function getAllBoats() {
  return withCache('boats:all', BOATS_TTL, async () => {
    const [boats] = await connection.execute<BoatRow[]>(
      `SELECT b.boat_id, b.boat_name, b.vessel_type, b.image,
              b.capacity_information, b.route_from, b.route_to,
              b.schedules, b.ticket_price,
              CONCAT(bo.firstName, ' ', bo.lastName) AS operatorName
       FROM boats b
       INNER JOIN boatoperators bo ON b.operator_id = bo.operator_id
       WHERE b.registration_status = 'verified' AND b.status = 'active'`
    );
 
    return boats.map((boat) => ({
      ...boat,
      schedules:
        typeof boat.schedules === 'string'
          ? JSON.parse(boat.schedules)
          : (boat.schedules ?? []),
    }));
  });
}
 async function buildUserBoatMatrix(): Promise<UserBoatMatrix> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT fk_booking_userId AS user_id, fk_booking_boatId AS boat_id
     FROM bookings
     WHERE bookingstatus IN ('completed', 'accepted')`  // ← was 'status', correct column is 'bookingstatus'
  );

  const matrix: UserBoatMatrix = {};

  for (const row of rows) {
    const uid = String(row.user_id);
    const bid = String(row.boat_id);
    if (!matrix[uid]) matrix[uid] = {};
    matrix[uid][bid] = 1;
  }

  return matrix;
}
 
// ─── 3. Cosine similarity between two sparse vectors ─────────────────────────
 
function cosineSimilarity(
  vecA: Record<string, number>,
  vecB: Record<string, number>
): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
 
  for (const key in vecA) {
    magA += vecA[key] * vecA[key];
    if (vecB[key]) dot += vecA[key] * vecB[key];
  }
 
  for (const key in vecB) {
    magB += vecB[key] * vecB[key];
  }
 
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
 
// ─── 4. Main recommendation function ─────────────────────────────────────────
//
//  Strategy:
//    1. Find other users whose booking history is similar to the current user.
//    2. Collect boats those similar users have booked that the current user hasn't.
//    3. Score each candidate boat by the sum of similarity scores of users who booked it.
//    4. Fall back to popularity (total booking count) when the user has no history.
 
export async function getRecommendedBoats(
  userId: string,
  limit = 6
): Promise<BoatRow[]> {
  const [matrix, allBoats] = await Promise.all([
    buildUserBoatMatrix(),
    getAllBoats(),
  ]);
 
  const currentUserVec = matrix[userId] ?? {};
  const hasHistory = Object.keys(currentUserVec).length > 0;
 
  // Popularity fallback: count total bookings per boat across all users
  const popularityMap: Record<string, number> = {};
  for (const uid in matrix) {
    for (const bid in matrix[uid]) {
      popularityMap[bid] = (popularityMap[bid] ?? 0) + 1;
    }
  }
 
  if (!hasHistory) {
    // New user — return most popular boats the user hasn't explicitly booked
    return (allBoats as BoatRow[])
      .map((boat) => ({
        ...boat,
        bookingCount: popularityMap[String(boat.boat_id)] ?? 0,
      }))
      .sort((a, b) => (b.bookingCount ?? 0) - (a.bookingCount ?? 0))
      .slice(0, limit);
  }
 
  // Collaborative score: weighted sum of similarity from users who booked each boat
  const boatScore: Record<string, number> = {};
 
  for (const otherUserId in matrix) {
    if (otherUserId === userId) continue;
 
    const sim = cosineSimilarity(currentUserVec, matrix[otherUserId]);
    if (sim <= 0) continue;
 
    for (const boatId in matrix[otherUserId]) {
      // Only recommend boats the current user hasn't already booked
      if (currentUserVec[boatId]) continue;
      boatScore[boatId] = (boatScore[boatId] ?? 0) + sim;
    }
  }
 
  const boatMap = new Map<string, BoatRow>(
    (allBoats as BoatRow[]).map((b) => [String(b.boat_id), b])
  );
 
  const scored = Object.entries(boatScore)
    .map(([boatId, score]) => ({ boatId, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ boatId }) => boatMap.get(boatId))
    .filter((b): b is BoatRow => b !== undefined);
 
  // If collaborative filtering didn't find enough results, pad with popular boats
  if (scored.length < limit) {
    const scoredIds = new Set(scored.map((b) => String(b.boat_id)));
    const popular = (allBoats as BoatRow[])
      .filter(
        (b) =>
          !scoredIds.has(String(b.boat_id)) && !currentUserVec[String(b.boat_id)]
      )
      .map((boat) => ({
        ...boat,
        bookingCount: popularityMap[String(boat.boat_id)] ?? 0,
      }))
      .sort((a, b) => (b.bookingCount ?? 0) - (a.bookingCount ?? 0))
      .slice(0, limit - scored.length);
 
    return [...scored, ...popular];
  }
 
  return scored;
}

export async function searchrouteandtime(query: any = {}) {
  const routeFrom     = query.routeFrom     ?? null;
  const routeTo       = query.routeTo       ?? null;
  const departureTime = query.departureTime ?? null;
  const arrivalTime   = query.arrivalTime   ?? null;

  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT  
      b.boat_id,
      b.boat_name,
      b.vessel_type,
      b.capacity_information,
      b.route_from,
      b.route_to,
      b.schedules,
      b.ticket_price,
      b.status,
      CONCAT(bo.firstName, ' ', bo.lastName) AS operatorName
    FROM boats b
    JOIN boatoperators bo 
      ON b.operator_id = bo.operator_id
    WHERE 
      b.status = 'active'
      AND b.registration_status = 'verified'
      AND (? IS NULL OR b.route_from LIKE CONCAT('%', ?, '%'))
      AND (? IS NULL OR b.route_to   LIKE CONCAT('%', ?, '%'))
    ORDER BY b.ticket_price ASC`,
    [routeFrom, routeFrom, routeTo, routeTo]
  );

  const parsed = rows.map((boat) => ({
    ...boat,
    schedules: typeof boat.schedules === "string"
      ? JSON.parse(boat.schedules)
      : boat.schedules ?? [],
  }));

  if (!departureTime && !arrivalTime) return parsed;

  return parsed.filter((boat) =>
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
      `SELECT b.boat_id AS boatId, b.boat_name AS boatName,
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
    if (!rows || rows.length === 0) throw { status: 404, message: 'Boat not found' };
    const boat = rows[0];
    return {
      ...boat,
      schedules: typeof boat.schedules === 'string'
        ? JSON.parse(boat.schedules)
        : boat.schedules ?? [],
    };
  });
}

// ─── BOOK (physical) ────────────────────────────────────────────────────────
export async function physicalbookTransaction(
  userID: number,
  body: any,
  userRole: string | null = null,
  userAgent: string | null = null
) {
  const { boatId, operatorId, companyId, routeFrom, routeTo,
          schedules, ticketPrice, boatName, tripDate } = body;

  while (true) {
    const ticketCode = generateTicketCode();
    try {
      const [result] = await connection.execute(
        `INSERT INTO bookings (
          ticketcode, fk_booking_userId, fk_booking_boatId,
          fk_booking_operatorId, fk_booking_companyId, boatName,
          booking_date, trip_date, route_from, route_to,
          schedules, payment_method, bookingstatus, boatstatus, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ticketCode || null, userID || null, boatId || null,
         operatorId || null, companyId || null, boatName || null,
         new Date().toISOString().slice(0, 19).replace('T', ' '),
         tripDate || null, routeFrom || null, routeTo || null,
         JSON.stringify(schedules), 'physical', 'pending', 'active',
         ticketPrice || null]
      );

      const bookingId = (result as any).insertId;

      await connection.execute(
        `INSERT INTO payments (payment_method, user_id, booking_id, amount, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['physical', String(userID), String(bookingId),
         Number(ticketPrice) || 0, 'pending',
         new Date().toISOString().slice(0, 19).replace('T', ' ')]
      );

      // New booking:
      // - user's own pending + history caches are stale
      // - operator's pending + history caches are also stale (new booking appeared)
      await invalidateCache(
        `bookings:pending:${userID}`,
        `bookings:history:${userID}`,
        `operator:bookings:pending:${operatorId}`,
        `operator:bookings:history:${operatorId}`
      );
      console.log(`🗑️  Cache invalidated for user ${userID} and operator ${operatorId} after new booking`);

      await insertLog('BOOK_TICKET', userID, userRole, userAgent);
      return { bookingId, ticketCode };

    } catch (err: any) {
      if (err.code !== 'ER_DUP_ENTRY') {
        await insertLog('BOOK_TICKET_FAILED', userID, userRole, userAgent);
        throw err;
      }
    }
  }
}

// ─── GET PENDING BOOKINGS ────────────────────────────────────────────────────
const BOOKING_TTL = 60;

export async function getPendingBookings(userID: number) {
  return withCache(
    `bookings:pending:${userID}`,
    BOOKING_TTL,
    async () => {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT booking_id, boatName, ticketcode, booking_date, trip_date,
                schedules, total_price, boatstatus
         FROM bookings
         WHERE fk_booking_userId = ? AND bookingstatus = 'pending'`,
        [userID]
      );
    return rows.map((row) => ({
  ...row,
  schedules: (() => {
    const parsed = typeof row.schedules === 'string'
      ? JSON.parse(row.schedules)
      : row.schedules ?? null;
    // If it's an array, take the first slot; if already an object, use as-is
    return Array.isArray(parsed) ? (parsed[0] ?? null) : parsed;
  })(),
}));
    }
  );
}

export async function getAcceptedBookings(userID: number) {
  return withCache(
    `bookings:accepted:${userID}`,
    BOOKING_TTL,
    async () => {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT booking_id, boatName, ticketcode, booking_date, trip_date,
                schedules, boatstatus, bookingstatus, total_price
         FROM bookings
         WHERE fk_booking_userId = ? AND bookingstatus = 'accepted'`,
        [userID]
      );
     return rows.map((row) => ({
  ...row,
  schedules: (() => {
    const parsed = typeof row.schedules === 'string'
      ? JSON.parse(row.schedules)
      : row.schedules ?? null;
    // If it's an array, take the first slot; if already an object, use as-is
    return Array.isArray(parsed) ? (parsed[0] ?? null) : parsed;
  })(),
}));
    }
  );
}

export async function getCurrentBookingDetails(
  userID: number,
  bookingId: string
) {
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT 
        b.booking_id,
        fk_booking_operatorId AS operatorId,
        b.boatName,
        b.ticketcode,
        b.booking_date,
        b.trip_date,
        b.route_from,
        b.route_to,
        b.schedules,
        b.total_price,
        b.payment_method,
        b.bookingstatus,
        p.status        AS payment_status,
        p.amount        AS payment_amount,
        p.created_at    AS payment_created_at
      FROM bookings b
      LEFT JOIN payments p 
        ON CAST(p.booking_id AS CHAR) COLLATE utf8mb4_0900_ai_ci 
         = CAST(b.booking_id AS CHAR) COLLATE utf8mb4_0900_ai_ci
      WHERE b.booking_id = ?
        AND b.fk_booking_userId = ?`,
      [bookingId, userID]
    );

    if (!rows[0]) throw new Error(`Booking ${bookingId} not found`);

    // ✅ Single row, not an array
    const row = rows[0];
    const parsed = typeof row.schedules === 'string'
      ? JSON.parse(row.schedules)
      : row.schedules ?? null;

    return {
      ...row,
      // ✅ Unwrap array → first slot, or keep as object if already unwrapped
      schedules: Array.isArray(parsed) ? (parsed[0] ?? null) : parsed,
    };

  } catch (error) {
    console.error("Error fetching booking details:", error);
    throw new Error(`Failed to fetch booking ${bookingId}`);
  }
}
// ─── CANCEL BOOKING ──────────────────────────────────────────────────────────
export async function cancelBooking(
  userID: number,
  bookingId: number,
  userRole: string | null = null,
  userAgent: string | null = null
) {
  if (!userID || !bookingId) throw { status: 400, message: 'Invalid request' };

  try {
    // Fetch the operator's userId BEFORE cancelling so we can bust their cache
    const [bookingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT bo.user_id AS operatorUserId
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
      await insertLog('CANCEL_BOOKING_FAILED', userID, userRole, userAgent);
      throw { status: 404, message: 'Booking not found, unauthorized, or not pending' };
    }

    // Cancelled booking moves out of pending, history changes for both user and operator
    const keysToInvalidate = [
      `bookings:pending:${userID}`,
      `bookings:history:${userID}`,
    ];

    // Bust the operator's pending + history caches so they stop seeing the cancelled booking
    if (bookingRows.length > 0) {
      const operatorUserId = bookingRows[0].operatorUserId;
      keysToInvalidate.push(
        `operator:bookings:pending:${operatorUserId}`,
        `operator:bookings:history:${operatorUserId}`
      );
      console.log(`🗑️  Cache invalidated for operator ${operatorUserId} after user cancelled booking`);
    }

    await invalidateCache(...keysToInvalidate);
    console.log(`🗑️  Cache invalidated for user ${userID} after cancellation`);

    await insertLog('CANCEL_BOOKING', userID, userRole, userAgent);
    return { bookingId, status: 'cancelled' };

  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    throw error.status ? error : { status: 500, message: 'Failed to cancel booking' };
  }
}

// ─── GET BOOKING HISTORY ─────────────────────────────────────────────────────
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
   return rows.map((row : any) => ({
  ...row,
  schedules: (() => {
    const parsed = typeof row.schedules === 'string'
      ? JSON.parse(row.schedules)
      : row.schedules ?? null;
    // If it's an array, take the first slot; if already an object, use as-is
    return Array.isArray(parsed) ? (parsed[0] ?? null) : parsed;
  })(),
}));
  });
}

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
      const hashedPassword = await hashPassword(body.password);
      await connection.execute(
        `UPDATE users SET firstName=?, lastName=?, userName=?, email=?,
         password=?, phone_number=?, address=?, gender=?, birthdate=?
         WHERE user_id=?`,
        [body.firstName, body.lastName, body.userName, body.email,
         hashedPassword, body.phone_number, body.address,
         body.gender, body.birthdate, body.userId]
      );
    } else {
      await connection.execute(
        `UPDATE users SET firstName=?, lastName=?, userName=?, email=?,
         phone_number=?, address=?, gender=?, birthdate=?
         WHERE user_id=?`,
        [body.firstName, body.lastName, body.userName, body.email,
         body.phone_number, body.address,
         body.gender, body.birthdate, body.userId]
      );
    }

    await invalidateCache(
      `user:profile:${body.userId}`,
      `user:${body.userId}`, // bust the user's cache
    );

    console.log(`🗑️  Cache invalidated for user ${body.userId} after profile edit`);
    return { message: "User updated successfully" };
  } catch (error: any) {
    if (error.status) throw error; // re-throw known errors like the 400 above
    console.error(error);
    throw { status: 500, message: "Failed to update user details" };
  }
}

export async function submitTicket(body: any, userId: number) {
  try {
    const [rows] = await connection.execute(
      `INSERT INTO support_ticket 
       (fk_support_userId, ticketSubject, detailedDescription ,status) 
       VALUES (?, ?, ? ,?)`,
      [userId, body.ticketSubject, body.detailedDescription, "pending"]
    );

    // New ticket — bust admin's pending ticket list and count
    await invalidateCache('admin:tickets:pending');
    console.log(`🗑️  Cache invalidated for admin after user ${userId} submitted a support ticket`);

    return rows;

  } catch (error) {
    console.error(error);
    throw { status: 500, message: "Failed to submit ticket" };
  }
}

export async function refundTicket(body: any, user: AuthPayload) {
  const { operatorId, image, message, ticketCode } = body;
  const { sub } = user;

  if (!operatorId || !ticketCode) {
    throw { status: 400, message: "Missing required fields" };
  }

  // ✅ Operator check outside the insert try/catch so errors don't get swallowed
  const [checkOperatorExist]: any = await connection.execute(
    `SELECT operator_id FROM boatoperators WHERE operator_id = ?`,
    [operatorId]
  );

  if (!Array.isArray(checkOperatorExist) || checkOperatorExist.length === 0) {
    throw { status: 404, message: "Operator not found" };
  }

  try {
    const [insert]: any = await connection.execute(
      `INSERT INTO requestrefund 
      (ticketcode, operator_id, fk_refund_userId, imageproof, message, status) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [ticketCode, operatorId, sub, image, message, "pending"]
    );

    return { success: true, refundId: insert.insertId };

  } catch (error: any) {
    console.error("Refund error:", error);
    throw {
      status: error?.status || 500,
      message: error?.message || "Failed to submit refund",
    };
  }
}

export async function getRefundTickets(userId: number) {
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(`
      SELECT 
        r.request_id,
        r.ticketcode,
        r.operator_id,
        CONCAT(o.firstName,' ',o.lastName) AS operatorName,
        COALESCE(r.status, 'pending') AS status
      FROM requestrefund r
      LEFT JOIN boatoperators o 
      ON r.operator_id = o.operator_id
      WHERE r.fk_refund_userId = ?
      ORDER BY r.request_id DESC
    `, [userId]);

    return rows;

  } catch (error) {
    throw error;
  }
}

export async function getSupportTickets(userId: number) {
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(`
      SELECT
        ticket_id,
        fk_support_adminId AS adminId,
        ticketSubject,
        COALESCE(status, 'open') AS status
      FROM support_ticket
      WHERE fk_support_userId = ?
      ORDER BY ticket_id DESC
    `, [userId]);

    return rows;

  } catch (error) {
    throw error;
  }
}

export async function getTicketDetails(ticketId: number, user: AuthPayload) {
  const { sub } = user as AuthPayload;

  try {
    const [rows] = await connection.execute<RowDataPacket[]>(`
      SELECT 
        t.ticket_id,
        t.ticketSubject,
        t.detailedDescription,
        t.status,
        t.fk_support_adminId AS adminId,
        t.adminReply
      FROM support_ticket t
      JOIN users u ON t.fk_support_userId = u.user_id
      WHERE t.ticket_id = ?
      AND t.fk_support_userId = ?
    `, [ticketId, sub]);

    if (rows.length === 0) {
      return null;
    }

    return rows[0];

  } catch (error) {
    throw error;
  }
}

export async function getRefundDetails(refundId: number, user: AuthPayload) {
  const { sub } = user as AuthPayload;

  try {
    const [rows] = await connection.execute<RowDataPacket[]>(`
      SELECT 
        r.request_id,
        r.ticketcode,
        r.operator_id,
        CONCAT(o.firstName,' ',o.lastName) AS operatorName,
        r.imageproof,
        r.message,
        r.operatorreply,
        r.operatorimageproof,
        COALESCE(r.status, 'pending') AS status
      FROM requestrefund r
      LEFT JOIN boatoperators o 
      ON r.operator_id = o.operator_id
      WHERE r.request_id = ?
      AND r.fk_refund_userId = ?
    `, [refundId, sub]);

    if (rows.length === 0) {
      return null;
    }

    return rows[0];

  } catch (error) {
    throw error;
  }
}