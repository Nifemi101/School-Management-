"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default function StudentLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({ student_number: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fakeEmail = `${form.student_number.toLowerCase()}@student.school.edu`;

    let attempts = 0;
    let result = null;

    while (attempts < 2) {
      try {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: fakeEmail,
            password: form.password,
          });

        if (signInError) {
          setError("Invalid Student ID or password");
          setLoading(false);
          return;
        }

        result = data;
        break;
      } catch {
        attempts++;
        if (attempts === 2) {
          setError(
            "Connection failed. Please check your internet and try again.",
          );
          setLoading(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (!result) return;

   const { data: profile } = await supabase
  .from("profiles")
  .select("role, is_temp_login")
  .eq("id", result.user.id)
  .single()

if (profile?.role !== "student") {
  setError("This account is not a student account")
  await supabase.auth.signOut()
  setLoading(false)
  return
}

if (profile?.is_temp_login) {
  router.push("/set-new-password")
  return
}

router.push("/student")
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <GraduationCap size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Student Login</h1>
            <p className="text-xs text-gray-500">
              Sign in with your Student ID and password
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="student_number"
              value={form.student_number}
              onChange={handleChange}
              required
              placeholder="e.g. STU2024001"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>

          <div className="text-center mt-4">
            <Link
              href="/student-forgot-password"
              className="text-sm text-gray-500 hover:text-blue-600 transition"
            >
              Forgot your password?
            </Link>
          </div>

          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/student-signup")}
              className="text-blue-600 font-medium hover:underline"
            >
              Sign up
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
