import { Upload, ChevronLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/apifetch';

interface RefundDetail {
  request_id: number;
  ticketcode: string;
  operator_id: number;
  fk_refund_userId: number;
  imageproof: string | null;
  message: string;
  status: string;
  passengerName: string;
  operatorName: string;
}

export default function ManageRefundsPage() {
  const navigate = useNavigate();
  const { refundId } = useParams();
  const [refund, setRefund] = useState<RefundDetail | null>(null);
  const [operatorreply, setOperatorreply] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const sessionRes = await apiFetch("https://boatfinder.onrender.com/boatoperator/boatoperatorsession", {
          method: "GET",
          credentials: "include",
        });

        if (!sessionRes.ok) {
          navigate("/login");
          return;
        }

        const response = await apiFetch(`https://boatfinder.onrender.com/boatoperator/getrefunddetails/${refundId}`, {
          method: "GET",
          credentials: "include",
        });

        const data = await response.json();
        setRefund(Array.isArray(data) ? data[0] : data);
      } catch (error) {
        console.error("Error:", error);
        navigate("/login");
      }
    };

    if (refundId) init();
  }, [refundId]);

  const handleSubmit = async () => {
    if (!operatorreply.trim()) {
      alert("Please enter a response before submitting.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("operatorreply", operatorreply);
      if (imageFile) formData.append("refundImage", imageFile);

      const res = await apiFetch(
        `https://boatfinder.onrender.com/boatoperator/confirmrefundreply/${refundId}`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit response");
      }

      alert("Response submitted successfully!");
      navigate(-1);
    } catch (error: any) {
      console.error("Submit error:", error);
      alert(error.message || "Failed to submit response.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
    resolved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Resolved' },
  };
  const statusStyle = statusConfig[refund?.status ?? ''] ?? {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: refund?.status ?? '',
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      {/* Header */}
      <div className="border-b border-blue-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Refunds
          </button>
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Manage Refund Request</h1>
            <p className="text-blue-600 mt-1">Review and respond to user refund requests</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white rounded-lg border border-blue-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-white font-bold text-lg">Request Summary</h2>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-blue-500 font-medium">Request ID</p>
                  <p className="text-slate-900 font-semibold">#{refund?.request_id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-blue-500 font-medium">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                    {statusStyle.label}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-blue-500 font-medium">Passenger</p>
                  <p className="text-slate-900 font-semibold">{refund?.passengerName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-blue-500 font-medium">User ID</p>
                  <p className="text-slate-900 font-semibold">#{refund?.fk_refund_userId}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-blue-500 font-medium">Ticket Code</p>
                  <p className="text-slate-900 font-semibold font-mono bg-blue-50 px-3 py-1 rounded-md inline-block">
                    {refund?.ticketcode}
                  </p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-blue-500 font-medium">Operator</p>
                  <p className="text-slate-900 font-semibold">{refund?.operatorName}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-blue-200 shadow-sm overflow-hidden">
              <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
                <h3 className="text-sm font-semibold text-blue-900">User Message</h3>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-600 leading-relaxed">{refund?.message}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-blue-200 shadow-sm overflow-hidden">
              <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
                <h3 className="text-sm font-semibold text-blue-900">User Proof Image</h3>
              </div>
              <div className="p-6">
                {refund?.imageproof ? (
                  <img
                    src={refund.imageproof}
                    alt="User proof"
                    className="w-full h-48 object-cover rounded-md border border-blue-100"
                  />
                ) : (
                  <div className="bg-blue-50 rounded-md w-full h-48 flex items-center justify-center border border-blue-200">
                    <p className="text-sm text-blue-400">No proof image submitted</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Operator Response */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-blue-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-white font-bold text-lg">Operator Response</h2>
                <p className="text-blue-200 text-sm mt-0.5">Provide your reply and optional proof below</p>
              </div>
              <div className="p-6 space-y-6">

                {/* Operator Reply Textarea */}
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">Your Response</label>
                  <textarea
                    value={operatorreply}
                    onChange={(e) => setOperatorreply(e.target.value)}
                    placeholder="Enter your response to the user's refund request..."
                    className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400 resize-none bg-blue-50"
                    rows={6}
                  />
                  <p className="text-xs text-blue-400 mt-2">Provide a detailed response regarding the refund decision</p>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Proof Image <span className="text-blue-400 font-normal">(Optional)</span>
                  </label>
                  <label className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer block">
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      className="hidden"
                      onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    />
                    <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    {imageFile ? (
                      <p className="text-sm font-medium text-blue-700">{imageFile.name}</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-blue-900">Drag and drop your image here</p>
                        <p className="text-xs text-blue-400 mt-1">or click to browse (PNG, JPG up to 5MB)</p>
                      </>
                    )}
                  </label>
                </div>

                <div className="border-t border-blue-100" />

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(-1)}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 border border-blue-300 text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Response'}
                  </button>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}