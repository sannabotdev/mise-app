'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import CalendarScreen from '@/features/calendar/CalendarScreen'
import { getMonday, isoDate } from '@/lib/date/week'

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function clampDayIndex(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(6, Math.trunc(value)))
}

export default function CalendarWeekDayPage({
  params,
}: {
  params: { week: string; day: string }
}) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('common')

  const normalized = useMemo(() => {
    const weekParam = params.week
    const dayParam = params.day
    const dayIndex = clampDayIndex(Number(dayParam))
    const fallbackWeek = isoDate(getMonday())

    if (!isIsoDate(weekParam)) {
      return { weekStart: fallbackWeek, dayIndex, needsRedirect: true }
    }
    return { weekStart: weekParam, dayIndex, needsRedirect: false }
  }, [params.day, params.week])

  useEffect(() => {
    if (!normalized.needsRedirect) return
    router.replace(`/${locale}/calendar/${normalized.weekStart}/${normalized.dayIndex}`)
  }, [locale, normalized.dayIndex, normalized.needsRedirect, normalized.weekStart, router])

  if (normalized.needsRedirect) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-400 text-sm">
        {t('loading')}
      </div>
    )
  }

  return <CalendarScreen weekStart={normalized.weekStart} dayIndex={normalized.dayIndex} />
}

