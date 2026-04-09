'use client';
import { useState, useEffect } from 'react';
import {
  Cloud,
  CloudRain,
  Sun,
  MapPin,
  Wind,
  Droplets,
  Eye,
  Gauge,
  Zap,
  AlertCircle,
  Thermometer,
  Navigation,
  TrendingUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyWeatherSummary {
  date: string;
  classification: 'GO' | 'CAUTION' | 'HIGH';
  summary: string;
  short_summary: string;
}

interface AIForecastData {
  daily_classifications: DailyWeatherSummary[];
}

export interface WeatherCondition {
  text?: string;
  icon: string;
  code: number;
}

export interface WeatherLocation {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  tz_id: string;
  localtime_epoch: number;
  localtime: string;
}

export interface CurrentWeather {
  temp_f: number;
  condition: WeatherCondition;
  wind_kph: number;
  wind_dir: string;
  pressure_mb: number;
  precip_mm: number;
  precip_in: number;
  humidity: number;
  cloud: number;
  gust_kph: number;
  last_updated : string;

  
}

export interface HourForecast {
  time: string;
  temp_c: number;
  condition: WeatherCondition;
  wind_kph: number;
  wind_dir: string;
  pressure_mb: number;
  precip_mm: number;
  cloud: number;
  feelslike_c: number;
  chance_of_rain: number;
  gust_kph: number;
}

export interface DayForecast {
  date: string;
  day: {
    maxtemp_f: number;
    mintemp_f: number;
    maxwind_kph: number;
    totalprecip_mm: number;
    daily_will_it_rain: number;
    condition: WeatherCondition;
  };
  hour: HourForecast[];
}

export interface WeatherApiResponse {
  location: WeatherLocation;
  current: CurrentWeather;
  forecast: {
    forecastday: DayForecast[];
  };
}

interface AlertType {
  type: string;
  time: string;
  Icon: React.ComponentType<{ className?: string }>;
  description: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClassificationStyle(classification: 'GO' | 'CAUTION' | 'HIGH') {
  switch (classification) {
    case 'GO':
      return {
        container: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-300 dark:border-green-700',
        badge: 'bg-green-500 dark:bg-green-600 text-white',
        header: 'text-green-900 dark:text-green-100',
        text: 'text-green-700 dark:text-green-300',
        icon: 'text-green-600 dark:text-green-400',
      };
    case 'CAUTION':
      return {
        container: 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-300 dark:border-amber-700',
        badge: 'bg-amber-500 dark:bg-amber-600 text-white',
        header: 'text-amber-900 dark:text-amber-100',
        text: 'text-amber-700 dark:text-amber-300',
        icon: 'text-amber-600 dark:text-amber-400',
      };
    case 'HIGH':
      return {
        container: 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-300 dark:border-red-700',
        badge: 'bg-red-500 dark:bg-red-600 text-white',
        header: 'text-red-900 dark:text-red-100',
        text: 'text-red-700 dark:text-red-300',
        icon: 'text-red-600 dark:text-red-400',
      };
  }
}

function weatherLabel(code: number): string {
  if (code === 1000) return 'Sunny';
  if (code === 1003) return 'Partly cloudy';
  if (code === 1006) return 'Cloudy';
  if (code === 1009) return 'Overcast';
  if (code === 1030) return 'Mist';
  if (code === 1063) return 'Patchy rain';
  if (code === 1066) return 'Patchy snow';
  if (code === 1069) return 'Patchy rain/snow';
  if (code === 1072) return 'Patchy freezing drizzle';
  if (code === 1087) return 'Thundery outbreaks';
  if (code === 1114) return 'Blizzard';
  if (code === 1117) return 'Blizzard';
  if (code === 1135) return 'Fog';
  if (code === 1147) return 'Freezing fog';
  if (code === 1150) return 'Patchy rain nearby';
  if (code === 1153) return 'Light drizzle';
  if (code === 1168) return 'Freezing drizzle';
  if (code === 1171) return 'Heavy freezing drizzle';
  if (code === 1180) return 'Patchy light rain';
  if (code === 1183) return 'Light rain';
  if (code === 1186) return 'Moderate rain';
  if (code === 1189) return 'Heavy rain';
  if (code === 1192) return 'Heavy rain';
  if (code === 1195) return 'Heavy rain';
  if (code === 1198) return 'Light freezing rain';
  if (code === 1201) return 'Moderate/heavy freezing rain';
  if (code === 1204) return 'Light sleet';
  if (code === 1207) return 'Moderate/heavy sleet';
  if (code === 1210) return 'Patchy light snow';
  if (code === 1213) return 'Light snow';
  if (code === 1216) return 'Moderate snow';
  if (code === 1219) return 'Heavy snow';
  if (code === 1222) return 'Heavy snow';
  if (code === 1225) return 'Heavy snow';
  if (code === 1237) return 'Ice pellets';
  if (code === 1240) return 'Light rain showers';
  if (code === 1243) return 'Moderate/heavy rain showers';
  if (code === 1246) return 'Torrential rain showers';
  if (code === 1249) return 'Light sleet showers';
  if (code === 1252) return 'Moderate/heavy sleet showers';
  if (code === 1255) return 'Light snow showers';
  if (code === 1258) return 'Moderate/heavy snow showers';
  if (code === 1261) return 'Light hail showers';
  if (code === 1264) return 'Heavy hail showers';
  if (code === 1273) return 'Patchy light rain/thunder';
  if (code === 1276) return 'Moderate/heavy rain/thunder';
  if (code === 1279) return 'Patchy light snow/thunder';
  if (code === 1282) return 'Moderate/heavy snow/thunder';
  return `Weather (${code})`;
}

function weatherIcon(label: string): React.ComponentType<{ className?: string }> {
  if (
    label.includes('rain') ||
    label.includes('Drizzle') ||
    label.includes('shower') ||
    label.includes('torrential')
  ) {
    return CloudRain;
  }
  if (label.includes('Sunny') || label.includes('Clear')) {
    return Sun;
  }
  return Cloud;
}

function getWeatherIconColor(label: string): string {
  if (label.includes('Sunny') || label.includes('Clear')) {
    return 'text-orange-400';
  }
  if (
    label.includes('rain') ||
    label.includes('Drizzle') ||
    label.includes('shower') ||
    label.includes('torrential')
  ) {
    return 'text-blue-500';
  }
  if (label.includes('Cloudy') || label.includes('Overcast') || label.includes('cloud')) {
    return 'text-gray-400';
  }
  if (label.includes('snow') || label.includes('Blizzard')) {
    return 'text-cyan-300';
  }
  if (label.includes('Thunder') || label.includes('storm')) {
    return 'text-yellow-400';
  }
  if (label.includes('Fog') || label.includes('Mist')) {
    return 'text-slate-400';
  }
  return 'text-blue-400';
}

function formatHour(timeStr: string): string {
  const date = new Date(timeStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDay(dateStr: string, index: number): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function getCurrentHourIndex(times: string[]): number {
  const now = Date.now();
  let closest = 0;
  let minDiff = Infinity;

  times.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - now);
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  });

  return closest;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HourlyForecast({ hourly }: { hourly: HourForecast[] }) {
  const nowIdx = getCurrentHourIndex(hourly.map((h) => h.time));
  const slice = hourly.slice(nowIdx, nowIdx + 8);

  return (
    <div className="bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/40 dark:to-blue-900/30 rounded-2xl shadow-lg border border-blue-200/60 dark:border-blue-800/40 p-6 backdrop-blur-sm">
      <h2 className="text-2xl font-bold mb-5 text-blue-950 dark:text-blue-100">Hourly Forecast</h2>
      <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-blue-100/50 dark:[&::-webkit-scrollbar-track]:bg-blue-950/30 [&::-webkit-scrollbar-thumb]:bg-blue-400 dark:[&::-webkit-scrollbar-thumb]:bg-blue-600 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="flex gap-3 pb-3 min-w-max">
          {slice.map((hour, i) => {
            const temp = Math.round(hour.temp_c);
            const precipProb = hour.chance_of_rain ?? 0;
            const wind = Math.round(hour.wind_kph);

            const label = hour.condition.text || weatherLabel(hour.condition.code);
            const Icon = weatherIcon(label);
            const iconColor = getWeatherIconColor(label);
            const isRainy =
              label.includes('rain') ||
              label.includes('shower') ||
              label.includes('drizzle') ||
              precipProb > 50;

            return (
              <div
                key={`${hour.time}-${i}`}
                className={`flex flex-col items-center p-4 rounded-xl border transition-all duration-200 cursor-default select-none w-24 backdrop-blur-xs
                  ${isRainy
                    ? 'bg-blue-200/70 dark:bg-blue-800/50 border-blue-400/60 dark:border-blue-600/60 shadow-md'
                    : 'bg-white/60 dark:bg-blue-900/40 border-blue-300/50 dark:border-blue-700/50 hover:bg-white/90 dark:hover:bg-blue-800/60 hover:shadow-md'
                  }`}
              >
                <span className="text-xs font-bold text-blue-600 dark:text-blue-300 mb-2 whitespace-nowrap">
                  {formatHour(hour.time)}
                </span>
                <div className={`p-2.5 rounded-lg mb-2 ${isRainy ? 'bg-blue-300/40 dark:bg-blue-700/60' : 'bg-white/80 dark:bg-blue-950/60'}`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <span className="text-xl font-bold text-blue-950 dark:text-blue-100 mb-1">{temp}°</span>
                <span className="text-xs text-blue-700 dark:text-blue-300 text-center whitespace-nowrap mb-3 line-clamp-2 font-medium">
                  {label}
                </span>
                <div className="w-full space-y-1.5 text-xs border-t border-blue-300/40 dark:border-blue-700/40 pt-2">
                  <div className="flex items-center justify-between gap-1 text-blue-600 dark:text-blue-400">
                    <Droplets className="w-3 h-3 flex-shrink-0" />
                    <span className="font-medium">{precipProb}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 text-blue-600 dark:text-blue-400">
                    <Wind className="w-3 h-3 flex-shrink-0" />
                    <span className="font-medium">{wind} km/h</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DailyForecast({ forecast }: { forecast: DayForecast[] }) {
  const dailySlice = forecast.slice(0, 5);

  return (
    <div className="bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/40 dark:to-blue-900/30 p-6 rounded-2xl shadow-lg border border-blue-200/60 dark:border-blue-800/40 backdrop-blur-sm">
      <h2 className="text-2xl font-bold mb-5 text-blue-950 dark:text-blue-100">5-Day Forecast</h2>

      {dailySlice.length === 0 ? (
        <p className="text-blue-600 dark:text-blue-400 text-sm">No forecast data available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {dailySlice.map((day, i) => {
            const cond = day.day.condition.text || weatherLabel(day.day.condition.code);
            const DayIcon = weatherIcon(cond);
            const iconColor = getWeatherIconColor(cond);
            const maxF = Math.round(day.day.maxtemp_f);
            const minF = Math.round(day.day.mintemp_f);

            return (
              <div
                key={day.date}
                className="bg-gradient-to-br from-white/70 to-blue-50/50 dark:from-blue-900/50 dark:to-blue-950/40 p-4 rounded-xl border border-blue-200/70 dark:border-blue-700/60 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 backdrop-blur-xs"
              >
                <h3 className="font-bold text-blue-950 dark:text-blue-100 mb-3 text-sm">
                  {formatDay(day.date, i)}
                </h3>
                <div className="flex justify-center mb-3">
                  <div className="p-2.5 bg-white/60 dark:bg-blue-950/60 rounded-full">
                    <DayIcon className={`w-8 h-8 ${iconColor}`} />
                  </div>
                </div>
                <p className="text-xs text-center text-blue-700 dark:text-blue-300 mb-4 font-medium line-clamp-2">{cond}</p>
                <div className="flex justify-between items-center mb-4">
                  <div className="text-center flex-1">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">High</p>
                    <p className="text-lg font-bold text-blue-950 dark:text-blue-100">{maxF}°</p>
                  </div>
                  <div className="h-8 border-l border-blue-300/40 dark:border-blue-700/40"></div>
                  <div className="text-center flex-1">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Low</p>
                    <p className="text-lg font-bold text-blue-950 dark:text-blue-100">{minF}°</p>
                  </div>
                </div>

                <div className="border-t border-blue-200/50 dark:border-blue-700/40 pt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-blue-700 dark:text-blue-300">
                    <div className="flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-medium">Precip</span>
                    </div>
                    <span className="font-semibold text-blue-900 dark:text-blue-100">{day.day.totalprecip_mm.toFixed(1)} mm</span>
                  </div>
                  <div className="flex items-center justify-between text-blue-700 dark:text-blue-300">
                    <div className="flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-medium">Wind</span>
                    </div>
                    <span className="font-semibold text-blue-900 dark:text-blue-100">{Math.round(day.day.maxwind_kph)} km/h</span>
                  </div>
                  <div className="flex items-center justify-between text-blue-700 dark:text-blue-300">
                    <div className="flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-medium">Rain</span>
                    </div>
                    <span className={`font-semibold ${day.day.daily_will_it_rain ? 'text-blue-600 dark:text-blue-300' : 'text-blue-500 dark:text-blue-400'}`}>
                      {day.day.daily_will_it_rain ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── AI Weather Summary Component ─────────────────────────────────────────────

function AIWeatherSummary({ data }: { data: AIForecastData }) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-blue-950 dark:text-blue-100">Daily AI Weather Summary</h2>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">AI-powered forecast analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {data.daily_classifications.map((day) => {
          const style = getClassificationStyle(day.classification);
          return (
            <div
              key={day.date}
              className={`p-5 rounded-xl border shadow-md hover:shadow-lg transition-all duration-200 backdrop-blur-xs ${style.container}`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <p className={`text-sm font-bold ${style.text}`}>{formatDate(day.date)}</p>
                  <p className={`text-xs ${style.text} opacity-70 mt-1`}>{day.date}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${style.badge} shadow-sm`}>
                  {day.classification === 'GO' && '✓ GO'}
                  {day.classification === 'CAUTION' && '⚠ CAUTION'}
                  {day.classification === 'HIGH' && '🚫 HIGH'}
                </span>
              </div>

              <p className={`text-sm leading-relaxed ${style.text}`}>
                {day.summary}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Weather Alerts ───────────────────────────────────────────────────────────

function WeatherAlerts({ alerts }: { alerts: AlertType[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
          <AlertCircle className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-blue-950 dark:text-blue-100">Weather Alerts</h2>
      </div>
      <div className="space-y-3">
        {alerts.map((alert, idx) => (
          <div
            key={idx}
            className="bg-gradient-to-br from-amber-50/70 to-orange-50/70 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-300/70 dark:border-amber-700/60 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow backdrop-blur-xs"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/60 dark:bg-amber-950/60 rounded-lg mt-0.5 flex-shrink-0">
                <alert.Icon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-950 dark:text-amber-100">{alert.type}</h3>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1.5 leading-relaxed">{alert.description}</p>
                <span className="text-xs text-amber-700 dark:text-amber-400 mt-2.5 inline-block font-medium">
                  {alert.time}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WeatherAnalyticsPage() {
  // ── State Management ───────────────────────────────────────────────────────
  const [location, setLocation] = useState<WeatherLocation | null>(null);
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [hourlyData, setHourlyData] = useState<HourForecast[]>([]);
  const [forecastData, setForecastData] = useState<DayForecast[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [dailyForecast, setDailyForecast] = useState<DailyWeatherSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ─── PATCH: Replace only the fetchWeatherData function body in weatheranalytics.tsx ───
// The backend /weather/getweatherdata returns { current, hourly, daily }
// but the UI expects { location, current, forecast: { forecastday } }
// This adapter re-maps the backend shape without touching anything else.

async function fetchWeatherData() {
  try {
    setLoading(true);
    setError(null);

    console.log('[v0] Starting weather data fetch...');

    const res = await fetch('https://boatfinder.onrender.com/weather/getweatherdata', {
      method: 'GET',
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch weather data: ${res.statusText}`);
    }

    const raw = await res.json();
    console.log('[v0] API Response received:', raw);

    // ── Detect which shape we got and normalise ──────────────────────────────
    // Shape A (raw WeatherAPI passthrough): has raw.location + raw.forecast.forecastday
    // Shape B (backend-transformed):        has raw.current + raw.hourly + raw.daily
    let data: WeatherApiResponse;

    if (raw.forecast?.forecastday) {
      // Shape A — already matches WeatherApiResponse, use as-is
      data = raw as WeatherApiResponse;
    } else if (raw.hourly && raw.daily) {
      // Shape B — re-map to WeatherApiResponse

      // Rebuild forecastday array from daily + hourly
      const forecastday: DayForecast[] = (raw.daily as Array<{
        date: string | Date;
        max_temp_f: number;
        min_temp_f: number;
        max_wind_kph: number;
        total_precip_mm: number;
        condition: string;
      }>).map((day) => {
        const dayDateStr =
          typeof day.date === 'string'
            ? day.date.slice(0, 10)
            : new Date(day.date).toISOString().slice(0, 10);

        // Collect hours that belong to this day
        const dayHours: HourForecast[] = (raw.hourly as Array<{
          time: string | Date;
          temperature_c: number;
          chance_of_rain: number;
          precipitation_mm: number;
          feels_like_c: number;
          wind_kph: number;
          gust_kph: number;
          wind_degree?: number;
          wind_dir: string;
          cloud_percent: number;
        }>)
          .filter((h) => {
            const hDate =
              typeof h.time === 'string'
                ? h.time.slice(0, 10)
                : new Date(h.time).toISOString().slice(0, 10);
            return hDate === dayDateStr;
          })
          .map((h) => ({
            time: typeof h.time === 'string' ? h.time : new Date(h.time).toISOString(),
            temp_c: h.temperature_c,
            condition: { icon: '', code: 1000 } as WeatherCondition,
            wind_kph: h.wind_kph,
            wind_dir: h.wind_dir,
            pressure_mb: 0,
            precip_mm: h.precipitation_mm,
            cloud: h.cloud_percent,
            feelslike_c: h.feels_like_c,
            chance_of_rain: h.chance_of_rain,
            gust_kph: h.gust_kph,
          }));

        return {
          date: dayDateStr,
          day: {
            maxtemp_f: day.max_temp_f,
            mintemp_f: day.min_temp_f,
            maxwind_kph: day.max_wind_kph,
            totalprecip_mm: day.total_precip_mm,
            daily_will_it_rain: day.total_precip_mm > 0 ? 1 : 0,
            condition: {
              text: day.condition,
              icon: '',
              code: 1063,
            } as WeatherCondition,
          },
          hour: dayHours,
        };
      });

      // Re-map current
      const c = raw.current as {
        temperature_f: number;
        condition: string;
        wind_kph: number;
        wind_dir: string;
        pressure_mb: number;
        precipitation_mm: number;
        cloud_percent: number;
        gust_kph: number;
        humidity?: number;
      };

      data = {
        location: raw.location ?? {
          name: 'Unknown',
          region: '',
          country: '',
          lat: 0,
          lon: 0,
          tz_id: '',
          localtime_epoch: Date.now() / 1000,
          localtime: new Date().toLocaleString(),
        },
        current: {
          temp_f: c.temperature_f,
          condition: { text: c.condition, icon: '', code: 1063 } as WeatherCondition,
          wind_kph: c.wind_kph,
          wind_dir: c.wind_dir,
          pressure_mb: c.pressure_mb,
          precip_mm: c.precipitation_mm,
          precip_in: c.precipitation_mm / 25.4,
          humidity: c.humidity ?? 0,
          cloud: c.cloud_percent,
          gust_kph: c.gust_kph,
          last_updated: new Date().toISOString(),
        },
        forecast: { forecastday },
      };
    } else {
      throw new Error('Unexpected API response shape — missing forecast.forecastday and hourly/daily');
    }

    setLocation(data.location);
    setCurrent(data.current);

    // Flatten all hourly data from all forecast days
    const allHourly: HourForecast[] = [];
    data.forecast.forecastday.forEach((day) => {
      allHourly.push(...day.hour);
    });
    setHourlyData(allHourly);

    console.log('[v0] Hourly data count:', allHourly.length);
    setForecastData(data.forecast.forecastday);

    // Derive alerts from current conditions
    const derivedAlerts: AlertType[] = [];
    if (data.current.precip_mm > 0) {
      derivedAlerts.push({
        type: 'Active Rainfall',
        time: 'Now',
        Icon: CloudRain,
        description: `Current precipitation: ${data.current.precip_mm.toFixed(2)} mm. Wind gusts up to ${Math.round(data.current.gust_kph)} km/h.`,
      });
    }

    const nextHours = allHourly.slice(0, 6);
    const maxRainChance = Math.max(...nextHours.map((h) => h.chance_of_rain || 0));
  

    if (maxRainChance > 60) {
      derivedAlerts.push({
        type: 'High Rain Probability',
        time: `${maxRainChance}% chance`,
        Icon: Cloud,
        description: 'High probability of rain in the coming hours. Consider carrying an umbrella.',
      });
    }

    setAlerts(derivedAlerts);
    
  } catch (err) {
    console.error('[v0] Fetch error:', err);
    setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
  } finally {
    setLoading(false);
  }
}

    async function fetchAIResponse(retryCount = 0) {
      try {
        console.log('[v0] Fetching AI response (attempt', retryCount + 1, ')');

      const res = await fetch('https://boatfinder.onrender.com/weather/airesponse', {
      credentials: 'include',
    });

        if (res.status === 429) {
          if (retryCount < 3) {
            console.warn(`[v0] Rate limited, retrying in 10s... (attempt ${retryCount + 1})`);
            setTimeout(() => fetchAIResponse(retryCount + 1), 10000);
          }
          return;
        }

        if (!res.ok) throw new Error(`Error fetching AI response: ${res.statusText}`);

        const data = await res.json();
        console.log('[v0] AI response received:', data);
        setDailyForecast(data.daily_classifications || []);
        console.log('[v0] Daily forecast set:', data.daily_classifications?.length || 0, 'items');
      } catch (error) {
        console.error('[v0] AI fetch error:', error);
      }
    }

    fetchWeatherData();
    fetchAIResponse();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950/40 dark:via-slate-950 dark:to-blue-950/40 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-full w-fit mx-auto">
            <Cloud className="w-12 h-12 text-blue-500 dark:text-blue-400 animate-pulse" />
          </div>
          <p className="text-blue-600 dark:text-blue-300 text-sm font-medium">Loading weather data…</p>
        </div>
      </main>
    );
  }

  if (error || !location || !current) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950/40 dark:via-slate-950 dark:to-blue-950/40 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="p-4 bg-red-100 dark:bg-red-900/50 rounded-full w-fit mx-auto">
            <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-blue-950 dark:text-blue-100">Unable to Load Weather</h1>
          <p className="text-blue-600 dark:text-blue-400 text-sm">{error || 'No data available'}</p>
        </div>
      </main>
    );
  }

  const currentTemp = Math.round((current.temp_f - 32) * (5 / 9));
  const feelsLike = Math.round(currentTemp);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950/40 dark:via-slate-950 dark:to-blue-950/40 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Current Weather Header ─────────────────────────────────────────── */}
                      <div className="relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 p-8 text-white rounded-2xl shadow-2xl border border-blue-400/30 overflow-hidden">
          {/* Subtle decorative element */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl -z-10"></div>
          
          {/* Header section */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-8 border-b border-blue-400/30 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight">Lapu-Lapu, Cebu City</div>
                <div className="text-sm text-white/70">{location.localtime}</div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="relative z-10 flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* ── Left: Temperature Display ── */}
            <div className="flex-shrink-0">
              <div className="mb-6">
                <div className="flex items-start gap-4 mb-8">
                  <div className="flex-shrink-0 p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                    {(() => {
                      const WeatherIcon = weatherIcon(
                        current.condition.text || weatherLabel(current.condition.code)
                      );
                      const iconColor = getWeatherIconColor(
                        current.condition.text || weatherLabel(current.condition.code)
                      );
                      // Override to white for the header, keep colorful for other sections
                      return <WeatherIcon className="w-16 h-16 text-white" />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <div className="text-7xl font-bold tracking-tight mb-2">{currentTemp}°C</div>
                    <div className="text-lg text-white/90 font-medium">
                      {current.condition.text || weatherLabel(current.condition.code)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-white/70">
                  <span>Feels like:</span>
                  <span className="text-white font-semibold">{Math.round((current.temp_f - 32) * 5 / 9)}°C</span>
                </div>
                <div className="flex items-center justify-between text-white/70 pt-2 border-t border-white/20">
                  <span>Last updated:</span>
                  <span className="text-white/90 text-xs font-mono">
                    {new Date(current.last_updated ?? '').toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Right: Weather Stats Grid ── */}
            <div className="flex-1">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Humidity */}
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/20 hover:bg-white/30 transition-all">
                  <div className="text-xs font-medium text-white/80 uppercase tracking-wide mb-2">Humidity</div>
                  <div className="text-3xl font-bold text-white">{current.humidity}<span className="text-lg text-white/60">%</span></div>
                </div>

                {/* Cloud Cover */}
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/20 hover:bg-white/30 transition-all">
                  <div className="text-xs font-medium text-white/80 uppercase tracking-wide mb-2">Cloud Cover</div>
                  <div className="text-3xl font-bold text-white">{current.cloud}<span className="text-lg text-white/60">%</span></div>
                </div>

                {/* Pressure */}
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/20 hover:bg-white/30 transition-all">
                  <div className="text-xs font-medium text-white/80 uppercase tracking-wide mb-2">Pressure</div>
                  <div className="text-3xl font-bold text-white">{Math.round(current.pressure_mb)}<span className="text-lg text-white/60">mb</span></div>
                </div>

                {/* Wind */}
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/20 hover:bg-white/30 transition-all">
                  <div className="text-xs font-medium text-white/80 uppercase tracking-wide mb-2">Wind</div>
                  <div className="text-3xl font-bold text-white">{Math.round(current.wind_kph)}<span className="text-lg text-white/60">km/h</span></div>
                  <div className="text-xs text-white/70 mt-2 font-semibold">Direction: {current.wind_dir}</div>
                </div>

                {/* Gusts */}
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/20 hover:bg-white/30 transition-all">
                  <div className="text-xs font-medium text-white/80 uppercase tracking-wide mb-2">Gusts</div>
                  <div className="text-3xl font-bold text-white">{Math.round(current.gust_kph)}<span className="text-lg text-white/60">km/h</span></div>
                </div>

                {/* Precipitation */}
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/20 hover:bg-white/30 transition-all">
                  <div className="text-xs font-medium text-white/80 uppercase tracking-wide mb-2">Precipitation</div>
                  <div className="text-3xl font-bold text-white">{current.precip_mm.toFixed(1)}<span className="text-lg text-white/60">mm</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* ── Weather Alerts ────────────────────────────────────────────────── */}
        {alerts.length > 0 && <WeatherAlerts alerts={alerts} />}

        {/* ── Hourly Forecast ───────────────────────────────────────────────── */}
        {hourlyData.length > 0 && <HourlyForecast hourly={hourlyData} />}

        {/* ── 5-Day Forecast ────────────────────────────────────────────────── */}
        {forecastData.length > 0 && <DailyForecast forecast={forecastData} />}

        {/* ── Daily AI Weather Summary Section ───────────────────────────────── */}
        {dailyForecast.length > 0 && (
          <AIWeatherSummary data={{ daily_classifications: dailyForecast }} />
        )}
      </div>
    </main>
  );
}
