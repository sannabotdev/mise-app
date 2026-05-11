'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { useTranslations } from 'next-intl'
import { useFamilyContext } from '@/lib/family-context'
import { useGlobalLoading } from '@/lib/global-loading'
import { addDays, getMonday, isoDate } from '@/lib/date/week'
import { ALL_MEAL_TYPES, DAY_KEYS } from '@/lib/domain/plan'
import { createClient } from '@/lib/supabase/client'
import { coerceShoppingCategory } from '@/lib/domain/shopping'
import type { ApiPlanDay, ApiWish } from '@/types/api'

type TPlan = ReturnType<typeof useTranslations<'plan'>>

function clampDayIndex(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(6, Math.trunc(value)))
}

export function usePlanData(params: { locale: string; t: TPlan; weekStart: string; dayIndex: number }) {
  const { locale, t, weekStart, dayIndex } = params
  const { family, members, currentMember, loading } = useFamilyContext()
  const router = useRouter()
  const gl = useGlobalLoading()
  const supabase = createClient()

  const [days, setDays] = useState<ApiPlanDay[]>([])
  const [wishes, setWishes] = useState<ApiWish[]>([])
  const [generating, setGenerating] = useState(false)
  const [regeneratingMealId, setRegeneratingMealId] = useState<string | null>(null)
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => clampDayIndex(dayIndex))
  const [isFetchingPlan, setIsFetchingPlan] = useState(false)
  const [wishSheetOpen, setWishSheetOpen] = useState(false)
  const [wishText, setWishText] = useState('')
  const [editingWishId, setEditingWishId] = useState<string | null>(null)
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set())
  const [configOpen, setConfigOpen] = useState(false)
  const [configMealTypes, setConfigMealTypes] = useState<string[]>(family?.active_meal_types ?? ['breakfast', 'lunch', 'dinner'])
  const [configActiveDays, setConfigActiveDays] = useState<number[]>(family?.active_days ?? [0, 1, 2, 3, 4, 5, 6])
  const [configCookDays, setConfigCookDays] = useState<number[]>(family?.cook_available_days ?? [0, 1, 2, 3, 4, 5, 6])
  const [weekActiveDays, setWeekActiveDays] = useState<number[]>(family?.active_days ?? [0, 1, 2, 3, 4, 5, 6])
  const [weekActiveMealTypes, setWeekActiveMealTypes] = useState<string[]>(family?.active_meal_types ?? ['breakfast', 'lunch', 'dinner'])

  const monday = useMemo(() => getMonday(weekStart), [weekStart])
  const normalizedWeekStart = isoDate(monday)

  const navigateTo = useCallback(
    (next: { weekStart: string; dayIndex: number }, opts?: { replace?: boolean }) => {
      const day = clampDayIndex(next.dayIndex)
      const path = `/${locale}/plan/${next.weekStart}/${day}`
      try {
        localStorage.setItem('lastRoute.plan', path)
      } catch {}
      if (opts?.replace) router.replace(path)
      else router.push(path)
    },
    [locale, router]
  )

  async function fetchWishes() {
    if (!family) return
    const { data } = await supabase
      .from('family_wishes')
      .select('*')
      .eq('family_id', family.id)
      .order('created_at')
    setWishes((data ?? []) as ApiWish[])
  }

  async function fetchPlan() {
    if (!family) return
    setIsFetchingPlan(true)
    try {
      const { data: weekPlan } = await supabase
        .from('week_plans')
        .select(`
          id,
          plan_days (
            id,
            date,
            cook_available,
            meals (
              id,
              meal_type,
              name,
              is_ready_meal,
              recipe_json,
              instructions,
              servings,
              meal_attendees ( member_id )
            )
          )
        `)
        .eq('family_id', family.id)
        .eq('week_start_date', normalizedWeekStart)
        .maybeSingle()

      if (weekPlan?.plan_days) {
        const normalizedDays: ApiPlanDay[] = (weekPlan.plan_days as ApiPlanDay[]).map((day) => ({
          ...day,
          date: (day.date ?? '').split('T')[0],
        }))
        setDays(normalizedDays)
        await fetchWishes()

        const indices = Array.from(
          new Set(
            normalizedDays
              .map((day) => {
                const dt = new Date(`${day.date}T00:00:00Z`)
                const mondayDt = new Date(`${isoDate(monday)}T00:00:00Z`)
                return Math.round((dt.getTime() - mondayDt.getTime()) / (1000 * 60 * 60 * 24))
              })
              .filter((index) => index >= 0 && index <= 6)
          )
        ).sort((a, b) => a - b)
        if (indices.length) setWeekActiveDays(indices)

        const mealTypes = Array.from(new Set(normalizedDays.flatMap((day) => (day.meals ?? []).map((meal) => meal.meal_type))))
          .filter((mealType) => (ALL_MEAL_TYPES as readonly string[]).includes(mealType))
        if (mealTypes.length) setWeekActiveMealTypes(mealTypes)
      } else {
        setDays([])
        await fetchWishes()
      }
    } finally {
      setIsFetchingPlan(false)
    }
  }

  useEffect(() => {
    if (!loading && !family) router.push(`/${locale}/onboard`)
  }, [loading, family, locale, router])

  useEffect(() => {
    fetchPlan()
  }, [family, normalizedWeekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!family) return
    setConfigMealTypes(family.active_meal_types ?? ['breakfast', 'lunch', 'dinner'])
    setConfigActiveDays(family.active_days ?? [0, 1, 2, 3, 4, 5, 6])
    setConfigCookDays(family.cook_available_days ?? [0, 1, 2, 3, 4, 5, 6])
    setWeekActiveMealTypes(family.active_meal_types ?? ['breakfast', 'lunch', 'dinner'])
    setWeekActiveDays(family.active_days ?? [0, 1, 2, 3, 4, 5, 6])
  }, [family])

  useEffect(() => {
    setSelectedDayIndex(clampDayIndex(dayIndex))
  }, [dayIndex])

  useEffect(() => {
    const path = `/${locale}/plan/${normalizedWeekStart}/${clampDayIndex(selectedDayIndex)}`
    try {
      localStorage.setItem('lastRoute.plan', path)
    } catch {}
  }, [locale, normalizedWeekStart, selectedDayIndex])

  useEffect(() => {
    if (!weekActiveDays.includes(selectedDayIndex)) {
      setSelectedDayIndex(weekActiveDays[0] ?? 0)
    }
  }, [weekActiveDays, selectedDayIndex])

  async function doGenerateWithConfig() {
    if (!family) return
    setConfigOpen(false)
    setGenerating(true)
    await gl
      .runBlocking(async () => {
        setWeekActiveMealTypes(configMealTypes)
        setWeekActiveDays(configActiveDays)

        // Delete existing week plan if present (CASCADE removes days/meals/attendees)
        if (days.length > 0) {
          const { data: existingPlan } = await supabase
            .from('week_plans')
            .select('id')
            .eq('family_id', family.id)
            .eq('week_start_date', normalizedWeekStart)
            .maybeSingle()
          if (existingPlan) {
            await supabase.from('shopping_items').delete()
              .eq('family_id', family.id)
              .not('last_updated_by_plan', 'is', null)
            await supabase.from('week_plans').delete().eq('id', existingPlan.id)
          }
        }

        // Load data needed for AI from Supabase
        const recentFrom = isoDate(addDays(monday, -28))
        const weekEnd = isoDate(addDays(monday, 6))

        const [recentMealsRes, wishesRes, calendarRes] = await Promise.all([
          supabase
            .from('meals')
            .select('name, meal_type, plan_day:plan_days!inner(date, week_plan:week_plans!inner(family_id))')
            .eq('plan_day.week_plan.family_id', family.id)
            .gte('plan_day.date', recentFrom)
            .lt('plan_day.date', normalizedWeekStart)
            .order('plan_day(date)', { ascending: false })
            .limit(250),
          supabase.from('family_wishes').select('*').eq('family_id', family.id).order('created_at'),
          supabase.from('calendar_events').select('*')
            .eq('family_id', family.id)
            .gte('date', normalizedWeekStart)
            .lte('date', weekEnd),
        ])

        const recentMeals = (recentMealsRes.data ?? []).map((m) => ({
          date: (m.plan_day as { date: string }).date,
          meal_type: m.meal_type as string,
          name: m.name,
        }))

        // Call stateless AI endpoint
        const res = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekStartDate: normalizedWeekStart,
            nutritionStyle: family.nutrition_style,
            language: family.language,
            activeMealTypes: configMealTypes,
            activeDays: configActiveDays,
            cookAvailableDays: configCookDays,
            members,
            wishes: wishesRes.data ?? [],
            recentMeals,
            calendarEvents: calendarRes.data ?? [],
          }),
        })
        if (!res.ok) throw new Error()
        const planData = await res.json()

        // Clear wishes after plan generated
        if ((wishesRes.data ?? []).length > 0) {
          await supabase.from('family_wishes').delete().eq('family_id', family.id)
        }

        // Persist AI result client-side
        const allMemberIds = members.map((m) => m.id)
        const today = isoDate(new Date())

        const { data: weekPlan } = await supabase
          .from('week_plans')
          .upsert({ family_id: family.id, week_start_date: normalizedWeekStart }, { onConflict: 'family_id,week_start_date' })
          .select('id')
          .single()
        if (!weekPlan) throw new Error('Failed to upsert week plan')

        for (const day of planData.days ?? []) {
          const { data: planDay } = await supabase
            .from('plan_days')
            .upsert({ week_plan_id: weekPlan.id, date: day.date, cook_available: day.cook_available }, { onConflict: 'week_plan_id,date' })
            .select('id')
            .single()
          if (!planDay) continue

          for (const meal of day.meals ?? []) {
            const recipeJson = (meal.ingredients || meal.macros_per_serving)
              ? { ingredients: meal.ingredients, macros_per_serving: meal.macros_per_serving }
              : null
            const { data: savedMeal } = await supabase
              .from('meals')
              .upsert({
                plan_day_id: planDay.id,
                meal_type: meal.meal_type,
                name: meal.name,
                is_ready_meal: meal.is_ready_meal ?? false,
                servings: meal.servings ?? 1,
                instructions: meal.instructions ?? null,
                recipe_json: recipeJson,
              }, { onConflict: 'plan_day_id,meal_type' })
              .select('id')
              .single()
            if (!savedMeal) continue

            if (meal.attendees?.length) {
              const validAttendees = (meal.attendees as string[]).filter((id) => allMemberIds.includes(id))
              await supabase.from('meal_attendees').delete().eq('meal_id', savedMeal.id)
              if (validAttendees.length) {
                await supabase.from('meal_attendees').insert(
                  validAttendees.map((member_id) => ({ meal_id: savedMeal.id, member_id }))
                )
              }
            }
          }
        }

        // Persist shopping list
        for (const item of planData.shopping_list ?? []) {
          if (!item.name) continue
          const category = coerceShoppingCategory(item.category)
          await supabase.from('shopping_items').upsert(
            { family_id: family.id, name: item.name, amount: item.amount, unit: item.unit ?? null, category, checked: false, last_updated_by_plan: today },
            { onConflict: 'family_id,name' }
          )
          await supabase.from('product_history').upsert(
            { family_id: family.id, name: item.name, unit: item.unit ?? null, category },
            { onConflict: 'family_id,name' }
          )
        }

        await fetchPlan()
        await fetchWishes()
      }, { label: t('generating') })
      .catch(() => {})
      .finally(() => setGenerating(false))
  }

  async function submitWish() {
    if (!family || !currentMember?.id || !wishText.trim()) return
    if (editingWishId) {
      await supabase.from('family_wishes').update({ wish_text: wishText }).eq('id', editingWishId)
    } else {
      await supabase.from('family_wishes').insert({ family_id: family.id, member_id: currentMember.id, wish_text: wishText })
    }
    setWishText('')
    setEditingWishId(null)
    setWishSheetOpen(false)
    await fetchWishes()
  }

  async function deleteWish(id: string) {
    await supabase.from('family_wishes').delete().eq('id', id)
    await fetchWishes()
  }

  async function regenerateMeal(mealId: string) {
    if (!family) return
    setRegeneratingMealId(mealId)
    await gl
      .runBlocking(async () => {
        // Load meal context
        const { data: meal } = await supabase
          .from('meals')
          .select('*, plan_day:plan_days!inner(id, date, cook_available, week_plan_id)')
          .eq('id', mealId)
          .single()
        if (!meal?.plan_day) throw new Error('meal_not_found')

        const planDay = meal.plan_day as { id: string; date: string; cook_available: boolean; week_plan_id: string }
        const planDayDateStr = planDay.date.split('T')[0]
        const recentTo = planDayDateStr
        const recentFrom = isoDate(addDays(new Date(`${planDayDateStr}T00:00:00Z`), -28))

        const [otherMealsRes, wishesRes, recentMealsRes, weekDaysRes] = await Promise.all([
          supabase.from('meals').select('name, meal_type').eq('plan_day_id', planDay.id).neq('id', mealId),
          supabase.from('family_wishes').select('wish_text').eq('family_id', family.id),
          supabase
            .from('meals')
            .select('name, meal_type, plan_day:plan_days!inner(date, week_plan:week_plans!inner(family_id))')
            .eq('plan_day.week_plan.family_id', family.id)
            .gte('plan_day.date', recentFrom)
            .lt('plan_day.date', recentTo)
            .order('plan_day(date)', { ascending: false })
            .limit(250),
          supabase
            .from('plan_days')
            .select('meals(id, recipe_json)')
            .eq('week_plan_id', planDay.week_plan_id),
        ])

        const recentMeals = (recentMealsRes.data ?? []).map((m) => ({
          date: (m.plan_day as { date: string }).date,
          meal_type: m.meal_type as string,
          name: m.name,
        }))

        // Determine slot attendees from member schedules
        const jsDay = new Date(`${planDayDateStr}T00:00:00Z`).getDay()
        const dayIndex = jsDay === 0 ? 6 : jsDay - 1
        const mealType = meal.meal_type as string
        const slotAttendeeIds = members
          .filter((m) => {
            const sched = (m.meal_schedule ?? null) as Record<string, string[]> | null
            if (!sched) return true
            const dayMeals = sched[String(dayIndex)]
            if (dayMeals === undefined) return true
            return dayMeals.includes(mealType)
          })
          .map((m) => m.id)

        const effectiveCookAvailable = mealType === 'dinner'
          ? planDay.cook_available && !meal.is_ready_meal
          : planDay.cook_available

        // Build weekIngredients for consolidation (server-side pure function)
        type MealWithRecipe = { id: string; recipe_json: { ingredients?: { name: string; amount: number; unit: string; category: string }[] } | null }
        const weekIngredientsByMeal: Record<string, { name: string; amount: number; unit: string; category: string }[]> = {}
        for (const day of weekDaysRes.data ?? []) {
          for (const m of (day.meals as MealWithRecipe[]) ?? []) {
            weekIngredientsByMeal[m.id] = m.recipe_json?.ingredients ?? []
          }
        }

        const res = await fetch('/api/regenerate-meal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mealId,
            familyContext: {
              nutritionStyle: family.nutrition_style,
              language: family.language,
              members,
            },
            mealContext: {
              date: planDayDateStr,
              mealType,
              cookAvailable: effectiveCookAvailable,
              slotAttendeeIds,
              allMemberIds: members.map((m) => m.id),
              otherMealsToday: (otherMealsRes.data ?? []).map((m) => m.name),
              dayWishes: (wishesRes.data ?? []).map((w) => w.wish_text),
              recentMeals,
              avoidMealNames: [meal.name],
            },
            weekIngredientsByMeal,
          }),
        })
        if (!res.ok) throw new Error()
        const { newMeal, consolidatedShopping } = await res.json()

        // Persist updates client-side
        const recipeJson = (newMeal.ingredients || newMeal.macros_per_serving)
          ? { ingredients: newMeal.ingredients, macros_per_serving: newMeal.macros_per_serving }
          : null
        await supabase.from('meals').update({
          name: newMeal.name,
          is_ready_meal: newMeal.is_ready_meal ?? false,
          servings: newMeal.servings ?? slotAttendeeIds.length,
          instructions: newMeal.instructions ?? null,
          recipe_json: recipeJson,
        }).eq('id', mealId)

        if (newMeal.attendees?.length) {
          const valid = (newMeal.attendees as string[]).filter((id) => members.some((m) => m.id === id))
          await supabase.from('meal_attendees').delete().eq('meal_id', mealId)
          if (valid.length) {
            await supabase.from('meal_attendees').insert(valid.map((member_id) => ({ meal_id: mealId, member_id })))
          }
        }

        const today = isoDate(new Date())
        await supabase.from('shopping_items').delete()
          .eq('family_id', family.id)
          .not('last_updated_by_plan', 'is', null)

        for (const item of consolidatedShopping ?? []) {
          if (!item.name) continue
          await supabase.from('shopping_items').upsert(
            { family_id: family.id, name: item.name, amount: item.amount, unit: item.unit ?? null, category: item.category, checked: false, last_updated_by_plan: today },
            { onConflict: 'family_id,name' }
          )
          await supabase.from('product_history').upsert(
            { family_id: family.id, name: item.name, unit: item.unit ?? null, category: item.category },
            { onConflict: 'family_id,name' }
          )
        }

        await fetchPlan()
      })
      .catch(() => {})
      .finally(() => setRegeneratingMealId(null))
  }

  function openWishModal() {
    if (!currentMember?.id) return
    const existing = wishes.find((wish) => wish.member_id === currentMember.id) ?? null
    setEditingWishId(existing?.id ?? null)
    setWishText(existing?.wish_text ?? '')
    setWishSheetOpen(true)
  }

  function toggleMealExpand(mealId: string) {
    setExpandedMeals((prev) => {
      const next = new Set(prev)
      if (next.has(mealId)) next.delete(mealId)
      else next.add(mealId)
      return next
    })
  }

  const activeDayTabs = DAY_KEYS.map((dk, i) => ({ dk, dayIndex: i })).filter(({ dayIndex }) => weekActiveDays.includes(dayIndex))
  const currentDay = days.find((d) => d.date === isoDate(addDays(monday, selectedDayIndex))) ?? null

  return {
    family,
    members,
    currentMember,
    loading,
    monday,
    weekStart: normalizedWeekStart,
    selectedDayIndex,
    setSelectedDayIndex,
    isFetchingPlan,
    activeDayTabs,
    currentDay,
    wishes,
    generating,
    requestGenerate: () => setConfigOpen(true),
    configOpen,
    setConfigOpen,
    configMealTypes,
    setConfigMealTypes,
    configActiveDays,
    setConfigActiveDays,
    configCookDays,
    setConfigCookDays,
    weekActiveMealTypes,
    weekActiveDays,
    days,
    doGenerateWithConfig,
    openWishModal,
    deleteWish,
    wishSheetOpen,
    setWishSheetOpen,
    wishText,
    setWishText,
    editingWishId,
    submitWish,
    expandedMeals,
    toggleMealExpand,
    regeneratingMealId,
    regenerateMeal,
    navigateTo,
  }
}
