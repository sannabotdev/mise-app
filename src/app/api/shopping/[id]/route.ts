import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { coerceShoppingCategory } from '@/lib/domain/shopping'
import {
  forbiddenResponse,
  getFamilyIdByShoppingItemId,
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

  const familyId = await getFamilyIdByShoppingItemId(params.id)
  if (!familyId) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const allowed = await requireFamilyMember(user.id, familyId)
  if (!allowed) return forbiddenResponse()

  const body = await req.json()
  const patch = {
    ...(typeof body.amount === 'number' ? { amount: body.amount } : {}),
    ...(typeof body.unit === 'string' || body.unit === null ? { unit: body.unit } : {}),
    ...(typeof body.name === 'string' ? { name: body.name } : {}),
    ...(typeof body.checked === 'boolean' ? { checked: body.checked } : {}),
    ...(body.category !== undefined ? { category: coerceShoppingCategory(body.category) } : {}),
  }
  try {
    const updated = await prisma.shoppingItem.update({
      where: { id: params.id },
      data: patch,
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const familyId = await getFamilyIdByShoppingItemId(params.id)
  if (!familyId) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const allowed = await requireFamilyMember(user.id, familyId)
  if (!allowed) return forbiddenResponse()

  try {
    await prisma.shoppingItem.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}
