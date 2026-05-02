import { connection } from "../config/mysql.js";
import { RowDataPacket } from "mysql2";
import { fetchWeatherApi } from "openmeteo";
import { Request, Response } from "express";
import { invalidateCache } from "../utils/cache.js";

type WeatherAPIHour = {
  time: string;
  temp_c: number;
  chance_of_rain: number;
  precip_mm: number;
  feelslike_c: number;
  wind_kph: number;
  gust_kph: number;
  wind_degree: number;
  wind_dir: string;
  cloud: number;
};

type WeatherAPIDay = {
  date: string;
  day: {
    maxtemp_f: number;
    mintemp_f: number;
    maxwind_kph: number;
    totalprecip_mm: number;
    condition: { text: string };
    water_temp_c?: number;
    tides?: { tide: { tide_time: string; tide_height_mt: number; tide_type: string }[] }[];
  };
  hour: WeatherAPIHour[];
};

export async function getWeatherData(lat: number, long: number) {
  const WEATHERAPI_KEY = process.env.WEATHERAPI;
  if (!WEATHERAPI_KEY) throw new Error("Missing WEATHERAPI key");

  const url = `http://api.weatherapi.com/v1/forecast.json?key=${WEATHERAPI_KEY}&q=${lat},${long}&days=7&aqi=no&alerts=no&tides=yes`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`WeatherAPI failed: ${res.status}`);
  const data = await res.json();

  const current = data.current;
  const forecastDays: WeatherAPIDay[] = data.forecast.forecastday;

  const currentData = {
    time: new Date(current.last_updated),
    temperature_c: current.temp_c,
    temperature_f: current.temp_f,
    feels_like_c: current.feelslike_c,
    precipitation_mm: current.precip_mm,
    wind_kph: current.wind_kph,
    wind_dir: current.wind_dir,
    gust_kph: current.gust_kph,
    pressure_mb: current.pressure_mb,
    cloud_percent: current.cloud,
    condition: current.condition.text,
  };

  const hourlyData = forecastDays.flatMap((day: WeatherAPIDay) =>
    day.hour.map((hour: WeatherAPIHour) => ({
      time: new Date(hour.time),
      temperature_c: hour.temp_c,
      chance_of_rain: hour.chance_of_rain,
      precipitation_mm: hour.precip_mm,
      feels_like_c: hour.feelslike_c,
      wind_kph: hour.wind_kph,
      gust_kph: hour.gust_kph,
      wind_degree: hour.wind_degree,
      wind_dir: hour.wind_dir,
      cloud_percent: hour.cloud,
    }))
  );

  const dailyData = forecastDays.map((day: WeatherAPIDay) => ({
    date: new Date(day.date),
    max_temp_f: day.day.maxtemp_f,
    min_temp_f: day.day.mintemp_f,
    max_wind_kph: day.day.maxwind_kph,
    total_precip_mm: day.day.totalprecip_mm,
    condition: day.day.condition.text,
    water_temp_c: day.day?.water_temp_c ?? null,
    tides: day.day?.tides?.[0]?.tide?.map((t) => ({
      time: t.tide_time,
      height_m: t.tide_height_mt,
      type: t.tide_type,
    })) ?? [],
  }));

  return {
    current: currentData,
    hourly: hourlyData,
    daily: dailyData,
  };
}

// ── CACHE HELPERS ─────────────────────────────────────────────────────────────

async function getCachedSpotcast(dateKey: string, lat: number, lon: number) {
  const [rows]: any = await connection.query(
    `SELECT response_json
     FROM spotcast_cache
     WHERE date_key = ?
       AND latitude = ?
       AND longitude = ?
       AND expires_at > NOW()
     LIMIT 1`,
    [dateKey, lat, lon]
  );
  return rows.length ? JSON.parse(rows[0].response_json) : null;
}

async function saveSpotcastCache(
  dateKey: string,
  lat: number,
  lon: number,
  data: any
) {
  await connection.query(`DELETE FROM spotcast_cache`);
  await connection.query(
    `INSERT INTO spotcast_cache (date_key, latitude, longitude, response_json, expires_at)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 8 HOUR))`,
    [dateKey, lat, lon, JSON.stringify(data)]
  );
}

// ── POLL UNTIL COMPLETE ───────────────────────────────────────────────────────

async function pollUntilComplete(
  spotcastId: string,
  apiKey: string,
  maxAttempts = 40,
  intervalMs = 5000
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`https://api.sealegs.ai/v3/spotcast/${spotcastId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();
    if (data.latest_forecast?.status === "completed") return data;
    if (data.latest_forecast?.status === "failed") throw new Error("SpotCast job failed");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("SpotCast polling timed out");
}

// ── FRAME LIMITING ────────────────────────────────────────────────────────────

let isFetching = false;
let lastFetchTime = 0;
const COOLDOWN_MS = 10 * 60 * 1000;

// ── AUTO-CANCEL PIPELINE ──────────────────────────────────────────────────────

async function checkAndCancelDangerousBookings(): Promise<{
  cancelled: number;
  details: { bookingId: number; tripDate: string; reason: string }[];
}> {
  const today = new Date().toISOString().split("T")[0];
  const cached = await getCachedSpotcast(today, 10.3141, 123.9388);

  if (!cached?.daily_classifications) {
    console.log("No SpotCast cache available — skipping auto-cancellation");
    return { cancelled: 0, details: [] };
  }

  // Collect every NO-GO date in the cached forecast (up to 5 days)
  const noGoDates = new Set<string>();
  for (const day of cached.daily_classifications) {
    const cls = (day.classification ?? "").toUpperCase().trim();
    if (
      cls === "NO-GO" ||
      cls === "NOGO" ||
      cls === "HIGH" ||
      cls === "DANGEROUS"
    ) {
      noGoDates.add(day.date);
    }
  }

  if (noGoDates.size === 0) {
    console.log("No NO-GO days in forecast — nothing to cancel");
    return { cancelled: 0, details: [] };
  }

  console.log(`🚨 NO-GO dates: ${[...noGoDates].join(", ")}`);

  // Find ferry bookings on those dates that are not yet cancelled
  const dateList = [...noGoDates];
  const placeholders = dateList.map(() => "?").join(", ");

  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT
       b.booking_id,
       b.fk_booking_userId      AS userId,
       b.fk_booking_operatorId  AS operatorId,
       bo.user_id               AS operatorUserId,
       b.trip_date,
       bt.vessel_type
     FROM bookings b
     JOIN boats bt         ON b.fk_booking_boatId      = bt.boat_id
     JOIN boatoperators bo ON b.fk_booking_operatorId  = bo.operator_id
     WHERE DATE(b.trip_date) IN (${placeholders})
       AND LOWER(bt.vessel_type) = 'ferry'
       AND b.boatstatus != 'cancelled'
       AND b.bookingstatus IN ('pending', 'accepted')`,
    dateList
  );

  if (rows.length === 0) {
    console.log("No ferry bookings on NO-GO dates — nothing to cancel");
    return { cancelled: 0, details: [] };
  }

  // Cancel each booking and collect cache keys to bust
  const cacheKeys = new Set<string>();
  const details: { bookingId: number; tripDate: string; reason: string }[] = [];

  for (const row of rows) {
    await connection.execute(
      `UPDATE bookings SET boatstatus = 'cancelled' WHERE booking_id = ?`,
      [row.booking_id]
    );

    const tripDate = String(row.trip_date).slice(0, 10);
    details.push({
      bookingId: Number(row.booking_id),
      tripDate,
      reason: `NO-GO weather forecast for ${tripDate}`,
    });

    // Passenger caches
    cacheKeys.add(`bookings:pending:${row.userId}`);
    cacheKeys.add(`bookings:accepted:${row.userId}`);
    cacheKeys.add(`bookings:history:${row.userId}`);

    // Operator caches
    cacheKeys.add(`operator:bookings:pending:${row.operatorUserId}`);
    cacheKeys.add(`operator:bookings:accepted:${row.operatorUserId}`);
    cacheKeys.add(`operator:bookings:history:${row.operatorUserId}`);
  }

  await invalidateCache(...cacheKeys);
  console.log(
    `✅ Auto-cancelled ${rows.length} ferry booking(s). Cache keys busted: ${[...cacheKeys].join(", ")}`
  );

  return { cancelled: rows.length, details };
}

// ── MAIN SPOTCAST CONTROLLER ──────────────────────────────────────────────────

export async function getSpotcastDailyClassifications(req: Request, res: Response) {
  try {
    const SEALEGS_API_KEY = process.env.SEALEGSSECRET!;
    const latitude = 10.3141;
    const longitude = 123.9388;
    const start_date = new Date().toISOString().split("T")[0];
    const num_days = 5;

    /* ── 1️⃣ CHECK CACHE ──────────────────────────────── */
    const cached = await getCachedSpotcast(start_date, latitude, longitude);
    if (cached) {
      console.log("Returning cached SpotCast forecast — no credit used");

      // Run in background on every cache hit — no API call, DB only, won't delay response
      checkAndCancelDangerousBookings().catch((err) =>
        console.error("Auto-cancel error (non-fatal):", err.message)
      );

      return res.json(cached);
    }

    /* ── 2️⃣ BLOCK IF ALREADY FETCHING ───────────────── */
    if (isFetching) {
      return res
        .status(429)
        .json({ error: "Forecast is already being fetched, try again in a moment" });
    }

    /* ── 3️⃣ BLOCK IF IN COOLDOWN ─────────────────────── */
    const now = Date.now();
    if (now - lastFetchTime < COOLDOWN_MS) {
      const secondsLeft = Math.ceil((COOLDOWN_MS - (now - lastFetchTime)) / 1000);
      return res.status(429).json({ error: `Rate limited. Try again in ${secondsLeft}s` });
    }

    isFetching = true;
    lastFetchTime = Date.now();
    console.log("Cache miss — calling Sealegs SpotCast API (5-day forecast)");

    /* ── 4️⃣ CALL SEALEGS API ─────────────────────────── */
    const submitRes = await fetch("https://api.sealegs.ai/v3/spotcast", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SEALEGS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude,
        longitude,
        start_date,
        num_days,
        vessel_types: [
          "yacht",
          "ferry",
          "pumpboat",
          "speedboat",
          "powerboat",
          "sailboat",
          "catamaran",
          "pwc",
          "cargo",
        ],
      }),
    });

    if (!submitRes.ok) {
      throw new Error(`SpotCast submit failed: ${submitRes.status}`);
    }

    const submitData = await submitRes.json();
    console.log("SUBMIT RESPONSE:", JSON.stringify(submitData, null, 2));
    const { id: spotcastId } = submitData;

    /* ── 5️⃣ POLL UNTIL COMPLETE ──────────────────────── */
    const spotcastData = await pollUntilComplete(spotcastId, SEALEGS_API_KEY);

    /* ── 6️⃣ FORMAT RESPONSE ──────────────────────────── */
    const daily_classifications =
      spotcastData.latest_forecast.ai_analysis.daily_classifications.map(
        (day: any) => ({
          date: day.date,
          classification: day.classification,
          summary: day.summary,
          short_summary: day.short_summary,
        })
      );

    const result = { daily_classifications };

    /* ── 7️⃣ SAVE TO CACHE ────────────────────────────── */
    await saveSpotcastCache(start_date, latitude, longitude, result);
    console.log("SpotCast cached successfully (5-day)");

    /* ── 8️⃣ AUTO-CANCEL DANGEROUS FERRY BOOKINGS ──────── */
    // Awaited here since we're already in the slow path (fresh API call).
    // A cancellation error must never block the weather response.
    try {
      const cancelResult = await checkAndCancelDangerousBookings();
      if (cancelResult.cancelled > 0) {
        console.log(
          `🚫 Auto-cancelled ${cancelResult.cancelled} ferry booking(s) due to NO-GO forecast`
        );
      }
    } catch (cancelErr: any) {
      console.error("Auto-cancel error (non-fatal):", cancelErr.message);
    }

    isFetching = false;
    return res.json(result);
  } catch (err: any) {
    isFetching = false;
    console.error("SpotCast error:", err.message);
    return res.status(500).json({ error: "SpotCast failed", detail: err.message });
  }
}