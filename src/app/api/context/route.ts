import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-server'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const member = await prisma.member.findFirst({
    where: { user_id: user.id },
    include: { family: true },
  })
  if (!member || !member.family) {
    return NextResponse.json({ family: null, members: [], currentMember: null, userId: user.id })
  }

  const members = await prisma.member.findMany({
    where: { family_id: member.family_id },
    orderBy: { created_at: 'asc' },
  })

  return NextResponse.json({
    family: member.family,
    members,
    currentMember: member,
    userId: user.id,
  })
}

