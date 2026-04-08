'use client';

import { useState, useEffect } from 'react';
import { Cloud, CloudRain, Sun, AlertCircle, ChevronRight } from 'lucide-react';

export interface CurrentWeather {
  temp_c: number;
  temp_f: number;
  feelslike_c: number;
  condition: {
    text: string;
    icon: string;
    code: number;
  };
  wind_kph: number;
  wind_dir: string;
  pressure_mb: number;
  precip_mm: number;
  cloud: number;
  gust_kph: number;
  humidity: number;
  last_updated?: string;
}

interface WeatherData {
  location: any;
  current: CurrentWeather;
  forecast: { forecastday: any[] };
}

interface WeatherForecastCardProps {
  onViewDetails: () => void;
}

function getWeatherIcon(condition: string): typeof Cloud {
  const lower = condition.toLowerCase();
  if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) return CloudRain;
  if (lower.includes('sun') || lower.includes('clear')) return Sun;
  return Cloud;
}

export default function WeatherForecastCard({ onViewDetails }: WeatherForecastCardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWeather() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('https://boatfinder.onrender.com/weather/getweatherdata', {
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch weather data');
        const data = await res.json();
 
        setWeather(data);
      } catch (err) {
        console.error('[WeatherForecastCard] fetch error:', err);
        setError('Unable to load weather data');
      } finally {
        setLoading(false);
      }
    }
    fetchWeather();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-slate-200 rounded" />
          <div className="h-12 w-24 bg-slate-200 rounded" />
          <div className="h-4 w-40 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="w-6 h-6" />
          <p className="font-semibold">{error || 'Weather data unavailable'}</p>
        </div>
      </div>
    );
  }

  const { current } = weather;


const c = current as any;

// Backend only sends temperature_f — convert to Celsius
const temp_c     = Math.round(((c.temperature_f ?? 0) - 32) * 5 / 9);
const feels_like = temp_c; // feelslike not in response, use temp as fallback
const wind       = Math.round(c.wind_kph    ?? 0);
const gusts      = Math.round(c.gust_kph    ?? 0);
const precip     = c.precipitation_mm       ?? 0;
const cloud      = c.cloud_percent          ?? 0;
const pressure   = c.pressure_mb            ?? 0;
const wind_dir   = c.wind_dir               ?? '—';

// condition is missing from backend — derive from precip/wind
const conditionText: string =
  precip > 2 ? 'Rainy' :
  cloud > 70 ? 'Cloudy' :
  cloud > 30 ? 'Partly Cloudy' :
  'Clear';

const WeatherIcon = getWeatherIcon(conditionText);
const isAlert = precip > 2 || wind > 40;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl shadow-lg border border-slate-200 p-8">

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Weather Forecast</h2>
          <p className="text-slate-600">Current conditions for your boating operations</p>
        </div>
        <WeatherIcon className="w-12 h-12 text-blue-500" />
      </div>

      {/* Current Weather Grid */}
      <div className="bg-white rounded-lg p-6 mb-6 border border-slate-200">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">

          {/* Temperature */}
          <div>
            <p className="text-slate-600 text-sm font-medium mb-1">Temperature</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900">{temp_c}</span>
              <span className="text-lg text-slate-600">°C</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Feels like {feels_like}°C</p>
          </div>

          {/* Condition */}
          <div>
            <p className="text-slate-600 text-sm font-medium mb-1">Condition</p>
            <p className="text-2xl font-bold text-slate-900">
              {conditionText !== '—' ? conditionText : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Current status</p>
          </div>

          {/* Wind */}
          
<div >
      <p className="text-slate-600 text-sm font-medium mb-1">Condition</p>
  
  <span className="text-2xl font-bold text-slate-900">{wind}</span>
  <span className="text-sm text-slate-600">km/h</span>
  <span className="text-sm text-slate-400 ml-1">{wind_dir}</span>
</div>



          {/* Precipitation */}
          <div>
            <p className="text-slate-600 text-sm font-medium mb-1">Precipitation</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">{precip.toFixed(1)}</span>
              <span className="text-sm text-slate-600">mm</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Cloud cover: {cloud}%</p>
          </div>

          {/* Pressure */}
          <div>
            <p className="text-slate-600 text-sm font-medium mb-1">Sea Pressure</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">{pressure}</span>
              <span className="text-sm text-slate-600">mb</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {pressure > 1013 ? 'High pressure' : pressure < 1000 ? 'Low pressure' : 'Normal pressure'}
            </p>
          </div>

          {/* Wind Direction */}
          <div>
            <p className="text-slate-600 text-sm font-medium mb-1">Wind Direction</p>
            <p className="text-2xl font-bold text-slate-900">{current.wind_dir || '—'}</p>
            <p className="text-xs text-slate-500 mt-1">Current direction</p>
          </div>

        </div>
      </div>

      {/* Alert Banner */}
      {isAlert && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">⚠️ Weather Alert</p>
            <p className="text-sm text-amber-800">
              {precip > 2 && 'Heavy rainfall detected. '}
              {wind > 40 && 'Strong winds reported. '}
              Check conditions before scheduling trips.
            </p>
          </div>
        </div>
      )}

      {/* View Details Button */}
      <button
        onClick={onViewDetails}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
      >
        View Full Details & Forecast
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}