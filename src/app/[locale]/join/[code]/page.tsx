'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function JoinPage({ params }: { params: { code: string; locale: string } }) {
  const t = useTranslations('join')
  const [name, setName] = useState('')
  const [preferences, setPreferences] = useState('')
  const [dislikes, setDislikes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        const callbackUrl = encodeURIComponent(`/${params.locale}/join/${params.code}`)
        router.replace(`/${params.locale}/auth/login?next=${callbackUrl}`)
      } else {
        setAuthChecking(false)
      }
    })
  }, [params.code, params.locale, router, supabase])

  async function join() {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError(t('invalidCode')); setLoading(false); return }

    const { data: familyId } = await supabase.rpc('get_family_id_by_invite_code', {
      p_invite_code: params.code.toUpperCase(),
    })
    if (!familyId) { setError(t('invalidCode')); setLoading(false); return }

    const { error: memErr } = await supabase.from('members').insert({
      family_id: familyId as string,
      name: name.trim(),
      user_id: user.id,
      preferences: preferences.split(',').map((s) => s.trim()).filter(Boolean),
      dislikes: dislikes.split(',').map((s) => s.trim()).filter(Boolean),
    })

    if (memErr) { setError(t('invalidCode')); setLoading(false); return }
    router.push(`/${params.locale}/plan`)
  }

  if (authChecking) return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-900">Mise</h1>
          <p className="text-gray-500 text-sm mt-1">{t('title')}</p>
          <div className="mt-3 text-xs font-mono bg-green-50 text-green-700 px-3 py-1.5 rounded-full inline-block">
            {params.code.toUpperCase()}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{t('name')} *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              placeholder={t('namePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{t('preferences')}</label>
            <input
              type="text"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              placeholder={t('preferencesPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{t('dislikes')}</label>
            <input
              type="text"
              value={dislikes}
              onChange={(e) => setDislikes(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              placeholder={t('dislikesPlaceholder')}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            onClick={join}
            disabled={!name.trim() || loading}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-60"
          >
            {loading ? t('joining') : t('join')}
          </button>
        </div>
      </div>
    </div>
  )
}
