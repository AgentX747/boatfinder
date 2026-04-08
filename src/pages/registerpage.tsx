"use client"

import type React from "react"
import { useState } from "react"
import { User, Mail, Lock, Phone, MapPin, Users, UserCircle, Briefcase, Calendar, ChevronDown } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { handleEmailError, handlePasswordError, handleNumberError } from "../utils/validators"
import BoatLogo from '../assets/BOATLOGO.png'
import { Loader } from 'lucide-react'

interface RegistrationForm {
  firstName: string
  lastName: string
  username: string
  email: string
  password: string
  confirmPassword: string
  companyName?: string
  companyAddress?: string
  companyPhoneNumber?: string
  companyEmail?: string
  phoneNumber: string
  address: string
  birthdate: string
  gender: string
  role: string
  gcashNumber?: string
  gcashName?: string
}

export default function RegistrationPage() {
  const navigate = useNavigate()

  const [passwordError, setPasswordError] = useState<string>()
  const [numberError, setNumberError] = useState<string>()
  const [emailError, setEmailError] = useState<string>()
  const [loading, setLoading] = useState(false)

  const [registerForm, setRegisterForm] = useState<RegistrationForm>({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    address: "",
    birthdate: "",
    companyName: "",
    companyAddress: "",
    companyPhoneNumber: "",
    companyEmail: "",
    gender: "Male",
    role: "User",
    gcashNumber: "",
    gcashName: "",
  })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setRegisterForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let num = value.replace(/\s+/g, "")
    if (num.startsWith("09")) num = "+63" + num.slice(1)
    else if (num.startsWith("639")) num = "+" + num
    if (!/^\+?\d*$/.test(num)) return
    setRegisterForm((prev) => ({ ...prev, [name]: num }))
    setNumberError(handleNumberError(num))
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setRegisterForm((prev) => ({ ...prev, [id]: value }))
    setEmailError(handleEmailError(value))
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setRegisterForm((prev) => ({ ...prev, [id]: value }))
    setPasswordError(handlePasswordError(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const timeout = setTimeout(() => {
      setLoading(false)
      alert("Registration failed. Try again later.")
    }, 10000)

    try {
      const res = await fetch("https://boatfinder.onrender.com/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      })

      clearTimeout(timeout)

      if (res.ok) {
        setLoading(false)
        alert("Registration successful!")
        navigate("/login")
      } else {
        setLoading(false)
        const errorText = await res.text()
        alert("Registration failed: " + errorText)
      }
    } catch (error) {
      clearTimeout(timeout)
      setLoading(false)
      console.error("FETCH ERROR:", error)
      alert("An error occurred. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-10 text-white">
          <div className="flex justify-center mb-6">
            <div className="w-28 h-28 bg-white rounded-full p-4 shadow-xl ring-4 ring-white/20">
              <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold text-4xl">
                <img src={BoatLogo || "/placeholder.svg"} alt="Boat Logo" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Register</h1>
            <p className="text-white/90 text-base">Create your account to get started</p>
          </div>
        </div>

        {/* Form */}
        <div className="px-8 py-8">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">

              {/* First Name & Last Name */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <User className="w-4 h-4 text-blue-600" />
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    name="firstName"
                    placeholder="Enter your first name"
                    value={registerForm.firstName}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <User className="w-4 h-4 text-blue-600" />
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    name="lastName"
                    placeholder="Enter your last name"
                    value={registerForm.lastName}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label htmlFor="username" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <UserCircle className="w-4 h-4 text-blue-600" />
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  placeholder="Choose a username"
                  value={registerForm.username}
                  onChange={handleInputChange}
                  className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Mail className="w-4 h-4 text-blue-600" />
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={registerForm.email}
                  onChange={handleEmailChange}
                  className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {emailError && <p className="text-red-600 text-sm mt-1">{emailError}</p>}
              </div>

              {/* Password & Confirm Password */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="password" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Lock className="w-4 h-4 text-blue-600" />
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    placeholder="Create a password"
                    value={registerForm.password}
                    onChange={handlePasswordChange}
                    className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  {passwordError && <p className="text-red-600 text-sm mt-1">{passwordError}</p>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Lock className="w-4 h-4 text-blue-600" />
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm your password"
                    value={registerForm.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label htmlFor="phoneNumber" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Phone className="w-4 h-4 text-blue-600" />
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  name="phoneNumber"
                  placeholder="+639171234567"
                  value={registerForm.phoneNumber}
                  onChange={handleNumberChange}
                  className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {numberError && <p className="text-red-600 text-sm mt-1">{numberError}</p>}
              </div>

              {/* Address */}
              <div className="space-y-2">
                <label htmlFor="address" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Address
                </label>
                <input
                  id="address"
                  type="text"
                  name="address"
                  placeholder="Enter your address"
                  value={registerForm.address}
                  onChange={handleInputChange}
                  className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Birthdate */}
              <div className="space-y-2">
                <label htmlFor="birthdate" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Birthdate
                </label>
                <input
                  id="birthdate"
                  type="date"
                  name="birthdate"
                  value={registerForm.birthdate}
                  onChange={handleInputChange}
                  className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Gender & Role */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="gender" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Users className="w-4 h-4 text-blue-600" />
                    Gender
                  </label>
                  <div className="relative">
                    <select
                      id="gender"
                      name="gender"
                      value={registerForm.gender}
                      onChange={handleInputChange}
                      className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Others">Others</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="role" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    Role
                  </label>
                  <div className="relative">
                    <select
                      id="role"
                      name="role"
                      value={registerForm.role}
                      onChange={handleInputChange}
                      className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
                    >
                      <option value="User">User</option>
                      <option value="BoatOperator">Boat Operator</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Company Details - Boat Operator only */}
              {registerForm.role === "BoatOperator" && (
                <div className="space-y-6 pt-2 border-t-2 border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Company Details</h3>

                  <div className="space-y-2">
                    <label htmlFor="companyName" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      Company Name
                    </label>
                    <input
                      id="companyName"
                      type="text"
                      name="companyName"
                      placeholder="Enter your company name"
                      value={registerForm.companyName || ""}
                      onChange={handleInputChange}
                      className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="companyAddress" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      Company Address
                    </label>
                    <input
                      id="companyAddress"
                      type="text"
                      name="companyAddress"
                      placeholder="Enter your company address"
                      value={registerForm.companyAddress || ""}
                      onChange={handleInputChange}
                      className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* GCash Details */}
                  <h4 className="text-sm font-semibold text-gray-700">GCash Payment Details</h4>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="gcashNumber" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Phone className="w-4 h-4 text-blue-600" />
                        GCash Number
                      </label>
                      <input
                        id="gcashNumber"
                        type="tel"
                        name="gcashNumber"
                        placeholder="+639171234567"
                        value={registerForm.gcashNumber || ""}
                        onChange={handleNumberChange}
                        className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="gcashName" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <User className="w-4 h-4 text-blue-600" />
                        GCash Account Name
                      </label>
                      <input
                        id="gcashName"
                        type="text"
                        name="gcashName"
                        placeholder="Enter GCash account name"
                        value={registerForm.gcashName || ""}
                        onChange={handleInputChange}
                        className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="companyPhoneNumber" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Phone className="w-4 h-4 text-blue-600" />
                        Company Phone Number
                      </label>
                      <input
                        id="companyPhoneNumber"
                        type="tel"
                        name="companyPhoneNumber"
                        placeholder="+639171234567"
                        value={registerForm.companyPhoneNumber || ""}
                        onChange={handleNumberChange}
                        className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="companyEmail" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Mail className="w-4 h-4 text-blue-600" />
                        Company Email
                      </label>
                      <input
                        id="companyEmail"
                        type="email"
                        name="companyEmail"
                        placeholder="Enter company email"
                        value={registerForm.companyEmail || ""}
                        onChange={handleInputChange}
                        className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 h-12 px-6 rounded-lg text-white text-base font-semibold transition-all shadow-md ${
                    loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="animate-spin" size={20} />
                      Registering...
                    </span>
                  ) : (
                    "Register Now"
                  )}
                </button>
              </div>

            </div>
          </form>

          <div className="text-center text-sm text-gray-600 pt-2">
            Already have an account?{" "}
            <a href="#" className="text-blue-600 font-semibold hover:underline">
              Sign in here
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}