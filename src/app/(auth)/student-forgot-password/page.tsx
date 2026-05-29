'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  KeyRound,
  User,
  Hash,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { submitPasswordResetRequest } from '@/app/actions/passwordReset'

type Class = { id: string; name: string }

export default function StudentForgotPassword() {
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    studentId: '',
    firstName: '',
    lastName: '',
    classId: '',
  })

  useEffect(() => {
    const fetchClasses = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('classes')
        .select('id, name')
        .order('name')
      if (data) setClasses(data)
    }
    fetchClasses()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.studentId || !form.firstName || !form.lastName || !form.classId) {
      setError('All fields are required.')
      return
    }

    setLoading(true)
    try {
      const result = await submitPasswordResetRequest({
        reference_number: form.studentId,
        first_name: form.firstName,
        last_name: form.lastName,
        role: 'student',
        class_id: form.classId,
      })

      if (result.success) {
        setSubmitted(true)
      } else {
        setError(result.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ──────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Request Submitted</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            Your identity has been verified. Your request is now pending admin approval.
          </p>
          <p className="text-gray-400 text-xs leading-relaxed mb-8">
            Visit or contact your school admin. They will provide you with a temporary
            password to log back in.
          </p>
          <Link
            href="/student-login"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Student Login
          </Link>
        </div>
      </div>
    )
  }

  // ── Request form ────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
          >
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset Your Password</h1>
          <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
            Verify your registered details below. Your request will be
            reviewed by your admin.
          </p>
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6">
          <ShieldCheck className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Your details must exactly match what the admin registered for you.
            No reset will happen without admin approval.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Student ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Student ID
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. APX26001"
                  value={form.studentId}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                First Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="As registered by admin"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Last Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="As registered by admin"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Class */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Class
              </label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={form.classId}
                  onChange={(e) => setForm({ ...form, classId: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    transition appearance-none bg-white"
                >
                  <option value="">Select your class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100
                text-red-700 px-4 py-3 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-medium text-white rounded-lg
                disabled:opacity-60 disabled:cursor-not-allowed transition-opacity
                flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Submit Reset Request'
              )}
            </button>
          </form>

          {/* Back link */}
          <div className="mt-6 text-center">
            <Link
              href="/student-login"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500
                hover:text-blue-600 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Student Login
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Apex International School · Student Portal
        </p>
      </div>
    </div>
  )
}