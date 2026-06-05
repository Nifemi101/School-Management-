"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  Users,
  Calendar,
  Trophy,
  BarChart2,
  ClipboardList,
  User,
  Pin,
  ChevronRight,
  GraduationCap,
} from "lucide-react";

interface TeacherProfile {
  first_name: string;
  last_name: string;
  teacher_number: string;
}

interface AssignedSubject {
  id: string;
  name: string;
  class_id: string | null;
  classes?: { name: string } | null;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [subjects, setSubjects] = useState<AssignedSubject[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
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
    `${teacher?.first_name?.[0] || ""}${teacher?.last_name?.[0] || ""}`;

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/teacher-login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

      const { data: teacherProfile, error: teacherError } = await supabase
        .from("teacher_profiles")
        .select("teacher_number")
        .eq("id", user.id)
        .single();

      if (!profile || !teacherProfile) {
        setLoading(false);
        return;
      }

      setTeacher({
        first_name: profile.first_name,
        last_name: profile.last_name,
        teacher_number: teacherProfile.teacher_number,
      });

      const { data: preTeacher } = await supabase
        .from("pre_registered_teachers")
        .select("id")
        .eq("teacher_number", teacherProfile.teacher_number)
        .single();

      if (!preTeacher) {
        setLoading(false);
        return;
      }

      const { data: teacherSubjects } = (await supabase
        .from("teacher_subjects")
        .select(`subjects ( id, name, class_id, classes ( name ) )`)
        .eq("teacher_id", preTeacher.id)) as {
        data: Array<{ subjects: AssignedSubject | null }> | null;
      };

      if (teacherSubjects) {
        const formatted = teacherSubjects
          .map((ts) => ts.subjects)
          .filter((s): s is AssignedSubject => s !== null && s !== undefined);

        setSubjects(formatted);

        const classIds = [
          ...new Set(
            formatted
              .filter((s) => s?.class_id)
              .map((s) => s.class_id as string),
          ),
        ];

        if (classIds.length > 0) {
          const { count } = await supabase
            .from("pre_registered_students")
            .select("*", { count: "exact", head: true })
            .in("class_id", classIds);
          setTotalStudents(count || 0);
        }
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
          <span className="hidden sm:inline">Teacher Dashboard</span>
          <span className="sm:hidden">Dashboard</span>
        </h2>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {getInitials()}
          </div>
          <span className="text-sm font-medium text-gray-700 truncate max-w-[100px] sm:max-w-none">
            {teacher?.first_name} {teacher?.last_name}
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
                {getGreeting()}, {teacher?.first_name}!
              </h3>
              <p className="text-blue-100 text-sm">
                You have {subjects.length} subject
                {subjects.length !== 1 ? "s" : ""} assigned this term
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <span className="bg-white/20 text-white text-xs font-semibold px-4 py-2 rounded-lg border border-white/30 flex items-center gap-2">
                <GraduationCap size={14} />
                TEACHER
              </span>
              <span className="text-blue-100 text-xs">
                {currentTerm} · {academicYear}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Subjects Assigned",
              value: subjects.length,
              Icon: BookOpen,
              bg: "bg-blue-600",
              text: "text-blue-600",
            },
            {
              label: "Total Students",
              value: totalStudents,
              Icon: Users,
              bg: "bg-emerald-600",
              text: "text-emerald-600",
            },
            {
              label: "Current Term",
              value: currentTerm,
              Icon: Trophy,
              bg: "bg-orange-500",
              text: "text-orange-600",
            },
            {
              label: "Academic Year",
              value: academicYear,
              Icon: Calendar,
              bg: "bg-purple-600",
              text: "text-purple-600",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between hover:shadow-md transition-shadow"
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
            </div>
          ))}
        </div>

        {/* Profile and Quick Tips */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* My Profile */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <User size={14} className="text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">
                My Profile
              </h3>
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
                    {teacher?.first_name} {teacher?.last_name}
                  </p>
                  <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full mt-1">
                    <GraduationCap size={10} />
                    {teacher?.teacher_number}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  {
                    label: "Full Name",
                    value: `${teacher?.first_name} ${teacher?.last_name}`,
                  },
                  { label: "Teacher ID", value: teacher?.teacher_number },
                  {
                    label: "Subjects",
                    value: `${subjects.length} assigned`,
                  },
                  { label: "Term", value: currentTerm },
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

          {/* Quick Tips */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <div className="w-7 h-7 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ClipboardList size={14} className="text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">
                Quick Tips
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {[
                {
                  icon: Pin,
                  text: "You can only enter results for subjects assigned to you.",
                  bg: "bg-blue-50",
                  border: "border-blue-100",
                  iconColor: "text-blue-500",
                  textColor: "text-blue-700",
                },
                {
                  icon: ClipboardList,
                  text: 'Use "Enter Results" to upload student scores for your subjects.',
                  bg: "bg-emerald-50",
                  border: "border-emerald-100",
                  iconColor: "text-emerald-500",
                  textColor: "text-emerald-700",
                },
                {
                  icon: Users,
                  text: 'Use "Take Attendance" to mark daily student attendance.',
                  bg: "bg-amber-50",
                  border: "border-amber-100",
                  iconColor: "text-amber-500",
                  textColor: "text-amber-700",
                },
              ].map((tip, i) => (
                <div
                  key={i}
                  className={`${tip.bg} border ${tip.border} rounded-xl p-3 flex items-start gap-3`}
                >
                  <div className={`mt-0.5 ${tip.iconColor} shrink-0`}>
                    <tip.icon size={14} />
                  </div>
                  <p className={`text-xs ${tip.textColor} leading-relaxed`}>
                    {tip.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Assigned Subjects Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
              <BookOpen size={14} className="text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">
              My Assigned Subjects
            </h3>
            <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
              {subjects.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-4 sm:px-5 py-3 text-left font-medium">Class</th>
                  <th className="px-4 sm:px-5 py-3 text-left font-medium">Subject</th>
                  <th className="px-4 sm:px-5 py-3 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subjects.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <BookOpen size={32} className="text-gray-300" />
                        <p className="text-gray-400 text-sm">
                          No subjects assigned yet
                        </p>
                        <p className="text-gray-300 text-xs">
                          Contact your admin to get subjects assigned
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  subjects.map((subject, i) => (
                    <tr
                      key={i}
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-4 sm:px-5 py-3.5">
                        <span className="bg-gray-100 text-gray-700 text-[10px] sm:text-xs font-medium px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg truncate inline-block max-w-[80px] sm:max-w-none">
                          {(subject.classes as { name: string } | null)?.name ||
                            "All"}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-100 rounded-lg hidden xs:flex items-center justify-center shrink-0">
                            <BookOpen size={13} className="text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-800 text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">
                            {subject.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3.5">
                        <button
                          onClick={() => router.push("/teacher/results")}
                          className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1.5 sm:px-3 rounded-lg text-[10px] sm:text-xs font-medium hover:bg-blue-700 transition-colors"
                        >
                          <ClipboardList size={12} className="hidden xs:inline" />
                          <span className="xs:hidden">Enter</span>
                          <span className="hidden xs:inline">Enter Results</span>
                          <ChevronRight size={12} className="hidden sm:inline" />
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
    </div>
  );
}
