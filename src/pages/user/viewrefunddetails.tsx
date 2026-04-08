import { CheckCircle, Clock, AlertCircle, Image as ImageIcon, ArrowLeft } from 'lucide-react'
import { apiFetch } from '../../utils/apifetch'
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

interface RefundDetails {
  request_id: number
  ticketcode: string
  operator_id: number
  operatorName: string
  imageproof: string | null
  message: string
  operatorreply: string | null
  operatorimageproof: string | null
  status: string
}

const statusConfig: Record<string, { label: string; icon: React.ReactElement; bg: string; text: string; border: string; badge: string }> = {
  pending: {
    label: "Pending Review",
    icon: <Clock className="w-5 h-5 text-amber-600" />,
    bg: "bg-amber-50",
    text: "text-amber-900",
    border: "border-amber-200",
    badge: "bg-amber-500",
  },
  resolved: {
    label: "Resolved",
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    bg: "bg-green-50",
    text: "text-green-900",
    border: "border-green-200",
    badge: "bg-green-500",
  },
}
export default function RefundDetailsPage() {
  const { refundId } = useParams()
  const navigate = useNavigate()
  const [refund, setRefund] = useState<RefundDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await apiFetch("https://boatfinder.onrender.com/user/usersession", {
          method: "GET",
          credentials: "include",
        })
        if (res.status === 401 || res.status === 403) {
          navigate("/login")
          return
        }
      } catch (err) {
        console.error("Failed to fetch session", err)
        navigate("/login")
      }
    }

    async function fetchRefundDetails() {
      try {
            const res = await apiFetch(`https://boatfinder.onrender.com/user/getrefunddetails/${refundId}`, {
              method: "GET",
          credentials: "include",
        })

        if (!res.ok) {
          setError("Failed to load refund details.")
          return
        }

        const data = await res.json()
        setRefund(data)
      } catch (err) {
        console.error("Error fetching refund details:", err)
        setError("Something went wrong.")
      } finally {
        setLoading(false)
      }
    }

    async function init() {
      await fetchSession()
      if (refundId) await fetchRefundDetails()
    }

    init()
  }, [refundId])

  const statusStyle = statusConfig[refund?.status?.toLowerCase() ?? "pending"] ?? statusConfig["pending"]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <p className="text-blue-600 font-semibold animate-pulse">Loading refund details...</p>
      </div>
    )
  }

  if (error || !refund) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <p className="text-red-500 font-semibold">{error ?? "Refund request not found."}</p>
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
            <h1 className="text-4xl font-bold text-blue-900 mb-1">Refund Request Details</h1>
            <p className="text-gray-600">View and manage refund request information</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-blue-100 overflow-hidden">

          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-8 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">Refund Request #{refund.request_id}</h2>
                <p className="text-gray-600 mt-1">Complete refund request details and operator response</p>
              </div>
              <div className={`${statusStyle.badge} text-white px-4 py-2 rounded-lg text-sm font-semibold`}>
                {statusStyle.label}
              </div>
            </div>
          </div>

          {/* Card Content */}
          <div className="px-8 py-8 space-y-8">

            {/* Request ID & Ticket Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-blue-600 uppercase tracking-wide">Request ID</label>
                <div className="text-lg font-mono bg-blue-50 p-3 rounded-lg border border-blue-200 text-gray-900">
                  #{refund.request_id}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-blue-600 uppercase tracking-wide">Ticket Code</label>
                <div className="text-lg font-mono bg-blue-50 p-3 rounded-lg border border-blue-200 text-gray-900">
                  {refund.ticketcode}
                </div>
              </div>
            </div>

            {/* Operator ID & Operator Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-blue-600 uppercase tracking-wide">Operator ID</label>
                <div className="text-lg font-mono bg-blue-50 p-3 rounded-lg border border-blue-200 text-gray-900">
                  #{refund.operator_id}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-blue-600 uppercase tracking-wide">Operator Name</label>
                <div className="text-lg bg-blue-50 p-3 rounded-lg border border-blue-200 text-gray-900">
                  {refund.operatorName}
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-blue-600 uppercase tracking-wide">Refund Request Message</label>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">{refund.message}</p>
              </div>
            </div>

            {/* Image Proof */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-blue-600 uppercase tracking-wide">Evidence Image</label>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                {refund.imageproof ? (
                  <>
                    <div className="flex items-center gap-3 text-gray-700 mb-4">
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                      <span className="font-mono text-sm truncate">{refund.imageproof}</span>
                    </div>
                    <img
                      src={refund.imageproof}
                      alt="Evidence"
                      className="w-full max-h-72 object-contain rounded-lg border border-gray-300"
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                    <ImageIcon className="w-10 h-10 mb-2" />
                    <p className="text-sm italic">No evidence image provided</p>
                  </div>
                )}
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

            {/* Operator Reply */}
            <div className="space-y-2 pt-4 border-t-2 border-blue-100">
              <label className="text-sm font-bold text-blue-600 uppercase tracking-wide">Operator Reply</label>
              {refund.operatorreply ? (
                <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-600">
                  <p className="text-sm text-gray-700 font-semibold mb-4">
                    Response from {refund.operatorName}
                  </p>
                  <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                    {refund.operatorreply}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 p-6 rounded-lg border border-dashed border-gray-300 text-center">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400 italic">No operator reply yet. Your request is being reviewed.</p>
                </div>
              )}
            </div>

            {/* Operator Image Proof */}
            <div className="space-y-2 pt-4 border-t-2 border-blue-100">
              <label className="text-sm font-bold text-blue-600 uppercase tracking-wide">Operator Verification Image</label>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                {refund.operatorimageproof ? (
                  <>
                    <div className="flex items-center gap-3 text-gray-700 mb-4">
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                      <span className="font-mono text-sm truncate">{refund.operatorimageproof}</span>
                    </div>
                    <img
                      src={refund.operatorimageproof}
                      alt="Operator Verification"
                      className="w-full max-h-72 object-contain rounded-lg border border-gray-300"
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                    <ImageIcon className="w-10 h-10 mb-2" />
                    <p className="text-sm italic">No verification image provided</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}