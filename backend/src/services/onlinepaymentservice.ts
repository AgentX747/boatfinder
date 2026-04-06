import { connection } from "../config/mysql.js";
import { RowDataPacket } from "mysql2";
import { generateTicketCode } from "../lib/ticketgenerator.js";

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

export async function getTripDetails(boatId: number) {
  try {
    const [tripdetails] = await connection.execute<RowDataPacket[]>(
      `SELECT 
        b.boat_id, 
        b.boat_name,
        b.vessel_type,
        b.capacity_information,
        b.operator_id, 
        CONCAT(bo.firstName, ' ', bo.lastName) AS operatorName,
        bo.company_id,
        c.companyName,
        b.route_from, 
        b.route_to,
        b.schedules,
        b.ticket_price, 
        b.status
      FROM boats b
      JOIN boatoperators bo ON b.operator_id = bo.operator_id
      LEFT JOIN companies c ON bo.company_id = c.company_id
      WHERE b.boat_id = ?`,
      [boatId]
    );

    return tripdetails.map((row) => ({
      ...row,
      schedules: typeof row.schedules === "string"
        ? JSON.parse(row.schedules)
        : row.schedules ?? [],
    }));

  } catch (error) {
    console.error("Error fetching trip details:", error);
    throw error;
  }
}

export async function confirmOnlinePayment(
  userId: number,
  body: any,
  userRole: string | null = null,
  userAgent: string | null = null
) {
  const {
  boatId, operatorId, companyId,
  routeFrom, routeTo,
  schedules,
  ticketPrice, boatName, tripDate, image
} = body;

// Add this line:
const parsedSchedules = typeof schedules === "string" ? JSON.parse(schedules) : schedules;

  while (true) {
    const ticketCode = generateTicketCode();

    try {
      const [result] = await connection.execute(
        `INSERT INTO bookings (
          ticketcode, fk_booking_userId, fk_booking_boatId,
          fk_booking_operatorId, fk_booking_companyId, boatName,
          booking_date, trip_date, route_from, route_to,
          schedules, payment_method, image, bookingstatus, boatstatus, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ticketCode  || null,
          userId      || null,
          boatId      || null,
          operatorId  || null,
          companyId   || null,
          boatName    || null,
          new Date().toISOString().slice(0, 19).replace("T", " "),
          tripDate    || null,
          routeFrom   || null,
          routeTo     || null,
          JSON.stringify(parsedSchedules),
          "online",
          image       || null,
          "pending",
          "active",
          ticketPrice || null,
        ]
      );

      const bookingId = (result as any).insertId;

      // ── Insert into payments ──
      await connection.execute(
        `INSERT INTO payments (payment_method, user_id, booking_id, amount, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          "online",
          String(userId),
          String(bookingId),
          Number(ticketPrice) || 0,
          "pending",
          new Date().toISOString().slice(0, 19).replace("T", " "),
        ]
      );

      await insertLog("BOOK_TICKET", userId, userRole, userAgent);
      return { bookingId, ticketCode };

    } catch (err: any) {
      if (err.code !== "ER_DUP_ENTRY") {
        await insertLog("BOOK_TICKET_FAILED", userId, userRole, userAgent);
        throw err;
      }
    }
  }
}