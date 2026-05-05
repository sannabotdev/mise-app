import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  forbiddenResponse,
  getFamilyIdByPlanDayId,
  requireFamilyMember,
  requireUser,
  unauthorizedResponse,
} from '@/lib/server/authz'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const familyId = await getFamilyIdByPlanDayId(params.id)
  if (!familyId) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const allowed = await requireFamilyMember(user.id, familyId)
  if (!allowed) return forbiddenResponse()

  const body = await req.json()
  const patch = {
    ...(typeof body.cook_available === 'boolean' ? { cook_available: body.cook_available } : {}),
  }
  try {
    const updated = await prisma.planDay.update({
      where: { id: params.id },
      data: patch,
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}
