import { Router } from "express";
import { getUserSessionController } from "../controllers/sessioncontroller.js";
import {
  bookBoatdetailsController,
  cancelPendingBookingController,
  confirmEditUserController,
  getAcceptedBookingsController,
  getAllBoatsController,
  getBookingDetailsController,
  getBookingHistoryController,
  getCurrentUserDetailsCotroller,
  getOnlineTripDetailsController,
  getPendingBookingsController,
  getRecommendedBoatsController,
  getRecommendedBoatsWeightedController,
  getRefundTicketCardsController,
  getRefundTicketDetailsController,
  getSupportTicketCardsController,
  getTicketDetailsController,
  onlinebookBoatController,
  physicalbookBoatController,
  refundTicketController,
  searchBoatsController,
  submitTicketController,
  trackInteractionController
} from "../controllers/usercontroller.js";
import { requireAuth } from "../middleware/authmiddleware.js";
import { authorizeRole } from "../middleware/authorizationmiddleware.js";
import { parseBoatFiles } from "../middleware/multerconfig.js";
import {
  bookingActionLimiter,
  bookingLimiter,
  editLimiter,
  ticketLimiter,
  uploadLimiter
} from "../middleware/ratelimiters.js";
import { uploadGcashImage } from "../middleware/uploadgcashimage.js";
import { uploadRefundImage } from "../middleware/uploadrefundimage.js";

const router = Router();

// ── Session / Profile ────────────────────────────────────────────────────────
router.get("/usersession",                    requireAuth, authorizeRole("user"), getUserSessionController);
router.get("/getcurrentuserdetails/:userId",  requireAuth, authorizeRole("user"), getCurrentUserDetailsCotroller);

// ── Boats ────────────────────────────────────────────────────────────────────
router.get("/searchboats",              requireAuth, authorizeRole("user"), searchBoatsController);
router.get("/getallboats",              requireAuth, authorizeRole("user"), getAllBoatsController);
router.get("/bookboat/:boatID",         requireAuth, authorizeRole("user"), bookBoatdetailsController);
router.get("/gettripdetails/:boatId",   requireAuth, authorizeRole("user"), getOnlineTripDetailsController);

// ── Recommendations ──────────────────────────────────────────────────────────
router.get("/recommendations/:userId",  requireAuth, authorizeRole("user"), getRecommendedBoatsController);
router.get("/recommendations",          requireAuth, authorizeRole("user"), getRecommendedBoatsWeightedController);

// ── Tracking ─────────────────────────────────────────────────────────────────
router.post("/track", requireAuth, authorizeRole("user"), trackInteractionController);

// ── Bookings ─────────────────────────────────────────────────────────────────
router.get("/getpendingbookings",                   requireAuth, authorizeRole("user"), getPendingBookingsController);
router.get("/getacceptedbookings",                  requireAuth, authorizeRole("user"), getAcceptedBookingsController);
router.get("/getbookinghistory",                    requireAuth, authorizeRole("user"), getBookingHistoryController);
router.get("/getcurrentbookingdetails/:bookingId",  requireAuth, getBookingDetailsController);

// Returns active booking counts per departure slot for a boat on a given date.
// Query param: ?date=YYYY-MM-DD
// Response: { "7:00 AM": 17, "9:00 AM": 3 }
// Used by BookBoat.tsx to display remaining seats per slot before booking.

// ── Tickets / Refunds ────────────────────────────────────────────────────────
router.get("/getrefundticketcards",          requireAuth, authorizeRole("user"), getRefundTicketCardsController);
router.get("/getsupportticketcards",         requireAuth, authorizeRole("user"), getSupportTicketCardsController);
router.get("/getrefunddetails/:refundId",    requireAuth, authorizeRole("user"), getRefundTicketDetailsController);
router.get("/getticketdetails/:ticketId",    requireAuth, authorizeRole("user"), getTicketDetailsController);

// ── Mutations ────────────────────────────────────────────────────────────────
router.post("/physicalbookboat",  requireAuth, authorizeRole("user"), bookingLimiter, physicalbookBoatController);
router.post("/onlinebookboat",    requireAuth, authorizeRole("user"), bookingLimiter, parseBoatFiles, uploadGcashImage, onlinebookBoatController);
router.post("/refundticket",      requireAuth, authorizeRole("user"), uploadLimiter, parseBoatFiles, uploadRefundImage, refundTicketController);
router.post("/submitticket",      requireAuth, authorizeRole("user"), ticketLimiter, submitTicketController);

router.patch("/cancelbooking/:bookingId",   requireAuth, authorizeRole("user"), bookingActionLimiter, cancelPendingBookingController);
router.patch("/confirmedituser/:userId",    requireAuth, authorizeRole("user"), editLimiter, confirmEditUserController);

export default router;