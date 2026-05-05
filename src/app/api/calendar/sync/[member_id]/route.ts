import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  forbiddenResponse,
  requireFamilyMember,
  requireUser,
  unauthorizedResponse,
} from '@/lib/server/authz'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: { member_id: string } }
) {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const body = await req.json()
  const { events } = body

  if (!Array.isArray(events)) {
    return NextResponse.json({ error: 'events must be array' }, { status: 400 })
  }

  const member = await prisma.member.findUnique({
    where: { id: params.member_id },
    select: { family_id: true },
  })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  const allowed = await requireFamilyMember(user.id, member.family_id)
  if (!allowed) return forbiddenResponse()

  // Upsert incoming google events
  const toUpsert = events.map((e: {
    title: string; date: string; start_time?: string;
    end_time?: string; all_day?: boolean
  }) => ({
    family_id: member.family_id,
    member_id: params.member_id,
    title: e.title,
    date: new Date(e.date),
    start_time: e.start_time ? new Date(`1970-01-01T${e.start_time}`) : null,
    end_time: e.end_time ? new Date(`1970-01-01T${e.end_time}`) : null,
    all_day: e.all_day ?? false,
    source: 'google' as const,
  }))

  try {
    await prisma.calendarEvent.createMany({ data: toUpsert })
  } catch {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: toUpsert.length })
}
