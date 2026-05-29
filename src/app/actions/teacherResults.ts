'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ── Get teacher's pre_registered_teachers.id ─────────────────
async function getTeacherPreRegId(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('reference_number')
    .eq('id', userId)
    .eq('role', 'teacher')
    .maybeSingle()

  if (!profile) return null

  const { data: preReg } = await supabaseAdmin
    .from('pre_registered_teachers')
    .select('id')
    .eq('teacher_number', profile.reference_number)
    .maybeSingle()

  return preReg?.id ?? null
}

// ── Initial page data ─────────────────────────────────────────
export async function getTeacherResultsData() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized', data: null }

  const preRegId = await getTeacherPreRegId(user.id)
  if (!preRegId) return { success: false, error: 'Teacher profile not found.', data: null }

  const [
    { data: activeTerm },
    { data: teacherSubjects },
    { data: classes },
  ] = await Promise.all([
    supabaseAdmin
      .from('terms')
      .select('id, name, session')
      .eq('is_active', true)
      .maybeSingle(),

    supabaseAdmin
      .from('teacher_subjects')
      .select('subject_id, subjects(id, name)')
      .eq('teacher_id', preRegId),

    supabaseAdmin
      .from('classes')
      .select('id, name')
      .order('name'),
  ])

  const subjects = (teacherSubjects ?? [])
    .map((ts: any) => ts.subjects)
    .filter(Boolean) as { id: string; name: string }[]

  return {
    success: true,
    data: {
      activeTerm: activeTerm ?? null,
      subjects,
      classes: classes ?? [],
    },
  }
}

// ── Students with existing scores for a class + subject ───────
export async function getStudentsForScoring(
  classId: string,
  subjectId: string,
  termId: string
) {
  const { data: students } = await supabaseAdmin
    .from('pre_registered_students')
    .select('student_number, first_name, last_name')
    .eq('class_id', classId)
    .eq('is_registered', true)
    .order('last_name')

  if (!students?.length) return { success: true, data: [] }

  // Get auth user IDs from profiles
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, reference_number')
    .in('reference_number', students.map(s => s.student_number))
    .eq('role', 'student')

  const authIdMap = Object.fromEntries(
    (profiles ?? []).map(p => [p.reference_number, p.id])
  )

  const authIds = Object.values(authIdMap)

  // Get existing results
  const { data: existingResults } = authIds.length
    ? await supabaseAdmin
        .from('results')
        .select('student_id, first_test, second_test, exam, total, grade')
        .eq('subject_id', subjectId)
        .eq('term_id', termId)
        .in('student_id', authIds)
    : { data: [] }

  const resultsMap = Object.fromEntries(
    (existingResults ?? []).map(r => [r.student_id, r])
  )

  return {
    success: true,
    data: students.map(s => {
      const authId = authIdMap[s.student_number] ?? null
      const result = authId ? (resultsMap[authId] ?? null) : null
      return {
        authId,
        student_number: s.student_number,
        first_name: s.first_name,
        last_name: s.last_name,
        first_test: result?.first_test ?? null,
        second_test: result?.second_test ?? null,
        exam: result?.exam ?? null,
        total: result?.total ?? null,
        grade: result?.grade ?? null,
      }
    }),
  }
}

// ── Save a single student's score ─────────────────────────────
function calcGrade(total: number) {
  if (total >= 70) return 'A'
  if (total >= 60) return 'B'
  if (total >= 50) return 'C'
  if (total >= 45) return 'D'
  if (total >= 40) return 'E'
  return 'F'
}

export async function saveStudentScore({
  studentAuthId,
  subjectId,
  termId,
  first_test,
  second_test,
  exam,
}: {
  studentAuthId: string
  subjectId: string
  termId: string
  first_test: number | null
  second_test: number | null
  exam: number | null
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Validate
  if (first_test !== null && (first_test < 0 || first_test > 20))
    return { success: false, error: 'First test: 0–20 only.' }
  if (second_test !== null && (second_test < 0 || second_test > 20))
    return { success: false, error: 'Second test: 0–20 only.' }
  if (exam !== null && (exam < 0 || exam > 60))
    return { success: false, error: 'Exam: 0–60 only.' }

  const allEntered = first_test !== null && second_test !== null && exam !== null
  const total = allEntered ? first_test! + second_test! + exam! : null
  const grade = total !== null ? calcGrade(total) : null

  const { error } = await supabaseAdmin
    .from('results')
    .upsert(
      { student_id: studentAuthId, subject_id: subjectId, term_id: termId, first_test, second_test, exam, total, grade },
      { onConflict: 'student_id,subject_id,term_id' }
    )

  if (error) {
    console.error('Save score error:', error)
    return { success: false, error: 'Failed to save. Try again.' }
  }

  return { success: true, total, grade }
}