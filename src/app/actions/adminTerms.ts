'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ── Auth guard ────────────────────────────────────────────────
async function verifyAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  return data?.role === 'admin'
}

// ── Terms CRUD ────────────────────────────────────────────────

export async function getTerms() {
  const isAdmin = await verifyAdmin()
  if (!isAdmin) return { success: false, data: null }

  const { data, error } = await supabaseAdmin
    .from('terms')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { success: false, data: null }
  return { success: true, data }
}

export async function createTerm({ name, session }: { name: string; session: string }) {
  const isAdmin = await verifyAdmin()
  if (!isAdmin) return { success: false, error: 'Unauthorized' }

  const { data: existing } = await supabaseAdmin
    .from('terms')
    .select('id')
    .eq('name', name)
    .eq('session', session)
    .maybeSingle()

  if (existing) return { success: false, error: `${name} already exists for ${session}.` }

  const { error } = await supabaseAdmin
    .from('terms')
    .insert({ name, session })

  if (error) return { success: false, error: 'Failed to create term.' }
  return { success: true }
}

export async function setActiveTerm(termId: string) {
  const isAdmin = await verifyAdmin()
  if (!isAdmin) return { success: false, error: 'Unauthorized' }

  // Deactivate all other terms first
  await supabaseAdmin
    .from('terms')
    .update({ is_active: false })
    .neq('id', termId)

  const { error } = await supabaseAdmin
    .from('terms')
    .update({ is_active: true })
    .eq('id', termId)

  if (error) return { success: false, error: 'Failed to set active term.' }
  return { success: true }
}

export async function deleteTerm(termId: string) {
  const isAdmin = await verifyAdmin()
  if (!isAdmin) return { success: false, error: 'Unauthorized' }

  const { data: term } = await supabaseAdmin
    .from('terms')
    .select('is_published')
    .eq('id', termId)
    .single()

  if (term?.is_published) return { success: false, error: 'Cannot delete a published term.' }

  const { error } = await supabaseAdmin
    .from('terms')
    .delete()
    .eq('id', termId)

  if (error) return { success: false, error: 'Failed to delete term.' }
  return { success: true }
}

// ── Term detail (remarks + progress) ─────────────────────────

export async function getTermDetails(termId: string) {
  const isAdmin = await verifyAdmin()
  if (!isAdmin) return { success: false, data: null }

  const [
    { data: term },
    { data: students },
    { data: remarks },
    { data: subjects },
    { data: results },
  ] = await Promise.all([
    supabaseAdmin.from('terms').select('*').eq('id', termId).single(),

    supabaseAdmin
      .from('profiles')
      .select('id, reference_number, first_name, last_name')
      .eq('role', 'student')
      .order('reference_number'),

    supabaseAdmin
      .from('student_term_remarks')
      .select('student_id, remark')
      .eq('term_id', termId),

    supabaseAdmin.from('subjects').select('id, name'),

    supabaseAdmin
      .from('results')
      .select('student_id, subject_id, first_test, second_test, exam, total')
      .eq('term_id', termId),
  ])

  if (!term) return { success: false, data: null }

  return {
    success: true,
    data: {
      term,
      students: students || [],
      remarks: remarks || [],
      subjects: subjects || [],
      results: results || [],
    },
  }
}

export async function saveRemark({
  studentId,
  termId,
  remark,
}: {
  studentId: string
  termId: string
  remark: string
}) {
  const isAdmin = await verifyAdmin()
  if (!isAdmin) return { success: false, error: 'Unauthorized' }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabaseAdmin
    .from('student_term_remarks')
    .upsert(
      { student_id: studentId, term_id: termId, remark, added_by: user?.id },
      { onConflict: 'student_id,term_id' }
    )

  if (error) return { success: false, error: 'Failed to save remark.' }
  return { success: true }
}

export async function publishTerm(termId: string) {
  const isAdmin = await verifyAdmin()
  if (!isAdmin) return { success: false, error: 'Unauthorized' }

  const { error } = await supabaseAdmin
    .from('terms')
    .update({ is_published: true, published_at: new Date().toISOString(), is_active: false })
    .eq('id', termId)

  if (error) return { success: false, error: 'Failed to publish term.' }
  return { success: true }
}