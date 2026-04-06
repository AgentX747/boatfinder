import { Ship, MapPin, FileText, Image, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/apifetch';

interface Schedule {
  departureTime: string;
  arrivalTime: string;
}

interface BoatForm {
  boatName: string;
  vesselType: string;
  capacityInformation: number;
  status: string;
  routeFrom: string;
  routeTo: string;
  schedules: Schedule[];
  image: File | null;
  legalDocs: File | null;
}

export default function EditBoat() {
  const [editboat, setEditBoat] = useState<BoatForm>({
    boatName: "",
    vesselType: "",
    capacityInformation: 0,
    status: "",
    routeFrom: "",
    routeTo: "",
    schedules: [{ departureTime: "", arrivalTime: "" }],
    image: null,
    legalDocs: null,
  });

  const { boatID } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const sessionRes = await apiFetch(
          "http://localhost:3000/boatoperator/boatoperatorsession",
          { method: "GET", credentials: "include" }
        );
        if (!sessionRes.ok) {
          navigate("/login");
          return;
        }
      } catch (error) {
        navigate("/login");
      }
    };

    const fetchBoatDetails = async () => {
      if (!boatID) return;

      const res = await apiFetch(
        `http://localhost:3000/boatoperator/editboatdetails/${boatID}`,
        { method: "GET", credentials: "include" }
      );

      if (!res.ok) {
        console.error("Failed to fetch boat details");
        return;
      }

      const boatDetails = await res.json();
      const data = boatDetails.data;

      // Parse schedules from JSON if needed
      let parsedSchedules: Schedule[] = [{ departureTime: "", arrivalTime: "" }];
      if (data.schedules) {
        try {
          const raw = typeof data.schedules === "string"
            ? JSON.parse(data.schedules)
            : data.schedules;
          if (Array.isArray(raw) && raw.length > 0) {
            parsedSchedules = raw;
          }
        } catch {
          console.error("Failed to parse schedules");
        }
      }

      setEditBoat({
        boatName: data.boatName ?? "",
        vesselType: data.vesselType ?? "",
        capacityInformation: data.capacityInformation ?? 0,
        status: data.status ?? "",
        routeFrom: data.routeFrom ?? "",
        routeTo: data.routeTo ?? "",
        schedules: parsedSchedules,
        image: null,
        legalDocs: null,
      });
    };

    fetchSession();
    fetchBoatDetails();
  }, [boatID, navigate]);

  const timeSlots = [
    "12:00 AM", "1:00 AM", "2:00 AM", "3:00 AM", "4:00 AM", "5:00 AM",
    "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
    "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM"
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditBoat(prev => ({ ...prev, [name]: value }));
  };

  const handleScheduleChange = (index: number, field: keyof Schedule, value: string) => {
    setEditBoat(prev => {
      const updated = [...prev.schedules];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, schedules: updated };
    });
  };

  const addSchedule = () => {
    setEditBoat(prev => ({
      ...prev,
      schedules: [...prev.schedules, { departureTime: "", arrivalTime: "" }]
    }));
  };

  const removeSchedule = (index: number) => {
    setEditBoat(prev => ({
      ...prev,
      schedules: prev.schedules.filter((_, i) => i !== index)
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setEditBoat(prev => ({ ...prev, image: file }));
  };

  const handleLegalDocsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setEditBoat(prev => ({ ...prev, legalDocs: file }));
  };

  async function confirmEditBoat() {
    try {
      const formData = new FormData();
      formData.append("boatName", editboat.boatName);
      formData.append("vesselType", editboat.vesselType);
      formData.append("capacityInformation", String(editboat.capacityInformation));
      formData.append("status", editboat.status);
      formData.append("routeFrom", editboat.routeFrom);
      formData.append("routeTo", editboat.routeTo);
      formData.append("schedules", JSON.stringify(editboat.schedules)); // ← same as addBoat
      if (editboat.image) formData.append("boatImage", editboat.image);
      if (editboat.legalDocs) formData.append("legaldocs", editboat.legalDocs);

      const response = await apiFetch(
        `http://localhost:3000/boatoperator/confirmeditboat/${boatID}`,
        {
          method: "PUT",
          credentials: "include",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Update failed:", errorData.message);
        return;
      }

      alert("Boat details updated successfully!");
      navigate("/boatoperatordashboard");

    } catch (error) {
      console.error("Network error:", error);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-3">
            <Ship className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Edit Boat Information</h1>
            <p className="text-sm text-slate-600">Manage vessel details, routes, and schedules</p>
          </div>
        </div>

        {/* Form Container */}
        <div className="space-y-6 rounded-xl bg-white p-8 shadow-sm border border-slate-200">

          {/* Basic Information */}
          <div className="space-y-4 pb-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Basic Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Boat Name</label>
                <input
                  type="text"
                  name="boatName"
                  value={editboat.boatName}
                  onChange={handleChange}
                  placeholder="Enter boat name"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-500 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Vessel Type</label>
                <select
                  name="vesselType"
                  value={editboat.vesselType}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select vessel type</option>
                  <option value="ferry">Ferry</option>
                  <option value="catamaran">Catamaran</option>
                  <option value="yacht">Yacht</option>
                  <option value="cargo">Cargo Ship</option>
                  <option value="speedboat">Speedboat</option>
                </select>
              </div>
            </div>
          </div>

          {/* Capacity & Status */}
          <div className="space-y-4 pb-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Capacity & Status</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Capacity Information</label>
                <input
                  type="number"
                  name="capacityInformation"
                  value={editboat.capacityInformation}
                  onChange={handleChange}
                  placeholder="Enter capacity"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-500 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select
                  name="status"
                  value={editboat.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select status</option>
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">On hold</option>
                </select>
              </div>
            </div>
          </div>

          {/* Routes */}
          <div className="space-y-4 pb-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Routes</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <MapPin className="h-4 w-4 text-blue-600" /> Route From
                </label>
                <input
                  type="text"
                  name="routeFrom"
                  value={editboat.routeFrom}
                  onChange={handleChange}
                  placeholder="Departure location"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-500 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <MapPin className="h-4 w-4 text-blue-600" /> Route To
                </label>
                <input
                  type="text"
                  name="routeTo"
                  value={editboat.routeTo}
                  onChange={handleChange}
                  placeholder="Arrival location"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-500 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Schedules */}
          <div className="space-y-4 pb-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Schedules</h2>
              <button
                type="button"
                onClick={addSchedule}
                className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Time Slot
              </button>
            </div>

            <div className="space-y-4">
              {editboat.schedules.map((schedule, index) => (
                <div key={index} className="flex items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex-1 space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Departure Time</label>
                    <select
                      value={schedule.departureTime}
                      onChange={(e) => handleScheduleChange(index, "departureTime", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                    >
                      <option value="">Select departure time</option>
                      {timeSlots.map((time, i) => (
                        <option key={`dep-${i}`} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Arrival Time</label>
                    <select
                      value={schedule.arrivalTime}
                      onChange={(e) => handleScheduleChange(index, "arrivalTime", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                    >
                      <option value="">Select arrival time</option>
                      {timeSlots.map((time, i) => (
                        <option key={`arr-${i}`} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>

                  {editboat.schedules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSchedule(index)}
                      className="mb-0.5 rounded-lg p-2.5 text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Legal Documentation */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Legal Documentation</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <FileText className="h-4 w-4 text-blue-600" /> Legal Documents
                </label>
                <input
                  type="file"
                  onChange={handleLegalDocsChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Image className="h-4 w-4 text-blue-600" /> Boat Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6 border-t border-slate-200 mt-6">
          <button
            className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-200 focus:outline-none"
            onClick={confirmEditBoat}
          >
            Save Changes
          </button>
          <button
            className="flex-1 rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 focus:ring-2 focus:ring-slate-200 focus:outline-none"
            onClick={() => navigate("/boatoperatordashboard")}
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}