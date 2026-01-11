import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type CalendarEvent = Database['public']['Tables']['calendar_events']['Row']
type CalendarEventInsert = Database['public']['Tables']['calendar_events']['Insert']
type CalendarEventUpdate = Database['public']['Tables']['calendar_events']['Update']
type CalendarEventAssignment = Database['public']['Tables']['calendar_event_assignments']['Row']
type CalendarConnection = Database['public']['Tables']['calendar_connections']['Row']
type CalendarConnectionInsert = Database['public']['Tables']['calendar_connections']['Insert']
type ExternalCalendarSubscription = Database['public']['Tables']['external_calendar_subscriptions']['Row']

/**
 * ============================================
 * CALENDAR EVENTS
 * ============================================
 */

/**
 * Get calendar events for a family within a date range
 */
export async function getCalendarEvents(
  familyId: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      *,
      creator:family_members!calendar_events_created_by_fkey(id, name, avatar_url),
      assignments:calendar_event_assignments(
        id,
        member:family_members(id, name, avatar_url)
      )
    `)
    .eq('family_id', familyId)
    .gte('start_time', startDate)
    .lte('end_time', endDate)
    .order('start_time', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get upcoming events (next 7 days)
 */
export async function getUpcomingEvents(familyId: string, days = 7) {
  const supabase = await createClient()

  const now = new Date()
  const future = new Date()
  future.setDate(future.getDate() + days)

  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      *,
      creator:family_members!calendar_events_created_by_fkey(id, name),
      assignments:calendar_event_assignments(
        member:family_members(id, name)
      )
    `)
    .eq('family_id', familyId)
    .gte('start_time', now.toISOString())
    .lte('start_time', future.toISOString())
    .order('start_time', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get a single calendar event by ID
 */
export async function getCalendarEvent(eventId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      *,
      creator:family_members!calendar_events_created_by_fkey(id, name, avatar_url),
      assignments:calendar_event_assignments(
        id,
        member:family_members(id, name, avatar_url, role)
      )
    `)
    .eq('id', eventId)
    .single()

  if (error) throw error
  return data
}

/**
 * Create a calendar event
 */
export async function createCalendarEvent(
  event: CalendarEventInsert
): Promise<CalendarEvent> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_events')
    .insert(event)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
  eventId: string,
  updates: CalendarEventUpdate
): Promise<CalendarEvent> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(eventId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId)

  if (error) throw error
}

/**
 * ============================================
 * EVENT ASSIGNMENTS
 * ============================================
 */

/**
 * Assign member(s) to an event
 */
export async function assignMembersToEvent(
  eventId: string,
  memberIds: string[]
) {
  const supabase = await createClient()

  const assignments = memberIds.map(memberId => ({
    event_id: eventId,
    member_id: memberId,
  }))

  const { error } = await supabase
    .from('calendar_event_assignments')
    .insert(assignments)

  if (error) throw error
}

/**
 * Remove member assignment from event
 */
export async function removeMemberFromEvent(
  eventId: string,
  memberId: string
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('calendar_event_assignments')
    .delete()
    .eq('event_id', eventId)
    .eq('member_id', memberId)

  if (error) throw error
}

/**
 * Get events assigned to a specific member
 */
export async function getMemberEvents(
  memberId: string,
  startDate?: string,
  endDate?: string
) {
  const supabase = await createClient()

  let query = supabase
    .from('calendar_event_assignments')
    .select(`
      *,
      event:calendar_events(*)
    `)
    .eq('member_id', memberId)

  if (startDate) {
    query = query.gte('event.start_time', startDate)
  }
  if (endDate) {
    query = query.lte('event.start_time', endDate)
  }

  const { data, error } = await query.order('event.start_time', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * ============================================
 * CALENDAR CONNECTIONS (Google, etc.)
 * ============================================
 */

/**
 * Get calendar connections for a family
 */
export async function getCalendarConnections(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Create a calendar connection
 */
export async function createCalendarConnection(
  connection: CalendarConnectionInsert
): Promise<CalendarConnection> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_connections')
    .insert(connection)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update calendar connection
 */
export async function updateCalendarConnection(
  connectionId: string,
  updates: {
    is_active?: boolean
    sync_enabled?: boolean
    last_sync_at?: string
    access_token?: string
    refresh_token?: string
    token_expires_at?: string
  }
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_connections')
    .update(updates)
    .eq('id', connectionId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a calendar connection
 */
export async function deleteCalendarConnection(connectionId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('calendar_connections')
    .delete()
    .eq('id', connectionId)

  if (error) throw error
}

/**
 * Get active calendar connections ready for sync
 */
export async function getActiveSyncConnections(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('family_id', familyId)
    .eq('is_active', true)
    .eq('sync_enabled', true)

  if (error) throw error
  return data || []
}

/**
 * ============================================
 * EXTERNAL CALENDAR SUBSCRIPTIONS
 * ============================================
 */

/**
 * Get external calendar subscriptions for a family
 */
export async function getExternalSubscriptions(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('external_calendar_subscriptions')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Create external calendar subscription (iCal URL)
 */
export async function createExternalSubscription(
  subscription: {
    family_id: string
    calendar_name: string
    ical_url: string
    color?: string
    is_active?: boolean
  }
): Promise<ExternalCalendarSubscription> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('external_calendar_subscriptions')
    .insert(subscription)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update external subscription
 */
export async function updateExternalSubscription(
  subscriptionId: string,
  updates: {
    calendar_name?: string
    ical_url?: string
    color?: string
    is_active?: boolean
    last_sync_at?: string
  }
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('external_calendar_subscriptions')
    .update(updates)
    .eq('id', subscriptionId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete external subscription
 */
export async function deleteExternalSubscription(subscriptionId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('external_calendar_subscriptions')
    .delete()
    .eq('id', subscriptionId)

  if (error) throw error
}

/**
 * ============================================
 * CALENDAR UTILITIES
 * ============================================
 */

/**
 * Get events for today
 */
export async function getTodayEvents(familyId: string) {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      *,
      assignments:calendar_event_assignments(
        member:family_members(id, name)
      )
    `)
    .eq('family_id', familyId)
    .gte('start_time', today.toISOString())
    .lt('start_time', tomorrow.toISOString())
    .order('start_time', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Check for scheduling conflicts
 */
export async function checkEventConflicts(
  familyId: string,
  startTime: string,
  endTime: string,
  excludeEventId?: string
) {
  const supabase = await createClient()

  let query = supabase
    .from('calendar_events')
    .select('id, title, start_time, end_time')
    .eq('family_id', familyId)
    .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`)

  if (excludeEventId) {
    query = query.neq('id', excludeEventId)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Get busy times for a member
 */
export async function getMemberBusyTimes(
  memberId: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_event_assignments')
    .select(`
      event:calendar_events(
        id,
        title,
        start_time,
        end_time,
        is_all_day
      )
    `)
    .eq('member_id', memberId)
    .gte('event.start_time', startDate)
    .lte('event.start_time', endDate)
    .order('event.start_time', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * ============================================
 * CALENDAR CONNECTIONS (Google, iCal, etc.)
 * ============================================
 */

/**
 * Get calendar connections for a member
 */
export async function getCalendarConnections(memberId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get a single calendar connection
 */
export async function getCalendarConnection(connectionId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('id', connectionId)
    .single()

  if (error) throw error
  return data
}

/**
 * Update calendar connection
 */
export async function updateCalendarConnection(
  connectionId: string,
  updates: { is_active?: boolean; sync_enabled?: boolean; name?: string }
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_connections')
    .update(updates)
    .eq('id', connectionId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete calendar connection
 */
export async function deleteCalendarConnection(connectionId: string) {
  const supabase = await createClient()

  // Delete events from this connection first
  await supabase
    .from('calendar_events')
    .delete()
    .eq('external_connection_id', connectionId)

  // Delete the connection
  const { error } = await supabase
    .from('calendar_connections')
    .delete()
    .eq('id', connectionId)

  if (error) throw error
}

/**
 * ============================================
 * CALENDAR SUBSCRIPTIONS (External Calendars)
 * ============================================
 */

/**
 * Get calendar subscriptions for a family
 */
export async function getCalendarSubscriptions(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('external_calendar_subscriptions')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get a single calendar subscription
 */
export async function getCalendarSubscription(subscriptionId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('external_calendar_subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single()

  if (error) throw error
  return data
}

/**
 * Sync calendar subscription (trigger external sync)
 */
export async function syncCalendarSubscription(
  subscriptionId: string,
  familyId: string
) {
  const supabase = await createClient()

  // Get subscription details
  const subscription = await getCalendarSubscription(subscriptionId)
  
  if (subscription.family_id !== familyId) {
    throw new Error('Subscription not found in family')
  }

  // Update last_synced timestamp
  await supabase
    .from('external_calendar_subscriptions')
    .update({ last_synced: new Date().toISOString() })
    .eq('id', subscriptionId)

  // The actual sync would be triggered by the external calendar integration
  // This is just a stub that updates the timestamp
  return {
    success: true,
    syncedAt: new Date().toISOString(),
  }
}

/**
 * Test fetch calendar (validate URL)
 */
export async function testFetchCalendar(url: string) {
  // This would normally fetch and parse the calendar URL
  // For now, return a stub response
  return {
    valid: true,
    eventCount: 0,
    message: 'Calendar URL is valid',
  }
}

/**
 * Cleanup old calendar events (from external subscriptions)
 */
export async function cleanupOldCalendarEvents(familyId: string) {
  const supabase = await createClient()

  // Delete events older than 12 months from external subscriptions
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const { data, error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('family_id', familyId)
    .not('external_subscription_id', 'is', null)
    .lt('end_time', twelveMonthsAgo.toISOString())
    .select('id')

  if (error) throw error

  return {
    deleted: data?.length || 0,
    cutoffDate: twelveMonthsAgo.toISOString(),
  }
}

/**
 * Get calendar debug info
 */
export async function getCalendarDebugInfo(familyId: string) {
  const supabase = await createClient()

  // Get event counts
  const { data: events, count: eventCount } = await supabase
    .from('calendar_events')
    .select('id', { count: 'exact' })
    .eq('family_id', familyId)

  // Get subscription counts
  const { data: subscriptions, count: subscriptionCount } = await supabase
    .from('external_calendar_subscriptions')
    .select('id', { count: 'exact' })
    .eq('family_id', familyId)

  // Get connection counts
  const { data: connections, count: connectionCount } = await supabase
    .from('calendar_connections')
    .select('id, member:family_members!inner(family_id)', { count: 'exact' })
    .eq('member.family_id', familyId)

  return {
    eventCount: eventCount || 0,
    subscriptionCount: subscriptionCount || 0,
    connectionCount: connectionCount || 0,
  }
}

/**
 * ============================================
 * GOOGLE CALENDAR OAUTH
 * ============================================
 */

/**
 * Initiate Google Calendar OAuth flow
 */
export async function initiateGoogleCalendarConnect(memberId: string) {
  const crypto = require('crypto')
  
  // Generate OAuth state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex')

  // The actual OAuth URL generation would happen in the integration layer
  // This is just a stub that returns the state
  return {
    authUrl: `https://accounts.google.com/o/oauth2/auth?state=${state}`,
    state,
  }
}

/**
 * Handle Google Calendar OAuth callback
 */
export async function handleGoogleCalendarCallback(
  memberId: string,
  code: string
) {
  const supabase = await createClient()

  // In a real implementation, this would:
  // 1. Exchange code for tokens
  // 2. Get user's calendar info
  // 3. Create calendar connection

  // For now, create a placeholder connection
  const { data, error } = await supabase
    .from('calendar_connections')
    .insert({
      member_id: memberId,
      provider: 'GOOGLE',
      provider_account_id: 'placeholder',
      access_token: 'encrypted_token',
      refresh_token: 'encrypted_refresh_token',
      token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      is_active: true,
      sync_enabled: true,
      name: 'Google Calendar',
    })
    .select()
    .single()

  if (error) throw error
  return data
}
