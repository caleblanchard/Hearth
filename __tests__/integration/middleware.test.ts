// Set up mocks BEFORE any imports
import { MAX_REQUEST_SIZE_BYTES } from '@/lib/constants'

// Mock rate limiters (now from rate-limit-redis)
jest.mock('@/lib/rate-limit-redis', () => ({
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
const { apiRateLimiter, authRateLimiter, cronRateLimiter, getClientIdentifier } = require('@/lib/rate-limit-redis')

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
    
    constructor(url: string, init?: { headers?: HeadersInit }) {
      this.url = url
      const urlObj = new URL(url)
      this.nextUrl = { pathname: urlObj.pathname }
      this.headers = new Headers(init?.headers || {})
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
    },
  }
})

// NOW import middleware after mocks
import { middleware } from '@/middleware'
import { NextRequest } from 'next/server'

const { NextResponse } = require('next/server')

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
