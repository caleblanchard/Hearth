import { NextResponse } from 'next/server'
import { authenticateChildSession, updateChildSessionActivity } from '@/lib/kiosk-auth'

export async function POST() {
  const childAuth = await authenticateChildSession()
  if (!childAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await updateChildSessionActivity(childAuth.sessionId)
  return NextResponse.json({ success: true, lastActivityAt: new Date().toISOString() })
}
