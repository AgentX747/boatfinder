import { connection } from "../config/mysql.js";
import { RowDataPacket } from "mysql2";
import { AuthPayload } from "../middleware/authmiddleware.js";
import { hashPassword } from "../lib/passwordhash.js";
import { withCache, invalidateCache } from "../utils/cache.js";

// ─── Logger Helper ───────────────────────────────────────────────────────────
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

// ─── TTLs ────────────────────────────────────────────────────────────────────
const BOATS_TTL    = 300; // slow-changing: boat listings, details
const BOOKINGS_TTL = 60;  // fast-changing: pending/accepted bookings
const PROFILE_TTL  = 300; // slow-changing: operator profile
const HISTORY_TTL  = 120; // moderate: booking history

// ─── ADD BOAT ─────────────────────────────────────────────────────────────────
export async function addBoat(
  user: AuthPayload,
  body: any,
  userAgent: string | null = null
) {
  if (!user) throw { status: 401, message: "User not authenticated" };

  const { sub, role } = user;
  const {
    boatName, vesselType, capacityInformation,
    ticketPrice, routeFrom, routeTo, schedules, legaldocs, boatImage,
  } = body;

  let parsedSchedules: { departureTime: string; arrivalTime: string }[];
  try {
    parsedSchedules = typeof schedules === "string" ? JSON.parse(schedules) : schedules;
    if (!Array.isArray(parsedSchedules) || parsedSchedules.length === 0) throw new Error();
    const allValid = parsedSchedules.every(
      (s) => s.departureTime?.trim() && s.arrivalTime?.trim()
    );
    if (!allValid) throw new Error();
  } catch {
    throw { status: 400, message: "Invalid schedules format" };
  }

  const parsedCapacity    = Number(capacityInformation);
  const parsedTicketPrice = Number(ticketPrice);
  if (isNaN(parsedCapacity) || isNaN(parsedTicketPrice)) {
    throw { status: 400, message: "Invalid number values" };
  }

  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT operator_id FROM boatoperators WHERE user_id = ?`,
    [sub]
  );

  if (rows.length === 0) {
    await insertLog("ADD_BOAT_FAILED", Number(sub), role, userAgent);
    throw { status: 403, message: "Not a boat operator" };
  }

  const operatorId = rows[0].operator_id;

  try {
    await connection.execute(
      `INSERT INTO boats 
       (operator_id, boat_name, vessel_type, capacity_information, legaldocs, image,
        route_from, route_to, schedules, ticket_price, status, registration_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        operatorId, boatName, vesselType, parsedCapacity,
        legaldocs ?? null, boatImage ?? null,
        routeFrom.toLowerCase().trim(), routeTo.toLowerCase().trim(),
        JSON.stringify(parsedSchedules),
        parsedTicketPrice, "active", "pending",
      ]
    );

    // New boat added:
    // - bust the operator's own boat card list
    // - bust the public boat listing (users browsing boats)
    // - admin boat list is now stale too
    await invalidateCache(
      `operator:boats:${sub}`,
      `boats:all`,
      `admin:boats:all`
    );
    console.log(`🗑️  Cache invalidated for operator ${sub} after adding boat`);

    await insertLog("ADD_BOAT", Number(sub), role, userAgent);
    return { message: "Boat added successfully" };
  } catch (error) {
    await insertLog("ADD_BOAT_FAILED", Number(sub), role, userAgent);
    throw error;
  }
}

// ─── GET BOAT CARDS ───────────────────────────────────────────────────────────
export async function getBoatCards(user: AuthPayload) {
  if (!user) throw { status: 401, message: "User not authenticated" };

  return withCache(`operator:boats:${user.sub}`, BOATS_TTL, async () => {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT b.boat_id, b.image, b.boat_name, b.capacity_information,
              b.ticket_price, b.vessel_type, b.route_from, b.route_to,
              b.registration_status
       FROM boats b
       JOIN boatoperators o ON b.operator_id = o.operator_id
       WHERE o.user_id = ? AND b.registration_status = 'verified'`,
      [user.sub]
    );

    return rows.map((row: any) => ({
      boatId:      row.boat_id,
      boatName:    row.boat_name,
      vesselType:  row.vessel_type,
      capacity:    row.capacity_information,
      ticketPrice: row.ticket_price,
      routeFrom:   row.route_from,
      routeTo:     row.route_to,
      image:       row.image,
    }));
  });
}

// ─── GET OPERATOR PENDING BOOKINGS ────────────────────────────────────────────
export async function getOperatorPendingBookings(user: AuthPayload) {
  const { sub } = user;

  return withCache(`operator:bookings:pending:${sub}`, BOOKINGS_TTL, async () => {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        b.booking_id AS bookingId,
        b.ticketcode,
        b.fk_booking_boatId AS boatId,
        CONCAT(u.firstName, ' ', u.lastName) AS passengerName,
        b.boatName,
        b.image,
        c.companyName,
        b.booking_date AS bookingDate,
        b.trip_date AS tripDate,
        b.payment_method AS paymentMethod,
        b.route_from AS routeFrom,
        b.route_to AS routeTo,
        b.schedules,
        b.total_price AS ticketPrice,
        b.bookingstatus,
        b.boatstatus,
        b.fk_booking_userId AS passengerId
       FROM bookings b
       INNER JOIN boatoperators o ON b.fk_booking_operatorId = o.operator_id
       INNER JOIN users u         ON b.fk_booking_userId = u.user_id
       LEFT JOIN companies c      ON b.fk_booking_companyId = c.company_id
       WHERE o.user_id = ? AND b.bookingstatus = 'pending'
       ORDER BY b.booking_id DESC`,
      [Number(sub)]
    );

    return rows.map((row) => ({
      ...row,
      schedules: typeof row.schedules === "string"
        ? JSON.parse(row.schedules)
        : row.schedules ?? null,
    }));
  });
}

// ─── GET OPERATOR ACCEPTED BOOKINGS ──────────────────────────────────────────
export async function getOperatorAcceptedBookings(user: AuthPayload) {
  const { sub } = user;

  return withCache(`operator:bookings:accepted:${sub}`, BOOKINGS_TTL, async () => {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        b.booking_id AS bookingId,
        b.ticketcode,
        b.fk_booking_boatId AS boatId,
        CONCAT(u.firstName, ' ', u.lastName) AS passengerName,
        b.boatName,
        c.companyName,
        b.booking_date AS bookingDate,
        b.trip_date AS tripDate,
        b.payment_method AS paymentMethod,
        b.route_from AS routeFrom,
        b.route_to AS routeTo,
        b.schedules,
        b.total_price AS ticketPrice,
        b.bookingstatus,
        b.boatstatus,
        b.fk_booking_userId AS passengerId
       FROM bookings b
       INNER JOIN boatoperators o ON b.fk_booking_operatorId = o.operator_id
       INNER JOIN users u         ON b.fk_booking_userId = u.user_id
       LEFT JOIN companies c      ON b.fk_booking_companyId = c.company_id
       WHERE o.user_id = ? AND b.bookingstatus = 'accepted'
       ORDER BY b.booking_id DESC`,
      [Number(sub)]
    );

    return rows.map((row) => ({
      ...row,
      schedules: typeof row.schedules === "string"
        ? JSON.parse(row.schedules)
        : row.schedules ?? null,
    }));
  });
}

// ─── GET OPERATOR BOOKING HISTORY ─────────────────────────────────────────────
export async function getOperatorBookingHistory(user: AuthPayload) {
  const { sub } = user;

  return withCache(`operator:bookings:history:${sub}`, HISTORY_TTL, async () => {
    const [results] = await connection.execute<RowDataPacket[]>(
      `SELECT
        b.booking_id AS bookingId,
        CONCAT(u.firstName, ' ', u.lastName) AS passengerName,
        b.boatName,
        b.ticketcode,
        b.fk_booking_boatId AS boatId,
        b.fk_booking_operatorId AS operatorId,
        b.payment_method AS paymentMethod,
        b.booking_date AS bookingDate,
        b.boatstatus,
        b.trip_date AS tripDate,
        b.route_to AS routeTo,
        b.route_from AS routeFrom,
        b.total_price AS totalPrice,
        b.bookingstatus AS status,
        b.fk_booking_userId AS passengerId
       FROM bookings b
       JOIN users u         ON u.user_id = b.fk_booking_userId
       JOIN boatoperators bo ON bo.operator_id = b.fk_booking_operatorId
       WHERE bo.user_id = ?
       ORDER BY b.booking_id DESC`,
      [sub]
    );

    return results;
  });
}

// ─── GET EDIT BOAT DETAILS ────────────────────────────────────────────────────
// Not cached — edit forms should always show live data
export async function getEditBoatDetails(user: AuthPayload, params: string) {
  const { sub } = user;
  const boatID = params;
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        b.boat_name            AS boatName,
        b.vessel_type          AS vesselType,
        b.capacity_information AS capacityInformation,
        b.route_from           AS routeFrom,
        b.route_to             AS routeTo,
        b.schedules,
        b.status
       FROM boats b
       JOIN boatoperators o ON b.operator_id = o.operator_id
       WHERE o.user_id = ? AND b.boat_id = ?`,
      [Number(sub), Number(boatID)]
    );

    return rows.map((row) => ({
      ...row,
      schedules: typeof row.schedules === "string"
        ? JSON.parse(row.schedules)
        : row.schedules ?? [],
      userId: Number(sub),
    }));
  } catch (error) {
    console.error("Error fetching edit boat details:", error);
    throw { status: 500, message: "Failed to retrieve edit boat details" };
  }
}

// ─── EDIT TICKET CARD DETAILS ─────────────────────────────────────────────────
// Not cached — always live for edit forms
export async function editTicketCardDetails(user: AuthPayload, params: string) {
  const { sub } = user;
  try {
    const [getdetails] = await connection.execute<RowDataPacket[]>(
      `SELECT
        b.ticket_price AS ticketPrice,
        b.boat_id,
        b.boat_name    AS boatName,
        b.image
       FROM boats b
       JOIN boatoperators o ON b.operator_id = o.operator_id
       WHERE o.user_id = ? AND b.registration_status = 'verified'`,
      [Number(sub)]
    );
    return getdetails;
  } catch (error) {
    console.error("Error fetching edit card details:", error);
    throw { status: 500, message: "Failed to retrieve edit card details" };
  }
}

// ─── EDIT TICKET PRICE PAGE ───────────────────────────────────────────────────
// Not cached — always live for edit forms
export async function editTicketPricePage(user: AuthPayload, params: string) {
  const { sub } = user;
  const boatID = params;
  try {
    const [boatdetails] = await connection.execute<RowDataPacket[]>(
      `SELECT ticket_price, boat_id, boat_name, vessel_type
       FROM boats b
       JOIN boatoperators o ON b.operator_id = o.operator_id
       WHERE o.user_id = ? AND b.boat_id = ?`,
      [Number(sub), Number(boatID)]
    );
    return boatdetails[0];
  } catch (error) {
    console.error("Error fetching edit card details:", error);
    throw { status: 500, message: "Failed to retrieve edit card details" };
  }
}

// ─── ACCEPT BOOKING ───────────────────────────────────────────────────────────
export async function acceptPendingBookings(
  user: AuthPayload,
  params: { bookingId: string },
  userAgent: string | null = null
) {
  const { sub, role } = user;
  const { bookingId } = params;

  try {
    // Fetch the passenger's userId BEFORE updating so we can bust their caches
    const [bookingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT b.fk_booking_userId AS passengerId
       FROM bookings b
       INNER JOIN boatoperators o ON b.fk_booking_operatorId = o.operator_id
       WHERE b.booking_id = ? AND o.user_id = ?`,
      [bookingId, sub]
    );

    const [result]: any = await connection.execute(
      `UPDATE bookings b
       INNER JOIN boatoperators o ON b.fk_booking_operatorId = o.operator_id
       SET b.bookingstatus = 'accepted'
       WHERE b.booking_id = ? AND o.user_id = ? AND b.bookingstatus = 'pending'`,
      [bookingId, sub]
    );

    if (result.affectedRows === 0) {
      await insertLog("ACCEPT_BOOKING_FAILED", Number(sub), role, userAgent);
      throw { status: 404, message: "Booking not found or already actioned" };
    }

    await connection.execute(
      `UPDATE payments SET status = 'paid' WHERE booking_id = ?`,
      [String(bookingId)]
    );

    // Bust operator-side caches (booking moves pending → accepted)
    const keysToInvalidate = [
      `operator:bookings:pending:${sub}`,
      `operator:bookings:accepted:${sub}`,
      `operator:bookings:history:${sub}`,
    ];

    // Also bust the passenger's caches so they immediately see the accepted status
    if (bookingRows.length > 0) {
      const passengerId = bookingRows[0].passengerId;
      keysToInvalidate.push(
        `bookings:pending:${passengerId}`,
        `bookings:accepted:${passengerId}`,
        `bookings:history:${passengerId}`
      );
      console.log(`🗑️  Cache invalidated for passenger ${passengerId} after operator accepted booking`);
    }

    await invalidateCache(...keysToInvalidate);
    console.log(`🗑️  Cache invalidated for operator ${sub} after accepting booking ${bookingId}`);

    await insertLog("ACCEPT_BOOKING", Number(sub), role, userAgent);
    return result;
  } catch (error) {
    console.error("Error accepting booking:", error);
    throw { status: 500, message: "Failed to accept booking" };
  }
}

// ─── DECLINE BOOKING ──────────────────────────────────────────────────────────
export async function declinePendingBookings(
  user: AuthPayload,
  params: any,
  userAgent: string | null = null
) {
  const { sub, role } = user;
  const { bookingId } = params;

  try {
    // Fetch the passenger's userId BEFORE updating so we can bust their caches
    const [bookingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT b.fk_booking_userId AS passengerId
       FROM bookings b
       INNER JOIN boatoperators o ON b.fk_booking_operatorId = o.operator_id
       WHERE b.booking_id = ? AND o.user_id = ?`,
      [bookingId, sub]
    );

    const [result]: any = await connection.execute(
      `UPDATE bookings b
       INNER JOIN boatoperators o ON b.fk_booking_operatorId = o.operator_id
       SET b.bookingstatus = 'declined'
       WHERE b.booking_id = ? AND o.user_id = ? AND b.bookingstatus = 'pending'`,
      [bookingId, sub]
    );

    if (result.affectedRows === 0) {
      await insertLog("DECLINE_BOOKING_FAILED", Number(sub), role, userAgent);
      throw { status: 404, message: "Booking not found or already actioned" };
    }

    // Bust operator-side caches
    const keysToInvalidate = [
      `operator:boats:${sub}`,
      `boats:all`,
      `operator:bookings:pending:${sub}`,
      `operator:bookings:accepted:${sub}`,
      `operator:bookings:history:${sub}`,
    ];

    // Also bust the passenger's caches so they immediately see the declined status
    if (bookingRows.length > 0) {
      const passengerId = bookingRows[0].passengerId;
      keysToInvalidate.push(
        `bookings:pending:${passengerId}`,
        `bookings:history:${passengerId}`
      );
      console.log(`🗑️  Cache invalidated for passenger ${passengerId} after operator declined booking`);
    }

    await invalidateCache(...keysToInvalidate);
    console.log(`🗑️  Cache invalidated for operator ${sub} after declining booking ${bookingId}`);

    await insertLog("DECLINE_BOOKING", Number(sub), role, userAgent);
    return result;
  } catch (error) {
    console.error("Error declining booking:", error);
    throw { status: 500, message: "Failed to decline booking" };
  }
}

// ─── CONFIRM EDIT BOAT ────────────────────────────────────────────────────────
export async function confirmEditBoat(
  user: AuthPayload,
  params: string,
  body: any,
  userAgent: string | null = null
) {
  const { sub, role } = user;
  const boatID = params;

  const {
    boatName, vesselType, routeFrom, routeTo,
    schedules, status, capacityInformation, boatImage, legaldocs,
  } = body;

  let parsedSchedules: { departureTime: string; arrivalTime: string }[];
  try {
    parsedSchedules = typeof schedules === "string" ? JSON.parse(schedules) : schedules;
    if (!Array.isArray(parsedSchedules) || parsedSchedules.length === 0) throw new Error();
    const allValid = parsedSchedules.every(
      (s) => s.departureTime?.trim() && s.arrivalTime?.trim()
    );
    if (!allValid) throw new Error();
  } catch {
    throw { status: 400, message: "Invalid schedules format" };
  }

  try {
    // ── Step 1: Update the boats table ───────────────────────────────────────
    const [result]: any = await connection.execute(
      `UPDATE boats b
       INNER JOIN boatoperators o ON b.operator_id = o.operator_id
       SET
         b.boat_name            = ?,
         b.vessel_type          = ?,
         b.route_from           = ?,
         b.route_to             = ?,
         b.capacity_information = ?,
         b.schedules            = ?,
         b.status               = ?,
         b.image                = COALESCE(?, b.image),
         b.legaldocs            = COALESCE(?, b.legaldocs)
       WHERE o.user_id = ? AND b.boat_id = ?`,
      [
        boatName, vesselType,
        routeFrom.toLowerCase().trim(),
        routeTo.toLowerCase().trim(),
        capacityInformation,
        JSON.stringify(parsedSchedules),
        status,
        boatImage ?? null,
        legaldocs ?? null,
        Number(sub), Number(boatID),
      ]
    );

    if (result.affectedRows === 0) {
      await insertLog("EDIT_BOAT_FAILED", Number(sub), role, userAgent);
      throw { status: 404, message: "Boat not found or unauthorized" };
    }

    // ── Step 2: Sync denormalized boat data in bookings by boat_id ───────────
    await connection.execute(
      `UPDATE bookings
       SET
         boatName    = ?,
         route_from  = ?,
         route_to    = ?,
         schedules   = ?,
         boatstatus  = ?,
         image       = COALESCE(?, image)
       WHERE fk_booking_boatId = ?`,
      [
        boatName,
        routeFrom.toLowerCase().trim(),
        routeTo.toLowerCase().trim(),
        JSON.stringify(parsedSchedules),
        status,
        boatImage ?? null,
        Number(boatID),
      ]
    );

    // ── Step 3: Bust all relevant caches ─────────────────────────────────────
    // operator:boats        — operator's own card list
    // boat:{boatId}         — operator's internal boat detail (admin:boat:{id} also)
    // boats:all             — public user-facing boat listing (getAllBoats)
    // bookboats:{boatId}    — user-facing booking detail page (bookBoatdetails)
    // admin:boats:all       — admin boat management list
    // admin:boat:{boatId}   — admin individual boat view
    // operator:bookings:*   — denormalized booking data was just updated in DB
    await invalidateCache(
      `operator:boats:${sub}`,
      `boat:${boatID}`,
      `boats:all`,
      `bookboats:${boatID}`,
      `admin:boats:all`,
      `admin:boat:${boatID}`,
      `operator:bookings:pending:${sub}`,
      `operator:bookings:accepted:${sub}`,
      `operator:bookings:history:${sub}`,
      `bookings:pending:${sub}`,
      `bookings:accepted:${sub}`,
      `bookings:history:${sub}`
    );
    console.log(`🗑️  Cache invalidated for operator ${sub} after editing boat ${boatID}`);

    await insertLog("EDIT_BOAT", Number(sub), role, userAgent);
    return { success: true, message: "Boat details updated successfully" };
  } catch (error) {
    console.error("Error updating boat details:", error);
    throw { status: 500, message: "Failed to update boat details" };
  }
}

// ─── CONFIRM EDIT TICKET PRICE ────────────────────────────────────────────────
export async function confirmEditTicketPrice(
  user: AuthPayload,
  params: string,
  body: any,
  userAgent: string | null = null
) {
  const { sub, role } = user;
  const boatID = params;
  const { newPrice } = body;

  try {
    const [result]: any = await connection.execute(
      `UPDATE boats b
       JOIN boatoperators o ON b.operator_id = o.operator_id
       SET b.ticket_price = ?
       WHERE o.user_id = ? AND b.boat_id = ?`,
      [newPrice, Number(sub), Number(boatID)]
    );

    if (result.affectedRows === 0) {
      await insertLog("EDIT_TICKET_PRICE_FAILED", Number(sub), role, userAgent);
      throw { status: 404, message: "Boat not found or unauthorized" };
    }

    const [affectedPassengers] = await connection.execute<RowDataPacket[]>(
  `SELECT DISTINCT fk_booking_userId AS passengerId
   FROM bookings
   WHERE fk_booking_boatId = ?`,
  [Number(boatID)]
);
const passengerKeys = affectedPassengers.flatMap(p => [
  `bookings:pending:${p.passengerId}`,
  `bookings:accepted:${p.passengerId}`,
  `bookings:history:${p.passengerId}`,
]);

await invalidateCache(
  `operator:boats:${sub}`,
  `boat:${boatID}`,
  `boats:all`,
  `bookboats:${boatID}`,
  `admin:boats:all`,
  `admin:boat:${boatID}`,
  `operator:bookings:pending:${sub}`,
  `operator:bookings:accepted:${sub}`,
  `operator:bookings:history:${sub}`,
  ...passengerKeys   // ✅ bust every affected passenger
);

    await invalidateCache(
      `operator:boats:${sub}`,
      `boat:${boatID}`,
      `boats:all`,
      `bookboats:${boatID}`,
      `admin:boats:all`,
      `admin:boat:${boatID}`
    );
    console.log(`🗑️  Cache invalidated for operator ${sub} after editing ticket price on boat ${boatID}`);

    await insertLog("EDIT_TICKET_PRICE", Number(sub), role, userAgent);
    return { success: true, message: "Ticket price updated successfully" };
  } catch (error) {
    console.error("Error updating ticket price:", error);
    throw { status: 500, message: "Failed to update ticket price" };
  }
}

// ─── DELETE BOAT ──────────────────────────────────────────────────────────────
export async function confirmDeleteBoat(
  user: AuthPayload,
  params: number,
  userAgent: string | null = null
) {
  const { sub, role } = user;

  try {
    const [result]: any = await connection.execute(
      `DELETE b
       FROM boats b
       JOIN boatoperators o ON b.operator_id = o.operator_id
       WHERE b.boat_id = ? AND o.user_id = ?`,
      [params, sub]
    );

    if (result.affectedRows === 0) {
      await insertLog("DELETE_BOAT_FAILED", Number(sub), role, userAgent);
      throw { status: 404, message: "Boat not found or not authorized" };
    }

   
    await invalidateCache(
      `operator:boats:${sub}`,
      `boat:${params}`,
      `boats:all`,
      `bookboats:${params}`,
      `admin:boats:all`,
      `admin:boat:${params}`
    );
    console.log(`🗑️  Cache invalidated for operator ${sub} after deleting boat ${params}`);

    await insertLog("DELETE_BOAT", Number(sub), role, userAgent);
    return { message: "Boat deleted successfully" };
  } catch (error: any) {
    console.error("Error deleting boat:", error);
    throw error.status ? error : { status: 500, message: "Failed to delete boat" };
  }
}

// ─── BOAT OPERATOR PROFILE ────────────────────────────────────────────────────
export async function boatOperatorCurrentDetails(operatorId: number) {
  return withCache(`operator:profile:${operatorId}`, PROFILE_TTL, async () => {
    const [result] = await connection.execute(
      `SELECT firstName, lastName, userName, email, password,
              phone_number, address, gender, birthdate
       FROM boatoperators WHERE operator_id = ?`,
      [operatorId]
    );
    return result;
  });
}

// ─── EDIT BOAT OPERATOR PROFILE ───────────────────────────────────────────────
export async function confirmEditBoatOperator(body: {
  firstName: string; lastName: string; userName: string;
  email: string; password: string | null; phone_number: string;
  address: string; gender: string; birthdate: string;
  operatorId: number; userId: number;
}) {
  try {
    if (body.password) {
      const hashedPassword = await hashPassword(body.password);

      await connection.execute(
        `UPDATE boatoperators SET firstName=?, lastName=?, userName=?, email=?,
         password=?, phone_number=?, address=?, gender=?, birthdate=?
         WHERE operator_id=?`,
        [body.firstName, body.lastName, body.userName, body.email,
         hashedPassword, body.phone_number, body.address,
         body.gender, body.birthdate, body.operatorId]
      );

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
        `UPDATE boatoperators SET firstName=?, lastName=?, userName=?, email=?,
         phone_number=?, address=?, gender=?, birthdate=?
         WHERE operator_id=?`,
        [body.firstName, body.lastName, body.userName, body.email,
         body.phone_number, body.address,
         body.gender, body.birthdate, body.operatorId]
      );

      await connection.execute(
        `UPDATE users SET firstName=?, lastName=?, userName=?, email=?,
         phone_number=?, address=?, gender=?, birthdate=?
         WHERE user_id=?`,
        [body.firstName, body.lastName, body.userName, body.email,
         body.phone_number, body.address,
         body.gender, body.birthdate, body.userId]
      );
    }

    // Profile changed — bust operator profile AND session caches
    // admin:operators:all is also stale since it shows operator name/email
    await invalidateCache(
      `operator:profile:${body.operatorId}`,
     `boatoperator:${body.userId}`, 
      `session:${body.userId}`,
      `admin:operators:all`,
      `admin:operator:${body.operatorId}`
    );
    console.log(`🗑️  Cache invalidated for operator ${body.operatorId} after profile edit`);

    return { message: "Boat operator updated successfully" };
  } catch (error) {
    console.error(error);
    throw { status: 500, message: "Failed to update boat operator details" };
  }
}

// ─── REFUND REQUESTS ──────────────────────────────────────────────────────────
// Not cached — refund status changes frequently and must be live
export async function getOperatorRefundRequests(user: AuthPayload) {
  const { sub } = user;
  try {
    const [result] = await connection.execute(
      `SELECT
        rf.request_id,
        rf.ticketcode,
        rf.fk_refund_userId,
        CONCAT(u.firstName, ' ', u.lastName) AS passengerName,
        rf.imageproof,
        rf.message,
        rf.operatorreply,
        rf.operatorimageproof,
        rf.status,
        CONCAT(op_user.firstName, ' ', op_user.lastName) AS operatorName
       FROM requestrefund rf
       JOIN users u          ON u.user_id = rf.fk_refund_userId
       JOIN boatoperators bo ON bo.operator_id = rf.operator_id
       JOIN users op_user    ON op_user.user_id = bo.user_id
       WHERE bo.user_id = ?`,
      [sub]
    );
    return result;
  } catch (error) {
    throw error;
  }
}

// ─── REFUND DETAILS ───────────────────────────────────────────────────────────
// Not cached — must be live so operator sees current status
export async function getManageUserRefundsDetails(params: string, user: AuthPayload) {
  const { sub } = user;
  try {
    const [result] = await connection.execute(
      `SELECT
        rf.request_id,
        rf.ticketcode,
        rf.operator_id,
        rf.fk_refund_userId,
        rf.imageproof,
        rf.message,
        rf.status,
        CONCAT(u.firstName, ' ', u.lastName) AS passengerName,
        CONCAT(op_user.firstName, ' ', op_user.lastName) AS operatorName
       FROM requestrefund rf
       JOIN users u          ON u.user_id = rf.fk_refund_userId
       JOIN boatoperators bo ON bo.operator_id = rf.operator_id
       JOIN users op_user    ON op_user.user_id = bo.user_id
       WHERE rf.request_id = ? AND bo.user_id = ?`,
      [Number(params), sub]
    );
    return result;
  } catch (error) {
    throw error;
  }
}

// ─── CONFIRM REFUND REPLY ─────────────────────────────────────────────────────
// Write op — no cache needed
export async function confirmOperatorRefundReply(
  user: AuthPayload,
  refundId: string,
  body: any
) {
  const { sub } = user;
  const { operatorreply, image } = body;

  try {
    const [rows]: any = await connection.execute(
      `SELECT rf.request_id
       FROM requestrefund rf
       JOIN boatoperators bo ON bo.operator_id = rf.operator_id
       WHERE rf.request_id = ? AND bo.user_id = ?`,
      [Number(refundId), sub]
    );

    if (rows.length === 0) {
      throw { status: 403, message: "Unauthorized or refund not found" };
    }

    const [result] = await connection.execute(
      `UPDATE requestrefund
       SET operatorreply = ?, operatorimageproof = ?, status = 'resolved'
       WHERE request_id = ?`,
      [operatorreply, image ?? null, Number(refundId)]
    );

    return { success: true, message: "Refund reply submitted successfully", result };
  } catch (error) {
    throw error;
  }
}