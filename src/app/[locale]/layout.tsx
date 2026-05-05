import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { FamilyProvider } from '@/lib/family-context'
import BottomNav from '@/components/BottomNav'
import FamilyGuard from '@/components/FamilyGuard'
import { GlobalLoadingProvider } from '@/lib/global-loading'
import TopProgressBar from '@/components/TopProgressBar'
import BlockingLoadingOverlay from '@/components/BlockingLoadingOverlay'

export async function generateMetadata() {
  const t = await getTranslations('meta')
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <GlobalLoadingProvider>
        <div className="max-w-lg mx-auto min-h-screen relative">
          <TopProgressBar />
          <BlockingLoadingOverlay />
          <FamilyProvider>
            <FamilyGuard />
            <main className="pb-20">{children}</main>
            <BottomNav />
          </FamilyProvider>
        </div>
      </GlobalLoadingProvider>
    </NextIntlClientProvider>
  )
}
