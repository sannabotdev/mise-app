export type NutritionStyle =
  | 'low_carb_high_protein'
  | 'vegetarian'
  | 'vegan'
  | 'mediterranean'
  | 'balanced'
  | 'paleo'

export type Language = 'de' | 'en'

export type MealType = 'breakfast' | 'lunch' | 'dinner'

export type ShoppingCategory =
  | 'produce'
  | 'meat'
  | 'dairy'
  | 'frozen'
  | 'dry_goods'
  | 'beverages'
  | 'household'
  | 'other'

export type CalendarSource = 'google' | 'manual'

export interface Family {
  id: string
  name: string
  invite_code: string
  nutrition_style: NutritionStyle
  language: Language
  owner_id: string | null
  active_meal_types: string[]
  active_days: number[]
  cook_available_days: number[]
  created_at: string
}

export interface Member {
  id: string
  family_id: string
  user_id: string | null
  name: string
  is_child: boolean
  preferences: string[]
  dislikes: string[]
  meal_schedule: Record<string, string[]> | null  // dayIndex_str → meal_types[]; null = attend all
  google_oauth_token?: string
  ical_secret_token: string
  created_at: string
}

export interface WeekPlan {
  id: string
  family_id: string
  week_start_date: string
  created_at: string
}

export interface PlanDay {
  id: string
  week_plan_id: string
  date: string
  cook_available: boolean
}

export interface Meal {
  id: string
  plan_day_id: string
  meal_type: MealType
  name: string
  is_ready_meal: boolean
  recipe_json: {
    ingredients?: { name: string; amount: number; unit: string; category: string }[]
    macros_per_serving?: { kcal: number; protein_g: number; carbs_g: number; fat_g: number }
  } | null
  instructions: string | null
  servings: number
}

export interface MealAttendee {
  meal_id: string
  member_id: string
}

export interface FamilyWish {
  id: string
  family_id: string
  member_id: string | null
  wish_text: string
  created_at: string
}

export interface ShoppingItem {
  id: string
  family_id: string
  name: string
  amount: number
  unit: string
  category: ShoppingCategory
  checked: boolean
  source_meal_id: string | null
  last_updated_by_plan: string | null
  created_at: string
}

export interface ProductHistory {
  id: string
  family_id: string
  name: string
  unit: string
  category: ShoppingCategory
}

export interface CalendarEvent {
  id: string
  family_id: string
  member_id: string
  title: string
  date: string
  start_time: string | null
  end_time: string | null
  all_day: boolean
  source: CalendarSource
}

export interface PlanDayWithMeals extends PlanDay {
  meals: (Meal & { attendees: string[] })[]
}

export interface WeekPlanFull extends WeekPlan {
  days: PlanDayWithMeals[]
}
