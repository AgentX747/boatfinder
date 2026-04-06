import { Router } from "express";
import {RegisterController , LoginController ,refreshTokenController , logoutController} from "../controllers/authcontroller.js";
import { loginLimiter, registerLimiter } from "../middleware/ratelimiters.js";



const router = Router();
// auth routes
router.post("/register", registerLimiter, RegisterController);
router.post("/login", LoginController);
router.post("/refresh", refreshTokenController);  
router.post("/logout", logoutController);




export default router;
