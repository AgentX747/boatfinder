import { useState, useEffect, useMemo } from "react"
import UserSidebar from "../../components/userdashboardsidebar.js"
import {
  Bookmark, X, AlertTriangle, XCircle, CheckCircle,
  Wind, Waves, Clock, RefreshCw, Droplets, Gauge, Thermometer, SearchX
} from "lucide-react"
import { ViewBoatsCard } from "../../cards/viewboatscard.js"
import { apiFetch } from "../../utils/apifetch.js"
import { useNavigate } from "react-router-dom"
import PendingBookingCard from "../../cards/pendingbookingcard.js"
import AcceptedBookingCard from "../../cards/acceptedbookingcard.js"
import WeatherForecastCard from "../../cards/weatherforecastcard.js"
import UserBookingHistoryCard from "../../cards/bookinghistory.js"
import { Mail, MessageSquare, Tag, AlertCircle, FileText, Clock as ClockIcon } from 'lucide-react'
import { SupportTicketCard } from "../../cards/supportticketcard.js"
import { RefundTicketCard } from "../../cards/refundticketcard.js"
import PricePredictionGraph from "../../components/pricepredictiongraph.js"

// ─────────────────────────────────────────────────────────────────────────────
// Official Sealegs SpotCast classification system:
//   GO       – favourable conditions, safe for all vessel types
//   CAUTION  – marginal or changing conditions, exercise care
//   NO-GO    – unsafe conditions, trips likely cancelled
//
// The API may also return aliases depending on version:
//   HIGH / DANGEROUS → treated as NO-GO
// Only CAUTION and NO-GO trigger the advisory modal alert state.
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

// ── Cancel modal type ─────────────────────────────────────────────────────────
type CancelModalType = "decline" | "cancel" | null

// ─────────────────────────────────────────────────────────────────────────────
// Route map: routeFrom → allowed routeTo values
// ─────────────────────────────────────────────────────────────────────────────
const ROUTE_MAP: Record<string, string[]> = {
  "Marigondon Port": ["Pangan-an Island", "Cawhagan", "Olango"],
  "Hilton":          ["Olango"],
  "Angasil Port":    ["Olango"],
}
const DEPARTURE_PORTS = Object.keys(ROUTE_MAP)

// ─────────────────────────────────────────────────────────────────────────────
// ClassificationBadge
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
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [allDays, setAllDays]         = useState<DayClassification[]>([])
  const [alertDays, setAlertDays]     = useState<DayClassification[]>([])
  const [showAll, setShowAll]         = useState(false)
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

      if (!spotRes.ok) throw new Error(`SpotCast fetch failed (${spotRes.status})`)
      const spotData = await spotRes.json()
      const days: DayClassification[] = spotData.daily_classifications ?? []
      setAllDays(days)
      setAlertDays(days.filter(d => isAlertClass(d.classification)))

      if (weatherRes.ok) {
        const wData = await weatherRes.json()
        if (wData.current) {
          const c = wData.current
          if (c.temperature_c !== undefined) {
            setCurrentWeather(c as BackendCurrentWeather)
          } else if (c.temp_f !== undefined) {
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">

        {/* Header */}
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

        {/* Current conditions strip */}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-slate-500 text-sm">Loading Sealegs SpotCast data…</p>
            </div>
          )}
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
                const textMain = isNogo ? "text-red-900"  : isCaut ? "text-amber-900"  : "text-green-900"
                const textSub  = isNogo ? "text-red-700"  : isCaut ? "text-amber-700"  : "text-green-700"
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

        {/* Footer */}
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
// UserDashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function UserDashboard() {
  const navigate = useNavigate()
  const [ticketTab, setTicketTab] = useState<"message" | "reportdetails" | "refundrequest">("message")

  const [refundDetails, setRefundDetails] = useState({
    ticketCode: "", operatorId: "", shortMessage: "", fileAttachment: null as File | null,
  })
  const [refundTickets, setRefundTickets]   = useState<any[]>([])
  const [supportTickets, setSupportTickets] = useState<any[]>([])

  function handleRefundChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setRefundDetails(prev => ({ ...prev, [name]: value }))
  }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setRefundDetails(prev => ({ ...prev, fileAttachment: file }))
  }

  const [boats, setBoats]                       = useState<any[]>([])
  const [pendingBookings, setPendingBookings]   = useState<any[]>([])
  const [recommendedBoats, setRecommendedBoats] = useState<any[]>([])
  const [boatsLoading, setBoatsLoading]         = useState(true)
  const [bookingHistory, setBookingHistory]     = useState<any[]>([])
  const [acceptedBookings, setAcceptedBookings] = useState<any[]>([])

  const [weatherModalOpen, setWeatherModalOpen] = useState(false)

  const [cancelModalType, setCancelModalType]     = useState<CancelModalType>(null)
  const [cancelBookingId, setCancelBookingId]     = useState<string | null>(null)
  const [cancelBookingCode, setCancelBookingCode] = useState<string>("")
  const [cancelBoatName, setCancelBoatName]       = useState<string>("")
  const [cancelling, setCancelling]               = useState(false)

  const [ticketDetails, setTicketDetails] = useState({ ticketSubject: "", detailedDescription: "" })
  const [userLoggedIn, setUserLoggedIn]   = useState({ user_id: "", firstName: "", lastName: "" })
  const [searchBoat, setSearchBoat]       = useState({ routeTo: "", routeFrom: "", departureTime: "", arrivalTime: "" })
  const [ticketSearch, setTicketSearch]   = useState("")

  // ── NEW: track whether a search has been executed ──────────────────────────
  const [hasSearched, setHasSearched] = useState(false)

  const filteredPendingBookings = useMemo(() =>
    pendingBookings.filter(b => {
      const s = ticketSearch.toLowerCase()
      return (b.ticketcode ?? "").toLowerCase().includes(s) || (b.boatName ?? "").toLowerCase().includes(s)
    }), [pendingBookings, ticketSearch])

  const filteredAcceptedBookings = useMemo(() =>
    acceptedBookings.filter(b => {
      const s = ticketSearch.toLowerCase()
      return (b.ticketcode ?? "").toLowerCase().includes(s) || (b.boatName ?? "").toLowerCase().includes(s)
    }), [acceptedBookings, ticketSearch])

  const filteredBookingHistory = useMemo(() =>
    bookingHistory.filter(b => {
      const s = ticketSearch.toLowerCase()
      return (b.ticketcode ?? "").toLowerCase().includes(s) || (b.boatName ?? "").toLowerCase().includes(s)
    }), [bookingHistory, ticketSearch])

  const [searchResults, setSearchResults]         = useState<any[]>([])
  const [activeTab, setActiveTab]                 = useState("searchrouteandtimeslot")
  type Tab = "pending" | "accepted" | "history"
  const [bookingsActiveTab, setBookingsActiveTab] = useState<Tab>("pending")

  function handleTicketChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setTicketDetails(prev => ({ ...prev, [name]: value }))
  }

  function openCancelModal(bookingId: string, ticketCode: string, boatName: string) {
    setCancelBookingId(bookingId); setCancelBookingCode(ticketCode)
    setCancelBoatName(boatName);   setCancelModalType("cancel")
  }
  function openDeclineModal(bookingId: string, ticketCode: string, boatName: string) {
    setCancelBookingId(bookingId); setCancelBookingCode(ticketCode)
    setCancelBoatName(boatName);   setCancelModalType("decline")
  }
  function closeModal() {
    setCancelModalType(null); setCancelBookingId(null)
    setCancelBookingCode("");  setCancelBoatName(""); setCancelling(false)
  }

  async function handleDeclineBooking() {
    if (!cancelBookingId) return
    setCancelling(true)
    try {
      const res = await apiFetch(`https://boatfinder.onrender.com/user/cancelbooking/${cancelBookingId}`, {
        method: "PATCH", credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to decline booking")
      alert("Booking declined successfully.")
      closeModal()
      window.location.reload()
    } catch (err) {
      console.error(err); alert("Failed to decline booking. Please try again.")
    } finally { setCancelling(false) }
  }

  async function handleCancelBooking() {
    if (!cancelBookingId) return
    setCancelling(true)
    try {
      const res = await apiFetch(`https://boatfinder.onrender.com/user/cancelbooking/${cancelBookingId}`, {
        method: "PATCH", credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to cancel booking")
      alert("Booking cancelled successfully.")
      closeModal()
      setAcceptedBookings(prev => prev.filter(b =>
        b.booking_id !== cancelBookingId && b.bookingId !== cancelBookingId
      ))
    } catch (err) {
      console.error(err); alert("Failed to cancel booking. Please try again.")
    } finally { setCancelling(false) }
  }

  async function handleSearchBoat() {
    try {
      const params = new URLSearchParams()
      if (searchBoat.routeFrom?.trim()) params.append("routeFrom", searchBoat.routeFrom.trim())
      if (searchBoat.routeTo?.trim())   params.append("routeTo",   searchBoat.routeTo.trim())
      if (searchBoat.departureTime)     params.append("departureTime", searchBoat.departureTime)
      if (searchBoat.arrivalTime)       params.append("arrivalTime",   searchBoat.arrivalTime)
      const res = await fetch(
        `https://boatfinder.onrender.com/user/searchboats?${params.toString()}`,
        { method: "GET", credentials: "include" }
      )
      const data = await res.json()
      setSearchResults(data)
      setHasSearched(true)   // ← mark that a search was performed
    } catch (err) { console.error("Search error:", err) }
  }

  // ── NEW: clear search — resets filters and shows all boats ────────────────
  function handleClearSearch() {
    setSearchBoat({ routeTo: "", routeFrom: "", departureTime: "", arrivalTime: "" })
    setSearchResults([])
    setHasSearched(false)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSearchBoat(prev => ({ ...prev, [name]: value }))
  }

  async function handleLogout() {
    await apiFetch("https://boatfinder.onrender.com/auth/logout", { method: "POST", credentials: "include" })
    navigate("/login")
  }

  async function submitRefund() {
    try {
      if (!refundDetails.ticketCode || !refundDetails.operatorId || !refundDetails.shortMessage) {
        alert("Please fill in all required fields."); return
      }
      const formData = new FormData()
      formData.append("ticketCode",  refundDetails.ticketCode)
      formData.append("operatorId",  refundDetails.operatorId)
      formData.append("message",     refundDetails.shortMessage)
      if (refundDetails.fileAttachment) formData.append("refundImage", refundDetails.fileAttachment)
      const res = await fetch("https://boatfinder.onrender.com/user/refundticket", {
        method: "POST", credentials: "include", body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        if (res.status === 404 || (res.status === 401 && err.message === "Operator not found")) {
          alert("Operator not found. Please check the operator ID and try again."); return
        }
        throw new Error(err.message || "Failed to submit refund request")
      }
      alert("Refund request submitted successfully.")
      setRefundDetails({ ticketCode: "", operatorId: "", shortMessage: "", fileAttachment: null })
      setTicketTab("message")
    } catch (error: any) { console.error(error); alert(error.message || "Failed to submit refund request.") }
  }

  async function submitTicket() {
    try {
      const res = await apiFetch("https://boatfinder.onrender.com/user/submitticket", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketDetails),
      })
      if (!res.ok) throw new Error("Failed to submit ticket")
      alert("Ticket submitted successfully")
      window.location.reload()
    } catch (error) { console.error(error); alert("Failed to submit ticket") }
  }

  useEffect(() => {
    async function fetchAll() {
      let userId = ""
      try {
        const res = await apiFetch("https://boatfinder.onrender.com/user/usersession", { method: "GET", credentials: "include" })
        if (res.status === 401 || res.status === 403) { navigate("/login"); return }
        if (!res.ok) throw new Error("Failed to fetch user session")
        const data = await res.json()
        userId = data.userId ?? ""
        setUserLoggedIn({ user_id: userId, firstName: data.firstName, lastName: data.lastName })
      } catch (err) {
        console.error("Failed to fetch session", err); navigate("/login"); return
      }

      async function getallBoats() {
        try {
          const res = await apiFetch("https://boatfinder.onrender.com/user/getallboats", { method: "GET", credentials: "include" })
          setBoats(await res.json())
        } catch (err) { console.error("Failed to fetch all boats", err) }
      }
      async function getRecommendedBoats() {
        setBoatsLoading(true)
        try {
          const res = await apiFetch(`https://boatfinder.onrender.com/user/recommendations/${userId}`, { method: "GET", credentials: "include" })
          if (!res.ok) throw new Error("Failed to fetch recommendations")
          const data = await res.json()
          setRecommendedBoats(
            Array.isArray(data) ? data.map((boat: any) => ({
              ...boat,
              boatId:       boat.boatId      ?? boat.boat_id,
              boatName:     boat.boatName     ?? boat.boat_name,
              vesselType:   boat.vesselType   ?? boat.vessel_type,
              capacity:     boat.capacity     ?? boat.capacity_information,
              ticketPrice:  boat.ticketPrice  ?? boat.ticket_price,
              routeFrom:    boat.routeFrom    ?? boat.route_from,
              routeTo:      boat.routeTo      ?? boat.route_to,
              operatorName: boat.operatorName ?? boat.operator_name,
            })) : []
          )
        } catch (err) { console.error("Failed to fetch recommendations", err); setRecommendedBoats([]) }
        finally { setBoatsLoading(false) }
      }
      async function getPendingBookings() {
        try {
          const res = await apiFetch("https://boatfinder.onrender.com/user/getpendingbookings", { method: "GET", credentials: "include" })
          setPendingBookings(await res.json())
        } catch (err) { console.error("Failed to fetch pending bookings", err) }
      }
      async function getAcceptedBookings() {
        try {
          const res = await apiFetch("https://boatfinder.onrender.com/user/getacceptedbookings", { method: "GET", credentials: "include" })
          setAcceptedBookings(await res.json())
        } catch (err) { console.error("Failed to fetch accepted bookings", err) }
      }
      async function getHistoryBookings() {
        try {
          const res = await apiFetch("https://boatfinder.onrender.com/user/getbookinghistory", { method: "GET", credentials: "include" })
          setBookingHistory(await res.json())
        } catch (err) { console.error("Failed to fetch history bookings", err) }
      }
      async function fetchSupportTickets() {
        try {
          const res = await apiFetch("https://boatfinder.onrender.com/user/getsupportticketcards", { method: "GET", credentials: "include" })
          if (!res.ok) { setSupportTickets([]); return }
          const data = await res.json()
          setSupportTickets(Array.isArray(data) ? data : [])
        } catch (err) { console.error("Failed to fetch support tickets", err); setSupportTickets([]) }
      }
      async function fetchRefundTickets() {
        try {
          const res = await apiFetch("https://boatfinder.onrender.com/user/getrefundticketcards", { method: "GET", credentials: "include" })
          if (!res.ok) { setRefundTickets([]); return }
          const data = await res.json()
          setRefundTickets(Array.isArray(data) ? data : [])
        } catch (err) { console.error("Failed to fetch refund tickets", err); setRefundTickets([]) }
      }

      await Promise.all([
        getallBoats(), getRecommendedBoats(), getPendingBookings(),
        getAcceptedBookings(), getHistoryBookings(), fetchSupportTickets(), fetchRefundTickets(),
      ])
    }
    fetchAll()
  }, [])

  function renderActiveTab() {
    switch (activeTab) {

      // ── Search Route & Timeslot ──────────────────────────────────────────
      case "searchrouteandtimeslot": {

        // Derive available schedule slots from boats matching the current route selection
        const activeBoats = searchResults.length > 0 ? searchResults : boats
        const matchingBoats = activeBoats.filter((boat: any) => {
          const from = boat.routeFrom ?? boat.route_from ?? ""
          const to   = boat.routeTo   ?? boat.route_to   ?? ""
          return (
            (!searchBoat.routeFrom || from === searchBoat.routeFrom) &&
            (!searchBoat.routeTo   || to   === searchBoat.routeTo)
          )
        })

        const allSlots: { departureTime: string; arrivalTime: string }[] = []
        matchingBoats.forEach((boat: any) => {
          const sched = Array.isArray(boat.schedules) ? boat.schedules : []
          sched.forEach((s: any) => {
            const dep = s.departureTime ?? ""
            const arr = s.arrivalTime   ?? ""
            if (dep && !allSlots.some(x => x.departureTime === dep && x.arrivalTime === arr)) {
              allSlots.push({ departureTime: dep, arrivalTime: arr })
            }
          })
        })

        const depTimes = [...new Set(allSlots.map(s => s.departureTime))]
        const arrTimes = [...new Set(
          allSlots
            .filter(s => !searchBoat.departureTime || s.departureTime === searchBoat.departureTime)
            .map(s => s.arrivalTime)
        )]

        const fallbackTimes = [
          "12:00 AM","1:00 AM","2:00 AM","3:00 AM","4:00 AM","5:00 AM",
          "6:00 AM","7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM",
          "12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM",
          "6:00 PM","7:00 PM","8:00 PM","9:00 PM","10:00 PM","11:00 PM",
        ]

        // The list to show in the table: if searched and no results → show nothing (handled below)
        const tableBoats = hasSearched ? searchResults : boats
        const noResults  = hasSearched && searchResults.length === 0

        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-8">
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8 mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">Search Route and Timeslot</h1>
                <p className="text-gray-600 mb-6 text-sm sm:text-base">Here you can search for available boat routes and timeslots.</p>

                <div className="space-y-6">

                  {/* ── Route ───────────────────────────────────────────── */}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-blue-600 mb-4">Route</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                      {/* Origin — dropdown */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Origin</label>
                        <select
                          name="routeFrom"
                          className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm sm:text-base"
                          value={searchBoat.routeFrom}
                          onChange={(e) => {
                            setSearchBoat(prev => ({
                              ...prev,
                              routeFrom: e.target.value,
                              routeTo: "",
                              departureTime: "",
                              arrivalTime: "",
                            }))
                            setSearchResults([])
                            setHasSearched(false)
                          }}
                        >
                          <option value="">Select departure port</option>
                          {DEPARTURE_PORTS.map(port => (
                            <option key={port} value={port}>{port}</option>
                          ))}
                        </select>
                      </div>

                      {/* Destination — dropdown filtered by Origin */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                        <select
                          name="routeTo"
                          disabled={!searchBoat.routeFrom}
                          className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm sm:text-base disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                          value={searchBoat.routeTo}
                          onChange={(e) => {
                            setSearchBoat(prev => ({
                              ...prev,
                              routeTo: e.target.value,
                              departureTime: "",
                              arrivalTime: "",
                            }))
                            setSearchResults([])
                            setHasSearched(false)
                          }}
                        >
                          <option value="">
                            {searchBoat.routeFrom ? "Select destination" : "Select origin first"}
                          </option>
                          {(ROUTE_MAP[searchBoat.routeFrom] ?? []).map(dest => (
                            <option key={dest} value={dest}>{dest}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ── Timeslot ─────────────────────────────────────────── */}
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-blue-600 mb-4">Timeslot</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

                      {/* Departure Time */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Departure Time</label>
                        <select
                          name="departureTime"
                          className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm sm:text-base"
                          value={searchBoat.departureTime}
                          onChange={(e) => setSearchBoat(prev => ({
                            ...prev,
                            departureTime: e.target.value,
                            arrivalTime: "",
                          }))}
                        >
                          <option value="">Select departure time</option>
                          {(depTimes.length > 0 ? depTimes : fallbackTimes).map((t, i) => (
                            <option key={`dep-${i}`} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* Arrival Time — filtered by selected departure */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Arrival Time</label>
                        <select
                          name="arrivalTime"
                          disabled={!searchBoat.departureTime}
                          className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm sm:text-base disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                          value={searchBoat.arrivalTime}
                          onChange={handleSearchChange}
                        >
                          <option value="">
                            {searchBoat.departureTime ? "Select arrival time" : "Select departure first"}
                          </option>
                          {(arrTimes.length > 0 ? arrTimes : fallbackTimes).map((t, i) => (
                            <option key={`arr-${i}`} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ── Action buttons ────────────────────────────────────── */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md text-sm sm:text-base"
                      onClick={handleSearchBoat}
                    >
                      Search
                    </button>

                    {/* Clear button — only shown after a search has been performed */}
                    {hasSearched && (
                      <button
                        className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg border-2 border-blue-300 hover:bg-blue-50 transition-colors shadow-sm text-sm sm:text-base flex items-center gap-2"
                        onClick={handleClearSearch}
                      >
                        <X className="w-4 h-4" />
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Results Table / Not-Found State ───────────────────────── */}
              {noResults ? (
                // ── No boats found ──────────────────────────────────────────
                <div className="bg-white rounded-lg shadow-lg p-10 flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                    <SearchX className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800 mb-1">No boats found</p>
                    <p className="text-gray-500 text-sm max-w-sm">
                      No boats match your selected route or timeslot. Try adjusting your filters or
                      click <span className="font-semibold text-blue-600">Clear</span> to see all available boats.
                    </p>
                  </div>
                  <button
                    className="mt-1 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                    onClick={handleClearSearch}
                  >
                    <X className="w-4 h-4" />
                    Clear & Show All Boats
                  </button>
                </div>
              ) : (
                // ── Boats table ─────────────────────────────────────────────
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="bg-blue-600 text-white">
                          {[
                            "Boat ID", "Operator Name", "Boat Name", "Vessel Type",
                            "Capacity", "Ticket Price", "Route From", "Route To",
                            "Schedules", "Actions",
                          ].map(h => (
                            <th key={h} className="px-4 sm:px-6 py-4 text-left font-semibold text-sm">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableBoats.map((boat: any) => (
                          <tr key={boat.boatId || boat.boat_id} className="border-b hover:bg-gray-50">
                            <td className="px-4 sm:px-7 py-4 sm:py-5 text-sm">{boat.boatId || boat.boat_id}</td>
                            <td className="px-4 sm:px-7 py-4 sm:py-5 text-sm">{boat.operatorName}</td>
                            <td className="px-4 sm:px-7 py-4 sm:py-5 text-sm">{boat.boatName || boat.boat_name}</td>
                            <td className="px-4 sm:px-7 py-4 sm:py-5 text-sm">{boat.vesselType || boat.vessel_type}</td>
                            <td className="px-4 sm:px-7 py-4 sm:py-5 text-sm">{boat.capacity || boat.capacity_information}</td>
                            <td className="px-4 sm:px-7 py-4 sm:py-5 text-sm">{boat.ticketPrice || boat.ticket_price}</td>
                            <td className="px-4 sm:px-7 py-4 sm:py-5 text-sm">{boat.routeFrom || boat.route_from}</td>
                            <td className="px-4 sm:px-7 py-4 sm:py-5 text-sm">{boat.routeTo || boat.route_to}</td>

                            {/* Schedules column — clock icon removed */}
                            <td className="px-4 sm:px-6 py-4 sm:py-5">
                              {(() => {
                                const sched = Array.isArray(boat.schedules) ? boat.schedules : []
                                if (sched.length === 0) return (
                                  <span className="text-gray-400 italic text-xs">No schedules</span>
                                )
                                return (
                                  <div className="flex flex-col gap-1">
                                    {sched.map((s: any, i: number) => (
                                      <span
                                        key={i}
                                        className="inline-flex items-center gap-1 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-md px-2 py-0.5 whitespace-nowrap"
                                      >
                                        {/* 🕐 icon removed */}
                                        {s.departureTime} → {s.arrivalTime}
                                      </span>
                                    ))}
                                  </div>
                                )
                              })()}
                            </td>

                            <td className="px-4 sm:px-6 py-4">
                              <button
                                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3 sm:px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm whitespace-nowrap"
                                onClick={() => navigate(`/bookboat/${boat.boatId || boat.boat_id}`)}
                              >
                                <Bookmark className="w-4 h-4" />Book Trip
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        )
      }

      // ── Manage Reservations & Bookings ───────────────────────────────────
      case "managereservationandbookings":
        return (
          <main className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-5 sm:py-8 px-3 sm:px-4 md:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-5 sm:mb-8">
                <h1 className="text-2xl sm:text-4xl font-bold text-blue-900 mb-1 sm:mb-2">Manage Reservations and Bookings</h1>
                <p className="text-blue-600 text-sm sm:text-base">View and manage all your boat trip reservations</p>
              </div>
              <div className="flex gap-2 sm:gap-3 mb-5 sm:mb-8 flex-wrap">
                {(["pending","accepted","history"] as Tab[]).map(tab => (
                  <button key={tab} onClick={() => setBookingsActiveTab(tab)}
                    className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-colors shadow-md text-sm sm:text-base capitalize ${bookingsActiveTab === tab ? "bg-blue-500 text-white" : "bg-white text-blue-600 border-2 border-blue-200 hover:bg-blue-50"}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <input type="text" value={ticketSearch} onChange={e => setTicketSearch(e.target.value)}
                placeholder="Search by ticket code or boat name..."
                className="w-full sm:w-72 px-4 py-2 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none bg-white text-sm placeholder-gray-400 shadow-sm mb-5 sm:mb-8" />
              <div className="space-y-3 sm:space-y-4">
                {bookingsActiveTab === "pending" && (
                  filteredPendingBookings.length > 0 ? filteredPendingBookings.map(booking => (
                    <PendingBookingCard
                      key={booking.ticketcode}
                      boatName={booking.boatName}
                      bookDate={booking.booking_date}
                      schedules={booking.schedules ?? null}
                      bookPrice={booking.total_price}
                      bookingId={booking.ticketcode}
                      tripDate={booking.trip_date}
                      boatStatus={booking.boatstatus ?? "active"}
                      navigateTo={() => navigate(`/currentbookings/${booking.booking_id}`)}
                      declinePendingBookings={() =>
                        openDeclineModal(booking.bookingId ?? booking.booking_id, booking.ticketcode, booking.boatName)
                      }
                    />
                  )) : (
                    <p className="text-gray-500 text-sm sm:text-base">
                      {ticketSearch ? `No pending bookings matching "${ticketSearch}"` : "No pending bookings"}
                    </p>
                  )
                )}
                {bookingsActiveTab === "accepted" && (
                  filteredAcceptedBookings.length > 0 ? filteredAcceptedBookings.map(booking => (
                    <div key={booking.ticketcode} className="relative">
                      <AcceptedBookingCard
                        boatName={booking.boatName}
                        bookDate={booking.booking_date}
                        schedules={booking.schedules ?? null}
                        bookPrice={booking.total_price}
                        bookingId={booking.ticketcode}
                        tripDate={booking.trip_date}
                        boatStatus={booking.boatstatus ?? "active"}
                        navigateTo={() => navigate(`/currentbookings/${booking.booking_id}`)}
                      />
                      <div className="flex justify-end mt-2 px-1" />
                    </div>
                  )) : (
                    <p className="text-gray-500 text-sm sm:text-base">
                      {ticketSearch ? `No accepted bookings matching "${ticketSearch}"` : "No accepted bookings"}
                    </p>
                  )
                )}
                {bookingsActiveTab === "history" && (
                  <>
                    <p className="text-gray-500 mb-4 text-sm sm:text-base">Booking history</p>
                    {filteredBookingHistory.length > 0 ? filteredBookingHistory.map(booking => (
                      <UserBookingHistoryCard
                        key={booking.booking_id}
                        booking_id={booking.booking_id}
                        boatName={booking.boatName}
                        bookDate={booking.bookDate}
                        schedules={booking.schedules ?? null}
                        bookPrice={booking.bookPrice}
                        status={booking.status}
                        boatstatus={booking.boatstatus}
                        tripDate={booking.trip_date}
                        ticketCode={booking.ticketcode}
                      />
                    )) : (
                      <p className="text-sm text-gray-400">
                        {ticketSearch ? `No history matching "${ticketSearch}"` : "No past bookings found."}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </main>
        )

      // ── View Boats ───────────────────────────────────────────────────────
      case "viewboats":
        return (
          <>
            <div className="relative w-full overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 py-12 sm:py-16 md:py-20">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ opacity: 0.1 }}>
                <defs>
                  <style>{`
                    @keyframes wave1 { 0% { transform:translateX(0); } 100% { transform:translateX(1200px); } }
                    @keyframes wave2 { 0% { transform:translateX(-1200px); } 100% { transform:translateX(0); } }
                    .wave1 { animation: wave1 15s linear infinite; }
                    .wave2 { animation: wave2 10s linear infinite; }
                  `}</style>
                </defs>
                <path className="wave1" d="M0,60 Q300,30 600,60 T1200,60 L1200,120 L0,120 Z" fill="white" />
                <path className="wave2" d="M0,70 Q300,40 600,70 T1200,70 L1200,120 L0,120 Z" fill="white" />
              </svg>
              <div className="absolute top-4 right-8 opacity-10 text-white text-4xl sm:text-5xl">⚓</div>
              <div className="absolute bottom-4 left-8 opacity-10 text-white text-3xl sm:text-4xl">⚓</div>
              <div className="relative z-10 px-4 sm:px-8 md:px-12 flex flex-col justify-center">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">Most Recommended Boats</h2>
                <p className="text-base sm:text-lg text-blue-100 max-w-2xl">Here are the most recommended boats for your liking</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-300 to-transparent opacity-30" />
            </div>
            <div className="flex flex-row flex-wrap gap-4 sm:gap-5 p-4 sm:p-8" style={{ background: "#f0f6ff" }}>
              {boatsLoading ? (
                <p className="text-sm text-gray-400 w-full text-center py-10">Loading recommended boats…</p>
              ) : recommendedBoats.length === 0 ? (
                <p className="text-sm text-gray-400 w-full text-center py-10">No boats available right now.</p>
              ) : recommendedBoats.map(boat => (
                <ViewBoatsCard
                  key={boat.boatId || boat.boat_id}
                  img={boat.image}
                  boatName={boat.boatName || boat.boat_name}
                  vesselType={boat.vesselType || boat.vessel_type}
                  capacity={boat.capacity || boat.capacity_information}
                  ticketPrice={boat.ticketPrice || boat.ticket_price}
                  operatorName={boat.operatorName || boat.operator_name}
                />
              ))}
            </div>
          </>
        )

      // ── Weather ──────────────────────────────────────────────────────────
      case "weather":
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
        )

      // ── Ticket Support ───────────────────────────────────────────────────
      case "ticketsupport":
        return (
          <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-6 sm:py-12 px-3 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto mb-8 sm:mb-12">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-100 mb-4">
                  <Mail className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                </div>
                <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">Support Center</h1>
                <p className="text-gray-600 text-base sm:text-lg">Create a ticket, track your reports, or request a refund.</p>
              </div>
            </div>
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-blue-100">
                <div className="flex border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white">
                  {[
                    { key: "message",       icon: <MessageSquare className="w-4 h-4 flex-shrink-0" />, label: "Message & Body", short: "Message" },
                    { key: "reportdetails", icon: <Tag className="w-4 h-4 flex-shrink-0" />,           label: "Report Details",  short: "Reports" },
                    { key: "refundrequest", icon: <ClockIcon className="w-4 h-4 flex-shrink-0" />,     label: "Request Refund",  short: "Refund"  },
                  ].map(t => (
                    <button key={t.key} onClick={() => setTicketTab(t.key as any)}
                      className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-center font-semibold flex items-center justify-center gap-1 sm:gap-2 transition-colors text-xs sm:text-sm ${ticketTab === t.key ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-800"}`}>
                      {t.icon}
                      <span className="hidden sm:inline">{t.label}</span>
                      <span className="sm:hidden">{t.short}</span>
                    </button>
                  ))}
                </div>
                <div className="p-4 sm:p-8 lg:p-10">
                  {ticketTab === "message" && (
                    <div className="space-y-6 sm:space-y-8">
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-900">Ticket Subject</label>
                        <div className="relative">
                          <input type="text" name="ticketSubject" placeholder="Brief description of your issue"
                            className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none transition-colors bg-blue-50/30 text-gray-900 placeholder-gray-500 text-sm sm:text-base"
                            value={ticketDetails.ticketSubject} onChange={handleTicketChange} />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2"><MessageSquare className="w-5 h-5 text-blue-400" /></div>
                        </div>
                        <p className="text-xs text-gray-500">Required: 5–100 characters</p>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-900">Detailed Description</label>
                        <div className="relative">
                          <textarea name="detailedDescription" placeholder="Please provide as much detail as possible." rows={6}
                            className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none transition-colors bg-blue-50/30 text-gray-900 placeholder-gray-500 resize-none text-sm sm:text-base"
                            value={ticketDetails.detailedDescription} onChange={handleTicketChange} />
                          <div className="absolute right-4 top-4"><FileText className="w-5 h-5 text-blue-400" /></div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-xs text-gray-500">Minimum 20 characters</p>
                          <span className="text-xs font-medium text-blue-600">{ticketDetails.detailedDescription.length} / 5000</span>
                        </div>
                      </div>
                      <div className="flex gap-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-900">Be as specific as possible. Include error messages, screenshots, or any relevant details.</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={submitTicket} className="flex-1 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-md text-sm sm:text-base">Submit Ticket</button>
                        <button onClick={() => setTicketDetails({ ticketSubject: "", detailedDescription: "" })} className="flex-1 px-6 py-3 rounded-lg border-2 border-blue-200 text-blue-600 font-semibold hover:bg-blue-50 transition-colors text-sm sm:text-base">Clear Form</button>
                      </div>
                    </div>
                  )}
                  {ticketTab === "reportdetails" && (
                    <div className="space-y-8 sm:space-y-10">
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">My Support Tickets</h2>
                        <p className="text-sm text-gray-500 mb-4">All support tickets you have submitted.</p>
                        {supportTickets.length === 0
                          ? <p className="text-gray-400 text-sm italic">No support tickets found.</p>
                          : <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {supportTickets.map((t: any) => (
                                <SupportTicketCard key={t.ticket_id} ticketId={t.ticket_id} adminId={t.adminId ?? null}
                                  ticketSubject={t.ticketSubject} status={t.status}
                                  navigateTo={() => navigate(`/viewticket/${t.ticket_id}`)} />
                              ))}
                            </div>}
                      </div>
                      <hr className="border-blue-100" />
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">My Refund Requests</h2>
                        <p className="text-sm text-gray-500 mb-4">Track the status of your submitted refund requests.</p>
                        {refundTickets.length === 0
                          ? <p className="text-gray-400 text-sm italic">No refund requests found.</p>
                          : <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {refundTickets.map((r: any) => (
                                <RefundTicketCard key={r.request_id} requestId={String(r.request_id)}
                                  ticketCode={r.ticketcode ?? "N/A"} operatorId={String(r.operator_id)}
                                  operatorName={r.operatorName ?? "Unknown"} status={r.status ?? "pending"}
                                  navigateTo={() => navigate(`/viewrefund/${r.request_id}`)} />
                              ))}
                            </div>}
                      </div>
                    </div>
                  )}
                  {ticketTab === "refundrequest" && (
                    <div className="space-y-6 sm:space-y-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-3">
                          <label className="block text-sm font-semibold text-gray-900">Ticket Code</label>
                          <div className="relative">
                            <input type="text" name="ticketCode" placeholder="e.g. TKT-00123"
                              className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none transition-colors bg-blue-50/30 text-gray-900 placeholder-gray-500 text-sm sm:text-base"
                              value={refundDetails.ticketCode} onChange={handleRefundChange} />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2"><Tag className="w-5 h-5 text-blue-400" /></div>
                          </div>
                          <p className="text-xs text-gray-500">Found on your booking confirmation</p>
                        </div>
                        <div className="space-y-3">
                          <label className="block text-sm font-semibold text-gray-900">Operator ID</label>
                          <div className="relative">
                            <input type="text" name="operatorId" placeholder="e.g. OPR-456"
                              className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none transition-colors bg-blue-50/30 text-gray-900 placeholder-gray-500 text-sm sm:text-base"
                              value={refundDetails.operatorId} onChange={handleRefundChange} />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2"><Tag className="w-5 h-5 text-blue-400" /></div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-900">
                          File Attachment <span className="text-gray-400 font-normal ml-1">(optional)</span>
                        </label>
                        <label className="flex flex-col items-center justify-center w-full h-32 sm:h-36 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer bg-blue-50/40 hover:bg-blue-50 transition-colors group">
                          <div className="flex flex-col items-center gap-2 text-center px-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                              <FileText className="w-5 h-5 text-blue-500" />
                            </div>
                            {refundDetails.fileAttachment ? (
                              <><p className="text-sm font-semibold text-blue-700">{refundDetails.fileAttachment.name}</p>
                              <p className="text-xs text-gray-400">{(refundDetails.fileAttachment.size / 1024).toFixed(1)} KB — click to replace</p></>
                            ) : (
                              <><p className="text-sm font-semibold text-blue-600">Click to upload or drag &amp; drop</p>
                              <p className="text-xs text-gray-400">PNG, JPG, PDF up to 10MB</p></>
                            )}
                          </div>
                          <input type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden" onChange={handleFileChange} />
                        </label>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-900">Short Message</label>
                        <div className="relative">
                          <textarea name="shortMessage" placeholder="Briefly state your reason for requesting a refund..." rows={4}
                            className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none transition-colors bg-blue-50/30 text-gray-900 placeholder-gray-500 resize-none text-sm sm:text-base"
                            value={refundDetails.shortMessage} onChange={handleRefundChange} maxLength={300} />
                          <div className="absolute right-4 top-4"><MessageSquare className="w-5 h-5 text-blue-400" /></div>
                        </div>
                        <div className="flex justify-between pt-1">
                          <p className="text-xs text-gray-500">Max 300 characters</p>
                          <span className={`text-xs font-medium ${refundDetails.shortMessage.length >= 280 ? "text-red-500" : "text-blue-600"}`}>
                            {refundDetails.shortMessage.length} / 300
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={submitRefund} className="flex-1 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-md text-sm sm:text-base">Submit Refund Request</button>
                        <button onClick={() => setRefundDetails({ ticketCode: "", operatorId: "", shortMessage: "", fileAttachment: null })}
                          className="flex-1 px-6 py-3 rounded-lg border-2 border-blue-200 text-blue-600 font-semibold hover:bg-blue-50 transition-colors text-sm sm:text-base">Clear Form</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        )

      // ── Fare & Surge Risk Prediction ─────────────────────────────────────
      case "fareandsurgeriskprediction":
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col justify-center items-center">
            <PricePredictionGraph />
          </div>
        )

      default: return null
    }
  }

  const modalConfig = cancelModalType === "cancel" ? {
    title: "Cancel Booking?",
    description: "Are you sure you want to cancel this accepted booking? This action cannot be undone.",
    confirmText: "Confirm Cancel",
    confirmStyle: "bg-red-600 hover:bg-red-700 text-white",
    onConfirm: handleCancelBooking,
  } : {
    title: "Decline Booking?",
    description: "Are you sure you want to decline this pending booking? This action cannot be undone.",
    confirmText: "Confirm Decline",
    confirmStyle: "bg-blue-600 hover:bg-blue-700 text-white",
    onConfirm: handleDeclineBooking,
  }

  return (
    <div className="flex min-h-screen">

      {/* Weather Caution Modal */}
      <WeatherCautionModal open={weatherModalOpen} onClose={() => setWeatherModalOpen(false)} />

      {/* Cancel / Decline Modal */}
      {cancelModalType && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-8 relative border border-blue-200 mx-3 sm:mx-0">
            <button onClick={closeModal}
              className="absolute top-4 right-4 p-1 hover:bg-blue-100 rounded-lg transition-colors text-gray-500 hover:text-gray-800">✕</button>
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${cancelModalType === "cancel" ? "bg-red-100" : "bg-blue-100"}`}>
              <AlertCircle className={`w-6 h-6 ${cancelModalType === "cancel" ? "text-red-600" : "text-blue-600"}`} />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-blue-900 mb-2">{modalConfig.title}</h3>
            <p className="text-blue-700 mb-5 sm:mb-6 text-sm sm:text-base">{modalConfig.description}</p>
            <div className="bg-white p-3 sm:p-4 rounded-lg mb-5 sm:mb-6 border border-blue-200 space-y-3">
              <div>
                <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-0.5">Ticket Code</p>
                <p className="font-semibold text-blue-900 text-sm sm:text-base">{cancelBookingCode || cancelBookingId || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-0.5">Boat Name</p>
                <p className="font-semibold text-blue-900 text-sm sm:text-base">{cancelBoatName || "—"}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={modalConfig.onConfirm} disabled={cancelling}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-colors shadow-md text-sm sm:text-base disabled:opacity-60 ${modalConfig.confirmStyle}`}>
                {cancelling ? "Processing…" : modalConfig.confirmText}
              </button>
              <button onClick={closeModal} disabled={cancelling}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors text-sm sm:text-base disabled:opacity-60">
                Keep Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <UserSidebar
        user={{ firstName: userLoggedIn.firstName, lastName: userLoggedIn.lastName }}
        goToProfile={() => navigate(`/edituser/${userLoggedIn.user_id}`)}
        renderRouteAndTimeslot={() => setActiveTab("searchrouteandtimeslot")}
        renderManageReservationAndBookings={() => setActiveTab("managereservationandbookings")}
        renderViewBoats={() => setActiveTab("viewboats")}
        renderViewWeatherForecast={() => setActiveTab("weather")}
        rendersupportTicket={() => setActiveTab("ticketsupport")}
        renderFareAndSurgeRiskPrediction={() => setActiveTab("fareandsurgeriskprediction")}
        onLogout={handleLogout}
        onWeatherNotification={() => setWeatherModalOpen(true)}
      />

      {/* Main content */}
      <div className="flex-1 ml-14 sm:ml-16 lg:ml-72 min-w-0 overflow-x-hidden">
        {renderActiveTab()}
      </div>
    </div>
  )
}