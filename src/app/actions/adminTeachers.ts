"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function saveTeacherSubjects(
  teacherId: string,
  assignments: { subject_id: string; class_id: string }[],
) {
  // Check for duplicate subject+class combos before saving
  const seen = new Set<string>();
  for (const a of assignments) {
    const key = `${a.subject_id}-${a.class_id ?? "general"}`;
    if (seen.has(key)) {
      return {
        success: false,
        error: "Duplicate subject and class combination.",
      };
    }
    seen.add(key);
  }

  // Delete all existing assignments for this teacher
  await supabaseAdmin
    .from("teacher_subjects")
    .delete()
    .eq("teacher_id", teacherId);

  if (assignments.length === 0) return { success: true };

  const { error } = await supabaseAdmin.from("teacher_subjects").insert(
    assignments.map((a) => ({
      teacher_id: teacherId,
      subject_id: a.subject_id,
      class_id: a.class_id === "general" ? null : a.class_id,
    })),
  );

  if (error) {
    console.error("Save teacher subjects error:", error);
    return {
      success: false,
      error:
        "Failed to save. A subject+class combo may already be assigned to another teacher.",
    };
  }

  return { success: true };
}

export async function deleteTeacher(teacherId: string, teacherNumber: string) {
  // Find and delete auth user
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("reference_number", teacherNumber)
    .eq("role", "teacher")
    .maybeSingle();

  if (profile?.id) {
    await supabaseAdmin.auth.admin.deleteUser(profile.id);
    await supabaseAdmin.from("teacher_profiles").delete().eq("id", profile.id);
  }

  await supabaseAdmin
    .from("teacher_subjects")
    .delete()
    .eq("teacher_id", teacherId);

  const { error } = await supabaseAdmin
    .from("pre_registered_teachers")
    .delete()
    .eq("id", teacherId);

  if (error) return { success: false, error: "Failed to delete teacher." };
  return { success: true };
}
