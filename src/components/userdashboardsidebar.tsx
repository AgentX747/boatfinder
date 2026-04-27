import { LogOut, User, Ship, Route, Cloud, Book, Ticket , TrendingUpDownIcon, AlertCircle } from "lucide-react"

interface UserProfile {
  firstName: string
  lastName: string
}

interface SidebarProps {
  user?: UserProfile
  onLogout?: () => void
  renderRouteAndTimeslot?: () => void
  renderManageReservationAndBookings?: () => void
  renderViewBoats?: () => void
  renderViewWeatherForecast?: () => void
  rendersupportTicket?: () => void
   renderFareAndSurgeRiskPrediction?: () => void
  onWeatherNotification?: () => void
  goToProfile: () => void
}

export default function UserSidebar({
  user,
  onLogout,
  renderRouteAndTimeslot,
  renderManageReservationAndBookings,
  renderViewBoats,
  renderViewWeatherForecast,
  goToProfile,
  rendersupportTicket,
  renderFareAndSurgeRiskPrediction,
  onWeatherNotification
}: SidebarProps) {
  return (
    <div className="fixed left-0 top-0 h-screen z-40 w-14 sm:w-16 lg:w-72 bg-white flex flex-col border-r border-slate-200 overflow-y-auto transition-all duration-200">

      {/* Header */}
      <div className="p-2 lg:p-6 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
        <div className="flex flex-col items-center gap-1 lg:gap-3 text-center">
          <button
            onClick={() => goToProfile?.()}
            className="flex items-center justify-center w-9 h-9 lg:w-16 lg:h-16 rounded-full bg-white border-2 border-blue-500 hover:opacity-80 transition-opacity"
          >
            <User className="w-5 h-5 lg:w-8 lg:h-8 text-black" />
          </button>
          {/* Name only visible on lg+ */}
          <div className="hidden lg:block">
            <p className="text-slate-900 font-bold text-sm">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-slate-400 text-xs"></p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ul className="flex-1 flex flex-col gap-1 p-1 lg:p-4">
        <li>
          <button
            className="w-full flex flex-col items-center justify-center gap-1 lg:gap-2 px-1 lg:px-4 py-2.5 lg:py-3 text-slate-600 rounded-lg transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:shadow-sm active:scale-95 font-medium text-center"
            onClick={renderRouteAndTimeslot}
            title="Search Route and Timeslot"
          >
            <Route className="w-5 h-5 flex-shrink-0" />
            <span className="hidden lg:block text-sm leading-tight">Search Route and Timeslot</span>
          </button>
        </li>

        <li>
          <button
            className="w-full flex flex-col items-center justify-center gap-1 lg:gap-2 px-1 lg:px-4 py-2.5 lg:py-3 text-slate-600 rounded-lg transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:shadow-sm active:scale-95 font-medium text-center"
            onClick={renderManageReservationAndBookings}
            title="Manage Reservation & Bookings"
          >
            <Book className="w-5 h-5 flex-shrink-0" />
            <span className="hidden lg:block text-sm leading-tight">Manage Reservation & Bookings</span>
          </button>
        </li>

        <li>
          <button
            className="w-full flex flex-col items-center justify-center gap-1 lg:gap-2 px-1 lg:px-4 py-2.5 lg:py-3 text-slate-600 rounded-lg transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:shadow-sm active:scale-95 font-medium text-center"
            onClick={renderViewBoats}
            title="View Boats"
          >
            <Ship className="w-5 h-5 flex-shrink-0" />
            <span className="hidden lg:block text-sm leading-tight">View Boats</span>
          </button>
        </li>

        <li>
          <button
            className="w-full flex flex-col items-center justify-center gap-1 lg:gap-2 px-1 lg:px-4 py-2.5 lg:py-3 text-slate-600 rounded-lg transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:shadow-sm active:scale-95 font-medium text-center"
            onClick={renderViewWeatherForecast}
            title="View Weather Forecast"
          >
            <Cloud className="w-5 h-5 flex-shrink-0" />
            <span className="hidden lg:block text-sm leading-tight">View Weather Forecast</span>
          </button>
        </li>
         <li>
          <button
            className="w-full flex flex-col items-center justify-center gap-1 lg:gap-2 px-1 lg:px-4 py-2.5 lg:py-3 text-slate-600 rounded-lg transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:shadow-sm active:scale-95 font-medium text-center"
            onClick={renderFareAndSurgeRiskPrediction}
            title="Fare and Surge Risk Prediction"
          >
            <TrendingUpDownIcon className="w-5 h-5 flex-shrink-0" />
            <span className="hidden lg:block text-sm leading-tight">Fare and Surge Risk Prediction</span>
          </button>
        </li>

        <li>
          <button
            className="w-full flex flex-col items-center justify-center gap-1 lg:gap-2 px-1 lg:px-4 py-2.5 lg:py-3 text-slate-600 rounded-lg transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:shadow-sm active:scale-95 font-medium text-center"
            onClick={rendersupportTicket}
            title="Support Ticket"
          >
            <Ticket className="w-5 h-5 flex-shrink-0" />
            <span className="hidden lg:block text-sm leading-tight">Support Ticket</span>
          </button>
        </li>
      </ul>

      {/* Weather Notification & Logout */}
      <div className="p-1 lg:p-4 border-t border-slate-200 bg-gradient-to-t from-slate-50 to-white space-y-2">
        <button
          className="w-full flex items-center justify-center lg:gap-2 px-1 lg:px-4 py-2.5 lg:py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg active:scale-95"
          onClick={onWeatherNotification}
          title="Weather Caution - Shows alert only if weather is bad"
        >
          <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
          <span className="hidden lg:block text-sm">Weather Caution</span>
        </button>
        <button
          className="w-full flex items-center justify-center lg:gap-2 px-1 lg:px-4 py-2.5 lg:py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg active:scale-95"
          onClick={onLogout}
          title="Logout"
        >
          <LogOut className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
          <span className="hidden lg:block text-sm">Logout</span>
        </button>
      </div>
    </div>
  )
}
