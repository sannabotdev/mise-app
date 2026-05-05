import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function findFamilyWithMembers(familyId: string) {
  const [family, members] = await Promise.all([
    prisma.family.findUnique({ where: { id: familyId } }),
    prisma.member.findMany({ where: { family_id: familyId } }),
  ])
  return { family, members }
}

export async function findRecentMeals(familyId: string, from: Date, to: Date) {
  return prisma.meal.findMany({
    where: {
      plan_day: {
        date: { gte: from, lt: to },
        week_plan: { family_id: familyId },
      },
    },
    select: {
      name: true,
      meal_type: true,
      plan_day: { select: { date: true } },
    },
    orderBy: { plan_day: { date: 'desc' } },
    take: 250,
  })
}

export async function findFamilyWishes(familyId: string) {
  return prisma.familyWish.findMany({
    where: { family_id: familyId },
    orderBy: { created_at: 'asc' },
  })
}

export async function findCalendarEventsForRange(familyId: string, from: Date, to: Date) {
  return prisma.calendarEvent.findMany({
    where: {
      family_id: familyId,
      date: { gte: from, lte: to },
    },
  })
}

export async function clearFamilyWishes(familyId: string) {
  return prisma.familyWish.deleteMany({ where: { family_id: familyId } })
}

export async function upsertWeekPlan(familyId: string, weekStartDate: Date) {
  return prisma.weekPlan.upsert({
    where: { family_id_week_start_date: { family_id: familyId, week_start_date: weekStartDate } },
    create: { family_id: familyId, week_start_date: weekStartDate },
    update: {},
  })
}

export async function upsertPlanDay(weekPlanId: string, date: Date, cookAvailable: boolean) {
  return prisma.planDay.upsert({
    where: { week_plan_id_date: { week_plan_id: weekPlanId, date } },
    create: { week_plan_id: weekPlanId, date, cook_available: cookAvailable },
    update: { cook_available: cookAvailable },
  })
}

export async function upsertMealForPlanDay(
  planDayId: string,
  mealType: string,
  meal: {
    name: string
    is_ready_meal?: boolean
    servings: number
    instructions?: string | null
    ingredients?: Prisma.InputJsonValue
    macros_per_serving?: Prisma.InputJsonValue
  }
) {
  const recipeJson =
    meal.ingredients || meal.macros_per_serving
      ? { ingredients: meal.ingredients, macros_per_serving: meal.macros_per_serving }
      : Prisma.JsonNull
  return prisma.meal.upsert({
    where: { plan_day_id_meal_type: { plan_day_id: planDayId, meal_type: mealType as never } },
    create: {
      plan_day_id: planDayId,
      meal_type: mealType as never,
      name: meal.name,
      is_ready_meal: meal.is_ready_meal ?? false,
      servings: meal.servings,
      instructions: meal.instructions ?? null,
      recipe_json: recipeJson,
    },
    update: {
      name: meal.name,
      is_ready_meal: meal.is_ready_meal ?? false,
      servings: meal.servings,
      instructions: meal.instructions ?? null,
      recipe_json: recipeJson,
    },
  })
}

export async function replaceMealAttendees(mealId: string, memberIds: string[]) {
  await prisma.mealAttendee.deleteMany({ where: { meal_id: mealId } })
  if (memberIds.length) {
    await prisma.mealAttendee.createMany({
      data: memberIds.map((member_id) => ({ meal_id: mealId, member_id })),
    })
  }
}

export async function findShoppingItemByFamilyAndName(familyId: string, name: string) {
  return prisma.shoppingItem.findFirst({
    where: { family_id: familyId, name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  })
}

export async function upsertShoppingItemByName(
  familyId: string,
  item: { name: string; amount?: number; unit?: string; category?: string },
  updatedByPlanDate: Date
) {
  const existing = await findShoppingItemByFamilyAndName(familyId, item.name.toLowerCase())
  if (existing) {
    return prisma.shoppingItem.update({
      where: { id: existing.id },
      data: {
        amount: item.amount,
        unit: item.unit,
        category: item.category as never,
        last_updated_by_plan: updatedByPlanDate,
      },
    })
  }
  return prisma.shoppingItem.create({
    data: {
      family_id: familyId,
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      category: (item.category ?? 'other') as never,
      checked: false,
      last_updated_by_plan: updatedByPlanDate,
    },
  })
}

export async function upsertProductHistory(
  familyId: string,
  item: { name: string; unit?: string; category?: string }
) {
  return prisma.productHistory.upsert({
    where: { family_id_name: { family_id: familyId, name: item.name } },
    create: { family_id: familyId, name: item.name, unit: item.unit, category: item.category as never },
    update: { unit: item.unit, category: item.category as never },
  })
}

export async function findMealWithPlanDay(mealId: string) {
  return prisma.meal.findUnique({
    where: { id: mealId },
    include: { plan_day: { select: { id: true, date: true, cook_available: true, week_plan_id: true } } },
  })
}

export async function findOtherMealsForDay(planDayId: string, mealId: string) {
  return prisma.meal.findMany({
    where: { plan_day_id: planDayId, NOT: { id: mealId } },
    select: { name: true, meal_type: true },
  })
}

export async function findWeekDaysWithMeals(weekPlanId: string) {
  return prisma.planDay.findMany({
    where: { week_plan_id: weekPlanId },
    select: { meals: { select: { id: true, recipe_json: true } } },
  })
}

export async function deletePlanManagedShoppingItems(familyId: string) {
  return prisma.shoppingItem.deleteMany({
    where: { family_id: familyId, last_updated_by_plan: { not: null } },
  })
}
