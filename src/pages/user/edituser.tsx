'use client'

import { User, Mail, Lock, Phone, MapPin, Users, UserCircle, Calendar, ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../utils/apifetch'
import { useNavigate, useParams } from 'react-router-dom'

export default function UserEditPage() {
  const { userID } = useParams()
  const navigate = useNavigate()

  const [currentUser, setCurrentUser] = useState({
    firstName: "",
    lastName: "",
    userName: "",
    email: "",
    phone_number: "",
    address: "",
    gender: "",
    birthdate: "",
  })

  const [passwords, setPasswords] = useState({
    password: "",
    confirmPassword: "",
  })

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await apiFetch("http://localhost:3000/user/usersession", {
          method: "GET",
          credentials: "include",
        })
        const data = await res.json()
        if (res.status === 401 || res.status === 403) {
          navigate("/login")
          return
        }
      } catch (err) {
        console.error("Failed to fetch session", err)
        navigate("/login")
      }
    }

    async function getCurrentDetails() {
      try {
        const res = await apiFetch(
          `http://localhost:3000/user/getcurrentuserdetails/${userID}`,
          {
            method: "GET",
            credentials: "include",
          }
        )
        const data = await res.json()
        setCurrentUser({
          firstName: data.firstName,
          lastName: data.lastName,
          userName: data.userName,
          email: data.email,
          phone_number: data.phone_number,
          address: data.address,
          gender: data.gender,
          birthdate: data.birthdate?.split("T")[0] ?? "", // ✅ fix date format
        })
      } catch (err) {
        console.error("Failed to fetch user details", err)
      }
    }

    fetchSession()
    getCurrentDetails()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target
    setCurrentUser((prev) => ({ ...prev, [id]: value }))
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setPasswords((prev) => ({ ...prev, [id]: value }))
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()

  // If user typed anything in either password field, both must match and be non-empty
  if (passwords.password || passwords.confirmPassword) {
    if (!passwords.password || !passwords.confirmPassword) {
      alert("Please fill in both password fields")
      return
    }
    if (passwords.password !== passwords.confirmPassword) {
      alert("Passwords do not match")
      return
    }
  }

  try {
    const res = await apiFetch(
      `http://localhost:3000/user/confirmedituser/${userID}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentUser,
          password: passwords.password || null,       // null = don't update password
          confirmPassword: passwords.confirmPassword || null,
        }),
      }
    )

    const data = await res.json()
    if (res.ok) {
      alert("Profile updated successfully!")
      navigate(-1)
    } else {
      alert(data.message || "Failed to update profile")
    }
  } catch (err) {
    console.error("Failed to update user details", err)
  }
}
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-10 text-white">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Edit Profile</h1>
            <p className="text-white/90 text-base">Update your personal information</p>
          </div>
        </div>

        {/* Form */}
        <div className="px-8 py-8">
          <form className="space-y-6" onSubmit={handleUpdate}>

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
                  value={currentUser.firstName}
                  onChange={handleChange}
                  placeholder="Enter your first name"
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
                  value={currentUser.lastName}
                  onChange={handleChange}
                  placeholder="Enter your last name"
                  className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <label htmlFor="userName" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <UserCircle className="w-4 h-4 text-blue-600" />
                Username
              </label>
              <input
                id="userName"
                type="text"
                value={currentUser.userName}
                onChange={handleChange}
                placeholder="Choose a username"
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
                value={currentUser.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <label htmlFor="phone_number" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Phone className="w-4 h-4 text-blue-600" />
                Phone Number
              </label>
              <input
                id="phone_number"
                type="tel"
                value={currentUser.phone_number}
                onChange={handleChange}
                placeholder="+639171234567"
                className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
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
                value={currentUser.address}
                onChange={handleChange}
                placeholder="Enter your address"
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
                value={currentUser.birthdate}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label htmlFor="gender" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Users className="w-4 h-4 text-blue-600" />
                Gender
              </label>
              <div className="relative">
                <select
                  id="gender"
                  value={currentUser.gender}
                  onChange={handleChange}
                  className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Others">Others</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-6 pt-2 border-t-2 border-gray-200">
              <div className="space-y-2">
                <label htmlFor="password" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Lock className="w-4 h-4 text-blue-600" />
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={passwords.password}
                  onChange={handlePasswordChange}
                  placeholder="Create a new password"
                  className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank to keep current password unchanged</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Lock className="w-4 h-4 text-blue-600" />
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm your password"
                  className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 h-12 px-6 rounded-lg bg-blue-600 text-white text-base font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 h-12 px-6 rounded-lg bg-transparent border-2 border-gray-200 text-gray-900 text-base font-semibold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
              >
                Cancel
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}