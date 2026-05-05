'use client'

import { Loader2 } from 'lucide-react'
import { useGlobalLoading } from '@/lib/global-loading'
import { useTranslations } from 'next-intl'

export default function BlockingLoadingOverlay() {
  const { blockingActive, blockingLabel } = useGlobalLoading()
  const tc = useTranslations('common')

  if (!blockingActive) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />
      <div className="relative mx-6 w-full max-w-sm rounded-2xl bg-white shadow-lg border border-gray-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-green-50 flex items-center justify-center border border-green-100">
            <Loader2 size={18} className="animate-spin text-green-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900">
              {blockingLabel ?? tc('loading')}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {tc('pleaseWait')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

