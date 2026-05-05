import type { FamilyWish, Meal } from '@/types'

export interface ApiMeal extends Meal {
  meal_attendees: { member_id: string }[]
}

export interface ApiPlanDay {
  id: string
  date: string
  cook_available: boolean
  meals: ApiMeal[]
}

export type ApiWish = FamilyWish
