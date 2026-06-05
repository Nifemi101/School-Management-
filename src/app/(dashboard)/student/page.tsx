"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  User,
  BarChart2,
  ClipboardList,
  FileText,
  GraduationCap,
  ChevronRight,
  Trophy,
  Users,
} from "lucide-react";

interface StudentProfile {
  first_name: string;
  last_name: string;
  student_number: string;
  sex: string;
  class_name: string;
  guardian_name: string | null;
  guardian_phone: string | null;
}

interface Subject {
  id: string;
  name: string;
}

interface Result {
  id: string;
  score: number;
  grade: string;
  term: string;
  subjects: { name: string };
}

export default function StudentDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  const currentTerm = "First Term";
  const academicYear = new Date().getFullYear();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getInitials = () =>
    `${student?.first_name?.[0] || ""}${student?.last_name?.[0] || ""}`;

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/student-login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, role")
        .eq("id", user.id)
        .single();

      // Role check — redirect if not a student
      if (!profile || profile.role !== "student") {
        await supabase.auth.signOut();
        router.push("/student-login");
        return;
      }

      const { data: studentProfile } = await supabase
        .from("student_profiles")
        .select(
          "student_number, sex, guardian_name, guardian_phone, class_id, classes(name)"
        )
        .eq("id", user.id)
        .single();

      if (profile && studentProfile) {
        setStudent({
          first_name: profile.first_name,
          last_name: profile.last_name,
          student_number: studentProfile.student_number,
          sex: studentProfile.sex,
          class_name: (studentProfile.classes as any)?.name || "Not assigned",
          guardian_name: studentProfile.guardian_name,
          guardian_phone: studentProfile.guardian_phone,
        });

        const { data: studentSubjects } = await supabase
          .from("student_subjects")
          .select("subjects(id, name)")
          .eq("student_id", user.id);

        if (studentSubjects) {
          setSubjects(
            studentSubjects.map((ss: any) => ss.subjects).filter(Boolean)
          );
        }

        const { data: studentResults } = await supabase
          .from("results")
          .select("id, score, grade, term, subjects(name)")
          .eq("student_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (studentResults) setResults(studentResults as any);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 lg:static z-10">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <BarChart2 size={20} className="text-blue-600" />
          <span className="hidden sm:inline">Student Dashboard</span>
          <span className="sm:hidden">Dashboard</span>
        </h2>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {getInitials()}
          </div>
          <span className="text-sm font-medium text-gray-700 truncate max-w-[100px] sm:max-w-none">
            {student?.first_name} {student?.last_name}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Greeting Banner */}
        <div
          style={{
            background: "linear-gradient(to right, #1d4ed8, #2563eb, #3b82f6)",
          }}
          className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">{today}</p>
              <h3 className="text-2xl font-bold mb-1">
                {getGreeting()}, {student?.first_name}!
              </h3>
              <p className="text-blue-100 text-sm">
                {student?.class_name} · {currentTerm} · {academicYear}
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <span className="bg-white/20 text-white text-xs font-semibold px-4 py-2 rounded-lg border border-white/30 flex items-center gap-2">
                <GraduationCap size={14} />
                STUDENT
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "My Subjects",
              value: subjects.length,
              Icon: BookOpen,
              bg: "bg-blue-600",
              text: "text-blue-600",
              path: "/student/subjects",
            },
            {
              label: "My Results",
              value: results.length,
              Icon: ClipboardList,
              bg: "bg-emerald-600",
              text: "text-emerald-600",
              path: "/student/results",
            },
            {
              label: "Current Term",
              value: currentTerm,
              Icon: Trophy,
              bg: "bg-orange-500",
              text: "text-orange-600",
              path: "/student",
            },
            {
              label: "Academic Year",
              value: academicYear,
              Icon: Users,
              bg: "bg-purple-600",
              text: "text-purple-600",
              path: "/student",
            },
          ].map((card) => (
            <button
              key={card.label}
              onClick={() => router.push(card.path)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between hover:shadow-md transition-shadow text-left w-full"
            >
              <div>
                <p className="text-xs text-gray-500 mb-2">{card.label}</p>
                <p className={`text-2xl font-bold ${card.text}`}>
                  {card.value}
                </p>
              </div>
              <div
                className={`${card.bg} w-11 h-11 rounded-xl flex items-center justify-center shadow-sm`}
              >
                <card.Icon size={20} color="white" />
              </div>
            </button>
          ))}
        </div>

        {/* Profile and Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* My Profile */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User size={14} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">
                  My Profile
                </h3>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4 mb-5">
                <div
                  style={{
                    background:
                      "linear-gradient(to bottom right, #3b82f6, #1d4ed8)",
                  }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-sm"
                >
                  {getInitials()}
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-base">
                    {student?.first_name} {student?.last_name}
                  </p>
                  <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full mt-1">
                    <GraduationCap size={10} />
                    {student?.student_number}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  {
                    label: "Full Name",
                    value: `${student?.first_name} ${student?.last_name}`,
                  },
                  { label: "Student ID", value: student?.student_number },
                  { label: "Class", value: student?.class_name },
                  {
                    label: "Sex",
                    value: student?.sex
                      ? student.sex.charAt(0).toUpperCase() +
                        student.sex.slice(1)
                      : "—",
                  },
                  {
                    label: "Guardian",
                    value: student?.guardian_name || "Not provided",
                  },
                  {
                    label: "Guardian Phone",
                    value: student?.guardian_phone || "Not provided",
                  },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between py-2.5 gap-4">
                    <span className="text-xs text-gray-400 font-medium shrink-0">
                      {row.label}
                    </span>
                    <span className="text-xs font-semibold text-gray-700 text-right break-words">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
                <ClipboardList size={14} className="text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">
                Quick Actions
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {[
                {
                  icon: BookOpen,
                  label: "View My Subjects",
                  desc: "See all subjects you are enrolled in",
                  path: "/student/subjects",
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                  border: "border-blue-100",
                },
                {
                  icon: ClipboardList,
                  label: "View My Results",
                  desc: "Check your latest academic results",
                  path: "/student/results",
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                  border: "border-emerald-100",
                },
                {
                  icon: FileText,
                  label: "Study Materials",
                  desc: "Access materials uploaded by teachers",
                  path: "/student/materials",
                  color: "text-purple-600",
                  bg: "bg-purple-50",
                  border: "border-purple-100",
                },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => router.push(action.path)}
                  className={`w-full ${action.bg} border ${action.border} rounded-xl p-3 flex items-center justify-between group hover:shadow-sm transition-all`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <action.icon size={15} className={action.color} />
                    </div>
                    <div className="text-left">
                      <p className={`text-xs font-semibold ${action.color}`}>
                        {action.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {action.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Results */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                <ClipboardList size={14} className="text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">
                Recent Results
              </h3>
            </div>
            <button
              onClick={() => router.push("/student/results")}
              className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
            >
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-4 sm:px-5 py-3 text-left font-medium">Subject</th>
                  <th className="px-4 sm:px-5 py-3 text-left font-medium">Score</th>
                  <th className="px-4 sm:px-5 py-3 text-left font-medium">Grade</th>
                  <th className="px-4 sm:px-5 py-3 text-left font-medium hidden sm:table-cell">Term</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <ClipboardList size={32} className="text-gray-300" />
                        <p className="text-gray-400 text-sm">No results yet</p>
                        <p className="text-gray-300 text-xs">
                          Results will appear here once your teacher uploads
                          them
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  results.map((result) => (
                    <tr
                      key={result.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 sm:px-5 py-3 font-medium text-gray-800 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
                        {(result.subjects as any)?.name}
                      </td>
                      <td className="px-4 sm:px-5 py-3 text-gray-600 text-xs sm:text-sm">
                        {result.score}
                      </td>
                      <td className="px-4 sm:px-5 py-3">
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium">
                          {result.grade}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3 text-gray-500 text-[10px] sm:text-xs hidden sm:table-cell">
                        {result.term}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}