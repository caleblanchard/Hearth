import '@testing-library/jest-dom'
import 'whatwg-fetch'

// Polyfills for Node.js globals
import { TextEncoder, TextDecoder } from 'util'
import { ReadableStream } from 'stream/web'
import fetch, { Request, Response, Headers } from 'node-fetch'
import { mockChildSession, mockParentSession, setMockSession } from '@/lib/test-utils/auth-mock'

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
global.ReadableStream = ReadableStream
global.fetch = fetch
global.Request = Request
global.Response = Response
global.Headers = Headers

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
  redirect: jest.fn(),
  notFound: jest.fn(),
}))

// Mock next/server (NextResponse)
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data, init) => {
      return {
        status: init?.status || 200,
        json: async () => data,
        headers: new Headers(init?.headers || {}),
      }
    },
  },
  NextRequest: class NextRequest {
    constructor(url, init) {
      this.url = url
      this.method = init?.method || 'GET'
      this.headers = new Headers(init?.headers || {})
      this._body = init?.body
    }
    async json() {
      return typeof this._body === 'string' ? JSON.parse(this._body) : this._body
    }
  },
}))

jest.mock('@/lib/supabase/server', () => {
  const { createSupabaseMockClient } = require('@/lib/test-utils/supabase-db-bridge')
  const { getMockSession } = require('@/lib/test-utils/auth-mock')

  const createClient = jest.fn(async () => createSupabaseMockClient())

  const getAuthContext = jest.fn(async () => {
    const session = getMockSession()
    if (!session) return null

    const memberId = session.user.id
    const familyId = session.user.familyId

    return {
      user: session.user,
      memberships: [
        {
          id: memberId,
          family_id: familyId,
          name: session.user.name || '',
          role: session.user.role,
          families: {
            id: familyId,
            name: session.user.familyName,
          },
        },
      ],
      defaultFamilyId: familyId,
      defaultMemberId: memberId,
      activeFamilyId: familyId,
      activeMemberId: memberId,
    }
  })

  const getMemberInFamily = jest.fn(async (familyId) => {
    const session = getMockSession()
    if (!session || session.user.familyId !== familyId) return null
    return {
      id: session.user.id,
      familyId: session.user.familyId,
      role: session.user.role,
    }
  })

  const isParentInFamily = jest.fn(async (familyId) => {
    const session = getMockSession()
    if (!session || session.user.familyId !== familyId) return false
    return session.user.role === 'PARENT'
  })

  const getRoleInFamily = jest.fn(async (familyId) => {
    const session = getMockSession()
    if (!session || session.user.familyId !== familyId) return null
    return session.user.role ?? null
  })

  return {
    createClient,
    getAuthContext,
    getMemberInFamily,
    isParentInFamily,
    getRoleInFamily,
  }
})

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}

beforeEach(() => {
  const testName = expect.getState().currentTestName?.toLowerCase() || ''
  if (testName.includes('401') || testName.includes('unauth')) {
    setMockSession(null)
    return
  }

  if (testName.includes('403 if not authenticated')) {
    mockChildSession()
    return
  }

  if (
    testName.includes('not a parent') ||
    testName.includes('non-parent') ||
    (testName.includes('child') && !testName.includes('parent'))
  ) {
    mockChildSession()
    return
  }

  mockParentSession()
})

// Cleanup after all tests
afterAll(async () => {
  // Clean up rate limiters if they exist (they have setInterval that keeps process alive)
  try {
    const rateLimitModule = require('@/lib/rate-limit')
    // Destroy rate limiters, checking if cleanupInterval still exists (not already destroyed)
    if (rateLimitModule.apiRateLimiter?.cleanupInterval) {
      rateLimitModule.apiRateLimiter.destroy()
    }
    if (rateLimitModule.authRateLimiter?.cleanupInterval) {
      rateLimitModule.authRateLimiter.destroy()
    }
    if (rateLimitModule.cronRateLimiter?.cleanupInterval) {
      rateLimitModule.cronRateLimiter.destroy()
    }
  } catch (e) {
    // Ignore if module not loaded or already cleaned up
  }

  // Clear any remaining timers
  jest.clearAllTimers()

  // Give time for cleanup
  await new Promise(resolve => setTimeout(resolve, 100))
})
