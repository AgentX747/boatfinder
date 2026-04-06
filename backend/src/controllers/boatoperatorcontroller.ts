import { Request, Response } from "express";
import * as boatService from "../services/boatoperatorservice.js";
import * as onlineService from "../services/onlinepaymentservice.js";
import { AuthPayload } from "../middleware/authmiddleware.js";

export async function addboatController(req: Request, res: Response) {
  try {
    const result = await boatService.addBoat(req.user as AuthPayload, req.body, req.headers["user-agent"] ?? null);
    
    res.status(201).json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function getBoatCardInfoController(req: Request, res: Response) {
  try {
    const boats = await boatService.getBoatCards(req.user as AuthPayload);
    res.json(boats);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function getOperatorPendingBookingsController(req: Request, res: Response) {
  try {
    const bookings = await boatService.getOperatorPendingBookings(req.user as AuthPayload);
    res.json(bookings);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function getAcceptedBookingsController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const {sub }  = req.user as AuthPayload;
    const userID = parseInt(sub);
    const acceptedBookings = await boatService.getOperatorAcceptedBookings(req.user as AuthPayload);
    return res.json(acceptedBookings);
  } catch (err: any) {
    console.error('Error fetching accepted bookings:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}

export async function acceptPendingBookingsController(
  req: Request,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const bookingId = String(req.params.bookingId);

    if (!bookingId || isNaN(Number(bookingId))) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const result: any = await boatService.acceptPendingBookings(
      req.user as AuthPayload,
      { bookingId }
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Booking not found or already processed",
      });
    }

    return res.status(200).json({
      message: "Booking accepted successfully",
    });
  } catch (err: any) {
    console.error("Error accepting pending booking:", err);
    return res.status(err.status || 500).json({
      message: err.message || "Internal server error",
    });
  }
}

export async function declinePendingBookingsController(
  req: Request,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const bookingId = String(req.params.bookingId);

    if (!bookingId || isNaN(Number(bookingId))) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const result: any = await boatService.declinePendingBookings(
      req.user as AuthPayload, 
      { bookingId }
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Booking not found or already processed",
      });
    }

    return res.status(200).json({
      message: "Booking declined successfully",
    });
  } catch (err: any) {
    console.error("Error declining pending booking:", err);
    return res.status(err.status || 500).json({
      message: err.message || "Internal server error",
    });
  }
}

export async function getEditBoatDetailsController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const boatID = String(req.params.boatID);

    if (!boatID) {
      return res.status(400).json({ message: "Boat ID is required" });
    }

    const boatDetails = await boatService.getEditBoatDetails(
      req.user as AuthPayload,
      boatID
    );

    if (!boatDetails || boatDetails.length === 0) {
      return res.status(404).json({ message: "Boat not found" });
    }

    return res.status(200).json({
      success: true,
      data: boatDetails[0],
    });
  } catch (error: any) {
    console.error("Error in getEditBoatDetailsController:", error);
    return res.status(error.status || 500).json({
      message: error.message || "Failed to retrieve boat details",
    });
  }
}

export async function confirmEditBoatController(
  req: Request,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const boatID = String(req.params.boatID);

    if (!boatID) {
      return res.status(400).json({ message: "Boat ID is required" });
    }

    const result = await boatService.confirmEditBoat(
      req.user as AuthPayload,
      boatID,
      req.body
    );

    return res.status(200).json(result);

  } catch (error: any) {
    console.error("Error in confirmEditBoatController:", error);

    return res.status(error.status || 500).json({
      message: error.message || "Failed to update boat details",
    });
  }
}

export async function getEditTicketBoatCardController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const boatID = String(req.params.boatID);

    const result = await boatService.editTicketCardDetails(
      req.user as AuthPayload,
      boatID
    );

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in geteditBoatDetailsController:", error);

    return res.status(error?.status || 500).json({
      message: error?.message || "Internal server error",
    });
  }
}

export async function editTicketPricePageController(
  req: Request,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const boatID = String(req.params.boatID);

    if (!boatID) {
      return res.status(400).json({ message: "Boat ID is required" });
    }

    const result = await boatService.editTicketPricePage(
      req.user as AuthPayload,
      boatID
    );

    if (!result || result.length === 0) {
      return res.status(404).json({
        message: "Boat not found or you do not have access",
      });
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in editTicketPricePageController:", error);

    return res.status(error.status || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function confirmTicketPriceController(
  req: Request,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const boatID = String(req.params.boatID);

    const result = await boatService.confirmEditTicketPrice(
      req.user as AuthPayload,
      boatID,
      req.body
    );
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in updateTicketPriceController:", error);

    return res.status(error.status || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function confirmDeleteBoatController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const boatId = String(req.params.boatId);

    const result = await boatService.confirmDeleteBoat(
      req.user as AuthPayload,
      Number(boatId)
    );

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in confirmDeleteBoatController:", error);

    return res.status(error.status || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function boatOperatorCurrentDetailsController(req: Request, res: Response) {
  try {
    const boatoperatorId = String(req.params.boatoperatorId);

    const result = await boatService.boatOperatorCurrentDetails(Number(boatoperatorId));

    if (!result || (Array.isArray(result) && result.length === 0)) {
      return res.status(404).json({ message: "Boat operator not found" });
    }

    res.status(200).json(result);

  } catch (err) {
    console.error("Controller Error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function confirmEditBoatOperatorController(req: Request, res: Response) {
  const { firstName, lastName, userName, email, password, confirmPassword,
          phone_number, address, gender, birthdate } = req.body;

  if (!firstName || !lastName || !userName || !email || !phone_number || !address || !gender || !birthdate) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password && !/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
    return res.status(400).json({ message: "Password must be 8+ chars, 1 uppercase & 1 number" });
  }

  if (password || confirmPassword) {
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
  }

  const { sub } = req.user as AuthPayload;
  const boatoperatorId = String(req.params.boatoperatorId);

  try {
    const result = await boatService.confirmEditBoatOperator({
      firstName, lastName, userName, email,
      password: password || null,
      phone_number, address, gender, birthdate,
      operatorId: parseInt(boatoperatorId),
      userId: parseInt(sub)
    });
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update boat operator details" });
  }
}

export async function getOperatorBookingHistory(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const operatorBookings = await boatService.getOperatorBookingHistory(
      req.user as AuthPayload
    );

    return res.json(operatorBookings);

  } catch (err: any) {
    console.error("Error fetching operator booking history:", err);

    return res.status(500).json({
      message: err.message || "Internal server error",
    });
  }
}

export async function getOperatorRefundRequests(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const operatorRefundRequests = await boatService.getOperatorRefundRequests(
      req.user as AuthPayload
    );

    return res.json(operatorRefundRequests);

  } catch (err: any) {
    console.error("Error fetching operator refund requests:", err);

    return res.status(500).json({
      message: err.message || "Internal server error",
    });
  }
}

export async function getManageUserRefundsDetailsController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { sub } = req.user as AuthPayload;
    const userID = parseInt(sub);
    const refundId = String(req.params.refundId);

    const refundRequests = await boatService.getManageUserRefundsDetails(
      refundId, 
      req.user as AuthPayload
    );

    return res.json(refundRequests);
  } catch (err: any) {
    console.error("Error fetching refund requests:", err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
}

export async function confirmOperatorRefundReplyController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const refundId = String(req.params.refundId);

    if (!refundId || isNaN(Number(refundId))) {
      return res.status(400).json({ message: "Invalid refund ID" });
    }

    const result = await boatService.confirmOperatorRefundReply(
      req.user as AuthPayload,
      refundId,
      req.body
    );

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in confirmOperatorRefundReplyController:", error);
    return res.status(error.status || 500).json({
      message: error.message || "Internal server error",
    });
  }
}