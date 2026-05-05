'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DAY_KEYS, ALL_MEAL_TYPES } from '@/lib/domain/plan'
import { addDays, isoDate } from '@/lib/date/week'
import { usePlanData } from '@/features/plan/hooks/usePlanData'
import {
  ChefHat,
  Loader2,
  Sparkles,
  X,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  RefreshCcw,
  Trash2,
} from 'lucide-react'

export default function PlanScreen({
  weekStart,
  dayIndex,
}: {
  weekStart: string
  dayIndex: number
}) {
  const t = useTranslations('plan')
  const tx = useTranslations('planExtras')
  const tc = useTranslations('common')
  const td = useTranslations('days')
  const locale = useLocale()
  const {
    family,
    members,
    currentMember,
    loading,
    monday,
    weekStart: computedWeekStart,
    selectedDayIndex,
    isFetchingPlan,
    activeDayTabs,
    currentDay,
    wishes,
    generating,
    requestGenerate,
    configOpen,
    setConfigOpen,
    configMealTypes,
    setConfigMealTypes,
    configActiveDays,
    setConfigActiveDays,
    configCookDays,
    setConfigCookDays,
    weekActiveMealTypes,
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
  } = usePlanData({ locale, t, weekStart, dayIndex })

  function toggleConfigMealType(mt: string) {
    setConfigMealTypes((prev) =>
      prev.includes(mt) ? (prev.length > 1 ? prev.filter((x) => x !== mt) : prev) : [...prev, mt]
    )
  }

  function toggleConfigCookDay(idx: number) {
    setConfigCookDays((prev) => (prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx].sort()))
  }

  function toggleConfigActiveDay(idx: number) {
    setConfigActiveDays((prev) =>
      prev.includes(idx) ? (prev.length > 1 ? prev.filter((x) => x !== idx) : prev) : [...prev, idx].sort()
    )
  }

  const mealLabel = (mt: string) => ({ breakfast: t('breakfast'), lunch: t('lunch'), dinner: t('dinner') }[mt] ?? mt)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-green-600" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
            {family && <p className="text-xs text-gray-400">{family.name}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openWishModal}
              disabled={!family || !currentMember?.id}
              className="relative inline-flex items-center justify-center border border-gray-200 bg-white text-gray-700 w-9 h-9 rounded-lg disabled:opacity-60 active:scale-95 transition"
              title={t('addWish')}
              aria-label={t('addWish')}
            >
              <Sparkles size={18} />
              {wishes.length > 0 && (
                <span className="absolute -top-2 -right-2 text-[11px] leading-none bg-amber-100 text-amber-800 px-1.5 py-1 rounded-full border border-white">
                  {wishes.length}
                </span>
              )}
            </button>

            <button
              onClick={requestGenerate}
              disabled={generating || !family}
              className="inline-flex items-center justify-center bg-green-600 text-white w-9 h-9 rounded-lg disabled:opacity-60 active:scale-95 transition"
              title={t('generate')}
              aria-label={t('generate')}
            >
              {generating ? <Loader2 size={18} className="animate-spin" /> : <ChefHat size={18} />}
            </button>
          </div>
        </div>

        {/* Week nav */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => navigateTo({ weekStart: isoDate(addDays(monday, -7)), dayIndex: selectedDayIndex })}
            className="text-gray-400 hover:text-gray-600 px-1"
            aria-label="prev week"
          >
            ‹
          </button>
          <span className="text-xs text-gray-500 flex-1 text-center">
            {isoDate(monday)} — {isoDate(addDays(monday, 6))}
          </span>
          <button
            onClick={() => navigateTo({ weekStart: isoDate(addDays(monday, 7)), dayIndex: selectedDayIndex })}
            className="text-gray-400 hover:text-gray-600 px-1"
            aria-label="next week"
          >
            ›
          </button>
        </div>

        {/* Day tabs – only active days */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {activeDayTabs.map(({ dk, dayIndex: idx }) => {
            const date = isoDate(addDays(monday, idx))
            const dayData = days.find((d) => d.date === date)
            const hasData = !!dayData?.meals?.length
            return (
              <button
                key={dk}
                onClick={() => navigateTo({ weekStart: computedWeekStart, dayIndex: idx })}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedDayIndex === idx ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <span>{td(dk)}</span>
                {hasData && (
                  <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${selectedDayIndex === idx ? 'bg-white' : 'bg-green-400'}`} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day content */}
      <div className="px-3 py-4">
        {/* Wishes (collected for next generation) */}
        {wishes.length > 0 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">{tx('wishes')}</p>
            <div className="space-y-2">
              {wishes.map((w) => {
                const mem = members.find((m) => m.id === w.member_id)
                return (
                  <div key={w.id} className="flex items-start justify-between gap-2">
                    <div className="text-sm text-amber-800">
                      {mem?.name ? <span className="font-semibold">{mem.name}: </span> : null}
                      <span className="text-amber-800">{w.wish_text}</span>
                    </div>
                    <button onClick={() => deleteWish(w.id)} className="text-amber-700/70 hover:text-amber-900" title={tc('delete')}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Loading overlay while week/day data is fetching */}
        {isFetchingPlan && (
          <div className="mb-4 bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin text-green-600" />
            {tc('loading')}
          </div>
        )}

        {currentDay ? (
          <>
            {/* Meals – only active meal types */}
            <div className="space-y-3">
              {ALL_MEAL_TYPES.filter((mt) => weekActiveMealTypes.includes(mt)).map((mt) => {
                const meal = currentDay.meals?.find((m) => m.meal_type === mt)
                const isExpanded = meal ? expandedMeals.has(meal.id) : false
                return (
                  <div key={mt} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{mealLabel(mt)}</span>
                    </div>
                    {meal ? (
                      <div>
                        <button onClick={() => toggleMealExpand(meal.id)} className="w-full px-3 py-3 text-left">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 leading-snug">{meal.name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{t('servings', { count: meal.servings })}</p>
                              {meal.meal_attendees?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {meal.meal_attendees.map((a) => {
                                    const mem = members.find((m) => m.id === a.member_id)
                                    return mem ? (
                                      <span key={a.member_id} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                                        {mem.name}
                                      </span>
                                    ) : null
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {meal.is_ready_meal && (
                                <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                  <ShoppingBag size={11} />
                                  {t('readyMeal')}
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  regenerateMeal(meal.id)
                                }}
                                disabled={regeneratingMealId === meal.id}
                                className="inline-flex items-center justify-center text-green-700 bg-green-50 border border-green-200 w-9 h-9 rounded-lg disabled:opacity-60"
                                aria-label={tx('regenerateMeal') ?? 'Neu vorschlagen'}
                                title={tx('regenerateMeal') ?? 'Neu vorschlagen'}
                              >
                                {regeneratingMealId === meal.id ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                              </button>
                              {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                            </div>
                          </div>
                        </button>

                        {/* Expandable: ingredients + instructions */}
                        {isExpanded && (
                          <div className="px-3 pb-4 space-y-3 border-t border-gray-50">
                            {meal.recipe_json?.macros_per_serving && (
                              <div className="pt-1">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{tx('macros') ?? 'Makros pro Portion'}</p>
                                <div className="flex flex-wrap gap-2">
                                  <span className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded-full border border-gray-100">
                                    {Math.round(meal.recipe_json.macros_per_serving.kcal)} kcal
                                  </span>
                                  <span className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded-full border border-gray-100">
                                    P {Math.round(meal.recipe_json.macros_per_serving.protein_g)}g
                                  </span>
                                  <span className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded-full border border-gray-100">
                                    KH {Math.round(meal.recipe_json.macros_per_serving.carbs_g)}g
                                  </span>
                                  <span className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded-full border border-gray-100">
                                    F {Math.round(meal.recipe_json.macros_per_serving.fat_g)}g
                                  </span>
                                </div>
                              </div>
                            )}

                            {meal.instructions && (
                              <div className="pt-3">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{tx('instructions')}</p>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{meal.instructions}</p>
                              </div>
                            )}

                            {meal.recipe_json?.ingredients && meal.recipe_json.ingredients.length > 0 && (
                              <div className={meal.instructions ? '' : 'pt-3'}>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{tx('ingredients')}</p>
                                <ul className="space-y-1">
                                  {meal.recipe_json.ingredients.map((ing, idx) => (
                                    <li key={idx} className="text-sm text-gray-700 flex items-baseline gap-2">
                                      <span className="text-gray-400 flex-shrink-0">{ing.amount > 0 ? `${ing.amount} ${ing.unit}` : ing.unit}</span>
                                      <span>{ing.name}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="px-3 py-3 text-sm text-gray-300">—</div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        ) : isFetchingPlan ? (
          <div className="space-y-3">
            {ALL_MEAL_TYPES.filter((mt) => weekActiveMealTypes.includes(mt)).map((mt) => (
              <div key={mt} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{mealLabel(mt)}</span>
                </div>
                <div className="px-3 py-4">
                  <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-1/3 bg-gray-100 rounded mt-2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <ChefHat size={52} strokeWidth={1} />
            <p className="mt-3 text-sm">{t('noMealsYet')}</p>
            <p className="text-xs mt-1 text-gray-300">{tx('noMealsTip')}</p>
          </div>
        )}
      </div>

      {/* Generate / overwrite + config modal */}
      {configOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">{tx('configTitle')}</h2>
              <button onClick={() => setConfigOpen(false)} className="text-gray-400">
                <X size={18} />
              </button>
            </div>

            {days.length > 0 && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">{tx('overwriteTitle')}</p>
                    <p className="text-xs text-amber-800 mt-0.5">{tx('overwriteBody')}</p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 mb-4">{tx('configHint')}</p>

            <div className="space-y-4">
              {/* Meal types */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{tx('configMeals')}</p>
                <div className="flex gap-2">
                  {(ALL_MEAL_TYPES as readonly string[]).map((mt) => {
                    const on = configMealTypes.includes(mt)
                    return (
                      <button
                        key={mt}
                        onClick={() => toggleConfigMealType(mt)}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition ${
                          on ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-400'
                        }`}
                        title={mealLabel(mt)}
                      >
                        {mealLabel(mt)}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Active days */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{tx('configDays')}</p>
                <div className="grid grid-cols-7 gap-1">
                  {DAY_KEYS.map((dk, i) => {
                    const on = configActiveDays.includes(i)
                    return (
                      <button
                        key={dk}
                        onClick={() => toggleConfigActiveDay(i)}
                        className={`rounded-xl border-2 py-2 flex flex-col items-center justify-center gap-1 transition active:scale-[0.98] ${
                          on ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-400'
                        }`}
                        title={td(dk)}
                      >
                        <span className="text-xs font-semibold">{td(dk)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Cook available */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{tx('configCookDays')}</p>
                <div className="grid grid-cols-7 gap-1">
                  {DAY_KEYS.map((dk, i) => {
                    const on = configCookDays.includes(i)
                    return (
                      <button
                        key={dk}
                        onClick={() => toggleConfigCookDay(i)}
                        className={`rounded-xl border-2 py-2 flex flex-col items-center justify-center gap-1 transition active:scale-[0.98] ${
                          on ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-400'
                        }`}
                        title={on ? t('cookAvailable') : t('noCook')}
                      >
                        <span className="text-xs font-semibold">{td(dk)}</span>
                        {on ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} className="text-gray-300" />}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {t('noCook')}: {t('readyMeal')}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfigOpen(false)} className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm text-gray-600 font-medium">
                {tc('cancel')}
              </button>
              <button
                onClick={doGenerateWithConfig}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                disabled={generating || !family}
              >
                {days.length > 0 ? tx('overwriteAndGenerate') : tx('generateNow')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wish modal (center) */}
      {wishSheetOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6"
          onClick={(e) => e.target === e.currentTarget && setWishSheetOpen(false)}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">{t('addWish')}</h2>
              <button onClick={() => setWishSheetOpen(false)} className="text-gray-400">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="text-xs text-gray-400">{currentMember?.name ?? ''}</div>
              <textarea
                value={wishText}
                onChange={(e) => setWishText(e.target.value)}
                placeholder={t('wishPlaceholder')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none h-24"
                autoFocus
              />
              <button
                onClick={submitWish}
                disabled={!wishText.trim()}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                {editingWishId ? (tc('edit') ?? t('submitWish')) : t('submitWish')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

