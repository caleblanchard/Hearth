import { Session } from 'next-auth'

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

  if (!overrides) return defaultSession

  // Deep merge user object if provided
  if (overrides.user) {
    return {
      ...defaultSession,
      ...overrides,
      user: {
        ...defaultSession.user,
        ...overrides.user,
      },
    } as Session
  }

  return {
    ...defaultSession,
    ...overrides,
  } as Session
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

  if (!overrides) return defaultSession

  // Deep merge user object if provided
  if (overrides.user) {
    return {
      ...defaultSession,
      ...overrides,
      user: {
        ...defaultSession.user,
        ...overrides.user,
      },
    } as Session
  }

  return {
    ...defaultSession,
    ...overrides,
  } as Session
}

export function mockSession(role: 'PARENT' | 'CHILD' = 'PARENT', overrides?: SessionOverrides): Session {
  return role === 'PARENT' ? mockParentSession(overrides) : mockChildSession(overrides)
}
