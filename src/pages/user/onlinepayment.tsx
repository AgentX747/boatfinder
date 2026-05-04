'use client';

import { AlertTriangle, Calendar, CheckCircle2, Clock, CreditCard, Lock, Upload, X, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../utils/apifetch';

interface BookingDetails {
  boat_id: string;
  boat_name: string;
  vessel_type: string;
  capacity: string;
  operator_id: string;
  operatorName: string;
  company_id: string;
  company_name: string;
  route_to: string;
  route_from: string;
  schedules: { departureTime: string; arrivalTime: string }[];
  ticketPrice: string;
  status: string;
  gcash_number: string;
}

interface DayClassification {
  date: string
  classification: string
  summary: string
  short_summary: string
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-blue-600 mb-1">{label}</p>
      <p className="text-base font-semibold text-blue-900">{value || "—"}</p>
    </div>
  );
}

function normalizeClass(raw: string): string {
  const u = (raw ?? "").toUpperCase().trim()
  if (u === "NO-GO" || u === "NOGO" || u === "HIGH" || u === "DANGEROUS") return "NO-GO"
  if (u === "CAUTION") return "CAUTION"
  return "GO"
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    })
  } catch { return dateStr }
}

// ─── NO-GO Block Modal ────────────────────────────────────────────────────────
interface NoGoBlockModalProps {
  open: boolean
  onClose: () => void
  tripDate: string
  shortSummary: string
}

function NoGoBlockModal({ open, onClose, tripDate, shortSummary }: NoGoBlockModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-red-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 sm:px-6 py-4 sm:py-5 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <XCircle className="w-5 h-5 text-white flex-shrink-0" />
              <h2 className="text-white font-bold text-base sm:text-lg">Booking Unavailable</h2>
            </div>
            <p className="text-white/80 text-xs sm:text-sm">
              This trip cannot be booked due to dangerous weather conditions.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800 border border-red-200">
              <XCircle className="w-4 h-4" /> NO-GO
            </span>
            <span className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {formatDate(tripDate)}
            </span>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-900">
                Sealegs SpotCast has classified this date as NO-GO
              </p>
              {shortSummary && (
                <p className="text-xs text-red-700 leading-relaxed">{shortSummary}</p>
              )}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-slate-800">What does this mean?</p>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>Sea conditions on this date are deemed unsafe for maritime travel.</li>
              <li>Trips scheduled on NO-GO dates are automatically cancelled.</li>
              <li>Please go back and choose a different travel date.</li>
            </ul>
          </div>

          <p className="text-xs text-slate-400 text-center">Powered by Sealegs SpotCast AI</p>
        </div>

        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors shadow-md"
          >
            Go Back and Choose a Different Date
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Date classification badge ────────────────────────────────────────────────
function DateBadge({ cls }: { cls: string }) {
  if (cls === "NO-GO") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
      <XCircle className="w-3 h-3" /> NO-GO — Booking Blocked
    </span>
  )
  if (cls === "CAUTION") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
      <AlertTriangle className="w-3 h-3" /> CAUTION — May be affected
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
      <CheckCircle2 className="w-3 h-3" /> GO — Safe to travel
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function OnlinePaymentPage() {
  const navigate     = useNavigate();
  const { boatId }   = useParams();
  const location     = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const routeState = (location.state ?? {}) as {
    tripDate?: string;
    selectedSchedule?: { departureTime: string; arrivalTime: string };
  };
  const tripDate         = routeState.tripDate         ?? "";
  const selectedSchedule = routeState.selectedSchedule ?? null;

  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    boat_id: "", operator_id: "", operatorName: "", route_to: "", route_from: "",
    ticketPrice: "", status: "", boat_name: "", schedules: [], vessel_type: "",
    capacity: "", company_id: "", company_name: "", gcash_number: "",
  });

  // ── Weather state ─────────────────────────────────────────────────────────
  const [weatherClassifications, setWeatherClassifications] = useState<DayClassification[]>([])
  const [tripDateClass, setTripDateClass] = useState<DayClassification | null>(null)
  const [noGoModalOpen, setNoGoModalOpen] = useState(false)
  const [weatherChecked, setWeatherChecked] = useState(false)

  const [receiptFile, setReceiptFile]       = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState("");

  useEffect(() => {
    if (!tripDate || !selectedSchedule) {
      alert("Please select a date and time slot before proceeding to payment.");
      navigate(-1);
      return;
    }

    async function fetchSession() {
      try {
        const res = await apiFetch("https://boatfinder.onrender.com/user/usersession", {
          method: "GET", credentials: "include",
        });
        if (res.status === 401 || res.status === 403) { navigate("/login"); return; }
      } catch (err) {
        console.error("Failed to fetch session", err);
        navigate("/login");
      }
    }

    async function fetchBookingDetails() {
      try {
        const res = await apiFetch(
          `https://boatfinder.onrender.com/user/gettripdetails/${boatId}`,
          { method: "GET", credentials: "include" }
        );
        if (res.status === 401 || res.status === 403) { navigate("/login"); return; }

        const raw = await res.json();
        const data = Array.isArray(raw) ? raw[0] : raw;

        if (!data) {
          console.error("No trip details returned for boatId:", boatId);
          return;
        }

        setBookingDetails({
          boat_id:      String(data.boat_id               ?? ""),
          boat_name:    String(data.boat_name              ?? ""),
          vessel_type:  String(data.vessel_type            ?? ""),
          capacity:     String(data.capacity_information   ?? ""),
          operator_id:  String(data.operator_id            ?? ""),
          operatorName: String(data.operatorName           ?? ""),
          company_id:   String(data.company_id             ?? ""),
          company_name: String(data.companyName            ?? ""),
          route_to:     String(data.route_to               ?? ""),
          route_from:   String(data.route_from             ?? ""),
          schedules:    Array.isArray(data.schedules) ? data.schedules : [],
          ticketPrice:  String(data.ticket_price           ?? ""),
          status:       String(data.status                 ?? ""),
          gcash_number: String(data.gcash_number           ?? ""),
        });
      } catch (err) {
        console.error("Failed to fetch booking details", err);
        navigate("/login");
      }
    }

    // ── Fetch weather classifications and check trip date ─────────────────
    async function fetchWeatherAndCheck() {
      try {
        const res = await fetch("https://boatfinder.onrender.com/weather/airesponse", {
          method: "GET", credentials: "include",
        })
        if (!res.ok) return
        const data = await res.json()
        const classifications: DayClassification[] = data.daily_classifications ?? []
        setWeatherClassifications(classifications)

        // Check if the selected trip date is NO-GO
        const datePart = tripDate.slice(0, 10)
        const match = classifications.find(d => d.date === datePart)
        if (match) {
          setTripDateClass(match)
          if (normalizeClass(match.classification) === "NO-GO") {
            // Show block modal immediately
            setNoGoModalOpen(true)
          }
        }
      } catch (err) {
        console.error("Weather check failed (non-fatal):", err)
      } finally {
        setWeatherChecked(true)
      }
    }

    async function init() {
      await fetchSession();
      await Promise.all([fetchBookingDetails(), fetchWeatherAndCheck()]);
    }
    init();
  }, [boatId, tripDate]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function removeFile() {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Guard: check NO-GO before submitting ──────────────────────────────────
  async function handleSubmit() {
    setError("");

    // Re-check the date classification before allowing submit
    if (tripDateClass && normalizeClass(tripDateClass.classification) === "NO-GO") {
      setNoGoModalOpen(true)
      return
    }

    if (!receiptFile) return setError("Please upload your GCash receipt.");

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("boatId",      bookingDetails.boat_id);
      formData.append("operatorId",  bookingDetails.operator_id);
      formData.append("companyId",   bookingDetails.company_id);
      formData.append("boatName",    bookingDetails.boat_name);
      formData.append("routeFrom",   bookingDetails.route_from);
      formData.append("routeTo",     bookingDetails.route_to);
      formData.append("schedules",   JSON.stringify(selectedSchedule));
      formData.append("ticketPrice", bookingDetails.ticketPrice);
      formData.append("tripDate",    tripDate);
      formData.append("gcashImage",  receiptFile);

      const res = await apiFetch("https://boatfinder.onrender.com/user/onlinebookboat", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        alert("Payment details submitted successfully!");
        navigate("/userdashboard");
      } else {
        const data = await res.json();
        setError(data.message || "Payment failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const currentDateClass = tripDateClass ? normalizeClass(tripDateClass.classification) : null
  const isBlocked = currentDateClass === "NO-GO"

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">

      {/* NO-GO Block Modal */}
      <NoGoBlockModal
        open={noGoModalOpen}
        onClose={() => { setNoGoModalOpen(false); navigate(-1); }}
        tripDate={tripDate}
        shortSummary={tripDateClass?.short_summary || tripDateClass?.summary || ""}
      />

      {/* Header */}
      <div className="max-w-3xl mx-auto mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-blue-900">Secure Payment</h1>
        </div>
        <p className="text-blue-600 text-lg">Complete your booking with GCash payment</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">

        {/* ── Step 1: Booking Summary ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-8 shadow-md border border-blue-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">1</div>
            <h2 className="text-2xl font-bold text-blue-900">Booking Summary</h2>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <SummaryRow label="Boat ID"     value={bookingDetails.boat_id} />
              <SummaryRow label="Boat Name"   value={bookingDetails.boat_name} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SummaryRow label="Vessel Type" value={bookingDetails.vessel_type} />
              <SummaryRow label="Capacity"    value={bookingDetails.capacity} />
            </div>

            <div className="pt-4 border-t border-blue-100 grid grid-cols-2 gap-4">
              <SummaryRow label="Company Name"  value={bookingDetails.company_name} />
              <SummaryRow label="Operator Name" value={bookingDetails.operatorName} />
            </div>

            <div className="pt-4 border-t border-blue-100">
              <SummaryRow
                label="Route"
                value={
                  bookingDetails.route_from && bookingDetails.route_to
                    ? `${bookingDetails.route_from} → ${bookingDetails.route_to}`
                    : ""
                }
              />
            </div>

            {/* Trip Date with weather classification badge */}
            <div className="pt-4 border-t border-blue-100">
              <p className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Trip Date
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
                <div className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 border ${isBlocked ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}>
                  <span className={`font-semibold ${isBlocked ? "text-red-900" : "text-blue-900"}`}>{tripDate}</span>
                </div>
                {weatherChecked && currentDateClass && (
                  <DateBadge cls={currentDateClass} />
                )}
              </div>
              {/* NO-GO inline warning */}
              {isBlocked && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-900">
                      This date is classified NO-GO by Sealegs SpotCast. Booking is not allowed.
                    </p>
                    {tripDateClass?.short_summary && (
                      <p className="text-xs text-red-700 mt-0.5">{tripDateClass.short_summary}</p>
                    )}
                    <button
                      onClick={() => navigate(-1)}
                      className="mt-2 text-xs font-semibold text-red-700 underline underline-offset-2 hover:text-red-900"
                    >
                      ← Go back and choose a different date
                    </button>
                  </div>
                </div>
              )}
              {/* CAUTION inline warning */}
              {currentDateClass === "CAUTION" && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-900">
                      CAUTION: This date may be affected by rough weather. Your trip may be delayed or cancelled.
                    </p>
                    {tripDateClass?.short_summary && (
                      <p className="text-xs text-amber-700 mt-0.5">{tripDateClass.short_summary}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Time Slot */}
            <div className="pt-4 border-t border-blue-100">
              <p className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Selected Time Slot
              </p>
              {selectedSchedule ? (
                <div className="inline-flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <div>
                    <p className="text-xs text-blue-500 mb-0.5">Departure</p>
                    <p className="text-blue-900 font-semibold">{selectedSchedule.departureTime}</p>
                  </div>
                  <span className="text-blue-400 font-bold">→</span>
                  <div>
                    <p className="text-xs text-blue-500 mb-0.5">Arrival</p>
                    <p className="text-blue-900 font-semibold">{selectedSchedule.arrivalTime}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-500">No time slot selected.</p>
              )}
            </div>

            <div className="pt-4 border-t border-blue-100 flex justify-between items-center">
              <p className="text-sm font-semibold text-blue-600">Ticket Price</p>
              <p className="text-xl font-bold text-blue-900">
                ₱{bookingDetails.ticketPrice ? Number(bookingDetails.ticketPrice).toFixed(2) : "0.00"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Blocked state: show prominent banner instead of payment steps ── */}
        {isBlocked ? (
          <div className="bg-white rounded-2xl p-8 shadow-md border border-red-200">
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-900 mb-2">Booking Blocked — NO-GO Date</h3>
                <p className="text-red-700 text-sm max-w-md">
                  Sealegs SpotCast has flagged <span className="font-semibold">{formatDate(tripDate)}</span> as unsafe for maritime travel. You cannot complete this booking.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <button
                  onClick={() => navigate(-1)}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors shadow-md"
                >
                  ← Choose a Different Date
                </button>
                <button
                  onClick={() => setNoGoModalOpen(true)}
                  className="flex-1 py-3 rounded-xl border-2 border-red-200 text-red-700 hover:bg-red-50 font-semibold text-sm transition-colors"
                >
                  View Weather Details
                </button>
              </div>
              <p className="text-xs text-slate-400">Powered by Sealegs SpotCast AI</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Step 2: GCash Payment Instructions ─────────────────────── */}
            <div className="bg-white rounded-2xl p-8 shadow-md border border-blue-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">2</div>
                <h2 className="text-2xl font-bold text-blue-900">GCash Payment</h2>
              </div>

              <div className="space-y-4">
                <p className="text-blue-700 text-sm">
                  Please send your payment to the boat operator's GCash account below, then upload your receipt in the next step.
                </p>

                <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">
                      Operator GCash Number
                    </p>
                    {bookingDetails.gcash_number ? (
                      <p className="text-2xl font-bold text-blue-900 tracking-widest">
                        {bookingDetails.gcash_number}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">GCash number not available</p>
                    )}
                    <p className="text-xs text-blue-500 mt-1">{bookingDetails.operatorName}</p>
                  </div>
                  {bookingDetails.gcash_number && (
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(bookingDetails.gcash_number)}
                      className="self-start sm:self-auto text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition"
                    >
                      Copy Number
                    </button>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                  <p className="font-semibold mb-1">📋 Payment Instructions</p>
                  <ol className="list-decimal list-inside space-y-1 text-amber-700">
                    <li>Open your GCash app and send <strong>₱{bookingDetails.ticketPrice ? Number(bookingDetails.ticketPrice).toFixed(2) : "0.00"}</strong> to the number above.</li>
                    <li>Take a screenshot of the successful transaction receipt.</li>
                    <li>Upload the receipt in Step 3 below.</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* ── Step 3: Receipt Upload ──────────────────────────────────── */}
            <div className="bg-white rounded-2xl p-8 shadow-md border border-blue-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">3</div>
                <h2 className="text-2xl font-bold text-blue-900">Upload Receipt</h2>
              </div>

              <div className="space-y-6">
                <p className="text-blue-700">Upload your GCash payment screenshot to complete the booking.</p>

                {receiptPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-blue-200">
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="w-full max-h-72 object-contain bg-blue-50"
                    />
                    <button
                      onClick={removeFile}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <p className="text-center text-sm text-blue-600 py-2 bg-blue-50">{receiptFile?.name}</p>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-blue-300 rounded-xl p-10 text-center hover:border-blue-600 transition cursor-pointer bg-blue-50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <p className="text-blue-900 font-semibold mb-2">Click to upload receipt</p>
                    <p className="text-sm text-blue-500">PNG, JPG, or WEBP</p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {error && (
                  <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-4 text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm bg-blue-100 border border-blue-300 rounded-lg p-4">
                  <Lock className="w-4 h-4 flex-shrink-0 text-blue-600" />
                  <span className="text-blue-900">Your receipt is securely transmitted and used for verification only.</span>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || isBlocked}
                  className="w-full bg-green-600 text-white font-bold py-4 rounded-lg hover:bg-green-700 transition transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {submitting ? "Processing..." : "Complete Payment"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition"
                >
                  ← Back to Booking
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}