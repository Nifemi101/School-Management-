'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ── Helpers ──────────────────────────────────────────────────

function generateTempPassword(): string {
  const letters = Math.random().toString(36).substring(2, 5).toUpperCase()
  const digits = Math.floor(1000 + Math.random() * 9000)
  return `Apex@${letters}${digits}`
}

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return profile?.role === 'admin'
}

// ── Fetch all requests ────────────────────────────────────────

export async function getResetRequests() {
  const isAdmin = await verifyAdmin()
  if (!isAdmin) return { success: false, error: 'Unauthorized', data: null }

  const { data, error } = await supabaseAdmin
    .from('password_reset_requests')
    .select(`
      id,
      reference_number,
      full_name,
      role,
      status,
      temp_password,
      temp_password_expires_at,
      created_at,
      class_id,
      classes ( name )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return { success: false, error: 'Failed to fetch requests.', data: null }
  return { success: true, data }
}

// ── Approve request ───────────────────────────────────────────

export async function approveResetRequest(requestId: string) {
  const isAdmin = await verifyAdmin()
  if (!isAdmin) return { success: false, error: 'Unauthorized', tempPassword: null }

  // Get the request
  const { data: request } = await supabaseAdmin
    .from('password_reset_requests')
    .select('user_id, status')
    .eq('id', requestId)
    .maybeSingle()

  if (!request) return { success: false, error: 'Request not found.', tempPassword: null }
  if (request.status !== 'pending') return { success: false, error: 'Request is no longer pending.', tempPassword: null }

  // Generate temp password
  const tempPassword = generateTempPassword()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  // Update Supabase Auth password
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    request.user_id,
    { password: tempPassword }
  )

  if (authError) {
    console.error('Auth update error:', authError)
    return { success: false, error: 'Failed to update password. Try again.', tempPassword: null }
  }

  // Flag profile as temp login
  await supabaseAdmin
    .from('profiles')
    .update({ is_temp_login: true })
    .eq('id', request.user_id)

  // Update request record
  const { error: updateError } = await supabaseAdmin
    .from('password_reset_requests')
    .update({
      status: 'approved',
      temp_password: tempPassword,
      temp_password_expires_at: expiresAt,
    })
    .eq('id', requestId)

  if (updateError) {
    return { success: false, error: 'Password changed but status update failed.', tempPassword: null }
  }

  return { success: true, tempPassword }
}

// ── Decline request ───────────────────────────────────────────

export async function declineResetRequest(requestId: string) {
  const isAdmin = await verifyAdmin()
  if (!isAdmin) return { success: false, error: 'Unauthorized' }

  const { error } = await supabaseAdmin
    .from('password_reset_requests')
    .update({ status: 'expired' })
    .eq('id', requestId)
    .eq('status', 'pending') // safety: only decline pending ones

  if (error) return { success: false, error: 'Failed to decline request.' }
  return { success: true }
}