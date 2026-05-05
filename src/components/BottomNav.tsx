'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { CalendarDays, ShoppingCart, UtensilsCrossed, Users, Settings } from 'lucide-react'

const navItems = [
  { key: 'plan', href: '/plan', icon: UtensilsCrossed },
  { key: 'shopping', href: '/shopping', icon: ShoppingCart },
  { key: 'calendar', href: '/calendar', icon: CalendarDays },
  { key: 'family', href: '/family', icon: Users },
  { key: 'settings', href: '/settings', icon: Settings },
] as const

export default function BottomNav() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-200 z-50">
      <div className="flex">
        {navItems.map(({ key, href, icon: Icon }) => {
          const fullHref = `/${locale}${href}`
          const active = pathname.startsWith(fullHref)
          return (
            <Link
              key={key}
              href={fullHref}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
                active ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span>{t(key)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
