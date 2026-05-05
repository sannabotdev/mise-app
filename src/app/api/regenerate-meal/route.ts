import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { forbiddenResponse, requireFamilyMember, requireUser, unauthorizedResponse } from '@/lib/server/authz'
import { regenerateMealAndRefreshShopping } from '@/server/services/meal-regeneration.service'

export const runtime = 'nodejs'

const log = createLogger('POST /api/regenerate-meal')

export async function POST(req: NextRequest) {
  log.info('start')
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const { meal_id, family_id } = await req.json()
  if (!meal_id || !family_id) {
    log.warn('missing params', { meal_id, family_id })
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }
  log.info('params', { meal_id, family_id })
  const allowed = await requireFamilyMember(user.id, family_id)
  if (!allowed) return forbiddenResponse()
  try {
    await regenerateMealAndRefreshShopping({ mealId: meal_id, familyId: family_id })
    log.info('done')
    return NextResponse.json({ success: true })
  } catch (err) {
    log.error('meal regeneration failed', err)
    return NextResponse.json({ error: 'meal_regeneration_failed' }, { status: 500 })
  }
}
