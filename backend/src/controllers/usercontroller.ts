import { Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import {AuthPayload} from '../middleware/authmiddleware.js'
import { RowDataPacket } from 'mysql2';
import {connection} from "../config/mysql.js";
import * as userService from "../services/userservice.js";
import { hashPassword , verifyPassword} from "../lib/passwordhash.js";
import * as onlineService from "../services/onlinepaymentservice.js";

import { searchrouteandtime } from '../services/userservice.js';
import { parse } from 'path';
import { on } from 'events';

export async function searchBoatsController(req: Request, res: Response) {
  try {
    const user = req.user as AuthPayload;

    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const boats = await userService.searchrouteandtime(req.query);

    return res.json(boats);

  } catch (err: any) {
    console.error("Search boats error:", err);
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
}

export async function getAllBoatsController(req: Request, res: Response) {
  try {
    const boats = await userService.getAllBoats();
    res.json(boats);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function bookBoatdetailsController(req: Request, res: Response) {
  try {
    const boatID = String(req.params.boatID);
    
    const boatDetails = await userService.bookBoatdetails(boatID);

    if (!boatDetails) {
      return res.status(404).json({ message: 'Boat not found' });
    }
    
    return res.json(boatDetails);
    
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}

export async function physicalbookBoatController(req: Request, res: Response) {
  const {tripDate} = req.body
  try {
    if(!tripDate){
      return res.status(400).json({ message: 'trip date is required' });
    }

    const {sub , role }  = req.user as AuthPayload;
    const boatId = parseInt(sub);

    const result = await userService.physicalbookTransaction(boatId , req.body , role);

    return res.json({
      message: 'Booking created successfully',
      ...result
    });
  } catch (err: any) {
    console.error('Error in physical booking:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}

export async function getPendingBookingsController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {sub }  = req.user as AuthPayload;
    const userID = parseInt(sub);

    const pendingBookings = await userService.getPendingBookings(userID);

    return res.json(pendingBookings);
  } catch (err: any) {
    console.error('Error fetching pending bookings:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}

export async function getAcceptedBookingsController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {sub }  = req.user as AuthPayload;
    const userID = parseInt(sub);

    const acceptedBookings = await userService.getAcceptedBookings(userID);

    return res.json(acceptedBookings);
  } catch (err: any) {
    console.error('Error fetching pending bookings:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}

export async function getBookingDetailsController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {sub }  = req.user as AuthPayload;
    const userID = parseInt(sub);
    const bookingId = String(req.params.bookingId);

    const bookingDetails = await userService.getCurrentBookingDetails(userID, bookingId);

    if (!bookingDetails) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    return res.json(bookingDetails);
  } catch (err: any) {
    console.error('Error fetching booking details:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}

export async function cancelPendingBookingController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { sub } = req.user as AuthPayload;
    const userID = Number(sub);
    const bookingId = String(req.params.bookingId);

    const result = await userService.cancelBooking(userID, Number(bookingId));

    return res.json({
      message: 'Booking cancelled successfully',
      ...result
    });

  } catch (err: any) {
    console.error('Error declining pending booking:', err);
    return res.status(err.status || 500).json({
      message: err.message || 'Internal server error'
    });
  }
}

export async function getBookingHistoryController(req: Request, res: Response) {
  try {
    const { sub } = req.user as AuthPayload;
    const userID = parseInt(sub);
    const bookingHistory = await userService.getBookingHistory(userID);
    return res.json(bookingHistory);
  } catch (error) {
    console.error('Error fetching booking history:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getCurrentUserDetailsCotroller(req: Request, res: Response) {
  try {
    const { sub } = req.user as AuthPayload;
    const userID = parseInt(sub);

    const user = await userService.userCurrentDetails(userID);

    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch user details" });
  }
}

export async function confirmEditUserController(req: Request, res: Response) {
  const { firstName, lastName, userName, email, password, confirmPassword,
          phone_number, address, gender, birthdate } = req.body

  if (!firstName || !lastName || !userName || !email || !phone_number || !address || !gender || !birthdate) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password || confirmPassword) {
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
      return res.status(400).json({ message: "Password must be 8+ chars, 1 uppercase & 1 number" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
  }

  const { sub } = req.user as AuthPayload;

  try {
    const result = await userService.confirmEditUser({
      firstName, lastName, userName, email,
      password: password || null,
      phone_number, address, gender, birthdate,
      userId: parseInt(sub)
    });
    return res.json(result);
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: "Failed to update user details" });
  }
}

export async function submitTicketController(req: Request, res: Response) {
  try {
    const { sub } = req.user as AuthPayload;
    const userId = parseInt(sub);

    const result = await userService.submitTicket(req.body, userId);

    return res.json({
      message: "Ticket submitted successfully",
      data: result
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to submit ticket" });
  }
}

export async function getOnlineTripDetailsController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const boatId = String(req.params.boatId);
    const tripDetails = await onlineService.getTripDetails(Number(boatId));
    
    if (!tripDetails || tripDetails.length === 0) {
      return res.status(404).json({ message: "Trip not found" });
    }

    return res.json(tripDetails[0]);
  } catch (err: any) {
    console.error("Error fetching trip details:", err);
    return res.status(500).json({
      message: err.message || "Internal server error",
    });
  }
}

export async function onlinebookBoatController(req: Request, res: Response) {
  const {tripDate} = req.body
  try {
    if(!tripDate){
      return res.status(400).json({ message: 'trip date is required' });
    }

    const {sub , role }  = req.user as AuthPayload;
    const boatId = parseInt(sub);

    const result = await onlineService.confirmOnlinePayment(boatId , req.body , role);

    return res.json({
      message: 'Booking created successfully',
      ...result
    });
  } catch (err: any) {
    console.error('Error in physical booking:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}

export async function refundTicketController(req: Request, res: Response) {
  try {
    const user = req.user as AuthPayload;

    const { operatorId, message, ticketCode, image } = req.body;

    if (!ticketCode || !operatorId || !message) {
      return res.status(400).json({
        success: false,
        message: "ticketCode, operatorId, and message are required.",
      });
    }

    const result = await userService.refundTicket(
      { operatorId, image: image ?? null, message, ticketCode },
      user
    );

    return res.status(201).json({
      success: true,
      message: "Refund request submitted successfully.",
      data: result,
    });

  } catch (error) {
    console.error("Refund ticket error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}

export async function getRefundTicketCardsController(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { sub } = req.user as AuthPayload;
    const tickets = await userService.getRefundTickets(Number(sub));

    res.status(200).json(tickets);

  } catch (error) {
    console.error("getRefundTicketCardsController error:", error);
    res.status(500).json({
      message: "Failed to fetch refund tickets"
    });
  }
}

export async function getSupportTicketCardsController(req: Request, res: Response) {
  try {
    const { sub } = req.user as AuthPayload

    const tickets = await userService.getSupportTickets(Number(sub))

    res.status(200).json(tickets)

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch support tickets"
    })
  }
}

export async function getTicketDetailsController(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const ticketId = Number(req.params.ticketId);

    if (isNaN(ticketId)) {
      res.status(400).json({ message: "Invalid ticket ID" });
      return;
    }

    const ticket = await userService.getTicketDetails(ticketId, req.user as AuthPayload);

    if (!ticket) {
      res.status(404).json({ message: "Ticket not found" });
      return;
    }

    res.status(200).json(ticket);

  } catch (error) {
    console.error("getTicketDetailsController error:", error);
    res.status(500).json({ message: "Failed to fetch ticket details" });
  }
}

export async function getRefundTicketDetailsController(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const refundId = Number(req.params.refundId);

    if (isNaN(refundId)) {
      res.status(400).json({ message: "Invalid refund ID" });
      return;
    }

    const refund = await userService.getRefundDetails(refundId, req.user as AuthPayload);

    if (!refund) {
      res.status(404).json({ message: "Refund request not found" });
      return;
    }

    res.status(200).json(refund);

  } catch (error) {
    console.error("getRefundTicketDetailsController error:", error);
    res.status(500).json({ message: "Failed to fetch refund details" });
  }
}