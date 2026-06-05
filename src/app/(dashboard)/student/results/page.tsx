'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ClipboardList, BookOpen, TrendingUp, Award,
  Loader2, ChevronDown, MessageSquare, Info,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────
type Term = {
  id: string
  name: string
  session: string
  published_at: string | null
}

type ResultRow = {
  first_test: number | null
  second_test: number | null
  exam: number | null
  total: number | null
  grade: string | null
  subjects: { name: string } | { name: string }[] | null
}

// ── Grade badge ───────────────────────────────────────────────
function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return <span className="text-gray-300 text-xs">—</span>
  const styles: Record<string, string> = {
    A: 'bg-green-100 text-green-700',
    B: 'bg-blue-100 text-blue-700',
    C: 'bg-yellow-100 text-yellow-700',
    D: 'bg-orange-100 text-orange-700',
    E: 'bg-orange-100 text-orange-700',
    F: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${styles[grade] ?? 'bg-gray-100 text-gray-600'}`}>
      {grade}
    </span>
  )
}

// ── Score cell ────────────────────────────────────────────────
function ScoreCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-300">—</span>
  return <span className="text-gray-700">{value}</span>
}

// ── Page ──────────────────────────────────────────────────────
export default function StudentResultsPage() {
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null)
  const [results, setResults] = useState<ResultRow[]>([])
  const [remark, setRemark] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [resultsLoading, setResultsLoading] = useState(false)

  // ── Load published terms on mount ─────────────────────────
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('terms')
        .select('id, name, session, published_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (data?.length) {
        setTerms(data)
        setSelectedTerm(data[0]) // Default to most recent
      }
      setPageLoading(false)
    }
    load()
  }, [])

  // ── Load results when term changes ────────────────────────
  useEffect(() => {
    if (!selectedTerm) return
    const load = async () => {
      setResultsLoading(true)
      const supabase = createClient()

      const [{ data: resultsData }, { data: remarkData }] = await Promise.all([
        supabase
          .from('results')
          .select('first_test, second_test, exam, total, grade, subjects(name)')
          .eq('term_id', selectedTerm.id)
          .order('total', { ascending: false }),

        supabase
          .from('student_term_remarks')
          .select('remark')
          .eq('term_id', selectedTerm.id)
          .maybeSingle(),
      ])

      setResults((resultsData ?? []) as ResultRow[])
      setRemark(remarkData?.remark ?? null)
      setResultsLoading(false)
    }
    load()
  }, [selectedTerm])

  // ── Stats ─────────────────────────────────────────────────
  const scored = results.filter(r => r.total !== null)
  const average = scored.length
    ? Math.round(scored.reduce((sum, r) => sum + (r.total ?? 0), 0) / scored.length)
    : null
  const passed = scored.filter(r => (r.total ?? 0) >= 40).length
  const highest = scored.length ? Math.max(...scored.map(r => r.total ?? 0)) : null

  const getSubjectName = (subjects: ResultRow['subjects']) => {
    if (!subjects) return '—'
    if (Array.isArray(subjects)) return subjects[0]?.name ?? '—'
    return subjects.name ?? '—'
  }

  // ── Loading ───────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    )
  }

  // ── No published terms ────────────────────────────────────
  if (terms.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            My Results
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-gray-100 rounded-2xl">
          <ClipboardList className="w-14 h-14 text-gray-200 mb-4" />
          <p className="text-base font-semibold text-gray-500 mb-1">No results published yet</p>
          <p className="text-sm text-gray-400">Check back after your admin publishes term results.</p>
        </div>
      </div>
    )
  }

  // ── Main view ─────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            My Results
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            View your scores and remarks for each published term.
          </p>
        </div>

        {/* Term selector */}
        <div className="relative w-full sm:w-64 shrink-0">
          <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={selectedTerm?.id ?? ''}
            onChange={e => setSelectedTerm(terms.find(t => t.id === e.target.value) ?? null)}
            className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            {terms.map(t => (
              <option key={t.id} value={t.id}>{t.name} — {t.session}</option>
            ))}
          </select>
        </div>
      </div>

      {resultsLoading ? (
        <div className="flex items-center justify-center py-24 bg-white border border-gray-100 rounded-2xl">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>

      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-2xl">
          <Info className="w-10 h-10 text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">No results recorded for this term yet.</p>
        </div>

      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              {
                icon: BookOpen,
                label: 'Subjects',
                value: results.length,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                icon: TrendingUp,
                label: 'Average',
                value: average !== null ? `${average}%` : '—',
                color: 'text-purple-600',
                bg: 'bg-purple-50',
              },
              {
                icon: Award,
                label: 'Passed',
                value: `${passed} / ${results.length}`,
                color: 'text-green-600',
                bg: 'bg-green-50',
              },
              {
                icon: ClipboardList,
                label: 'Highest',
                value: highest ?? '—',
                color: 'text-orange-600',
                bg: 'bg-orange-50',
              },
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

          {/* Results table */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-4">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                {selectedTerm?.name} — {selectedTerm?.session}
              </p>
              {selectedTerm?.published_at && (
                <p className="text-xs text-gray-400">
                  Published{' '}
                  {new Date(selectedTerm.published_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-5 py-3 text-left">Subject</th>
                    <th className="px-5 py-3 text-center hidden sm:table-cell">
                      1st Test
                      <span className="block normal-case font-normal text-gray-400">/20</span>
                    </th>
                    <th className="px-5 py-3 text-center hidden sm:table-cell">
                      2nd Test
                      <span className="block normal-case font-normal text-gray-400">/20</span>
                    </th>
                    <th className="px-5 py-3 text-center hidden sm:table-cell">
                      Exam
                      <span className="block normal-case font-normal text-gray-400">/60</span>
                    </th>
                    <th className="px-5 py-3 text-center">
                      Total
                      <span className="block normal-case font-normal text-gray-400">/100</span>
                    </th>
                    <th className="px-5 py-3 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {results.map((result, i) => {
                    const passing = (result.total ?? 0) >= 40
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 font-medium text-gray-900">
                          {getSubjectName(result.subjects)}
                        </td>
                        <td className="px-5 py-4 text-center hidden sm:table-cell">
                          <ScoreCell value={result.first_test} />
                        </td>
                        <td className="px-5 py-4 text-center hidden sm:table-cell">
                          <ScoreCell value={result.second_test} />
                        </td>
                        <td className="px-5 py-4 text-center hidden sm:table-cell">
                          <ScoreCell value={result.exam} />
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`font-bold ${passing ? 'text-gray-900' : 'text-red-500'}`}>
                            {result.total ?? '—'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <GradeBadge grade={result.grade} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grade key */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { grade: 'A', range: '70–100', style: 'bg-green-100 text-green-700' },
              { grade: 'B', range: '60–69', style: 'bg-blue-100 text-blue-700' },
              { grade: 'C', range: '50–59', style: 'bg-yellow-100 text-yellow-700' },
              { grade: 'D', range: '45–49', style: 'bg-orange-100 text-orange-700' },
              { grade: 'E', range: '40–44', style: 'bg-orange-100 text-orange-700' },
              { grade: 'F', range: '0–39', style: 'bg-red-100 text-red-700' },
            ].map(g => (
              <span key={g.grade} className={`text-xs px-2.5 py-1 rounded-full font-medium ${g.style}`}>
                {g.grade} — {g.range}
              </span>
            ))}
          </div>

          {/* Admin remark */}
          {remark && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <p className="text-sm font-semibold text-gray-900">Class Teacher&apos;s Remark</p>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed italic">
                &ldquo;{remark}&rdquo;
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}