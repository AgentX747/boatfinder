import { RowDataPacket } from "mysql2";
import { connection } from "../config/mysql.js";
import { invalidateCache, withCache } from "../utils/cache.js";

// ─── TTLs ─────────────────────────────────────────────────────────────────────
const OPERATORS_TTL = 300; // slow-changing: operator list/details
const BOATS_TTL     = 300; // slow-changing: boat list/details
const TICKETS_TTL   = 60;  // fast-changing: support tickets
const LOGS_TTL      = 30;  // very short: logs should be near real-time

// ─── BOAT OPERATORS ───────────────────────────────────────────────────────────

export async function getBoatOperators() {
  return withCache('admin:operators:all', OPERATORS_TTL, async () => {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        b.operator_id,
        b.firstName,
        b.lastName,
        b.email,
        b.phone_number,
        b.address,
        b.registration_status,
        b.gender,
        c.companyName
       FROM boatoperators b
       JOIN companies c ON b.company_id = c.company_id`
    );
    return rows;
  });
}

export async function getBoatOperatorsbyId(params: number) {
  return withCache(`admin:operator:${params}`, OPERATORS_TTL, async () => {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        b.operator_id,
        b.firstName,
        b.lastName,
        b.email,
        b.phone_number,
        b.address,
        b.gender,
        b.registration_status,
        b.user_id,
        c.companyName
       FROM boatoperators b
       JOIN companies c ON b.company_id = c.company_id
       WHERE b.operator_id = ?`,
      [params]
    );
    return rows;
  });
}

export async function verifyBoatOperator(params: number) {
  try {
    // Fetch the operator's user_id so we can bust their session/profile caches
    const [opRows] = await connection.execute<RowDataPacket[]>(
      `SELECT user_id FROM boatoperators WHERE operator_id = ?`,
      [params]
    );

    const [rows] = await connection.execute<RowDataPacket[]>(
      `UPDATE boatoperators SET registration_status = 'verified' WHERE operator_id = ?`,
      [params]
    );

    // Operator status changed:
    // - admin list/detail are stale
    // - operator's own session/profile reflects new status
    const keysToInvalidate = [
      'admin:operators:all',
      `admin:operator:${params}`,
    ];

    if (opRows.length > 0) {
      const userId = opRows[0].user_id;
      keysToInvalidate.push(
        `boatoperator:${userId}`,
        `session:${userId}`,
        `operator:profile:${params}`
      );
      console.log(`🗑️  Cache invalidated for operator user ${userId} after admin verification`);
    }

    await invalidateCache(...keysToInvalidate);
    console.log(`🗑️  Cache invalidated after verifying operator ${params}`);

    return rows;
  } catch (error) {
    console.error("Error verifying boat operator:", error);
    throw { status: 500, message: "Failed to verify boat operator" };
  }
}

export async function rejectBoatOperator(params: number) {
  try {
    // Fetch the operator's user_id so we can bust their session/profile caches
    const [opRows] = await connection.execute<RowDataPacket[]>(
      `SELECT user_id FROM boatoperators WHERE operator_id = ?`,
      [params]
    );

    const [rows] = await connection.execute<RowDataPacket[]>(
      `DELETE o, u
       FROM boatoperators o
       JOIN users u ON o.user_id = u.user_id
       WHERE o.operator_id = ? AND o.registration_status = 'pending'`,
      [params]
    );

    // Operator deleted:
    // - admin list/detail are stale
    // - bust their session/profile cache so any lingering tokens become invalid
    const keysToInvalidate = [
      'admin:operators:all',
      `admin:operator:${params}`,
    ];

    if (opRows.length > 0) {
      const userId = opRows[0].user_id;
      keysToInvalidate.push(
        `boatoperator:${userId}`,
        `session:${userId}`,
        `operator:profile:${params}`
      );
      console.log(`🗑️  Cache invalidated for operator user ${userId} after admin rejection`);
    }

    await invalidateCache(...keysToInvalidate);
    console.log(`🗑️  Cache invalidated after rejecting operator ${params}`);

    return rows;
  } catch (error) {
    console.error("Error rejecting boat operator:", error);
    throw { status: 500, message: "Failed to reject boat operator" };
  }
}

// ─── BOATS ────────────────────────────────────────────────────────────────────

export async function getAllBoats() {
  return withCache('admin:boats:all', BOATS_TTL, async () => {
    const [boats] = await connection.execute<RowDataPacket[]>(
      `SELECT
        b.boat_id,
        b.operator_id,
        b.boat_name,
        b.vessel_type,
        b.capacity_information,
        b.route_from,
        b.route_to,
        b.ticket_price,
        b.registration_status,
        CONCAT(bo.firstName, ' ', bo.lastName) AS operatorName,
        c.companyName AS company_name
       FROM boats b
       INNER JOIN boatoperators bo ON b.operator_id = bo.operator_id
       LEFT JOIN companies c ON b.fk_boats_company_id = c.company_id`
    );
    return boats;
  });
}

export async function getBoatsbyID(params: number) {
  return withCache(`admin:boat:${params}`, BOATS_TTL, async () => {
    const [boats] = await connection.execute<RowDataPacket[]>(
      `SELECT
        b.boat_id,
        b.operator_id,
        b.boat_name,
        b.vessel_type,
        b.capacity_information,
        b.route_from,
        b.route_to,
        b.ticket_price,
        b.registration_status,
        b.legaldocs,
        b.schedules,
        CONCAT(bo.firstName, ' ', bo.lastName) AS operatorName,
        c.companyName AS company_name
       FROM boats b
       INNER JOIN boatoperators bo ON b.operator_id = bo.operator_id
       LEFT JOIN companies c ON b.fk_boats_company_id = c.company_id
       WHERE b.boat_id = ?`,
      [params]
    );
    return boats;
  });
}

export async function confirmBoatRegistration(params: number) {
  try {
    // Fetch the operator's user_id so we can bust their boat card list
    const [boatRows] = await connection.execute<RowDataPacket[]>(
      `SELECT bo.user_id AS operatorUserId
       FROM boats b
       JOIN boatoperators bo ON b.operator_id = bo.operator_id
       WHERE b.boat_id = ?`,
      [params]
    );

    const [rows] = await connection.execute<RowDataPacket[]>(
      `UPDATE boats SET registration_status = 'verified' WHERE boat_id = ?`,
      [params]
    );

    // Boat now verified and visible to users:
    // - admin:boats:all     — admin list status changed
    // - admin:boat:{id}     — admin detail status changed
    // - boats:all           — now appears in public user listing
    // - boat:{id}           — public user-facing boat detail
    // - bookboats:{id}      — user booking page for this boat
    // - operator:boats:{id} — operator's own card list now shows this boat
    const keysToInvalidate = [
      'admin:boats:all',
      `admin:boat:${params}`,
      'boats:all',
      `boat:${params}`,
      `bookboats:${params}`,
    ];

    if (boatRows.length > 0) {
      const operatorUserId = boatRows[0].operatorUserId;
      keysToInvalidate.push(`operator:boats:${operatorUserId}`);
      console.log(`🗑️  Cache invalidated for operator ${operatorUserId} after admin confirmed boat ${params}`);
    }

    await invalidateCache(...keysToInvalidate);
    console.log(`🗑️  Cache invalidated after confirming boat ${params} registration`);

    return rows;
  } catch (error) {
    console.error("Error confirming boat registration:", error);
    throw { status: 500, message: "Failed to confirm boat registration" };
  }
}

export async function rejectBoatRegistration(params: number) {
  try {
    // Fetch the operator's user_id so we can bust their boat card list
    const [boatRows] = await connection.execute<RowDataPacket[]>(
      `SELECT bo.user_id AS operatorUserId
       FROM boats b
       JOIN boatoperators bo ON b.operator_id = bo.operator_id
       WHERE b.boat_id = ?`,
      [params]
    );

    const [rows] = await connection.execute<RowDataPacket[]>(
      `DELETE FROM boats WHERE boat_id = ? AND registration_status = 'pending'`,
      [params]
    );

    // Boat deleted:
    // - admin:boats:all     — admin list
    // - admin:boat:{id}     — admin detail
    // - boats:all           — public listing (was pending, so shouldn't be there — bust anyway)
    // - boat:{id}           — public detail (same reason)
    // - bookboats:{id}      — user booking page
    // - operator:boats:{id} — operator's own card list
    const keysToInvalidate = [
      'admin:boats:all',
      `admin:boat:${params}`,
      'boats:all',
      `boat:${params}`,
      `bookboats:${params}`,
    ];

    if (boatRows.length > 0) {
      const operatorUserId = boatRows[0].operatorUserId;
      keysToInvalidate.push(`operator:boats:${operatorUserId}`);
      console.log(`🗑️  Cache invalidated for operator ${operatorUserId} after admin rejected boat ${params}`);
    }

    await invalidateCache(...keysToInvalidate);
    console.log(`🗑️  Cache invalidated after rejecting boat ${params} registration`);

    return rows;
  } catch (error) {
    console.error("Error rejecting boat registration:", error);
    throw { status: 500, message: "Failed to reject boat registration" };
  }
}

// ─── ADMIN LOGS ───────────────────────────────────────────────────────────────
export async function getAdminLogs() {
  return withCache('admin:logs', LOGS_TTL, async () => {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT * FROM system_logs`
    );
    return rows;
  });
}

// ─── SUPPORT TICKETS ─────────────────────────────────────────────────────────

export async function getPendingSupportTickets() {
  return withCache('admin:tickets:pending', TICKETS_TTL, async () => {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        st.ticket_id,
        st.fk_support_userId,
        st.ticketSubject,
        u.firstName,
        u.lastName
       FROM support_ticket st
       JOIN users u ON st.fk_support_userId = u.user_id
       WHERE st.status = 'pending'`
    );
    const [countResult] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM support_ticket WHERE status = 'pending'`
    );
    return {
      tickets: rows,
      total: countResult[0].total as number,
    };
  });
}

// Not cached — ticket details need to be live so admin sees latest reply status
export async function getTicketDetails(ticketId: number) {
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        st.ticket_id,
        st.fk_support_userId,
        sk.ticketSubject,
        sk.detailedDescription,
        u.firstName,
        u.lastName
       FROM support_ticket st
       JOIN users u ON st.fk_support_userId = u.user_id
       JOIN support_ticket sk ON st.ticket_id = sk.ticket_id
       WHERE st.ticket_id = ?`,
      [ticketId]
    );
    return rows;
  } catch (error) {
    console.error("Error fetching ticket details:", error);
    throw new Error("Failed to retrieve ticket details");
  }
}

export async function adminReply(ticketId: number, user_id: number, reply: string) {
  try {
    const [adminRows] = await connection.execute<RowDataPacket[]>(
      `SELECT admin_id FROM admin WHERE user_id = ?`,
      [user_id]
    );
    if (adminRows.length === 0) {
      throw { status: 403, message: "Admin not found" };
    }

    const adminId = adminRows[0].admin_id;

    // Fetch the ticket's owner so we can bust their support tickets cache
    const [ticketRows] = await connection.execute<RowDataPacket[]>(
      `SELECT fk_support_userId AS userId FROM support_ticket WHERE ticket_id = ?`,
      [ticketId]
    );

    await connection.execute(
      `UPDATE support_ticket
       SET adminReply = ?, fk_support_adminId = ?, status = 'resolved'
       WHERE ticket_id = ?`,
      [reply ?? null, adminId, ticketId]
    );

    // Ticket resolved:
    // - admin pending list + count are stale
    // Note: user's getSupportTickets and getTicketDetails are not cached,
    //       so they will pick up the reply on next fetch automatically.
    await invalidateCache('admin:tickets:pending');
    console.log(`🗑️  Cache invalidated after admin replied to ticket ${ticketId}`);

    return { message: "Reply sent successfully" };
  } catch (error) {
    console.error("Error sending admin reply:", error);
    throw error;
  }
}
// ─── BOOKING REPORTS ──────────────────────────────────────────────────────────
// Add these functions to adminservice.ts

/**
 * Returns booking records within an inclusive date range [dateFrom, dateTo].
 * Both dates refer to trip_date (the actual travel date).
 * Not cached — reports must always reflect live data.
 */
export async function getBookingReport(dateFrom: string, dateTo: string) {
  // Validate that dateFrom <= dateTo on the service layer
  if (new Date(dateFrom) > new Date(dateTo)) {
    throw { status: 400, message: "dateFrom must be before or equal to dateTo" };
  }

  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT
       b.booking_id,
       b.ticketcode,
       b.boatName,
       b.trip_date,
       b.booking_date,
       b.route_from,
       b.route_to,
       b.bookingstatus,
       b.boatstatus,
       b.total_price,
       b.payment_method,
       b.boatcapacity,
       JSON_UNQUOTE(JSON_EXTRACT(b.schedules, '$.departureTime')) AS departure_time,
       JSON_UNQUOTE(JSON_EXTRACT(b.schedules, '$.arrivalTime'))   AS arrival_time,
       CONCAT(u.firstName, ' ', u.lastName) AS passengerName,
       u.email                              AS passengerEmail,
       CONCAT(op.firstName, ' ', op.lastName) AS operatorName,
       c.companyName
     FROM bookings b
     LEFT JOIN users u        ON b.fk_booking_userId    = u.user_id
     LEFT JOIN boatoperators op ON b.fk_booking_operatorId = op.operator_id
     LEFT JOIN companies c    ON b.fk_booking_companyId = c.company_id
     WHERE b.trip_date BETWEEN ? AND ?
     ORDER BY b.trip_date ASC, b.booking_id ASC`,
    [dateFrom, dateTo]
  );

  // Summary stats
  const total      = rows.length;
  const revenue    = rows.reduce((sum, r) => sum + (Number(r.total_price) || 0), 0);
  const byStatus: Record<string, number> = {};
  for (const row of rows) {
    const s = row.bookingstatus ?? "unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  return { bookings: rows, summary: { total, revenue, byStatus } };
}