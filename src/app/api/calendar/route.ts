import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  forbiddenResponse,
  requireFamilyMember,
  requireUser,
  unauthorizedResponse,
} from '@/lib/server/authz'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const family_id = req.nextUrl.searchParams.get('family_id') ?? ''
  const from = req.nextUrl.searchParams.get('from') ?? ''
  const to = req.nextUrl.searchParams.get('to') ?? ''
  if (!family_id || !from || !to) return NextResponse.json({ error: 'missing_params' }, { status: 400 })
  const allowed = await requireFamilyMember(user.id, family_id)
  if (!allowed) return forbiddenResponse()

  const events = await prisma.calendarEvent.findMany({
    where: { family_id, date: { gte: new Date(from), lte: new Date(to) } },
    orderBy: [{ date: 'asc' }, { created_at: 'asc' }],
  })
  // normalize date/time to strings like Supabase returned
  const out = events.map((e) => ({
    ...e,
    date: e.date.toISOString().slice(0, 10),
    start_time: e.start_time ? e.start_time.toISOString().slice(11, 19) : null,
    end_time: e.end_time ? e.end_time.toISOString().slice(11, 19) : null,
  }))
  return NextResponse.json(out)
}

export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const body = await req.json()
  const { family_id, member_id, title, date, all_day, start_time, end_time } = body
  if (!family_id || !member_id || !title || !date) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }
  const allowed = await requireFamilyMember(user.id, family_id)
  if (!allowed) return forbiddenResponse()

  try {
    const created = await prisma.calendarEvent.create({
      data: {
        family_id,
        member_id,
        title,
        date: new Date(date),
        all_day: all_day ?? true,
        start_time: start_time ? new Date(`1970-01-01T${start_time}`) : null,
        end_time: end_time ? new Date(`1970-01-01T${end_time}`) : null,
        source: 'manual',
      },
    })
    return NextResponse.json({
      ...created,
      date: created.date.toISOString().slice(0, 10),
      start_time: created.start_time ? created.start_time.toISOString().slice(11, 19) : null,
      end_time: created.end_time ? created.end_time.toISOString().slice(11, 19) : null,
    })
  } catch {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}

