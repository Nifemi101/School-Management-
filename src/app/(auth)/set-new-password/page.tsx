'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { finalizePasswordReset } from '@/app/actions/passwordReset'
import {
  KeyRound, Eye, EyeOff, CheckCircle,
  AlertCircle, Loader2, ShieldCheck,
} from 'lucide-react'

export default function SetNewPasswordPage() {
  const router = useRouter()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [role, setRole] = useState<string | null>(null)

  // Guard: only allow users with is_temp_login = true
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/student-login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_temp_login, role')
        .eq('id', user.id)
        .single()

      if (!profile?.is_temp_login) {
        const dest = profile?.role === 'teacher' ? '/teacher'
          : profile?.role === 'admin' ? '/admin'
          : '/student'
        router.replace(dest)
        return
      }

      setRole(profile.role)
      setChecking(false)
    }

    checkSession()
  }, [router])

  const validate = () => {
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return false
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validate()) return

    setLoading(true)
    try {
      const supabase = createClient()

      // Step 1: Update password client-side — preserves the session
      const { error: pwError } = await supabase.auth.updateUser({
        password: form.password,
      })

      if (pwError) {
        setError('Failed to update password. Please try again.')
        setLoading(false)
        return
      }

      // Step 2: Update DB records via server action
      const result = await finalizePasswordReset()

      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        setLoading(false)
        return
      }

      setDone(true)

      // Step 3: Hard redirect to preserve fresh session state
      const dest = result.role === 'teacher' ? '/teacher'
        : result.role === 'admin' ? '/admin'
        : '/student'

      setTimeout(() => {
        window.location.href = dest
      }, 1500)

    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  // Password strength
  const getStrength = (pw: string) => {
    if (!pw) return null
    if (pw.length < 6) return { label: 'Too short', color: 'bg-red-400', width: 'w-1/4' }
    if (pw.length < 8) return { label: 'Weak', color: 'bg-orange-400', width: 'w-2/4' }
    if (pw.length < 12 || !/[0-9]/.test(pw)) return { label: 'Fair', color: 'bg-yellow-400', width: 'w-3/4' }
    return { label: 'Strong', color: 'bg-green-500', width: 'w-full' }
  }

  const strength = getStrength(form.password)

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Updated</h2>
          <p className="text-gray-500 text-sm mb-1">Your new password has been set successfully.</p>
          <p className="text-gray-400 text-xs">Redirecting to your dashboard...</p>
          <div className="mt-4 flex justify-center">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
          >
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
          <p className="text-gray-500 text-sm mt-1.5">
            You logged in with a temporary password. Set a permanent one to continue.
          </p>
        </div>

        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6">
          <ShieldCheck className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Choose a strong password you haven&apos;t used before. You won&apos;t be able to
            access your {role ?? 'account'} portal until this is done.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* New password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setError('') }}
                  className="w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {strength && (
                <div className="mt-2">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{strength.label}</p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat your new password"
                  value={form.confirm}
                  onChange={(e) => { setForm({ ...form, confirm: e.target.value }); setError('') }}
                  className="w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.confirm.length > 0 && (
                <p className={`text-xs mt-1 ${form.password === form.confirm ? 'text-green-500' : 'text-red-400'}`}>
                  {form.password === form.confirm ? 'Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100
                text-red-700 px-4 py-3 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-medium text-white rounded-lg
                disabled:opacity-60 disabled:cursor-not-allowed transition-opacity
                flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                : 'Set New Password'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Apex International School · Secure Password Reset
        </p>
      </div>
    </div>
  )
}