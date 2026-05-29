"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  GraduationCap,
  BookOpen,
  School,
  Library,
  Calendar,
  Clock,
  PlusSquare,
  BarChart2,
} from "lucide-react";

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
}

interface ClassStat {
  name: string;
  total: number;
  boys: number;
  girls: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0,
  });
  const [classStats, setClassStats] = useState<ClassStat[]>([]);
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/admin-login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    if (profile) setAdminName(`${profile.first_name} ${profile.last_name}`);

    const { count: studentCount } = await supabase
      .from("pre_registered_students")
      .select("*", { count: "exact", head: true });

    const { count: teacherCount } = await supabase
      .from("pre_registered_teachers")
      .select("*", { count: "exact", head: true });

    const { count: classCount } = await supabase
      .from("classes")
      .select("*", { count: "exact", head: true });

    const { count: subjectCount } = await supabase
      .from("subjects")
      .select("*", { count: "exact", head: true });

    setStats({
      totalStudents: studentCount || 0,
      totalTeachers: teacherCount || 0,
      totalClasses: classCount || 0,
      totalSubjects: subjectCount || 0,
    });

    const { data: classes } = await supabase.from("classes").select(`
      name,
      pre_registered_students (
        id,
        sex
      )
    `);

    if (classes) {
      const formatted = classes.map((c: any) => ({
        name: c.name,
        total: c.pre_registered_students?.length || 0,
        boys:
          c.pre_registered_students?.filter((s: any) => s.sex === "male")
            .length || 0,
        girls:
          c.pre_registered_students?.filter((s: any) => s.sex === "female")
            .length || 0,
      }));
      setClassStats(formatted);
    }

    setLoading(false);
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

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
    <div className="flex-1 p-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart2 size={22} className="text-blue-600" />
          Dashboard
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-4 py-2 rounded-lg shadow-sm w-full sm:w-auto">
          <span>Welcome,</span>
          <span className="font-semibold text-blue-600 truncate">{adminName}</span>
        </div>
      </div>

      {/* Greeting Banner */}
      <div className="bg-linear-to-r from-blue-700 to-blue-500 rounded-2xl p-5 mb-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold">
            {getGreeting()}, {adminName}!
          </h3>
          <p className="text-blue-100 text-sm mt-1 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {formatDate(currentTime)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {formatTime(currentTime)}
            </span>
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/add-student")}
          className="bg-white text-blue-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 w-full md:w-auto justify-center"
        >
          <PlusSquare size={16} />
          Add Student
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Students",
            value: stats.totalStudents,
            Icon: GraduationCap,
            color: "bg-green-500",
            path: "/admin/students",
          },
          {
            label: "Total Teachers",
            value: stats.totalTeachers,
            Icon: School,
            color: "bg-blue-500",
            path: "/admin/teachers",
          },
          {
            label: "Total Classes",
            value: stats.totalClasses,
            Icon: BookOpen,
            color: "bg-orange-500",
            path: "/admin/classes",
          },
          {
            label: "Total Subjects",
            value: stats.totalSubjects,
            Icon: Library,
            color: "bg-purple-500",
            path: "/admin/subjects",
          },
        ].map((card) => (
          <button
            key={card.label}
            onClick={() => router.push(card.path)}
            className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow text-left w-full"
          >
            <div>
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            </div>
            <div
              className={`${card.color} w-10 h-10 rounded-lg flex items-center justify-center`}
            >
              <card.Icon size={20} color="white" />
            </div>
          </button>
        ))}
      </div>

      {/* Class Statistics Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <BarChart2 size={18} className="text-blue-600" />
            Class Statistics
          </h3>
          <button
            onClick={() => router.push("/admin/add-student")}
            className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            <PlusSquare size={15} />
            Add Student
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 sm:px-5 py-3 text-left">Class Name</th>
                <th className="px-4 sm:px-5 py-3 text-left">Students</th>
                <th className="px-4 sm:px-5 py-3 text-left hidden sm:table-cell">Boys</th>
                <th className="px-4 sm:px-5 py-3 text-left hidden sm:table-cell">Girls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {classStats.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 sm:px-5 py-8 text-center text-gray-400"
                  >
                    No classes found. Add classes to see statistics here.
                  </td>
                </tr>
              ) : (
                classStats.map((cls, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-5 py-3 font-medium text-gray-800">
                      {cls.name}
                    </td>
                    <td className="px-4 sm:px-5 py-3">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {cls.total} <span className="hidden xs:inline">students</span>
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-3 hidden sm:table-cell">
                      <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {cls.boys}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-3 hidden sm:table-cell">
                      <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {cls.girls}
                      </span>
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