import { NextRequest, NextResponse } from 'next/server'
import { createClient, isParentInFamily, getMemberInFamily } from '@/lib/supabase/server'
import { randomBytes, createHash } from 'crypto'
import { addMinutes } from 'date-fns'

const DEFAULT_TTL_MINUTES = 15

function generateCode(length = 8) {
  // Simple base32-ish uppercase code
  return randomBytes(length).toString('base64').replace(/[^A-Z0-9]/gi, '').slice(0, length).toUpperCase()
}

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex')
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const familyId = body.familyId || user.app_metadata?.familyId
  if (!familyId) return NextResponse.json({ error: 'familyId required' }, { status: 400 })

  const isParent = await isParentInFamily(familyId)
  if (!isParent) return NextResponse.json({ error: 'Only parents can create activation codes' }, { status: 403 })

  const code = generateCode(8)
  const codeHash = hashCode(code)
  const expiresAt = addMinutes(new Date(), DEFAULT_TTL_MINUTES).toISOString()

  const member = await getMemberInFamily(familyId)

  const { error } = await supabase.from('kiosk_activation_codes').insert({
    family_id: familyId,
    code_hash: codeHash,
    expires_at: expiresAt,
    created_by: member?.id ?? null,
  })

  if (error) {
    console.error('Failed to create activation code', error)
    return NextResponse.json({ error: 'Failed to create activation code' }, { status: 500 })
  }

  return NextResponse.json({
    code,
    expiresAt,
    qrData: { code, familyId },
  })
}
