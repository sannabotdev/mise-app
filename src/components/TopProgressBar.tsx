'use client'

import { useGlobalLoading } from '@/lib/global-loading'

export default function TopProgressBar() {
  const { topbarActive } = useGlobalLoading()

  return (
    <div
      aria-hidden={!topbarActive}
      className={[
        'pointer-events-none fixed left-0 right-0 top-0 z-[60] h-1',
        topbarActive ? 'opacity-100' : 'opacity-0',
        'transition-opacity duration-200',
      ].join(' ')}
    >
      <div className="relative h-1 w-full overflow-hidden bg-transparent">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500 to-transparent animate-mise-topbar" />
      </div>
    </div>
  )
}

