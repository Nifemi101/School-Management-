'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GraduationCap, School, Shield } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Check their role and redirect to correct dashboard
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'admin') router.push('/admin')
        else if (profile?.role === 'teacher') router.push('/teacher')
        else if (profile?.role === 'student') router.push('/student')
        else setChecking(false)
      } else {
        setChecking(false)
      }
    }

    checkSession()
  }, [])

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-blue-600">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white text-sm">Loading...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <School size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Apex</h1>
          <p className="text-blue-100 text-sm mt-2">International School</p>
        </div>

        {/* Role Selection */}
        <div className="space-y-3">
          <p className="text-blue-100 text-center text-sm mb-6">
            Select your role to continue
          </p>

          <button
            onClick={() => router.push('/admin-login')}
            className="w-full bg-white text-blue-700 px-6 py-4 rounded-2xl font-semibold flex items-center gap-4 hover:bg-blue-50 transition-colors shadow-lg"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-blue-700" />
            </div>
            <div className="text-left">
              <p className="font-bold">Admin</p>
              <p className="text-xs text-gray-500 font-normal">Manage the school system</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/teacher-login')}
            className="w-full bg-white text-blue-700 px-6 py-4 rounded-2xl font-semibold flex items-center gap-4 hover:bg-blue-50 transition-colors shadow-lg"
          >
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <School size={20} className="text-green-700" />
            </div>
            <div className="text-left">
              <p className="font-bold">Teacher</p>
              <p className="text-xs text-gray-500 font-normal">Enter results and manage classes</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/student-login')}
            className="w-full bg-white text-blue-700 px-6 py-4 rounded-2xl font-semibold flex items-center gap-4 hover:bg-blue-50 transition-colors shadow-lg"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-purple-700" />
            </div>
            <div className="text-left">
              <p className="font-bold">Student</p>
              <p className="text-xs text-gray-500 font-normal">View results and study materials</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}