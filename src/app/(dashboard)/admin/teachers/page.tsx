"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Trash2,
  PlusSquare,
  ArrowLeft,
  School,
  BookOpen,
  X,
  AlertTriangle,
  Plus,
  Loader2,
} from "lucide-react";
import {
  saveTeacherSubjects,
  deleteTeacher,
} from "@/app/actions/adminTeachers";

// ── Types ─────────────────────────────────────────────────────
interface TeacherAssignment {
  subject_id: string;
  subject_name: string;
  class_id: string;
  class_name: string;
}

interface Teacher {
  id: string;
  teacher_number: string;
  first_name: string;
  last_name: string;
  is_registered: boolean;
  assignments: TeacherAssignment[];
}

interface Subject {
  id: string;
  name: string;
}
interface Class {
  id: string;
  name: string;
}
type AssignRow = { key: number; subject_id: string; class_id: string };

// ── Confirm Delete Modal ──────────────────────────────────────
function ConfirmModal({
  teacherNumber,
  onConfirm,
  onCancel,
}: {
  teacherNumber: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <h3 className="font-semibold text-gray-800">Delete Teacher</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-1">
          Are you sure you want to delete teacher:
        </p>
        <p className="text-sm font-semibold text-gray-800 mb-3">
          {teacherNumber}
        </p>
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-5">
          <AlertTriangle size={13} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-500">This action cannot be undone.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assign Subjects Modal ─────────────────────────────────────
function AssignSubjectModal({
  teacher,
  allSubjects,
  allClasses,
  onClose,
  onSave,
}: {
  teacher: Teacher;
  allSubjects: Subject[];
  allClasses: Class[];
  onClose: () => void;
  onSave: (
    teacherId: string,
    assignments: { subject_id: string; class_id: string }[],
  ) => Promise<void>;
}) {
  const [rows, setRows] = useState<AssignRow[]>(
    teacher.assignments.length > 0
      ? teacher.assignments.map((a, i) => ({
          key: i,
          subject_id: a.subject_id,
          class_id: a.class_id ?? "general", // ✅ Fix 1: null → 'general'
        }))
      : [{ key: 0, subject_id: "", class_id: "" }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nextKey, setNextKey] = useState(teacher.assignments.length + 1);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { key: nextKey, subject_id: "", class_id: "" },
    ]);
    setNextKey((k) => k + 1);
  };

  const removeRow = (key: number) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const updateRow = (
    key: number,
    field: "subject_id" | "class_id",
    value: string,
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
    setError("");
  };

  const handleSave = async () => {
    const filled = rows.filter((r) => r.subject_id && r.class_id);

    const hasIncomplete = rows.some(
      (r) => (r.subject_id && !r.class_id) || (!r.subject_id && r.class_id),
    );
    if (hasIncomplete) {
      setError(
        "Each assignment must have both a subject and a class selected.",
      );
      return;
    }

    setSaving(true);
    await onSave(teacher.id, filled);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-gray-800">Assign Subjects</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {teacher.first_name} {teacher.last_name} ·{" "}
              {teacher.teacher_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_1fr_32px] gap-2 mb-2 px-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Subject
          </p>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Class
          </p>
          <div />
        </div>

        {/* Assignment rows */}
        <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[1fr_1fr_32px] gap-2 items-center"
            >
              {/* Subject */}
              <select
                value={row.subject_id}
                onChange={(e) =>
                  updateRow(row.key, "subject_id", e.target.value)
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select subject...</option>
                {allSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Class ✅ Fix 2: null guard on value */}
              <select
                value={row.class_id ?? ""}
                onChange={(e) =>
                  updateRow(row.key, "class_id", e.target.value)
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select class...</option>
                <option value="general">General (All Classes)</option>
                {allClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Remove */}
              <button
                onClick={() => removeRow(row.key)}
                className="w-8 h-8 flex items-center justify-center text-red-400
                  hover:bg-red-50 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Add row button */}
        <button
          onClick={addRow}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700
            font-medium mb-4 transition-colors"
        >
          <Plus size={14} />
          Add Assignment
        </button>

        {/* Error */}
        {error && (
          <div
            className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg
            px-3 py-2 mb-4 text-sm text-red-600"
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg
              text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm
              font-medium hover:bg-blue-700 transition-colors disabled:opacity-50
              flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving...
              </>
            ) : (
              "Save Assignments"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function TeachersPage() {
  const router = useRouter();
  const supabase = createClient();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmTeacher, setConfirmTeacher] = useState<{
    id: string;
    teacher_number: string;
  } | null>(null);
  const [assigningTeacher, setAssigningTeacher] = useState<Teacher | null>(
    null,
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [
      { data: teachersData },
      { data: subjectsData },
      { data: classesData },
      { data: teacherSubjectsData },
    ] = await Promise.all([
      supabase
        .from("pre_registered_teachers")
        .select("id, teacher_number, first_name, last_name, is_registered")
        .order("created_at", { ascending: false }),

      supabase.from("subjects").select("id, name").order("name"),

      supabase.from("classes").select("id, name").order("name"),

      supabase
        .from("teacher_subjects")
        .select(
          "teacher_id, subject_id, class_id, subjects(id, name), classes(id, name)",
        ),
    ]);

    if (teachersData) {
      const enriched = teachersData.map((t: any) => ({
        ...t,
        assignments: (teacherSubjectsData ?? [])
          .filter((ts: any) => ts.teacher_id === t.id)
          .map((ts: any) => ({
            subject_id: ts.subject_id,
            subject_name: Array.isArray(ts.subjects)
              ? ts.subjects[0]?.name
              : (ts.subjects?.name ?? ""),
            class_id: ts.class_id,
            class_name: Array.isArray(ts.classes)
              ? ts.classes[0]?.name
              : (ts.classes?.name ?? ""),
          })),
      }));
      setTeachers(enriched);
    }

    if (subjectsData) setSubjects(subjectsData);
    if (classesData) setClasses(classesData);
    setLoading(false);
  };

  const handleSaveSubjects = async (
    teacherId: string,
    assignments: { subject_id: string; class_id: string }[],
  ) => {
    const result = await saveTeacherSubjects(teacherId, assignments);
    if (!result.success) {
      alert(result.error);
      return;
    }
    await fetchData();
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmTeacher) return;
    setDeleting(confirmTeacher.id);
    setConfirmTeacher(null);
    await deleteTeacher(confirmTeacher.id, confirmTeacher.teacher_number);
    await fetchData();
    setDeleting(null);
  };

  const filtered = teachers.filter(
    (t) =>
      t.teacher_number.toLowerCase().includes(search.toLowerCase()) ||
      `${t.first_name} ${t.last_name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading teachers...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {confirmTeacher && (
        <ConfirmModal
          teacherNumber={confirmTeacher.teacher_number}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmTeacher(null)}
        />
      )}

      {assigningTeacher && (
        <AssignSubjectModal
          teacher={assigningTeacher}
          allSubjects={subjects}
          allClasses={classes}
          onClose={() => setAssigningTeacher(null)}
          onSave={handleSaveSubjects}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin")}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <School size={22} className="text-blue-600" />
              Teachers
            </h1>
            <p className="text-xs text-gray-500">
              {teachers.length} total teachers
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/admin/add-teacher")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium
            hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <PlusSquare size={16} />
          Add Teacher
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by teacher ID or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 sm:px-5 py-3 text-left">Teacher ID</th>
                <th className="px-4 sm:px-5 py-3 text-left">Full Name</th>
                <th className="px-4 sm:px-5 py-3 text-left hidden md:table-cell">
                  Assignments
                </th>
                <th className="px-4 sm:px-5 py-3 text-left hidden sm:table-cell">
                  Status
                </th>
                <th className="px-4 sm:px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    {search
                      ? "No teachers match your search."
                      : "No teachers added yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((teacher) => (
                  <tr
                    key={teacher.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 sm:px-5 py-3 font-mono font-medium text-blue-600 text-xs sm:text-sm">
                      {teacher.teacher_number}
                    </td>
                    <td className="px-4 sm:px-5 py-3 font-medium text-gray-800 text-xs sm:text-sm">
                      {teacher.first_name} {teacher.last_name}
                    </td>
                    <td className="px-4 sm:px-5 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {teacher.assignments.length > 0 ? (
                          teacher.assignments.map((a, i) => (
                            <span
                              key={i}
                              className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-medium"
                            >
                              {a.subject_name}
                              {a.class_name ? (
                                <span className="text-blue-500">
                                  {" "}· {a.class_name}
                                </span>
                              ) : (
                                <span className="text-blue-400">
                                  {" "}· General
                                </span>
                              )}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 italic text-[10px]">
                            No assignments
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 py-3 hidden sm:table-cell">
                      {teacher.is_registered ? (
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                          Registered
                        </span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 py-3">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          onClick={() => setAssigningTeacher(teacher)}
                          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs
                            font-medium text-blue-600 border border-blue-200 rounded-lg
                            hover:bg-blue-50 transition-colors"
                        >
                          <BookOpen size={12} />
                          Assign
                        </button>
                        <button
                          onClick={() =>
                            setConfirmTeacher({
                              id: teacher.id,
                              teacher_number: teacher.teacher_number,
                            })
                          }
                          disabled={deleting === teacher.id}
                          className="p-1.5 sm:p-2 text-red-400 hover:bg-red-50 rounded-lg
                            transition-colors disabled:opacity-50"
                        >
                          {deleting === teacher.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}