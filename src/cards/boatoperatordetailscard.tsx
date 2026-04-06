interface BoatOperatorCardProps {
  operator_id: string | number;
  firstName: string;
  lastName: string;
  address: string;
  email: string;
registration_status?: string;
  navigateTo: () => void;
}

export default function BoatOperatorCard({ operator_id, firstName, lastName, address, email,  registration_status, navigateTo }: BoatOperatorCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row">
        <div className="md:w-64 h-48 md:h-auto bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <svg className="w-24 h-24 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>

        <div className="flex-1 p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-blue-900 mb-2">{firstName} {lastName}</h3>
              <p className="text-blue-600 text-sm mb-1">Operator ID: <span className="font-medium">#{operator_id}</span></p>
            </div>
           <span
  className={`px-4 py-1 rounded-full text-sm font-medium self-start
    ${
      registration_status?.toLowerCase() === "pending"
        ? "bg-yellow-100 text-yellow-700"
        : registration_status?.toLowerCase() === "verified"
        ? "bg-green-100 text-green-700"
        : "bg-gray-100 text-gray-600"
    }
  `}
>
  {registration_status}
</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center text-blue-700">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">{email}</span>
            </div>
            <div className="flex items-center text-blue-700">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm">{address}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-600 font-medium">Boat Operator</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              onClick={navigateTo}>
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
