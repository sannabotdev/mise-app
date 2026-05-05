import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbiddenResponse, requireFamilyMember, requireUser, unauthorizedResponse } from '@/lib/server/authz'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const q = req.nextUrl.searchParams.get('q') ?? ''
  const family_id = req.nextUrl.searchParams.get('family_id') ?? ''

  if (!family_id || q.length < 1) return NextResponse.json([])
  const allowed = await requireFamilyMember(user.id, family_id)
  if (!allowed) return forbiddenResponse()
  try {
    const data = await prisma.productHistory.findMany({
      where: {
        family_id,
        name: { contains: q, mode: 'insensitive' },
      },
      select: { name: true, unit: true, category: true },
      take: 8,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
