import { Router } from "express";
import {getUserSessionController} from "../controllers/sessioncontroller.js";
import { authorizeRole  } from "../middleware/authorizationmiddleware.js";
import {searchBoatsController , getAllBoatsController ,  bookBoatdetailsController ,physicalbookBoatController,getPendingBookingsController ,  getBookingDetailsController,getAcceptedBookingsController ,cancelPendingBookingController , getBookingHistoryController ,getCurrentUserDetailsCotroller ,confirmEditUserController,submitTicketController,getOnlineTripDetailsController, onlinebookBoatController , refundTicketController,
  getRefundTicketCardsController,getSupportTicketCardsController , getTicketDetailsController , getRefundTicketDetailsController, getRecommendedBoatsController
} from "../controllers/usercontroller.js"
import {requireAuth} from "../middleware/authmiddleware.js";
import  {uploadGcashImage} from "../middleware/uploadgcashimage.js";
import { uploadRefundImage } from "../middleware/uploadrefundimage.js";
import { parseBoatFiles  } from "../middleware/multerconfig.js";
import { bookingLimiter, bookingActionLimiter, uploadLimiter, ticketLimiter, editLimiter, readLimiter } from "../middleware/ratelimiters.js";
const router = Router();

router.get("/usersession", requireAuth, authorizeRole("user"), getUserSessionController);
router.get("/getcurrentuserdetails/:userId", requireAuth, authorizeRole("user"),getCurrentUserDetailsCotroller);
router.get("/searchboats", requireAuth, authorizeRole("user"),  searchBoatsController);
router.get("/getallboats", requireAuth, authorizeRole("user"),  getAllBoatsController);
router.get("/bookboat/:boatID", requireAuth, authorizeRole("user"),  bookBoatdetailsController);
router.get("/gettripdetails/:boatId", requireAuth, authorizeRole("user"), getOnlineTripDetailsController);
router.get("/getpendingbookings", requireAuth, authorizeRole("user"),  getPendingBookingsController);
router.get("/getacceptedbookings", requireAuth, authorizeRole("user"),  getAcceptedBookingsController);
router.get("/getbookinghistory", requireAuth, authorizeRole("user"), getBookingHistoryController);
router.get("/getcurrentbookingdetails/:bookingId", requireAuth,  getBookingDetailsController);
router.get("/getrefundticketcards", requireAuth, authorizeRole("user"),  getRefundTicketCardsController);
router.get("/getsupportticketcards", requireAuth, authorizeRole("user"),  getSupportTicketCardsController);
router.get("/getrefunddetails/:refundId", requireAuth, authorizeRole("user"),  getRefundTicketDetailsController);
router.get("/getticketdetails/:ticketId", requireAuth, authorizeRole("user"),  getTicketDetailsController);
router.get("/recommendations/:userId", requireAuth, authorizeRole("user"), getRecommendedBoatsController);

router.post("/physicalbookboat", requireAuth, authorizeRole("user"), bookingLimiter, physicalbookBoatController);
router.post("/onlinebookboat", requireAuth, authorizeRole("user"), bookingLimiter, parseBoatFiles, uploadGcashImage, onlinebookBoatController);
router.post("/refundticket", requireAuth, authorizeRole("user"), uploadLimiter, parseBoatFiles, uploadRefundImage, refundTicketController);
router.post("/submitticket", requireAuth, authorizeRole("user"), ticketLimiter, submitTicketController);

router.patch("/cancelbooking/:bookingId", requireAuth, authorizeRole("user"), bookingActionLimiter, cancelPendingBookingController);
router.patch("/confirmedituser/:userId", requireAuth, authorizeRole("user"), editLimiter, confirmEditUserController);


export default router;