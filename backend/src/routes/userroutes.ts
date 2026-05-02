import { Router } from "express";
import { getUserSessionController } from "../controllers/sessioncontroller.js";
import { authorizeRole } from "../middleware/authorizationmiddleware.js";
import {
  searchBoatsController,
  getAllBoatsController,
  bookBoatdetailsController,
  physicalbookBoatController,
  getPendingBookingsController,
  getBookingDetailsController,
  getAcceptedBookingsController,
  cancelPendingBookingController,
  getBookingHistoryController,
  getCurrentUserDetailsCotroller,
  confirmEditUserController,
  submitTicketController,
  getOnlineTripDetailsController,
  onlinebookBoatController,
  refundTicketController,
  getRefundTicketCardsController,
  getSupportTicketCardsController,
  getTicketDetailsController,
  getRefundTicketDetailsController,
  getRecommendedBoatsController,
  // ── NEW ──────────────────────────────────────────────────────────────────
  getRecommendedBoatsWeightedController,
  trackInteractionController,
} from "../controllers/usercontroller.js";
import { requireAuth } from "../middleware/authmiddleware.js";
import { uploadGcashImage } from "../middleware/uploadgcashimage.js";
import { uploadRefundImage } from "../middleware/uploadrefundimage.js";
import { parseBoatFiles } from "../middleware/multerconfig.js";
import {
  bookingLimiter,
  bookingActionLimiter,
  uploadLimiter,
  ticketLimiter,
  editLimiter,
  readLimiter,
} from "../middleware/ratelimiters.js";

const router = Router();

// ── Session / Profile ────────────────────────────────────────────────────────
router.get("/usersession",                    requireAuth, authorizeRole("user"), getUserSessionController);
router.get("/getcurrentuserdetails/:userId",  requireAuth, authorizeRole("user"), getCurrentUserDetailsCotroller);

// ── Boats ────────────────────────────────────────────────────────────────────
router.get("/searchboats",          requireAuth, authorizeRole("user"), searchBoatsController);
router.get("/getallboats",          requireAuth, authorizeRole("user"), getAllBoatsController);
router.get("/bookboat/:boatID",     requireAuth, authorizeRole("user"), bookBoatdetailsController);
router.get("/gettripdetails/:boatId", requireAuth, authorizeRole("user"), getOnlineTripDetailsController);

// ── Recommendations ──────────────────────────────────────────────────────────
// Legacy (booking-only CF) — kept for backwards compat
router.get("/recommendations/:userId",  requireAuth, authorizeRole("user"), getRecommendedBoatsController);
// NEW: weighted CF using clicks + searches + bookings (preferred)
router.get("/recommendations",          requireAuth, authorizeRole("user"), getRecommendedBoatsWeightedController);

// ── Tracking ─────────────────────────────────────────────────────────────────
// POST /user/track  body: { boatId, type: 'click'|'search'|'book', routeQuery? }
router.post("/track", requireAuth, authorizeRole("user"), trackInteractionController);

// ── Bookings ─────────────────────────────────────────────────────────────────
router.get("/getpendingbookings",                requireAuth, authorizeRole("user"), getPendingBookingsController);
router.get("/getacceptedbookings",               requireAuth, authorizeRole("user"), getAcceptedBookingsController);
router.get("/getbookinghistory",                 requireAuth, authorizeRole("user"), getBookingHistoryController);
router.get("/getcurrentbookingdetails/:bookingId", requireAuth, getBookingDetailsController);

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