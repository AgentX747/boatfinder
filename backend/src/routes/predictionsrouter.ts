import { Router } from "express";
import {
  getNationalForecast,
  getPMOForecast,
  getSeasonalForecast,
  getAllScenarios,
} from "../controllers/predictioncontroller.js";
 
const router = Router();
 
router.get("/national",  getNationalForecast);   // GET /predictions/national
router.get("/seasonal",  getSeasonalForecast);   // GET /predictions/seasonal
router.get("/scenarios", getAllScenarios);        // GET /predictions/scenarios
router.get("/pmo/:pmo",  getPMOForecast);         // GET /predictions/pmo/:pmo?months=12
 
export default router;