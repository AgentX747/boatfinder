import AdminSideBar from "../../components/admindashboardsidebar.js";
import React, { useState, useEffect } from "react";
import BoatOperatorCard from "../../cards/boatoperatordetailscard.js";
import BoatCard from "../../cards/boatcarddetails.js";
import { apiFetch } from "../../utils/apifetch.js";
import { useNavigate } from "react-router-dom";
import {
  Search, Activity, Shield, Users, LogIn, Anchor, Trash2, Plus,
  CheckCircle, XCircle, AlertCircle, Edit3, DollarSign, LogOut,
  FileText, Download, TrendingUp, Clock, BarChart2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface BookingRow {
  booking_id: number;
  ticketcode: string;
  boatName: string;
  trip_date: string;
  booking_date: string;
  route_from: string;
  route_to: string;
  bookingstatus: string;
  boatstatus: string;
  total_price: string;
  payment_method: string;
  boatcapacity: number;
  departure_time: string;
  arrival_time: string;
  passengerName: string;
  passengerEmail: string;
  operatorName: string;
  companyName: string;
}

interface ReportSummary {
  total: number;
  revenue: number;
  byStatus: Record<string, number>;
}

interface ReportData {
  bookings: BookingRow[];
  summary: ReportSummary;
}

// ─── System Logs helpers ──────────────────────────────────────────────────────

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

// ─── Booking Report helpers ───────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function formatCurrency(n: string | number) {
  return `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

const STATUS_STYLE: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800",
  accepted:  "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_ICON: Record<string, React.ReactElement> = {
  pending:   <Clock className="w-3 h-3" />,
  accepted:  <CheckCircle className="w-3 h-3" />,
  completed: <CheckCircle className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

function downloadReportPDF(data: ReportData, dateFrom: string, dateTo: string) {
  const { bookings, summary } = data;

  const rows = bookings
    .map(
      (b) => `
    <tr>
      <td>${b.booking_id}</td>
      <td>${b.ticketcode ?? "—"}</td>
      <td>${b.passengerName ?? "—"}</td>
      <td>${b.boatName ?? "—"}</td>
      <td>${b.route_from} → ${b.route_to}</td>
      <td>${formatDate(b.trip_date)}</td>
      <td>${b.departure_time ?? "—"} – ${b.arrival_time ?? "—"}</td>
      <td class="status ${b.bookingstatus}">${b.bookingstatus}</td>
      <td class="right">${formatCurrency(b.total_price)}</td>
      <td>${b.payment_method ?? "—"}</td>
      <td>${b.operatorName ?? "—"}</td>
      <td>${b.companyName ?? "—"}</td>
    </tr>`
    )
    .join("");

  const statusRows = Object.entries(summary.byStatus)
    .map(([s, n]) => `<tr><td class="capitalize">${s}</td><td>${n}</td></tr>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Booking Report ${dateFrom} to ${dateTo}</title>
<style>
  @page { size: A4 landscape; margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; color: #1a1a2e; margin: 0; padding: 0; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2.5px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand-icon { width: 38px; height: 38px; background: #1e3a8a; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18pt; font-weight: 700; }
  .brand-name { font-size: 16pt; font-weight: 700; color: #1e3a8a; }
  .brand-sub { font-size: 8pt; color: #4b5563; }
  .meta { text-align: right; font-size: 8pt; color: #6b7280; line-height: 1.8; }
  .meta strong { color: #1e3a8a; font-size: 10pt; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
  .stat-card { border: 1px solid #dbeafe; border-radius: 6px; padding: 8px 10px; background: #eff6ff; }
  .stat-card .label { font-size: 7.5pt; color: #6b7280; margin-bottom: 2px; }
  .stat-card .value { font-size: 14pt; font-weight: 700; color: #1e40af; }
  .status-table { margin-bottom: 14px; }
  .status-table table { border-collapse: collapse; font-size: 8.5pt; }
  .status-table th, .status-table td { border: 0.5px solid #e5e7eb; padding: 4px 8px; }
  .status-table th { background: #dbeafe; color: #1e3a8a; text-align: left; }
  .capitalize { text-transform: capitalize; }
  table.bookings { width: 100%; border-collapse: collapse; }
  table.bookings th { background: #1e3a8a; color: #fff; font-size: 7.5pt; padding: 5px 6px; text-align: left; white-space: nowrap; }
  table.bookings td { font-size: 7.5pt; padding: 4px 6px; border-bottom: 0.5px solid #e5e7eb; white-space: nowrap; }
  table.bookings tr:nth-child(even) td { background: #f8fafc; }
  .right { text-align: right; }
  .status.pending { color: #92400e; }
  .status.accepted { color: #065f46; }
  .status.completed { color: #1e40af; }
  .status.cancelled { color: #991b1b; }
  .footer { margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 7.5pt; color: #9ca3af; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="header">
  <div class="brand">
    <div class="brand-icon">B</div>
    <div>
      <div class="brand-name">BoatFinder</div>
      <div class="brand-sub">Admin Booking Report</div>
    </div>
  </div>
  <div class="meta">
    <strong>Booking Report</strong><br/>
    Period: ${formatDate(dateFrom)} – ${formatDate(dateTo)}<br/>
    Generated: ${new Date().toLocaleString("en-PH")}<br/>
    Total records: ${summary.total}
  </div>
</div>
<div class="summary-grid">
  <div class="stat-card"><div class="label">Total Bookings</div><div class="value">${summary.total}</div></div>
  <div class="stat-card"><div class="label">Total Revenue</div><div class="value">${formatCurrency(summary.revenue)}</div></div>
  <div class="stat-card"><div class="label">Completed</div><div class="value">${summary.byStatus["completed"] ?? 0}</div></div>
  <div class="stat-card"><div class="label">Cancelled</div><div class="value">${summary.byStatus["cancelled"] ?? 0}</div></div>
</div>
<div class="status-table">
  <table><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>${statusRows}</tbody></table>
</div>
<table class="bookings">
  <thead>
    <tr>
      <th>#ID</th><th>Ticket Code</th><th>Passenger</th><th>Boat</th><th>Route</th>
      <th>Trip Date</th><th>Schedule</th><th>Status</th><th>Price</th>
      <th>Payment</th><th>Operator</th><th>Company</th>
    </tr>
  </thead>
  <tbody>${rows || '<tr><td colspan="12" style="text-align:center;padding:16px;color:#9ca3af;">No bookings found for this period.</td></tr>'}</tbody>
</table>
<div class="footer">
  <span>BoatFinder Admin — Confidential</span>
  <span>Generated ${new Date().toISOString()}</span>
</div>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank", "width=1100,height=800");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `booking_report_${dateFrom}_to_${dateTo}.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("operatorapplications");

  // Admin session
  const [adminDetails, setAdminDetails] = useState({
    adminId: "", userName: "", firstName: "", lastName: "",
  });

  // Existing data
  const [boatOperators, setBoatOperators] = useState<BoatOperator[]>([]);
  const [boats, setBoats]                 = useState<Boat[]>([]);
  const [adminLogs, setAdminLogs]         = useState<AdminLog[]>([]);
  const [pendingTickets, setPendingTickets] = useState<any[]>([]);
  const [pendingCount, setPendingCount]   = useState(0);
  const [logSearch, setLogSearch]         = useState("");

  type Tab = "pending" | "verified";
  const [operatorActiveTab, setOperatorActiveTab] = useState<Tab>("pending");
  const [BoatActiveTab, setBoatActiveTab]         = useState<Tab>("pending");

  // Booking report state
  const today = todayISO();
  const [reportDateFrom, setReportDateFrom] = useState(today);
  const [reportDateTo,   setReportDateTo]   = useState(today);
  const [report,         setReport]         = useState<ReportData | null>(null);
  const [reportLoading,  setReportLoading]  = useState(false);
  const [reportError,    setReportError]    = useState<string | null>(null);
  const [reportSearch,   setReportSearch]   = useState("");

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchAdminSession() {
      try {
        const res = await apiFetch("https://boatfinder.onrender.com/admin/adminsession", {
          method: "GET", credentials: "include",
        });
        if (res.status === 401 || res.status === 403) { navigate("/login"); return; }
        if (!res.ok) throw new Error("Failed to fetch admin session");
        const data = await res.json();
        setAdminDetails({
          adminId: data.adminId, userName: data.userName,
          firstName: data.firstName, lastName: data.lastName,
        });
      } catch (error) {
        console.error("Session fetch error:", error);
        navigate("/login");
      }
    }

    async function fetchBoatOperators() {
      try {
        const res = await apiFetch("https://boatfinder.onrender.com/admin/getboatoperators", { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch boat operators");
        setBoatOperators(await res.json());
      } catch (error) { console.error("Failed to fetch boat operators:", error); }
    }

    async function fetchBoats() {
      try {
        const res = await apiFetch("https://boatfinder.onrender.com/admin/getallboats", { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch boats");
        setBoats(await res.json());
      } catch (error) { console.error("Failed to fetch boats:", error); }
    }

    async function fetchAdminLogs() {
      try {
        const res = await apiFetch("https://boatfinder.onrender.com/admin/getadminlogs", { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch admin logs");
        setAdminLogs(await res.json());
      } catch (error) { console.error("Failed to fetch admin logs:", error); }
    }

    async function fetchPendingTickets() {
      try {
        const res = await apiFetch("https://boatfinder.onrender.com/admin/getpendingtickets", { method: "GET", credentials: "include" });
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
    await apiFetch("https://boatfinder.onrender.com/auth/logout", { method: "POST", credentials: "include" });
    navigate("/login");
  }

  const filteredLogs = adminLogs.filter((log) => {
    const q = logSearch.toLowerCase();
    return (
      String(log.user_id ?? "").includes(q) ||
      log.action_type.toLowerCase().includes(q)
    );
  });

  // ── Booking report handlers ─────────────────────────────────────────────────

  function handleReportDateFromChange(val: string) {
    setReportDateFrom(val);
    if (reportDateTo < val) setReportDateTo(val);
    setReport(null);
    setReportError(null);
  }

  function handleReportDateToChange(val: string) {
    if (val < reportDateFrom) return;
    setReportDateTo(val);
    setReport(null);
    setReportError(null);
  }

  async function fetchReport() {
    setReportLoading(true);
    setReportError(null);
    setReport(null);
    try {
      const res = await apiFetch(
        `https://boatfinder.onrender.com/admin/bookingreport?dateFrom=${reportDateFrom}&dateTo=${reportDateTo}`,
        { method: "GET", credentials: "include" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed to fetch report");
      }
      setReport(await res.json());
    } catch (e: any) {
      setReportError(e.message ?? "Unknown error");
    } finally {
      setReportLoading(false);
    }
  }

  const filteredReportBookings = (report?.bookings ?? []).filter((b) => {
    const q = reportSearch.toLowerCase();
    return (
      !q ||
      b.ticketcode?.toLowerCase().includes(q) ||
      b.passengerName?.toLowerCase().includes(q) ||
      b.boatName?.toLowerCase().includes(q) ||
      b.route_from?.toLowerCase().includes(q) ||
      b.route_to?.toLowerCase().includes(q) ||
      b.bookingstatus?.toLowerCase().includes(q)
    );
  });

  // ── Tab rendering ───────────────────────────────────────────────────────────

  const renderContent = () => {
    switch (activeTab) {

      // ── Operator Applications ───────────────────────────────────────────────
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

      // ── Boat Applications ───────────────────────────────────────────────────
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

      // ── Support Tickets ─────────────────────────────────────────────────────
      case "supporttickets":
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-8">
            <div className="max-w-6xl mx-auto">
              <div className="mb-5 sm:mb-8">
                <h1 className="text-2xl sm:text-4xl font-bold text-blue-900 mb-1 sm:mb-2">Support Tickets</h1>
                <p className="text-blue-700 text-sm sm:text-base">Manage and track customer support requests</p>
              </div>

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

              <div className="mt-5 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-blue-400">
                  <p className="text-gray-600 text-sm">Pending Tickets</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-400">{pendingCount}</p>
                </div>
              </div>
            </div>
          </div>
        );

      // ── System Logs ─────────────────────────────────────────────────────────
      case "systemlogs":
        return (
          <div className="min-h-screen bg-white">
            <div className="border-b border-gray-200 p-4 sm:p-8">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-gray-900" />
                  <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">System Logs</h1>
                </div>
                <p className="text-gray-600 text-sm sm:text-base">Track all system transactions and user activities</p>
              </div>
            </div>

            <div className="p-3 sm:p-8">
              <div className="max-w-7xl mx-auto">
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

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <div className="bg-gray-50 border-b border-gray-200 p-3 sm:p-4 grid grid-cols-5 gap-2 sm:gap-4 items-center min-w-[640px]">
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Log ID</div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">User ID</div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Action Type</div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">User Agent</div>
                    </div>

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

      // ── Booking Reports ─────────────────────────────────────────────────────
      case "bookingreports":
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-5 sm:py-8 px-3 sm:px-4 md:px-8">
            <div className="max-w-7xl mx-auto">

              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                  <BarChart2 className="w-7 h-7 text-blue-800" />
                  <h1 className="text-2xl sm:text-4xl font-bold text-blue-900">Booking Reports</h1>
                </div>
                <p className="text-blue-600 text-sm sm:text-base ml-10">
                  Generate and download booking data for a selected date range
                </p>
              </div>

              {/* Date filter card */}
              <div className="bg-white rounded-xl border-2 border-blue-200 shadow-md p-4 sm:p-6 mb-6">
                <h2 className="text-base font-semibold text-blue-900 mb-4">Select Date Range</h2>
                <div className="flex flex-col sm:flex-row gap-4 items-end flex-wrap">

                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs font-medium text-blue-700 mb-1">Date From</label>
                    <input
                      type="date"
                      value={reportDateFrom}
                      max={today}
                      onChange={(e) => handleReportDateFromChange(e.target.value)}
                      className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs font-medium text-blue-700 mb-1">Date To</label>
                    <input
                      type="date"
                      value={reportDateTo}
                      min={reportDateFrom}
                      max={today}
                      onChange={(e) => handleReportDateToChange(e.target.value)}
                      className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-900 focus:outline-none focus:border-blue-500"
                    />
                    {reportDateTo < reportDateFrom && (
                      <p className="text-xs text-red-500 mt-1">End date cannot be before start date.</p>
                    )}
                  </div>

                  <button
                    onClick={fetchReport}
                    disabled={reportLoading || reportDateTo < reportDateFrom}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors shadow"
                  >
                    {reportLoading ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    {reportLoading ? "Generating…" : "Generate Report"}
                  </button>

                  {report && (
                    <button
                      onClick={() => downloadReportPDF(report, reportDateFrom, reportDateTo)}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors shadow"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                  )}
                </div>
              </div>

              {/* Error */}
              {reportError && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {reportError}
                </div>
              )}

              {/* Summary stat cards */}
              {report && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="bg-white rounded-xl border-2 border-blue-200 shadow p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-blue-500" />
                        <p className="text-xs text-blue-600">Total Bookings</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">{report.summary.total}</p>
                    </div>

                    <div className="bg-white rounded-xl border-2 border-green-200 shadow p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <p className="text-xs text-green-600">Total Revenue</p>
                      </div>
                      <p className="text-xl font-bold text-green-900">{formatCurrency(report.summary.revenue)}</p>
                    </div>

                    <div className="bg-white rounded-xl border-2 border-indigo-200 shadow p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-indigo-500" />
                        <p className="text-xs text-indigo-600">Completed</p>
                      </div>
                      <p className="text-2xl font-bold text-indigo-900">{report.summary.byStatus["completed"] ?? 0}</p>
                    </div>

                    <div className="bg-white rounded-xl border-2 border-red-200 shadow p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <p className="text-xs text-red-600">Cancelled</p>
                      </div>
                      <p className="text-2xl font-bold text-red-900">{report.summary.byStatus["cancelled"] ?? 0}</p>
                    </div>
                  </div>

                  {/* Status breakdown pills */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {Object.entries(report.summary.byStatus).map(([status, count]) => (
                      <span
                        key={status}
                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full capitalize ${STATUS_STYLE[status] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {STATUS_ICON[status]}
                        {status}: {count}
                      </span>
                    ))}
                  </div>

                  {/* Search within results */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                    <input
                      type="text"
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      placeholder="Filter by passenger, ticket, boat, route, status…"
                      className="w-full pl-9 pr-4 py-2 border-2 border-blue-200 rounded-lg text-sm text-blue-900 focus:outline-none focus:border-blue-500 bg-white"
                    />
                  </div>

                  {/* Table */}
                  <div className="bg-white rounded-xl border-2 border-blue-200 shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px]">
                        <thead className="bg-blue-700 text-white">
                          <tr>
                            {["#ID", "Ticket", "Passenger", "Boat", "Route", "Trip Date", "Schedule", "Status", "Price", "Payment", "Operator"].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredReportBookings.length === 0 ? (
                            <tr>
                              <td colSpan={11} className="text-center py-12 text-blue-400 text-sm">
                                No bookings found for this date range.
                              </td>
                            </tr>
                          ) : (
                            filteredReportBookings.map((b, i) => (
                              <tr key={b.booking_id} className={i % 2 === 0 ? "bg-white" : "bg-blue-50"}>
                                <td className="px-4 py-3 text-xs text-gray-600">#{b.booking_id}</td>
                                <td className="px-4 py-3 text-xs font-mono text-gray-700">{b.ticketcode ?? "—"}</td>
                                <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                                  <div>{b.passengerName ?? "—"}</div>
                                  <div className="text-gray-400">{b.passengerEmail}</div>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{b.boatName ?? "—"}</td>
                                <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{b.route_from} → {b.route_to}</td>
                                <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{formatDate(b.trip_date)}</td>
                                <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{b.departure_time ?? "—"} – {b.arrival_time ?? "—"}</td>
                                <td className="px-4 py-3">
                                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full capitalize w-fit ${STATUS_STYLE[b.bookingstatus] ?? "bg-gray-100 text-gray-700"}`}>
                                    {STATUS_ICON[b.bookingstatus]}
                                    {b.bookingstatus}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-700 text-right whitespace-nowrap">{formatCurrency(b.total_price)}</td>
                                <td className="px-4 py-3 text-xs text-gray-500 capitalize">{b.payment_method ?? "—"}</td>
                                <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{b.operatorName ?? "—"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-blue-100 px-4 py-2 flex items-center justify-between bg-blue-50">
                      <span className="text-xs text-blue-600">
                        Showing {filteredReportBookings.length} of {report.bookings.length} bookings
                      </span>
                      <button
                        onClick={() => downloadReportPDF(report, reportDateFrom, reportDateTo)}
                        className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-medium"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download PDF
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Empty state */}
              {!report && !reportLoading && !reportError && (
                <div className="flex flex-col items-center justify-center py-20 text-blue-300">
                  <FileText className="w-16 h-16 mb-4 opacity-40" />
                  <p className="text-sm">
                    Select a date range and click{" "}
                    <span className="text-blue-500 font-semibold">Generate Report</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return <div>Select a tab</div>;
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen">
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
        renderbookingreports={() => setActiveTab("bookingreports")}
        logout={handleLogout}
      />

      <div className="flex-1 ml-14 sm:ml-16 lg:ml-72 min-w-0 overflow-x-hidden">
        {renderContent()}
      </div>
    </div>
  );
}