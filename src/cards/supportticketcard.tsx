'use client';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-800' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800' },
};

export function SupportTicketCard({ 
  ticketId, 
  adminId, 
  ticketSubject, 
  status ,
  navigateTo,


}: { 
  ticketId: string; 
  adminId: string; 
  ticketSubject: string; 
  status: 'pending' | 'resolved'; 
  navigateTo: () => void;
}) {
  const config = statusConfig[status];

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        {/* Card Label */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Support Ticket</p>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Ticket ID</p>
                <span className="text-xs font-semibold text-gray-700">
                  {ticketId}
                </span>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                {config.label}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Subject</p>
              <h3 className="text-lg font-semibold text-gray-900 leading-snug">
                {ticketSubject}
              </h3>
            </div>
          </div>
        </div>

        {/* Meta Information */}
        <div className="mb-5 pb-4 border-b border-gray-100">
          <p className="text-xs text-gray-500 font-medium mb-1">Admin ID</p>
          <span className="text-sm text-gray-700">
            {adminId}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <div className="text-sm text-gray-600">Assigned</div>
          </div>
          <button className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
            onClick={navigateTo}>

            View Details
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
