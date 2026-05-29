"use client";

import { deleteStudent } from "@/app/actions/deleteStudent";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Trash2,
  PlusSquare,
  ArrowLeft,
  GraduationCap,
  Filter,
  AlertTriangle,
  X,
} from "lucide-react";

interface Student {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  sex: string;
  is_registered: boolean;
  class_id: string | null;
  classes?: { name: string } | null;
}

interface Class {
  id: string;
  name: string;
}

// Custom Confirmation Modal Component
function ConfirmModal({
  studentNumber,
  onConfirm,
  onCancel,
}: {
  studentNumber: string;
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
            <h3 className="font-semibold text-gray-800">Delete Student</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-1">
          Are you sure you want to delete student:
        </p>
        <p className="text-sm font-semibold text-gray-800 mb-4">
          {studentNumber}
        </p>
        <p className="text-xs text-red-500 mb-6">
          ⚠️ This action cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmStudent, setConfirmStudent] = useState<{
    id: string;
    student_number: string;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: studentsData } = await supabase
      .from("pre_registered_students")
      .select(
        `
        id,
        student_number,
        first_name,
        last_name,
        sex,
        is_registered,
        class_id,
        classes ( name )
      `,
      )
      .order("created_at", { ascending: false });

    const { data: classesData } = await supabase
      .from("classes")
      .select("id, name")
      .order("name");

    if (studentsData) setStudents(studentsData as any);
    if (classesData) setClasses(classesData);
    setLoading(false);
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmStudent) return;
    const { id, student_number } = confirmStudent;

    setDeleting(id);
    setConfirmStudent(null);

    const result = await deleteStudent(id, student_number);

    if (result.success) {
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } else {
      console.error("Delete failed:", result.error);
      // Optionally show an error toast/message here
    }

    setDeleting(null);
  };

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.student_number.toLowerCase().includes(search.toLowerCase()) ||
      `${s.first_name} ${s.last_name}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesClass =
      selectedClass === "all" || s.class_id === selectedClass;
    return matchesSearch && matchesClass;
  });

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading students...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Custom Confirm Modal */}
      {confirmStudent && (
        <ConfirmModal
          studentNumber={confirmStudent.student_number}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmStudent(null)}
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
              <GraduationCap size={22} className="text-blue-600" />
              Students
            </h1>
            <p className="text-xs text-gray-500">
              {students.length} total students
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/admin/add-student")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <PlusSquare size={16} />
          Add Student
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by student ID or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative w-full sm:w-48">
          <Filter
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 sm:px-5 py-3 text-left">Student ID</th>
                <th className="px-4 sm:px-5 py-3 text-left">Full Name</th>
                <th className="px-4 sm:px-5 py-3 text-left hidden sm:table-cell">
                  Class
                </th>
                <th className="px-4 sm:px-5 py-3 text-left hidden md:table-cell">
                  Sex
                </th>
                <th className="px-4 sm:px-5 py-3 text-left hidden lg:table-cell">
                  Status
                </th>
                <th className="px-4 sm:px-5 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    {search || selectedClass !== "all"
                      ? "No students match your search."
                      : 'No students added yet. Click "Add Student" to get started.'}
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 sm:px-5 py-3 font-mono font-medium text-blue-600 text-xs sm:text-sm">
                      {student.student_number}
                    </td>
                    <td className="px-4 sm:px-5 py-3 font-medium text-gray-800 text-xs sm:text-sm">
                      {student.first_name} {student.last_name}
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-gray-600 text-xs sm:text-sm hidden sm:table-cell">
                      {(student.classes as any)?.name || (
                        <span className="text-gray-400 italic">No class</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 py-3 capitalize text-gray-600 text-xs sm:text-sm hidden md:table-cell">
                      {student.sex}
                    </td>
                    <td className="px-4 sm:px-5 py-3 hidden lg:table-cell">
                      {student.is_registered ? (
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium">
                          Registered
                        </span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 py-3">
                      <button
                        onClick={() =>
                          setConfirmStudent({
                            id: student.id,
                            student_number: student.student_number,
                          })
                        }
                        disabled={deleting === student.id}
                        className="p-1.5 sm:p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={14} className="sm:w-[15px] sm:h-[15px]" />
                      </button>
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
