import { useState, useEffect, useMemo } from "react"
import UserSidebar from "../../components/userdashboardsidebar.js"
import { Bookmark } from "lucide-react"
import { ViewBoatsCard } from "../../cards/viewboatscard.js"
import { apiFetch } from "../../utils/apifetch.js"
import { useNavigate } from "react-router-dom"
import PendingBookingCard from "../../cards/pendingbookingcard.js"
import AcceptedBookingCard from "../../cards/acceptedbookingcard.js"
import WeatherForecastCard from "../../cards/weatherforecastcard.js"
import UserBookingHistoryCard from "../../cards/bookinghistory.js"
import { Mail, MessageSquare, Tag, AlertCircle, FileText, Clock } from 'lucide-react'
import { SupportTicketCard } from "../../cards/supportticketcard.js"
import { RefundTicketCard } from "../../cards/refundticketcard.js"
import PricePredictionGraph from "../../components/pricepredictiongraph.js"

// ── Cancel modal type ─────────────────────────────────────────
type CancelModalType = "decline" | "cancel" | null

export default function UserDashboard() {
  const navigate = useNavigate()
  const [ticketTab, setTicketTab] = useState<"message" | "reportdetails" | "refundrequest">("message")

  const [refundDetails, setRefundDetails] = useState({
    ticketCode: "",
    operatorId: "",
    shortMessage: "",
    fileAttachment: null as File | null,
  })
  const [refundTickets, setRefundTickets] = useState<any[]>([])
  const [supportTickets, setSupportTickets] = useState<any[]>([])

  function handleRefundChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setRefundDetails(prev => ({ ...prev, [name]: value }))
  }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setRefundDetails(prev => ({ ...prev, fileAttachment: file }))
  }

  const [boats, setBoats] = useState<any[]>([])
  const [pendingBookings, setPendingBookings] = useState<any[]>([])
  const [bookingHistory, setBookingHistory] = useState<any[]>([])
  const [acceptedBookings, setAcceptedBookings] = useState<any[]>([])

  // ── Unified cancel/decline modal state ───────────────────────
  const [cancelModalType, setCancelModalType] = useState<CancelModalType>(null)
  const [cancelBookingId, setCancelBookingId]  = useState<string | null>(null)
  const [cancelBookingCode, setCancelBookingCode] = useState<string>("")
  const [cancelBoatName, setCancelBoatName]    = useState<string>("")
  const [cancelling, setCancelling]            = useState(false)

  const [ticketDetails, setTicketDetails] = useState({ ticketSubject: "", detailedDescription: "" })
  const [userLoggedIn, setUserLoggedIn]   = useState({ user_id: "", firstName: "", lastName: "" })
  const [searchBoat, setSearchBoat]       = useState({ routeTo: "", routeFrom: "", departureTime: "", arrivalTime: "" })
  const [ticketSearch, setTicketSearch]   = useState("")

  const filteredPendingBookings  = useMemo(() =>
    pendingBookings.filter(b => {
      const s = ticketSearch.toLowerCase()
      return (b.ticketcode ?? "").toLowerCase().includes(s) || (b.boatName ?? "").toLowerCase().includes(s)
    }), [pendingBookings, ticketSearch])

  const filteredAcceptedBookings = useMemo(() =>
    acceptedBookings.filter(b => {
      const s = ticketSearch.toLowerCase()
      return (b.ticketcode ?? "").toLowerCase().includes(s) || (b.boatName ?? "").toLowerCase().includes(s)
    }), [acceptedBookings, ticketSearch])

  const filteredBookingHistory   = useMemo(() =>
    bookingHistory.filter(b => {
      const s = ticketSearch.toLowerCase()
      return (b.ticketcode ?? "").toLowerCase().includes(s) || (b.boatName ?? "").toLowerCase().includes(s)
    }), [bookingHistory, ticketSearch])

  const [searchResults, setSearchResults]     = useState<any[]>([])
  const [activeTab, setActiveTab]             = useState("searchrouteandtimeslot")
  type Tab = "pending" | "accepted" | "history"
  const [bookingsActiveTab, setBookingsActiveTab] = useState<Tab>("pending")

  function handleTicketChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setTicketDetails(prev => ({ ...prev, [name]: value }))
  }

  // ── Open cancel modal (for accepted bookings) ─────────────────
  function openCancelModal(bookingId: string, ticketCode: string, boatName: string) {
    setCancelBookingId(bookingId)
    setCancelBookingCode(ticketCode)
    setCancelBoatName(boatName)
    setCancelModalType("cancel")
  }

  // ── Open decline modal (for pending bookings) ─────────────────
  function openDeclineModal(bookingId: string, ticketCode: string, boatName: string) {
    setCancelBookingId(bookingId)
    setCancelBookingCode(ticketCode)
    setCancelBoatName(boatName)
    setCancelModalType("decline")
  }

  function closeModal() {
    setCancelModalType(null)
    setCancelBookingId(null)
    setCancelBookingCode("")
    setCancelBoatName("")
    setCancelling(false)
  }

  // ── Decline pending booking ───────────────────────────────────
  async function handleDeclineBooking() {
    if (!cancelBookingId) return
    setCancelling(true)
    try {
      const res = await apiFetch(`https://boatfinder.onrender.com/user/cancelbooking/${cancelBookingId}`, {
        method: "PATCH",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to decline booking")
      alert("Booking declined successfully.")
      closeModal()
      window.location.reload()
    } catch (err) {
      console.error(err)
      alert("Failed to decline booking. Please try again.")
    } finally {
      setCancelling(false)
    }
  }

  // ── Cancel accepted booking ───────────────────────────────────
  async function handleCancelBooking() {
    if (!cancelBookingId) return
    setCancelling(true)
    try {
      const res = await apiFetch(`https://boatfinder.onrender.com/user/cancelbooking/${cancelBookingId}`, {
        method: "PATCH",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to cancel booking")
      alert("Booking cancelled successfully.")
      closeModal()
      // Remove from accepted list without full reload
      setAcceptedBookings(prev => prev.filter(b => b.booking_id !== cancelBookingId && b.bookingId !== cancelBookingId))
    } catch (err) {
      console.error(err)
      alert("Failed to cancel booking. Please try again.")
    } finally {
      setCancelling(false)
    }
  }

  async function handleSearchBoat() {
    try {
      const params = new URLSearchParams()
      if (searchBoat.routeFrom?.trim()) params.append('routeFrom', searchBoat.routeFrom.trim())
      if (searchBoat.routeTo?.trim())   params.append('routeTo',   searchBoat.routeTo.trim())
      if (searchBoat.departureTime)     params.append('departureTime', searchBoat.departureTime)
      if (searchBoat.arrivalTime)       params.append('arrivalTime',   searchBoat.arrivalTime)
      const res = await fetch(`https://boatfinder.onrender.com/user/searchboats?${params.toString()}`, { method: "GET", credentials: "include" })
      setSearchResults(await res.json())
    } catch (err) { console.error("Search error:", err) }
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
      const res = await fetch("https://boatfinder.onrender.com/user/refundticket", { method: "POST", credentials: "include", body: formData })
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed") }
      alert("Refund request submitted successfully.")
      setRefundDetails({ ticketCode: "", operatorId: "", shortMessage: "", fileAttachment: null })
      setTicketTab("message")
    } catch (error) { console.error(error); alert("Failed to submit refund request.") }
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
    async function fetchSession() {
      try {
        const res  = await apiFetch("https://boatfinder.onrender.com/user/usersession", { method: "GET", credentials: "include" })
        const data = await res.json()
        setUserLoggedIn({ user_id: data.userId, firstName: data.firstName, lastName: data.lastName })
        if (res.status === 401 || res.status === 403) { navigate("/login"); return }
        if (!res.ok) throw new Error("Failed to fetch user session")
      } catch (err) { console.error("Failed to fetch session", err); navigate("/login") }
    }
    async function getallBoats() {
      const res = await apiFetch("https://boatfinder.onrender.com/user/getallboats", { method: "GET", credentials: "include" })
      setBoats(await res.json())
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
        const res  = await apiFetch("https://boatfinder.onrender.com/user/getsupportticketcards", { method: "GET", credentials: "include" })
        if (!res.ok) { setSupportTickets([]); return }
        const data = await res.json()
        setSupportTickets(Array.isArray(data) ? data : [])
      } catch (err) { console.error("Failed to fetch support tickets", err); setSupportTickets([]) }
    }
    async function fetchRefundTickets() {
      try {
        const res  = await apiFetch("https://boatfinder.onrender.com/user/getrefundticketcards", { method: "GET", credentials: "include" })
        if (!res.ok) { setRefundTickets([]); return }
        const data = await res.json()
        setRefundTickets(Array.isArray(data) ? data : [])
      } catch (err) { console.error("Failed to fetch refund tickets", err); setRefundTickets([]) }
    }
    fetchSession(); getHistoryBookings(); getAcceptedBookings()
    getallBoats();  getPendingBookings(); fetchSupportTickets(); fetchRefundTickets()
  }, [])

  function renderActiveTab() {
    switch (activeTab) {
      case "searchrouteandtimeslot": {
        const timeSlots = [
          "12:00 AM","1:00 AM","2:00 AM","3:00 AM","4:00 AM","5:00 AM",
          "6:00 AM","7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM",
          "12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM",
          "6:00 PM","7:00 PM","8:00 PM","9:00 PM","10:00 PM","11:00 PM",
        ]
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-8">
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8 mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">Search Route and Timeslot</h1>
                <p className="text-gray-600 mb-6 text-sm sm:text-base">Here you can search for available boat routes and timeslots.</p>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-blue-600 mb-4">Route</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Origin</label>
                        <input type="text" name="routeFrom" placeholder="Enter origin port" className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base" value={searchBoat.routeFrom} onChange={handleSearchChange} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                        <input type="text" name="routeTo" placeholder="Enter destination port" className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base" value={searchBoat.routeTo} onChange={handleSearchChange} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-blue-600 mb-4">Timeslot</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Departure Time</label>
                        <select name="departureTime" className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm sm:text-base" value={searchBoat.departureTime} onChange={handleSearchChange}>
                          <option value="">Select departure time</option>
                          {timeSlots.map((t, i) => <option key={`dep-${i}`} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Arrival Time</label>
                        <select name="arrivalTime" className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm sm:text-base" value={searchBoat.arrivalTime} onChange={handleSearchChange}>
                          <option value="">Select arrival time</option>
                          {timeSlots.map((t, i) => <option key={`arr-${i}`} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <button className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md text-sm sm:text-base" onClick={handleSearchBoat}>Search</button>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="px-4 sm:px-6 py-4 text-left font-semibold text-sm">Boat ID</th>
                        <th className="px-4 sm:px-6 py-4 text-left font-semibold text-sm">Operator Name</th>
                        <th className="px-4 sm:px-6 py-4 text-left font-semibold text-sm">Boat Name</th>
                        <th className="px-4 sm:px-6 py-4 text-left font-semibold text-sm">Vessel Type</th>
                        <th className="px-4 sm:px-6 py-4 text-left font-semibold text-sm">Capacity</th>
                        <th className="px-4 sm:px-6 py-4 text-left font-semibold text-sm">Ticket Price</th>
                        <th className="px-4 sm:px-6 py-4 text-left font-semibold text-sm">Route From</th>
                        <th className="px-4 sm:px-6 py-4 text-left font-semibold text-sm">Route To</th>
                        <th className="px-4 sm:px-6 py-4 text-left font-semibold text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(searchResults.length > 0 ? searchResults : boats).map((boat: any) => (
                        <tr key={boat.boatId || boat.boat_id} className="border-b hover:bg-gray-50">
                          <td className="px-4 sm:px-7 py-4 sm:py-5 text-sm">{boat.boatId || boat.boat_id}</td>
                          <td className="px-4 sm:px-7 py-4 sm:py-5 text-sm">{boat.operatorName}</td>
                          <td className="px-4 sm:px-7 py-4 sm:py-5 text-sm">{boat.boatName || boat.boat_name}</td>
                          <td className="px-4 sm:px-7 py-4 sm:py-5 text-sm">{boat.vesselType || boat.vessel_type}</td>
                          <td className="px-4 sm:px-7 py-4 sm:py-5 text-sm">{boat.capacity || boat.capacity_information}</td>
                          <td className="px-4 sm:px-7 py-4 sm:py-5 text-sm">{boat.ticketPrice || boat.ticket_price}</td>
                          <td className="px-4 sm:px-7 py-4 sm:py-5 text-sm">{boat.routeFrom || boat.route_from}</td>
                          <td className="px-4 sm:px-7 py-4 sm:py-5 text-sm">{boat.routeTo || boat.route_to}</td>
                          <td className="px-4 sm:px-6 py-4">
                            <button className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3 sm:px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm whitespace-nowrap" onClick={() => navigate(`/bookboat/${boat.boatId || boat.boat_id}`)}>
                              <Bookmark className="w-4 h-4" />Book Trip
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )
      }

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

                {/* PENDING — decline only */}
                {bookingsActiveTab === "pending" && (
                  filteredPendingBookings.length > 0 ? (
                    filteredPendingBookings.map(booking => (
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
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm sm:text-base">
                      {ticketSearch ? `No pending bookings matching "${ticketSearch}"` : "No pending bookings"}
                    </p>
                  )
                )}

                {/* ACCEPTED — navigate + cancel button */}
                {bookingsActiveTab === "accepted" && (
                  filteredAcceptedBookings.length > 0 ? (
                    filteredAcceptedBookings.map(booking => (
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
                        {/* Cancel button overlaid at bottom-right of card */}
                        <div className="flex justify-end mt-2 px-1">
                          
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm sm:text-base">
                      {ticketSearch ? `No accepted bookings matching "${ticketSearch}"` : "No accepted bookings"}
                    </p>
                  )
                )}

                {/* HISTORY */}
                {bookingsActiveTab === "history" && (
                  <>
                    <p className="text-gray-500 mb-4 text-sm sm:text-base">Booking history</p>
                    {filteredBookingHistory.length > 0 ? (
                      filteredBookingHistory.map(booking => (
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
                      ))
                    ) : (
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

      case "viewboats":
        return (
          <>
            <div className="relative overflow-hidden flex flex-col" style={{ background: 'linear-gradient(135deg, #0277bd 0%, #01579b 100%)', minHeight: '280px' }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 15% 80%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 85% 15%, rgba(255,255,255,0.1) 0%, transparent 50%)` }} />
              <div className="absolute top-0 right-0 h-full w-5/12 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.09) 100%)', borderLeft: '1px solid rgba(255,255,255,0.06)' }} />
              <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-10 lg:px-14 pt-8 sm:pt-14 pb-0 w-full">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2 mb-4 sm:mb-5">
                    <div className="w-6 h-0.5 rounded-full bg-white/35" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65">Maritime Fleet</span>
                  </div>
                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] mb-4" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.15)' }}>
                    Explore Our Boats<br />&amp; <span className="font-normal italic text-white/75">Start Travelling</span>
                  </h1>
                  <p className="text-[14px] sm:text-[15px] leading-relaxed text-white/70 max-w-md mb-6 sm:mb-8">Discover our premium fleet designed for unforgettable maritime adventures.</p>
                </div>
              </div>
              <div className="relative mt-auto h-16 sm:h-20 overflow-hidden">
                <div className="absolute bottom-0 left-0 h-full" style={{ width: '200%', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120'%3E%3Cpath d='M0,50 Q300,10 600,50 T1200,50 L1200,120 L0,120 Z' fill='%23f0f6ff' fill-opacity='1'/%3E%3C/svg%3E")`, backgroundSize: '50% 100%', animation: 'wave 4s linear infinite' }} />
                <div className="absolute bottom-0 left-0 h-full" style={{ width: '200%', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120'%3E%3Cpath d='M0,70 Q300,30 600,70 T1200,70 L1200,120 L0,120 Z' fill='%23e3f2fd' fill-opacity='0.6'/%3E%3C/svg%3E")`, backgroundSize: '50% 100%', animation: 'wave 6s linear infinite reverse' }} />
              </div>
            </div>
            <div className="flex flex-row flex-wrap gap-4 sm:gap-5 p-4 sm:p-8" style={{ background: '#f0f6ff' }}>
              {boats.map(boat => (
                <ViewBoatsCard key={boat.boatId || boat.boat_id} img={boat.image} boatName={boat.boatName || boat.boat_name} vesselType={boat.vesselType || boat.vessel_type} capacity={boat.capacity || boat.capacity_information} ticketPrice={boat.ticketPrice || boat.ticket_price} operatorName={boat.operatorName || boat.operator_name} />
              ))}
            </div>
          </>
        )

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

      case "ticketsupport":
        return (
          <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-6 sm:py-12 px-3 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto mb-8 sm:mb-12">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-100 mb-4"><Mail className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" /></div>
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
                    { key: "refundrequest", icon: <Clock className="w-4 h-4 flex-shrink-0" />,         label: "Request Refund",  short: "Refund"  },
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
                          <input type="text" name="ticketSubject" placeholder="Brief description of your issue" className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none transition-colors bg-blue-50/30 text-gray-900 placeholder-gray-500 text-sm sm:text-base" value={ticketDetails.ticketSubject} onChange={handleTicketChange} />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2"><MessageSquare className="w-5 h-5 text-blue-400" /></div>
                        </div>
                        <p className="text-xs text-gray-500">Required: 5–100 characters</p>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-900">Detailed Description</label>
                        <div className="relative">
                          <textarea name="detailedDescription" placeholder="Please provide as much detail as possible." rows={6} className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none transition-colors bg-blue-50/30 text-gray-900 placeholder-gray-500 resize-none text-sm sm:text-base" value={ticketDetails.detailedDescription} onChange={handleTicketChange} />
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
                        {supportTickets.length === 0 ? <p className="text-gray-400 text-sm italic">No support tickets found.</p> : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {supportTickets.map((t: any) => <SupportTicketCard key={t.ticket_id} ticketId={t.ticket_id} adminId={t.adminId ?? null} ticketSubject={t.ticketSubject} status={t.status} navigateTo={() => navigate(`/viewticket/${t.ticket_id}`)} />)}
                          </div>
                        )}
                      </div>
                      <hr className="border-blue-100" />
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">My Refund Requests</h2>
                        <p className="text-sm text-gray-500 mb-4">Track the status of your submitted refund requests.</p>
                        {refundTickets.length === 0 ? <p className="text-gray-400 text-sm italic">No refund requests found.</p> : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {refundTickets.map((r: any) => <RefundTicketCard key={r.request_id} requestId={String(r.request_id)} ticketCode={r.ticketcode ?? "N/A"} operatorId={String(r.operator_id)} operatorName={r.operatorName ?? "Unknown"} status={r.status ?? "pending"} navigateTo={() => navigate(`/viewrefund/${r.request_id}`)} />)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {ticketTab === "refundrequest" && (
                    <div className="space-y-6 sm:space-y-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-3">
                          <label className="block text-sm font-semibold text-gray-900">Ticket Code</label>
                          <div className="relative">
                            <input type="text" name="ticketCode" placeholder="e.g. TKT-00123" className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none transition-colors bg-blue-50/30 text-gray-900 placeholder-gray-500 text-sm sm:text-base" value={refundDetails.ticketCode} onChange={handleRefundChange} />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2"><Tag className="w-5 h-5 text-blue-400" /></div>
                          </div>
                          <p className="text-xs text-gray-500">Found on your booking confirmation</p>
                        </div>
                        <div className="space-y-3">
                          <label className="block text-sm font-semibold text-gray-900">Operator ID</label>
                          <div className="relative">
                            <input type="text" name="operatorId" placeholder="e.g. OPR-456" className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none transition-colors bg-blue-50/30 text-gray-900 placeholder-gray-500 text-sm sm:text-base" value={refundDetails.operatorId} onChange={handleRefundChange} />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2"><Tag className="w-5 h-5 text-blue-400" /></div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-900">File Attachment <span className="text-gray-400 font-normal ml-1">(optional)</span></label>
                        <label className="flex flex-col items-center justify-center w-full h-32 sm:h-36 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer bg-blue-50/40 hover:bg-blue-50 transition-colors group">
                          <div className="flex flex-col items-center gap-2 text-center px-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors"><FileText className="w-5 h-5 text-blue-500" /></div>
                            {refundDetails.fileAttachment ? (
                              <><p className="text-sm font-semibold text-blue-700">{refundDetails.fileAttachment.name}</p><p className="text-xs text-gray-400">{(refundDetails.fileAttachment.size / 1024).toFixed(1)} KB — click to replace</p></>
                            ) : (
                              <><p className="text-sm font-semibold text-blue-600">Click to upload or drag &amp; drop</p><p className="text-xs text-gray-400">PNG, JPG, PDF up to 10MB</p></>
                            )}
                          </div>
                          <input type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden" onChange={handleFileChange} />
                        </label>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-900">Short Message</label>
                        <div className="relative">
                          <textarea name="shortMessage" placeholder="Briefly state your reason for requesting a refund..." rows={4} className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none transition-colors bg-blue-50/30 text-gray-900 placeholder-gray-500 resize-none text-sm sm:text-base" value={refundDetails.shortMessage} onChange={handleRefundChange} maxLength={300} />
                          <div className="absolute right-4 top-4"><MessageSquare className="w-5 h-5 text-blue-400" /></div>
                        </div>
                        <div className="flex justify-between pt-1">
                          <p className="text-xs text-gray-500">Max 300 characters</p>
                          <span className={`text-xs font-medium ${refundDetails.shortMessage.length >= 280 ? "text-red-500" : "text-blue-600"}`}>{refundDetails.shortMessage.length} / 300</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={submitRefund} className="flex-1 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-md text-sm sm:text-base">Submit Refund Request</button>
                        <button onClick={() => setRefundDetails({ ticketCode: "", operatorId: "", shortMessage: "", fileAttachment: null })} className="flex-1 px-6 py-3 rounded-lg border-2 border-blue-200 text-blue-600 font-semibold hover:bg-blue-50 transition-colors text-sm sm:text-base">Clear Form</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        )

      case "fareandsurgeriskprediction":
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col justify-center items-center">
            <PricePredictionGraph />
          </div>
        )

      default:
        return null
    }
  }

  // ── Shared modal config based on type ────────────────────────
  const modalConfig = cancelModalType === "cancel" ? {
    title:       "Cancel Booking?",
    description: "Are you sure you want to cancel this accepted booking? This action cannot be undone.",
    label:       "Booking",
    confirmText: "Confirm Cancel",
    confirmStyle:"bg-red-600 hover:bg-red-700 text-white",
    onConfirm:   handleCancelBooking,
  } : {
    title:       "Decline Booking?",
    description: "Are you sure you want to decline this pending booking? This action cannot be undone.",
    label:       "Booking",
    confirmText: "Confirm Decline",
    confirmStyle:"bg-blue-600 hover:bg-blue-700 text-white",
    onConfirm:   handleDeclineBooking,
  }

  return (
    <div className="flex min-h-screen">

      {/* ── Unified Cancel / Decline Modal ─────────────────────── */}
      {cancelModalType && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-8 relative border border-blue-200 mx-3 sm:mx-0">
            <button onClick={closeModal} className="absolute top-4 right-4 p-1 hover:bg-blue-100 rounded-lg transition-colors text-gray-500 hover:text-gray-800">✕</button>

            {/* Icon */}
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${cancelModalType === "cancel" ? "bg-red-100" : "bg-blue-100"}`}>
              <AlertCircle className={`w-6 h-6 ${cancelModalType === "cancel" ? "text-red-600" : "text-blue-600"}`} />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-blue-900 mb-2">{modalConfig.title}</h3>
            <p className="text-blue-700 mb-5 sm:mb-6 text-sm sm:text-base">{modalConfig.description}</p>

            {/* Booking details */}
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
              <button
                onClick={modalConfig.onConfirm}
                disabled={cancelling}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-colors shadow-md text-sm sm:text-base disabled:opacity-60 ${modalConfig.confirmStyle}`}
              >
                {cancelling ? "Processing…" : modalConfig.confirmText}
              </button>
              <button
                onClick={closeModal}
                disabled={cancelling}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors text-sm sm:text-base disabled:opacity-60"
              >
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
      />

      {/* Main content */}
      <div className="flex-1 ml-14 sm:ml-16 lg:ml-72 min-w-0 overflow-x-hidden">
        {renderActiveTab()}
      </div>
    </div>
  )
}