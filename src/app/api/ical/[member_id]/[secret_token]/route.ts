import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { member_id: string; secret_token: string } }
) {
  const member = await prisma.member.findFirst({
    where: { id: params.member_id, ical_secret_token: params.secret_token },
    select: { id: true, name: true },
  })

  if (!member) return new NextResponse('Not found', { status: 404 })

  const meals = await prisma.mealAttendee.findMany({
    where: { member_id: params.member_id },
    include: {
      meal: {
        include: { plan_day: { select: { date: true } } },
      },
    },
  })

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mise//Family Meal Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${member.name} – Mise`,
  ]

  for (const row of meals ?? []) {
    const meal = row.meal as unknown as { name: string; meal_type: string; plan_day: { date: Date } }
    if (!meal?.plan_day?.date) continue
    const date = meal.plan_day.date.toISOString().slice(0, 10).replace(/-/g, '')
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
