import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type NotificationPreference = Database['public']['Tables']['notification_preferences']['Row']
type NotificationPreferenceInsert = Database['public']['Tables']['notification_preferences']['Insert']
type NotificationPreferenceUpdate = Database['public']['Tables']['notification_preferences']['Update']
type PushSubscription = Database['public']['Tables']['push_subscriptions']['Row']
type PushSubscriptionInsert = Database['public']['Tables']['push_subscriptions']['Insert']

/**
 * ============================================
 * NOTIFICATION PREFERENCES
 * ============================================
 */

/**
 * Get notification preferences for a member
 */
export async function getNotificationPreferences(memberId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('member_id', memberId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Get or create notification preferences
 */
export async function getOrCreateNotificationPreferences(
  memberId: string
): Promise<NotificationPreference> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('member_id', memberId)
    .maybeSingle()

  if (existing) return existing

  // Create with defaults
  const { data, error } = await supabase
    .from('notification_preferences')
    .insert({
      member_id: memberId,
      push_enabled: true,
      email_enabled: false,
      enabled_types: ['CHORE_ASSIGNED', 'CHORE_COMPLETED', 'REWARD_REDEEMED'],
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  memberId: string,
  updates: NotificationPreferenceUpdate
): Promise<NotificationPreference> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notification_preferences')
    .update(updates)
    .eq('member_id', memberId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Check if notification type is enabled for member
 */
export async function isNotificationEnabled(
  memberId: string,
  notificationType: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('enabled_types, push_enabled')
    .eq('member_id', memberId)
    .maybeSingle()

  if (error) throw error
  if (!data || !data.push_enabled) return false

  return data.enabled_types?.includes(notificationType) || false
}

/**
 * ============================================
 * PUSH SUBSCRIPTIONS
 * ============================================
 */

/**
 * Get push subscriptions for a member
 */
export async function getPushSubscriptions(memberId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Add push subscription
 */
export async function addPushSubscription(
  subscription: PushSubscriptionInsert
): Promise<PushSubscription> {
  const supabase = await createClient()

  // Check if subscription already exists
  const { data: existing } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('endpoint', subscription.endpoint)
    .maybeSingle()

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('push_subscriptions')
      .update({
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Create new
  const { data, error } = await supabase
    .from('push_subscriptions')
    .insert(subscription)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove push subscription
 */
export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)

  if (error) throw error
}

/**
 * Get all push subscriptions for family
 */
export async function getFamilyPushSubscriptions(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select(`
      *,
      member:family_members!inner(id, name, family_id)
    `)
    .eq('member.family_id', familyId)

  if (error) throw error
  return data || []
}

/**
 * Clean up expired subscriptions
 */
export async function cleanupExpiredSubscriptions() {
  const supabase = await createClient()

  // Remove subscriptions older than 90 days without activity
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .lt('created_at', cutoff.toISOString())

  if (error) throw error
}
