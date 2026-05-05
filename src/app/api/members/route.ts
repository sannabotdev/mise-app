import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-server'

export const runtime = 'nodejs'

const log = createLogger('POST /api/members')

export async function POST(req: NextRequest) {
  log.info('start')
  const user = await getAuthUser()
  if (!user) {
    log.warn('no session')
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  log.info('user', user.id)

  const body = await req.json()
  const { family_id, name, is_child, managed } = body
  log.info('body', { family_id, name, is_child, managed })
  if (!family_id || !name) return NextResponse.json({ error: 'missing_fields' }, { status: 400 })

  let resolvedFamilyId = family_id
  if (family_id.length <= 10) {
    log.info('resolving invite code', family_id)
    const fam = await prisma.family.findUnique({
      where: { invite_code: family_id.toUpperCase() },
      select: { id: true },
    })
    if (!fam) {
      log.warn('invalid invite code', family_id)
      return NextResponse.json({ error: 'invalid_invite_code' }, { status: 404 })
    }
    resolvedFamilyId = fam.id
    log.info('resolved family', resolvedFamilyId)
  }

  try {
    const member = await prisma.member.create({
      data: {
        family_id: resolvedFamilyId,
        user_id: managed ? null : user.id,
        name,
        is_child: is_child ?? false,
      },
    })

    log.info('created member', member.id)
    return NextResponse.json(member)
  } catch (e) {
    log.error('insert member', e)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}
