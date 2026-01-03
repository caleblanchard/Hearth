import '@testing-library/jest-dom'
import 'whatwg-fetch'

// Polyfills for Node.js globals
import { TextEncoder, TextDecoder } from 'util'
import { ReadableStream } from 'stream/web'
import fetch, { Request, Response, Headers } from 'node-fetch'

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
global.ReadableStream = ReadableStream
global.fetch = fetch
global.Request = Request
global.Response = Response
global.Headers = Headers

// Mock next-auth
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    handlers: { GET: jest.fn(), POST: jest.fn() },
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  })),
}))

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: jest.fn((config) => ({
    id: config?.id || 'credentials',
    name: config?.name || 'Credentials',
    type: 'credentials',
    credentials: config?.credentials || {},
    authorize: config?.authorize || jest.fn(),
  })),
}))

jest.mock('@auth/core/providers/credentials', () => ({
  __esModule: true,
  default: jest.fn((config) => ({
    id: config?.id || 'credentials',
    name: config?.name || 'Credentials',
    type: 'credentials',
    credentials: config?.credentials || {},
    authorize: config?.authorize || jest.fn(),
  })),
}))

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

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}

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

  // Close Prisma connections if they exist
  try {
    const prismaModule = require('@/lib/prisma')
    const prisma = prismaModule.prisma || prismaModule.default
    if (prisma?.$disconnect) {
      await prisma.$disconnect()
    }
  } catch (e) {
    // Ignore if module not loaded
  }

  // Clear any remaining timers
  jest.clearAllTimers()

  // Give time for cleanup
  await new Promise(resolve => setTimeout(resolve, 100))
})
