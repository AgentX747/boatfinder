import { Loader } from 'lucide-react'
import Boat from '../assets/Boat.jpg'
import {useState } from 'react'
import { useNavigate } from 'react-router-dom'


export default function LoginPage() {
  const [loading , setLoading] = useState(false);
  const navigate = useNavigate();
 
 
 

  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  })


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value
      
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  setLoading(true); // 🔥 start loading

  // ⏱ timeout if request takes more than 10s
  const timeout = setTimeout(() => {
    setLoading(false);
    alert("Login failed. Try again later.");
  }, 10000);

  try {
    const res = await fetch("https://boatfinder.onrender.com/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginForm),
      credentials: "include",
    });

    clearTimeout(timeout); // ✅ clear timeout if response comes back

    const data = await res.json();

    if (res.ok) {
      if (data.message === "Boat operator not yet verified") {
        setLoading(false);
        alert(data.message);
        return;
      }

      alert("Login successful!");

      const role = data.user?.role?.toLowerCase();

      if (role === "user") {
        navigate("/userdashboard");
      } else if (role === "boatoperator") {
        navigate("/boatoperatordashboard");
      } else if (role === "admin") {
        navigate("/admindashboard");
      } else {
        alert("Unknown role: " + role);
      }
    } else {
      setLoading(false);
      alert("Login failed: " + data.message);
    }
  } catch (error) {
    clearTimeout(timeout);
    setLoading(false);
    console.error("Login error:", error);
    alert("Login error occurred");
  }
};

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row">
          {/* Left Side - Boat Image */}
          <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden">
            <img src = {Boat} alt="Boat" className="object-cover w-full h-full" />
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full lg:w-3/5 flex items-center justify-center px-8 py-12 lg:px-16">
            <div className="w-full max-w-md">
              {/* Header */}
              <div className="mb-10">
                <h1 className="text-5xl font-bold text-gray-900 mb-3">Login</h1>
                <p className="text-lg text-gray-500">Access your account securely</p>
              </div>

              {/* Login Form - Visual Design Only */}
              <form className = "mb-6" onSubmit ={handleSubmit}>
              <div className="space-y-6">
                {/* Username Field */}
                <div className="space-y-3">
                  <label className="block text-2xl font-semibold text-gray-900">Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter your username"
                      
                      className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 "
                      onChange ={handleChange}
                      name = "username"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-3">
                  <label className="block text-2xl font-semibold text-gray-900">Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="Enter your password"
                      
                      className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 "
                      onChange ={handleChange}
                      name = "password"
                    />
                  </div>
                </div>

            

                {/* Submit Button */}
                <button
  type="submit"
  disabled={loading}
  className={`w-full text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 shadow-lg text-lg mt-8 ${
    loading
      ? "bg-gray-400 cursor-not-allowed"
      : "bg-gradient-to-r from-blue-600 to-blue-500"
  }`}
>
  {loading ? (
    <span className="flex items-center justify-center gap-2">
      <Loader className="animate-spin" size={20} />
      Logging in...
    </span>
  ) : (
    "Sign In"
  )}
</button>
                
              </div>
              </form>


              {/* Sign Up Link */}
              <p className="text-center text-gray-600 mt-8 text-base">
                Don't have an account?{" "}
                <a href="/register" className="text-blue-600 hover:text-blue-700 font-semibold"
                onClick={() => navigate("/register")}>
                  Sign up here
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
