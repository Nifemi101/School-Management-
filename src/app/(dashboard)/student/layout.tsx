"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  FileText,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/student" },
  { label: "My Subjects", icon: BookOpen, path: "/student/subjects" },
  { label: "My Results", icon: ClipboardList, path: "/student/results" },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/student-login");
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleNavClick = (path: string) => {
    router.push(path);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#1e2a3b] text-white flex items-center justify-between px-4 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <p className="text-sm font-bold">APEX</p>
        </div>
        <button onClick={toggleSidebar} className="p-2 hover:bg-white/10 rounded-lg">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`w-64 bg-[#1e2a3b] text-white flex flex-col fixed h-full z-40 transition-transform duration-300 lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-5 border-b border-white/10 hidden lg:block">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">APEX</p>
              <p className="text-xs text-gray-400">International School</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 mt-16 lg:mt-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.path ||
              (item.path !== "/student" && pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white font-medium"
                    : "text-gray-300 hover:bg-white/10"
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">{children}</main>
    </div>
  );
}