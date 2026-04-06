import { authorizeRole  } from "../middleware/authorizationmiddleware.js";
import {requireAuth} from "../middleware/authmiddleware.js";
import { Router } from "express";
import { getAdminSessionController , } from "../controllers/sessioncontroller.js";
import {getBoatOperatorsController , getBoatOperatorsbyIDController , verifyBoatOperatorController ,getAllBoatsController,getBoatsbyIDController , confirmBoatRegistrationController,rejectBoatOperatorController,rejectBoatRegistrationController, getAdminLogsController, getPendingSupportTicketsController,getTicketDetailsController,adminReplyController} from "../controllers/admincontroller.js";

const router = Router();

router.get("/adminsession",requireAuth,authorizeRole("admin"),getAdminSessionController);
router.get("/getboatoperators",requireAuth,authorizeRole("admin"),getBoatOperatorsController);
router.get("/getboatoperatorsbyid/:boatoperatorid",requireAuth,authorizeRole("admin"),getBoatOperatorsbyIDController);
router.get("/getboatsbyid/:boatId",requireAuth,authorizeRole("admin"),getBoatsbyIDController);
router.patch("/confirmboatregistration/:boatId",requireAuth,authorizeRole("admin"),confirmBoatRegistrationController);
router.patch("/rejectboatoperator/:boatoperatorid",requireAuth,authorizeRole("admin"),rejectBoatOperatorController);
router.patch("/verifyboatoperator/:boatoperatorid",requireAuth,authorizeRole("admin"),verifyBoatOperatorController);
router.patch("/rejectboatregistration/:boatId",requireAuth,authorizeRole("admin"),rejectBoatRegistrationController);
router.patch("/adminreply/:ticketId",requireAuth,authorizeRole("admin"),adminReplyController);
router.get("/getallboats",requireAuth,authorizeRole("admin"),getAllBoatsController);
router.get("/getadminlogs",requireAuth,authorizeRole("admin"),getAdminLogsController);
router.get("/getpendingtickets",requireAuth,authorizeRole("admin"),getPendingSupportTicketsController);
router.get("/getticketdetails/:ticketId",requireAuth,authorizeRole("admin"),getTicketDetailsController);
router.get("/downloadfile", (req, res) => {
  const { url } = req.query as { url: string };
  if (!url) return res.status(400).json({ message: "Missing URL" });

  // ✅ URL is already public — just redirect directly
  res.redirect(decodeURIComponent(url));
});




export default router;

