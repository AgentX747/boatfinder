interface BoatCardProps {
  boat_id?: number | string;
  operator_id?: string | number;
  boat_name?: string;
  vessel_type?: string;
  route_from?: string;
  route_to?: string;
  company_name?: string;
  registration_status?: string;
  navigateTo?: () => void;
}

export default function BoatCard({
  boat_id,
  operator_id,
  boat_name,
  vessel_type,
  route_from,
  route_to,
  company_name,
  registration_status,
  navigateTo,
}: BoatCardProps) {
  // normalize status for badge
  const status = registration_status?.toLowerCase().trim();
  const statusStyles =
    status === "pending"
      ? "bg-yellow-100 text-yellow-700"
      : status === "verified"
      ? "bg-green-100 text-green-700"
      : "bg-gray-100 text-gray-600";

  return (
    <div className="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row">
        {/* Image / Icon */}
        <div className="md:w-64 h-48 md:h-auto bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <svg
            className="w-24 h-24 text-white opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 17h1l2-6h12l2 6h1M5 17a2 2 0 104 0M15 17a2 2 0 104 0M6 11V6a1 1 0 011-1h10a1 1 0 011 1v5"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {/* Header: Boat info, vessel type, registration status */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 gap-2 md:gap-0">
            <div>
              <h3 className="text-xl font-bold text-blue-900 mb-2">{boat_name}</h3>
              <p className="text-blue-600 text-sm mb-1">
                Boat ID: <span className="font-medium">#{boat_id}</span>
              </p>
              <p className="text-blue-600 text-sm mb-1">
                Operator ID: <span className="font-medium">#{operator_id}</span>
              </p>
              {company_name && (
                <p className="text-blue-600 text-sm">
                  Company: <span className="font-medium">{company_name}</span>
                </p>
              )}
            </div>

            {/* Vessel Type Badge */}
            <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-sm font-medium self-start mt-2 md:mt-0">
              {vessel_type}
            </span>

            {/* Registration Status Badge */}
            {registration_status && (
              <span
                className={`px-4 py-1 rounded-full text-sm font-medium self-start mt-2 md:mt-0 ${statusStyles}`}
              >
                {registration_status}
              </span>
            )}
          </div>

          {/* Route Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center text-blue-700">
              <svg
                className="w-5 h-5 mr-2 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-sm">
                <span className="font-medium">From:</span> {route_from}
              </span>
            </div>
            <div className="flex items-center text-blue-700">
              <svg
                className="w-5 h-5 mr-2 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-sm">
                <span className="font-medium">To:</span> {route_to}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-600 font-medium">Boat Operator</p>
            {navigateTo && (
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                onClick={navigateTo}
              >
                View Details
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}