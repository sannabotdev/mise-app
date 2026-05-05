import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-server'
import { ALL_MEAL_TYPES, DAY_KEYS, NUTRITION_STYLES } from '@/lib/domain/plan'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const updateData = {
    ...(typeof body.name === 'string' ? { name: body.name } : {}),
    ...(typeof body.invite_code === 'string' ? { invite_code: body.invite_code.toUpperCase() } : {}),
    ...(NUTRITION_STYLES.includes(body.nutrition_style) ? { nutrition_style: body.nutrition_style } : {}),
    ...(body.language === 'de' || body.language === 'en' ? { language: body.language } : {}),
    ...(Array.isArray(body.active_meal_types)
      ? {
          active_meal_types: body.active_meal_types.filter((meal: string) =>
            (ALL_MEAL_TYPES as readonly string[]).includes(meal)
          ),
        }
      : {}),
    ...(Array.isArray(body.active_days)
      ? {
          active_days: body.active_days.filter((day: number) => day >= 0 && day < DAY_KEYS.length),
        }
      : {}),
    ...(Array.isArray(body.cook_available_days)
      ? {
          cook_available_days: body.cook_available_days.filter((day: number) => day >= 0 && day < DAY_KEYS.length),
        }
      : {}),
  }

  const family = await prisma.family.findUnique({
    where: { id: params.id },
    select: { owner_id: true },
  })
  if (!family) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (family.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const updated = await prisma.family.update({
      where: { id: params.id },
      data: updateData,
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}

