import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-server'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const log = createLogger(`PATCH /api/members/${params.id}`)
  log.info('start')

  const user = await getAuthUser()
  if (!user) { log.warn('no session'); return NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }

  const body = await req.json()
  const updateData = {
    ...(typeof body.name === 'string' ? { name: body.name } : {}),
    ...(typeof body.is_child === 'boolean' ? { is_child: body.is_child } : {}),
    ...(Array.isArray(body.preferences) ? { preferences: body.preferences.filter((v: unknown) => typeof v === 'string') } : {}),
    ...(Array.isArray(body.dislikes) ? { dislikes: body.dislikes.filter((v: unknown) => typeof v === 'string') } : {}),
    ...(body.meal_schedule && typeof body.meal_schedule === 'object' ? { meal_schedule: body.meal_schedule } : {}),
  }
  const callerMember = await prisma.member.findFirst({
    where: { user_id: user.id },
    select: { family_id: true },
  })
  if (!callerMember) {
    log.warn('caller not a member')
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const targetMember = await prisma.member.findUnique({
    where: { id: params.id },
    select: { family_id: true },
  })
  if (!targetMember || targetMember.family_id !== callerMember.family_id) {
    log.warn('cross-family edit attempt')
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const updated = await prisma.member.update({ where: { id: params.id }, data: updateData })
    log.info('updated')
    return NextResponse.json(updated)
  } catch (e) {
    log.error('update', e)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const log = createLogger(`DELETE /api/members/${params.id}`)
  log.info('start')

  const user = await getAuthUser()
  if (!user) { log.warn('no session'); return NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }

  const callerMember = await prisma.member.findFirst({
    where: { user_id: user.id },
    select: { family_id: true },
  })
  if (!callerMember) {
    log.warn('caller not a member')
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const targetMember = await prisma.member.findUnique({
    where: { id: params.id },
    select: { family_id: true, user_id: true },
  })
  if (!targetMember || targetMember.family_id !== callerMember.family_id) {
    log.warn('cross-family delete attempt')
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (targetMember.user_id === user.id) {
    log.warn('self-delete attempt')
    return NextResponse.json({ error: 'cannot_delete_own_member' }, { status: 400 })
  }

  try {
    await prisma.member.delete({ where: { id: params.id } })
    log.info('deleted')
    return NextResponse.json({ success: true })
  } catch (e) {
    log.error('delete', e)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}
