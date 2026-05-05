import { getSessionUser } from '@/lib/supabase/server'

export async function getAuthUser() {
  return getSessionUser()
}

