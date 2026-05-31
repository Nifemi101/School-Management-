'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function addTeacher({
  teacher_number,
  first_name,
  last_name,
}: {
  teacher_number: string
  first_name: string
  last_name: string
}) {
  // Check for duplicate teacher ID
  const { data: existing } = await supabaseAdmin
    .from('pre_registered_teachers')
    .select('id')
    .eq('teacher_number', teacher_number.trim().toUpperCase())
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'A teacher with this ID already exists.' }
  }

  // Insert
  const { error } = await supabaseAdmin
    .from('pre_registered_teachers')
    .insert({
      teacher_number: teacher_number.trim().toUpperCase(),
      first_name: first_name.trim(),
      last_name: last_name.trim(),
    })

  if (error) {
    console.error('Add teacher error:', error)
    return { success: false, error: 'Failed to add teacher. Please try again.' }
  }

  return { success: true }
}