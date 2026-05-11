'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2, Mail, Lock, Eye, EyeOff, User, ChevronRight } from 'lucide-react'
import { NutritionStyle } from '@/types'
import { NUTRITION_STYLE_ICONS } from '@/lib/nutrition-styles'

type Step = 'account' | 'family' | 'confirm'
type FamilyChoice = 'create' | 'join'

const NUTRITION_STYLES: NutritionStyle[] = [
  'low_carb_high_protein', 'vegetarian', 'vegan', 'mediterranean', 'balanced', 'paleo',
]

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

export default function RegisterPage() {
  const locale = useLocale()
  const t = useTranslations('auth.register')
  const ts = useTranslations('settings')
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('account')
  const [familyChoice, setFamilyChoice] = useState<FamilyChoice>('create')

  // Schritt 1: Konto
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPw, setShowPw] = useState(false)

  // Schritt 2: Familie
  const [familyName, setFamilyName] = useState('')
  const [nutritionStyle, setNutritionStyle] = useState<NutritionStyle>('balanced')
  const [inviteCode, setInviteCode] = useState('')

  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogle() {
    setGoogleLoading(true)
    const callbackUrl = `${window.location.origin}/api/auth/callback?next=/${locale}/onboard`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
    })
  }

  async function handleAccountNext(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email || !password) return
    setError('')
    setStep('family')
  }

  async function handleFinish() {
    setLoading(true)
    setError('')

    const { data: authData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })

    if (signUpErr || !authData.user) {
      setError(signUpErr?.message ?? t('errorSignupFailed'))
      setLoading(false)
      return
    }

    if (!authData.session) {
      // Email confirmation is required — session will be granted after user clicks the link.
      // The auth callback redirects to /plan → /onboard handles family setup.
      setStep('confirm')
      setLoading(false)
      return
    }

    // Session exists (email confirmation disabled) → go straight to onboard.
    const params = new URLSearchParams({ name: name.trim() })
    if (familyChoice === 'join' && inviteCode) params.set('invite', inviteCode.trim().toUpperCase())
    router.push(`/${locale}/onboard?${params}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-900">Mise</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 'account' ? t('titleAccount') : t('titleFamily')}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex-1 h-1 rounded-full transition-colors ${step === 'account' ? 'bg-green-600' : 'bg-green-600'}`} />
          <div className={`flex-1 h-1 rounded-full transition-colors ${step === 'family' ? 'bg-green-600' : 'bg-gray-200'}`} />
        </div>

        {/* ── Schritt 1: Konto ── */}
        {step === 'account' && (
          <>
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-medium shadow-sm hover:bg-gray-50 transition mb-4 disabled:opacity-60"
            >
              {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
              {t('google')}
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">{t('or')}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <form onSubmit={handleAccountNext} className="space-y-3">
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  required
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  required
                  autoComplete="email"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-10 py-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <button
                type="submit"
                disabled={!name.trim() || !email || password.length < 6}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {t('next')} <ChevronRight size={16} />
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              {t('haveAccount')}{' '}
              <Link href={`/${locale}/auth/login`} className="text-green-600 font-medium">
                {t('login')}
              </Link>
            </p>
          </>
        )}

        {/* ── Schritt: E-Mail bestätigen ── */}
        {step === 'confirm' && (
          <div className="text-center space-y-4 py-4">
            <div className="text-5xl">📧</div>
            <h2 className="text-lg font-semibold text-gray-900">{t('confirmTitle')}</h2>
            <p className="text-sm text-gray-500">{t('confirmHint', { email })}</p>
            <p className="text-xs text-gray-400">{t('confirmSubhint')}</p>
          </div>
        )}

        {/* ── Schritt 2: Familie ── */}
        {step === 'family' && (
          <div className="space-y-4">
            {/* Toggle Create / Join */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setFamilyChoice('create')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  familyChoice === 'create' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                {t('choiceCreate')}
              </button>
              <button
                onClick={() => setFamilyChoice('join')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  familyChoice === 'join' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                {t('choiceJoin')}
              </button>
            </div>

            {familyChoice === 'create' ? (
              <>
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
                    {NUTRITION_STYLES.map((style) => (
                      <button
                        key={style}
                        onClick={() => setNutritionStyle(style)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-medium transition text-left ${
                          nutritionStyle === style
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        <span className="text-base">{NUTRITION_STYLE_ICONS[style]}</span>
                        {ts(`styles.${style}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-3">
                  {t('joinHint')}
                </p>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder={t('invitePlaceholder')}
                  maxLength={8}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono uppercase tracking-widest outline-none focus:border-green-500"
                />
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <button
              onClick={handleFinish}
              disabled={loading || (familyChoice === 'join' && inviteCode.length < 6)}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading
                ? <Loader2 size={18} className="animate-spin" />
                : familyChoice === 'create' ? t('finishCreate') : t('finishJoin')}
            </button>

            <button onClick={() => { setStep('account'); setError('') }} className="w-full text-sm text-gray-400 py-1">
              {t('back')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
