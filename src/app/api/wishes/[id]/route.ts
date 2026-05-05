import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  forbiddenResponse,
  getFamilyIdByWishId,
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
  const familyId = await getFamilyIdByWishId(params.id)
  if (!familyId) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const allowed = await requireFamilyMember(user.id, familyId)
  if (!allowed) return forbiddenResponse()

  try {
    const { wish_text } = await req.json()
    if (!wish_text?.trim()) {
      return NextResponse.json({ error: 'Missing wish_text' }, { status: 400 })
    }
    const data = await prisma.familyWish.update({
      where: { id: params.id },
      data: { wish_text: wish_text.trim() },
    })
    return NextResponse.json(data)
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
  const familyId = await getFamilyIdByWishId(params.id)
  if (!familyId) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const allowed = await requireFamilyMember(user.id, familyId)
  if (!allowed) return forbiddenResponse()

  try {
    await prisma.familyWish.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}
