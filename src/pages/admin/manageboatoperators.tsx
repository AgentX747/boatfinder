import {useState , useEffect} from "react";
import { apiFetch } from "../../utils/apifetch";
import { useNavigate , useParams } from "react-router-dom";
import {
  Shield,
  AlertCircle,
  CheckCircle2,
  Info,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Check,
  X,
} from 'lucide-react';
interface BoatDetails {
    operatorId: string | number;
    companyId: string;
    companyName: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    address: string;
   gender: string;
   birthdate: string;
   registrationStatus: string;
}
export default function ManageBoatOperatorsPage() {
  const navigate = useNavigate();
  const { boatoperatorid } = useParams();
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [operatorDetails, setOperatorDetails] = useState<BoatDetails>({
  operatorId: boatoperatorid ?? '',
       companyId: '',
       companyName: '',
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      address: '',
      gender: '',
      birthdate: '',
      registrationStatus: '',
    });
    useEffect(() => {
       async function fetchAdminSession() {
          try {
            const res = await apiFetch(
              "https://boatfinder.onrender.com/admin/adminsession",
              {
                method: "GET",
                credentials: "include",
              }
            );
            if (res.status === 401 || res.status === 403) {
              navigate("/login");
              return;
            }
            if (!res.ok) {
              throw new Error("Failed to fetch admin session");
            }
          } catch (error) {
            console.error("Session fetch error:", error);
            navigate("/login");
          }
        }async function getBoatOperatorDetails() {
    try {
      const res = await apiFetch(`https://boatfinder.onrender.com/admin/getboatoperatorsbyid/${boatoperatorid}`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch boat operators");
      const data = await res.json();
      setOperatorDetails({
        operatorId: data.operator_id,
        companyId: data.companyId,
        companyName: data.companyName,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phone_number,
        address: data.address,
        gender: data.gender,
        birthdate: data.birthdate ?? '',
        registrationStatus: data.registration_status ?? '',
      });
    } catch (error) {
      console.error("Failed to fetch boat operators:", error);
    }
  }
        getBoatOperatorDetails()
        fetchAdminSession()
    },[boatoperatorid])
      
  async function approveOperator() {
    const res = await apiFetch(`https://boatfinder.onrender.com/admin/verifyboatoperator/${boatoperatorid}`, {
      method: "PATCH",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to verify boat operator");
    alert("Operator verified successfully!");
    navigate("/admindashboard");
  }

  async function rejectOperator() {
    const res = await apiFetch(`https://boatfinder.onrender.com/admin/rejectboatoperator/${boatoperatorid}`, {
      method: "PATCH",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to reject boat operator");
    navigate("/admindashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">

      {/* Verify Modal */}
      {verifyModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-2xl max-w-md w-full p-8 relative border border-blue-200">
            <button
              onClick={() => setVerifyModalOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-blue-600" />
            </button>
            <h3 className="text-2xl font-bold text-blue-900 mb-2">Verify Operator?</h3>
            <p className="text-blue-700 mb-6">Are you sure you want to verify this operator? This action cannot be undone.</p>
            <div className="bg-blue-100 p-4 rounded-lg mb-6 border border-blue-300">
              <p className="text-sm text-blue-700 font-semibold mb-1">Operator ID</p>
              <p className="font-semibold text-blue-900">#{operatorDetails.operatorId}</p>
              <p className="text-sm text-blue-700 font-semibold mt-3 mb-1">Operator Name</p>
              <p className="font-semibold text-blue-900">{operatorDetails.firstName} {operatorDetails.lastName}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  approveOperator()
                    .then(() => {
                      setVerifyModalOpen(false);
                    })
                    .catch((err) => {
                      console.error("Error verifying operator:", err);
                      setVerifyModalOpen(false);
                    });
                }}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-md"
              >
                Confirm
              </button>
              <button
                onClick={() => setVerifyModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
     {rejectModalOpen && (
  <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50">
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-2xl max-w-md w-full p-8 relative border border-blue-200">
      <button
        onClick={() => setRejectModalOpen(false)}
        className="absolute top-4 right-4 p-1 hover:bg-blue-100 rounded-lg transition-colors"
      >
        <X className="w-6 h-6 text-blue-600" />
      </button>
      <h3 className="text-2xl font-bold text-blue-900 mb-2">Reject Operator?</h3>
      <p className="text-blue-700 mb-6">Are you sure you want to reject this operator? This action cannot be undone.</p>
      <div className="bg-blue-100 p-4 rounded-lg mb-6 border border-blue-300">
        <p className="text-sm text-blue-700 font-semibold mb-1">Operator ID</p>
        <p className="font-semibold text-blue-900">#{operatorDetails.operatorId}</p>
        <p className="text-sm text-blue-700 font-semibold mt-3 mb-1">Operator Name</p>
        <p className="font-semibold text-blue-900">{operatorDetails.firstName} {operatorDetails.lastName}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => {
            rejectOperator()
              .then(() => setRejectModalOpen(false))
              .catch((err) => {
                console.error("Error rejecting operator:", err);
                setRejectModalOpen(false);
              });
          }}
          className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-md"
        >
          Confirm
        </button>
        <button
          onClick={() => setRejectModalOpen(false)}
          className="flex-1 px-4 py-2.5 rounded-lg font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

      {/* Header Section */}
      <div className="bg-white border-b border-blue-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Boat Operator Verification</h1>
              <p className="text-gray-600 mt-2">Review and approve marine operator credentials</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Guidelines Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
            <div className="flex items-start gap-3 mb-3">
              <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <h3 className="text-lg font-semibold text-gray-900">Verification Guidelines</h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              Carefully review all operator details. Verify that personal and company information match official documentation and safety requirements.
            </p>
          </div>

          {/* Compliance Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600">
            <div className="flex items-start gap-3 mb-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <h3 className="text-lg font-semibold text-gray-900">What to Verify</h3>
            </div>
            <ul className="text-gray-700 text-sm space-y-2">
              <li className="flex gap-2"><span>•</span> Company registration validity</li>
              <li className="flex gap-2"><span>•</span> Complete personal information</li>
              <li className="flex gap-2"><span>•</span> Valid contact details</li>
              <li className="flex gap-2"><span>•</span> Required certifications</li>
            </ul>
          </div>

          {/* Important Notice Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-600">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <h3 className="text-lg font-semibold text-gray-900">Important</h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              Verification grants platform access. Rejection requires resubmission with corrections. Document all decisions.
            </p>
          </div>
        </div>

        {/* Operator Details Section */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6">
            <h2 className="text-2xl font-bold">Operator Details for Review</h2>
            <p className="text-blue-100 mt-2">Complete information required for verification and approval</p>
          </div>

          {/* Operator Form Content */}
          <div className="p-8">
            {/* Company Section */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Company Information</h3>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600">Company Name</p>
                <p className="text-2xl font-bold text-blue-600">{operatorDetails.companyName}</p>
              </div>
            </div>

            {/* Personal Details Section */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                Personal Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">First Name</label>
                  <p className="mt-1 text-gray-900 font-medium">{operatorDetails.firstName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Name</label>
                  <p className="mt-1 text-gray-900 font-medium">{operatorDetails.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Gender</label>
                  <p className="mt-1 text-gray-900 font-medium">{operatorDetails.gender}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <p className="text-gray-900 font-medium">{operatorDetails.birthdate}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    Email
                  </label>
                  <p className="mt-1 text-gray-900 font-medium">{operatorDetails.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-600" />
                    Phone Number
                  </label>
                  <p className="mt-1 text-gray-900 font-medium">{operatorDetails.phoneNumber}</p>
                </div>
              </div>
            </div>

            {/* Additional Information Section */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                Additional Information
              </h3>
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Address
                </label>
                <p className="text-gray-900 font-medium">{operatorDetails.address}</p>
              </div>
            </div>

            {/* Action Buttons */}
            {operatorDetails.registrationStatus !== 'verified' && (
              <div className="bg-blue-50 px-0 py-6 flex gap-4 justify-end border-t border-blue-200">
                <button
                  onClick={() => setRejectModalOpen(true)}
                  className="bg-red-500 hover:bg-red-600 text-white gap-2 px-6 py-2 rounded-lg flex items-center font-semibold transition">
                  <X className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => setVerifyModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6 py-2 rounded-lg flex items-center font-semibold transition">
                  <Check className="w-4 h-4" />
                  Verify
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Instructions Footer */}
        <div className="mt-10 bg-blue-50 rounded-lg p-8 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Process</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-600 text-white font-bold">1</div>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Review Details</p>
                <p className="text-gray-700 text-sm mt-1">Examine all operator information thoroughly</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-600 text-white font-bold">2</div>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Verify Documents</p>
                <p className="text-gray-700 text-sm mt-1">Confirm all documentation is valid and complete</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-600 text-white font-bold">3</div>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Make Decision</p>
                <p className="text-gray-700 text-sm mt-1">Click Verify or Reject to complete process</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 
