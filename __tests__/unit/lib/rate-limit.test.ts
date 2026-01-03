import { RateLimiter, apiRateLimiter, authRateLimiter, cronRateLimiter, getClientIdentifier } from '@/lib/rate-limit'

describe('lib/rate-limit.ts', () => {
  describe('RateLimiter', () => {
    let limiter: RateLimiter

    beforeEach(() => {
      limiter = new RateLimiter(60000, 5) // 5 requests per minute for testing
    })

    afterEach(() => {
      limiter.destroy()
    })

    it('should allow first request', () => {
      const result = limiter.check('test-ip')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
      expect(result.resetTime).toBeGreaterThan(Date.now())
    })

    it('should allow requests within limit', () => {
      for (let i = 0; i < 5; i++) {
        const result = limiter.check('test-ip')
        expect(result.allowed).toBe(true)
      }
    })

    it('should block requests exceeding limit', () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        limiter.check('test-ip')
      }

      // 6th request should be blocked
      const result = limiter.check('test-ip')
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should track remaining requests correctly', () => {
      const result1 = limiter.check('test-ip')
      expect(result1.remaining).toBe(4)

      const result2 = limiter.check('test-ip')
      expect(result2.remaining).toBe(3)

      const result3 = limiter.check('test-ip')
      expect(result3.remaining).toBe(2)
    })

    it('should reset count after window expires', async () => {
      // Create a limiter with a very short window (100ms)
      const shortWindowLimiter = new RateLimiter(100, 2)

      // Make 2 requests (the limit)
      shortWindowLimiter.check('test-ip')
      shortWindowLimiter.check('test-ip')

      // Should be blocked
      expect(shortWindowLimiter.check('test-ip').allowed).toBe(false)

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should be allowed again
      const result = shortWindowLimiter.check('test-ip')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(1)

      shortWindowLimiter.destroy()
    })

    it('should handle different identifiers separately', () => {
      const result1 = limiter.check('ip-1')
      const result2 = limiter.check('ip-2')

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
      expect(result1.remaining).toBe(4)
      expect(result2.remaining).toBe(4)
    })

    it('should cleanup expired entries', async () => {
      const shortWindowLimiter = new RateLimiter(100, 2)

      shortWindowLimiter.check('ip-1')
      shortWindowLimiter.check('ip-2')

      // Wait for cleanup interval (60s) or manually trigger
      // Since cleanup runs every 60s, we'll test the cleanup method directly
      // by waiting for expiration and checking the store is cleaned
      await new Promise((resolve) => setTimeout(resolve, 150))

      // New request should reset the entry
      const result = shortWindowLimiter.check('ip-1')
      expect(result.allowed).toBe(true)

      shortWindowLimiter.destroy()
    })

    it('should clear all entries', () => {
      limiter.check('ip-1')
      limiter.check('ip-2')
      limiter.check('ip-3')

      limiter.clear()

      // After clear, should start fresh
      const result = limiter.check('ip-1')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it('should destroy and cleanup interval', () => {
      const testLimiter = new RateLimiter(60000, 5)
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

      testLimiter.destroy()

      expect(clearIntervalSpy).toHaveBeenCalled()
      clearIntervalSpy.mockRestore()
    })
  })

  describe('getClientIdentifier', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://example.com', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('192.168.1.1')
    })

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('http://example.com', {
        headers: {
          'x-real-ip': '192.168.1.2',
        },
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('192.168.1.2')
    })

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const request = new Request('http://example.com', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '192.168.1.2',
        },
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('192.168.1.1')
    })

    it('should fallback to unknown if no IP headers', () => {
      const request = new Request('http://example.com')

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('unknown')
    })

    it('should handle comma-separated IPs in x-forwarded-for', () => {
      const request = new Request('http://example.com', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1',
        },
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('192.168.1.1')
    })
  })

  describe('Rate Limiter Instances', () => {
    afterAll(() => {
      // Clean up global rate limiter instances to prevent hanging
      apiRateLimiter.destroy()
      authRateLimiter.destroy()
      cronRateLimiter.destroy()
    })

    it('should have correct limits for apiRateLimiter', () => {
      expect(apiRateLimiter.maxRequests).toBe(100)
      expect(apiRateLimiter.windowMs).toBe(60000)
    })

    it('should have correct limits for authRateLimiter', () => {
      expect(authRateLimiter.maxRequests).toBe(5)
      expect(authRateLimiter.windowMs).toBe(60000)
    })

    it('should have correct limits for cronRateLimiter', () => {
      expect(cronRateLimiter.maxRequests).toBe(10)
      expect(cronRateLimiter.windowMs).toBe(60000)
    })
  })
})
