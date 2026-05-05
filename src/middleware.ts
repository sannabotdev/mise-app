import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import createIntlMiddleware from 'next-intl/middleware'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getLocaleFromPathname,
  isPublicPath,
} from '@/lib/routing'

const intlMiddleware = createIntlMiddleware({
  locales: [...SUPPORTED_LOCALES],
  defaultLocale: DEFAULT_LOCALE,
})

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API-Routen nicht anfassen (außer /api/auth/callback wird von Supabase aufgerufen)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/callback')) {
    return NextResponse.next()
  }

  // Öffentliche Seiten direkt mit i18n durchlassen
  if (isPublicPath(pathname)) {
    return intlMiddleware(request)
  }

  // Auth-Check: Supabase Session lesen und ggf. refreshen
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const locale = getLocaleFromPathname(pathname)
    const loginUrl = new URL(`/${locale}/auth/login`, request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Eingeloggt → i18n-Middleware anwenden und Session-Cookies weiterreichen
  const intlResponse = intlMiddleware(request)
  // Cookies aus dem Auth-Refresh in die i18n-Response übertragen
  response.cookies.getAll().forEach(({ name, value }) => {
    intlResponse.cookies.set(name, value)
  })
  return intlResponse
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}
