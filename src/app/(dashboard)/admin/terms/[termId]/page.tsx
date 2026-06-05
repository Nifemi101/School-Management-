'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, BookOpen, Users, CheckCircle, Loader2,
  Save, AlertCircle, Globe, ClipboardList, BarChart3,
  MessageSquare, X,
} from 'lucide-react'
import { getTermDetails, saveRemark, publishTerm } from '@/app/actions/adminTerms'

type Student = { id: string; reference_number: string; first_name: string; last_name: string }
type Subject = { id: string; name: string }
type Result = { student_id: string; subject_id: string; first_test: number | null; second_test: number | null; exam: number | null; total: number | null }
type RemarkRow = { studentId: string; remark: string; saving: boolean; saved: boolean }

type TermData = {
  term: { id: string; name: string; session: string; is_active: boolean; is_published: boolean; published_at: string | null }
  students: Student[]
  remarks: { student_id: string; remark: string }[]
  subjects: Subject[]
  results: Result[]
}

type Tab = 'progress' | 'remarks'

export default function TermDetailPage() {
  const router = useRouter()
  const params = useParams()
  const termId = params.termId as string

  const [data, setData] = useState<TermData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('progress')
  const [remarkRows, setRemarkRows] = useState<RemarkRow[]>([])
  const [publishModal, setPublishModal] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    const result = await getTermDetails(termId)
    if (result.success && result.data) {
      const d = result.data as TermData
      setData(d)

      // Build remark rows
      const remarkMap = Object.fromEntries(d.remarks.map(r => [r.student_id, r.remark]))
      setRemarkRows(
        d.students.map(s => ({
          studentId: s.id,
          remark: remarkMap[s.id] || '',
          saving: false,
          saved: !!remarkMap[s.id],
        }))
      )
    }
    setLoading(false)
  }, [termId])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Remark save ───────────────────────────────────────────

  const handleSaveRemark = async (studentId: string) => {
    const row = remarkRows.find(r => r.studentId === studentId)
    if (!row || !row.remark.trim()) return

    setRemarkRows(prev => prev.map(r => r.studentId === studentId ? { ...r, saving: true } : r))

    const result = await saveRemark({ studentId, termId, remark: row.remark.trim() })

    setRemarkRows(prev => prev.map(r =>
      r.studentId === studentId
        ? { ...r, saving: false, saved: result.success }
        : r
    ))
  }

  // ── Publish ───────────────────────────────────────────────

  const handlePublish = async () => {
    setPublishing(true)
    setPublishError('')
    const result = await publishTerm(termId)
    if (result.success) {
      setPublishModal(false)
      fetchData()
    } else {
      setPublishError(result.error ?? 'Failed to publish.')
    }
    setPublishing(false)
  }

  // ── Progress calculations ─────────────────────────────────

  const getProgress = () => {
    if (!data) return { total: 0, withAnyScore: 0, fullyComplete: 0, subjectProgress: [] }

    const total = data.students.length * data.subjects.length
    const withAnyScore = data.results.filter(r => r.first_test !== null || r.second_test !== null || r.exam !== null).length
    const fullyComplete = data.results.filter(r => r.first_test !== null && r.second_test !== null && r.exam !== null).length

    const subjectProgress = data.subjects.map(subject => {
      const subjectResults = data.results.filter(r => r.subject_id === subject.id)
      const complete = subjectResults.filter(r => r.first_test !== null && r.second_test !== null && r.exam !== null).length
      return { subject, complete, total: data.students.length }
    })

    return { total, withAnyScore, fullyComplete, subjectProgress }
  }

  const progress = getProgress()

  const filteredRemarkRows = remarkRows.filter(row => {
    const student = data?.students.find(s => s.id === row.studentId)
    if (!student) return false
    const name = `${student.first_name} ${student.last_name}`.toLowerCase()
    const id = student.reference_number.toLowerCase()
    return name.includes(search.toLowerCase()) || id.includes(search.toLowerCase())
  })

  // ── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">Term not found.</div>
    )
  }

  const { term } = data
  const remarksAdded = remarkRows.filter(r => r.remark.trim()).length

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">

      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button
          onClick={() => router.push('/admin/terms')}
          className="p-2 hover:bg-gray-100 rounded-lg transition mt-0.5"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{term.name}</h1>
            <span className="text-sm text-gray-500">{term.session}</span>
            {term.is_published
              ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Published</span>
              : term.is_active
                ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">Active</span>
                : <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Draft</span>
            }
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {term.is_published
              ? `Published on ${new Date(term.published_at!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
              : 'Manage results and remarks for this term.'}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Users, label: 'Students', value: data.students.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: BookOpen, label: 'Subjects', value: data.subjects.length, color: 'text-purple-600', bg: 'bg-purple-50' },
          { icon: BarChart3, label: 'Fully Scored', value: `${progress.fullyComplete}/${data.students.length * data.subjects.length}`, color: 'text-orange-600', bg: 'bg-orange-50' },
          { icon: MessageSquare, label: 'Remarks', value: `${remarksAdded}/${data.students.length}`, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-gray-100 rounded-xl p-4">
            <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center mb-2`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className="text-xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-full sm:w-fit overflow-x-auto">
        {([
          { key: 'progress', label: 'Score Progress', icon: BarChart3 },
          { key: 'remarks', label: 'Student Remarks', icon: MessageSquare },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Score Progress Tab ──────────────────────────────── */}
      {tab === 'progress' && (
        <div className="space-y-3">
          {progress.subjectProgress.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-100 rounded-2xl">
              <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No subjects found. Add subjects first.</p>
            </div>
          ) : (
            progress.subjectProgress.map(({ subject, complete, total }) => {
              const pct = total > 0 ? Math.round((complete / total) * 100) : 0
              return (
                <div key={subject.id} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-800">{subject.name}</span>
                    <span className="text-xs text-gray-500">{complete} / {total} complete</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-orange-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{pct}% fully recorded</p>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Student Remarks Tab ─────────────────────────────── */}
      {tab === 'remarks' && (
        <div>
          {/* Search */}
          <input
            type="text"
            placeholder="Search student by name or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl mb-4
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {term.is_published ? (
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              <p className="text-sm text-green-700">This term has been published. Remarks are locked.</p>
            </div>
          ) : (
            <p className="text-xs text-gray-500 mb-4">
              Remarks are optional but recommended. Each remark will appear on the student&apos;s result sheet.
            </p>
          )}

          <div className="space-y-3">
            {filteredRemarkRows.map(row => {
              const student = data.students.find(s => s.id === row.studentId)
              if (!student) return null
              return (
                <div key={row.studentId} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">{student.reference_number}</p>
                    </div>
                    {row.saved && !term.is_published && (
                      <span className="text-xs text-green-600 flex items-center gap-1 shrink-0">
                        <CheckCircle className="w-3 h-3" /> Saved
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <textarea
                      rows={2}
                      disabled={term.is_published}
                      placeholder={`Add remark for ${student.first_name}...`}
                      value={row.remark}
                      onChange={e => setRemarkRows(prev =>
                        prev.map(r => r.studentId === row.studentId
                          ? { ...r, remark: e.target.value, saved: false }
                          : r
                        )
                      )}
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2
                        focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none
                        disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                    {!term.is_published && (
                      <button
                        onClick={() => handleSaveRemark(row.studentId)}
                        disabled={row.saving || !row.remark.trim()}
                        className="px-3 py-2 text-xs font-medium text-white rounded-lg
                          disabled:opacity-40 flex items-center gap-1 self-start shrink-0"
                        style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                      >
                        {row.saving
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Save className="w-3.5 h-3.5" />}
                        Save
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Publish bar ─────────────────────────────────────── */}
      {!term.is_published && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-gray-200 px-6 py-4 z-30">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Ready to publish?</p>
              <p className="text-xs text-gray-500">
                Students will be able to see their results once published. This cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setPublishModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg whitespace-nowrap shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              <Globe className="w-4 h-4" />
              Publish Results
            </button>
          </div>
        </div>
      )}

      {/* ── Publish Modal ────────────────────────────────────── */}
      {publishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
              <button onClick={() => setPublishModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Publish {term.name} Results?
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              All students will immediately be able to view their scores and remarks for{' '}
              <span className="font-medium text-gray-700">{term.name} — {term.session}</span>.
            </p>

            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-5">
              <p className="text-xs text-amber-700 font-medium mb-1">Before you publish, confirm:</p>
              <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
                <li>All teachers have finished entering scores</li>
                <li>You have reviewed and added remarks where needed</li>
                <li>Results are accurate and final</li>
              </ul>
            </div>

            {publishError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {publishError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setPublishModal(false)}
                disabled={publishing}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex-1 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-60
                  flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
              >
                {publishing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</>
                  : <><Globe className="w-4 h-4" /> Publish Now</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}