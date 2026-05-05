'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useFamilyContext } from '@/lib/family-context'
import { createClient } from '@/lib/supabase/client'
import { NutritionStyle } from '@/types'
import { NUTRITION_STYLE_ICONS } from '@/lib/nutrition-styles'
import { ALL_MEAL_TYPES, DAY_KEYS, NUTRITION_STYLES } from '@/lib/domain/plan'
import { Copy, Check, RefreshCw, LogOut, Crown, ToggleLeft, ToggleRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useGlobalLoading } from '@/lib/global-loading'

function randomInviteCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

export default function SettingsPage() {
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  const td = useTranslations('days')
  const tp = useTranslations('plan')
  const locale = useLocale()
  const { family, isOwner, refresh, loading } = useFamilyContext()
  const gl = useGlobalLoading()

  const [initialized, setInitialized] = useState(false)
  const [familyName, setFamilyName] = useState(family?.name ?? '')
  const [nutritionStyle, setNutritionStyle] = useState<NutritionStyle>(family?.nutrition_style ?? 'balanced')
  const [language, setLanguage] = useState(family?.language ?? 'de')
  const [activeMealTypes, setActiveMealTypes] = useState<string[]>(
    family?.active_meal_types ?? ['breakfast', 'lunch', 'dinner']
  )
  const [activeDays, setActiveDays] = useState<number[]>(
    family?.active_days ?? [0, 1, 2, 3, 4, 5, 6]
  )
  const [cookAvailableDays, setCookAvailableDays] = useState<number[]>(
    family?.cook_available_days ?? [0, 1, 2, 3, 4, 5, 6]
  )
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  // `family` is loaded async via context. Initialize form values once when it arrives.
  useEffect(() => {
    if (initialized) return
    if (!family) return
    setFamilyName(family.name ?? '')
    setNutritionStyle((family.nutrition_style ?? 'balanced') as NutritionStyle)
    setLanguage(family.language ?? 'de')
    setActiveMealTypes(family.active_meal_types ?? ['breakfast', 'lunch', 'dinner'])
    setActiveDays(family.active_days ?? [0, 1, 2, 3, 4, 5, 6])
    setCookAvailableDays(family.cook_available_days ?? [0, 1, 2, 3, 4, 5, 6])
    setInitialized(true)
  }, [initialized, family])

  function toggleMealType(mt: string) {
    setActiveMealTypes((prev) =>
      prev.includes(mt) ? (prev.length > 1 ? prev.filter((x) => x !== mt) : prev) : [...prev, mt]
    )
  }

  function toggleDay(dayIndex: number) {
    setActiveDays((prev) =>
      prev.includes(dayIndex) ? (prev.length > 1 ? prev.filter((x) => x !== dayIndex) : prev) : [...prev, dayIndex].sort()
    )
  }

  function toggleCookDay(dayIndex: number) {
    setCookAvailableDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((x) => x !== dayIndex) : [...prev, dayIndex].sort()
    )
  }

  async function save() {
    if (!family) return
    setSaving(true)
    await gl.runTopbar(async () => {
      await fetch(`/api/families/${family.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: familyName,
          nutrition_style: nutritionStyle,
          language,
          active_meal_types: activeMealTypes,
          active_days: activeDays,
          cook_available_days: cookAvailableDays,
        }),
      })
      await refresh()
      if (language !== locale) {
        router.push(`/${language}/settings`)
      }
    }).finally(() => setSaving(false))
  }

  function copyCode() {
    if (!family) return
    navigator.clipboard.writeText(family.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function regenerateCode() {
    if (!family || !isOwner) return
    setRegenerating(true)
    await gl.runTopbar(async () => {
      const newCode = randomInviteCode()
      await fetch(`/api/families/${family.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: newCode }),
      })
      await refresh()
    }).finally(() => setRegenerating(false))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push(`/${locale}/auth/login`)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">
      {tc('loading')}
    </div>
  )

  if (!family) return (
    <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">
      {t('noFamilyFound')}
    </div>
  )

  const mealTypeLabels: Record<string, string> = {
    breakfast: tp('breakfast'),
    lunch: tp('lunch'),
    dinner: tp('dinner'),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold">{t('title')}</h1>
      </div>

      <div className="px-4 mt-4 space-y-5">

        {/* Family name */}
        <div className="bg-white rounded-xl shadow-sm px-4 py-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {t('familyName')}
            {isOwner && <span className="ml-2 inline-flex items-center gap-1 text-amber-600 normal-case font-normal"><Crown size={11} />{t('owner')}</span>}
          </label>
          <input
            type="text"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            disabled={!isOwner}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        {/* Invite code */}
        <div className="bg-white rounded-xl shadow-sm px-4 py-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {t('inviteCode')}
          </label>
          <div className="flex items-center justify-between gap-3">
            <span className="text-2xl font-mono font-bold tracking-widest text-green-700 flex-1">
              {family.invite_code}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={copyCode} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 transition">
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                {copied ? t('copied') : t('copyCode')}
              </button>
              {isOwner && (
                <button
                  onClick={regenerateCode}
                  disabled={regenerating}
                  title={t('regenerateTitle')}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500 transition disabled:opacity-50 border border-gray-200 rounded-lg px-2 py-1"
                >
                  <RefreshCw size={13} className={regenerating ? 'animate-spin' : ''} />
                  {t('regenerate')}
                </button>
              )}
            </div>
          </div>
          {isOwner && (
            <p className="text-xs text-gray-400 mt-2">
              {t('regenerateWarning')}
            </p>
          )}
        </div>

        {/* Active meal types */}
        <div className="bg-white rounded-xl shadow-sm px-4 py-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t('mealTypes')}
          </label>
          <div className="flex gap-2">
            {ALL_MEAL_TYPES.map((mt) => (
              <button
                key={mt}
                onClick={() => toggleMealType(mt)}
                className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition ${
                  activeMealTypes.includes(mt)
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-400'
                }`}
              >
                {mealTypeLabels[mt]}
              </button>
            ))}
          </div>
        </div>

        {/* Active days */}
        <div className="bg-white rounded-xl shadow-sm px-4 py-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t('activeDays')}
          </label>
          <div className="flex gap-1">
            {DAY_KEYS.map((k, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`flex-1 py-2 rounded-lg border-2 text-xs font-semibold transition ${
                  activeDays.includes(i)
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-400'
                }`}
              >
                {td(k)}
              </button>
            ))}
          </div>
        </div>

        {/* Cook available days */}
        <div className="bg-white rounded-xl shadow-sm px-4 py-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t('cookAvailableDays')}
          </label>
          <div className="grid grid-cols-7 gap-1">
            {DAY_KEYS.map((k, i) => {
              const on = cookAvailableDays.includes(i)
              return (
                <button
                  key={i}
                  onClick={() => toggleCookDay(i)}
                  className={`rounded-xl border-2 py-2 flex flex-col items-center justify-center gap-1 transition active:scale-[0.98] ${
                    on
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-400'
                  }`}
                  title={on ? tp('cookAvailable') : tp('noCook')}
                >
                  <span className="text-xs font-semibold">{td(k)}</span>
                  {on
                    ? <ToggleRight size={22} className="text-green-600" />
                    : <ToggleLeft size={22} className="text-gray-300" />}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {tp('noCook')}: {tp('readyMeal')}
          </p>
        </div>

        {/* Nutrition style */}
        <div className="bg-white rounded-xl shadow-sm px-4 py-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t('nutritionStyle')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {NUTRITION_STYLES.map((style) => (
              <button
                key={style}
                onClick={() => setNutritionStyle(style)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition text-left ${
                  nutritionStyle === style
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">{NUTRITION_STYLE_ICONS[style]}</span>
                <span className="text-xs leading-tight">{t(`styles.${style}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="bg-white rounded-xl shadow-sm px-4 py-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t('language')}
          </label>
          <div className="flex gap-2">
            {(['de', 'en'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition ${
                  language === lang
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-500'
                }`}
              >
                {t(`languages.${lang}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-60"
        >
          {saving ? t('saving') : t('save')}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-red-500 py-2 transition"
        >
          <LogOut size={15} />
          {t('logout')}
        </button>
      </div>
    </div>
  )
}
