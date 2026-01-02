// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock'

// Mock NextAuth handlers
jest.mock('@/lib/auth', () => ({
  handlers: {
    GET: jest.fn(),
    POST: jest.fn(),
  },
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/auth/[...nextauth]/route'

const { handlers } = require('@/lib/auth')

describe('/api/auth/[...nextauth]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    it('should delegate to NextAuth GET handler', async () => {
      const mockResponse = new Response(JSON.stringify({}), { status: 200 })
      handlers.GET.mockResolvedValue(mockResponse)

      const request = new NextRequest('http://localhost/api/auth/signin')
      const response = await GET(request)

      expect(handlers.GET).toHaveBeenCalledWith(request)
      expect(response).toBe(mockResponse)
    })

    it('should handle errors from NextAuth handler', async () => {
      const error = new Error('Auth error')
      handlers.GET.mockRejectedValue(error)

      const request = new NextRequest('http://localhost/api/auth/signin')

      await expect(GET(request)).rejects.toThrow('Auth error')
      expect(handlers.GET).toHaveBeenCalledWith(request)
    })
  })

  describe('POST', () => {
    it('should delegate to NextAuth POST handler', async () => {
      const mockResponse = new Response(JSON.stringify({}), { status: 200 })
      handlers.POST.mockResolvedValue(mockResponse)

      const request = new NextRequest('http://localhost/api/auth/callback/credentials', {
        method: 'POST',
      })
      const response = await POST(request)

      expect(handlers.POST).toHaveBeenCalledWith(request)
      expect(response).toBe(mockResponse)
    })

    it('should handle errors from NextAuth handler', async () => {
      const error = new Error('Auth error')
      handlers.POST.mockRejectedValue(error)

      const request = new NextRequest('http://localhost/api/auth/callback/credentials', {
        method: 'POST',
      })

      await expect(POST(request)).rejects.toThrow('Auth error')
      expect(handlers.POST).toHaveBeenCalledWith(request)
    })
  })
})
