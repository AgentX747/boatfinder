import { CheckCircle, Clock, AlertCircle, ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../utils/apifetch'

interface TicketDetails {
  ticket_id: number
  ticketSubject: string
  detailedDescription: string
  status: string
  adminId: number | null
  adminReply: string | null
}

const statusConfig: Record<string, { label: string; icon: React.ReactElement; bg: string; text: string; border: string }> = {
  open: {
    label: "Open",
    icon: <AlertCircle className="w-5 h-5 text-blue-600" />,
    bg: "bg-blue-50",
    text: "text-blue-900",
    border: "border-blue-200",
  },
  in_progress: {
    label: "In Progress",
    icon: <Clock className="w-5 h-5 text-amber-600" />,
    bg: "bg-amber-50",
    text: "text-amber-900",
    border: "border-amber-200",
  },
  resolved: {
    label: "Resolved",
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    bg: "bg-green-50",
    text: "text-green-900",
    border: "border-green-200",
  },
  closed: {
    label: "Closed",
    icon: <CheckCircle className="w-5 h-5 text-slate-500" />,
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
  },
}

export default function ViewTicketPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<TicketDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await apiFetch("http://localhost:3000/user/usersession", {
          method: "GET",
          credentials: "include",
        })
        const data = await res.json()
        if (res.status === 401 || res.status === 403) {
          navigate("/login")
          return
        }
      } catch (err) {
        console.error("Failed to fetch session", err)
        navigate("/login")
      }
    }
    async function fetchTicketDetails() {
       
      try {
        const res = await apiFetch(`http://localhost:3000/user/getticketdetails/${ticketId}`, {
          method: "GET",
          credentials: "include",
        })

        if (!res.ok) {
          setError("Failed to load ticket details.")
          return
        }

        const data = await res.json()
        setTicket(data)
      } catch (err) {
        console.error("Error fetching ticket details:", err)
        setError("Something went wrong.")
      } finally {
        setLoading(false)
      }
    }
     fetchSession()

    if (ticketId) fetchTicketDetails()
  }, [ticketId])

  const statusStyle = statusConfig[ticket?.status?.toLowerCase() ?? "open"] ?? statusConfig["open"]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <p className="text-blue-600 font-semibold animate-pulse">Loading ticket details...</p>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <p className="text-red-500 font-semibold">{error ?? "Ticket not found."}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-4xl font-bold text-blue-900 mb-1">Support Ticket</h1>
            <p className="text-gray-600">View and manage ticket details</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-blue-100 overflow-hidden">

          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-8 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">Ticket Details</h2>
                <p className="text-gray-600 mt-1">Complete ticket information and admin response</p>
              </div>
            </div>
          </div>

          {/* Card Content */}
          <div className="px-8 py-8 space-y-8">

            {/* Ticket ID & Admin ID Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-blue-600 uppercase tracking-wide">Ticket ID</label>
                <div className="text-lg font-mono bg-blue-50 p-3 rounded-lg border border-blue-200 text-gray-900">
                  #{ticket.ticket_id}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-blue-600 uppercase tracking-wide">Admin Reviewer ID</label>
                <div className="text-lg font-mono bg-blue-50 p-3 rounded-lg border border-blue-200 text-gray-900">
                  {ticket.adminId ? `ADM-${ticket.adminId}` : <span className="text-gray-400 italic text-base">Not yet assigned</span>}
                </div>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-blue-600 uppercase tracking-wide">Subject</label>
              <div className="text-lg text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-200">
                {ticket.ticketSubject}
              </div>
            </div>

            {/* Detailed Description */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-blue-600 uppercase tracking-wide">Detailed Description</label>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {ticket.detailedDescription}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-blue-600 uppercase tracking-wide">Status</label>
              <div className={`flex items-center gap-3 p-4 ${statusStyle.bg} border ${statusStyle.border} rounded-lg`}>
                {statusStyle.icon}
                <span className={`${statusStyle.text} font-semibold`}>{statusStyle.label}</span>
              </div>
            </div>

            {/* Admin Reply */}
            <div className="space-y-2 pt-4 border-t-2 border-blue-100">
              <label className="text-sm font-bold text-blue-600 uppercase tracking-wide">Admin Reply</label>
              {ticket.adminReply ? (
                <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-600">
                  <p className="text-sm text-gray-700 font-semibold mb-4">
                    Response from Admin {ticket.adminId ? `#${ticket.adminId}` : ""}
                  </p>
                  <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                    {ticket.adminReply}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 p-6 rounded-lg border border-dashed border-gray-300 text-center">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400 italic">No admin reply yet. Your ticket is being reviewed.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}