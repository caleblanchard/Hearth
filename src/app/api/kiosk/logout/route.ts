import { NextResponse } from 'next/server'
import { authenticateChildSession, endChildSession } from '@/lib/kiosk-auth'

export async function POST() {
  const childAuth = await authenticateChildSession()
  if (!childAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await endChildSession(childAuth.sessionId)
  const res = NextResponse.json({ success: true })
  res.cookies.set('kiosk_child_token', '', { path: '/', maxAge: 0 })
  return res
}
