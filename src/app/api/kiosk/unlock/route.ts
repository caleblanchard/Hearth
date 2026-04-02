import { NextRequest, NextResponse } from 'next/server'
import { authenticateDeviceSecret, insertChildSession } from '@/lib/kiosk-auth'
import { createServiceClient } from '@/lib/supabase/service'
import bcrypt from 'bcrypt'

export async function POST(req: NextRequest) {
  const deviceAuth = await authenticateDeviceSecret()
  if (!deviceAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId, pin } = await req.json().catch(() => ({}))
  if (!memberId || !pin) return NextResponse.json({ error: 'memberId and pin required' }, { status: 400 })

  const supabase = await createServiceClient()
  const { data: member, error } = await supabase
    .from('family_members')
    .select('id,family_id,pin')
    .eq('id', memberId)
    .single()

  if (error || !member || member.family_id !== deviceAuth.familyId) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  if (!member.pin) {
    return NextResponse.json({ error: 'PIN not set' }, { status: 400 })
  }

  const ok = await bcrypt.compare(pin, member.pin)
  if (!ok) return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 })

  const { token, session } = await insertChildSession(deviceAuth.deviceSecretId, memberId, 15)

  const res = NextResponse.json({
    token,
    session: {
      id: session.id,
      memberId,
      expiresAt: session.expires_at,
    },
  })

  res.cookies.set('kiosk_child_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15,
  })

  return res
}
