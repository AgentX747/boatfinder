import { useState , useEffect } from "react"
import { useNavigate } from "react-router-dom";

interface BoatOperatorSession {
    boatOperatorId: string;
    firstName:  string;
    lastName: string;
    role ?: string;
}
interface BoatForm {
  boatName: string;
  vesselType: string;
  capacityInformation: string;
  legalDocs: File | null;
  routeFrom: string;
  routeTo: string;
  schedules: { departureTime: string; arrivalTime: string }[]; // ← replaces the two fields
  ticketPrice: string;
  boatImage: File | null;
}
export default function AddBoat(){

    const navigate = useNavigate();
    const [boatOperatorLoggedIn, setBoatOperatorLoggedIn] = useState<BoatOperatorSession>({
    boatOperatorId: "",
    firstName: "",
    lastName: "",
    role : ""
         })
         const[boatForm, setBoatForm] = useState<BoatForm>({
            boatName:"",
            vesselType:"",
            capacityInformation:"",
            legalDocs: null,
            routeFrom :"",
              routeTo :"",
           schedules: [{ departureTime: "", arrivalTime: "" }], // ← s
            ticketPrice:"",
           boatImage : null


         })

         function handleInputChange(
  e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
) {
  const { name, value } = e.target;

  setBoatForm((prev) => ({
    ...prev,
    [name]: value,
  }));
}
async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (file) {
    setBoatForm((prev) => ({
      ...prev,
      boatImage: file,  // ← was "image", must be "boatImage"
    }));
  }
}
function handleScheduleChange(
  index: number,
  field: "departureTime" | "arrivalTime",
  value: string
) {
  setBoatForm((prev) => {
    const updated = [...prev.schedules];
    updated[index] = { ...updated[index], [field]: value };
    return { ...prev, schedules: updated };
  });
}

function addSchedule() {
  setBoatForm((prev) => ({
    ...prev,
    schedules: [...prev.schedules, { departureTime: "", arrivalTime: "" }],
  }));
}

function removeSchedule(index: number) {
  setBoatForm((prev) => ({
    ...prev,
    schedules: prev.schedules.filter((_, i) => i !== index),
  }));
}
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  try {
    const formData = new FormData();
    formData.append("boatName", boatForm.boatName);
    formData.append("vesselType", boatForm.vesselType);
    formData.append("capacityInformation", boatForm.capacityInformation);
    formData.append("routeFrom", boatForm.routeFrom);
    formData.append("routeTo", boatForm.routeTo);
        formData.append("schedules", JSON.stringify(boatForm.schedules)); 
   
    formData.append("ticketPrice", boatForm.ticketPrice);
    

    
if (boatForm.boatImage) {
  formData.append("boatImage", boatForm.boatImage);  // ← was "image", must be "boatImage"
}
    if (boatForm.legalDocs) {
      formData.append("legaldocs", boatForm.legalDocs); // key matches upload.single("legaldocs")
    }

    const res = await fetch("http://localhost:3000/boatoperator/addboat", {
      method: "POST",
      credentials: "include",
      // ❌ No Content-Type header — browser sets multipart/form-data boundary automatically
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to add boat");

    alert("Boat added successfully! Wait for admin approval.");
    navigate("/boatoperatordashboard");
  } catch (err: any) {
    alert(err.message);
  }
}

async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (file) {
    setBoatForm((prev) => ({
      ...prev,
      legalDocs: file,
    }));
  }
}


   useEffect(() => {
  async function fetchBoatOperatorSession() {
    try {
      const res = await fetch(
        "http://localhost:3000/boatoperator/boatoperatorsession", 
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!res.ok) {
        navigate("/login");
        return;
      }

      const data = await res.json();

      setBoatOperatorLoggedIn({
        boatOperatorId: data.operatorId,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      });

    } catch (err) {
      console.error("Session fetch error:", err);
      navigate("/login");
    }
  }

  fetchBoatOperatorSession(); 
}, [navigate]);
 const timeSlots = [
    "12:00 AM", "1:00 AM", "2:00 AM", "3:00 AM", "4:00 AM", "5:00 AM",
    "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
    "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM"
  ];


    return(
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <header className="bg-blue-500 text-white py-8 px-6 shadow-lg">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-4xl font-bold mb-3">Boat Management System</h1>
                    <p className="text-blue-100 text-lg">Manage your fleet with ease and efficiency</p>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 py-12 px-6">
                <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Add Boat Information</h2>
                    <p className="text-gray-600 mb-8">Enter boat details below to add a new vessel to your fleet</p>

                    <form onSubmit={handleSubmit} encType="multipart/form-data">
                        <div className="mb-6">
                            <label htmlFor="boat_name" className="block text-sm font-semibold text-gray-700 mb-2">Boat Name *</label>
                            <input 
                                type="text" 
                                id="boat_name" 
                                name="boatName" 
                                required 
                                placeholder="Enter boat name"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                                value={boatForm.boatName}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="mb-6">
                            <label htmlFor="vessel_type" className="block text-sm font-semibold text-gray-700 mb-2">Vessel Type *</label>
                            <select 
                                id="vessel_type" 
                                name="vesselType" 
                                required
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                                value={boatForm.vesselType}
                                onChange={handleInputChange}
                            >
                                <option value="" >Select vessel type</option>
                                <option value="Pump Boat">Pump Boat</option>
                                <option value="Ferry">Ferry</option>
                                <option value="Speedboat">Speedboat</option>
                                <option value="Cargo Vessel">Cargo Vessel</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="mb-6">
                            <label htmlFor="capacity_information" className="block text-sm font-semibold text-gray-700 mb-2">Seating Capacity *</label>
                            <input 
                                type="number" 
                                id="capacity_information" 
                                name="capacityInformation" 
                                required 
                                placeholder="Enter seating capacity" 
                                min="1"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                                value={boatForm.capacityInformation}
                                onChange={handleInputChange}
                            />
                        </div>
                       {/* Route From */}
<div className="mb-6">
  <label htmlFor="routeFrom" className="block text-sm font-semibold text-gray-700 mb-2">
    Route From
  </label>
  <input 
    type="text" 
    id="routeFrom" 
    name="routeFrom" 
    required
    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
    value={boatForm.routeFrom}
    onChange={handleInputChange}
  />
</div>

{/* Route To */}
<div className="mb-6">
  <label htmlFor="routeTo" className="block text-sm font-semibold text-gray-700 mb-2">
    Route To
  </label>
  <input 
    type="text" 
    id="routeTo" 
    name="routeTo" 
    required
    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
    value={boatForm.routeTo}
    onChange={handleInputChange}
  />
</div>
<div className="mb-6">
  <div className="flex items-center justify-between mb-3">
    <label className="block text-sm font-semibold text-gray-700">
      Schedules *
    </label>
    <button
      type="button"
      onClick={addSchedule}
      className="text-sm bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition"
    >
      + Add Schedule
    </button>
  </div>

  {boatForm.schedules.map((slot, index) => (
    <div
      key={index}
      className="flex gap-3 items-center mb-3 p-3 border-2 border-gray-200 rounded-lg bg-gray-50"
    >
      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-1">Departure</label>
        <select
          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
          value={slot.departureTime}
          onChange={(e) => handleScheduleChange(index, "departureTime", e.target.value)}
          required
        >
          <option value="">Select time</option>
          {timeSlots.map((time, i) => (
            <option key={`dep-${i}`} value={time}>{time}</option>
          ))}
        </select>
      </div>

      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-1">Arrival</label>
        <select
          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
          value={slot.arrivalTime}
          onChange={(e) => handleScheduleChange(index, "arrivalTime", e.target.value)}
          required
        >
          <option value="">Select time</option>
          {timeSlots.map((time, i) => (
            <option key={`arr-${i}`} value={time}>{time}</option>
          ))}
        </select>
      </div>

      {boatForm.schedules.length > 1 && (
        <button
          type="button"
          onClick={() => removeSchedule(index)}
          className="mt-4 text-red-400 hover:text-red-600 text-lg font-bold transition"
          title="Remove"
        >
          ✕
        </button>
      )}
    </div>
  ))}
</div>
                        {/* Boat Image — UI only, no functionality */}
                        <div className="mb-6">
                            <label htmlFor="boatImage" className="block text-sm font-semibold text-gray-700 mb-2">Boat Image</label>
                            <input 
                                type="file" 
                                id="boatImage" 
                                name="boatImage" 
                                accept="image/*"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition cursor-pointer"
                                onChange={handleImageChange}
                            />
                            <p className="text-sm text-gray-500 mt-2">Accepted formats: JPG, PNG, WEBP</p>
                        </div>

                        <div className="mb-6">
                            <label htmlFor="legaldocs" className="block text-sm font-semibold text-gray-700 mb-2">Legal Documents</label>
                            <input 
                                type="file" 
                                id="legaldocs" 
                                name="legaldocs" 
                                accept=".pdf,.doc,.docx" 
                                multiple
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition cursor-pointer"
                                onChange={handleFileChange}
                            />
                            <p className="text-sm text-gray-500 mt-2">Accepted formats: PDF, DOC, DOCX</p>
                        </div>

                        <div className="mb-6">
                            <label htmlFor="ticket_price" className="block text-sm font-semibold text-gray-700 mb-2">Standard Base Ticket Price *</label>
                            <input 
                                type="number" 
                                id="ticket_price" 
                                name="ticketPrice" 
                                required 
                                placeholder="Enter ticket price" 
                                min="0" 
                                step="0.01"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                                value={boatForm.ticketPrice}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button 
                                type="submit" 
                                className="flex-1 bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-600 transition"
                            >
                                Apply
                            </button>
                            <button 
                                type="button" 
                                className="flex-1 bg-gray-100 text-gray-600 font-semibold py-3 px-6 rounded-lg hover:bg-gray-200 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-800 text-white py-6 px-6">
                <div className="max-w-6xl mx-auto text-center">
                    <p className="text-gray-400 mb-2">© 2026 Boat Management System. All rights reserved.</p>
                    <p className="text-sm text-gray-500">Streamlining maritime operations for a better tomorrow</p>
                </div>
            </footer>
        </div>
    )
}