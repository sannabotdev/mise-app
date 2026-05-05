'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useFamilyContext } from '@/lib/family-context'
import { FAMILY_GUARD_SKIP_PREFIXES, stripLocalePrefix } from '@/lib/routing'

export default function FamilyGuard() {
  const { family, loading } = useFamilyContext()
  const pathname = usePathname()
  const router = useRouter()
  const locale = useLocale()

  useEffect(() => {
    if (loading) return
    const stripped = stripLocalePrefix(pathname)
    if (FAMILY_GUARD_SKIP_PREFIXES.some((prefix) => stripped.startsWith(prefix))) return
    if (!family) router.replace(`/${locale}/onboard`)
  }, [loading, family, pathname, locale, router])

  return null
}
