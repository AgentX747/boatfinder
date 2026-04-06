'use client';

import { Lock, Upload, CreditCard, CheckCircle2, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '../../utils/apifetch';
import { useNavigate, useParams } from 'react-router-dom';



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
}

export default function OnlinePaymentPage() {
  const navigate = useNavigate();
  const { boatId } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    boat_id: "",
    operator_id: "",
    operatorName: "",
    route_to: "",
    route_from: "",
    ticketPrice: "",
    status: "",
    boat_name: "",
    schedules: [],
    vessel_type: "",
    capacity: "",
    company_id: "",
    company_name: "",
  });
  

const [selectedSchedule, setSelectedSchedule] = useState<{ departureTime: string; arrivalTime: string } | null>(null);
  const [gcashNumber, setGcashNumber] = useState("");
  const [gcashName, setGcashName] = useState("");
  const [tripDate, setTripDate] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await apiFetch("http://localhost:3000/user/usersession", {
          method: "GET",
          credentials: "include",
        });
        if (res.status === 401 || res.status === 403) {
          navigate("/login");
          return;
        }
      } catch (err) {
        console.error("Failed to fetch session", err);
        navigate("/login");
      }
    }

    async function fetchBookingDetails() {
      try {
        const res = await apiFetch(`http://localhost:3000/user/gettripdetails/${boatId}`, {
          method: "GET",
          credentials: "include",
        });
        if (res.status === 401 || res.status === 403) {
          navigate("/login");
          return;
        }
        const data = await res.json();
        setBookingDetails({
          boat_id:      data.boat_id,
          boat_name:    data.boat_name,
          vessel_type:  data.vessel_type,
          capacity:     data.capacity_information,
          operator_id:  data.operator_id,
          operatorName: data.operatorName,
          company_id:   data.company_id,
          company_name: data.companyName,
          route_to:     data.route_to,
          route_from:   data.route_from,
          schedules:    data.schedules || [],
          ticketPrice:  data.ticket_price,
          status:       data.status,
        });
      } catch (err) {
        console.error("Failed to fetch booking details", err);
        navigate("/login");
      }
    }

    async function init() {
      await fetchSession();
      fetchBookingDetails();
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

    if (!tripDate) return setError("Please select a trip date.");
    if (!selectedSchedule) return setError("Please select a time slot.");
    if (!gcashNumber) return setError("Please enter your GCash number.");
    if (!gcashName) return setError("Please enter your GCash account name.");
    if (!receiptFile) return setError("Please upload your GCash receipt.");

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("boatId",     bookingDetails.boat_id);
      formData.append("operatorId", bookingDetails.operator_id);
      formData.append("companyId",  bookingDetails.company_id);
      formData.append("boatName",   bookingDetails.boat_name);
      formData.append("routeFrom",  bookingDetails.route_from);
      formData.append("routeTo",    bookingDetails.route_to);
      formData.append("schedules", JSON.stringify(selectedSchedule));
      formData.append("ticketPrice", bookingDetails.ticketPrice);
      formData.append("tripDate",   tripDate);
      formData.append("gcashNumber", gcashNumber);
      formData.append("gcashName",  gcashName);
      formData.append("gcashImage", receiptFile);

      const res = await apiFetch("http://localhost:3000/user/onlinebookboat", {
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

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-blue-900">Secure Payment</h1>
        </div>
        <p className="text-blue-600 text-lg">Complete your booking with GCash payment</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">

        {/* Step 1: Booking Summary */}
        <div className="bg-white rounded-2xl p-8 shadow-md border border-blue-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">1</div>
            <h2 className="text-2xl font-bold text-blue-900">Booking Summary</h2>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-600 mb-2">Boat ID</p>
                <p className="text-lg font-semibold text-blue-900">{bookingDetails.boat_id || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-600 mb-2">Boat Name</p>
                <p className="text-lg font-semibold text-blue-900">{bookingDetails.boat_name || "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-600 mb-2">Vessel Type</p>
                <p className="text-lg font-semibold text-blue-900">{bookingDetails.vessel_type || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-600 mb-2">Capacity</p>
                <p className="text-lg font-semibold text-blue-900">{bookingDetails.capacity || "—"}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-blue-200 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-600 mb-2">Company Name</p>
                <p className="text-lg font-semibold text-blue-900">{bookingDetails.company_name || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-600 mb-2">Operator Name</p>
                <p className="text-lg font-semibold text-blue-900">{bookingDetails.operatorName || "—"}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-blue-600 mb-2">Operator ID</p>
              <p className="text-lg font-semibold text-blue-900">{bookingDetails.operator_id || "—"}</p>
            </div>

            <div className="pt-4 border-t border-blue-200">
              <p className="text-sm font-semibold text-blue-600 mb-2">Route</p>
              <p className="text-lg font-semibold text-blue-900">
                {bookingDetails.route_from && bookingDetails.route_to
                  ? `${bookingDetails.route_from} → ${bookingDetails.route_to}`
                  : "—"}
              </p>
            </div>

            {/* ── Time Slot Selector ── */}
            <div className="pt-4 border-t border-blue-200">
              <p className="text-sm font-semibold text-blue-600 mb-3">
                Select Time Slot <span className="text-red-500">*</span>
              </p>
             {bookingDetails.schedules.length === 0 ? (
  <p className="text-sm text-gray-400 italic">No schedules available.</p>
) : (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {bookingDetails.schedules.map((slot, index) => {
      const isSelected =
        selectedSchedule?.departureTime === slot.departureTime &&
        selectedSchedule?.arrivalTime === slot.arrivalTime;
      return (
        <button
          key={index}
          type="button"
          onClick={() => setSelectedSchedule(slot)}
          className={`w-full px-4 py-2.5 rounded-lg font-medium transition-colors border-2 text-sm
            ${isSelected
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"}`}
        >
          {slot.departureTime} → {slot.arrivalTime}
        </button>
      );
    })}
  </div>
)}
              {selectedSchedule && (
                <p className="text-xs text-green-600 font-semibold mt-2">
                  ✓ Selected: {selectedSchedule.departureTime} → {selectedSchedule.arrivalTime}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <p className="text-sm font-semibold text-blue-600 mb-2">Status</p>
              <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700 capitalize">
                {bookingDetails.status || "—"}
              </span>
            </div>

            {/* Trip Date */}
            <div className="pt-4 border-t border-blue-200">
              <label className="block text-sm font-semibold text-blue-600 mb-2">
                Trip Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                min={today}
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
                className="w-full px-4 py-3 bg-blue-50 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition text-blue-900"
              />
            </div>

            <div className="pt-4 border-t border-blue-200">
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold text-blue-600">Ticket Price</p>
                <p className="text-lg font-semibold text-blue-900">
                  ₱{bookingDetails.ticketPrice ? Number(bookingDetails.ticketPrice).toFixed(2) : "0.00"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: GCash Payment Details */}
        <div className="bg-white rounded-2xl p-8 shadow-md border border-blue-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">2</div>
            <h2 className="text-2xl font-bold text-blue-900">GCash Payment Details</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-2">
                GCash Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="09XX XXX XXXX"
                value={gcashNumber}
                onChange={(e) => setGcashNumber(e.target.value)}
                className="w-full px-4 py-3 bg-blue-50 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition text-blue-900 placeholder-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-2">
                GCash Account Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Full Name"
                value={gcashName}
                onChange={(e) => setGcashName(e.target.value)}
                className="w-full px-4 py-3 bg-blue-50 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition text-blue-900 placeholder-blue-400"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Receipt Upload */}
        <div className="bg-white rounded-2xl p-8 shadow-md border border-blue-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">3</div>
            <h2 className="text-2xl font-bold text-blue-900">Upload Receipt</h2>
          </div>

          <div className="space-y-6">
            <p className="text-blue-700">Upload your GCash payment receipt to complete the transaction</p>

            {receiptPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-blue-200">
                <img src={receiptPreview} alt="Receipt preview" className="w-full max-h-64 object-contain bg-blue-50" />
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
                className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center hover:border-blue-600 transition cursor-pointer bg-blue-50"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <p className="text-blue-900 font-semibold mb-2">Click to upload receipt</p>
                <p className="text-sm text-blue-600">or drag and drop (PNG, JPG, PDF)</p>
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
              <span className="text-blue-900">Secured by GCash</span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-green-600 text-white font-bold py-4 rounded-lg hover:bg-green-700 transition transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <CheckCircle2 className="w-5 h-5" />
              {submitting ? "Processing..." : "Complete Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}