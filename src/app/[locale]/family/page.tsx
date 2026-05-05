'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useFamilyContext } from '@/lib/family-context'
import { Member } from '@/types'
import { ALL_DAYS, DAY_KEYS } from '@/lib/domain/plan'
import { Plus, Edit2, X, Check, Baby, User, Trash2, Loader2 } from 'lucide-react'
import { useGlobalLoading } from '@/lib/global-loading'

interface MemberForm {
  name: string
  is_child: boolean
  preferences: string
  dislikes: string
  schedule: Record<string, string[]>  // dayIndex_str → meal_types[]
}

function initSchedule(m: Member, activeMealTypes: string[]): Record<string, string[]> {
  const base = m.meal_schedule ?? {}
  return Object.fromEntries(
    ALL_DAYS.map((d) => [String(d), base[String(d)] ?? [...activeMealTypes]])
  )
}

function defaultNewSchedule(activeDays: number[], activeMealTypes: string[]): Record<string, string[]> {
  return Object.fromEntries(
    ALL_DAYS.map((d) => [String(d), activeDays.includes(d) ? [...activeMealTypes] : []])
  )
}

export default function FamilyPage() {
  const t = useTranslations('family')
  const tx = useTranslations('familyExtras')
  const { family, members, currentMember, refresh } = useFamilyContext()
  const gl = useGlobalLoading()
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<MemberForm>({ name: '', is_child: false, preferences: '', dislikes: '', schedule: {} })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const activeDays: number[] = family?.active_days ?? [0, 1, 2, 3, 4, 5, 6]
  const activeMealTypes: string[] = family?.active_meal_types ?? ['breakfast', 'lunch', 'dinner']
  const isOwner = family?.owner_id === currentMember?.user_id

  function startEdit(m: Member) {
    setEditingId(m.id)
    setForm({
      name: m.name,
      is_child: m.is_child,
      preferences: m.preferences.join(', '),
      dislikes: m.dislikes.join(', '),
      schedule: initSchedule(m, activeMealTypes),
    })
  }

  function startNew() {
    setEditingId('new')
    setForm({
      name: '',
      is_child: false,
      preferences: '',
      dislikes: '',
      schedule: defaultNewSchedule(activeDays, activeMealTypes),
    })
  }

  function toggleSlot(dayIndex: number, mealType: string) {
    const key = String(dayIndex)
    const current = form.schedule[key] ?? []
    const next = current.includes(mealType)
      ? current.filter((m) => m !== mealType)
      : [...current, mealType]
    setForm((f) => ({ ...f, schedule: { ...f.schedule, [key]: next } }))
  }

  async function save() {
    if (!family || !form.name.trim()) return
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      is_child: form.is_child,
      preferences: form.preferences.split(',').map((s) => s.trim()).filter(Boolean),
      dislikes: form.dislikes.split(',').map((s) => s.trim()).filter(Boolean),
      meal_schedule: form.schedule,
    }

    await gl.runTopbar(async () => {
      if (editingId === 'new') {
        await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ family_id: family.id, ...payload, managed: true }),
        })
      } else {
        await fetch(`/api/members/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      refresh()
      setEditingId(null)
    }).finally(() => setSaving(false))
  }

  async function deleteMember(id: string) {
    setDeletingId(id)
    await gl.runTopbar(async () => {
      await fetch(`/api/members/${id}`, { method: 'DELETE' })
      refresh()
    }).finally(() => setDeletingId(null))
  }

  const canEdit = (m: Member) => isOwner || m.id === currentMember?.id

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{t('title')}</h1>
          {isOwner && (
            <button
              onClick={startNew}
              className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <Plus size={15} />
              {t('addMember')}
            </button>
          )}
        </div>
        {family && <p className="text-sm text-gray-500 mt-0.5">{family.name}</p>}
      </div>

      <div className="px-4 mt-4 space-y-3">
        {members.map((m) => (
          <div key={m.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            {editingId === m.id ? (
              <MemberEditForm
                form={form}
                setForm={setForm}
                onToggleSlot={toggleSlot}
                onSave={save}
                onCancel={() => setEditingId(null)}
                saving={saving}
                activeDays={activeDays}
                activeMealTypes={activeMealTypes}
                t={t}
                tx={tx}
              />
            ) : (
              <div className="px-4 py-3 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  {m.is_child
                    ? <Baby size={18} className="text-green-600" />
                    : <User size={18} className="text-green-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{m.name}</span>
                    {m.is_child && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{tx('child')}</span>
                    )}
                    {!m.user_id && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{tx('managed')}</span>
                    )}
                    {m.id === currentMember?.id && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{tx('you')}</span>
                    )}
                  </div>
                  {m.preferences.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">✓ {m.preferences.join(', ')}</p>
                  )}
                  {m.dislikes.length > 0 && (
                    <p className="text-xs text-gray-400">✗ {m.dislikes.join(', ')}</p>
                  )}
                  {m.meal_schedule && (
                    <ScheduleSummary schedule={m.meal_schedule} activeDays={activeDays} activeMealTypes={activeMealTypes} tx={tx} />
                  )}
                </div>
                {canEdit(m) && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(m)} className="p-1.5 text-gray-400 hover:text-gray-600">
                      <Edit2 size={15} />
                    </button>
                    {!m.user_id && isOwner && (
                      <button
                        onClick={() => deleteMember(m.id)}
                        disabled={deletingId === m.id}
                        className="p-1.5 text-gray-300 hover:text-red-400 disabled:opacity-50"
                      >
                        {deletingId === m.id
                          ? <Loader2 size={15} className="animate-spin" />
                          : <Trash2 size={15} />}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {editingId === 'new' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-green-50 border-b border-green-100">
              <span className="text-sm font-semibold text-green-700">{t('addMember')}</span>
              <p className="text-xs text-green-600 mt-0.5">{tx('managedHint')}</p>
            </div>
            <MemberEditForm
              form={form}
              setForm={setForm}
              onToggleSlot={toggleSlot}
              onSave={save}
              onCancel={() => setEditingId(null)}
              saving={saving}
              activeDays={activeDays}
              activeMealTypes={activeMealTypes}
              t={t}
              tx={tx}
            />
          </div>
        )}

        {members.length === 0 && editingId !== 'new' && (
          <div className="text-center py-12 text-gray-400 text-sm">
            {tx('empty')}
          </div>
        )}
      </div>
    </div>
  )
}

function ScheduleSummary({
  schedule, activeDays, activeMealTypes, tx,
}: {
  schedule: Record<string, string[]>
  activeDays: number[]
  activeMealTypes: string[]
  tx: ReturnType<typeof useTranslations>
}) {
  const allDefault = activeDays.every((d) => {
    const meals = schedule[String(d)] ?? []
    return activeMealTypes.every((mt) => meals.includes(mt))
  })
  if (allDefault) return null

  const parts = activeDays
    .map((d) => {
      const meals = schedule[String(d)] ?? []
      const active = activeMealTypes.filter((mt) => meals.includes(mt))
      if (active.length === 0) return null
      const dayKey = DAY_KEYS[d]
      const mealAbbrevs = active.map((mt) => tx(`mealShort.${mt}`)).join('/')
      return `${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}: ${mealAbbrevs}`
    })
    .filter(Boolean)

  return (
    <p className="text-xs text-gray-400 mt-0.5">
      {parts.join(' · ')}
    </p>
  )
}

function MemberEditForm({
  form, setForm, onToggleSlot, onSave, onCancel, saving, activeDays, activeMealTypes, t, tx,
}: {
  form: MemberForm
  setForm: (f: MemberForm) => void
  onToggleSlot: (dayIndex: number, mealType: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  activeDays: number[]
  activeMealTypes: string[]
  t: ReturnType<typeof useTranslations>
  tx: ReturnType<typeof useTranslations>
}) {
  const td = useTranslations('days')

  return (
    <div className="px-4 py-3 space-y-3">
      <input
        type="text"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder={t('name')}
        autoFocus
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500"
      />
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.is_child}
          onChange={(e) => setForm({ ...form, is_child: e.target.checked })}
          className="w-4 h-4 rounded accent-green-600"
        />
        {t('isChild')}
      </label>
      <input
        type="text"
        value={form.preferences}
        onChange={(e) => setForm({ ...form, preferences: e.target.value })}
        placeholder={`${t('preferences')} ${tx('commaSeparated')}`}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500"
      />
      <input
        type="text"
        value={form.dislikes}
        onChange={(e) => setForm({ ...form, dislikes: e.target.value })}
        placeholder={`${t('dislikes')} ${tx('commaSeparated')}`}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500"
      />

      {/* Schedule grid */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">{tx('schedule')}</p>
        <p className="text-xs text-gray-400 mb-2">{tx('scheduleHint')}</p>
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          {/* Header row */}
          <div className="grid bg-gray-50 border-b border-gray-100"
            style={{ gridTemplateColumns: `5rem repeat(${activeMealTypes.length}, 1fr)` }}>
            <div />
            {activeMealTypes.map((mt) => (
              <div key={mt} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {tx(`mealShort.${mt}`)}
              </div>
            ))}
          </div>
          {/* Day rows */}
          {activeDays.map((dayIndex, rowIdx) => {
            const dk = DAY_KEYS[dayIndex]
            const dayMeals = form.schedule[String(dayIndex)] ?? []
            return (
              <div
                key={dayIndex}
                className={`grid items-center ${rowIdx < activeDays.length - 1 ? 'border-b border-gray-100' : ''}`}
                style={{ gridTemplateColumns: `5rem repeat(${activeMealTypes.length}, 1fr)` }}
              >
                <span className="px-3 py-2.5 text-sm text-gray-600">{td(dk)}</span>
                {activeMealTypes.map((mt) => {
                  const on = dayMeals.includes(mt)
                  return (
                    <button
                      key={mt}
                      type="button"
                      onClick={() => onToggleSlot(dayIndex, mt)}
                      className="flex items-center justify-center py-2"
                    >
                      <span className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition ${
                        on ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
                      }`}>
                        {on && <Check size={13} className="text-green-600" />}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {t('save')}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600 flex items-center justify-center gap-1.5"
        >
          <X size={14} />
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}
