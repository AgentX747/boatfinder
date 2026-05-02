'use client';
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "../../utils/apifetch";

interface BoatData {
  boatId: string;
  boatName: string;
  image?: string;
  vesselType: string;
  capacity: string;
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

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium text-blue-600 mb-1">{label}</span>
      <span className="text-base text-gray-900 font-semibold">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function BookBoat() {
  const { boatID } = useParams();
  const navigate   = useNavigate();

  const [bookDetails, setBookDetails]   = useState<BoatData | null>(null);
  const [tripDate, setTripDate]         = useState<string>("");
  const [selectedSchedule, setSelectedSchedule] =
    useState<{ departureTime: string; arrivalTime: string } | null>(null);

  const todayStr = getTodayStr();

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await apiFetch("https://boatfinder.onrender.com/user/usersession", {
          method: "GET",
          credentials: "include",
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

    fetchSession();
    getBookDetails();
  }, [boatID, navigate]);

  function handleDateChange(newDate: string) {
    setTripDate(newDate);
    if (selectedSchedule && !isSlotAvailable(newDate, selectedSchedule)) {
      setSelectedSchedule(null);
    }
  }

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

  // ── Pass tripDate + selectedSchedule via router state to OnlinePaymentPage ──
  function onOnlineBook() {
    if (!validateBooking()) return;
    navigate(`/onlinepayment/${boatID}`, {
      state: {
        tripDate,
        selectedSchedule,
      },
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
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
              <DetailItem label="Capacity"    value={bookDetails?.capacity   || ""} />
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
            <div className="bg-blue-50 p-5 rounded-lg">
              <label className="block text-sm font-medium text-blue-600 mb-3">
                Select Trip Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={tripDate}
                min={todayStr}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-4 py-2 border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-600 text-gray-900"
              />
              {tripDate && tripDate === todayStr && (
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  ⚠ Today is selected — only upcoming time slots are available.
                </p>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
              <span className="inline-block w-1 h-6 bg-blue-600 mr-3 rounded" />
              Schedule
            </h2>
            <div className="bg-blue-50 p-5 rounded-lg space-y-3">
              <label className="block text-sm font-medium text-blue-600 mb-2">
                Select a departure / arrival time slot <span className="text-red-500">*</span>
              </label>

              {!tripDate && (
                <p className="text-sm text-slate-500 italic">
                  Please select a trip date above to see available slots.
                </p>
              )}

              {tripDate && bookDetails?.schedules && bookDetails.schedules.length > 0 ? (
                (() => {
                  const available = bookDetails.schedules.filter(s => isSlotAvailable(tripDate, s));
                  const past      = bookDetails.schedules.filter(s => !isSlotAvailable(tripDate, s));

                  return (
                    <>
                      {available.map((slot, index) => {
                        const isSelected =
                          selectedSchedule?.departureTime === slot.departureTime &&
                          selectedSchedule?.arrivalTime   === slot.arrivalTime;
                        return (
                          <button
                            key={`avail-${index}`}
                            type="button"
                            onClick={() => setSelectedSchedule(slot)}
                            className={`w-full px-5 py-3 rounded-lg border-2 transition text-sm cursor-pointer
                              ${isSelected
                                ? "border-blue-600 bg-blue-100 text-blue-900 font-medium"
                                : "border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50"
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
                              {isSelected && (
                                <span className="text-blue-600 font-bold text-lg">✓</span>
                              )}
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
                tripDate && (
                  <p className="text-gray-500 text-sm">No schedules available.</p>
                )
              )}
            </div>
          </div>

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
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-200">
            <h2 className="text-xl font-bold text-blue-900 mb-4">Choose Your Booking Method</h2>
            <p className="text-gray-700 mb-6">Select how you'd like to complete your boat booking</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Physical Ticket */}
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

              {/* Online Booking */}
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