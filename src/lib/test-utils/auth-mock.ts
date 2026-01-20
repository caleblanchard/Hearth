import type { Session } from '@/lib/auth/types'

export interface MockUser {
  id: string
  name?: string | null
  email?: string | null
  role: 'PARENT' | 'CHILD' | 'GUEST'
  familyId: string
  familyName: string
}

export interface SessionOverrides {
  user?: Partial<MockUser>
  expires?: string
}

const TEST_SESSION_KEY = '__TEST_SESSION__'

export function setMockSession(session: Session | null) {
  ;(globalThis as Record<string, unknown>)[TEST_SESSION_KEY] = session
}

export function getMockSession(): Session | null {
  return (globalThis as Record<string, unknown>)[TEST_SESSION_KEY] as Session | null
}

export function mockParentSession(overrides?: SessionOverrides): Session {
  const defaultSession: Session = {
    user: {
      id: 'parent-test-123',
      name: 'Test Parent',
      email: 'parent@test.com',
      role: 'PARENT',
      familyId: 'family-test-123',
      familyName: 'Test Family',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } as Session

  if (!overrides) {
    setMockSession(defaultSession)
    return defaultSession
  }

  // Deep merge user object if provided
  if (overrides.user) {
    const session = {
      ...defaultSession,
      ...overrides,
      user: {
        ...defaultSession.user,
        ...overrides.user,
      },
    } as Session
    setMockSession(session)
    return session
  }

  const session = {
    ...defaultSession,
    ...overrides,
  } as Session
  setMockSession(session)
  return session
}

export function mockChildSession(overrides?: SessionOverrides): Session {
  const defaultSession: Session = {
    user: {
      id: 'child-test-123',
      name: 'Test Child',
      email: null,
      role: 'CHILD',
      familyId: 'family-test-123',
      familyName: 'Test Family',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } as Session

  if (!overrides) {
    setMockSession(defaultSession)
    return defaultSession
  }

  // Deep merge user object if provided
  if (overrides.user) {
    const session = {
      ...defaultSession,
      ...overrides,
      user: {
        ...defaultSession.user,
        ...overrides.user,
      },
    } as Session
    setMockSession(session)
    return session
  }

  const session = {
    ...defaultSession,
    ...overrides,
  } as Session
  setMockSession(session)
  return session
}

export function mockSession(role: 'PARENT' | 'CHILD' = 'PARENT', overrides?: SessionOverrides): Session {
  return role === 'PARENT' ? mockParentSession(overrides) : mockChildSession(overrides)
}
