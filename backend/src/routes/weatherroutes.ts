import { weatherDataController, spotcastController, autoCancelController } from "../controllers/weathercontroller.js";
import { Router } from "express";

const router = Router();

router.get("/getweatherdata", weatherDataController);
router.get("/airesponse", spotcastController);
router.post("/autocancel", autoCancelController);  // POST — triggers cancellation from cache

export default router;