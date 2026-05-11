'use client'

// Wird erreicht wenn ein User per Google OAuth registriert hat,
// aber noch kein Member-Eintrag existiert.

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { NutritionStyle } from '@/types'
import { NUTRITION_STYLE_ICONS } from '@/lib/nutrition-styles'
import { NUTRITION_STYLES } from '@/lib/domain/plan'
import { useFamilyContext } from '@/lib/family-context'
import { Loader2 } from 'lucide-react'
import { useGlobalLoading } from '@/lib/global-loading'

type Choice = 'pick' | 'create' | 'join'

export default function OnboardPage() {
  const locale = useLocale()
  const t = useTranslations('onboard')
  const ts = useTranslations('settings')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const gl = useGlobalLoading()

  const { refresh } = useFamilyContext()

  const inviteParam = searchParams.get('invite') ?? ''
  const [choice, setChoice] = useState<Choice>(inviteParam ? 'join' : 'pick')
  const [name, setName] = useState(searchParams.get('name') ?? '')
  const [familyName, setFamilyName] = useState('')
  const [nutritionStyle, setNutritionStyle] = useState<NutritionStyle>('balanced')
  const [inviteCode, setInviteCode] = useState(inviteParam)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push(`/${locale}/auth/login`); return }
      if (!name && user.user_metadata?.full_name) setName(user.user_metadata.full_name)
    })
  }, [locale, name, router, supabase])

  async function createFamily() {
    if (!name.trim()) return
    setLoading(true); setError('')
    await gl.runBlocking(async () => {
      const { error } = await supabase.rpc('create_family_and_member', {
        p_family_name: familyName.trim() || t('familyNamePlaceholder', { name: name.trim() }),
        p_member_name: name.trim(),
        p_nutrition_style: nutritionStyle,
        p_language: locale as 'de' | 'en',
      })
      if (error) throw new Error(error.message)

      await refresh()
      router.push(`/${locale}/plan`)
    }).catch(() => setError(t('errorCreateFamily')))
      .finally(() => setLoading(false))
  }

  async function joinFamily() {
    if (!name.trim() || !inviteCode) return
    setLoading(true); setError('')
    await gl.runBlocking(async () => {
      const { error } = await supabase.rpc('join_family_as_member', {
        p_invite_code: inviteCode.toUpperCase(),
        p_member_name: name.trim(),
      })
      if (error) throw new Error(error.message)

      await refresh()
      router.push(`/${locale}/plan`)
    }).catch(() => setError(t('errorInvalidInvite')))
      .finally(() => setLoading(false))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 mb-1">{t('yourName')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500"
          />
        </div>

        {choice === 'pick' && (
          <div className="space-y-3">
            <button onClick={() => setChoice('create')} className="w-full bg-green-600 text-white py-3.5 rounded-xl font-semibold">
              {t('pickCreate')}
            </button>
            <button onClick={() => setChoice('join')} className="w-full border-2 border-green-600 text-green-700 py-3.5 rounded-xl font-semibold">
              {t('pickJoin')}
            </button>
          </div>
        )}

        {choice === 'create' && (
          <div className="space-y-4">
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder={t('familyNamePlaceholder', { name })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500"
            />
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">{t('nutritionStyle')}</p>
              <div className="grid grid-cols-2 gap-2">
                {NUTRITION_STYLES.map((s) => (
                  <button key={s} onClick={() => setNutritionStyle(s)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-medium transition ${
                      nutritionStyle === s ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'
                    }`}>
                    <span>{NUTRITION_STYLE_ICONS[s]}</span>{ts(`styles.${s}`)}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <button onClick={createFamily} disabled={loading || !name.trim()}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center">
              {loading ? <Loader2 size={18} className="animate-spin" /> : t('createButton')}
            </button>
            <button onClick={() => setChoice('pick')} className="w-full text-sm text-gray-400">{t('back')}</button>
          </div>
        )}

        {choice === 'join' && (
          <div className="space-y-4">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder={t('invitePlaceholder')}
              maxLength={8}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono uppercase tracking-widest outline-none focus:border-green-500"
            />
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <button onClick={joinFamily} disabled={loading || !name.trim() || inviteCode.length < 6}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center">
              {loading ? <Loader2 size={18} className="animate-spin" /> : t('joinButton')}
            </button>
            <button onClick={() => setChoice('pick')} className="w-full text-sm text-gray-400">{t('back')}</button>
          </div>
        )}
      </div>
    </div>
  )
}
