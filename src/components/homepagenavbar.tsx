"use client"
import { useNavigate } from "react-router-dom"

export default function HomePageNavbar() {
  const navigate = useNavigate()
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-blue-600/80 border-b border-blue-300/30 px-6 py-4 w-full h-19">
      <div className="flex items-center justify-between">
        
        {/* Left side - Title */}
        <h1
          className="text-3xl font-semibold tracking-wide text-white"
          style={{ fontFamily: "serif" }}
        >
          BoatFinder
        </h1>

        {/* Right side - Buttons */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            className="text-white font-medium text-lg transition-all duration-300 hover:scale-110 hover:drop-shadow-lg"
            onClick = {() => navigate("/login")}
          >
            Login
          </button>

          <button
            type="button"
            className="text-white font-medium text-lg transition-all duration-300 hover:scale-110 hover:drop-shadow-lg"
            onClick = {() => navigate("/register")}
          >
            Register
          </button>
          

          <button
            type="button"
            className="text-white font-medium text-lg transition-all duration-300 hover:scale-110 hover:drop-shadow-lg"
            onClick = {() => navigate("/about")}
          >
            About Us
          </button>
        </div>
      </div>
    </nav>
  )
}
