'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function deleteStudent(studentId: string, studentNumber: string) {
  // Verify caller is admin
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: adminProfile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (adminProfile?.role !== 'admin') return { success: false, error: 'Unauthorized' }

  // 1. Find the student's auth user via profiles
  const { data: studentProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('reference_number', studentNumber)
    .eq('role', 'student')
    .maybeSingle()

  // 2. Delete auth user — cascades to profiles row
  if (studentProfile?.id) {
    await supabaseAdmin.auth.admin.deleteUser(studentProfile.id)

    // Also clean up student_profiles in case cascade isn't set
    await supabaseAdmin
      .from('student_profiles')
      .delete()
      .eq('id', studentProfile.id)
  }

  // 3. Delete from pre_registered_students
  const { error } = await supabaseAdmin
    .from('pre_registered_students')
    .delete()
    .eq('id', studentId)

  if (error) {
    console.error('Delete student error:', error)
    return { success: false, error: 'Failed to delete student record.' }
  }

  return { success: true }
}