'use client';

import { Lock, Upload, CreditCard, CheckCircle2, X, Calendar, Clock } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '../../utils/apifetch';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-blue-600 mb-1">{label}</p>
      <p className="text-base font-semibold text-blue-900">{value || "—"}</p>
    </div>
  );
}

export default function OnlinePaymentPage() {
  const navigate     = useNavigate();
  const { boatId }   = useParams();
  const location     = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Values carried over from BookBoat via router state ──────────────────
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

        // ── getTripDetails returns an array — always pick the first row ───
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

    async function init() {
      await fetchSession();
      await fetchBookingDetails();
    }
    init();
  }, [boatId]);

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

  async function handleSubmit() {
    setError("");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">

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

            {/* Trip Date — read-only from router state */}
            <div className="pt-4 border-t border-blue-100">
              <p className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Trip Date
              </p>
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                <span className="text-blue-900 font-semibold">{tripDate}</span>
              </div>
            </div>

            {/* Time Slot — read-only from router state */}
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

        {/* ── Step 2: GCash Payment Instructions ─────────────────────────── */}
        <div className="bg-white rounded-2xl p-8 shadow-md border border-blue-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">2</div>
            <h2 className="text-2xl font-bold text-blue-900">GCash Payment</h2>
          </div>

          <div className="space-y-4">
            <p className="text-blue-700 text-sm">
              Please send your payment to the boat operator's GCash account below, then upload your receipt in the next step.
            </p>

            {/* Operator GCash number */}
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

        {/* ── Step 3: Receipt Upload ──────────────────────────────────────── */}
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
              disabled={submitting}
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

      </div>
    </div>
  );
}