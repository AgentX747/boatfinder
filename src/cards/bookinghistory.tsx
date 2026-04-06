interface BookingHistoryCardProps {
    booking_id: number;
    ticketCode: string;
    boatName: string;
    bookDate: string;
    tripDate: string;
    bookPrice: number;
    schedules: { departureTime: string; arrivalTime: string } | null;
    status: string;
    boatstatus: string;
}

const statusStyles: Record<string, string> = {
  active:      'bg-green-100 text-green-700 border border-green-300',
  maintenance: 'bg-amber-100 text-amber-700 border border-amber-300',
  cancelled:   'bg-red-100 text-red-700 border border-red-300',
};

const statusLabel: Record<string, string> = {
  active:      'Active',
  maintenance: 'Maintenance',
  cancelled:   'Cancelled',
};

const bookingStatusStyles: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700 border border-yellow-300',
  accepted:  'bg-green-100 text-green-700 border border-green-300',
  cancelled: 'bg-red-100 text-red-700 border border-red-300',
};

const bookingStatusLabel: Record<string, string> = {
  pending:   'Pending',
  accepted:  'Accepted',
  cancelled: 'Cancelled',
};

export default function UserBookingHistoryCard({
  booking_id,
  ticketCode,
  boatName,
  bookDate,
  tripDate,
  bookPrice,
  status,
  boatstatus,
  schedules,
}: BookingHistoryCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row">

        {/* Image / Icon Section */}
        <div className="md:w-56 h-48 md:h-auto bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-20 h-20 text-white opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-6 flex flex-col gap-4">

          {/* ── Row 1: Boat Name + Status Badges ── */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-blue-900 uppercase tracking-wide">
                {boatName}
              </h3>

              {/* IDs clearly labeled */}
              <div className="flex flex-wrap gap-4 mt-1">
                <p className="text-blue-500 text-xs">
                  Booking ID:{' '}
                  <span className="font-semibold text-blue-800">#{booking_id}</span>
                </p>
                <p className="text-blue-500 text-xs">
                  Ticket Code:{' '}
                  <span className="font-semibold text-blue-800 uppercase">{ticketCode}</span>
                </p>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-row md:flex-col gap-3 flex-shrink-0">
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Booking</p>
                <span className={`px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wide w-28 text-center border ${bookingStatusStyles[status] ?? 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                  {bookingStatusLabel[status] ?? status}
                </span>
              </div>
             
            </div>
          </div>

          {/* ── Row 2: Date & Time Details ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {/* Booking Date */}
            <div className="flex items-start gap-2 text-blue-700">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Booking Date</p>
                <p className="text-sm font-medium text-blue-900">{bookDate}</p>
              </div>
            </div>

            {/* Trip Date */}
            <div className="flex items-start gap-2 text-blue-700">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Trip Date</p>
                <p className="text-sm font-medium text-blue-900">{tripDate}</p>
              </div>
            </div>

            {/* Departure */}
            <div className="flex items-start gap-2 text-blue-700">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Departure</p>
                <p className="text-sm font-medium text-blue-900 uppercase">{schedules?.departureTime ?? '—'}</p>
              </div>
            </div>

            {/* Arrival */}
            <div className="flex items-start gap-2 text-blue-700">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Arrival</p>
                <p className="text-sm font-medium text-blue-900 uppercase">{schedules?.arrivalTime ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* ── Row 3: Total Price ── */}
          <div className="flex items-center justify-between pt-4 border-t border-blue-100">
            <div>
              <p className="text-xs text-blue-500 uppercase tracking-wide mb-1">Total Price</p>
              <p className="text-2xl font-bold text-blue-900">₱{bookPrice.toLocaleString()}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}