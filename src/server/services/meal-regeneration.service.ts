import { Prisma, type ShoppingCategory } from '@prisma/client'
import { generateSingleMeal } from '@/lib/ai'
import { addDays, isoDate } from '@/lib/date/week'
import { coerceShoppingCategory } from '@/lib/domain/shopping'
import type { Member } from '@/types'
import {
  deletePlanManagedShoppingItems,
  findFamilyWishes,
  findFamilyWithMembers,
  findMealWithPlanDay,
  findOtherMealsForDay,
  findRecentMeals,
  findWeekDaysWithMeals,
  replaceMealAttendees,
  upsertProductHistory,
} from '@/server/repositories/plan.repository'
import { prisma } from '@/lib/prisma'

interface RegenerateMealInput {
  mealId: string
  familyId: string
}

export async function regenerateMealAndRefreshShopping(input: RegenerateMealInput) {
  const { familyId, mealId } = input
  const [{ family, members }, meal] = await Promise.all([
    findFamilyWithMembers(familyId),
    findMealWithPlanDay(mealId),
  ])

  if (!family || !members.length) throw new Error('family_not_found')
  if (!meal?.plan_day) throw new Error('meal_not_found')

  const planDay = meal.plan_day
  const planDayDateStr = isoDate(planDay.date)
  const recentTo = new Date(`${planDayDateStr}T00:00:00Z`)
  const recentFrom = addDays(recentTo, -28)
  const [otherMeals, wishes, recentMealsRaw] = await Promise.all([
    findOtherMealsForDay(planDay.id, mealId),
    findFamilyWishes(familyId),
    findRecentMeals(familyId, recentFrom, recentTo),
  ])

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
  const recentMeals = (recentMealsRaw ?? []).map((m) => ({
    date: isoDate(m.plan_day.date),
    meal_type: String(m.meal_type),
    name: m.name,
  }))

  const allMemberIds = members.map((m) => m.id)
  const jsDay = new Date(planDayDateStr).getDay()
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1
  const mealType: string = meal.meal_type
  const effectiveCookAvailable = mealType === 'dinner' ? planDay.cook_available && !meal.is_ready_meal : planDay.cook_available
  const slotAttendeeIds = members
    .filter((m) => {
      const sched = (m.meal_schedule ?? null) as Record<string, string[]> | null
      if (!sched) return true
      const dayMeals = sched[String(dayIndex)]
      if (dayMeals === undefined) return true
      return dayMeals.includes(mealType)
    })
    .map((m) => m.id)

  const newMeal = await generateSingleMeal({
    date: planDayDateStr,
    mealType,
    cookAvailable: effectiveCookAvailable,
    members: aiMembers,
    slotAttendeeIds,
    allMemberIds,
    otherMealsToday: (otherMeals ?? []).map((m: { name: string }) => m.name),
    dayWishes: (wishes ?? []).map((w) => w.wish_text),
    recentMeals,
    avoidMealNames: [meal.name],
    nutritionStyle: family.nutrition_style,
    language: family.language,
  })

  await prisma.meal.update({
    where: { id: mealId },
    data: {
      name: newMeal.name,
      is_ready_meal: newMeal.is_ready_meal ?? false,
      servings: newMeal.servings ?? slotAttendeeIds.length,
      instructions: newMeal.instructions ?? null,
      recipe_json:
        newMeal.ingredients || newMeal.macros_per_serving
          ? { ingredients: newMeal.ingredients, macros_per_serving: newMeal.macros_per_serving }
          : Prisma.JsonNull,
    },
  })

  if (newMeal.attendees?.length) {
    const valid = newMeal.attendees.filter((id: string) => allMemberIds.includes(id))
    await replaceMealAttendees(mealId, valid)
  }

  const allDays = await findWeekDaysWithMeals(planDay.week_plan_id)
  const consolidated = new Map<string, { name: string; amount: number; unit: string; category: ShoppingCategory }>()

  for (const day of allDays ?? []) {
    for (const m of (day.meals as { id: string; recipe_json: { ingredients?: { name: string; amount: number; unit: string; category: string }[] } | null }[] ?? [])) {
      const ingredients = m.id === mealId ? (newMeal.ingredients ?? []) : (m.recipe_json?.ingredients ?? [])
      for (const ingredient of ingredients) {
        if (!ingredient.name) continue
        const key = ingredient.name.toLowerCase()
        const existing = consolidated.get(key)
        if (existing && existing.unit === ingredient.unit) {
          existing.amount = Math.round((existing.amount + (ingredient.amount ?? 0)) * 100) / 100
        } else {
          consolidated.set(key, {
            name: ingredient.name,
            amount: ingredient.amount ?? 0,
            unit: ingredient.unit ?? '',
            category: coerceShoppingCategory(ingredient.category),
          })
        }
      }
    }
  }

  await deletePlanManagedShoppingItems(familyId)
  const today = new Date(isoDate(new Date()))
  for (const item of Array.from(consolidated.values())) {
    await prisma.shoppingItem.create({
      data: {
        family_id: familyId,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        category: item.category,
        checked: false,
        last_updated_by_plan: today,
      },
    })
    await upsertProductHistory(familyId, { name: item.name, unit: item.unit, category: item.category })
  }

  return { success: true }
}
