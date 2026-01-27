// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock'

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock screentime-utils
jest.mock('@/lib/screentime-utils', () => ({
  wouldExceedAllowance: jest.fn(),
  calculateRemainingTime: jest.fn(),
  getWeekStart: jest.fn(),
}))

// Mock input-sanitization
jest.mock('@/lib/input-sanitization', () => ({
  sanitizeString: jest.fn((val) => val ? String(val).trim() : ''),
  sanitizeInteger: jest.fn((val, min, max) => {
    const num = parseInt(String(val), 10);
    if (isNaN(num)) return null;
    if (min !== undefined && num < min) return null;
    if (max !== undefined && num > max) return null;
    return num;
  }),
}))

// Mock request-validation
jest.mock('@/lib/request-validation', () => ({
  parseJsonBody: jest.fn(async (request) => {
    try {
      // In test environment, request.body might be a string or ReadableStream
      // Try to get it as text first
      let text: string;
      if (typeof request.body === 'string') {
        text = request.body;
      } else {
        // Try request.text() or request.json() as fallback
        try {
          text = await request.text();
        } catch {
          // If text() fails, try json() directly
          try {
            const data = await request.json();
            return { success: true, data };
          } catch {
            return { success: true, data: {} };
          }
        }
      }
      
      if (!text || text.trim().length === 0) {
        return { success: true, data: {} };
      }
      const data = JSON.parse(text);
      return { success: true, data };
    } catch (error) {
      // If all else fails, try request.json() directly
      try {
        const data = await request.json();
        return { success: true, data };
      } catch {
        return {
          success: false,
          error: 'Failed to parse request body',
          status: 400,
        };
      }
    }
  }),
}))

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/screentime/log/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { ScreenTimeTransactionType } from '@/lib/enums'

const { wouldExceedAllowance, calculateRemainingTime, getWeekStart } = require('@/lib/screentime-utils')

describe('/api/screentime/log', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
    
    // Mock $transaction to execute the callback with a transaction client
    // The transaction client should have all the same methods as dbMock
    dbMock.$transaction.mockImplementation(async (callback: any, options?: any) => {
      // Create a transaction client that uses the same mocks
      const tx = {
        screenTimeBalance: {
          findUnique: dbMock.screenTimeBalance.findUnique,
          create: dbMock.screenTimeBalance.create,
          update: dbMock.screenTimeBalance.update,
        },
        screenTimeTransaction: {
          create: dbMock.screenTimeTransaction.create,
        },
        auditLog: {
          create: dbMock.auditLog.create,
        },
      }
      try {
        return await callback(tx)
      } catch (error) {
        // Re-throw errors from transaction
        throw error
      }
    })
  })

  describe('POST', () => {
    const mockBalance = {
      memberId: 'child-1',
      currentBalanceMinutes: 60,
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({ minutes: 30 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if minutes is missing', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid minutes value is required')
    })

    it('should return 400 if screenTimeTypeId is missing', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({ minutes: 30 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Screen time type ID is required')
    })

    it('should return 400 if minutes is zero or negative', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({ minutes: 0 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid minutes value is required')
    })

    it('should log screen time successfully', async () => {
      const session = mockChildSession()
      
      const mockSession = {
        id: 'session-1',
        member_id: session.user.id,
        screen_time_type_id: 'type-1',
        minutes_used: 30,
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
      }

      // Mock the insert response
      dbMock.screenTimeTransaction.create.mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({
          minutes: 30,
          screenTimeTypeId: 'type-1',
          deviceType: 'TABLET',
          notes: 'Watched videos',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Screen time logged successfully')
    })
  })
})
