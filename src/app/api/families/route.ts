import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-server'

export const runtime = 'nodejs'

const log = createLogger('POST /api/families')

export async function POST(req: NextRequest) {
  log.info('start')
  const user = await getAuthUser()
  if (!user) {
    log.warn('no user session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  log.info('user', user.id)

  const body = await req.json()
  const { name, nutrition_style, language } = body
  log.info('body', { name, nutrition_style, language })
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  try {
    const family = await prisma.family.create({
      data: {
        name,
        nutrition_style: nutrition_style ?? 'balanced',
        language: language ?? 'de',
        owner_id: user.id,
      },
    })

    log.info('created family', family.id)
    return NextResponse.json(family)
  } catch (e) {
    log.error('insert failed', e)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}
