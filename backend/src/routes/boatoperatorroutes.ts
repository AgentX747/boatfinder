import { Router } from "express";
import { addboatController , getBoatCardInfoController ,getOperatorPendingBookingsController ,acceptPendingBookingsController , getAcceptedBookingsController, getEditBoatDetailsController,confirmEditBoatController,getEditTicketBoatCardController,editTicketPricePageController, confirmTicketPriceController,declinePendingBookingsController,confirmDeleteBoatController, boatOperatorCurrentDetailsController,confirmEditBoatOperatorController, getOperatorBookingHistory, 
getOperatorRefundRequests ,confirmOperatorRefundReplyController} from "../controllers/boatoperatorcontroller.js";
import { getBoatOperatorSessionController } from "../controllers/sessioncontroller.js";
import { authorizeRole } from "../middleware/authorizationmiddleware.js";
import {upload} from "../middleware/multerconfig.js";
import {requireAuth} from "../middleware/authmiddleware.js";
import {uploadLegalDocs , parseFile } from "../middleware/uploadmiddleware.js";
import { uploadBoatImage } from "../middleware/uploadimagemiddleware.js";
import { parseBoatFiles } from "../middleware/multerconfig.js";
import  {getManageUserRefundsDetailsController} from "../controllers/boatoperatorcontroller.js";
import {uploadRefundImage} from "../middleware/uploadrefundimage.js";
import {addBoatLimiter, bookingActionLimiter, uploadLimiter, editLimiter} from "../middleware/ratelimiters.js";



const router = Router();

router.get("/boatoperatorsession", requireAuth, authorizeRole("boatoperator"), getBoatOperatorSessionController);

router.post("/addboat", requireAuth, authorizeRole("boatoperator"), addBoatLimiter, parseBoatFiles, uploadLegalDocs, uploadBoatImage, addboatController);

router.post("/confirmrefundreply/:refundId", requireAuth, authorizeRole("boatoperator"), uploadLimiter, parseBoatFiles, uploadRefundImage, confirmOperatorRefundReplyController);

router.get("/getboats", requireAuth, authorizeRole("boatoperator"),  getBoatCardInfoController);
router.get("/operatorpendingbookings", requireAuth, authorizeRole("boatoperator"),  getOperatorPendingBookingsController);
router.get("/getoperatorrefundrequests", requireAuth, authorizeRole("boatoperator"), getOperatorRefundRequests);
router.get("/getrefunddetails/:refundId", requireAuth, authorizeRole("boatoperator"),  getManageUserRefundsDetailsController);
router.get("/operatoracceptedbookings", requireAuth, authorizeRole("boatoperator"),  getAcceptedBookingsController);
router.get("/getticketcard", requireAuth, authorizeRole("boatoperator"),  getEditTicketBoatCardController);
router.get("/editticketprice/:boatID", requireAuth, authorizeRole("boatoperator"),  editTicketPricePageController);
router.get("/getoperatorbookinghistory", requireAuth, authorizeRole("boatoperator"),  getOperatorBookingHistory);
router.get("/editboatdetails/:boatID", requireAuth, authorizeRole("boatoperator"),  getEditBoatDetailsController);
router.get("/getcurrentoperatordetails/:boatoperatorId", requireAuth, authorizeRole("boatoperator"), boatOperatorCurrentDetailsController);

router.put("/confirmeditticketprice/:boatID", requireAuth, authorizeRole("boatoperator"), editLimiter, confirmTicketPriceController);
router.put("/confirmeditboat/:boatID", requireAuth, authorizeRole("boatoperator"), editLimiter, parseBoatFiles, uploadLegalDocs, uploadBoatImage, confirmEditBoatController);
router.patch("/confirmeditboatoperator/:boatoperatorId", requireAuth, authorizeRole("boatoperator"), editLimiter, confirmEditBoatOperatorController);

router.patch("/acceptbooking/:bookingId", requireAuth, authorizeRole("boatoperator"), bookingActionLimiter, acceptPendingBookingsController);
router.patch("/declinebooking/:bookingId", requireAuth, authorizeRole("boatoperator"), bookingActionLimiter, declinePendingBookingsController);

router.delete("/confirmdeleteboat/:boatId", requireAuth, authorizeRole("boatoperator"), editLimiter, confirmDeleteBoatController);

export default router;
