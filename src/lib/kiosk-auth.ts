import { randomBytes, timingSafeEqual, createHash } from 'crypto'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Database } from '@/lib/database.types'

type SupabaseClient = ReturnType<typeof createClient> extends Promise<infer R> ? R : never

export interface DeviceSecretAuth {
  deviceSecretId: string
  familyId: string
}

export interface ChildSessionAuth {
  sessionId: string
  memberId: string
  familyId: string
  expiresAt: Date
}

const DEVICE_HEADER = 'x-kiosk-device'
const CHILD_HEADER = 'x-kiosk-child'

export function hashSecret(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function generateSecret(length = 32) {
  return randomBytes(length).toString('hex')
}

export async function authenticateDeviceSecret(): Promise<DeviceSecretAuth | null> {
  const headersList = await headers()
  const secret = headersList.get(DEVICE_HEADER)
  if (!secret) return null

  // Use service client to avoid RLS blocking device secret verification
  const supabase = createServiceClient()
  const secretHash = hashSecret(secret)

  const { data, error } = await supabase
    .from('kiosk_device_secrets')
    .select('id,family_id,secret_hash,revoked_at')
    .eq('secret_hash', secretHash)
    .is('revoked_at', null)
    .maybeSingle()

  if (error || !data) return null
  return { deviceSecretId: data.id, familyId: data.family_id }
}

export async function authenticateChildSession(): Promise<ChildSessionAuth | null> {
  const headersList = await headers()
  const token = headersList.get(CHILD_HEADER)
  if (!token) return null

  // Use service client to validate kiosk child sessions without RLS issues
  const supabase = createServiceClient()
  const tokenHash = hashSecret(token)

  const { data, error } = await supabase
    .from('kiosk_child_sessions')
    .select('id,member_id,expires_at,last_activity_at,device_secret_id,kiosk_device_secrets(family_id)')
    .eq('session_token_hash', tokenHash)
    .maybeSingle()

  if (error || !data) return null
  const expiresAt = new Date(data.expires_at)
  if (expiresAt.getTime() < Date.now()) return null

  return {
    sessionId: data.id,
    memberId: data.member_id,
    familyId: (data as any).kiosk_device_secrets.family_id,
    expiresAt,
  }
}

export async function updateChildSessionActivity(sessionId: string) {
  const supabase = await createClient()
  await supabase
    .from('kiosk_child_sessions')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', sessionId)
}

export async function endChildSession(sessionId: string) {
  const supabase = await createClient()
  await supabase
    .from('kiosk_child_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)
}

export async function revokeDeviceSecret(deviceSecretId: string) {
  const supabase = await createClient()
  await supabase
    .from('kiosk_device_secrets')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', deviceSecretId)
}

export async function insertDeviceSecret(familyId: string, deviceId: string, secret: string) {
  const supabase = await createClient()
  const secretHash = hashSecret(secret)

  const { data, error } = await supabase
    .from('kiosk_device_secrets')
    .insert({
      family_id: familyId,
      device_id: deviceId,
      secret_hash: secretHash,
    })
    .select('id,family_id')
    .single()

  if (error) throw error
  return data
}

export async function insertChildSession(deviceSecretId: string, memberId: string, ttlMinutes = 15) {
  const supabase = await createClient()
  const token = generateSecret(16)
  const tokenHash = hashSecret(token)
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('kiosk_child_sessions')
    .insert({
      device_secret_id: deviceSecretId,
      member_id: memberId,
      session_token_hash: tokenHash,
      expires_at: expiresAt,
      last_activity_at: new Date().toISOString(),
    })
    .select('id,member_id,expires_at')
    .single()

  if (error) throw error
  return { token, session: data }
}

export function getKioskHeaders(deviceSecret?: string, childToken?: string) {
  const headers: Record<string, string> = {}
  if (deviceSecret) headers[DEVICE_HEADER] = deviceSecret
  if (childToken) headers[CHILD_HEADER] = childToken
  return headers
}
