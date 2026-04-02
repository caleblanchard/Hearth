import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSecret, insertDeviceSecret } from '@/lib/kiosk-auth'
import { createHash } from 'crypto'

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex')
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json().catch(() => ({}))
  const { code, deviceId } = body

  if (!code || !deviceId) {
    return NextResponse.json({ error: 'code and deviceId required' }, { status: 400 })
  }

  const codeHash = hashCode(code)
  const nowIso = new Date().toISOString()

  const { data: activation, error: codeError } = await supabase
    .from('kiosk_activation_codes')
    .select('*')
    .eq('code_hash', codeHash)
    .is('redeemed_at', null)
    .is('is_revoked', false)
    .gte('expires_at', nowIso)
    .maybeSingle()

  if (codeError || !activation) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
  }

  const deviceSecret = generateSecret(24)
  try {
    const deviceSecretRow = await insertDeviceSecret(activation.family_id, deviceId, deviceSecret)
    await supabase
      .from('kiosk_activation_codes')
      .update({ redeemed_at: nowIso, redeemed_device_id: deviceId })
      .eq('id', activation.id)

    return NextResponse.json({
      deviceSecret,
      familyId: activation.family_id,
      deviceSecretId: deviceSecretRow.id,
    })
  } catch (error) {
    console.error('Failed to complete activation', error)
    return NextResponse.json({ error: 'Failed to complete activation' }, { status: 500 })
  }
}
