'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function saveTeacherSubjects(
  teacherId: string,
  assignments: { subject_id: string; class_id: string }[]
) {
  // Normalize class_id: convert "general" → null
  const newAssignments = assignments.map(a => ({
    subject_id: a.subject_id,
    class_id: a.class_id === 'general' ? null : a.class_id,
  }))

  // Check for client-side duplicates
  const seen = new Set<string>()
  for (const a of newAssignments) {
    const key = `${a.subject_id}-${a.class_id ?? 'null'}`
    if (seen.has(key)) return { success: false, error: 'Duplicate subject and class combination.' }
    seen.add(key)
  }

  // Fetch current assignments from DB
  const { data: current } = await supabaseAdmin
    .from('teacher_subjects')
    .select('id, subject_id, class_id')
    .eq('teacher_id', teacherId)

  const currentList = current ?? []

  const normalize = (subjectId: string, classId: string | null) =>
    `${subjectId}-${classId ?? 'null'}`

  const newKeys = new Set(newAssignments.map(a => normalize(a.subject_id, a.class_id)))
  const currentKeys = new Set(currentList.map(c => normalize(c.subject_id, c.class_id)))

  // Delete only removed assignments
  const toDelete = currentList.filter(c => !newKeys.has(normalize(c.subject_id, c.class_id)))
  for (const item of toDelete) {
    await supabaseAdmin
      .from('teacher_subjects')
      .delete()
      .eq('id', item.id)
  }

  // Insert only new assignments
  const toInsert = newAssignments.filter(a => !currentKeys.has(normalize(a.subject_id, a.class_id)))
  if (toInsert.length > 0) {
    const { error } = await supabaseAdmin
      .from('teacher_subjects')
      .insert(
        toInsert.map(a => ({
          teacher_id: teacherId,
          subject_id: a.subject_id,
          class_id: a.class_id,
        }))
      )

    if (error) {
      console.error('Insert error:', error)
      return {
        success: false,
        error: `Failed to save: ${error.message}`,
      }
    }
  }

  return { success: true }
}

export async function deleteTeacher(teacherId: string, teacherNumber: string) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('reference_number', teacherNumber)
    .eq('role', 'teacher')
    .maybeSingle()

  if (profile?.id) {
    await supabaseAdmin.auth.admin.deleteUser(profile.id)
    await supabaseAdmin.from('teacher_profiles').delete().eq('id', profile.id)
  }

  await supabaseAdmin.from('teacher_subjects').delete().eq('teacher_id', teacherId)

  const { error } = await supabaseAdmin
    .from('pre_registered_teachers')
    .delete()
    .eq('id', teacherId)

  if (error) return { success: false, error: 'Failed to delete teacher.' }
  return { success: true }
}