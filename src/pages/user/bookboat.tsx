'use client';
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "../../utils/apifetch";


interface BoatData {
  boatId: string;
  boatName: string;
  vesselType: string;
  capacity: string;
  operatorId: string;
  companyId: string;
  companyName: string;
  operatorName: string;
  departureLocation: string;
  arrivalLocation: string;
  schedules: { departureTime: string; arrivalTime: string }[]; // ← replaces the two fields
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

export default function BookBoat() {
  const { boatID } = useParams();
  const navigate = useNavigate();
  const [bookDetails, setBookDetails] = useState<BoatData | null>(null);
  const [tripDate, setTripDate] = useState<string>('');
  const [selectedSchedule, setSelectedSchedule] = useState<{ departureTime: string; arrivalTime: string } | null>(null);
  
  
  


  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await apiFetch("http://localhost:3000/user/usersession", {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        
      } catch (err) {
        console.error("Failed to fetch session", err);
        navigate("/login");
      }
    }

   async function getBookDetails() {
  try {
    console.log('Fetching boat details for boatID:', boatID);
    const response = await apiFetch(`http://localhost:3000/user/bookboat/${boatID}`, {
      method: 'GET',
      credentials: 'include',
    });
    
    const text = await response.text();
    
    if (!text) {
      console.error('Empty response received');
      return;
    }
    
    const data = JSON.parse(text);
    console.log('Book details received:', data); // ADD THIS LINE
    setBookDetails(data);
  } catch (err) {
    console.error("Failed to fetch book details", err);
  }
}
    fetchSession();
    getBookDetails();
  }, [boatID, navigate]);

async function handlePhysicalBooking(bookingBody: any) {
  try {
    const response = await apiFetch(`http://localhost:3000/user/physicalbookboat`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingBody ),
    });

    const data = await response.json();
    console.log("Physical booking response:", data);
    if(response.ok) {
      alert("Booking successful!");
      navigate(`/userdashboard`);
    } else {
      alert("Booking failed: " + data.message);
    }

  } catch (error) {
    console.error("Error during physical booking:", error);
  }
}
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="mb-8 border-b-2 border-blue-200 pb-6">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Book Your Boat</h1>
          <p className="text-blue-600 text-lg">Review the boat details and complete your booking</p>
        </div>

        {/* Form Content */}
        <div className="space-y-8">
          {/* Boat Information Section */}
          <div>
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
              <span className="inline-block w-1 h-6 bg-blue-600 mr-3 rounded"></span>
              Boat Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50 p-5 rounded-lg">
              <DetailItem label="Boat ID" value={bookDetails?.boatId || ''} />
              <DetailItem label="Boat Name" value={bookDetails?.boatName || ''} />
              <DetailItem label="Vessel Type" value={bookDetails?.vesselType || ''} />
              <DetailItem label="Capacity" value={bookDetails?.capacity || ''} />
            </div>
          </div>

          {/* Company & Operator Section */}
          <div>
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
              <span className="inline-block w-1 h-6 bg-blue-600 mr-3 rounded"></span>
              Company & Operator
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50 p-5 rounded-lg">
              <DetailItem label="Company Name" value={bookDetails?.companyName || ''} />
              <DetailItem label="Operator Name" value={bookDetails?.operatorName || ''} />
            </div>
          </div>

          {/* Route Information Section */}
          <div>
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
              <span className="inline-block w-1 h-6 bg-blue-600 mr-3 rounded"></span>
              Route Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50 p-5 rounded-lg">
              <DetailItem label="Departure Location" value={bookDetails?.departureLocation || ''} />
              <DetailItem label="Arrival Location" value={bookDetails?.arrivalLocation || ''} />
            </div>
          </div>
{/* Schedule Section */}
<div>
  <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
    <span className="inline-block w-1 h-6 bg-blue-600 mr-3 rounded"></span>
    Schedule
  </h2>
  <div className="bg-blue-50 p-5 rounded-lg space-y-3">
    <label className="block text-sm font-medium text-blue-600 mb-2">
      Select a departure/arrival time slot *
    </label>
    {bookDetails?.schedules && bookDetails.schedules.length > 0 ? (
      bookDetails.schedules.map((slot, index) => {
        const isSelected =
          selectedSchedule?.departureTime === slot.departureTime &&
          selectedSchedule?.arrivalTime === slot.arrivalTime;

        return (
          <button
            key={index}
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
      })
    ) : (
      <p className="text-gray-500 text-sm">No schedules available.</p>
    )}
  </div>
</div>


          {/* Pricing Section */}
          <div>
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
              <span className="inline-block w-1 h-6 bg-blue-600 mr-3 rounded"></span>
              Pricing
            </h2>
            <div className="bg-blue-50 p-5 rounded-lg">
              <DetailItem label="Ticket Price" value={bookDetails?.ticketPrice ? `₱${bookDetails.ticketPrice}` : ''} />
            </div>
          </div>

          {/* Trip Date Section */}
          <div>
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
              <span className="inline-block w-1 h-6 bg-blue-600 mr-3 rounded"></span>
              Trip Date
            </h2>
            <div className="bg-blue-50 p-5 rounded-lg">
              <label className="block text-sm font-medium text-blue-600 mb-3">Select Trip Date</label>
              <input 
                type="date" 
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
                className="w-full px-4 py-2 border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-600 text-gray-900"
              />
            </div>
          </div>

          {/* Booking Method Selection */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-200">
            <h2 className="text-xl font-bold text-blue-900 mb-4">Choose Your Booking Method</h2>
            <p className="text-gray-700 mb-6">Select how you&apos;d like to complete your boat booking</p>
            
            {/* Booking Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Physical Ticket Option */}
              <div className="border-2 border-gray-300 rounded-lg p-4 hover:border-blue-600 hover:bg-white transition cursor-pointer" 
                onClick={() => {
                  if (!bookDetails) return;
                  if (!selectedSchedule) {
                    alert("Please select a departure/arrival time slot.");
                    return;
                  }
                  if (!tripDate) {
                    alert("Please select a trip date.");
                    return;
                  }
                  handlePhysicalBooking({
                    boatId:     bookDetails.boatId        || null,
                    boatName:   bookDetails.boatName      || null,
                    tripDate:   tripDate                  || null,
                    operatorId: bookDetails.operatorId    || null,
                    companyId:  bookDetails.companyId     || null,
                    routeFrom:  bookDetails.departureLocation || null,
                    routeTo:    bookDetails.arrivalLocation   || null,
                    schedules:  selectedSchedule,
                    ticketPrice: bookDetails.ticketPrice  || 0,
                  });
                }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-2xl">🎫</div>
                  <div>
                    <h3 className="font-bold text-gray-900">Physical Ticket</h3>
                    <p className="text-sm text-gray-600">Pay at the counter</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-4">Complete your booking and present your ticket directly to the boat operator for your trip.</p>
                <button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!bookDetails) return;
                    if (!selectedSchedule) {
                      alert("Please select a departure/arrival time slot.");
                      return;
                    }
                    if (!tripDate) {
                      alert("Please select a trip date.");
                      return;
                    }
                    handlePhysicalBooking({
                      boatId:     bookDetails.boatId        || null,
                      boatName:   bookDetails.boatName      || null,
                      tripDate:   tripDate                  || null,
                      operatorId: bookDetails.operatorId    || null,
                      companyId:  bookDetails.companyId     || null,
                      routeFrom:  bookDetails.departureLocation || null,
                      routeTo:    bookDetails.arrivalLocation   || null,
                      schedules:  selectedSchedule,
                      ticketPrice: bookDetails.ticketPrice  || 0,
                    });
                  }}
                >
                  reserve now
                </button>
              </div>

              {/* Online Booking Option */}
              <div className="border-2 border-green-400 rounded-lg p-4 bg-green-50 hover:bg-green-100 transition cursor-pointer" 
                onClick={() => navigate(`/onlinepayment/${boatID}`)}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-2xl">💳</div>
                  <div>
                    <h3 className="font-bold text-gray-900">Online Booking</h3>
                    <p className="text-sm text-green-700 font-medium">Instant confirmation</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-4">Pay online securely and get instant booking confirmation. Convenient digital payment option.</p>
                <button
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/onlinepayment/${boatID}`);
                  }}
                >
                  Proceed to Online Payment
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
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
