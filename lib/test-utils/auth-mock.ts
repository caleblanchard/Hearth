import { Session } from 'next-auth'

export interface MockUser {
  id: string
  name: string
  email: string | null
  role: 'PARENT' | 'CHILD'
  familyId: string
  familyName: string
}

export function mockParentSession(overrides?: Partial<Session>): Session {
  return {
    user: {
      id: 'parent-test-123',
      name: 'Test Parent',
      email: 'parent@test.com',
      role: 'PARENT',
      familyId: 'family-test-123',
      familyName: 'Test Family',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  } as Session
}

export function mockChildSession(overrides?: Partial<Session>): Session {
  return {
    user: {
      id: 'child-test-123',
      name: 'Test Child',
      email: null,
      role: 'CHILD',
      familyId: 'family-test-123',
      familyName: 'Test Family',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  } as Session
}

export function mockSession(role: 'PARENT' | 'CHILD' = 'PARENT', overrides?: Partial<Session>): Session {
  return role === 'PARENT' ? mockParentSession(overrides) : mockChildSession(overrides)
}
