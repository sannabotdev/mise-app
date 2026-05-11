import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { requireUser, unauthorizedResponse } from '@/lib/server/authz'
import { generateSingleMeal } from '@/lib/ai'
import { coerceShoppingCategory } from '@/lib/domain/shopping'
import type { Member } from '@/types'

export const runtime = 'nodejs'

const log = createLogger('POST /api/regenerate-meal')

export async function POST(req: NextRequest) {
  log.info('start')
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const body = await req.json()
  const { mealId, familyContext, mealContext, weekIngredientsByMeal } = body as {
    mealId: string
    familyContext: {
      nutritionStyle: string
      language: string
      members: Member[]
    }
    mealContext: {
      date: string
      mealType: string
      cookAvailable: boolean
      slotAttendeeIds: string[]
      allMemberIds: string[]
      otherMealsToday: string[]
      dayWishes: string[]
      recentMeals: { date: string; meal_type: string; name: string }[]
      avoidMealNames: string[]
    }
    weekIngredientsByMeal: Record<string, { name: string; amount: number; unit: string; category: string }[]>
  }

  if (!mealId || !familyContext || !mealContext) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const newMeal = await generateSingleMeal({
      date: mealContext.date,
      mealType: mealContext.mealType,
      cookAvailable: mealContext.cookAvailable,
      members: familyContext.members,
      slotAttendeeIds: mealContext.slotAttendeeIds,
      allMemberIds: mealContext.allMemberIds,
      otherMealsToday: mealContext.otherMealsToday,
      dayWishes: mealContext.dayWishes,
      recentMeals: mealContext.recentMeals,
      avoidMealNames: mealContext.avoidMealNames,
      nutritionStyle: familyContext.nutritionStyle,
      language: (familyContext.language ?? 'de') as 'de' | 'en',
    })

    // Consolidate shopping list from all week meals (pure function, no DB)
    const consolidated = new Map<string, { name: string; amount: number; unit: string; category: string }>()

    for (const [id, ingredients] of Object.entries(weekIngredientsByMeal ?? {})) {
      const effectiveIngredients = id === mealId
        ? (newMeal.ingredients ?? [])
        : ingredients
      for (const ingredient of effectiveIngredients) {
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

    const consolidatedShopping = Array.from(consolidated.values())

    log.info('done')
    return NextResponse.json({ newMeal, consolidatedShopping })
  } catch (err) {
    log.error('meal regeneration failed', err)
    return NextResponse.json({ error: 'meal_regeneration_failed' }, { status: 500 })
  }
}
