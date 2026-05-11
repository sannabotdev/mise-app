import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: { member_id: string } }
) {
  const supabase = createServiceClient()
  const body = await req.json()
  const { events } = body

  if (!Array.isArray(events)) {
    return NextResponse.json({ error: 'events must be array' }, { status: 400 })
  }

  const { data: member } = await supabase
    .from('members')
    .select('family_id')
    .eq('id', params.member_id)
    .maybeSingle()
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const toInsert = events.map((e: {
    title: string; date: string; start_time?: string;
    end_time?: string; all_day?: boolean
  }) => ({
    family_id: member.family_id,
    member_id: params.member_id,
    title: e.title,
    date: e.date,
    start_time: e.start_time ?? null,
    end_time: e.end_time ?? null,
    all_day: e.all_day ?? false,
    source: 'google' as const,
  }))

  const { error } = await supabase.from('calendar_events').insert(toInsert)
  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 })

  return NextResponse.json({ success: true, count: toInsert.length })
}
