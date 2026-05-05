'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { Family, Member } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface FamilyContextType {
  family: Family | null
  members: Member[]
  currentMember: Member | null
  isOwner: boolean
  userId: string | null
  loading: boolean
  refresh: () => Promise<void>
}

const FamilyContext = createContext<FamilyContextType>({
  family: null,
  members: [],
  currentMember: null,
  isOwner: false,
  userId: null,
  loading: true,
  refresh: async () => {},
})

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [currentMember, setCurrentMember] = useState<Member | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Important: avoid any intermediary caching (e.g. service worker / next-pwa)
    // or we might get stale "family: null" responses right after create/join.
    const res = await fetch('/api/context', { cache: 'no-store' })
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setUserId(data.userId ?? user.id)
    setFamily((data.family ?? null) as Family | null)
    setCurrentMember((data.currentMember ?? null) as Member | null)
    setMembers((data.members ?? []) as Member[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const isOwner = !!userId && !!family && family.owner_id === userId

  return (
    <FamilyContext.Provider value={{ family, members, currentMember, isOwner, userId, loading, refresh: load }}>
      {children}
    </FamilyContext.Provider>
  )
}

export const useFamilyContext = () => useContext(FamilyContext)
