import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

/**
 * Create a Supabase Admin client with service role key
 * This client bypasses Row Level Security (RLS) policies
 * 
 * ⚠️ SECURITY WARNING:
 * - Only use this in server-side code (API routes, server actions)
 * - Never expose the service role key to the client
 * - Only use for admin operations that need to bypass RLS
 * 
 * Use cases:
 * - Creating new families during signup (before user has family_id)
 * - Admin operations that need to access all data
 * - Background jobs and cron tasks
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials for admin client')
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
