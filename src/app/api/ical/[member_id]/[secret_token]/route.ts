import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { member_id: string; secret_token: string } }
) {
  const supabase = createServiceClient()

  const { data: member } = await supabase
    .from('members')
    .select('id, name')
    .eq('id', params.member_id)
    .eq('ical_secret_token', params.secret_token)
    .maybeSingle()

  if (!member) return new NextResponse('Not found', { status: 404 })

  const { data: attendees } = await supabase
    .from('meal_attendees')
    .select('meal:meals(name, meal_type, plan_day:plan_days(date))')
    .eq('member_id', params.member_id)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mise//Family Meal Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${member.name} – Mise`,
  ]

  for (const row of attendees ?? []) {
    const meal = row.meal as unknown as { name: string; meal_type: string; plan_day: { date: string } }
    if (!meal?.plan_day?.date) continue
    const date = meal.plan_day.date.slice(0, 10).replace(/-/g, '')
    const uid = `${date}-${meal.meal_type}-${params.member_id}@mise`
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART;VALUE=DATE:${date}`,
      `DTEND;VALUE=DATE:${date}`,
      `SUMMARY:${meal.meal_type === 'breakfast' ? '🌅' : meal.meal_type === 'lunch' ? '☀️' : '🌙'} ${meal.name}`,
      'END:VEVENT'
    )
  }

  lines.push('END:VCALENDAR')

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="mise-${member.name}.ics"`,
    },
  })
}
