'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen, Plus, Loader2, CheckCircle, Radio,
  Trash2, AlertCircle, ChevronRight, X, Calendar,
} from 'lucide-react'
import { getTerms, createTerm, setActiveTerm, deleteTerm } from '@/app/actions/adminTerms'

type Term = {
  id: string
  name: string
  session: string
  is_active: boolean
  is_published: boolean
  published_at: string | null
  created_at: string
}

const TERM_NAMES = ['First Term', 'Second Term', 'Third Term']

export default function TermsPage() {
  const router = useRouter()
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; term: Term | null }>({ open: false, term: null })
  const [form, setForm] = useState({ name: 'First Term', session: '' })
  const [saving, setSaving] = useState(false)
  const [activating, setActivating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const fetchTerms = useCallback(async () => {
    setLoading(true)
    const result = await getTerms()
    if (result.success && result.data) setTerms(result.data as Term[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTerms() }, [fetchTerms])

  const handleCreate = async () => {
    setFormError('')
    if (!form.session.trim()) { setFormError('Please enter a session e.g. 2025/2026'); return }

    setSaving(true)
    const result = await createTerm({ name: form.name, session: form.session.trim() })
    if (result.success) {
      setCreateModal(false)
      setForm({ name: 'First Term', session: '' })
      fetchTerms()
    } else {
      setFormError(result.error ?? 'Failed to create term.')
    }
    setSaving(false)
  }

  const handleSetActive = async (termId: string) => {
    setActivating(termId)
    const result = await setActiveTerm(termId)
    if (result.success) fetchTerms()
    else setError(result.error ?? 'Failed to activate term.')
    setActivating(null)
  }

  const handleDelete = async () => {
    if (!deleteModal.term) return
    setDeleting(true)
    const result = await deleteTerm(deleteModal.term.id)
    if (result.success) {
      setDeleteModal({ open: false, term: null })
      fetchTerms()
    } else {
      setError(result.error ?? 'Failed to delete term.')
      setDeleting(false)
    }
  }

  const activeTerm = terms.find(t => t.is_active)

  const statusBadge = (term: Term) => {
    if (term.is_published) return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Published</span>
    if (term.is_active) return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">Active</span>
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Draft</span>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Terms & Results
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage academic terms, enter results, and publish student scores.
          </p>
        </div>
        <button
          onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-lg"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
        >
          <Plus className="w-4 h-4" />
          New Term
        </button>
      </div>

      {/* Active term banner */}
      {activeTerm && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6">
          <Radio className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Active term:</span>{' '}
            {activeTerm.name} — {activeTerm.session}. Teachers are currently entering results for this term.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Terms list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : terms.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl">
          <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 mb-1">No terms yet</p>
          <p className="text-xs text-gray-400">Create your first term to start recording results.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {terms.map(term => (
            <div
              key={term.id}
              className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-sm transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{term.name}</span>
                  {statusBadge(term)}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {term.session}
                  </span>
                  {term.is_published && term.published_at && (
                    <span>Published {new Date(term.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!term.is_published && !term.is_active && (
                  <button
                    onClick={() => handleSetActive(term.id)}
                    disabled={activating === term.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600
                      border border-blue-200 rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
                  >
                    {activating === term.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Radio className="w-3 h-3" />}
                    Set Active
                  </button>
                )}

                {!term.is_published && (
                  <button
                    onClick={() => setDeleteModal({ open: true, term })}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => router.push(`/admin/terms/${term.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700
                    border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  {term.is_published ? 'View' : 'Manage'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Create New Term</h3>
              <button onClick={() => { setCreateModal(false); setFormError('') }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Term Name</label>
                <select
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {TERM_NAMES.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Academic Session</label>
                <input
                  type="text"
                  placeholder="e.g. 2025/2026"
                  value={form.session}
                  onChange={e => setForm({ ...form, session: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setCreateModal(false); setFormError('') }}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-60
                  flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Term'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.open && deleteModal.term && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-1">Delete Term?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will permanently delete{' '}
              <span className="font-semibold text-gray-800">
                {deleteModal.term.name} — {deleteModal.term.session}
              </span>{' '}
              and all results entered for it.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, term: null })}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg
                  disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}