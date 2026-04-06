import BoatOperatorSidebar from "../../components/boatoperatordashboardsidebar.js";
import {ManageBoatsCard, type BoatDetails} from "../../cards/managevesselcard.js";
import { Plus, X } from "lucide-react"
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ViewBookingsCard from "../../cards/viewbookingscard.js";
import { apiFetch } from "../../utils/apifetch.js"
import ManagePriceCard from "../../cards/managepricecard.js";
import WeatherForecastCard from "../../cards/weatherforecastcard.js";
import OperatorBookingHistoryCard from "../../cards/operatorbookingcard.js";
import ViewRefundCard from "../../cards/viewrefundcard.js";
import  PricePredictionGraph from "../../components/pricepredictiongraph.js";
import NearestIslandRecommendation from "../../components/nearestisland.js";


interface BoatOperatorSession {
  boatOperatorId: string;
  firstName: string;
  lastName: string;
  role?: string;
}


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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">Refund Requests</h1>
        <p className="text-slate-600 mt-1 text-sm sm:text-base">Manage and review passenger refund requests</p>
      </div>

      {/* Controls Row */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Status Tabs */}
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

        {/* Search Bar */}
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

      {/* Results Count */}
      <p className="text-sm text-slate-500 mb-4">
        {filtered.length} {refundStatusTab} request{filtered.length !== 1 ? "s" : ""}
        {searchQuery && ` matching "${searchQuery}"`}
      </p>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <p className="text-base sm:text-lg font-medium text-center">No {refundStatusTab} refund requests found</p>
          {searchQuery && (
            <p className="text-sm mt-1">Try clearing the search filter</p>
          )}
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


export default function BoatOperatorDashboard() {
  const [activeTab, setActiveTab] = useState("managevesselinformation");
  const [boatCardInfo, setBoatCardInfo] = useState<BoatDetails[]>([]);
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [deleteBoatModalOpen, setDeleteBoatModalOpen] = useState(false);
  const [boatToDelete, setBoatToDelete] = useState<string | number | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [ticketCardInfo, setTicketCardInfo] = useState<any[]>([]);
  const [bookingHistory, setBookingHistory] = useState<any[]>([]);
  const [refundDetails, setRefundDetails] = useState<any[]>([]);
  const [ticketSearch, setTicketSearch] = useState(""); // ADD 
  const [bookingsActiveTab, setBookingsActiveTab] = useState<"pending" | "accepted" | "history">("pending");
  const [boatOperatorLoggedIn, setBoatOperatorLoggedIn] = useState<BoatOperatorSession>({
    boatOperatorId: "",
    firstName: "",
    lastName: "",
    role: "",
  });
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [acceptedBookings, setAcceptedBookings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  

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
    const res = await apiFetch("http://localhost:3000/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    navigate("/login");
  }

  useEffect(() => {
    async function fetchOperatorAndBoats() {
      try {
        const sessionRes = await apiFetch("http://localhost:3000/boatoperator/boatoperatorsession", {
          method: "GET",
          credentials: "include",
        });

        if (!sessionRes.ok) {
          console.error("Failed to fetch boat operator session");
          navigate("/login");
          return;
        }

        const sessionData = await sessionRes.json();
        setBoatOperatorLoggedIn({
          boatOperatorId: sessionData.operatorId,
          firstName: sessionData.firstName,
          lastName: sessionData.lastName,
          role: sessionData.role,
        });

        const boatsRes = await apiFetch("http://localhost:3000/boatoperator/getboats", {
          method: "GET",
          credentials: "include",
        });

        if (!boatsRes.ok) throw new Error("Failed to fetch boats");

        const boatData = await boatsRes.json();
        setBoatCardInfo(boatData);

      } catch (err) {
        console.error("Error fetching operator session or boat info:", err);
        navigate("/login");
      }
    }

    async function fetchPendingBookings() {
      try {
        const res = await apiFetch(
          "http://localhost:3000/boatoperator/operatorpendingbookings",
          { method: "GET", credentials: "include" }
        );
        if (!res.ok) throw new Error("Failed to fetch pending bookings");
        const data = await res.json();
        setPendingBookings(data);
      } catch (err) {
        console.error("Error fetching pending bookings:", err);
      }
    }

    async function fetchAcceptedBookings() {
      try {
        const res = await apiFetch(
          "http://localhost:3000/boatoperator/operatoracceptedbookings",
          { method: "GET", credentials: "include" }
        );
        if (!res.ok) throw new Error("Failed to fetch accepted bookings");
        const data = await res.json();
        setAcceptedBookings(data);
      } catch (err) {
        console.error("Error fetching accepted bookings:", err);
      }
    }

    async function fetchEditTicketBoatCard() {
      try {
        const res = await apiFetch("http://localhost:3000/boatoperator/getticketcard", {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        setTicketCardInfo(data);
      } catch (err) {
        console.error("Error fetching edit boat card details:", err);
      }
    }

    async function fetchOperatorBookingHistory() {
      try {
        const res = await apiFetch("http://localhost:3000/boatoperator/getoperatorbookinghistory", {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        setBookingHistory(data);
      } catch (err) {
        console.error("Error fetching operator booking history:", err);
      }
    }

    async function getRefundDetails() {
      try {
        const res = await apiFetch("http://localhost:3000/boatoperator/getoperatorrefundrequests", {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        setRefundDetails(data);
      } catch (err) {
        console.error("Error fetching operator refund requests:", err);
      }
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
      `http://localhost:3000/boatoperator/acceptbooking/${selectedBooking.bookingId}`,
      { method: "PATCH", credentials: "include" }
    );
    if (!res.ok) throw new Error("Failed to accept booking");
    return res.json();
  }

  async function declineAcceptBooking() {
  const res = await apiFetch(
    `http://localhost:3000/boatoperator/declinebooking/${selectedBooking.bookingId}`,
    { method: "PATCH", credentials: "include" }
  );

  if (!res.ok) {
    throw new Error("Failed to decline booking");
  }

  alert("Booking Declined Successfully");
  window.location.reload();
}

  function renderActiveTab() {
    switch (activeTab) {
      case "managevesselinformation":
        return (
          <div>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
              {/* Header Section */}
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

              {/* Main Content */}
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
                <div className="mb-12">
                  {/* Fleet Overview heading */}
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-5">Fleet Overview</h2>

                  {/* Search Bar — below heading */}
                  <div className="flex gap-2 w-full sm:max-w-sm mb-2">
                    <input
                      type="text"
                      placeholder="Search by boat name..."
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

                  {/* Results count — always visible */}
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
                          <button
                            onClick={() => setSearchQuery("")}
                            className="mt-3 text-sm text-blue-500 hover:underline"
                          >
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
                          deleteBoat={() => {
                            setBoatToDelete(boat.boatId);
                            setDeleteBoatModalOpen(true);
                          }}
                        />
                      ))
                    )}
                  </div>
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
                <p className="text-blue-600 text-sm sm:text-base">manage all your boat trip bookings and reservations</p>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2 sm:gap-3 mb-5 sm:mb-8 flex-wrap">
                <button
                  onClick={() => setBookingsActiveTab("pending")}
                  className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-colors shadow-md text-sm sm:text-base ${
                    bookingsActiveTab === "pending"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-blue-600 border-2 border-blue-200 hover:bg-blue-50"
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setBookingsActiveTab("accepted")}
                  className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                    bookingsActiveTab === "accepted"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-blue-600 border-2 border-blue-200 hover:bg-blue-50"
                  }`}
                >
                  Accepted
                </button>
                <button
                  onClick={() => setBookingsActiveTab("history")}
                  className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                    bookingsActiveTab === "history"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-blue-600 border-2 border-blue-200 hover:bg-blue-50"
                  }`}
                >
                  History
                </button>
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
    <button
      onClick={() => setTicketSearch("")}
      className="px-3 py-2 rounded-lg border-2 border-blue-200 bg-white text-blue-400 hover:bg-blue-50 transition-colors"
    >
      <X size={16} />
    </button>
  )}
</div>

              {/* Pending Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {bookingsActiveTab === "pending" &&
                 filteredPendingBookings.map((booking) => (
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
                      declinePendingBookings={() => {
                        setSelectedBooking(booking);
                        setDeclineModalOpen(true);
                      }}
                    />
                  ))}
              </div>

              {/* Accepted Cards */}
              <div className="space-y-3 sm:space-y-4">
                {bookingsActiveTab === "accepted" &&
                 filteredAcceptedBookings.map((booking) => (
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
                      declinePendingBookings={() => {
                        setSelectedBooking(booking);
                        setDeclineModalOpen(true);
                      }}
                    />
                  ))}
              </div>

              {/* Booking History */}
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

            {/* Accept Booking Modal */}
            {acceptModalOpen && (
              <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-3 sm:p-4 z-50">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-8 relative border border-blue-200 mx-3 sm:mx-0">
                  <button
                    onClick={() => setAcceptModalOpen(false)}
                    className="absolute top-4 right-4 p-1 hover:bg-blue-100 rounded-lg transition-colors"
                  >
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
                          .then(() => {
                            alert("Booking accepted successfully!");
                            setAcceptModalOpen(false);
                            window.location.reload();
                          })
                          .catch((err) => {
                            console.error("Error accepting booking:", err);
                            setAcceptModalOpen(false);
                          });
                      }}
                      className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-md text-sm sm:text-base"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setAcceptModalOpen(false)}
                      className="flex-1 px-4 py-2.5 rounded-lg font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors text-sm sm:text-base"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Decline Booking Modal */}
            {declineModalOpen && (
              <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-3 sm:p-4 z-50">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-8 relative border border-blue-200 mx-3 sm:mx-0">
                  <button
                    onClick={() => setDeclineModalOpen(false)}
                    className="absolute top-4 right-4 p-1 hover:bg-blue-100 rounded-lg transition-colors"
                  >
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
    .catch((err) => {
      console.error("Error declining booking:", err);
      alert("Failed to decline booking. Please try again.");
      setDeclineModalOpen(false);
    });
}}
                      className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-md text-sm sm:text-base"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeclineModalOpen(false)}
                      className="flex-1 px-4 py-2.5 rounded-lg font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors text-sm sm:text-base"
                    >
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
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">Weather Forecast</h1>
                    <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base">Check current conditions and forecasts for your boating routes</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-12">
              <div className="grid grid-cols-1 gap-8">
                <WeatherForecastCard
                  onViewDetails={() => navigate("/weatheranalytics")}
                />
              </div>
            </div>
          </div>
        );

      case "fareandsurgeriskprediction":
        return <>
        <div className ="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col justify-center items-center">
          <PricePredictionGraph />


        </div>;
        </>

      case "managefareandpricing":
        return (
          <div className="min-h-screen bg-gray-50 p-3 sm:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-5 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Manage Fare & Pricing</h1>
                <p className="text-gray-600 text-sm sm:text-base">Edit ticket prices for your boats</p>
              </div>

              {/* Search Bar — below header, above cards */}
              <div className="flex gap-2 w-full sm:max-w-sm mb-2">
                <input
                  type="text"
                  placeholder="Search by boat name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors text-sm sm:text-base"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="px-3 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Results count — always visible */}
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
                      <button
                        onClick={() => setSearchQuery("")}
                        className="mt-3 text-sm text-blue-500 hover:underline"
                      >
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
        case"nearestislandrecommendation":
        return<>
        <NearestIslandRecommendation/>
        </>

      default:
        return <div>Select an option</div>;
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — always fixed and visible, icons only on small screens, full on lg+ */}
      <BoatOperatorSidebar
        user={{
          firstName: boatOperatorLoggedIn.firstName,
          lastName: boatOperatorLoggedIn.lastName,
        }}
        goToProfile={() => navigate(`/editboatoperator/${boatOperatorLoggedIn.boatOperatorId}`)}
        renderManageVesselInfo={() => setActiveTab("managevesselinformation")}
        renderViewBookingsAndReservations={() => setActiveTab("viewbookingsandreservations")}
        renderManageFareAndPricing={() => setActiveTab("managefareandpricing")}
        renderViewWeatherForecast={() => setActiveTab("viewweatherforecast")}
        renderFareAndSurgeRiskPrediction={() => setActiveTab("fareandsurgeriskprediction")}
        renderRefunds={() => setActiveTab("refunds")}
        renderNearestIslandRecommendation={() => setActiveTab("nearestislandrecommendation")}
        logout={handleLogout}
      />

      {/* Main content — offset matches sidebar width at each breakpoint */}
      <div className="flex-1 ml-14 sm:ml-16 lg:ml-72 min-w-0 overflow-x-hidden">
        {renderActiveTab()}
      </div>

      {/* Delete Boat Modal */}
      {deleteBoatModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-8 relative border border-blue-200 mx-3 sm:mx-0">
            <button
              onClick={() => setDeleteBoatModalOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-blue-100 rounded-lg transition-colors"
            >
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
                      `http://localhost:3000/boatoperator/confirmdeleteboat/${boatToDelete}`,
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
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-md text-sm sm:text-base"
              >
                Confirm
              </button>
              <button
                onClick={() => setDeleteBoatModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}