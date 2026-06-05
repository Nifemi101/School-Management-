'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ClipboardList, BookOpen, Users, Loader2,
  Save, CheckCircle, AlertCircle, ChevronDown, Info,
} from 'lucide-react'
import {
  getTeacherResultsData,
  getStudentsForScoring,
  saveStudentScore,
} from '@/app/actions/teacherResults'

// ── Types ─────────────────────────────────────────────────────
type Term = { id: string; name: string; session: string }
type Subject = { id: string; name: string }
type Class = { id: string; name: string }

type StudentRow = {
  authId: string | null
  student_number: string
  first_name: string
  last_name: string
  first_test: string
  second_test: string
  exam: string
  total: number | null
  grade: string | null
  isDirty: boolean
  saving: boolean
  saved: boolean
  error: string
}

// ── Grade badge ───────────────────────────────────────────────
function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return <span className="text-gray-300 text-xs">—</span>
  const colors: Record<string, string> = {
    A: 'bg-green-100 text-green-700',
    B: 'bg-blue-100 text-blue-700',
    C: 'bg-yellow-100 text-yellow-700',
    D: 'bg-orange-100 text-orange-700',
    E: 'bg-orange-100 text-orange-700',
    F: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
      ${colors[grade] ?? 'bg-gray-100 text-gray-600'}`}>
      {grade}
    </span>
  )
}

// ── Score input ───────────────────────────────────────────────
function ScoreInput({
  value, max, disabled, onChange, fullWidth = false,
}: {
  value: string
  max: number
  disabled: boolean
  onChange: (v: string) => void
  fullWidth?: boolean
}) {
  const num = parseFloat(value)
  const isOver = !isNaN(num) && num > max
  return (
    <div className="relative">
      <input
        type="number"
        min={0}
        max={max}
        step={0.5}
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        placeholder="—"
        className={`py-1.5 text-sm text-center border rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 transition
          disabled:bg-gray-50 disabled:cursor-not-allowed
          ${isOver ? 'border-red-400 bg-red-50' : 'border-gray-200'}
          ${fullWidth ? 'w-full px-2' : 'w-14 px-1'}
        `}
      />
      <span className="absolute -bottom-4 left-0 right-0 text-center
        text-[10px] text-gray-400">
        /{max}
      </span>
    </div>
  )
}

// ── Save button ───────────────────────────────────────────────
function SaveButton({
  saving, saved, isDirty, hasAccount, onSave,
}: {
  saving: boolean
  saved: boolean
  isDirty: boolean
  hasAccount: boolean
  onSave: () => void
}) {
  if (!hasAccount) return <span className="text-xs text-gray-400 italic">No account</span>
  if (saving) return <Loader2 className="w-4 h-4 text-blue-500 animate-spin mx-auto" />
  if (saved && !isDirty) return <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
  return (
    <button
      onClick={onSave}
      disabled={!isDirty}
      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium
        text-white rounded-lg disabled:opacity-30 mx-auto transition"
      style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
    >
      <Save className="w-3 h-3" />
      Save
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function TeacherResultsPage() {
  const [activeTerm, setActiveTerm] = useState<Term | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState<StudentRow[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [pageError, setPageError] = useState('')

  useEffect(() => {
    const load = async () => {
      const result = await getTeacherResultsData()
      if (result.success && result.data) {
        setActiveTerm(result.data.activeTerm)
        setSubjects(result.data.subjects)
        setClasses(result.data.classes)
      } else {
        setPageError(result.error ?? 'Failed to load page.')
      }
      setPageLoading(false)
    }
    load()
  }, [])

  const loadStudents = useCallback(async () => {
    if (!selectedSubject || !selectedClass || !activeTerm) return
    setStudentsLoading(true)
    const result = await getStudentsForScoring(selectedClass, selectedSubject, activeTerm.id)
    if (result.success && result.data) {
      setStudents(
        result.data.map(s => ({
          ...s,
          first_test: s.first_test?.toString() ?? '',
          second_test: s.second_test?.toString() ?? '',
          exam: s.exam?.toString() ?? '',
          isDirty: false,
          saving: false,
          saved: s.first_test !== null || s.second_test !== null || s.exam !== null,
          error: '',
        }))
      )
    }
    setStudentsLoading(false)
  }, [selectedSubject, selectedClass, activeTerm])

  useEffect(() => {
    if (selectedSubject && selectedClass) loadStudents()
  }, [selectedSubject, selectedClass, loadStudents])

  const updateRow = (
    index: number,
    field: 'first_test' | 'second_test' | 'exam',
    value: string
  ) => {
    setStudents(prev => prev.map((s, i) => {
      if (i !== index) return s
      const updated = { ...s, [field]: value, isDirty: true, saved: false, error: '' }
      const t1 = field === 'first_test' ? parseFloat(value) : parseFloat(s.first_test)
      const t2 = field === 'second_test' ? parseFloat(value) : parseFloat(s.second_test)
      const ex = field === 'exam' ? parseFloat(value) : parseFloat(s.exam)
      if (!isNaN(t1) && !isNaN(t2) && !isNaN(ex)) {
        const total = t1 + t2 + ex
        updated.total = total <= 100 ? total : s.total
        updated.grade = total <= 100 ? calcGradeClient(total) : s.grade
      } else {
        updated.total = null
        updated.grade = null
      }
      return updated
    }))
  }

  const saveRow = async (index: number) => {
    const row = students[index]
    if (!row.authId || !activeTerm) {
      setStudents(prev => prev.map((s, i) =>
        i === index
          ? { ...s, error: row.authId ? 'No active term.' : 'Student has no account yet.' }
          : s
      ))
      return
    }

    setStudents(prev => prev.map((s, i) =>
      i === index ? { ...s, saving: true, error: '' } : s
    ))

    const parse = (v: string) => v.trim() === '' ? null : parseFloat(v)

    const result = await saveStudentScore({
      studentAuthId: row.authId,
      subjectId: selectedSubject,
      termId: activeTerm.id,
      first_test: parse(row.first_test),
      second_test: parse(row.second_test),
      exam: parse(row.exam),
    })

    setStudents(prev => prev.map((s, i) => {
      if (i !== index) return s
      if (result.success) {
        return {
          ...s, saving: false, saved: true, isDirty: false,
          total: result.total ?? s.total, grade: result.grade ?? s.grade, error: '',
        }
      }
      return { ...s, saving: false, error: result.error ?? 'Save failed.' }
    }))
  }

  const saveAll = async () => {
    const dirtyIndexes = students
      .map((s, i) => s.isDirty ? i : -1)
      .filter(i => i !== -1)
    for (const i of dirtyIndexes) await saveRow(i)
  }

  const dirtyCount = students.filter(s => s.isDirty).length
  const selectedSubjectName = subjects.find(s => s.id === selectedSubject)?.name
  const selectedClassName = classes.find(c => c.id === selectedClass)?.name

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto pb-24">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-600" />
          Enter Results
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Select a subject and class to start recording scores.
        </p>
      </div>

      {/* Page error */}
      {pageError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100
          text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {pageError}
        </div>
      )}

      {/* Term banner */}
      {activeTerm ? (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100
          rounded-xl px-4 py-3 mb-6">
          <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-sm text-blue-800">
            Recording results for{' '}
            <span className="font-semibold">
              {activeTerm.name} — {activeTerm.session}
            </span>
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200
          rounded-xl px-4 py-3 mb-6">
          <Info className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            No active term. Ask your admin to set an active term.
          </p>
        </div>
      )}

      {/* Subject + Class selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Your Subject
          </label>
          <div className="relative">
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2
              w-4 h-4 text-gray-400 pointer-events-none" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
              w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={selectedSubject}
              disabled={!activeTerm}
              onChange={e => { setSelectedSubject(e.target.value); setStudents([]) }}
              className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200
                rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500
                appearance-none bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              <option value="">Select subject...</option>
              {subjects.length === 0
                ? <option disabled>No subjects assigned</option>
                : subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))
              }
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Class
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2
              w-4 h-4 text-gray-400 pointer-events-none" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
              w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={selectedClass}
              disabled={!activeTerm || !selectedSubject}
              onChange={e => { setSelectedClass(e.target.value); setStudents([]) }}
              className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200
                rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500
                appearance-none bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              <option value="">Select class...</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students */}
      {studentsLoading ? (
        <div className="flex items-center justify-center py-20 bg-white
          border border-gray-100 rounded-2xl">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>

      ) : students.length > 0 ? (
        <>
          {/* Subheader */}
          <div className="flex flex-col sm:flex-row sm:items-center
            justify-between gap-3 mb-3">
            <p className="text-sm font-medium text-gray-700">
              {selectedSubjectName} · {selectedClassName} ·{' '}
              <span className="text-gray-500">{students.length} students</span>
            </p>
            {dirtyCount > 0 && (
              <button
                onClick={saveAll}
                className="flex items-center justify-center gap-2 text-sm
                  font-medium text-white px-4 py-2 rounded-lg w-full sm:w-auto"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
              >
                <Save className="w-3.5 h-3.5" />
                Save All ({dirtyCount})
              </button>
            )}
          </div>

          {/* Score key */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs
            text-gray-500 mb-4 px-1">
            <span>1st Test = max 20</span>
            <span>2nd Test = max 20</span>
            <span>Exam = max 60</span>
            <span>Total = 100</span>
          </div>

          {/* ── Mobile cards (< md) ──────────────────────── */}
          <div className="md:hidden space-y-3">
            {students.map((student, index) => (
              <div
                key={student.student_number}
                className={`bg-white border rounded-2xl p-4 transition
                  ${student.isDirty ? 'border-blue-200 bg-blue-50/20' : 'border-gray-100'}`}
              >
                {/* Student info + status */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {student.last_name} {student.first_name}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      {student.student_number}
                    </p>
                  </div>
                  <div className="shrink-0 ml-2">
                    <SaveButton
                      saving={student.saving}
                      saved={student.saved}
                      isDirty={student.isDirty}
                      hasAccount={!!student.authId}
                      onSave={() => saveRow(index)}
                    />
                  </div>
                </div>

                {/* Score inputs */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: '1st Test', field: 'first_test' as const, max: 20 },
                    { label: '2nd Test', field: 'second_test' as const, max: 20 },
                    { label: 'Exam', field: 'exam' as const, max: 60 },
                  ].map(({ label, field, max }) => (
                    <div key={field} className="text-center">
                      <p className="text-[10px] text-gray-500 mb-2">{label}</p>
                      <ScoreInput
                        value={student[field]}
                        max={max}
                        disabled={!student.authId}
                        onChange={v => updateRow(index, field, v)}
                        fullWidth
                      />
                    </div>
                  ))}
                </div>

                {/* Total + grade */}
                {(student.total !== null || student.grade) && (
                  <div className="flex items-center justify-between pt-3
                    border-t border-gray-100 mt-2">
                    <span className="text-xs text-gray-500">Total Score</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${
                        (student.total ?? 0) >= 50
                          ? 'text-gray-900'
                          : 'text-red-500'
                      }`}>
                        {student.total ?? '—'} / 100
                      </span>
                      <GradeBadge grade={student.grade} />
                    </div>
                  </div>
                )}

                {/* Row error */}
                {student.error && (
                  <p className="text-xs text-red-500 mt-2">{student.error}</p>
                )}
              </div>
            ))}
          </div>

          {/* ── Desktop table (md+) ──────────────────────── */}
          <div className="hidden md:block bg-white border border-gray-100
            rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-center">1st Test</th>
                    <th className="px-4 py-3 text-center">2nd Test</th>
                    <th className="px-4 py-3 text-center">Exam</th>
                    <th className="px-4 py-3 text-center">Total</th>
                    <th className="px-4 py-3 text-center">Grade</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((student, index) => (
                    <tr
                      key={student.student_number}
                      className={`transition-colors ${
                        student.isDirty ? 'bg-blue-50/40' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-4 text-gray-400 text-xs">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">
                          {student.last_name} {student.first_name}
                        </p>
                        {student.error && (
                          <p className="text-xs text-red-500 mt-0.5">
                            {student.error}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-gray-500">
                        {student.student_number}
                      </td>
                      <td className="px-4 py-4 pb-6 text-center">
                        <ScoreInput
                          value={student.first_test}
                          max={20}
                          disabled={!student.authId}
                          onChange={v => updateRow(index, 'first_test', v)}
                        />
                      </td>
                      <td className="px-4 py-4 pb-6 text-center">
                        <ScoreInput
                          value={student.second_test}
                          max={20}
                          disabled={!student.authId}
                          onChange={v => updateRow(index, 'second_test', v)}
                        />
                      </td>
                      <td className="px-4 py-4 pb-6 text-center">
                        <ScoreInput
                          value={student.exam}
                          max={60}
                          disabled={!student.authId}
                          onChange={v => updateRow(index, 'exam', v)}
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-sm font-bold ${
                          student.total !== null
                            ? student.total >= 50 ? 'text-gray-900' : 'text-red-500'
                            : 'text-gray-300'
                        }`}>
                          {student.total !== null ? student.total : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <GradeBadge grade={student.grade} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <SaveButton
                          saving={student.saving}
                          saved={student.saved}
                          isDirty={student.isDirty}
                          hasAccount={!!student.authId}
                          onSave={() => saveRow(index)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>

      ) : selectedSubject && selectedClass ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            No registered students in this class.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function calcGradeClient(total: number) {
  if (total >= 70) return 'A'
  if (total >= 60) return 'B'
  if (total >= 50) return 'C'
  if (total >= 45) return 'D'
  if (total >= 40) return 'E'
  return 'F'
}