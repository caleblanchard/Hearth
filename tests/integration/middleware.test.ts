// Set up mocks BEFORE any imports
import { MAX_REQUEST_SIZE_BYTES } from '@/lib/constants'

// Mock rate limiters
jest.mock('@/lib/rate-limit', () => ({
  apiRateLimiter: {
    check: jest.fn(),
    maxRequests: 100,
  },
  authRateLimiter: {
    check: jest.fn(),
    maxRequests: 5,
  },
  cronRateLimiter: {
    check: jest.fn(),
    maxRequests: 10,
  },
  getClientIdentifier: jest.fn(),
}))

// Import after mock
const { apiRateLimiter, authRateLimiter, cronRateLimiter, getClientIdentifier } = require('@/lib/rate-limit')

// Mock constants
jest.mock('@/lib/constants', () => ({
  MAX_REQUEST_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
}))

// Mock NextRequest and NextResponse
jest.mock('next/server', () => {
  const createMockResponse = () => {
    const headers = new Headers()
    return {
      headers: {
        set: jest.fn((key, value) => headers.set(key, value)),
        get: jest.fn((key) => headers.get(key)),
      },
      status: 200,
      json: jest.fn(async () => ({})),
    }
  }
  
  class MockNextRequest {
    url: string
    nextUrl: { pathname: string }
    headers: Headers
    cookies: {
      get: jest.Mock
      set: jest.Mock
    }
    
    constructor(url: string, init?: { headers?: HeadersInit }) {
      this.url = url
      const urlObj = new URL(url)
      this.nextUrl = { pathname: urlObj.pathname }
      this.headers = new Headers(init?.headers || {})
      this.cookies = {
        get: jest.fn(),
        set: jest.fn(),
      }
      this.cookies.get.mockReturnValue(undefined)
    }
  }
  
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      next: jest.fn(() => createMockResponse()),
      json: jest.fn((data, init) => {
        const response = createMockResponse()
        response.status = init?.status || 200
        if (init?.headers) {
          Object.entries(init.headers).forEach(([key, value]) => {
            response.headers.set(key, value as string)
          })
        }
        response.json = jest.fn(async () => data)
        return response
      }),
      redirect: jest.fn((url: URL) => {
        const response = createMockResponse()
        response.status = 307
        response.json = jest.fn(async () => ({}))
        ;(response as any).url = url
        return response
      }),
    },
  }
})

// Mock kiosk auth helpers
jest.mock('@/lib/kiosk-auth', () => ({
  hashSecret: jest.fn((v) => `hash-${v}`),
}))

// Mock service client used by middleware for kiosk validation
jest.mock('@/lib/supabase/service', () => ({
  createServiceClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(async () => ({ data: null, error: null })),
    })),
  })),
}))

// NOW import middleware after mocks
import { proxy as middleware } from '@/proxy'
import { NextRequest } from 'next/server'

const { NextResponse } = require('next/server')
const { createServiceClient } = require('@/lib/supabase/service')

describe('middleware.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Rate limiter is now async, so mock as Promise
    ;(apiRateLimiter.check as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetTime: Date.now() + 60000,
    })
    ;(authRateLimiter.check as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetTime: Date.now() + 60000,
    })
    ;(cronRateLimiter.check as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetTime: Date.now() + 60000,
    })
    ;(getClientIdentifier as jest.Mock).mockReturnValue('192.168.1.1')
    ;(createServiceClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn(async () => ({ data: null, error: null })),
      })),
    })
    ;(NextResponse.next as jest.Mock).mockReturnValue({
      headers: {
        set: jest.fn(),
        get: jest.fn(),
      },
      json: jest.fn(async () => ({})),
      status: 200,
    })
    ;(NextResponse.json as jest.Mock).mockReturnValue({
      headers: {
        set: jest.fn(),
        get: jest.fn(),
      },
      json: jest.fn(async () => ({})),
      status: 200,
    })
  })

  describe('Static file skipping', () => {
    it('should skip rate limiting for _next paths', async () => {
      const request = new NextRequest('http://localhost/_next/static/file.js')

      await middleware(request)

      expect(apiRateLimiter.check).not.toHaveBeenCalled()
      expect(NextResponse.next).toHaveBeenCalled()
    })

    it('should skip rate limiting for static paths', async () => {
      const request = new NextRequest('http://localhost/static/image.png')

      await middleware(request)

      expect(apiRateLimiter.check).not.toHaveBeenCalled()
    })

    it('should skip rate limiting for files with extensions', async () => {
      const request = new NextRequest('http://localhost/favicon.ico')

      await middleware(request)

      expect(apiRateLimiter.check).not.toHaveBeenCalled()
    })
  })

  describe('Kiosk child handling', () => {
    it('allows kiosk child on protected dashboard', async () => {
      const request = new NextRequest('http://localhost/dashboard', {
        headers: {
          'x-kiosk-child': 'child-token',
        },
      })

      ;(createServiceClient as jest.Mock).mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn(async () => ({
            data: { id: 'session', expires_at: new Date(Date.now() + 60000).toISOString(), ended_at: null },
            error: null,
          })),
        })),
      })

      const result = await middleware(request)

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(result.headers.get).toBeDefined()
    })

    it('redirects kiosk child away from auth pages', async () => {
      const request = new NextRequest('http://localhost/auth/signin', {
        headers: {
          'x-kiosk-child': 'child-token',
        },
      })

      ;(createServiceClient as jest.Mock).mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn(async () => ({
            data: { id: 'session', expires_at: new Date(Date.now() + 60000).toISOString(), ended_at: null },
            error: null,
          })),
        })),
      })

      const result = await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalledWith(new URL('/dashboard', 'http://localhost/auth/signin'))
      expect(result).toBeDefined()
    })
  })

  describe('Kiosk device access', () => {
    it('allows kiosk device to access kiosk route without auth', async () => {
      const request = new NextRequest('http://localhost/kiosk', {
        headers: {
          'x-kiosk-device': 'device-secret',
        },
      })

      ;(createServiceClient as jest.Mock).mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn(async () => ({
            data: { id: 'secret', revoked_at: null },
            error: null,
          })),
        })),
      })

      const result = await middleware(request)

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(result.status).toBeDefined()
    })

    it('redirects kiosk device away from auth pages', async () => {
      const request = new NextRequest('http://localhost/auth/signin', {
        headers: {
          'x-kiosk-device': 'device-secret',
        },
      })

      ;(createServiceClient as jest.Mock).mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn(async () => ({
            data: { id: 'secret', revoked_at: null },
            error: null,
          })),
        })),
      })

      await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalledWith(new URL('/kiosk', 'http://localhost/auth/signin'))
    })
  })

  describe('Request size validation', () => {
    it('should allow requests within size limit', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'content-length': '1000',
        },
      })

      await middleware(request)

      expect(NextResponse.json).not.toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Request too large' }),
        expect.any(Object)
      )
    })

    it('should reject requests exceeding size limit', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'content-length': String(MAX_REQUEST_SIZE_BYTES + 1),
        },
      })

      await middleware(request)

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Request too large',
        }),
        expect.objectContaining({ status: 413 })
      )
    })

    it('should allow requests without content-length header', async () => {
      const request = new NextRequest('http://localhost/api/test')

      await middleware(request)

      expect(NextResponse.json).not.toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Request too large' }),
        expect.any(Object)
      )
    })

    it('should handle invalid content-length gracefully', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'content-length': 'invalid',
        },
      })

      await middleware(request)

      // Should not reject, should continue to rate limiting
      expect(apiRateLimiter.check).toHaveBeenCalled()
    })
  })

  describe('Rate limiting', () => {
    it('should use apiRateLimiter for general API routes', async () => {
      const request = new NextRequest('http://localhost/api/chores')

      await middleware(request)

      expect(getClientIdentifier).toHaveBeenCalledWith(request)
      expect(apiRateLimiter.check).toHaveBeenCalledWith('192.168.1.1')
    })

    it('should use authRateLimiter for auth routes', async () => {
      const request = new NextRequest('http://localhost/api/auth/callback')

      await middleware(request)

      expect(authRateLimiter.check).toHaveBeenCalledWith('192.168.1.1')
    })

    it('should use cronRateLimiter for cron routes', async () => {
      const request = new NextRequest('http://localhost/api/cron/distribute-allowances')

      await middleware(request)

      expect(cronRateLimiter.check).toHaveBeenCalledWith('192.168.1.1')
    })

    it('should return 429 when rate limit exceeded', async () => {
      ;(apiRateLimiter.check as jest.Mock).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000,
      })

      const request = new NextRequest('http://localhost/api/test')

      await middleware(request)

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
        }),
        expect.objectContaining({
          status: 429,
          headers: expect.objectContaining({
            'Retry-After': expect.any(String),
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
          }),
        })
      )
    })

    it('should add rate limit headers to successful responses', async () => {
      const headers = new Headers()
      const mockResponse = {
        headers: {
          set: jest.fn((key, value) => headers.set(key, value)),
          get: jest.fn((key) => headers.get(key)),
        },
        status: 200,
        json: jest.fn(async () => ({})),
      }
      ;(NextResponse.next as jest.Mock).mockReturnValueOnce(mockResponse)

      const request = new NextRequest('http://localhost/api/test')

      const result = await middleware(request)

      expect(result).toBe(mockResponse)
      expect(result.headers.set).toHaveBeenCalledWith('X-RateLimit-Limit', '100')
      expect(result.headers.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '99')
      expect(result.headers.set).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        expect.any(String)
      )
    })
  })

  describe('Client identifier extraction', () => {
    it('should extract IP from request', async () => {
      const request = new NextRequest('http://localhost/api/test')

      await middleware(request)

      expect(getClientIdentifier).toHaveBeenCalledWith(request)
    })
  })
})
