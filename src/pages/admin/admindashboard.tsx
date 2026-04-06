import AdminSideBar from "../../components/admindashboardsidebar.js";
import React, { useState, useEffect } from "react";
import BoatOperatorCard from "../../cards/boatoperatordetailscard.js";
import BoatCard from "../../cards/boatcarddetails.js"
import { apiFetch } from "../../utils/apifetch.js";
import { useNavigate } from "react-router-dom"
import { Search, Activity, Shield, Users, LogIn, Anchor, Trash2, Plus, CheckCircle, XCircle, AlertCircle, Edit3, DollarSign, LogOut, Eye } from 'lucide-react'

type BoatOperator = {
  operator_id: string;
  firstName: string;
  lastName: string;
  address: string;
  email: string;
  phone_number?: string;
  gender?: string;
  companyName?: string;
  registration_status?: string;
};

type Boat = {
  boat_id?: string;
  operator_id?: string;
  boat_name?: string;
  vessel_type?: string;
  route_from?: string;
  route_to?: string;
  registration_status?: string;
  company_name?: string;
};

interface AdminLog {
  log_id: string;
  user_id: string | null;
  role: string | null;
  action_type: string;
  user_agent: string | null;
  created_at: string;
}

function ActionIcon({ action }: { action: string }) {
  const map: Record<string, React.ReactElement> = {
    REGISTER:                  <Users className="w-4 h-4 text-blue-500" />,
    LOGIN:                     <LogIn className="w-4 h-4 text-green-500" />,
    LOGOUT:                    <LogOut className="w-4 h-4 text-gray-500" />,
    LOGIN_FAILED:              <AlertCircle className="w-4 h-4 text-yellow-500" />,
    REGISTER_FAILED_DUPLICATE: <AlertCircle className="w-4 h-4 text-yellow-500" />,
    CREATE_BOAT:               <Anchor className="w-4 h-4 text-purple-500" />,
    ADD_BOAT:                  <Plus className="w-4 h-4 text-green-500" />,
    ADD_BOAT_FAILED:           <AlertCircle className="w-4 h-4 text-yellow-500" />,
    DELETE_BOAT:               <Trash2 className="w-4 h-4 text-red-500" />,
    EDIT_BOAT:                 <Edit3 className="w-4 h-4 text-blue-500" />,
    EDIT_TICKET_PRICE:         <DollarSign className="w-4 h-4 text-orange-500" />,
    ACCEPT_BOOKING:            <CheckCircle className="w-4 h-4 text-green-500" />,
    DECLINE_BOOKING:           <XCircle className="w-4 h-4 text-red-500" />,
  };
  return map[action] ?? <AlertCircle className="w-4 h-4 text-gray-400" />;
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <span className="text-gray-500">—</span>;
  const styles: Record<string, string> = {
    Admin:    "bg-red-100 text-red-700",
    Customer: "bg-blue-100 text-blue-700",
    Operator: "bg-purple-100 text-purple-700",
  };
  const icons: Record<string, React.ReactElement> = {
    Admin:    <Shield className="w-4 h-4 text-red-500" />,
    Customer: <Users className="w-4 h-4 text-blue-500" />,
    Operator: <Anchor className="w-4 h-4 text-purple-500" />,
  };
  return (
    <div className="flex items-center gap-2">
      {icons[role] ?? null}
      <span className={`text-xs font-medium px-2 py-1 rounded ${styles[role] ?? "bg-gray-100 text-gray-700"}`}>
        {role}
      </span>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("operatorapplications");
  const [adminDetails, setAdminDetails] = useState({
    adminId: "",
    userName: "",
    firstName: "",
    lastName: "",
  });
  const [boatOperators, setBoatOperators] = useState<BoatOperator[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [pendingTickets, setPendingTickets] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [logSearch, setLogSearch] = useState("");

  type Tab = "pending" | "verified";
  const [operatorActiveTab, setOperatorActiveTab] = useState<Tab>("pending");
  const [BoatActiveTab, setBoatActiveTab] = useState<Tab>("pending");

  useEffect(() => {
    async function fetchAdminSession() {
      try {
        const res = await apiFetch("http://localhost:3000/admin/adminsession", {
          method: "GET",
          credentials: "include",
        });
        if (res.status === 401 || res.status === 403) { navigate("/login"); return; }
        if (!res.ok) throw new Error("Failed to fetch admin session");
        const data = await res.json();
        setAdminDetails({
          adminId: data.adminId,
          userName: data.userName,
          firstName: data.firstName,
          lastName: data.lastName,
        });
      } catch (error) {
        console.error("Session fetch error:", error);
        navigate("/login");
      }
    }

    async function fetchBoatOperators() {
      try {
        const res = await apiFetch("http://localhost:3000/admin/getboatoperators", { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch boat operators");
        setBoatOperators(await res.json());
      } catch (error) { console.error("Failed to fetch boat operators:", error); }
    }

    async function fetchBoats() {
      try {
        const res = await apiFetch("http://localhost:3000/admin/getallboats", { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch boats");
        setBoats(await res.json());
      } catch (error) { console.error("Failed to fetch boats:", error); }
    }

    async function fetchAdminLogs() {
      try {
        const res = await apiFetch("http://localhost:3000/admin/getadminlogs", { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch admin logs");
        setAdminLogs(await res.json());
      } catch (error) { console.error("Failed to fetch admin logs:", error); }
    }

    async function fetchPendingTickets() {
      try {
        const res = await apiFetch("http://localhost:3000/admin/getpendingtickets", { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch pending tickets");
        const data = await res.json();
        setPendingTickets(data.tickets);
        setPendingCount(data.total);
      } catch (error) { console.error("Failed to fetch pending tickets:", error); }
    }

    fetchPendingTickets();
    fetchAdminLogs();
    fetchBoats();
    fetchBoatOperators();
    fetchAdminSession();
  }, [navigate]);

  async function handleLogout() {
    await apiFetch("http://localhost:3000/auth/logout", { method: "POST", credentials: "include" });
    navigate("/login");
  }

  const filteredLogs = adminLogs.filter((log) => {
    const q = logSearch.toLowerCase();
    return (
      String(log.user_id ?? "").includes(q) ||
      log.action_type.toLowerCase().includes(q)
    );
  });

  const renderContent = () => {
    switch (activeTab) {
      case "operatorapplications":
        return (
          <main className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-5 sm:py-8 px-3 sm:px-4 md:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-5 sm:mb-8">
                <h1 className="text-2xl sm:text-4xl font-bold text-blue-900 mb-1 sm:mb-2">
                  Manage Boat Operator Applications
                </h1>
                <p className="text-blue-600 text-sm sm:text-base">Review and verify submitted operator registrations</p>
              </div>

              <div className="flex gap-2 sm:gap-3 mb-5 sm:mb-8 flex-wrap">
                {(["pending", "verified"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setOperatorActiveTab(tab)}
                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-colors shadow-md capitalize text-sm sm:text-base
                      ${operatorActiveTab === tab
                        ? "bg-blue-500 text-white"
                        : "bg-white text-blue-600 border-2 border-blue-200 hover:bg-blue-50"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {boatOperators
                  .filter((op) => op.registration_status?.toLowerCase() === operatorActiveTab)
                  .map((operator) => (
                    <BoatOperatorCard
                      key={operator.operator_id}
                      operator_id={operator.operator_id}
                      firstName={operator.firstName}
                      lastName={operator.lastName}
                      address={operator.address}
                      email={operator.email}
                      registration_status={operator.registration_status}
                      navigateTo={() => navigate(`/manageboatoperators/${operator.operator_id}`)}
                    />
                  ))}
                {boatOperators.filter((op) => op.registration_status?.toLowerCase() === operatorActiveTab).length === 0 && (
                  <p className="text-sm sm:text-base">No {operatorActiveTab} operators found.</p>
                )}
              </div>
            </div>
          </main>
        );

      case "boatapplications":
        return (
          <main className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-5 sm:py-8 px-3 sm:px-4 md:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-5 sm:mb-8">
                <h1 className="text-2xl sm:text-4xl font-bold text-blue-900 mb-1 sm:mb-2">Manage Boat Applications</h1>
                <p className="text-blue-600 text-sm sm:text-base">Review and verify submitted boat registrations</p>
              </div>

              <div className="flex gap-2 sm:gap-3 mb-5 sm:mb-8 flex-wrap">
                {(["pending", "verified"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setBoatActiveTab(tab)}
                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-colors shadow-md capitalize text-sm sm:text-base
                      ${BoatActiveTab === tab
                        ? "bg-blue-500 text-white"
                        : "bg-white text-blue-600 border-2 border-blue-200 hover:bg-blue-50"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {boats
                  .filter((boat) => boat.registration_status?.toLowerCase() === BoatActiveTab)
                  .map((boat) => (
                    <BoatCard
                      key={boat.boat_id}
                      boat_id={boat.boat_id}
                      operator_id={boat.operator_id}
                      boat_name={boat.boat_name}
                      vessel_type={boat.vessel_type}
                      route_from={boat.route_from}
                      route_to={boat.route_to}
                      company_name={boat.company_name}
                      registration_status={boat.registration_status}
                      navigateTo={() => navigate(`/manageboats/${boat.boat_id}`)}
                    />
                  ))}
                {boats.filter((boat) => boat.registration_status?.toLowerCase() === BoatActiveTab).length === 0 && (
                  <p className="text-blue-700 col-span-full text-sm sm:text-base">No {BoatActiveTab} boats found.</p>
                )}
              </div>
            </div>
          </main>
        );

      case "supporttickets":
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-8">
            <div className="max-w-6xl mx-auto">
              <div className="mb-5 sm:mb-8">
                <h1 className="text-2xl sm:text-4xl font-bold text-blue-900 mb-1 sm:mb-2">Support Tickets</h1>
                <p className="text-blue-700 text-sm sm:text-base">Manage and track customer support requests</p>
              </div>

              {/* Scrollable table on mobile */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-blue-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                    <thead className="bg-blue-600 text-white">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-semibold text-sm">Ticket ID</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-semibold text-sm">User ID</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-semibold text-sm">User</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-semibold text-sm">Subject</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-right font-semibold text-sm">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTickets.map((ticket, index) => (
                        <tr key={ticket.ticket_id} className={index % 2 === 0 ? "bg-white" : "bg-blue-50"}>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-700 text-sm">#{ticket.ticket_id}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-700 text-sm">{ticket.firstName} {ticket.lastName}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-700 text-sm">{ticket.fk_support_userId}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-700 text-sm">{ticket.ticketSubject}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                            <button
                              className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded hover:bg-blue-700 text-xs sm:text-sm whitespace-nowrap"
                              onClick={() => navigate(`/ticketreview/${ticket.ticket_id}`)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-5 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-blue-400">
                  <p className="text-gray-600 text-sm">Pending Tickets</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-400">{pendingCount}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case "systemlogs":
        return (
          <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="border-b border-gray-200 p-4 sm:p-8">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-gray-900" />
                  <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">System Logs</h1>
                </div>
                <p className="text-gray-600 text-sm sm:text-base">Track all system transactions and user activities</p>
              </div>
            </div>

            {/* Main Content */}
            <div className="p-3 sm:p-8">
              <div className="max-w-7xl mx-auto">
                {/* Search Bar */}
                <div className="mb-4 sm:mb-6 flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <input
                      type="text"
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      placeholder="Search by User ID or Action..."
                      className="w-full pl-9 sm:pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-gray-300 text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Scrollable logs table on mobile */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    {/* Table Header */}
                    <div className="bg-gray-50 border-b border-gray-200 p-3 sm:p-4 grid grid-cols-5 gap-2 sm:gap-4 items-center min-w-[640px]">
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Log ID</div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">User ID</div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Action Type</div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">User Agent</div>
                    </div>

                    {/* Table Rows */}
                    <div className="divide-y divide-gray-200 min-w-[640px]">
                      {filteredLogs.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                          {adminLogs.length === 0 ? "Loading logs..." : "No logs match your search."}
                        </div>
                      ) : (
                        filteredLogs.map((log) => (
                          <div
                            key={log.log_id}
                            className="p-3 sm:p-4 grid grid-cols-5 gap-2 sm:gap-4 items-center hover:bg-gray-50 transition-colors"
                          >
                            <div className="font-medium text-gray-900 text-sm">{log.log_id}</div>
                            <div className="text-gray-600 text-sm">{log.user_id ?? "—"}</div>
                            <RoleBadge role={log.role} />
                            <div className="flex items-center gap-1 sm:gap-2">
                              <ActionIcon action={log.action_type} />
                              <span className="text-xs sm:text-sm font-medium text-gray-900">{log.action_type}</span>
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500 truncate" title={log.user_agent ?? ""}>
                              {log.user_agent ?? "—"}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — always fixed, icons only on small screens, full on lg+ */}
      <AdminSideBar
        user={{
          adminId: adminDetails.adminId,
          firstName: adminDetails.firstName,
          lastName: adminDetails.lastName,
        }}
        renderoperatorapplications={() => setActiveTab("operatorapplications")}
        renderboatapplications={() => setActiveTab("boatapplications")}
        rendersupporttickets={() => setActiveTab("supporttickets")}
        rendersystemlogs={() => setActiveTab("systemlogs")}
        logout={handleLogout}
      />

      {/* Main content — offset matches sidebar width at each breakpoint */}
      <div className="flex-1 ml-14 sm:ml-16 lg:ml-72 min-w-0 overflow-x-hidden">
        {renderContent()}
      </div>
    </div>
  );
}