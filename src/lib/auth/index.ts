import type { Session } from '@/lib/auth/types'

const TEST_SESSION_KEY = '__TEST_SESSION__'

export async function auth(): Promise<Session | null> {
  if (process.env.NODE_ENV === 'test') {
    return (globalThis as Record<string, unknown>)[TEST_SESSION_KEY] as Session | null
  }

  return null
}
