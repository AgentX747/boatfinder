const boatStatusStyles: Record<string, string> = {
  active:      'bg-green-100 text-green-700 border border-green-300',
  maintenance: 'bg-amber-100 text-amber-700 border border-amber-300',
  cancelled:   'bg-red-100 text-red-700 border border-red-300',
};

const boatStatusLabel: Record<string, string> = {
  active:      'Active',
  maintenance: 'Maintenance',
  cancelled:   'Cancelled',
};

interface AcceptedBookingCardProps {
  bookingId: string;
  boatName: string;
  bookDate: string;
  tripDate: string;
  schedules: { departureTime: string; arrivalTime: string } | null;
  bookPrice: number;
  boatStatus: string;
  navigateTo?: () => void;
}

export default function AcceptedBookingCard({
  bookingId, boatName, bookDate, tripDate, schedules, bookPrice, boatStatus, navigateTo
}: AcceptedBookingCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden hover:shadow-lg transition-shadow w-full">
      <div className="flex flex-col md:flex-row">
        {/* Image Section */}
        <div className="w-full md:w-64 h-40 md:h-auto bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-16 h-16 md:w-24 md:h-24 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-4 md:p-6 flex flex-col gap-3">
          {/* Header: Boat Name + Status Badges */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg md:text-xl font-bold text-blue-900 mb-1 truncate">{boatName}</h3>
                <p className="text-blue-600 text-xs md:text-sm truncate">
                  Ticket Code: <span className="font-medium">#{bookingId}</span>
                </p>
              </div>

              {/* Status Badges - Responsive */}
              <div className="flex flex-col sm:flex-col gap-2 sm:gap-3 flex-shrink-0">
                <div className="flex flex-col items-start sm:items-center gap-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Booking Status</p>
                  <span className="bg-green-100 text-green-700 border border-green-300 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide w-full sm:w-28 text-center">
                    Accepted
                  </span>
                </div>
                <div className="flex flex-col items-start sm:items-center gap-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Boat Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide w-full sm:w-28 text-center border ${boatStatusStyles[boatStatus] ?? 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                    {boatStatusLabel[boatStatus] ?? boatStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid - Mobile Optimized */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-3">
            <div className="flex items-start gap-2 text-blue-700">
              <svg className="w-4 h-4 md:w-5 md:h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="min-w-0">
                <span className="text-xs text-gray-500 uppercase tracking-wide block">Book Date</span>
                <span className="text-sm font-medium block truncate">{bookDate}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-blue-700">
              <svg className="w-4 h-4 md:w-5 md:h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="min-w-0">
                <span className="text-xs text-gray-500 uppercase tracking-wide block">Trip Date</span>
                <span className="text-sm font-medium block truncate">{tripDate}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-blue-700">
              <svg className="w-4 h-4 md:w-5 md:h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="min-w-0">
                <span className="text-xs text-gray-500 uppercase tracking-wide block">Departure</span>
                <span className="text-sm font-medium block truncate">{schedules?.departureTime ?? "—"}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-blue-700">
              <svg className="w-4 h-4 md:w-5 md:h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="min-w-0">
                <span className="text-xs text-gray-500 uppercase tracking-wide block">Arrival</span>
                <span className="text-sm font-medium block truncate">{schedules?.arrivalTime ?? "—"}</span>
              </div>
            </div>
          </div>

          {/* Footer: Price + Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-blue-100">
            <div className="min-w-0">
              <p className="text-xs text-blue-500 uppercase tracking-wide mb-1">Total Price</p>
              <p className="text-xl md:text-2xl font-bold text-blue-900">₱{bookPrice}</p>
            </div>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm w-full sm:w-auto"
              onClick={navigateTo}
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
