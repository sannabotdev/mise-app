import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbiddenResponse, requireFamilyMember, requireUser, unauthorizedResponse } from '@/lib/server/authz'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const family_id = req.nextUrl.searchParams.get('family_id')
  if (!family_id) return NextResponse.json({ error: 'missing_family_id' }, { status: 400 })
  const allowed = await requireFamilyMember(user.id, family_id)
  if (!allowed) return forbiddenResponse()
  const data = await prisma.familyWish.findMany({
    where: { family_id },
    orderBy: { created_at: 'asc' },
  })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const { family_id, member_id, wish_text } = await req.json()
  if (!family_id || !wish_text?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const allowed = await requireFamilyMember(user.id, family_id)
  if (!allowed) return forbiddenResponse()
  try {
    const data = await prisma.familyWish.create({
      data: { family_id, member_id: member_id || null, wish_text: wish_text.trim() },
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const family_id = req.nextUrl.searchParams.get('family_id')
  if (!family_id) return NextResponse.json({ error: 'Missing family_id' }, { status: 400 })
  const allowed = await requireFamilyMember(user.id, family_id)
  if (!allowed) return forbiddenResponse()
  try {
    const res = await prisma.familyWish.deleteMany({ where: { family_id } })
    return NextResponse.json({ success: true, deleted: res.count })
  } catch {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}
