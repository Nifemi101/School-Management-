'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function addSubject({
  name,
  class_id,
}: {
  name: string
  class_id: string | null
}) {
  // Check for duplicate
  const { data: existing } = await supabaseAdmin
    .from('subjects')
    .select('id')
    .eq('name', name.trim())
    .maybeSingle()

  if (existing) return { success: false, error: 'A subject with this name already exists.' }

  const { error } = await supabaseAdmin
    .from('subjects')
    .insert({ name: name.trim(), class_id: class_id || null })

  if (error) {
    console.error('Add subject error:', error)
    return { success: false, error: 'Failed to add subject. Please try again.' }
  }

  return { success: true }
}

export async function deleteSubject(subjectId: string) {
  // Remove teacher assignments first
  await supabaseAdmin
    .from('teacher_subjects')
    .delete()
    .eq('subject_id', subjectId)

  const { error } = await supabaseAdmin
    .from('subjects')
    .delete()
    .eq('id', subjectId)

  if (error) {
    console.error('Delete subject error:', error)
    return { success: false, error: 'Failed to delete subject.' }
  }

  return { success: true }
}