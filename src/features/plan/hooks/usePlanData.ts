'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { useTranslations } from 'next-intl'
import { useFamilyContext } from '@/lib/family-context'
import { useGlobalLoading } from '@/lib/global-loading'
import { addDays, getMonday, isoDate } from '@/lib/date/week'
import { ALL_MEAL_TYPES, DAY_KEYS } from '@/lib/domain/plan'
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
    const res = await fetch(`/api/wishes?family_id=${family.id}`)
    if (!res.ok) {
      setWishes([])
      return
    }
    const data = await res.json()
    setWishes(Array.isArray(data) ? data : [])
  }

  async function fetchPlan() {
    if (!family) return
    setIsFetchingPlan(true)
    try {
      const res = await fetch(`/api/plan/${family.id}/${normalizedWeekStart}`)
      const data = await res.json()
      if (data?.days) {
        const normalizedDays: ApiPlanDay[] = (data.days as ApiPlanDay[]).map((day) => ({
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
        if (days.length > 0) {
          await fetch(`/api/plan/${family.id}/${normalizedWeekStart}`, { method: 'DELETE' })
        }
        const res = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            family_id: family.id,
            week_start_date: normalizedWeekStart,
            active_meal_types: configMealTypes,
            active_days: configActiveDays,
            cook_available_days: configCookDays,
          }),
        })
        if (!res.ok) throw new Error()
        await fetchPlan()
        await fetchWishes()
      }, { label: t('generating') })
      .catch(() => {})
      .finally(() => setGenerating(false))
  }

  async function submitWish() {
    if (!family || !currentMember?.id || !wishText.trim()) return
    if (editingWishId) {
      await fetch(`/api/wishes/${editingWishId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wish_text: wishText }),
      })
    } else {
      await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_id: family.id, member_id: currentMember.id, wish_text: wishText }),
      })
    }
    setWishText('')
    setEditingWishId(null)
    setWishSheetOpen(false)
    await fetchWishes()
  }

  async function deleteWish(id: string) {
    await fetch(`/api/wishes/${id}`, { method: 'DELETE' })
    await fetchWishes()
  }

  async function regenerateMeal(mealId: string) {
    if (!family) return
    setRegeneratingMealId(mealId)
    await gl
      .runBlocking(async () => {
        const res = await fetch('/api/regenerate-meal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meal_id: mealId, family_id: family.id }),
        })
        if (!res.ok) throw new Error()
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
