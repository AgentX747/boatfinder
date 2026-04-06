import { LogOut, User, Users, Sailboat, Ticket, FileText } from "lucide-react"

interface UserProfile {
  adminId: number | string
  firstName: string
  lastName: string
}

interface SidebarProps {
  user?: UserProfile
  renderoperatorapplications?: () => void
  renderboatapplications?: () => void
  rendersupporttickets?: () => void
  rendersystemlogs?: () => void
  goToProfile?: () => void
  logout?: () => void
}

export default function AdminSidebar({
  user,
  renderoperatorapplications,
  renderboatapplications,
  rendersupporttickets,
  rendersystemlogs,
  logout,
  goToProfile,
}: SidebarProps) {
  return (
    <div className="fixed left-0 top-0 h-screen z-40 w-14 sm:w-16 lg:w-72 bg-white flex flex-col border-r border-slate-200 overflow-y-auto transition-all duration-200">

      {/* Header */}
      <div className="p-2 lg:p-6 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
        <div className="flex flex-col items-center gap-1 lg:gap-3 text-center">
          <button
            onClick={() => goToProfile?.()}
            className="flex items-center justify-center w-9 h-9 lg:w-14 lg:h-14 bg-white border-2 border-blue-500 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <User className="w-5 h-5 lg:w-8 lg:h-8 text-black" />
          </button>
          {/* Name, ID and role only visible on lg+ */}
          <div className="hidden lg:block">
            <p className="text-slate-900 font-bold text-sm">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-slate-900 font-bold text-sm">{user?.adminId}</p>
            <p className="text-slate-400 text-xs">Administrator</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ul className="flex-1 flex flex-col gap-1 p-1 lg:p-4">
        <li>
          <button
            className="w-full flex flex-col items-center justify-center gap-1 lg:gap-2 px-1 lg:px-4 py-2.5 lg:py-3 text-slate-600 rounded-lg transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:shadow-sm active:scale-95 font-medium text-center"
            onClick={renderoperatorapplications}
            title="Operator Applications"
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            <span className="hidden lg:block text-sm leading-tight">Operator Applications</span>
          </button>
        </li>

        <li>
          <button
            className="w-full flex flex-col items-center justify-center gap-1 lg:gap-2 px-1 lg:px-4 py-2.5 lg:py-3 text-slate-600 rounded-lg transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:shadow-sm active:scale-95 font-medium text-center"
            onClick={renderboatapplications}
            title="Boat Applications"
          >
            <Sailboat className="w-5 h-5 flex-shrink-0" />
            <span className="hidden lg:block text-sm leading-tight">Boat Applications</span>
          </button>
        </li>

        <li>
          <button
            className="w-full flex flex-col items-center justify-center gap-1 lg:gap-2 px-1 lg:px-4 py-2.5 lg:py-3 text-slate-600 rounded-lg transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:shadow-sm active:scale-95 font-medium text-center"
            onClick={rendersupporttickets}
            title="Support Tickets"
          >
            <Ticket className="w-5 h-5 flex-shrink-0" />
            <span className="hidden lg:block text-sm leading-tight">Support Tickets</span>
          </button>
        </li>

        <li>
          <button
            className="w-full flex flex-col items-center justify-center gap-1 lg:gap-2 px-1 lg:px-4 py-2.5 lg:py-3 text-slate-600 rounded-lg transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:shadow-sm active:scale-95 font-medium text-center"
            onClick={rendersystemlogs}
            title="System Logs"
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            <span className="hidden lg:block text-sm leading-tight">System Logs</span>
          </button>
        </li>
      </ul>

      {/* Logout */}
      <div className="p-1 lg:p-4 border-t border-slate-200 bg-gradient-to-t from-slate-50 to-white">
        <button
          className="w-full flex items-center justify-center lg:gap-2 px-1 lg:px-4 py-2.5 lg:py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
          onClick={logout}
          title="Logout"
        >
          <LogOut className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
          <span className="hidden lg:block text-sm">Logout</span>
        </button>
      </div>
    </div>
  )
}