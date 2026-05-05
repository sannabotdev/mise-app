'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { getMonday, isoDate } from '@/lib/date/week'

function clampDayIndex(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(6, Math.trunc(value)))
}

export default function PlanPage() {
  const router = useRouter()
  const locale = useLocale()

  const fallback = useMemo(() => {
    const monday = getMonday()
    const mondayIso = isoDate(monday)
    const todayIso = isoDate(new Date())
    const dayIndex = clampDayIndex(
      Math.round(
        (new Date(`${todayIso}T00:00:00Z`).getTime() - new Date(`${mondayIso}T00:00:00Z`).getTime()) / (1000 * 60 * 60 * 24)
      )
    )
    return `/${locale}/plan/${mondayIso}/${dayIndex}`
  }, [locale])

  useEffect(() => {
    let target = fallback
    try {
      const saved = localStorage.getItem('lastRoute.plan')
      if (saved && saved.startsWith(`/${locale}/plan/`)) target = saved
    } catch {}
    router.replace(target)
  }, [fallback, locale, router])

  return null
}
