import { generateWeekPlan } from '@/lib/ai'
import { addDays, getMonday, isoDate } from '@/lib/date/week'
import type { CalendarEvent, FamilyWish, Member } from '@/types'
import {
  clearFamilyWishes,
  findCalendarEventsForRange,
  findFamilyWishes,
  findFamilyWithMembers,
  findRecentMeals,
  replaceMealAttendees,
  upsertMealForPlanDay,
  upsertPlanDay,
  upsertProductHistory,
  upsertShoppingItemByName,
  upsertWeekPlan,
} from '@/server/repositories/plan.repository'

interface GeneratePlanInput {
  familyId: string
  weekStartDate: string
  activeMealTypes?: string[]
  activeDays?: number[]
  cookAvailableDays?: number[]
}

export async function generateAndPersistPlan(input: GeneratePlanInput) {
  const { familyId, weekStartDate } = input
  const { family, members } = await findFamilyWithMembers(familyId)
  if (!family || !members.length) {
    throw new Error('family_not_found')
  }

  const activeMealTypes = input.activeMealTypes ?? family.active_meal_types ?? ['breakfast', 'lunch', 'dinner']
  const activeDays = input.activeDays ?? family.active_days ?? [0, 1, 2, 3, 4, 5, 6]
  const cookAvailableDays = input.cookAvailableDays ?? family.cook_available_days ?? [0, 1, 2, 3, 4, 5, 6]

  const monday = getMonday(weekStartDate)
  const allDates = Array.from({ length: 7 }, (_, i) => ({ date: isoDate(addDays(monday, i)), dayIndex: i }))
  const dates = allDates.map((d) => d.date)
  const recentFrom = addDays(monday, -28)
  const recentTo = monday

  const [recentMealsRaw, wishesRaw, calendarEventsRaw] = await Promise.all([
    findRecentMeals(familyId, recentFrom, recentTo),
    findFamilyWishes(familyId),
    findCalendarEventsForRange(familyId, new Date(dates[0]), new Date(dates[6])),
  ])

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

  const planDays = allDates.map(({ date, dayIndex }) => ({
    date,
    dayIndex,
    cook_available: cookAvailableDays.includes(dayIndex),
    attendanceByMealType: {
      breakfast: getSlotAttendees(dayIndex, 'breakfast'),
      lunch: getSlotAttendees(dayIndex, 'lunch'),
      dinner: getSlotAttendees(dayIndex, 'dinner'),
    },
  }))

  const aiMembers: Member[] = members.map((m) => ({
    id: m.id,
    family_id: m.family_id,
    user_id: m.user_id,
    name: m.name,
    is_child: m.is_child,
    preferences: m.preferences,
    dislikes: m.dislikes,
    meal_schedule: (m.meal_schedule ?? null) as Record<string, string[]> | null,
    google_oauth_token: m.google_oauth_token ?? undefined,
    ical_secret_token: m.ical_secret_token,
    created_at: m.created_at.toISOString(),
  }))

  const aiWishes: FamilyWish[] = wishesRaw.map((w) => ({
    id: w.id,
    family_id: familyId,
    member_id: w.member_id ?? null,
    wish_text: w.wish_text,
    created_at: w.created_at.toISOString(),
  }))

  const aiCalendar: CalendarEvent[] = calendarEventsRaw.map((e) => ({
    id: e.id,
    family_id: e.family_id,
    member_id: e.member_id,
    title: e.title,
    date: isoDate(e.date),
    start_time: e.start_time ? e.start_time.toISOString() : null,
    end_time: e.end_time ? e.end_time.toISOString() : null,
    all_day: e.all_day,
    source: e.source,
  }))

  const recentMeals = (recentMealsRaw ?? []).map((m) => ({
    date: isoDate(m.plan_day.date),
    meal_type: String(m.meal_type),
    name: m.name,
  }))

  const planData = await generateWeekPlan({
    weekStartDate: dates[0],
    members: aiMembers,
    wishes: aiWishes,
    planDays,
    calendarEvents: aiCalendar,
    recentMeals,
    nutritionStyle: family.nutrition_style,
    language: family.language,
    activeMealTypes,
    activeDays,
  })

  if (aiWishes.length) {
    await clearFamilyWishes(familyId)
  }

  const weekPlan = await upsertWeekPlan(familyId, new Date(dates[0]))
  const allMemberIds = members.map((m) => m.id)

  for (const day of planData.days) {
    const planDay = await upsertPlanDay(weekPlan.id, new Date(day.date), day.cook_available)
    for (const meal of day.meals) {
      const savedMeal = await upsertMealForPlanDay(planDay.id, meal.meal_type, meal)
      if (meal.attendees?.length) {
        const validAttendees = meal.attendees.filter((id: string) => allMemberIds.includes(id))
        await replaceMealAttendees(savedMeal.id, validAttendees)
      }
    }
  }

  const today = new Date(isoDate(new Date()))
  if (planData.shopping_list?.length) {
    for (const item of planData.shopping_list) {
      if (!item.name) continue
      await upsertShoppingItemByName(
        familyId,
        {
          name: item.name,
          amount: item.amount,
          unit: item.unit,
          category: item.category,
        },
        today
      )
      await upsertProductHistory(familyId, { name: item.name, unit: item.unit, category: item.category })
    }
  }

  return { weekPlanId: weekPlan.id }
}
