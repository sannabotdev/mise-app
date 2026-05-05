import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { coerceShoppingCategory } from '@/lib/domain/shopping'
import { forbiddenResponse, requireFamilyMember, requireUser, unauthorizedResponse } from '@/lib/server/authz'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const family_id = req.nextUrl.searchParams.get('family_id')
  if (!family_id) return NextResponse.json({ error: 'missing_family_id' }, { status: 400 })

  const allowed = await requireFamilyMember(user.id, family_id)
  if (!allowed) return forbiddenResponse()

  const items = await prisma.shoppingItem.findMany({
    where: { family_id },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (!user) return unauthorizedResponse()

  const body = await req.json()
  const { family_id, name, amount, unit, category } = body
  if (!family_id || !name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const allowed = await requireFamilyMember(user.id, family_id)
  if (!allowed) return forbiddenResponse()

  try {
    const coercedCategory = coerceShoppingCategory(category)

    const existing = await prisma.shoppingItem.findFirst({
      where: {
        family_id,
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true },
    })

    const result = existing
      ? await prisma.shoppingItem.update({
          where: { id: existing.id },
          data: { amount, unit, category: coercedCategory },
        })
      : await prisma.shoppingItem.create({
          data: { family_id, name, amount, unit, category: coercedCategory, checked: false },
        })

    await prisma.productHistory.upsert({
      where: { family_id_name: { family_id, name } },
      create: { family_id, name, unit, category: coercedCategory },
      update: { unit, category: coercedCategory },
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}
