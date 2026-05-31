'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, CheckCircle } from 'lucide-react'
import { addTeacher } from '@/app/actions/addTeacher'

export default function AddTeacherPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    teacher_number: '',
    first_name: '',
    last_name: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await addTeacher({
      teacher_number: form.teacher_number,
      first_name: form.first_name,
      last_name: form.last_name,
    })

    if (!result.success) {
      setError(result.error ?? 'Failed to add teacher. Please try again.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setForm({ teacher_number: '', first_name: '', last_name: '' })
    setLoading(false)

    setTimeout(() => {
      router.push('/admin/teachers')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/admin/teachers')}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <UserPlus size={22} className="text-blue-600" />
              Add New Teacher
            </h1>
            <p className="text-xs text-gray-500">Teacher will use their ID to sign up</p>
          </div>
        </div>

        {/* Success banner */}
        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200
            text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
            <CheckCircle size={16} className="shrink-0" />
            Teacher added successfully! Redirecting...
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teacher ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="teacher_number"
                value={form.teacher_number}
                onChange={handleChange}
                required
                placeholder="e.g. TCH2024001"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                This is what the teacher will use to sign up
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                required
                placeholder="Enter first name"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                required
                placeholder="Enter last name"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push('/admin/teachers')}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg
                  text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm
                  font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Teacher'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}