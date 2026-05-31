'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Library, PlusSquare, Trash2, X,
  AlertTriangle, Search, BookOpen,
} from 'lucide-react'
import { addSubject, deleteSubject } from '@/app/actions/adminSubjects'

interface Subject {
  id: string
  name: string
  class_id: string | null
  classes?: { name: string } | null
  teacher_subjects?: {
    teacher_id: string
    pre_registered_teachers?: { first_name: string; last_name: string }
  }[]
}

interface Class {
  id: string
  name: string
}

// ── Confirm Delete Modal ──────────────────────────────────────
function ConfirmModal({
  subjectName,
  onConfirm,
  onCancel,
}: {
  subjectName: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <h3 className="font-semibold text-gray-800">Delete Subject</h3>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-1">Are you sure you want to delete:</p>
        <p className="text-sm font-semibold text-gray-800 mb-3">{subjectName}</p>
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-5">
          <AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-500">
            This will also remove it from all teacher assignments.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg
              text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 text-white py-2 rounded-lg
              text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Subject Modal ─────────────────────────────────────────
function AddSubjectModal({
  classes,
  onClose,
  onAdd,
}: {
  classes: Class[]
  onClose: () => void
  onAdd: (name: string, class_id: string) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  const [classId, setClassId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Subject name is required'); return }
    setLoading(true)
    setError('')
    const success = await onAdd(name.trim(), classId)
    setLoading(false)
    if (success) onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-gray-800">Add New Subject</h3>
            <p className="text-xs text-gray-500 mt-0.5">Fill in the subject details below</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="e.g. Mathematics, English Language"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class (Optional)
            </label>
            <select
              value={classId}
              onChange={e => setClassId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Leave blank if subject applies to all classes
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
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
              {loading ? 'Adding...' : 'Add Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function SubjectsPage() {
  const supabase = createClient()

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [search, setSearch] = useState('')
  const [selectedClass, setSelectedClass] = useState('all')
  const [loading, setLoading] = useState(true)
  const [confirmSubject, setConfirmSubject] = useState<{ id: string; name: string } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select(`
        id, name, class_id,
        classes ( name ),
        teacher_subjects (
          teacher_id,
          pre_registered_teachers ( first_name, last_name )
        )
      `)
      .order('name')

    const { data: classesData } = await supabase
      .from('classes')
      .select('id, name')
      .order('name')

    if (subjectsData) setSubjects(subjectsData as any)
    if (classesData) setClasses(classesData)
    setLoading(false)
  }

  const handleAddSubject = async (name: string, class_id: string): Promise<boolean> => {
    const result = await addSubject({ name, class_id: class_id || null })
    if (!result.success) {
      return false
    }
    await fetchData()
    return true
  }

  const handleDeleteConfirmed = async () => {
    if (!confirmSubject) return
    setDeleting(true)
    const result = await deleteSubject(confirmSubject.id)
    if (result.success) {
      setSubjects(prev => prev.filter(s => s.id !== confirmSubject.id))
    }
    setConfirmSubject(null)
    setDeleting(false)
  }

  const filtered = subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase())
    const matchesClass = selectedClass === 'all' || s.class_id === selectedClass
    return matchesSearch && matchesClass
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading subjects...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100 p-6">

      {confirmSubject && (
        <ConfirmModal
          subjectName={confirmSubject.name}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmSubject(null)}
        />
      )}

      {showAddModal && (
        <AddSubjectModal
          classes={classes}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddSubject}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Library size={22} className="text-blue-600" />
            Subjects
          </h1>
          <p className="text-xs text-gray-500">{subjects.length} total subjects</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium
            hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <PlusSquare size={16} />
          Add Subject
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search subjects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 sm:px-5 py-3 text-left">Subject</th>
                <th className="px-4 sm:px-5 py-3 text-left">Class</th>
                <th className="px-4 sm:px-5 py-3 text-left hidden sm:table-cell">
                  Assigned Teacher
                </th>
                <th className="px-4 sm:px-5 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-gray-400">
                    {search
                      ? 'No subjects match your search.'
                      : 'No subjects added yet. Click "Add Subject" to get started.'}
                  </td>
                </tr>
              ) : (
                filtered.map(subject => {
                  const teachers = subject.teacher_subjects || []
                  return (
                    <tr key={subject.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-5 py-3 font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} className="text-blue-500 shrink-0" />
                          <span className="truncate max-w-[120px] sm:max-w-none">
                            {subject.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3 text-gray-600">
                        {(subject.classes as any)?.name || (
                          <span className="text-gray-400 italic text-xs">All</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-5 py-3 hidden sm:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {teachers.length > 0 ? (
                            teachers.map((ts: any, i: number) => (
                              <span
                                key={i}
                                className="bg-green-100 text-green-700 px-2 py-0.5
                                  rounded-full text-[10px] font-medium"
                              >
                                {ts.pre_registered_teachers?.first_name}{' '}
                                {ts.pre_registered_teachers?.last_name}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 italic text-[10px]">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3">
                        <button
                          onClick={() => setConfirmSubject({ id: subject.id, name: subject.name })}
                          disabled={deleting}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg
                            transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}