'use client'

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

type BlockingState = {
  count: number
  label: string | null
}

type GlobalLoadingApi = {
  topbarActive: boolean
  blockingActive: boolean
  blockingLabel: string | null
  runTopbar<T>(fn: () => Promise<T>, opts?: { minMs?: number }): Promise<T>
  runBlocking<T>(fn: () => Promise<T>, opts?: { label?: string; minMs?: number }): Promise<T>
  showBlocking(label?: string): () => void
}

const GlobalLoadingContext = createContext<GlobalLoadingApi | null>(null)

function waitMs(ms: number) {
  if (ms <= 0) return Promise.resolve()
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function withMinimumDuration<T>(promise: Promise<T>, minMs: number) {
  const start = Date.now()
  const result = await promise
  const elapsed = Date.now() - start
  if (elapsed < minMs) await waitMs(minMs - elapsed)
  return result
}

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [topbarCount, setTopbarCount] = useState(0)
  const [blocking, setBlocking] = useState<BlockingState>({ count: 0, label: null })

  const blockingLabelRef = useRef<string | null>(null)

  const showBlocking = useCallback((label?: string) => {
    setBlocking((prev) => ({
      count: prev.count + 1,
      label: label ?? prev.label ?? null,
    }))
    if (label) blockingLabelRef.current = label

    let closed = false
    return () => {
      if (closed) return
      closed = true
      setBlocking((prev) => {
        const nextCount = Math.max(0, prev.count - 1)
        if (nextCount === 0) blockingLabelRef.current = null
        return { count: nextCount, label: nextCount === 0 ? null : (prev.label ?? null) }
      })
    }
  }, [])

  const runTopbar = useCallback(async <T,>(fn: () => Promise<T>, opts?: { minMs?: number }) => {
    const minMs = opts?.minMs ?? 350
    setTopbarCount((c) => c + 1)
    try {
      return await withMinimumDuration(fn(), minMs)
    } finally {
      setTopbarCount((c) => Math.max(0, c - 1))
    }
  }, [])

  const runBlocking = useCallback(async <T,>(fn: () => Promise<T>, opts?: { label?: string; minMs?: number }) => {
    const minMs = opts?.minMs ?? 600
    const close = showBlocking(opts?.label)
    try {
      return await withMinimumDuration(fn(), minMs)
    } finally {
      close()
    }
  }, [showBlocking])

  const value = useMemo<GlobalLoadingApi>(() => {
    const blockingActive = blocking.count > 0
    const label = blocking.label ?? blockingLabelRef.current
    return {
      topbarActive: topbarCount > 0,
      blockingActive,
      blockingLabel: blockingActive ? label : null,
      runTopbar,
      runBlocking,
      showBlocking,
    }
  }, [topbarCount, blocking, runTopbar, runBlocking, showBlocking])

  return <GlobalLoadingContext.Provider value={value}>{children}</GlobalLoadingContext.Provider>
}

export function useGlobalLoading() {
  const ctx = useContext(GlobalLoadingContext)
  if (!ctx) throw new Error('useGlobalLoading must be used within GlobalLoadingProvider')
  return ctx
}

