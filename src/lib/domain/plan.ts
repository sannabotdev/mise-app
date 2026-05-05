import type { NutritionStyle } from '@/types'

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const
export const ALL_MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const

export const NUTRITION_STYLES: NutritionStyle[] = [
  'low_carb_high_protein',
  'vegetarian',
  'vegan',
  'mediterranean',
  'balanced',
  'paleo',
]
