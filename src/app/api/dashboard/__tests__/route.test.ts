import { describe, it, expect } from '@jest/globals'
import { toViewerContext } from '@/app/api/dashboard/route'
import type { NextRequest } from 'next/server'

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  const headersInit = new Headers()
  for (const [k, v] of Object.entries(headers)) {
    headersInit.set(k, v)
  }
  return { headers: headersInit } as NextRequest
}

const authResult = {
  authenticated: true,
  isGuest: false,
  user: {
    id: 'member-1',
    role: 'CHILD',
    familyId: 'family-1',
    name: 'Alex',
  },
}

describe('toViewerContext', () => {
  it('returns null for unauthenticated requests', () => {
    const result = toViewerContext(
      makeRequest(),
      { authenticated: false, isGuest: false }
    )
    expect(result).toBeNull()
  })

  it('maps a guest session into a guest context', () => {
    const result = toViewerContext(
      makeRequest(),
      {
        authenticated: true,
        isGuest: true,
        guest: {
          sessionToken: 'guest-token',
          inviteId: 'invite-1',
          guestName: 'Guest',
          familyId: 'family-1',
          accessLevel: 'VIEW_ONLY',
          expiresAt: new Date('2099-01-01T00:00:00Z'),
        },
      }
    )

    expect(result).toEqual({
      viewerId: 'guest-token',
      memberId: null,
      familyId: 'family-1',
      role: 'GUEST',
      access: 'guest',
      guestAccessLevel: 'VIEW_ONLY',
    })
  })

  it('maps an authenticated session into a full context', () => {
    const result = toViewerContext(makeRequest(), authResult)

    expect(result).toEqual({
      viewerId: 'member-1',
      memberId: 'member-1',
      familyId: 'family-1',
      role: 'CHILD',
      access: 'full',
    })
  })

  it('uses a null memberId for kiosk-device requests', () => {
    const result = toViewerContext(
      makeRequest({ 'X-Kiosk-Device': 'device-secret' }),
      authResult
    )

    expect(result).toEqual({
      viewerId: 'member-1',
      memberId: null,
      familyId: 'family-1',
      role: 'CHILD',
      access: 'kiosk',
    })
  })

  it('returns null when an authenticated request has no user', () => {
    const result = toViewerContext(
      makeRequest(),
      { authenticated: true, isGuest: false }
    )
    expect(result).toBeNull()
  })
})
