import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-server'

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
}

export function forbiddenResponse() {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 })
}

export async function requireUser(): Promise<User | null> {
  return getAuthUser()
}

export async function requireFamilyMember(userId: string, familyId: string): Promise<boolean> {
  const member = await prisma.member.findFirst({
    where: { user_id: userId, family_id: familyId },
    select: { id: true },
  })
  return !!member
}

export async function requireOwner(userId: string, familyId: string): Promise<boolean> {
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: { owner_id: true },
  })
  return !!family && family.owner_id === userId
}

export async function getFamilyIdByPlanDayId(planDayId: string): Promise<string | null> {
  const planDay = await prisma.planDay.findUnique({
    where: { id: planDayId },
    select: { week_plan: { select: { family_id: true } } },
  })
  return planDay?.week_plan.family_id ?? null
}

export async function getFamilyIdByWishId(wishId: string): Promise<string | null> {
  const wish = await prisma.familyWish.findUnique({
    where: { id: wishId },
    select: { family_id: true },
  })
  return wish?.family_id ?? null
}

export async function getFamilyIdByShoppingItemId(itemId: string): Promise<string | null> {
  const item = await prisma.shoppingItem.findUnique({
    where: { id: itemId },
    select: { family_id: true },
  })
  return item?.family_id ?? null
}

export async function getFamilyIdByMemberId(memberId: string): Promise<string | null> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { family_id: true },
  })
  return member?.family_id ?? null
}
