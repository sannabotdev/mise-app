'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import type { Family, Member } from '@/types'
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

    setUserId(user.id)

    const { data: myMember } = await supabase
      .from('members')
      .select('*, family:families(*)')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!myMember || !myMember.family) {
      setFamily(null)
      setCurrentMember(null)
      setMembers([])
      setLoading(false)
      return
    }

    const { data: allMembers } = await supabase
      .from('members')
      .select('*')
      .eq('family_id', myMember.family_id)
      .order('created_at')

    setFamily(myMember.family as unknown as Family)
    setCurrentMember(myMember as unknown as Member)
    setMembers((allMembers ?? []) as unknown as Member[])
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
