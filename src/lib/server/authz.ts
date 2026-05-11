import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { getSessionUser } from '@/lib/supabase/server'

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
}

export function forbiddenResponse() {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 })
}

export async function requireUser(): Promise<User | null> {
  return getSessionUser()
}
