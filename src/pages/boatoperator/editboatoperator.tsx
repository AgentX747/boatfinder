import { User, Mail, Lock, Phone, MapPin, Users, UserCircle, Calendar, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiFetch } from '../../utils/apifetch'
import { useNavigate, useParams } from 'react-router-dom'

interface OperatorDetails {
  firstName: string
  lastName: string
  userName: string
  email: string
  phone_number: string
  address: string
  gender: string
  birthdate: string
}

export default function BoatOperatorEditPage() {
  const navigate = useNavigate()
  const { boatoperatorId } = useParams<{ boatoperatorId: string }>()
  const [form, setForm] = useState<OperatorDetails>({
    firstName: '',
    lastName: '',
    userName: '',
    email: '',
    phone_number: '',
    address: '',
    gender: '',
    birthdate: '',
  })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOperatorDetails() {
      try {
        const detailsRes = await apiFetch(
          `http://localhost:3000/boatoperator/getcurrentoperatordetails/${boatoperatorId}`,
          { method: 'GET', credentials: 'include' }
        )

        if (detailsRes.status === 401 || detailsRes.status === 403) {
          navigate('/login')
          return
        }

        if (!detailsRes.ok) throw new Error('Failed to fetch operator details')

        const details = await detailsRes.json()
        const data: OperatorDetails = Array.isArray(details) ? details[0] : details

        setForm({
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          userName: data.userName ?? '',
          email: data.email ?? '',
          phone_number: data.phone_number ?? '',
          address: data.address ?? '',
          gender: data.gender ?? '',
          birthdate: data.birthdate ? data.birthdate.split('T')[0] : '',
        })
      } catch (err: any) {
        console.error(err)
        setError(err.message ?? 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    loadOperatorDetails()
  }, [boatoperatorId, navigate])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      const res = await apiFetch(
        `http://localhost:3000/boatoperator/confirmeditboatoperator/${boatoperatorId}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            password: password || null,
            confirmPassword: confirmPassword || null,
          }),
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message ?? 'Failed to update')
      }
 alert('Profile updated successfully!')
      navigate(-1)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-10 text-white">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Edit Boat Operator</h1>
            <p className="text-white/90 text-base">Update your personal information</p>
          </div>
        </div>

        {/* Form */}
        <div className="px-8 py-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
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
                  value={form.firstName}
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
                  value={form.lastName}
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
                value={form.userName}
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
                value={form.email}
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
                value={form.phone_number}
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
                value={form.address}
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
                value={form.birthdate}
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
                  value={form.gender}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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