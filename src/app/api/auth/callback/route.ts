import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/routing'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  // next-intl speichert die Locale im Pfad – wir lesen sie aus dem next-Parameter
  const nextLocale = next.split('/')[1]
  const locale = SUPPORTED_LOCALES.includes(nextLocale as (typeof SUPPORTED_LOCALES)[number])
    ? nextLocale
    : DEFAULT_LOCALE

  if (!code) {
    return NextResponse.redirect(`${origin}/${locale}/auth/login?error=no_code`)
  }

  const supabase = createClient()

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/${locale}/auth/login?error=exchange_failed`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/${locale}/auth/login`)
  }

  // Prüfen ob der User schon ein Member-Profil hat
  const member = await prisma.member.findFirst({
    where: { user_id: user.id },
    select: { id: true },
  })

  if (member) {
    return NextResponse.redirect(`${origin}/${locale}/plan`)
  }

  // Neu: Name aus OAuth-Metadaten vorausfüllen
  const displayName = user.user_metadata?.full_name ?? user.email ?? ''
  const encoded = encodeURIComponent(displayName)
  return NextResponse.redirect(`${origin}/${locale}/onboard?name=${encoded}`)
}
