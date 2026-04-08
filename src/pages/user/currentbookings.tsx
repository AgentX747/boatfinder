'use client';

import { useEffect, useState } from "react";
import { Calendar, Ticket, MapPin, Clock, CreditCard, DollarSign, CheckCircle, X, ShieldCheck } from "lucide-react";
import { apiFetch } from "../../utils/apifetch";
import { useNavigate, useParams } from "react-router-dom";

interface BookingDetails {
  boatName: string;
  bookingId: string;
  ticketCode: string;
  bookingDate: string;
  tripDate: string;
  routeFrom: string;
  routeTo: string;
  schedules: { departureTime: string; arrivalTime: string } | null;
  paymentMethod: string;
  totalPrice: number;
  status: string;
  payment_status: string | null;
  payment_amount: number | null;
  payment_created_at: string | null;
}

export default function CurrentBookings() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const getSessionAndBooking = async () => {
      try {
        const res = await apiFetch("https://boatfinder.onrender.com/user/usersession", {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          navigate("/login");
          return;
        }

        const bookingRes = await apiFetch(
          `https://boatfinder.onrender.com/user/getcurrentbookingdetails/${bookingId}`,
          { method: "GET", credentials: "include" }
        );

        if (!bookingRes.ok) throw new Error("Failed to fetch booking");

        const bookingData = await bookingRes.json();

        setBookingDetails({
          boatName:            bookingData.boatName,
          bookingId:           bookingData.booking_id,
          ticketCode:          bookingData.ticketcode,
          bookingDate:         bookingData.booking_date,
          tripDate:            bookingData.trip_date,
          routeFrom:           bookingData.route_from,
          routeTo:             bookingData.route_to,
          schedules:           bookingData.schedules ?? null,
          paymentMethod:       bookingData.payment_method,
          totalPrice:          bookingData.total_price,
          status:              bookingData.bookingstatus,
          payment_status:      bookingData.payment_status ?? null,
          payment_amount:      bookingData.payment_amount ?? null,
          payment_created_at:  bookingData.payment_created_at ?? null,
        });

      } catch (error) {
        console.error("Error loading booking:", error);
      }
    };

    getSessionAndBooking();
  }, [bookingId, navigate]);

  async function handleCancelBooking() {
    if (!bookingDetails?.bookingId) return;
    setCancelling(true);
    try {
      const res = await apiFetch(
        `https://boatfinder.onrender.com/user/cancelbooking/${bookingDetails.bookingId}`,
        { method: "PATCH", credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to cancel booking");
      alert("Booking cancelled successfully.");
      navigate("/userdashboard");
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert("Failed to cancel booking. Please try again.");
    } finally {
      setCancelling(false);
      setShowModal(false);
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case "accepted":  return { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200"  };
      case "pending":   return { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" };
      case "cancelled": return { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200"    };
      default:          return { bg: "bg-gray-50",   text: "text-gray-700",   border: "border-gray-200"   };
    }
  };

  const getPaymentStatusStyle = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "paid":    return { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200"  };
      case "pending": return { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" };
      case "failed":  return { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200"    };
      default:        return { bg: "bg-gray-50",   text: "text-gray-700",   border: "border-gray-200"   };
    }
  };

  if (!bookingDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <p className="text-blue-600 font-semibold animate-pulse">Loading booking details...</p>
      </div>
    );
  }

  const statusStyle        = getStatusStyle(bookingDetails.status);
  const paymentStatusStyle = getPaymentStatusStyle(bookingDetails.payment_status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Current Booking Details</h1>
          <p className="text-gray-600">View your boat reservation information</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">

          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold text-white mb-1">{bookingDetails.boatName}</h2>
                <p className="text-blue-100">Booking #{bookingDetails.bookingId}</p>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${statusStyle.bg} border ${statusStyle.border}`}>
                <CheckCircle className={`w-5 h-5 ${statusStyle.text}`} />
                <span className={`font-semibold capitalize ${statusStyle.text}`}>{bookingDetails.status}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">

              {/* Left Column — Booking Info */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Ticket className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-semibold text-gray-600">Ticket Code</label>
                  </div>
                  <p className="text-lg text-gray-900 font-medium ml-7">{bookingDetails.ticketCode}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-semibold text-gray-600">Booking Date</label>
                  </div>
                  <p className="text-lg text-gray-900 font-medium ml-7">{bookingDetails.bookingDate}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-semibold text-gray-600">Trip Date</label>
                  </div>
                  <p className="text-lg text-gray-900 font-medium ml-7">{bookingDetails.tripDate}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-semibold text-gray-600">Route From</label>
                  </div>
                  <p className="text-lg text-gray-900 font-medium ml-7">{bookingDetails.routeFrom}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-semibold text-gray-600">Route To</label>
                  </div>
                  <p className="text-lg text-gray-900 font-medium ml-7">{bookingDetails.routeTo}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-semibold text-gray-600">Departure Time</label>
                  </div>
                  <p className="text-lg text-gray-900 font-medium ml-7">
                    {bookingDetails.schedules?.departureTime ?? "—"}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-semibold text-gray-600">Arrival Time</label>
                  </div>
                  <p className="text-lg text-gray-900 font-medium ml-7">
                    {bookingDetails.schedules?.arrivalTime ?? "—"}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-semibold text-gray-600">Payment Method</label>
                  </div>
                  <p className="text-lg text-gray-900 font-medium ml-7 capitalize">{bookingDetails.paymentMethod}</p>
                </div>
              </div>

              {/* Right Column — Payment Info */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2">Payment Information</h3>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-semibold text-gray-600">Payment Status</label>
                  </div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ml-7 ${paymentStatusStyle.bg} ${paymentStatusStyle.border}`}>
                    <span className={`text-sm font-semibold capitalize ${paymentStatusStyle.text}`}>
                      {bookingDetails.payment_status ?? "—"}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-semibold text-gray-600">Amount Paid</label>
                  </div>
                  <p className="text-lg text-gray-900 font-medium ml-7">
                    {bookingDetails.payment_amount != null
                      ? `₱${Number(bookingDetails.payment_amount).toFixed(2)}`
                      : "—"}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-semibold text-gray-600">Payment Date</label>
                  </div>
                  <p className="text-lg text-gray-900 font-medium ml-7">
                    {bookingDetails.payment_created_at ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-8" />

            {/* Total Price */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                  <span className="text-lg font-semibold text-gray-700">Total Price</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">
                  ₱{Number(bookingDetails.totalPrice).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Cancel Button — only show when pending */}
            {bookingDetails.status === "pending" && (
              <button
                onClick={() => setShowModal(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                Cancel Booking
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-2xl max-w-md w-full p-8 relative border border-blue-200">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-blue-600" />
            </button>

            <h3 className="text-2xl font-bold text-blue-900 mb-2">Cancel Booking?</h3>
            <p className="text-blue-700 mb-6">Are you sure you want to cancel this booking? This action cannot be undone.</p>

            <div className="bg-blue-100 p-4 rounded-lg mb-6 border border-blue-300">
              <p className="text-sm text-blue-700 font-semibold mb-1">Booking ID</p>
              <p className="font-semibold text-blue-900">{bookingDetails.bookingId}</p>
              <p className="text-sm text-blue-700 font-semibold mt-3 mb-1">Boat Name</p>
              <p className="font-semibold text-blue-900">{bookingDetails.boatName}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-blue-200 hover:bg-blue-300 text-blue-900 font-semibold py-2 rounded-lg transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                {cancelling ? "Cancelling..." : "Cancel Booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}