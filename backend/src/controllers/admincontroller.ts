import { connect } from "http2";
import * as adminService from "../services/adminservice.js";



export async function getBoatOperatorsController(req: any, res: any) {
  try {
    const result = await adminService.getBoatOperators();
    res.status(200).json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
export async function getBoatOperatorsbyIDController(req: any, res: any) {
  try {
    const result = await adminService. getBoatOperatorsbyId(req.params.boatoperatorid);
    res.status(200).json(result[0]);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
export async function verifyBoatOperatorController(req: any, res: any) {
  try {
    const result = await adminService.verifyBoatOperator(req.params.boatoperatorid);
    res.status(200).json({ message: "Boat operator verified successfully" });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
export async function rejectBoatOperatorController(req: any, res: any) {
  try {
    const result = await adminService.rejectBoatOperator(req.params.boatoperatorid);
    res.status(200).json({ message: "Boat operator verified successfully" });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
export async function getAllBoatsController(req: any, res: any) {
  try {
    const result = await adminService.getAllBoats();
    res.status(200).json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
export async function getBoatsbyIDController(req: any, res: any) {
  try {
    const result = await adminService.getBoatsbyID(req.params.boatId);
    res.status(200).json(result[0]);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
export async function confirmBoatRegistrationController(req: any, res: any) {
  try {
    const result = await adminService.confirmBoatRegistration(req.params.boatId);
    res.status(200).json({ message: "Boat verified successfully" });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
export async function rejectBoatRegistrationController(req: any, res: any) {
  try {
    const result = await adminService.rejectBoatRegistration(req.params.boatId);
    res.status(200).json({ message: "Boat rejected successfully" });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
export async function  getAdminLogsController(req: any, res: any) {
  try {
    const result = await adminService.getAdminLogs();
    res.status(200).json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function getPendingSupportTicketsController(req: any, res: any) {
  try {
    const result = await adminService.getPendingSupportTickets();
    res.status(200).json(result); // { tickets: [...], total: N }
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function getTicketDetailsController(req: any, res: any) {
  try {
    const result = await adminService.getTicketDetails(req.params.ticketId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
export async function adminReplyController(req: any, res: any) {
  try {
    const user_id = req.user.sub; // was req.user.user_id, JWT stores it as 'sub'
    const ticketId = Number(req.params.ticketId);
    const { reply } = req.body;

    if (!reply?.trim()) {
      return res.status(400).json({ message: "Reply cannot be empty" });
    }

    const result = await adminService.adminReply(ticketId, user_id, reply);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
}