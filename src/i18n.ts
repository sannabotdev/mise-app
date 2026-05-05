import { getRequestConfig } from 'next-intl/server'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const requestedLocale = requested ?? DEFAULT_LOCALE
  const locale = SUPPORTED_LOCALES.includes(requestedLocale as (typeof SUPPORTED_LOCALES)[number])
    ? requestedLocale
    : DEFAULT_LOCALE
  const messages = (await import(`../messages/${locale}.json`)).default
  return { locale, messages }
})
