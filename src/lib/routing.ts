export const SUPPORTED_LOCALES = ['de', 'en'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = 'de'

export const PUBLIC_PATH_PREFIXES = ['/auth/login', '/auth/register', '/onboard', '/join/'] as const
export const FAMILY_GUARD_SKIP_PREFIXES = ['/auth/', '/onboard', '/join/'] as const

export function stripLocalePrefix(pathname: string): string {
  const localePattern = new RegExp(`^/(${SUPPORTED_LOCALES.join('|')})(?=/|$)`)
  const stripped = pathname.replace(localePattern, '')
  return stripped || '/'
}

export function getLocaleFromPathname(pathname: string): AppLocale {
  const locale = pathname.match(new RegExp(`^/(${SUPPORTED_LOCALES.join('|')})(?=/|$)`))?.[1]
  return (locale as AppLocale | undefined) ?? DEFAULT_LOCALE
}

export function isPublicPath(pathname: string): boolean {
  const stripped = stripLocalePrefix(pathname)
  return PUBLIC_PATH_PREFIXES.some((prefix) => stripped.startsWith(prefix))
}
