import { getWeatherData , getSpotcastDailyClassifications } from "../services/weatherservice.js";
import { Request, Response } from "express";


export async function weatherDataController(req: Request, res: Response) {
  try {
    const weatherData = await getWeatherData(10.3184, 123.9639);
    res.status(200).json(weatherData);
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({ message: "Failed to retrieve weather data" });
  }
}
