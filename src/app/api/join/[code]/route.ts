import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const body = await req.json()
  const { name, preferences, dislikes } = body
  if (!name?.trim()) return NextResponse.json({ error: 'name_required' }, { status: 400 })

  const family = await prisma.family.findUnique({
    where: { invite_code: params.code.toUpperCase() },
    select: { id: true },
  })
  if (!family) return NextResponse.json({ error: 'invalid_code' }, { status: 404 })

  try {
    const member = await prisma.member.create({
      data: {
        family_id: family.id,
        name: name.trim(),
        is_child: false,
        preferences: Array.isArray(preferences) ? preferences : [],
        dislikes: Array.isArray(dislikes) ? dislikes : [],
      },
    })

    return NextResponse.json({ family_id: family.id, member })
  } catch {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}

