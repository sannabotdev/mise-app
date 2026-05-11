import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { requireUser, unauthorizedResponse } from '@/lib/server/authz'
import { generateWeekPlan } from '@/lib/ai'
import { getMonday, isoDate } from '@/lib/date/week'
import type { Member, FamilyWish, CalendarEvent } from '@/types'

export const runtime = 'nodejs'

const log = createLogger('POST /api/generate-plan')

export async function POST(req: NextRequest) {
  log.info('start')
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const body = await req.json()
  const {
    weekStartDate,
    nutritionStyle,
    language,
    activeMealTypes,
    activeDays,
    cookAvailableDays,
    members,
    wishes,
    recentMeals,
    calendarEvents,
  } = body as {
    weekStartDate: string
    nutritionStyle: string
    language: string
    activeMealTypes: string[]
    activeDays: number[]
    cookAvailableDays: number[]
    members: Member[]
    wishes: FamilyWish[]
    recentMeals: { date: string; meal_type: string; name: string }[]
    calendarEvents: CalendarEvent[]
  }

  if (!weekStartDate || !members?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const monday = getMonday(weekStartDate)
    const allDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      return { date: isoDate(d), dayIndex: i }
    })

    const membersWithSchedule = members.map((m) => ({
      id: m.id,
      meal_schedule: (m.meal_schedule ?? null) as Record<string, string[]> | null,
    }))

    const getSlotAttendees = (dayIndex: number, mealType: string) =>
      membersWithSchedule
        .filter((m) => {
          if (!m.meal_schedule) return true
          const dayMeals = m.meal_schedule[String(dayIndex)]
          if (!dayMeals) return true
          return dayMeals.includes(mealType)
        })
        .map((m) => m.id)

    const effectiveActiveDays = activeDays ?? [0, 1, 2, 3, 4, 5, 6]
    const effectiveActiveMealTypes = activeMealTypes ?? ['breakfast', 'lunch', 'dinner']
    const effectiveCookAvailableDays = cookAvailableDays ?? [0, 1, 2, 3, 4, 5, 6]

    const planDays = allDates.map(({ date, dayIndex }) => ({
      date,
      dayIndex,
      cook_available: effectiveCookAvailableDays.includes(dayIndex),
      attendanceByMealType: {
        breakfast: getSlotAttendees(dayIndex, 'breakfast'),
        lunch: getSlotAttendees(dayIndex, 'lunch'),
        dinner: getSlotAttendees(dayIndex, 'dinner'),
      },
    }))

    const planData = await generateWeekPlan({
      weekStartDate: allDates[0].date,
      members,
      wishes: wishes ?? [],
      planDays,
      calendarEvents: calendarEvents ?? [],
      recentMeals: recentMeals ?? [],
      nutritionStyle: nutritionStyle ?? 'balanced',
      language: (language ?? 'de') as 'de' | 'en',
      activeMealTypes: effectiveActiveMealTypes,
      activeDays: effectiveActiveDays,
    })

    return NextResponse.json(planData)
  } catch (err) {
    log.error('plan generation failed', err)
    return NextResponse.json({ error: 'plan_generation_failed' }, { status: 500 })
  }
}
