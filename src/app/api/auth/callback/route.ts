import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/routing'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
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

  // Let the plan page handle member existence check and redirect to /onboard if needed
  return NextResponse.redirect(`${origin}/${locale}/plan`)
}
