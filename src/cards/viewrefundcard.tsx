import { ChevronRight } from "lucide-react";

interface RefundCardProps {
  requestId: number;
  ticketCode: string;
  userId:number;
  username: string;
  status: string; 
  onViewDetails?: () => void;
}

export default function ViewRefundCard({
  requestId,
  ticketCode,
  userId,
  username,
  status,
  onViewDetails,
}: RefundCardProps) {
  const statusConfig = {
    pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
    resolved: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Resolved" },
  };

  const statusStyle = statusConfig[status as keyof typeof statusConfig] ?? {
  bg: "bg-gray-100",
  text: "text-gray-700",
  label: status,
};

  return (
    <div className="w-full rounded-lg border border-blue-200 bg-white shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-blue-900">Refund Request</h2>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-4">
        {/* Username */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">Username</p>
          <p className="text-base font-semibold text-gray-900">{username}</p>
        </div>

        {/* User ID */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">User ID</p>
          <p className="text-base font-semibold text-gray-900">{userId}</p>
        </div>

        {/* Ticket Code */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">Ticket Code</p>
          <p className="text-base font-semibold text-gray-900 font-mono">{ticketCode}</p>
        </div>

        {/* Request ID */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">Request ID</p>
          <p className="text-base font-semibold text-gray-900">{requestId}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* View Details Button */}
        <button
          onClick={onViewDetails}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          View Details
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
