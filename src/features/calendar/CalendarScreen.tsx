'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useFamilyContext } from '@/lib/family-context'
import type { CalendarEvent, Member } from '@/types'
import { DAY_KEYS } from '@/lib/domain/plan'
import { addDays, getMonday, isoDate } from '@/lib/date/week'
import { Copy, Check, Plus, X, Loader2 } from 'lucide-react'
import { useGlobalLoading } from '@/lib/global-loading'

const MEMBER_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-orange-100 text-orange-800',
  'bg-pink-100 text-pink-800',
  'bg-teal-100 text-teal-800',
]

function clampDayIndex(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(6, Math.trunc(value)))
}

export default function CalendarScreen({
  weekStart,
  dayIndex,
}: {
  weekStart: string
  dayIndex: number
}) {
  const t = useTranslations('calendar')
  const tx = useTranslations('calendarExtras')
  const td = useTranslations('days')
  const tc = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()

  const { family, members, loading } = useFamilyContext()
  const gl = useGlobalLoading()

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isFetchingEvents, setIsFetchingEvents] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [addModal, setAddModal] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: '', date: '', member_id: '', all_day: true, start_time: '', end_time: '' })

  const monday = useMemo(() => getMonday(weekStart), [weekStart])
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => isoDate(addDays(monday, i))), [monday])
  const selectedDay = weekDates[clampDayIndex(dayIndex)] ?? weekDates[0]

  const navigateTo = useCallback(
    (next: { weekStart: string; dayIndex: number }, opts?: { replace?: boolean }) => {
      const day = clampDayIndex(next.dayIndex)
      const path = `/${locale}/calendar/${next.weekStart}/${day}`
      try {
        localStorage.setItem('lastRoute.calendar', path)
      } catch {}
      if (opts?.replace) router.replace(path)
      else router.push(path)
    },
    [locale, router]
  )

  useEffect(() => {
    const path = `/${locale}/calendar/${isoDate(monday)}/${clampDayIndex(dayIndex)}`
    try {
      localStorage.setItem('lastRoute.calendar', path)
    } catch {}
  }, [dayIndex, locale, monday])

  useEffect(() => {
    if (!family) return
    setIsFetchingEvents(true)
    fetch(`/api/calendar?family_id=${family.id}&from=${weekDates[0]}&to=${weekDates[6]}`)
      .then((r) => r.json())
      .then((data) => setEvents(data ?? []))
      .finally(() => setIsFetchingEvents(false))
  }, [family, weekDates])

  function copyIcalUrl(member: Member) {
    const url = `${window.location.origin}/api/ical/${member.id}/${member.ical_secret_token}`
    navigator.clipboard.writeText(url)
    setCopiedId(member.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function saveEvent() {
    if (!family || !newEvent.title || !newEvent.date || !newEvent.member_id) return
    await gl.runTopbar(async () => {
      await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: family.id,
          member_id: newEvent.member_id,
          title: newEvent.title,
          date: newEvent.date,
          all_day: newEvent.all_day,
          start_time: newEvent.start_time || null,
          end_time: newEvent.end_time || null,
        }),
      })
      setAddModal(false)
      setNewEvent({ title: '', date: '', member_id: '', all_day: true, start_time: '', end_time: '' })
      const data = await fetch(`/api/calendar?family_id=${family.id}&from=${weekDates[0]}&to=${weekDates[6]}`).then((r) => r.json())
      setEvents(data ?? [])
    })
  }

  const dayEvents = useMemo(() => events.filter((e) => e.date === selectedDay), [events, selectedDay])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-green-600" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{t('title')}</h1>
            {family && <p className="text-xs text-gray-400">{family.name}</p>}
          </div>
          <button onClick={() => setAddModal(true)} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
            <Plus size={15} />
            {t('addEvent')}
          </button>
        </div>

        {/* Week nav */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => navigateTo({ weekStart: isoDate(addDays(monday, -7)), dayIndex: clampDayIndex(dayIndex) })}
            className="text-gray-400 hover:text-gray-600 px-1"
            aria-label="prev week"
          >
            ‹
          </button>
          <span className="text-xs text-gray-500 flex-1 text-center">
            {weekDates[0]} — {weekDates[6]}
          </span>
          <button
            onClick={() => navigateTo({ weekStart: isoDate(addDays(monday, 7)), dayIndex: clampDayIndex(dayIndex) })}
            className="text-gray-400 hover:text-gray-600 px-1"
            aria-label="next week"
          >
            ›
          </button>
        </div>
      </div>

      {/* Week grid */}
      <div className="px-4 mt-4">
        {isFetchingEvents && (
          <div className="mb-3 bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin text-green-600" />
            {tc('loading')}
          </div>
        )}

        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_KEYS.map((k) => (
            <div key={k} className="text-center text-xs font-semibold text-gray-400">
              {td(k)}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDates.map((date, idx) => {
            const eventsForDate = events.filter((e) => e.date === date)
            const isToday = date === isoDate(new Date())
            const isSelected = idx === clampDayIndex(dayIndex)
            return (
              <button
                key={date}
                onClick={() => navigateTo({ weekStart: isoDate(monday), dayIndex: idx })}
                className={`min-h-20 rounded-lg p-1 text-left transition border ${
                  isSelected
                    ? 'bg-green-50 border-green-400'
                    : isToday
                      ? 'bg-green-50 border-green-300'
                      : 'bg-white border-gray-100'
                }`}
              >
                <div className={`text-xs text-center font-medium mb-1 ${isToday ? 'text-green-700' : 'text-gray-500'}`}>
                  {new Date(date + 'T12:00:00').getDate()}
                </div>
                <div className="space-y-0.5">
                  {eventsForDate.slice(0, 3).map((ev) => {
                    const memberIdx = members.findIndex((m) => m.id === ev.member_id)
                    const colorClass = MEMBER_COLORS[memberIdx % MEMBER_COLORS.length] ?? MEMBER_COLORS[0]
                    return (
                      <div key={ev.id} className={`text-xs rounded px-1 py-0.5 truncate ${colorClass}`}>
                        {ev.title}
                      </div>
                    )
                  })}
                  {eventsForDate.length > 3 && <div className="text-[11px] text-gray-400 px-1">+{eventsForDate.length - 3}</div>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day events */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          {selectedDay}
        </h2>
        {isFetchingEvents ? (
          <div className="text-sm text-gray-400">{tc('loading')}</div>
        ) : dayEvents.length ? (
          <div className="space-y-2">
            {dayEvents.map((ev) => {
              const mem = members.find((m) => m.id === ev.member_id)
              return (
                <div key={ev.id} className="bg-white rounded-xl shadow-sm px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{ev.title}</div>
                  {mem?.name && <div className="text-xs text-gray-400 mt-0.5">{mem.name}</div>}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-sm text-gray-400">—</div>
        )}
      </div>

      {/* iCal URLs per member */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('icalUrl')}</h2>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium">{m.name}</span>
              <button onClick={() => copyIcalUrl(m)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 transition">
                {copiedId === m.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                {copiedId === m.id ? t('copied') : t('copyUrl')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add event modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="w-full max-w-lg mx-auto bg-white rounded-t-2xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">{t('addEvent')}</h2>
              <button onClick={() => setAddModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder={tx('titlePlaceholder')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={newEvent.member_id}
                onChange={(e) => setNewEvent({ ...newEvent, member_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">{tx('forWhom')}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <button
                onClick={saveEvent}
                disabled={!newEvent.title || !newEvent.date || !newEvent.member_id}
                className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
              >
                {tx('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

