'use client';
import { AlertTriangle, CheckCircle, Clock, Users, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../../utils/apifetch";

interface BoatData {
  boatId: string;
  boatName: string;
  image?: string;
  vesselType: string;
  capacity: string;          // total capacity from boats table
  operatorId: string;
  companyId: string;
  companyName: string;
  operatorName: string;
  departureLocation: string;
  arrivalLocation: string;
  schedules: { departureTime: string; arrivalTime: string }[];
  ticketPrice: number;
}

interface DetailItemProps {
  label: string;
  value: string;
}

interface DayClassification {
  date: string;
  classification: string;
  summary: string;
  short_summary: string;
}

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium text-blue-600 mb-1">{label}</span>
      <span className="text-base text-gray-900 font-semibold">{value}</span>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeClass(raw: string): string {
  const u = (raw ?? "").toUpperCase().trim();
  if (u === "NO-GO" || u === "NOGO" || u === "HIGH" || u === "DANGEROUS") return "NO-GO";
  if (u === "CAUTION") return "CAUTION";
  return "GO";
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  } catch { return dateStr; }
}

function parseTimeToDate(dateStr: string, timeStr: string): Date | null {
  try {
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let hours   = parseInt(match[1], 10);
    const mins  = parseInt(match[2], 10);
    const ampm  = match[3].toUpperCase();
    if (ampm === "AM" && hours === 12) hours = 0;
    if (ampm === "PM" && hours !== 12) hours += 12;
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day, hours, mins, 0, 0);
  } catch {
    return null;
  }
}

function getTodayStr(): string {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, "0");
  const d   = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSlotAvailable(
  tripDate: string,
  slot: { departureTime: string; arrivalTime: string }
): boolean {
  const todayStr = getTodayStr();
  if (tripDate > todayStr) return true;
  if (tripDate === todayStr) {
    const departure = parseTimeToDate(tripDate, slot.departureTime);
    if (!departure) return true;
    return departure > new Date();
  }
  return false;
}

// ─── NO-GO Block Modal ────────────────────────────────────────────────────────
interface NoGoBlockModalProps {
  open: boolean;
  onClose: () => void;
  tripDate: string;
  shortSummary: string;
  fullSummary: string;
}

function NoGoBlockModal({ open, onClose, tripDate, shortSummary, fullSummary }: NoGoBlockModalProps) {
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    if (!open) setShowFull(false);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-red-200">
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 sm:px-6 py-4 sm:py-5 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <XCircle className="w-5 h-5 text-white flex-shrink-0" />
              <h2 className="text-white font-bold text-base sm:text-lg">Booking Unavailable</h2>
            </div>
            <p className="text-white/80 text-xs sm:text-sm">
              This date has been flagged as unsafe for maritime travel.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800 border border-red-200">
              <XCircle className="w-4 h-4" /> NO-GO
            </span>
            {tripDate && (
              <span className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {formatDate(tripDate)}
              </span>
            )}
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-red-900">
                Sealegs SpotCast — NO-GO Advisory
              </p>
              {shortSummary && (
                <p className="text-xs text-red-700 leading-relaxed">{shortSummary}</p>
              )}
              {fullSummary && fullSummary !== shortSummary && (
                <>
                  {showFull && (
                    <p className="text-xs text-red-600 leading-relaxed mt-1">{fullSummary}</p>
                  )}
                  <button
                    onClick={() => setShowFull(p => !p)}
                    className="text-xs font-semibold text-red-700 underline underline-offset-2 hover:text-red-900 mt-1"
                  >
                    {showFull ? "Show less" : "Read full advisory"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-slate-800">What does this mean?</p>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>Sea conditions on this date are deemed unsafe for maritime travel.</li>
              <li>All trips on NO-GO dates are automatically cancelled for passenger safety.</li>
              <li>Please choose a different date classified as GO or CAUTION.</li>
            </ul>
          </div>

          <p className="text-xs text-slate-400 text-center">Powered by Sealegs SpotCast AI</p>
        </div>

        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors shadow-md"
          >
            Choose a Different Date
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Date weather badge ───────────────────────────────────────────────────────
function DateWeatherBadge({ cls }: { cls: string | null }) {
  if (!cls) return null;
  if (cls === "NO-GO") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
      <XCircle className="w-3.5 h-3.5" /> NO-GO — Booking Blocked
    </span>
  );
  if (cls === "CAUTION") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
      <AlertTriangle className="w-3.5 h-3.5" /> CAUTION — May be affected
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
      <CheckCircle className="w-3.5 h-3.5" /> GO — Safe to travel
    </span>
  );
}

// ─── Seat badge ───────────────────────────────────────────────────────────────
function SeatBadge({ remaining, capacity }: { remaining: number; capacity: number }) {
  if (remaining <= 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
      Full
    </span>
  );
  if (remaining <= Math.ceil(capacity * 0.2)) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
      <Users className="w-3 h-3" /> {remaining} left
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
      <Users className="w-3 h-3" /> {remaining} left
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BookBoat() {
  const { boatID } = useParams();
  const navigate   = useNavigate();

  const [bookDetails, setBookDetails]           = useState<BoatData | null>(null);
  const [tripDate, setTripDate]                 = useState<string>("");
  const [selectedSchedule, setSelectedSchedule] =
    useState<{ departureTime: string; arrivalTime: string } | null>(null);

  // slotCounts: { "7:00 AM": 17, "9:00 AM": 3 }
  // Key = departureTime, value = number of active bookings for that slot on tripDate
  const [slotCounts, setSlotCounts]     = useState<Record<string, number>>({});
  const [slotCountsLoading, setSlotCountsLoading] = useState(false);

  // Weather state
  const [weatherClassifications, setWeatherClassifications] = useState<DayClassification[]>([]);
  const [weatherLoaded, setWeatherLoaded] = useState(false);
  const [noGoModal, setNoGoModal]         = useState<{
    open: boolean; tripDate: string; shortSummary: string; fullSummary: string;
  }>({ open: false, tripDate: "", shortSummary: "", fullSummary: "" });

  const todayStr = getTodayStr();

  // ── Derive classification for selected date ───────────────────────────────
  const selectedDateClass: string | null = (() => {
    if (!tripDate || !weatherLoaded) return null;
    const match = weatherClassifications.find(d => d.date === tripDate.slice(0, 10));
    return match ? normalizeClass(match.classification) : null;
  })();

  const selectedDateInfo: DayClassification | null = (() => {
    if (!tripDate || !weatherLoaded) return null;
    return weatherClassifications.find(d => d.date === tripDate.slice(0, 10)) ?? null;
  })();

  // ── Capacity helpers ──────────────────────────────────────────────────────
  const totalCapacity = Number(bookDetails?.capacity ?? 0);

  function getRemainingSeats(slot: { departureTime: string }): number {
    const booked = slotCounts[slot.departureTime] ?? 0;
    return Math.max(0, totalCapacity - booked);
  }

  function isSlotFull(slot: { departureTime: string }): boolean {
    if (!tripDate || totalCapacity === 0) return false;
    return getRemainingSeats(slot) <= 0;
  }

  // ── Fetch slot counts whenever boat or date changes ───────────────────────
  async function fetchSlotCounts(date: string) {
    if (!boatID || !date) return;
    setSlotCountsLoading(true);
    try {
      const res = await apiFetch(
        `https://boatfinder.onrender.com/user/slotcounts/${boatID}?date=${date}`,
        { method: "GET", credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setSlotCounts(data);
      }
    } catch (err) {
      console.error("Failed to fetch slot counts (non-fatal):", err);
    } finally {
      setSlotCountsLoading(false);
    }
  }

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await apiFetch("https://boatfinder.onrender.com/user/usersession", {
          method: "GET", credentials: "include",
        });
        await res.json();
      } catch (err) {
        console.error("Failed to fetch session", err);
        navigate("/login");
      }
    }

    async function getBookDetails() {
      try {
        const response = await apiFetch(
          `https://boatfinder.onrender.com/user/bookboat/${boatID}`,
          { method: "GET", credentials: "include" }
        );
        const text = await response.text();
        if (!text) { console.error("Empty response received"); return; }
        setBookDetails(JSON.parse(text));
      } catch (err) {
        console.error("Failed to fetch book details", err);
      }
    }

    async function fetchWeather() {
      try {
        const res = await fetch("https://boatfinder.onrender.com/weather/airesponse", {
          method: "GET", credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        setWeatherClassifications(data.daily_classifications ?? []);
      } catch (err) {
        console.error("Weather fetch failed (non-fatal):", err);
      } finally {
        setWeatherLoaded(true);
      }
    }

    fetchSession();
    getBookDetails();
    fetchWeather();
  }, [boatID, navigate]);

  // ── Date change handler ───────────────────────────────────────────────────
  function handleDateChange(newDate: string) {
    setTripDate(newDate);
    setSelectedSchedule(null);
    setSlotCounts({});

    if (newDate) {
      fetchSlotCounts(newDate);
    }

    if (newDate && weatherLoaded) {
      const match = weatherClassifications.find(d => d.date === newDate.slice(0, 10));
      if (match && normalizeClass(match.classification) === "NO-GO") {
        setNoGoModal({
          open: true,
          tripDate: newDate,
          shortSummary: match.short_summary || match.summary,
          fullSummary:  match.summary,
        });
      }
    }
  }

  // ── Weather block guard ───────────────────────────────────────────────────
  function checkWeatherBlock(): boolean {
    if (!tripDate) return false;
    const match = weatherClassifications.find(d => d.date === tripDate.slice(0, 10));
    if (match && normalizeClass(match.classification) === "NO-GO") {
      setNoGoModal({
        open: true,
        tripDate,
        shortSummary: match.short_summary || match.summary,
        fullSummary:  match.summary,
      });
      return true;
    }
    return false;
  }

  // ── Booking validation ────────────────────────────────────────────────────
  function validateBooking(): boolean {
    if (!bookDetails) return false;

    if (!tripDate) {
      alert("Please select a trip date.");
      return false;
    }
    if (tripDate < todayStr) {
      alert("You cannot book a trip on a past date. Please select today or a future date.");
      return false;
    }
    if (checkWeatherBlock()) return false;

    if (!selectedSchedule) {
      alert("Please select a departure/arrival time slot.");
      return false;
    }
    if (tripDate === todayStr && !isSlotAvailable(tripDate, selectedSchedule)) {
      alert(
        `The ${selectedSchedule.departureTime} slot has already passed. ` +
        `Please select a future time slot or a different date.`
      );
      setSelectedSchedule(null);
      return false;
    }

    // Guard: slot full check (double-check server will also enforce this)
    if (isSlotFull(selectedSchedule)) {
      alert(`The ${selectedSchedule.departureTime} slot is fully booked. Please choose another slot.`);
      setSelectedSchedule(null);
      return false;
    }

    return true;
  }

  async function handlePhysicalBooking(bookingBody: any) {
    try {
      const response = await apiFetch(
        "https://boatfinder.onrender.com/user/physicalbookboat",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingBody),
        }
      );
      const data = await response.json();
      if (response.ok) {
        alert("Booking successful!");
        navigate("/userdashboard");
      } else {
        // Refresh slot counts so the UI reflects reality after a 409
        if (response.status === 409) {
          await fetchSlotCounts(tripDate);
          setSelectedSchedule(null);
        }
        alert("Booking failed: " + data.message);
      }
    } catch (error) {
      console.error("Error during physical booking:", error);
    }
  }

  function buildBookingBody() {
    if (!bookDetails || !selectedSchedule) return null;
    return {
      boatId:      bookDetails.boatId            || null,
      boatName:    bookDetails.boatName           || null,
      tripDate:    tripDate                       || null,
      operatorId:  bookDetails.operatorId         || null,
      companyId:   bookDetails.companyId          || null,
      routeFrom:   bookDetails.departureLocation  || null,
      routeTo:     bookDetails.arrivalLocation    || null,
      schedules:   selectedSchedule,
      ticketPrice: bookDetails.ticketPrice        || 0,
    };
  }

  function onPhysicalBook() {
    if (!validateBooking()) return;
    const body = buildBookingBody();
    if (body) handlePhysicalBooking(body);
  }

  function onOnlineBook() {
    if (!validateBooking()) return;
    navigate(`/onlinepayment/${boatID}`, {
      state: { tripDate, selectedSchedule },
    });
  }

  const isBlocked = selectedDateClass === "NO-GO";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">

      <NoGoBlockModal
        open={noGoModal.open}
        onClose={() => setNoGoModal(prev => ({ ...prev, open: false }))}
        tripDate={noGoModal.tripDate}
        shortSummary={noGoModal.shortSummary}
        fullSummary={noGoModal.fullSummary}
      />

      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-8">

        {/* Header */}
        <div className="mb-8 border-b-2 border-blue-200 pb-6">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Book Your Boat</h1>
          <p className="text-blue-600 text-lg">Review the boat details and complete your booking</p>
        </div>

        <div className="space-y-8">

          {/* Boat Image */}
          {bookDetails?.image && (
            <div className="flex flex-col items-center justify-center pb-6 border-b-2 border-blue-200">
              <div className="w-64 h-64 rounded-full overflow-hidden shadow-2xl border-4 border-blue-200 flex items-center justify-center bg-blue-50">
                <img
                  src={bookDetails.image}
                  alt={bookDetails.boatName}
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-3xl font-bold text-blue-900 mt-6">{bookDetails.boatName}</h2>
            </div>
          )}

          {/* Boat Information */}
          <div>
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
              <span className="inline-block w-1 h-6 bg-blue-600 mr-3 rounded" />
              Boat Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50 p-5 rounded-lg">
              <DetailItem label="Boat ID"     value={bookDetails?.boatId     || ""} />
              <DetailItem label="Boat Name"   value={bookDetails?.boatName   || ""} />
              <DetailItem label="Vessel Type" value={bookDetails?.vesselType || ""} />
              {/* Capacity — shows total seats from boats table */}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-blue-600 mb-1">Total Capacity</span>
                <span className="text-base text-gray-900 font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  {bookDetails?.capacity || "—"} seats
                </span>
              </div>
            </div>
          </div>

          {/* Company & Operator */}
          <div>
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
              <span className="inline-block w-1 h-6 bg-blue-600 mr-3 rounded" />
              Company & Operator
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50 p-5 rounded-lg">
              <DetailItem label="Company Name"  value={bookDetails?.companyName  || ""} />
              <DetailItem label="Operator Name" value={bookDetails?.operatorName || ""} />
            </div>
          </div>

          {/* Route Information */}
          <div>
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
              <span className="inline-block w-1 h-6 bg-blue-600 mr-3 rounded" />
              Route Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50 p-5 rounded-lg">
              <DetailItem label="Departure Location" value={bookDetails?.departureLocation || ""} />
              <DetailItem label="Arrival Location"   value={bookDetails?.arrivalLocation   || ""} />
            </div>
          </div>

          {/* Trip Date */}
          <div>
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
              <span className="inline-block w-1 h-6 bg-blue-600 mr-3 rounded" />
              Trip Date
            </h2>
            <div className={`p-5 rounded-lg border-2 transition-colors ${
              isBlocked
                ? "bg-red-50 border-red-300"
                : selectedDateClass === "CAUTION"
                  ? "bg-amber-50 border-amber-200"
                  : "bg-blue-50 border-transparent"
            }`}>
              <label className="block text-sm font-medium text-blue-600 mb-3">
                Select Trip Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={tripDate}
                min={todayStr}
                onChange={(e) => handleDateChange(e.target.value)}
                className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors text-gray-900 ${
                  isBlocked
                    ? "border-red-300 bg-red-50 focus:border-red-500"
                    : "border-blue-200 bg-white focus:border-blue-600"
                }`}
              />

              {tripDate && weatherLoaded && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <DateWeatherBadge cls={selectedDateClass} />
                </div>
              )}

              {isBlocked && selectedDateInfo && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-100 border border-red-300">
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-red-900">
                      Booking is blocked on NO-GO dates. Please choose a different date.
                    </p>
                    {selectedDateInfo.short_summary && (
                      <p className="text-xs text-red-700 leading-relaxed">{selectedDateInfo.short_summary}</p>
                    )}
                    <button
                      onClick={() => setNoGoModal({
                        open: true,
                        tripDate,
                        shortSummary: selectedDateInfo.short_summary || selectedDateInfo.summary,
                        fullSummary:  selectedDateInfo.summary,
                      })}
                      className="text-xs font-semibold text-red-700 underline underline-offset-2 hover:text-red-900 mt-0.5"
                    >
                      View full weather advisory →
                    </button>
                  </div>
                </div>
              )}

              {selectedDateClass === "CAUTION" && selectedDateInfo && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-amber-900">
                      CAUTION: Rough weather expected. Your trip may be delayed or cancelled.
                    </p>
                    {selectedDateInfo.short_summary && (
                      <p className="text-xs text-amber-700 leading-relaxed">{selectedDateInfo.short_summary}</p>
                    )}
                  </div>
                </div>
              )}

              {tripDate && tripDate === todayStr && !isBlocked && (
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  ⚠ Today is selected — only upcoming time slots are available.
                </p>
              )}
            </div>
          </div>

          {/* Schedule — hidden when NO-GO */}
          {!isBlocked && (
            <div>
              <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
                <span className="inline-block w-1 h-6 bg-blue-600 mr-3 rounded" />
                Schedule
              </h2>
              <div className="bg-blue-50 p-5 rounded-lg space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-blue-600">
                    Select a departure / arrival time slot <span className="text-red-500">*</span>
                  </label>
                  {/* Capacity summary when a date is selected */}
                  {tripDate && totalCapacity > 0 && (
                    <span className="text-xs text-blue-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      Total capacity: {totalCapacity} seats
                    </span>
                  )}
                </div>

                {!tripDate && (
                  <p className="text-sm text-slate-500 italic">
                    Please select a trip date above to see available slots.
                  </p>
                )}

                {slotCountsLoading && tripDate && (
                  <p className="text-sm text-blue-400 italic animate-pulse">
                    Loading seat availability…
                  </p>
                )}

                {tripDate && !slotCountsLoading && bookDetails?.schedules && bookDetails.schedules.length > 0 ? (
                  (() => {
                    const available = bookDetails.schedules.filter(s => isSlotAvailable(tripDate, s));
                    const past      = bookDetails.schedules.filter(s => !isSlotAvailable(tripDate, s));

                    return (
                      <>
                        {available.map((slot, index) => {
                          const isSelected =
                            selectedSchedule?.departureTime === slot.departureTime &&
                            selectedSchedule?.arrivalTime   === slot.arrivalTime;
                          const full      = isSlotFull(slot);
                          const remaining = getRemainingSeats(slot);

                          return (
                            <button
                              key={`avail-${index}`}
                              type="button"
                              disabled={full}
                              onClick={() => !full && setSelectedSchedule(slot)}
                              className={`w-full px-5 py-3 rounded-lg border-2 transition text-sm
                                ${full
                                  ? "border-red-200 bg-red-50 text-red-400 cursor-not-allowed opacity-80"
                                  : isSelected
                                    ? "border-blue-600 bg-blue-100 text-blue-900 font-medium cursor-pointer"
                                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
                                }`}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex gap-6 text-left flex-1">
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Departure</p>
                                    <p className="font-semibold">{slot.departureTime}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Arrival</p>
                                    <p className="font-semibold">{slot.arrivalTime}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {/* Seats remaining badge */}
                                  <SeatBadge remaining={remaining} capacity={totalCapacity} />
                                  {isSelected && !full && (
                                    <span className="text-blue-600 font-bold text-lg">✓</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}

                        {past.length > 0 && (
                          <div className="mt-2 space-y-2">
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                              Already passed today
                            </p>
                            {past.map((slot, index) => (
                              <div
                                key={`past-${index}`}
                                className="w-full px-5 py-3 rounded-lg border-2 border-gray-100 bg-gray-50 text-gray-400 text-sm opacity-60 cursor-not-allowed"
                              >
                                <div className="flex gap-6 text-left">
                                  <div>
                                    <p className="text-xs mb-1">Departure</p>
                                    <p className="font-semibold line-through">{slot.departureTime}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs mb-1">Arrival</p>
                                    <p className="font-semibold line-through">{slot.arrivalTime}</p>
                                  </div>
                                  <div className="ml-auto self-center">
                                    <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Passed</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {available.length === 0 && (
                          <p className="text-sm text-red-500 font-medium mt-2">
                            All time slots for today have passed. Please select a future date.
                          </p>
                        )}
                      </>
                    );
                  })()
                ) : (
                  tripDate && !slotCountsLoading && (
                    <p className="text-gray-500 text-sm">No schedules available.</p>
                  )
                )}
              </div>
            </div>
          )}

          {/* Pricing */}
          <div>
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
              <span className="inline-block w-1 h-6 bg-blue-600 mr-3 rounded" />
              Pricing
            </h2>
            <div className="bg-blue-50 p-5 rounded-lg">
              <DetailItem
                label="Ticket Price"
                value={bookDetails?.ticketPrice ? `₱${bookDetails.ticketPrice}` : ""}
              />
            </div>
          </div>

          {/* Booking Method */}
          {isBlocked ? (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-7 h-7 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-900 mb-1">Booking Unavailable — NO-GO Date</h3>
                <p className="text-red-700 text-sm max-w-sm">
                  Sealegs SpotCast has classified{" "}
                  <span className="font-semibold">{formatDate(tripDate)}</span> as unsafe for maritime travel.
                  Please select a different date to proceed.
                </p>
              </div>
              <button
                onClick={() => setNoGoModal({
                  open: true,
                  tripDate,
                  shortSummary: selectedDateInfo?.short_summary || selectedDateInfo?.summary || "",
                  fullSummary:  selectedDateInfo?.summary || "",
                })}
                className="px-5 py-2 rounded-lg border-2 border-red-300 text-red-700 hover:bg-red-100 font-semibold text-sm transition-colors"
              >
                View Weather Advisory
              </button>
              <p className="text-xs text-red-400">Powered by Sealegs SpotCast AI</p>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-200">
              <h2 className="text-xl font-bold text-blue-900 mb-4">Choose Your Booking Method</h2>
              <p className="text-gray-700 mb-6">Select how you'd like to complete your boat booking</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div
                  className="border-2 border-gray-300 rounded-lg p-4 hover:border-blue-600 hover:bg-white transition cursor-pointer"
                  onClick={onPhysicalBook}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-2xl">🎫</div>
                    <div>
                      <h3 className="font-bold text-gray-900">Physical Ticket</h3>
                      <p className="text-sm text-gray-600">Pay at the counter</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-4">
                    Complete your booking and present your ticket directly to the boat operator for your trip.
                  </p>
                  <button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); onPhysicalBook(); }}
                  >
                    Reserve Now
                  </button>
                </div>

                <div
                  className="border-2 border-green-400 rounded-lg p-4 bg-green-50 hover:bg-green-100 transition cursor-pointer"
                  onClick={onOnlineBook}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-2xl">💳</div>
                    <div>
                      <h3 className="font-bold text-gray-900">Online Booking</h3>
                      <p className="text-sm text-green-700 font-medium">Instant confirmation</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-4">
                    Pay online securely and get instant booking confirmation. Convenient digital payment option.
                  </p>
                  <button
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); onOnlineBook(); }}
                  >
                    Proceed to Online Payment
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Cancel */}
          <div className="flex gap-4 pt-6 border-t-2 border-blue-200">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition text-lg cursor-pointer active:scale-95"
            >
              Cancel
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}