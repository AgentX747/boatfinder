import { Plus, X, AlertTriangle, XCircle, CheckCircle, Wind, Waves, Clock, RefreshCw, Droplets, Gauge, Thermometer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ManagePriceCard from "../../cards/managepricecard.js";
import { ManageBoatsCard, type BoatDetails } from "../../cards/managevesselcard.js";
import OperatorBookingHistoryCard from "../../cards/operatorbookingcard.js";
import ViewBookingsCard from "../../cards/viewbookingscard.js";
import ViewRefundCard from "../../cards/viewrefundcard.js";
import WeatherForecastCard from "../../cards/weatherforecastcard.js";
import BoatOperatorSidebar from "../../components/boatoperatordashboardsidebar.js";
import NearestIslandRecommendation from "../../components/nearestisland.js";
import PricePredictionGraph from "../../components/pricepredictiongraph.js";
import { apiFetch } from "../../utils/apifetch.js";

// ─────────────────────────────────────────────────────────────────────────────
// Official Sealegs SpotCast classification system:
//   GO       – favourable conditions, safe for all vessel types
//   CAUTION  – marginal or changing conditions, exercise care
//   NO-GO    – unsafe conditions, trips likely cancelled
// Aliases: HIGH / DANGEROUS → NO-GO
// Only CAUTION and NO-GO trigger the advisory modal.
// ─────────────────────────────────────────────────────────────────────────────
type SealegsClass = "GO" | "CAUTION" | "NO-GO" | string

function normalizeClass(raw: string): SealegsClass {
  const u = (raw ?? "").toUpperCase().trim()
  if (u === "NO-GO" || u === "NOGO" || u === "HIGH" || u === "DANGEROUS") return "NO-GO"
  if (u === "CAUTION") return "CAUTION"
  return "GO"
}

function isAlertClass(raw: string) {
  const n = normalizeClass(raw)
  return n === "CAUTION" || n === "NO-GO"
}

interface DayClassification {
  date: string
  classification: string
  summary: string
  short_summary: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Backend /weather/getweatherdata response shape
// (from weatherDataController → getWeatherData())
// ─────────────────────────────────────────────────────────────────────────────
interface BackendCurrentWeather {
  time: string
  temperature_c: number
  temperature_f: number
  feels_like_c: number
  precipitation_mm: number
  wind_kph: number
  wind_dir: string
  gust_kph: number
  pressure_mb: number
  cloud_percent: number
  condition: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────
function ClassificationBadge({ raw }: { raw: string }) {
  const cls = normalizeClass(raw)
  if (cls === "NO-GO") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
      <XCircle className="w-3 h-3" /> NO-GO
    </span>
  )
  if (cls === "CAUTION") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
      <AlertTriangle className="w-3 h-3" /> CAUTION
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
      <CheckCircle className="w-3 h-3" /> GO
    </span>
  )
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    })
  } catch { return dateStr }
}

// ─────────────────────────────────────────────────────────────────────────────
// WeatherCautionModal
// ─────────────────────────────────────────────────────────────────────────────
interface WeatherCautionModalProps {
  open: boolean
  onClose: () => void
}

function WeatherCautionModal({ open, onClose }: WeatherCautionModalProps) {
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [allDays, setAllDays]               = useState<DayClassification[]>([])
  const [alertDays, setAlertDays]           = useState<DayClassification[]>([])
  const [showAll, setShowAll]               = useState(false)
  const [currentWeather, setCurrentWeather] = useState<BackendCurrentWeather | null>(null)

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [spotRes, weatherRes] = await Promise.all([
        fetch("https://boatfinder.onrender.com/weather/airesponse", {
          method: "GET", credentials: "include",
        }),
        fetch("https://boatfinder.onrender.com/weather/getweatherdata", {
          method: "GET", credentials: "include",
        }),
      ])

      // ── SpotCast classifications ──────────────────────────────────
      if (!spotRes.ok) throw new Error(`SpotCast fetch failed (${spotRes.status})`)
      const spotData = await spotRes.json()
      const days: DayClassification[] = spotData.daily_classifications ?? []
      setAllDays(days)
      setAlertDays(days.filter(d => isAlertClass(d.classification)))

      // ── WeatherAPI current conditions (best-effort) ───────────────
      // Backend field names from getWeatherData():
      //   temperature_c, temperature_f, feels_like_c, precipitation_mm,
      //   wind_kph, wind_dir, gust_kph, pressure_mb, cloud_percent, condition
      if (weatherRes.ok) {
        const wData = await weatherRes.json()
        if (wData.current) {
          const c = wData.current
          if (c.temperature_c !== undefined) {
            // Shape A — backend-transformed (standard from weatherDataController)
            setCurrentWeather(c as BackendCurrentWeather)
          } else if (c.temp_f !== undefined) {
            // Shape B — raw WeatherAPI passthrough, remap
            setCurrentWeather({
              time:             c.last_updated ?? new Date().toISOString(),
              temperature_c:    Math.round((c.temp_f - 32) * 5 / 9),
              temperature_f:    c.temp_f,
              feels_like_c:     c.feelslike_c ?? Math.round((c.temp_f - 32) * 5 / 9),
              precipitation_mm: c.precip_mm ?? 0,
              wind_kph:         c.wind_kph ?? 0,
              wind_dir:         c.wind_dir ?? "",
              gust_kph:         c.gust_kph ?? 0,
              pressure_mb:      c.pressure_mb ?? 0,
              cloud_percent:    c.cloud ?? 0,
              condition:        c.condition?.text ?? c.condition ?? "",
            })
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load weather data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) { setShowAll(false); fetchData() }
  }, [open])

  if (!open) return null

  const hasNoGo    = alertDays.some(d => normalizeClass(d.classification) === "NO-GO")
  const hasCaution = alertDays.some(d => normalizeClass(d.classification) === "CAUTION")

  const headerGradient = hasNoGo
    ? "from-red-600 to-red-700"
    : hasCaution
    ? "from-amber-500 to-amber-600"
    : "from-blue-600 to-blue-700"

  const displayDays = showAll ? allDays : alertDays

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">

        {/* ── Header ── */}
        <div className={`bg-gradient-to-r ${headerGradient} px-5 sm:px-6 py-4 sm:py-5 flex items-start gap-3`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {hasNoGo
                ? <XCircle className="w-5 h-5 text-white flex-shrink-0" />
                : hasCaution
                ? <AlertTriangle className="w-5 h-5 text-white flex-shrink-0" />
                : <CheckCircle className="w-5 h-5 text-white flex-shrink-0" />}
              <h2 className="text-white font-bold text-base sm:text-lg">Weather Caution Advisory</h2>
            </div>
            <p className="text-white/80 text-xs sm:text-sm">
              {loading
                ? "Fetching latest Sealegs SpotCast forecast…"
                : alertDays.length === 0
                ? "All clear — no caution or no-go conditions detected"
                : `${alertDays.length} day${alertDays.length > 1 ? "s" : ""} with travel advisory`}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={fetchData} disabled={loading}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white disabled:opacity-50"
              title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white"
              title="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Current conditions strip ── */}
        {!loading && currentWeather && (
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-800 text-sm">{currentWeather.condition}</span>
              <span className="text-slate-700 font-bold text-sm">
                {currentWeather.temperature_c}°C
                <span className="text-slate-400 font-normal text-xs ml-1">/ {currentWeather.temperature_f}°F</span>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Wind className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span>
                  <span className="font-medium">{currentWeather.wind_kph} kph</span>
                  <span className="text-slate-400 ml-1">{currentWeather.wind_dir}</span>
                </span>
              </div>
              {currentWeather.gust_kph > 0 && (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Waves className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                  <span>Gusts <span className="font-medium">{currentWeather.gust_kph} kph</span></span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-slate-600">
                <Thermometer className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                <span>Feels <span className="font-medium">{currentWeather.feels_like_c}°C</span></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Gauge className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span><span className="font-medium">{currentWeather.pressure_mb}</span> mb</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="text-slate-400">☁</span>
                <span>Cloud <span className="font-medium">{currentWeather.cloud_percent}%</span></span>
              </div>
              {currentWeather.precipitation_mm > 0 && (
                <div className="flex items-center gap-1.5 text-blue-600">
                  <Droplets className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-medium">{currentWeather.precipitation_mm} mm rain</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-slate-500 text-sm">Loading Sealegs SpotCast data…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="m-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Failed to load forecast</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
                <button onClick={fetchData}
                  className="mt-2 text-xs font-semibold text-red-700 underline underline-offset-2 hover:text-red-900">
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* All clear */}
          {!loading && !error && alertDays.length === 0 && allDays.length > 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-base">No travel advisories</p>
                <p className="text-slate-500 text-sm mt-1">
                  All {allDays.length} forecasted day{allDays.length > 1 ? "s" : ""} are classified
                  as <span className="font-semibold text-green-700">GO</span>.
                  No caution or no-go conditions detected for your routes.
                </p>
              </div>
              <button onClick={() => setShowAll(true)}
                className="mt-1 text-xs font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-800">
                View full {allDays.length}-day forecast anyway
              </button>
            </div>
          )}

          {/* Day cards */}
          {!loading && !error && displayDays.length > 0 && (
            <div className="p-4 sm:p-5 space-y-3">

              {allDays.length > alertDays.length && (
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-slate-500 font-medium">
                    {showAll
                      ? `All ${allDays.length} forecasted days`
                      : `${alertDays.length} advisory day${alertDays.length > 1 ? "s" : ""} (GO days hidden)`}
                  </p>
                  <button onClick={() => setShowAll(p => !p)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2">
                    {showAll ? "Show alerts only" : "Show all days"}
                  </button>
                </div>
              )}

              {displayDays.map((day, i) => {
                const cls      = normalizeClass(day.classification)
                const isNogo   = cls === "NO-GO"
                const isCaut   = cls === "CAUTION"
                const cardBg   = isNogo ? "bg-red-50 border-red-200"
                               : isCaut ? "bg-amber-50 border-amber-200"
                               :          "bg-green-50 border-green-200"
                const textMain = isNogo ? "text-red-900"   : isCaut ? "text-amber-900"   : "text-green-900"
                const textSub  = isNogo ? "text-red-700"   : isCaut ? "text-amber-700"   : "text-green-700"

                return (
                  <div key={`${day.date}-${i}`} className={`rounded-xl border p-4 ${cardBg}`}>
                    <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ClassificationBadge raw={day.classification} />
                        <span className={`text-xs font-medium ${textSub} flex items-center gap-1`}>
                          <Clock className="w-3 h-3" />
                          {formatDate(day.date)}
                        </span>
                      </div>
                    </div>

                    <p className={`text-sm font-semibold ${textMain} leading-snug mb-1`}>
                      {day.short_summary || day.summary}
                    </p>

                    {day.summary && day.summary !== day.short_summary && (
                      <details className="mt-1">
                        <summary className={`text-xs cursor-pointer select-none font-medium ${textSub} hover:underline`}>
                          Read full advisory
                        </summary>
                        <p className={`text-xs ${textSub} mt-1.5 leading-relaxed`}>
                          {day.summary}
                        </p>
                      </details>
                    )}

                    {(isNogo || isCaut) && (
                      <div className={`mt-3 flex items-center gap-1.5 text-xs font-semibold ${textMain} opacity-80`}>
                        <Waves className="w-3.5 h-3.5 flex-shrink-0" />
                        {isNogo
                          ? "Trips on this date are likely cancelled."
                          : "Trips on this date may be delayed or cancelled."}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && !error && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">Powered by Sealegs SpotCast AI</p>
            <button onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface BoatOperatorSession {
  boatOperatorId: string;
  firstName: string;
  lastName: string;
  role?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// RefundsTab
// ─────────────────────────────────────────────────────────────────────────────
function RefundsTab({ refundDetails, navigate }: { refundDetails: any[]; navigate: (path: string) => void }) {
  const [refundStatusTab, setRefundStatusTab] = useState<"pending" | "resolved">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = refundDetails.filter((refund) => {
    const matchesStatus =
      refundStatusTab === "pending"
        ? (refund.status ?? "pending").toLowerCase() === "pending"
        : (refund.status ?? "pending").toLowerCase() !== "pending";

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      String(refund.request_id ?? "").toLowerCase().includes(query) ||
      (refund.ticketcode ?? "").toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-3 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">Refund Requests</h1>
        <p className="text-slate-600 mt-1 text-sm sm:text-base">Manage and review passenger refund requests</p>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setRefundStatusTab("pending")}
            className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm border-2 text-sm sm:text-base ${
              refundStatusTab === "pending"
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white text-amber-600 border-amber-200 hover:bg-amber-50"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setRefundStatusTab("resolved")}
            className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm border-2 text-sm sm:text-base ${
              refundStatusTab === "resolved"
                ? "bg-green-500 text-white border-green-500"
                : "bg-white text-green-600 border-green-200 hover:bg-green-50"
            }`}
          >
            Resolved
          </button>
        </div>

        <div className="flex gap-2 w-full sm:max-w-md">
          <input
            type="text"
            placeholder="Search by Ticket Code or Request ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors text-sm sm:text-base"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="px-3 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-500 mb-4">
        {filtered.length} {refundStatusTab} request{filtered.length !== 1 ? "s" : ""}
        {searchQuery && ` matching "${searchQuery}"`}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <p className="text-base sm:text-lg font-medium text-center">No {refundStatusTab} refund requests found</p>
          {searchQuery && <p className="text-sm mt-1">Try clearing the search filter</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((refund, index) => (
            <ViewRefundCard
              key={refund.request_id ?? index}
              requestId={Number(refund.request_id)}
              ticketCode={refund.ticketcode ?? "N/A"}
              userId={Number(refund.fk_refund_userId)}
              username={refund.passengerName ?? "Unknown"}
              status={refund.status ?? "pending"}
              onViewDetails={() => navigate(`/manageuserrefunds/${refund.request_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BoatOperatorDashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function BoatOperatorDashboard() {
  const [activeTab, setActiveTab]                     = useState("managevesselinformation");
  const [boatCardInfo, setBoatCardInfo]               = useState<BoatDetails[]>([]);
  const [acceptModalOpen, setAcceptModalOpen]         = useState(false);
  const [declineModalOpen, setDeclineModalOpen]       = useState(false);
  const [deleteBoatModalOpen, setDeleteBoatModalOpen] = useState(false);
  const [boatToDelete, setBoatToDelete]               = useState<string | number | null>(null);
  const [selectedBooking, setSelectedBooking]         = useState<any>(null);
  const [ticketCardInfo, setTicketCardInfo]           = useState<any[]>([]);
  const [bookingHistory, setBookingHistory]           = useState<any[]>([]);
  const [refundDetails, setRefundDetails]             = useState<any[]>([]);
  const [ticketSearch, setTicketSearch]               = useState("");
  const [bookingsActiveTab, setBookingsActiveTab]     = useState<"pending" | "accepted" | "history">("pending");
  const [boatOperatorLoggedIn, setBoatOperatorLoggedIn] = useState<BoatOperatorSession>({
    boatOperatorId: "", firstName: "", lastName: "", role: "",
  });
  const [pendingBookings, setPendingBookings]   = useState<any[]>([]);
  const [acceptedBookings, setAcceptedBookings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery]           = useState("");

  // ── Weather caution modal ─────────────────────────────────────────────────
  const [weatherModalOpen, setWeatherModalOpen] = useState(false)

  const navigate = useNavigate();

  const filteredPendingBookings = useMemo(() =>
    pendingBookings.filter((b) => {
      const search = ticketSearch.toLowerCase()
      return (b.ticketcode ?? "").toLowerCase().includes(search) ||
             (b.boatName ?? "").toLowerCase().includes(search)
    }), [pendingBookings, ticketSearch])

  const filteredAcceptedBookings = useMemo(() =>
    acceptedBookings.filter((b) => {
      const search = ticketSearch.toLowerCase()
      return (b.ticketcode ?? "").toLowerCase().includes(search) ||
             (b.boatName ?? "").toLowerCase().includes(search)
    }), [acceptedBookings, ticketSearch])

  const filteredBookingHistory = useMemo(() =>
    bookingHistory.filter((b) => {
      const search = ticketSearch.toLowerCase()
      return (b.ticketcode ?? "").toLowerCase().includes(search) ||
             (b.boatName ?? "").toLowerCase().includes(search)
    }), [bookingHistory, ticketSearch])

  const filteredTickets = useMemo(() =>
    ticketCardInfo.filter((ticket: any) =>
      (ticket.boatName ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    ), [ticketCardInfo, searchQuery]);

  const filterBoats = useMemo(() =>
    boatCardInfo.filter((boat: any) =>
      (boat.boatName ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    ), [boatCardInfo, searchQuery]);

  async function handleLogout() {
    await apiFetch("https://boatfinder.onrender.com/auth/logout", { method: "POST", credentials: "include" });
    navigate("/login");
  }

  useEffect(() => {
    async function fetchOperatorAndBoats() {
      try {
        const sessionRes = await apiFetch("https://boatfinder.onrender.com/boatoperator/boatoperatorsession", {
          method: "GET", credentials: "include",
        });
        if (!sessionRes.ok) { navigate("/login"); return; }
        const sessionData = await sessionRes.json();
        setBoatOperatorLoggedIn({
          boatOperatorId: sessionData.operatorId,
          firstName: sessionData.firstName,
          lastName: sessionData.lastName,
          role: sessionData.role,
        });
        const boatsRes = await apiFetch("https://boatfinder.onrender.com/boatoperator/getboats", {
          method: "GET", credentials: "include",
        });
        if (!boatsRes.ok) throw new Error("Failed to fetch boats");
        setBoatCardInfo(await boatsRes.json());
      } catch (err) {
        console.error("Error fetching operator session or boat info:", err);
        navigate("/login");
      }
    }

    async function fetchPendingBookings() {
      try {
        const res = await apiFetch("https://boatfinder.onrender.com/boatoperator/operatorpendingbookings", { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch pending bookings");
        setPendingBookings(await res.json());
      } catch (err) { console.error("Error fetching pending bookings:", err); }
    }

    async function fetchAcceptedBookings() {
      try {
        const res = await apiFetch("https://boatfinder.onrender.com/boatoperator/operatoracceptedbookings", { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch accepted bookings");
        setAcceptedBookings(await res.json());
      } catch (err) { console.error("Error fetching accepted bookings:", err); }
    }

    async function fetchEditTicketBoatCard() {
      try {
        const res = await apiFetch("https://boatfinder.onrender.com/boatoperator/getticketcard", { method: "GET", credentials: "include" });
        setTicketCardInfo(await res.json());
      } catch (err) { console.error("Error fetching edit boat card details:", err); }
    }

    async function fetchOperatorBookingHistory() {
      try {
        const res = await apiFetch("https://boatfinder.onrender.com/boatoperator/getoperatorbookinghistory", { method: "GET", credentials: "include" });
        setBookingHistory(await res.json());
      } catch (err) { console.error("Error fetching operator booking history:", err); }
    }

    async function getRefundDetails() {
      try {
        const res = await apiFetch("https://boatfinder.onrender.com/boatoperator/getoperatorrefundrequests", { method: "GET", credentials: "include" });
        setRefundDetails(await res.json());
      } catch (err) { console.error("Error fetching operator refund requests:", err); }
    }

    getRefundDetails();
    fetchOperatorBookingHistory();
    fetchEditTicketBoatCard();
    fetchAcceptedBookings();
    fetchPendingBookings();
    fetchOperatorAndBoats();
  }, []);

  function handleAcceptBooking(booking: any) {
    setSelectedBooking(booking);
    setAcceptModalOpen(true);
  }

  async function confirmAcceptBooking() {
    const res = await apiFetch(
      `https://boatfinder.onrender.com/boatoperator/acceptbooking/${selectedBooking.bookingId}`,
      { method: "PATCH", credentials: "include" }
    );
    if (!res.ok) throw new Error("Failed to accept booking");
    return res.json();
  }

  async function declineAcceptBooking() {
    const res = await apiFetch(
      `https://boatfinder.onrender.com/boatoperator/declinebooking/${selectedBooking.bookingId}`,
      { method: "PATCH", credentials: "include" }
    );
    if (!res.ok) throw new Error("Failed to decline booking");
    alert("Booking Declined Successfully");
    window.location.reload();
  }

  function renderActiveTab() {
    switch (activeTab) {
      case "managevesselinformation":
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">Manage Vessel Information</h1>
                    <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base">View and manage your fleet of boats</p>
                  </div>
                  <button
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-colors shadow-md text-sm sm:text-base w-full sm:w-auto"
                    onClick={() => navigate('/addboat')}
                  >
                    <Plus size={18} />
                    Add New Boat
                  </button>
                </div>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
              <div className="mb-12">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-5">Fleet Overview</h2>
                <div className="flex gap-2 w-full sm:max-w-sm mb-2">
                  <input
                    type="text"
                    placeholder="Search by boat name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors text-sm sm:text-base"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")}
                      className="px-3 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors">
                      <X size={16} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-500 mb-6 sm:mb-8 min-h-[1.25rem]">
                  {searchQuery
                    ? `${filterBoats.length} boat${filterBoats.length !== 1 ? "s" : ""} matching "${searchQuery}"`
                    : `${filterBoats.length} boat${filterBoats.length !== 1 ? "s" : ""} total`}
                </p>
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                  {filterBoats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                      <p className="text-base sm:text-lg font-medium text-center">
                        {searchQuery ? `No boats found matching "${searchQuery}"` : "No boats found"}
                      </p>
                      {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="mt-3 text-sm text-blue-500 hover:underline">
                          Clear search
                        </button>
                      )}
                    </div>
                  ) : (
                    filterBoats.map((boat, index) => (
                      <ManageBoatsCard
                        key={index}
                        image={boat.image}
                        boatName={boat.boatName}
                        vesselType={boat.vesselType}
                        capacity={boat.capacity}
                        capacityInformation={Number(boat.capacityInformation)}
                        routeFrom={boat.routeFrom}
                        routeTo={boat.routeTo}
                        boatId={boat.boatId}
                        editBoat={() => navigate(`/editboat/${boat.boatId}`)}
                        deleteBoat={() => { setBoatToDelete(boat.boatId); setDeleteBoatModalOpen(true); }}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case "viewbookingsandreservations":
        return (
          <>
            <main className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-5 sm:py-8 px-3 sm:px-4 md:px-8">
              <div className="mb-5 sm:mb-8">
                <h1 className="text-2xl sm:text-4xl font-bold text-blue-900 mb-1 sm:mb-2">View Reservations and Bookings</h1>
                <p className="text-blue-600 text-sm sm:text-base">Manage all your boat trip bookings and reservations</p>
              </div>
              <div className="flex gap-2 sm:gap-3 mb-5 sm:mb-8 flex-wrap">
                {(["pending", "accepted", "history"] as const).map(tab => (
                  <button key={tab} onClick={() => setBookingsActiveTab(tab)}
                    className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-colors shadow-md text-sm sm:text-base capitalize ${
                      bookingsActiveTab === tab ? "bg-blue-500 text-white" : "bg-white text-blue-600 border-2 border-blue-200 hover:bg-blue-50"
                    }`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 w-full sm:w-72 mb-5 sm:mb-8">
                <input
                  type="text"
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  placeholder="Search by ticket code or boat name..."
                  className="flex-1 px-4 py-2 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none bg-white text-sm placeholder-gray-400 shadow-sm"
                />
                {ticketSearch && (
                  <button onClick={() => setTicketSearch("")}
                    className="px-3 py-2 rounded-lg border-2 border-blue-200 bg-white text-blue-400 hover:bg-blue-50 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {bookingsActiveTab === "pending" && filteredPendingBookings.map((booking) => (
                  <ViewBookingsCard
                    key={booking.bookingId}
                    bookingId={booking.bookingId}
                    ticketcode={booking.ticketcode}
                    boatId={booking.boatId ?? "—"}
                    boatName={booking.boatName ?? "—"}
                    operatorId={boatOperatorLoggedIn?.boatOperatorId ?? "—"}
                    companyName={booking.companyName ?? "—"}
                    passengerName={booking.passengerName ?? "—"}
                    bookingDate={booking.bookingDate}
                    tripDate={booking.tripDate}
                    paymentMethod={booking.paymentMethod ?? "—"}
                    routeFrom={booking.routeFrom ?? "—"}
                    routeTo={booking.routeTo ?? "—"}
                    totalPrice={booking.ticketPrice ?? 0}
                    status={booking.bookingstatus}
                    schedules={booking.schedules ?? null}
                    boatStatus={booking.boatStatus ?? "active"}
                    image={booking.image ?? ""}
                    acceptPendingBookings={() => handleAcceptBooking(booking)}
                    declinePendingBookings={() => { setSelectedBooking(booking); setDeclineModalOpen(true); }}
                  />
                ))}
              </div>

              <div className="space-y-3 sm:space-y-4">
                {bookingsActiveTab === "accepted" && filteredAcceptedBookings.map((booking) => (
                  <ViewBookingsCard
                    key={booking.bookingId}
                    bookingId={booking.bookingId}
                    ticketcode={booking.ticketcode}
                    boatId={booking.boatId ?? "—"}
                    boatName={booking.boatName ?? "—"}
                    operatorId={boatOperatorLoggedIn?.boatOperatorId ?? "—"}
                    companyName={booking.companyName ?? "—"}
                    passengerName={booking.passengerName ?? "—"}
                    bookingDate={booking.bookingDate}
                    tripDate={booking.tripDate}
                    paymentMethod={booking.paymentMethod ?? "—"}
                    routeFrom={booking.routeFrom ?? "—"}
                    routeTo={booking.routeTo ?? "—"}
                    schedules={booking.schedules ?? null}
                    totalPrice={booking.ticketPrice ?? 0}
                    status={booking.bookingstatus}
                    image={booking.image ?? ""}
                    acceptPendingBookings={() => handleAcceptBooking(booking)}
                    declinePendingBookings={() => { setSelectedBooking(booking); setDeclineModalOpen(true); }}
                  />
                ))}
              </div>

              <div className="space-y-3 sm:space-y-4">
                {bookingsActiveTab === "history" && (
                  bookingHistory.length === 0 ? (
                    <p className="text-gray-500 text-center">No booking history found.</p>
                  ) : (
                    filteredBookingHistory.map((booking) => (
                      <OperatorBookingHistoryCard
                        key={booking.bookingId}
                        ticketcode={booking.ticketcode}
                        booking_id={booking.bookingId}
                        passengerName={booking.passengerName}
                        boatName={booking.boatName}
                        boatId={booking.boatId}
                        operatorId={booking.operatorId}
                        paymentMethod={booking.paymentMethod}
                        bookingDate={booking.bookingDate}
                        tripDate={booking.tripDate}
                        routTo={booking.routeTo}
                        routFrom={booking.routeFrom}
                        totalPrice={booking.totalPrice}
                        status={booking.status}
                        boatstatus={booking.boatstatus}
                      />
                    ))
                  )
                )}
              </div>
            </main>

            {/* Accept Modal */}
            {acceptModalOpen && (
              <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-3 sm:p-4 z-50">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-8 relative border border-blue-200 mx-3 sm:mx-0">
                  <button onClick={() => setAcceptModalOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-blue-100 rounded-lg transition-colors">
                    <X className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </button>
                  <h3 className="text-xl sm:text-2xl font-bold text-blue-900 mb-2">Accept Booking?</h3>
                  <p className="text-blue-700 mb-5 sm:mb-6 text-sm sm:text-base">Are you sure you want to accept this booking? This action cannot be undone.</p>
                  <div className="bg-blue-100 p-3 sm:p-4 rounded-lg mb-5 sm:mb-6 border border-blue-300">
                    <p className="text-sm text-blue-700 font-semibold mb-1">Booking ID</p>
                    <p className="font-semibold text-blue-900 text-sm sm:text-base">{selectedBooking?.bookingId}</p>
                    <p className="text-sm text-blue-700 font-semibold mt-3 mb-1">Boat Name</p>
                    <p className="font-semibold text-blue-900 text-sm sm:text-base">{selectedBooking?.boatName}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        confirmAcceptBooking()
                          .then(() => { alert("Booking accepted successfully!"); setAcceptModalOpen(false); window.location.reload(); })
                          .catch((err) => { console.error("Error accepting booking:", err); setAcceptModalOpen(false); });
                      }}
                      className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-md text-sm sm:text-base">
                      Confirm
                    </button>
                    <button onClick={() => setAcceptModalOpen(false)}
                      className="flex-1 px-4 py-2.5 rounded-lg font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors text-sm sm:text-base">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Decline Modal */}
            {declineModalOpen && (
              <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-3 sm:p-4 z-50">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-8 relative border border-blue-200 mx-3 sm:mx-0">
                  <button onClick={() => setDeclineModalOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-blue-100 rounded-lg transition-colors">
                    <X className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </button>
                  <h3 className="text-xl sm:text-2xl font-bold text-blue-900 mb-2">Decline Booking?</h3>
                  <p className="text-blue-700 mb-5 sm:mb-6 text-sm sm:text-base">Are you sure you want to decline this booking? This action cannot be undone.</p>
                  <div className="bg-blue-100 p-3 sm:p-4 rounded-lg mb-5 sm:mb-6 border border-blue-300">
                    <p className="text-sm text-blue-700 font-semibold mb-1">Booking ID</p>
                    <p className="font-semibold text-blue-900 text-sm sm:text-base">{selectedBooking?.bookingId}</p>
                    <p className="text-sm text-blue-700 font-semibold mt-3 mb-1">Boat Name</p>
                    <p className="font-semibold text-blue-900 text-sm sm:text-base">{selectedBooking?.boatName}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        declineAcceptBooking()
                          .then(() => setDeclineModalOpen(false))
                          .catch((err) => { console.error("Error declining booking:", err); alert("Failed to decline booking. Please try again."); setDeclineModalOpen(false); });
                      }}
                      className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-md text-sm sm:text-base">
                      Confirm
                    </button>
                    <button onClick={() => setDeclineModalOpen(false)}
                      className="flex-1 px-4 py-2.5 rounded-lg font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors text-sm sm:text-base">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        );

      case "viewweatherforecast":
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm mb-5 sm:mb-8">
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
                <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">Weather Forecast</h1>
                <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base">Check current conditions and forecasts for your boating routes</p>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-12">
              <WeatherForecastCard onViewDetails={() => navigate("/weatheranalytics")} />
            </div>
          </div>
        );

      case "fareandsurgeriskprediction":
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col justify-center items-center">
            <PricePredictionGraph />
          </div>
        );

      case "managefareandpricing":
        return (
          <div className="min-h-screen bg-gray-50 p-3 sm:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-5 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Manage Fare & Pricing</h1>
                <p className="text-gray-600 text-sm sm:text-base">Edit ticket prices for your boats</p>
              </div>
              <div className="flex gap-2 w-full sm:max-w-sm mb-2">
                <input
                  type="text"
                  placeholder="Search by boat name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors text-sm sm:text-base"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")}
                    className="px-3 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-5 sm:mb-6 min-h-[1.25rem]">
                {searchQuery
                  ? `${filteredTickets.length} boat${filteredTickets.length !== 1 ? "s" : ""} matching "${searchQuery}"`
                  : `${filteredTickets.length} boat${filteredTickets.length !== 1 ? "s" : ""} total`}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket: any) => (
                    <div key={ticket.boat_id} className="w-full">
                      <ManagePriceCard
                        boatName={ticket.boatName}
                        ticketPrice={ticket.ticketPrice}
                        image={ticket.image}
                        editprice={() => navigate(`/editticketprice/${ticket.boat_id}`)}
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-500 text-base sm:text-lg">
                      No boats found{searchQuery ? ` matching "${searchQuery}"` : ""}
                    </p>
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="mt-3 text-sm text-blue-500 hover:underline">
                        Clear search
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "refunds":
        return <RefundsTab refundDetails={refundDetails} navigate={navigate} />;

      case "nearestislandrecommendation":
        return <NearestIslandRecommendation />;

      default:
        return <div>Select an option</div>;
    }
  }

  return (
    <div className="flex min-h-screen">

      {/* ── Weather Caution Modal ─────────────────────────────────────────── */}
      <WeatherCautionModal open={weatherModalOpen} onClose={() => setWeatherModalOpen(false)} />

      {/* Sidebar */}
      <BoatOperatorSidebar
        user={{ firstName: boatOperatorLoggedIn.firstName, lastName: boatOperatorLoggedIn.lastName }}
        goToProfile={() => navigate(`/editboatoperator/${boatOperatorLoggedIn.boatOperatorId}`)}
        renderManageVesselInfo={() => setActiveTab("managevesselinformation")}
        renderViewBookingsAndReservations={() => setActiveTab("viewbookingsandreservations")}
        renderManageFareAndPricing={() => setActiveTab("managefareandpricing")}
        renderViewWeatherForecast={() => setActiveTab("viewweatherforecast")}
        renderFareAndSurgeRiskPrediction={() => setActiveTab("fareandsurgeriskprediction")}
        renderRefunds={() => setActiveTab("refunds")}
        renderNearestIslandRecommendation={() => setActiveTab("nearestislandrecommendation")}
        onWeatherNotification={() => setWeatherModalOpen(true)}
        logout={handleLogout}
      />

      {/* Main content */}
      <div className="flex-1 ml-14 sm:ml-16 lg:ml-72 min-w-0 overflow-x-hidden">
        {renderActiveTab()}
      </div>

      {/* Delete Boat Modal */}
      {deleteBoatModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-8 relative border border-blue-200 mx-3 sm:mx-0">
            <button onClick={() => setDeleteBoatModalOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-blue-100 rounded-lg transition-colors">
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </button>
            <h3 className="text-xl sm:text-2xl font-bold text-blue-900 mb-2">Delete Boat?</h3>
            <p className="text-blue-700 mb-5 sm:mb-6 text-sm sm:text-base">Are you sure you want to delete this boat? This action cannot be undone.</p>
            <div className="bg-blue-100 p-3 sm:p-4 rounded-lg mb-5 sm:mb-6 border border-blue-300">
              <p className="text-sm text-blue-700 font-semibold mb-1">Boat ID</p>
              <p className="font-semibold text-blue-900 text-sm sm:text-base">#{boatToDelete}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const res = await apiFetch(
                      `https://boatfinder.onrender.com/boatoperator/confirmdeleteboat/${boatToDelete}`,
                      { method: "DELETE", credentials: "include" }
                    );
                    if (!res.ok) throw new Error("Failed to delete boat");
                    setDeleteBoatModalOpen(false);
                    window.location.reload();
                  } catch (err) {
                    console.error("Error deleting boat:", err);
                    setDeleteBoatModalOpen(false);
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-md text-sm sm:text-base">
                Confirm
              </button>
              <button onClick={() => setDeleteBoatModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors text-sm sm:text-base">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}