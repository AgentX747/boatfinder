interface BookingDetails {
  bookingId: string;
  ticketcode: string;
  boatId: string;
  boatName: string;
  operatorId: string;
  companyName: string;
  passengerName: string;
  bookingDate: string;
  tripDate: string;
  image: string;
  paymentMethod: string;
  routeFrom: string;
  routeTo: string;
  schedules: { departureTime: string; arrivalTime: string } | null;
  totalPrice: number;
  status: "pending" | "accepted" | "cancelled";
  boatStatus?: string;
  remainingSeats?: number;
  totalCapacity?: number;
  downloadTicket?: () => void;
  acceptPendingBookings?: (bookingId: string) => void;
  declinePendingBookings?: (bookingId: string) => void;
}

const statusStyles: Record<BookingDetails["status"], string> = {
  pending:   "bg-yellow-100 text-yellow-800 border-yellow-300",
  accepted:  "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

const boatStatusStyles: Record<string, string> = {
  active:      "bg-green-100 text-green-800 border-green-300",
  maintenance: "bg-amber-100 text-amber-800 border-amber-300",
  cancelled:   "bg-red-100 text-red-800 border-red-300",
};

const boatStatusLabel: Record<string, string> = {
  active:      "Active",
  maintenance: "Maintenance",
  cancelled:   "Cancelled",
};

export default function ViewBookingsCard({
  bookingId, ticketcode, boatId, boatName, operatorId, companyName,
  passengerName, bookingDate, tripDate, paymentMethod, routeFrom, routeTo,
  schedules, image, totalPrice, status, boatStatus,
  remainingSeats, totalCapacity,
  acceptPendingBookings, declinePendingBookings, downloadTicket,
}: BookingDetails) {

  const isFull = remainingSeats !== undefined && remainingSeats === 0;

  // Determine capacity color tier
  const capacityTier: "full" | "low" | "ok" =
    remainingSeats === undefined || totalCapacity === undefined
      ? "ok"
      : remainingSeats === 0
      ? "full"
      : remainingSeats <= Math.ceil(totalCapacity * 0.25)
      ? "low"
      : "ok";

  const capacityColors = {
    full: {
      bg:       "bg-red-50 border-red-200",
      icon:     "text-red-500",
      text:     "text-red-700",
      bar:      "bg-red-500",
      subtext:  "text-red-400",
    },
    low: {
      bg:       "bg-amber-50 border-amber-200",
      icon:     "text-amber-500",
      text:     "text-amber-700",
      bar:      "bg-amber-400",
      subtext:  "text-amber-400",
    },
    ok: {
      bg:       "bg-green-50 border-green-200",
      icon:     "text-green-500",
      text:     "text-green-700",
      bar:      "bg-green-500",
      subtext:  "text-green-400",
    },
  }[capacityTier];

  const occupiedCount =
    totalCapacity !== undefined && remainingSeats !== undefined
      ? totalCapacity - remainingSeats
      : 0;

  const fillPercent =
    totalCapacity && totalCapacity > 0
      ? Math.round((occupiedCount / totalCapacity) * 100)
      : 0;

  const capacityLabel =
    remainingSeats === undefined
      ? null
      : remainingSeats === 0
      ? "Slot Full"
      : remainingSeats === 1
      ? "1 seat remaining"
      : `${remainingSeats} seats remaining`;

  async function handleDownloadReceipt() {
    if (!image) return;
    try {
      const response = await fetch(image);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gcash-receipt-${ticketcode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download receipt:", err);
    }
  }

  return (
    <div className="max-w-2xl border border-blue-200 rounded-2xl bg-white p-6">

      {/* ── Status Badges ─────────────────────────────────────────────────── */}
      <div className="mb-4 flex justify-end gap-6">
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Booking Status</p>
          <span className={`px-4 py-1 text-xs font-semibold uppercase rounded-full border w-28 text-center ${statusStyles[status]}`}>
            {status}
          </span>
        </div>
        {boatStatus && (
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Boat Status</p>
            <span className={`px-4 py-1 text-xs font-semibold uppercase rounded-full border w-28 text-center ${boatStatusStyles[boatStatus] ?? "bg-gray-100 text-gray-700 border-gray-300"}`}>
              {boatStatusLabel[boatStatus] ?? boatStatus}
            </span>
          </div>
        )}
      </div>

      {/* ── Capacity Badge ────────────────────────────────────────────────── */}
      {totalCapacity !== undefined && remainingSeats !== undefined && (
        <div className={`mb-4 flex items-center justify-between px-4 py-3 rounded-xl border ${capacityColors.bg}`}>
          {/* Left: icon + label */}
          <div className="flex items-center gap-2">
            {/* People / seat icon */}
            <svg
              className={`w-4 h-4 flex-shrink-0 ${capacityColors.icon}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9 4a2 2 0 11-4 0 2 2 0 014 0zM7 8a3 3 0 00-3 3v1h6v-1a3 3 0 00-3-3zM15 4a2 2 0 11-4 0 2 2 0 014 0zM13 8a3 3 0 00-3 3v1h6v-1a3 3 0 00-3-3z" />
            </svg>
            <div>
              <p className={`text-sm font-semibold ${capacityColors.text}`}>
                {capacityLabel}
              </p>
              <p className={`text-xs ${capacityColors.subtext}`}>
                {occupiedCount} of {totalCapacity} seats occupied
              </p>
            </div>
          </div>

          {/* Right: progress bar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${capacityColors.bar}`}
                style={{ width: `${fillPercent}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap font-medium">
              {fillPercent}%
            </span>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-4">
        <span className="flex-shrink-0 flex items-center justify-center rounded-full bg-blue-400 p-3 text-white">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
        </span>
        <div>
          <p className="font-semibold text-gray-600">Booking Details</p>
          <p className="text-sm text-gray-500">ID: #{bookingId}</p>
        </div>
      </div>

      {/* ── Ticket Code ──────────────────────────────────────────────────── */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Ticket Code</p>
        <p className="text-2xl font-bold text-blue-900 tracking-wider">{ticketcode}</p>
      </div>

      {/* ── Booking Info ─────────────────────────────────────────────────── */}
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Passenger Name</p>
            <p className="font-semibold text-gray-700">{passengerName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Boat Name</p>
            <p className="font-semibold text-gray-700">{boatName}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Boat ID</p>
            <p className="font-semibold text-gray-700">{boatId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Operator ID</p>
            <p className="font-semibold text-gray-700">{operatorId}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Company Name</p>
            <p className="font-semibold text-gray-700">{companyName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Payment Method</p>
            <p className="font-semibold text-gray-700">{paymentMethod}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Booking Date</p>
            <p className="font-semibold text-gray-700">
              {new Date(bookingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Trip Date</p>
            <p className="font-semibold text-gray-700">
              {new Date(tripDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Route</p>
            <p className="font-semibold text-gray-700">{routeFrom} → {routeTo}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Departure Time</p>
              <p className="font-semibold text-gray-700">{schedules?.departureTime ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Arrival Time</p>
              <p className="font-semibold text-gray-700">{schedules?.arrivalTime ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── GCash Receipt ────────────────────────────────────────────────── */}
      {paymentMethod === "online" && image && (
        <div className="mt-2 border border-blue-200 rounded-xl overflow-hidden">
          <div className="bg-blue-50 px-4 py-2 border-b border-blue-200 flex items-center gap-2">
            <span className="text-blue-600">🧾</span>
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">GCash Receipt</p>
          </div>
          <div className="p-3 bg-white">
            <img
              src={image}
              alt="GCash Receipt"
              className="w-full max-h-52 object-contain rounded-lg border border-blue-100"
            />
            <button
              onClick={handleDownloadReceipt}
              className="mt-3 flex items-center justify-center gap-2 w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all"
            >
              ⬇ Download Receipt
            </button>
          </div>
        </div>
      )}

      {/* ── Total Price ──────────────────────────────────────────────────── */}
      <div className="my-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-base font-semibold text-gray-600">Total Price</span>
          <span className="text-2xl font-bold text-gray-900">₱{totalPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* ── Action Buttons ───────────────────────────────────────────────── */}
      {status === "pending" && (
        <div className="space-y-2">
          {/* Accept — disabled + tooltip when slot is full */}
          <div className="relative group">
            <button
              disabled={isFull}
              className={`w-full rounded-lg py-3 px-5 text-center text-sm font-semibold transition-all ${
                isFull
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
              onClick={() => {
                if (!isFull && acceptPendingBookings) acceptPendingBookings(bookingId);
              }}
            >
              {isFull ? (
                <span className="flex items-center justify-center gap-2">
                  {/* lock icon */}
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Slot Full — Cannot Accept
                </span>
              ) : (
                "Accept"
              )}
            </button>
            {/* Tooltip on hover when disabled */}
            {isFull && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex items-center whitespace-nowrap bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 shadow-lg pointer-events-none z-10">
                This slot has reached its full capacity of {totalCapacity} seats
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
              </div>
            )}
          </div>

          <button
            className="inline-block rounded-lg w-full py-3 px-5 text-center text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
            onClick={() => declinePendingBookings && declinePendingBookings(bookingId)}
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
}