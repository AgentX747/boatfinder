'use client';

import { ChevronLeft } from 'lucide-react';
import {  useEffect , useState  } from 'react';
import { useNavigate , useParams } from 'react-router-dom';
import { apiFetch } from '../../utils/apifetch';



export default function EditTicketPrice() {
    const navigate = useNavigate();
    const { boatID } = useParams();
    const [boatDetails, setBoatDetails] = useState<any>({
        boatName: '',
        vesselType: '',
        currentPrice: 0,
    });


const [ticketPrice, setTicketPrice] = useState<string>("");  // 👈 use string, not number
    useEffect(() =>{
         async function fetchOperatorAndBoats() {
            try {
              // 1️⃣ Fetch operator session
              const sessionRes = await apiFetch("http://localhost:3000/boatoperator/boatoperatorsession", {
                method: "GET",
                credentials: "include",
              });
        
              if (!sessionRes.ok) {
                console.error("Failed to fetch boat operator session");
                navigate("/login");
                return; // stop further execution
              }
            }catch (error) {
              console.error("Error fetching boat operator session:", error);
              navigate("/login");
            }
            }
            async function fetchBoatDetails() {
               const res = await apiFetch(`http://localhost:3000/boatoperator/editticketprice/${boatID}`, {
                method: "GET",
                credentials: "include",
              });
              if (res.ok) {
                const data = await res.json();
                setBoatDetails({
                    boatName: data.boat_name,
                    vesselType: data.vessel_type,
                    currentPrice: data.ticket_price,
                });
              } else {
                console.error("Failed to fetch boat details");
              }
            }


            fetchBoatDetails()
            fetchOperatorAndBoats();
    }, [navigate]);

 

        
             
        
function handleInputChange(
  e: React.ChangeEvent<HTMLInputElement>
) {
  const value = e.target.value;

  if (Number(value) >= 0 || value === "") {
    setTicketPrice(value); // ✅ store string
  }
}
async function confirmPriceChange() {
  try {
    const res = await apiFetch(
      `http://localhost:3000/boatoperator/confirmeditticketprice/${boatID}`,
      {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
 newPrice: Number(ticketPrice)
}),
      }
    );

    if (!res.ok) {
      throw new Error("Failed to update price");
    }else{
        alert("Ticket price updated successfully!");
        navigate("/boatoperatordashboard");
    }

    const data = await res.json();
    console.log(data);

  } catch (error) {
    console.error("Error updating ticket price:", error);
  }
}


  
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <button className="p-2 hover:bg-blue-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-blue-600" />
          </button>
          <h1 className="text-3xl font-bold text-blue-900">Edit Ticket Price</h1>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-blue-100">
          {/* Display Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-8 border-b border-blue-100">
            {/* Boat Name Display */}
            <div>
              <p className="text-sm font-semibold text-blue-600 mb-2">Boat Name</p>
              <p className="text-lg font-semibold text-blue-900">{boatDetails.boatName}</p>
            </div>

            {/* Vessel Type Display */}
            <div>
              <p className="text-sm font-semibold text-blue-600 mb-2">Vessel Type</p>
              <p className="text-lg font-semibold text-blue-900">{boatDetails.vesselType}</p>
            </div>
          </div>

          {/* Price Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Current Price Display */}
            <div>
              <label className="block text-sm font-semibold text-blue-600 mb-3">
                Current Price
              </label>
              <div className="px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-lg h-12 flex items-center">
                <p className="text-xl font-bold text-blue-900">${boatDetails.currentPrice}</p>
              </div>
            </div>

            {/* New Price Field */}
            <div>
              <label htmlFor="newPrice" className="block text-sm font-semibold text-blue-900 mb-3">
                New Price
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 font-semibold text-lg">
                  $
                </span>
                <input
                  id="newPrice"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                   value={ticketPrice}
  onChange={handleInputChange}
                  className="w-full pl-8 pr-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all text-blue-900 placeholder-blue-400"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            onClick ={confirmPriceChange}>
              Save Changes
            </button>
            <button className="flex-1 px-6 py-3 border-2 border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold rounded-lg transition-colors duration-200">
              Cancel
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <p className="text-sm text-blue-700 mt-6 text-center">
          Changes will be applied immediately. Make sure all information is correct before saving.
        </p>
      </div>
    </main>
  );
}
