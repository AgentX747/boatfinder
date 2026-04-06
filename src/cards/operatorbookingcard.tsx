interface BookingHistoryCardProps {
    booking_id: number;
    passengerName: string;
    boatName: string;
    ticketcode: string;
    boatId: string;
    operatorId: string;
    paymentMethod: string;
    bookingDate: string;
    tripDate: string;
    routTo: string;
    routFrom: string;
    totalPrice: number;
    status: string;
    boatstatus: string;
}

const bookingStatusStyles: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800 border border-yellow-300',
  accepted:  'bg-green-100 text-green-800 border border-green-300',
  cancelled: 'bg-red-100 text-red-800 border border-red-300',
};

const bookingStatusLabel: Record<string, string> = {
  pending:   'Pending',
  accepted:  'Accepted',
  cancelled: 'Cancelled',
};

const boatStatusStyles: Record<string, string> = {
  active:      'bg-green-100 text-green-800 border border-green-300',
  maintenance: 'bg-amber-100 text-amber-800 border border-amber-300',
  cancelled:   'bg-red-100 text-red-800 border border-red-300',
};

const boatStatusLabel: Record<string, string> = {
  active:      'Active',
  maintenance: 'Maintenance',
  cancelled:   'Cancelled',
};

export default function OperatorBookingHistoryCard({
  booking_id,
  passengerName,
  boatName,
  boatId,
  ticketcode,
  operatorId,
  paymentMethod,
  bookingDate,
  tripDate,
  routTo,
  routFrom,
  totalPrice,
  status,
  boatstatus,
}: BookingHistoryCardProps) {
    return (
        <div className="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="flex flex-col md:flex-row">
                <div className="md:w-64 h-48 md:h-auto bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <svg className="w-24 h-24 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                </div>

                <div className="flex-1 p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                        {/* Left: Boat & Passenger Info */}
                        <div>
                            <h3 className="text-xl font-bold text-blue-900 mb-2 uppercase tracking-wide">
                                {boatName}
                            </h3>
                            <p className="text-blue-600 text-sm mb-1">
                                Booking ID: <span className="font-medium uppercase">#{booking_id}</span>
                            </p>
                            <p className="text-blue-600 text-sm mb-1">
                                Passenger: <span className="font-medium uppercase">{passengerName}</span>
                            </p>
                             <p className="text-blue-600 text-sm mb-1">
                                Ticket Code: <span className="font-medium uppercase">{ticketcode}</span>
                            </p>
                        </div>

                        {/* Right: Status Badges */}
                        <div className="flex flex-col gap-3 items-center mt-2 md:mt-0">
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Booking Status</p>
                                <span className={`px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wide w-28 text-center border ${bookingStatusStyles[status] ?? 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                                    {bookingStatusLabel[status] ?? status}
                                </span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Boat Status</p>
                                <span className={`px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wide w-28 text-center border ${boatStatusStyles[boatstatus] ?? 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                                    {boatStatusLabel[boatstatus] ?? boatstatus}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center text-blue-700">
                            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <div className="text-sm">
                                <p className="font-semibold uppercase">Booking Date</p>
                                <p className="uppercase">{bookingDate}</p>
                            </div>
                        </div>
                        <div className="flex items-center text-blue-700">
                            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm">
                                <p className="font-semibold uppercase">Trip Date</p>
                                <p className="uppercase">{tripDate}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="text-blue-700">
                            <p className="text-sm font-semibold mb-1 uppercase">Route</p>
                            <p className="text-sm uppercase">{routFrom} → {routTo}</p>
                        </div>
                        <div className="text-blue-700">
                            <p className="text-sm font-semibold mb-1 uppercase">Payment Method</p>
                            <p className="text-sm uppercase">{paymentMethod}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-blue-100 pt-4">
                        <div>
                            <p className="text-xs text-blue-500 uppercase tracking-wide mb-1">Total Price</p>
                            <p className="text-2xl font-bold text-blue-900">₱{totalPrice}</p>
                        </div>
                        <div className="flex gap-2 text-xs text-gray-500 uppercase">
                            <span>Boat ID: {boatId}</span>
                            <span>|</span>
                            <span>Operator ID: {operatorId}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}