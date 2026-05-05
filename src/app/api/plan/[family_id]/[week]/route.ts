import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { forbiddenResponse, requireFamilyMember, requireUser, unauthorizedResponse } from '@/lib/server/authz'

export async function GET(
  _req: NextRequest,
  { params }: { params: { family_id: string; week: string } }
) {
  const log = createLogger(`GET /api/plan/${params.family_id}/${params.week}`)
  try {
    const user = await requireUser()
    if (!user) return unauthorizedResponse()
    const allowed = await requireFamilyMember(user.id, params.family_id)
    if (!allowed) return forbiddenResponse()

    const weekStart = new Date(params.week)

    const weekPlan = await prisma.weekPlan.findFirst({
      where: { family_id: params.family_id, week_start_date: weekStart },
    })
    if (!weekPlan) return NextResponse.json(null)

    const days = await prisma.planDay.findMany({
      where: { week_plan_id: weekPlan.id },
      orderBy: { date: 'asc' },
      include: {
        meals: {
          include: { meal_attendees: { select: { member_id: true } } },
        },
      },
    })

    return NextResponse.json({ ...weekPlan, days })
  } catch (e) {
    log.error('loading plan failed', e)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { family_id: string; week: string } }
) {
  const log = createLogger(`DELETE /api/plan/${params.family_id}/${params.week}`)
  log.info('start')
  try {
    const user = await requireUser()
    if (!user) return unauthorizedResponse()
    const allowed = await requireFamilyMember(user.id, params.family_id)
    if (!allowed) return forbiddenResponse()

    const weekStart = new Date(params.week)

    const weekPlan = await prisma.weekPlan.findFirst({
      where: { family_id: params.family_id, week_start_date: weekStart },
      select: { id: true },
    })
    if (!weekPlan) {
      log.info('nothing to delete')
      return NextResponse.json({ success: true })
    }

    await prisma.shoppingItem.deleteMany({
      where: { family_id: params.family_id, last_updated_by_plan: { not: null } },
    })

    await prisma.weekPlan.delete({ where: { id: weekPlan.id } })

    log.info('deleted', weekPlan.id)
    return NextResponse.json({ success: true })
  } catch (e) {
    log.error('delete failed', e)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}
