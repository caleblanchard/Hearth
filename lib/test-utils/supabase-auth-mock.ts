import { User, Session } from '@supabase/supabase-js'

/**
 * Supabase Auth Mock Utilities
 * 
 * Provides mock authentication contexts for testing Supabase-based auth flows.
 * Compatible with the existing auth-mock.ts patterns but for Supabase.
 */

export interface MockSupabaseUser extends Partial<User> {
  id: string
  email: string
  role?: string
  user_metadata?: {
    name?: string
    avatar_url?: string
    [key: string]: any
  }
  app_metadata?: {
    family_id?: string
    family_ids?: string[]
    [key: string]: any
  }
}

export interface MockSupabaseSession {
  user: MockSupabaseUser
  access_token: string
  refresh_token: string
  expires_at?: number
  expires_in: number
  token_type: string
}

/**
 * Creates a mock Supabase user with default parent values
 */
export function mockSupabaseParentUser(overrides?: Partial<MockSupabaseUser>): MockSupabaseUser {
  const defaultUser: MockSupabaseUser = {
    id: 'parent-test-123',
    email: 'parent@test.com',
    aud: 'authenticated',
    role: 'authenticated',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {
      provider: 'email',
      providers: ['email'],
      family_id: 'family-test-123',
      family_ids: ['family-test-123'],
    },
    user_metadata: {
      name: 'Test Parent',
      avatar_url: undefined,
    },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (!overrides) return defaultUser

  // Deep merge metadata objects if provided
  const merged: MockSupabaseUser = {
    ...defaultUser,
    ...overrides,
  }

  // Preserve nested metadata
  if (overrides.app_metadata) {
    merged.app_metadata = {
      ...defaultUser.app_metadata,
      ...overrides.app_metadata,
    }
  }

  if (overrides.user_metadata) {
    merged.user_metadata = {
      ...defaultUser.user_metadata,
      ...overrides.user_metadata,
    }
  } else {
    merged.user_metadata = defaultUser.user_metadata
  }

  return merged
}

/**
 * Creates a mock Supabase user with default child values
 */
export function mockSupabaseChildUser(overrides?: Partial<MockSupabaseUser>): MockSupabaseUser {
  const defaultUser: MockSupabaseUser = {
    id: 'child-test-123',
    email: 'child@test.com',
    aud: 'authenticated',
    role: 'authenticated',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {
      provider: 'email',
      providers: ['email'],
      family_id: 'family-test-123',
      family_ids: ['family-test-123'],
    },
    user_metadata: {
      name: 'Test Child',
      avatar_url: undefined,
    },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (!overrides) return defaultUser

  return {
    ...defaultUser,
    ...overrides,
    app_metadata: {
      ...defaultUser.app_metadata,
      ...overrides.app_metadata,
    },
    user_metadata: {
      ...defaultUser.user_metadata,
      ...overrides.user_metadata,
    },
  }
}

/**
 * Creates a mock Supabase session with default parent values
 */
export function mockSupabaseParentSession(overrides?: Partial<MockSupabaseSession>): MockSupabaseSession {
  const user = overrides?.user || mockSupabaseParentUser()
  const expiresAt = Date.now() / 1000 + 3600 // 1 hour from now

  const defaultSession: MockSupabaseSession = {
    access_token: 'mock-access-token-parent',
    refresh_token: 'mock-refresh-token-parent',
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: 'bearer',
    user,
  }

  if (!overrides) return defaultSession

  return {
    ...defaultSession,
    ...overrides,
    user: overrides.user || user,
  }
}

/**
 * Creates a mock Supabase session with default child values
 */
export function mockSupabaseChildSession(overrides?: Partial<MockSupabaseSession>): MockSupabaseSession {
  const user = overrides?.user || mockSupabaseChildUser()
  const expiresAt = Date.now() / 1000 + 3600

  const defaultSession: MockSupabaseSession = {
    access_token: 'mock-access-token-child',
    refresh_token: 'mock-refresh-token-child',
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: 'bearer',
    user,
  }

  if (!overrides) return defaultSession

  return {
    ...defaultSession,
    ...overrides,
    user: overrides.user || user,
  }
}

/**
 * Generic session creator based on role
 */
export function mockSupabaseSession(
  role: 'PARENT' | 'CHILD' = 'PARENT',
  overrides?: Partial<MockSupabaseSession>
): MockSupabaseSession {
  return role === 'PARENT' 
    ? mockSupabaseParentSession(overrides) 
    : mockSupabaseChildSession(overrides)
}

/**
 * Creates a mock auth response for getUser()
 */
export function mockGetUserResponse(user: MockSupabaseUser | null = null) {
  return {
    data: { user },
    error: null,
  }
}

/**
 * Creates a mock auth response for getSession()
 */
export function mockGetSessionResponse(session: MockSupabaseSession | null = null) {
  return {
    data: { session },
    error: null,
  }
}

/**
 * Creates a mock auth error response
 */
export function mockAuthError(message: string, status: number = 400) {
  return {
    data: { user: null, session: null },
    error: {
      message,
      status,
      name: 'AuthError',
    },
  }
}

/**
 * Mock auth context for multiple families
 */
export function mockMultiFamilyUser(familyIds: string[], overrides?: Partial<MockSupabaseUser>): MockSupabaseUser {
  return mockSupabaseParentUser({
    ...overrides,
    app_metadata: {
      ...overrides?.app_metadata,
      family_ids: familyIds,
      family_id: familyIds[0], // Primary family
    },
  })
}

/**
 * Mock kiosk context (parent session with kiosk metadata)
 */
export function mockKioskSession(
  activeMemberId: string | null,
  overrides?: Partial<MockSupabaseSession>
): MockSupabaseSession {
  return mockSupabaseParentSession({
    ...overrides,
    user: {
      ...mockSupabaseParentUser(overrides?.user),
      user_metadata: {
        ...overrides?.user?.user_metadata,
        kiosk_active: true,
        kiosk_member_id: activeMemberId,
      },
    },
  })
}
