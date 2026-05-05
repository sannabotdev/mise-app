import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { forbiddenResponse, requireFamilyMember, requireUser, unauthorizedResponse } from '@/lib/server/authz'
import { generateAndPersistPlan } from '@/server/services/plan-generation.service'

export const runtime = 'nodejs'

const log = createLogger('POST /api/generate-plan')

export async function POST(req: NextRequest) {
  log.info('start')
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const body = await req.json()
  const { family_id, week_start_date } = body as { family_id?: string; week_start_date?: string }
  if (!family_id || !week_start_date) {
    log.warn('missing params', { family_id, week_start_date })
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }
  const allowed = await requireFamilyMember(user.id, family_id)
  if (!allowed) return forbiddenResponse()

  try {
    const result = await generateAndPersistPlan({
      familyId: family_id,
      weekStartDate: week_start_date,
      activeMealTypes: body.active_meal_types,
      activeDays: body.active_days,
      cookAvailableDays: body.cook_available_days,
    })
    return NextResponse.json({ success: true, week_plan_id: result.weekPlanId })
  } catch (err) {
    log.error('plan generation failed', err)
    return NextResponse.json({ error: 'plan_generation_failed' }, { status: 500 })
  }
}
