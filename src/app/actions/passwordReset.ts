"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function submitPasswordResetRequest({
  reference_number,
  first_name,
  last_name,
  role,
  class_id,
}: {
  reference_number: string;
  first_name: string;
  last_name: string;
  role: "student" | "teacher";
  class_id?: string;
}) {
  const normalizedId = reference_number.trim().toUpperCase();

  // 1. Block if a pending/approved request already exists
  const { data: existingRequest } = await supabaseAdmin
    .from("password_reset_requests")
    .select("id, status")
    .eq("reference_number", normalizedId)
    .in("status", ["pending", "approved"])
    .maybeSingle();

  if (existingRequest) {
    return {
      success: false,
      error:
        "A reset request is already pending for this ID. Please contact your admin.",
    };
  }

  // 2. Verify identity against pre_registered tables
  // Generic error message on ALL failures — never reveal if ID exists
  const GENERIC_ERROR = "The information provided does not match our records.";

  if (role === "student") {
    const { data: student } = await supabaseAdmin
      .from("pre_registered_students")
      .select("first_name, last_name, class_id, is_registered")
      .eq("student_number", normalizedId)
      .maybeSingle();

    if (!student || !student.is_registered) {
      return { success: false, error: GENERIC_ERROR };
    }

    const nameMatch =
      student.first_name.toLowerCase().trim() ===
        first_name.toLowerCase().trim() &&
      student.last_name.toLowerCase().trim() === last_name.toLowerCase().trim();
    const classMatch = student.class_id === class_id;

    if (!nameMatch || !classMatch) {
      return { success: false, error: GENERIC_ERROR };
    }
  } else {
    const { data: teacher } = await supabaseAdmin
      .from("pre_registered_teachers")
      .select("first_name, last_name, is_registered")
      .eq("teacher_number", normalizedId)
      .maybeSingle();

    if (!teacher || !teacher.is_registered) {
      return { success: false, error: GENERIC_ERROR };
    }

    const nameMatch =
      teacher.first_name.toLowerCase().trim() ===
        first_name.toLowerCase().trim() &&
      teacher.last_name.toLowerCase().trim() === last_name.toLowerCase().trim();

    if (!nameMatch) {
      return { success: false, error: GENERIC_ERROR };
    }
  }

  // 3. Get user_id from profiles
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("reference_number", normalizedId)
    .eq("role", role)
    .maybeSingle();

  if (!profile) {
    return {
      success: false,
      error: "Account not found. Please contact your admin.",
    };
  }

  // 4. Insert verified reset request
  const { error: insertError } = await supabaseAdmin
    .from("password_reset_requests")
    .insert({
      user_id: profile.id,
      reference_number: normalizedId,
      role,
      full_name: `${first_name.trim()} ${last_name.trim()}`,
      class_id: class_id ?? null,
      status: "pending",
      verified: true,
    });

  if (insertError) {
    console.error("Reset request insert error:", insertError);
    return {
      success: false,
      error: "Failed to submit request. Please try again.",
    };
  }

  return { success: true };
}
// Replace the entire setNewPassword function with this:
export async function finalizePasswordReset() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated.", role: null };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_temp_login, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_temp_login) {
    return {
      success: false,
      error: "No password reset in progress.",
      role: null,
    };
  }

  // Clear temp login flag
  await supabaseAdmin
    .from("profiles")
    .update({ is_temp_login: false })
    .eq("id", user.id);

  // Mark reset request as used
  await supabaseAdmin
    .from("password_reset_requests")
    .update({ status: "used" })
    .eq("user_id", user.id)
    .eq("status", "approved");

  return { success: true, role: profile.role };
}
