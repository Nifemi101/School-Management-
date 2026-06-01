'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BookOpen, Plus, Minus, Loader2,
  CheckCircle, GraduationCap, Info,
} from 'lucide-react'

type Subject = {
  id: string
  name: string
  class_id: string | null
  classes: { name: string } | { name: string }[] | null
}

export default function StudentSubjectsPage() {
  const [allSubjects, setAllSubjects] = useState<Subject[]>([])
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [enrollmentRowIds, setEnrollmentRowIds] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [studentClass, setStudentClass] = useState<string | null>(null)
  const [classId, setClassId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get student's reference_number
    const { data: profile } = await supabase
      .from('profiles')
      .select('reference_number')
      .eq('id', user.id)
      .single()

    if (!profile) return

    // Get student's class
    const { data: preReg } = await supabase
      .from('pre_registered_students')
      .select('class_id, classes(name)')
      .eq('student_number', profile.reference_number)
      .single()

    const studentClassId = preReg?.class_id ?? null
    const className = Array.isArray(preReg?.classes)
      ? preReg?.classes[0]?.name
      : (preReg?.classes as any)?.name ?? null

    setClassId(studentClassId)
    if (className) setStudentClass(className)

    // Get subjects for this class + general subjects
    const { data: subjectsData } = studentClassId
      ? await supabase
          .from('subjects')
          .select('id, name, class_id, classes(name)')
          .or(`class_id.eq.${studentClassId},class_id.is.null`)
          .order('name')
      : await supabase
          .from('subjects')
          .select('id, name, class_id, classes(name)')
          .order('name')

    // Get enrolled subjects
    const { data: enrolledData } = await supabase
      .from('student_subjects')
      .select('id, subject_id')
      .eq('student_id', user.id)

    setAllSubjects((subjectsData ?? []) as Subject[])
    setEnrolledIds(new Set((enrolledData ?? []).map(e => e.subject_id)))
    setEnrollmentRowIds(new Map((enrolledData ?? []).map(e => [e.subject_id, e.id])))
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleEnroll = async (subjectId: string) => {
    setActionLoading(subjectId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setActionLoading(null); return }

    const { data, error } = await supabase
      .from('student_subjects')
      .insert({ student_id: user.id, subject_id: subjectId })
      .select('id')
      .single()

    if (!error && data) {
      setEnrolledIds(prev => new Set([...prev, subjectId]))
      setEnrollmentRowIds(prev => new Map([...prev, [subjectId, data.id]]))
    }
    setActionLoading(null)
  }

  const handleUnenroll = async (subjectId: string) => {
    setActionLoading(subjectId)
    const enrollmentId = enrollmentRowIds.get(subjectId)
    if (!enrollmentId) { setActionLoading(null); return }

    const supabase = createClient()
    const { error } = await supabase
      .from('student_subjects')
      .delete()
      .eq('id', enrollmentId)

    if (!error) {
      setEnrolledIds(prev => { const s = new Set(prev); s.delete(subjectId); return s })
      setEnrollmentRowIds(prev => { const m = new Map(prev); m.delete(subjectId); return m })
    }
    setActionLoading(null)
  }

  const getClassName = (subject: Subject) => {
    if (!subject.classes) return 'All Classes'
    if (Array.isArray(subject.classes)) return subject.classes[0]?.name ?? 'All Classes'
    return subject.classes.name ?? 'All Classes'
  }

  const enrolled = allSubjects.filter(s => enrolledIds.has(s.id))
  const available = allSubjects.filter(s => !enrolledIds.has(s.id))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            My Subjects
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Select the subjects you are offering this session.
          </p>
        </div>
        {studentClass && (
          <span className="flex items-center gap-1.5 text-xs px-3 py-1.5
            bg-blue-100 text-blue-700 rounded-full font-medium">
            <GraduationCap className="w-3.5 h-3.5" />
            {studentClass}
          </span>
        )}
      </div>

      {/* ── Enrolled subjects ──────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <h2 className="text-sm font-semibold text-gray-700">
            Enrolled Subjects
            <span className="ml-1.5 text-gray-400 font-normal">({enrolled.length})</span>
          </h2>
        </div>

        {enrolled.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl
            px-4 py-10 text-center">
            <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">You haven't enrolled in any subjects yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Select from the available subjects below.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {enrolled.map(subject => (
              <div
                key={subject.id}
                className="flex items-center justify-between bg-white border
                  border-green-100 rounded-xl px-4 py-3.5 gap-3 hover:shadow-sm transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {subject.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{getClassName(subject)}</p>
                </div>
                <button
                  onClick={() => handleUnenroll(subject.id)}
                  disabled={actionLoading === subject.id}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs
                    font-medium text-red-500 border border-red-200 rounded-lg
                    hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {actionLoading === subject.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Minus className="w-3 h-3" />}
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Available subjects ─────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-700">
            Available Subjects
            <span className="ml-1.5 text-gray-400 font-normal">({available.length})</span>
          </h2>
        </div>

        {available.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl
            px-4 py-10 text-center">
            <CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              You are enrolled in all available subjects.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {available.map(subject => (
              <div
                key={subject.id}
                className="flex items-center justify-between bg-white border
                  border-gray-100 rounded-xl px-4 py-3.5 gap-3
                  hover:border-blue-200 hover:shadow-sm transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {subject.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{getClassName(subject)}</p>
                </div>
                <button
                  onClick={() => handleEnroll(subject.id)}
                  disabled={actionLoading === subject.id}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs
                    font-medium text-blue-600 border border-blue-200 rounded-lg
                    hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  {actionLoading === subject.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Plus className="w-3 h-3" />}
                  Enroll
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100
        rounded-xl px-4 py-3 mt-8">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Only subjects available for your class are shown. Contact your admin
          if a subject you need is missing.
        </p>
      </div>

    </div>
  )
}