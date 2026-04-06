import {weatherDataController } from "../controllers/weathercontroller.js";
import {getSpotcastDailyClassifications} from "../services/weatherservice.js";
import { Router } from "express";
const router = Router();

router.get("/getweatherdata" , weatherDataController);
router.get("/airesponse" , getSpotcastDailyClassifications);

export default router;