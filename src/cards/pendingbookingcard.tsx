interface PendingBookingCardProps {
    bookingId: string;
    boatName: string;
    bookDate: string;
    tripDate: string;

    bookPrice: number;
    boatStatus: string;
        schedules: { departureTime: string; arrivalTime: string } | null;
    navigateTo?: () => void;
    declinePendingBookings?: () => void;
}

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

export default function PendingBookingCard({
    bookingId,
    boatName,
    bookDate,
    schedules,
    tripDate,
 
    
    bookPrice,
    boatStatus,
    navigateTo,
    declinePendingBookings
}: PendingBookingCardProps) {
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
                        <div>
                            <h3 className="text-xl font-bold text-blue-900 mb-2 uppercase tracking-wide">
                                {boatName}
                            </h3>
                            <p className="text-blue-600 text-sm mb-1">
                                Ticket Code: <span className="font-medium uppercase">#{bookingId}</span>
                            </p>
                        </div>
    <div className="flex flex-col gap-3 items-center">
    {/* Booking Status */}
    <div className="flex flex-col items-center gap-1">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Booking Status</p>
        <span className="bg-yellow-100 text-yellow-700 border border-yellow-300 px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wide w-28 text-center">
            Pending
        </span>
    </div>
    {/* Boat Status */}
    <div className="flex flex-col items-center gap-1">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Boat Status</p>
        <span className={`px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wide w-28 text-center border ${boatStatusStyles[boatStatus] ?? 'bg-gray-100 text-gray-700 border-gray-300'}`}>
            {boatStatusLabel[boatStatus] ?? boatStatus}
        </span>
    </div>
</div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 py-4">
                        <div className="flex items-center text-blue-700">
                            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 uppercase tracking-wide">Book Date</span>
                                <span className="text-sm font-medium">{bookDate}</span>
                            </div>
                        </div>
                        <div className="flex items-center text-blue-700">
                            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 uppercase tracking-wide">Trip Date</span>
                                <span className="text-sm font-medium">{tripDate}</span>
                            </div>
                        </div>
                        <div className="flex items-center text-blue-700">
                            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 uppercase tracking-wide">Departure</span>
                                <span className="text-sm font-medium">{schedules?.departureTime ?? "—"}</span>
                            </div>
                        </div>
                        <div className="flex items-center text-blue-700">
                            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 uppercase tracking-wide">Arrival</span>
                                <span className="text-sm font-medium">{schedules?.arrivalTime ?? "—"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-blue-100">
                        <div>
                            <p className="text-xs text-blue-500 uppercase tracking-wide mb-1">Total Price</p>
                            <p className="text-2xl font-bold text-blue-900">₱{bookPrice}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors uppercase tracking-wide text-sm"
                                onClick={navigateTo}
                            >
                                View Details
                            </button>
                            <button
                                className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors uppercase tracking-wide text-sm"
                                onClick={declinePendingBookings}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
