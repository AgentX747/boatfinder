import { useState, useEffect } from "react";
import { apiFetch } from "../../utils/apifetch";
import { useNavigate, useParams } from "react-router-dom";
import {
  Shield,
  AlertCircle,
  CheckCircle2,
  Info,
  Ship,
  Clock,
  MapPin,
  Users,
  DollarSign,
  Check,
  X,
  Download,
} from "lucide-react";

interface Schedule {
  departureTime: string;
  arrivalTime: string;
}

interface BoatDetails {
  boatid: string | number;
  operatorId: string | number;
  operatorName: string;
  companyName: string;
  boatName: string;
  vesselType: string;
  capacityInformation: string;
  routeFrom: string;
  routeTo: string;
  ticketPrice: string;
  registrationStatus: string;
  legaldocs: string;
  schedules: string; // raw JSON string from DB
}

function parseSchedules(raw: string | null | undefined): Schedule[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s: any) =>
        s &&
        typeof s.departureTime === "string" &&
        typeof s.arrivalTime === "string"
    );
  } catch {
    return [];
  }
}

export default function ManageBoatsPage() {
  const navigate = useNavigate();
  const { boatId } = useParams();
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [boatDetails, setBoatDetails] = useState<BoatDetails>({
    boatid: boatId ?? "",
    operatorId: "",
    operatorName: "",
    companyName: "",
    boatName: "",
    vesselType: "",
    capacityInformation: "",
    routeFrom: "",
    routeTo: "",
    ticketPrice: "",
    registrationStatus: "",
    legaldocs: "",
    schedules: "",
  });

  useEffect(() => {
    async function fetchAdminSession() {
      try {
        const res = await apiFetch("https://boatfinder.onrender.com/admin/adminsession", {
          method: "GET",
          credentials: "include",
        });
        if (res.status === 401 || res.status === 403) { navigate("/login"); return; }
        if (!res.ok) throw new Error("Failed to fetch admin session");
      } catch (error) {
        console.error("Session fetch error:", error);
        navigate("/login");
      }
    }

    async function getBoatDetails() {
      try {
        const res = await apiFetch(
          `https://boatfinder.onrender.com/admin/getboatsbyid/${boatId}`,
          { method: "GET", credentials: "include" }
        );
        if (!res.ok) throw new Error("Failed to fetch boat details");
        const data = await res.json();
        setBoatDetails({
          boatid: data.boat_id,
          operatorId: data.operator_id,
          operatorName: data.operatorName,
          companyName: data.company_name,
          boatName: data.boat_name,
          vesselType: data.vessel_type,
          capacityInformation: data.capacity_information,
          routeFrom: data.route_from,
          routeTo: data.route_to,
          ticketPrice: data.ticket_price,
          registrationStatus: data.registration_status ?? "",
          legaldocs: data.legaldocs ?? "",
          schedules: data.schedules ?? "",
        });
      } catch (error) {
        console.error("Failed to fetch boat details:", error);
      }
    }

    getBoatDetails();
    fetchAdminSession();
  }, [boatId]);

  async function approveBoat() {
    const res = await apiFetch(
      `https://boatfinder.onrender.com/admin/confirmboatregistration/${boatId}`,
      { method: "PATCH", credentials: "include" }
    );
    if (!res.ok) throw new Error("Failed to verify boat");
    alert("Boat verified successfully!");
    navigate("/admindashboard");
  }

  async function rejectBoat() {
    const res = await apiFetch(
      `https://boatfinder.onrender.com/admin/rejectboatregistration/${boatId}`,
      { method: "PATCH", credentials: "include" }
    );
    if (!res.ok) throw new Error("Failed to reject boat");
    alert("Boat rejected successfully!");
    navigate("/admindashboard");
  }

  const scheduleList = parseSchedules(boatDetails.schedules);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">

      {/* Verify Modal */}
      {verifyModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-2xl max-w-md w-full p-8 relative border border-blue-200 mx-3 sm:mx-0">
            <button onClick={() => setVerifyModalOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-blue-100 rounded-lg transition-colors">
              <X className="w-6 h-6 text-blue-600" />
            </button>
            <h3 className="text-2xl font-bold text-blue-900 mb-2">Verify Boat?</h3>
            <p className="text-blue-700 mb-6">Are you sure you want to verify this boat? This action cannot be undone.</p>
            <div className="bg-blue-100 p-4 rounded-lg mb-6 border border-blue-300">
              <p className="text-sm text-blue-700 font-semibold mb-1">Boat ID</p>
              <p className="font-semibold text-blue-900">#{boatDetails.boatid}</p>
              <p className="text-sm text-blue-700 font-semibold mt-3 mb-1">Boat Name</p>
              <p className="font-semibold text-blue-900">{boatDetails.boatName}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => approveBoat().then(() => setVerifyModalOpen(false)).catch(() => setVerifyModalOpen(false))}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-md"
              >
                Confirm
              </button>
              <button onClick={() => setVerifyModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-lg font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-2xl max-w-md w-full p-8 relative border border-blue-200 mx-3 sm:mx-0">
            <button onClick={() => setRejectModalOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-blue-100 rounded-lg transition-colors">
              <X className="w-6 h-6 text-blue-600" />
            </button>
            <h3 className="text-2xl font-bold text-blue-900 mb-2">Reject Boat?</h3>
            <p className="text-blue-700 mb-6">Are you sure you want to reject this boat? This action cannot be undone.</p>
            <div className="bg-blue-100 p-4 rounded-lg mb-6 border border-blue-300">
              <p className="text-sm text-blue-700 font-semibold mb-1">Boat ID</p>
              <p className="font-semibold text-blue-900">#{boatDetails.boatid}</p>
              <p className="text-sm text-blue-700 font-semibold mt-3 mb-1">Boat Name</p>
              <p className="font-semibold text-blue-900">{boatDetails.boatName}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => rejectBoat().then(() => setRejectModalOpen(false)).catch(() => setRejectModalOpen(false))}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-md"
              >
                Confirm
              </button>
              <button onClick={() => setRejectModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-lg font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-blue-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-lg">
              <Ship className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Boat Registration Verification</h1>
              <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Review and approve boat registrations and vessel details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-12">

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-10">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-blue-600">
            <div className="flex items-start gap-3 mb-3">
              <Info className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-1" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Verification Guidelines</h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              Carefully review all boat details. Verify that vessel information, operator details, and operational routes meet safety and regulatory requirements.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-green-600">
            <div className="flex items-start gap-3 mb-3">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0 mt-1" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">What to Verify</h3>
            </div>
            <ul className="text-gray-700 text-sm space-y-2">
              <li className="flex gap-2"><span>•</span> Vessel details accuracy</li>
              <li className="flex gap-2"><span>•</span> Operator registration valid</li>
              <li className="flex gap-2"><span>•</span> Route and schedule details</li>
              <li className="flex gap-2"><span>•</span> Capacity and safety compliance</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-red-600">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0 mt-1" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Important</h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              Verification enables booking availability. Rejection requires resubmission with corrections. Keep detailed records of all decisions.
            </p>
          </div>
        </div>

        {/* Boat Details */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 sm:px-8 py-5 sm:py-6">
            <h2 className="text-xl sm:text-2xl font-bold">Boat Details for Review</h2>
            <p className="text-blue-100 mt-1 sm:mt-2 text-sm sm:text-base">Complete information required for verification and approval</p>
          </div>

          <div className="p-5 sm:p-8">

            {/* Vessel Information */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Ship className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Vessel Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Boat Name</label>
                  <p className="mt-1 text-gray-900 font-medium">{boatDetails.boatName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Vessel Type</label>
                  <p className="mt-1 text-gray-900 font-medium">{boatDetails.vesselType}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Passenger Capacity
                  </label>
                  <p className="mt-1 text-gray-900 font-medium">{boatDetails.capacityInformation}</p>
                </div>
              </div>
            </div>

            {/* Schedules */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Schedules</h3>
              </div>

              {scheduleList.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No schedules provided.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {scheduleList.map((schedule, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3"
                    >
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </div>
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-blue-600 w-20 flex-shrink-0">Departure</span>
                          <span className="text-sm font-medium text-gray-900 truncate">{schedule.departureTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-green-600 w-20 flex-shrink-0">Arrival</span>
                          <span className="text-sm font-medium text-gray-900 truncate">{schedule.arrivalTime}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Legal Documents */}
            {boatDetails.legaldocs && (
              <div className="mb-8 pb-8 border-b border-gray-200">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  Legal Documents
                </h3>
                <div className="mb-4 border-2 border-blue-200 rounded-lg overflow-hidden">
                  {boatDetails.legaldocs.endsWith(".pdf") ? (
                    <iframe src={boatDetails.legaldocs} className="w-full" style={{ height: "600px" }} title="Legal Document Preview" />
                  ) : (
                    <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(boatDetails.legaldocs)}&embedded=true`} className="w-full" style={{ height: "600px" }} title="Legal Document Preview" />
                  )}
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-2 border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-100 p-2 rounded-lg">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 max-w-[180px] truncate">
                        {boatDetails.legaldocs.split("/").pop()}
                      </p>
                      <p className="text-xs text-gray-500">PDF / DOC file</p>
                    </div>
                  </div>
                  <a
                    href={boatDetails.legaldocs}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </div>
              </div>
            )}

            {/* Operator & Company */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                Operator & Company
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Operator Name</label>
                  <p className="mt-1 text-gray-900 font-medium">{boatDetails.operatorName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Company Name</label>
                  <p className="mt-1 text-gray-900 font-medium">{boatDetails.companyName}</p>
                </div>
              </div>
            </div>

            {/* Route Information */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                Route Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Route From
                  </label>
                  <p className="mt-1 text-gray-900 font-medium">{boatDetails.routeFrom}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Route To
                  </label>
                  <p className="mt-1 text-gray-900 font-medium">{boatDetails.routeTo}</p>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                Pricing
              </h3>
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  Ticket Price
                </label>
                <p className="mt-1 text-gray-900 font-medium">₱{boatDetails.ticketPrice}</p>
              </div>
            </div>

            {/* Action Buttons */}
            {boatDetails.registrationStatus !== "verified" && (
              <div className="bg-blue-50 px-0 py-6 flex flex-col sm:flex-row gap-3 justify-end border-t border-blue-200">
                <button
                  onClick={() => setRejectModalOpen(true)}
                  className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white gap-2 px-6 py-2.5 rounded-lg flex items-center justify-center font-semibold transition text-sm sm:text-base"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => setVerifyModalOpen(true)}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6 py-2.5 rounded-lg flex items-center justify-center font-semibold transition text-sm sm:text-base"
                >
                  <Check className="w-4 h-4" />
                  Verify
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Verification Process Footer */}
        <div className="mt-6 sm:mt-10 bg-blue-50 rounded-lg p-5 sm:p-8 border border-blue-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Verification Process</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              { step: 1, title: "Review Details", desc: "Examine all boat and operator information thoroughly" },
              { step: 2, title: "Verify Compliance", desc: "Confirm all safety and regulatory requirements are met" },
              { step: 3, title: "Make Decision", desc: "Click Verify or Reject to complete process" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-blue-600 text-white font-bold text-sm">
                    {step}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">{title}</p>
                  <p className="text-gray-700 text-sm mt-1">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}