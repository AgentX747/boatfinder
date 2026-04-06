import HomePageNavbar from "../components/homepagenavbar"
import HomePageCard from "../cards/homepagecard"  
import OnlineBooking from "../assets/onlinebooking.jpg"
import onlinePayment from "../assets/onlinepayment.jpg"
import TicketBooking from "../assets/ticketbooking.jpg"


export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <HomePageNavbar />
      

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-bold mb-4">Welcome to BoatFinder</h2>
          <p className="text-xl text-blue-100">Find, book, and experience the perfect boat adventure</p>
        </div>
      </section>

      {/* Main Services Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold text-gray-900 mb-12 text-center">Our Services</h3>
         <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-12">Our Services</h1>
        
        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Booking Card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300">
            <div className="w-full h-48 bg-gray-200 overflow-hidden">
              <img 
                src={OnlineBooking} 
                alt="Online Booking"  
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <h4 className="text-xl font-bold text-gray-900 mb-2">Booking</h4>
              <p className="text-gray-600">
                Experience the ultimate in luxury and comfort on our state-of-the-art yachts.
              </p>
            </div>
          </div>

          {/* Ticket Reservation Card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300">
            <div className="w-full h-48 bg-gray-200 overflow-hidden">
              <img 
                src={TicketBooking} 
                alt="Ticket Reservation"  
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <h4 className="text-xl font-bold text-gray-900 mb-2">Ticket Reservation</h4>
              <p className="text-gray-600">
                Feel the thrill of speed and agility with our high-performance speed boats.
              </p>
            </div>
          </div>

          {/* Online Payment Card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300">
            <div className="w-full h-48 bg-gray-200 overflow-hidden">
              <img 
                src={onlinePayment} 
                alt="Online Payment"  
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <h4 className="text-xl font-bold text-gray-900 mb-2">Online Payment</h4>
              <p className="text-gray-600">Enjoy the serenity of sailing with our elegant and efficient sailboats.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
      </section>

      {/* AI Features Section */}
      <section className="bg-gradient-to-b from-white to-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-3xl font-bold text-gray-900 mb-4 text-center">AI-Powered Features</h3>
          <p className="text-gray-600 text-center mb-12 text-lg">
            Smart tools to enhance your boat adventure experience
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Price Fare Prediction Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow border-l-4 border-blue-500">
              <div className="flex items-center mb-4">
                <div className="text-4xl mr-4">💰</div>
                <h4 className="text-2xl font-bold text-gray-900">Price Fare Prediction</h4>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Our advanced AI analyzes market trends and demand patterns to predict optimal booking prices and help
                you save on your next boat rental.
              </p>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                  AI Powered
                </span>
              </div>
            </div>

            {/* Weather Forecasting Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow border-l-4 border-cyan-500">
              <div className="flex items-center mb-4">
                <div className="text-4xl mr-4">🌤️</div>
                <h4 className="text-2xl font-bold text-gray-900">Weather Forecasting</h4>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Get accurate weather predictions for your destination and travel dates. Plan your adventure with
                confidence using real-time climate data.
              </p>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <span className="inline-block px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm font-semibold">
                  AI Powered
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h5 className="font-bold mb-4">BoatFinder</h5>
              <p className="text-gray-400 text-sm">Your trusted platform for boat adventures</p>
            </div>
            <div>
              <h5 className="font-bold mb-4">Services</h5>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>
                  <a href="#" className="hover:text-white transition">
                    Booking
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Reservations
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Payments
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">Company</h5>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>
                  <a href="#" className="hover:text-white transition">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Support
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">Legal</h5>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>
                  <a href="#" className="hover:text-white transition">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2025 BoatFinder. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
