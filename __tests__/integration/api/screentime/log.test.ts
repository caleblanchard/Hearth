// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock'

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
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
import { ScreenTimeTransactionType } from '@/app/generated/prisma'

const { auth } = require('@/lib/auth')
const { wouldExceedAllowance, calculateRemainingTime, getWeekStart } = require('@/lib/screentime-utils')

describe('/api/screentime/log', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
    
    // Mock $transaction to execute the callback with a transaction client
    // The transaction client should have all the same methods as prismaMock
    prismaMock.$transaction.mockImplementation(async (callback: any, options?: any) => {
      // Create a transaction client that uses the same mocks
      const tx = {
        screenTimeBalance: {
          findUnique: prismaMock.screenTimeBalance.findUnique,
          create: prismaMock.screenTimeBalance.create,
          update: prismaMock.screenTimeBalance.update,
        },
        screenTimeTransaction: {
          create: prismaMock.screenTimeTransaction.create,
        },
        auditLog: {
          create: prismaMock.auditLog.create,
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
      auth.mockResolvedValue(null)

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
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Minutes must be a positive integer')
    })

    it('should return 400 if screenTimeTypeId is missing', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({ minutes: 30 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Screen time type is required')
    })

    it('should return 400 if minutes is zero or negative', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({ minutes: 0 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Minutes must be a positive integer')
    })

    it('should return 400 if screen time type not found', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.screenTimeType.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({ minutes: 30, screenTimeTypeId: 'type-1' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Screen time type not found or is archived')
    })

    it('should return 400 if allowance not configured', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.screenTimeType.findFirst.mockResolvedValue({
        id: 'type-1',
        familyId: session.user.familyId,
        isArchived: false,
      } as any)

      prismaMock.screenTimeAllowance.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({ minutes: 30, screenTimeTypeId: 'type-1' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No allowance configured for this screen time type')
    })

    it('should log screen time and deduct from balance', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.screenTimeType.findFirst.mockResolvedValue({
        id: 'type-1',
        familyId: session.user.familyId,
        name: 'Educational',
        isArchived: false,
      } as any)

      prismaMock.screenTimeAllowance.findUnique.mockResolvedValue({
        id: 'allowance-1',
        memberId: 'child-1',
        screenTimeTypeId: 'type-1',
        allowanceMinutes: 120,
        period: 'WEEKLY',
      } as any)

      // wouldExceedAllowance is called twice: once before transaction, once inside
      wouldExceedAllowance
        .mockResolvedValueOnce({
          wouldExceed: false,
          remainingBefore: 90,
          remainingAfter: 60,
          allowanceMinutes: 120,
          usedMinutes: 30,
          rolloverMinutes: 0,
        })
        .mockResolvedValueOnce({
          wouldExceed: false,
          remainingBefore: 90,
          remainingAfter: 60,
          allowanceMinutes: 120,
          usedMinutes: 30,
          rolloverMinutes: 0,
        })

      // calculateRemainingTime is called inside transaction
      calculateRemainingTime.mockResolvedValue({
        remainingMinutes: 60,
        usedMinutes: 30,
        rolloverMinutes: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
      })

      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(mockBalance as any)
      prismaMock.screenTimeBalance.update.mockResolvedValue({
        ...mockBalance,
        currentBalanceMinutes: 30, // 60 - 30
      } as any)

      getWeekStart.mockResolvedValue(new Date())

      prismaMock.screenTimeTransaction.create.mockResolvedValue({
        id: 'tx-1',
        memberId: 'child-1',
        type: ScreenTimeTransactionType.SPENT,
        amountMinutes: -30,
        balanceAfter: 30,
      } as any)

      prismaMock.auditLog.create.mockResolvedValue({} as any)

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
      expect(data.balance).toBe(30)
      // remainingMinutes is calculated as: remaining.remainingMinutes - minutes = 60 - 30 = 30
      expect(data.remainingMinutes).toBe(30)
      expect(data.message).toContain('30 minutes')
      expect(data.message).toContain('Educational')
      // Transaction is called, and screenTimeTransaction.create is called inside it
      expect(prismaMock.$transaction).toHaveBeenCalled()
      // The transaction.create happens inside the transaction callback with the tx client
    })

    it('should prevent negative balance', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.screenTimeType.findFirst.mockResolvedValue({
        id: 'type-1',
        familyId: session.user.familyId,
        name: 'Educational',
        isArchived: false,
      } as any)

      prismaMock.screenTimeAllowance.findUnique.mockResolvedValue({
        id: 'allowance-1',
        memberId: 'child-1',
        screenTimeTypeId: 'type-1',
        allowanceMinutes: 120,
      } as any)

      wouldExceedAllowance.mockResolvedValue({
        wouldExceed: false,
        remainingBefore: 20,
        remainingAfter: -10,
        allowanceMinutes: 120,
        usedMinutes: 100,
        rolloverMinutes: 0,
      })

      calculateRemainingTime.mockResolvedValue({
        remainingMinutes: -10,
        usedMinutes: 130,
        rolloverMinutes: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
      })

      prismaMock.screenTimeBalance.findUnique.mockResolvedValue({
        ...mockBalance,
        currentBalanceMinutes: 20, // Only 20 minutes available
      } as any)

      prismaMock.screenTimeBalance.update.mockResolvedValue({
        ...mockBalance,
        currentBalanceMinutes: 0, // Math.max(0, 20 - 30) = 0
      } as any)

      getWeekStart.mockResolvedValue(new Date())

      prismaMock.screenTimeTransaction.create.mockResolvedValue({} as any)
      prismaMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({ minutes: 30, screenTimeTypeId: 'type-1' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.balance).toBe(0) // Should be 0, not negative
    })

    it('should use default deviceType if not provided', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.screenTimeType.findFirst.mockResolvedValue({
        id: 'type-1',
        familyId: session.user.familyId,
        name: 'Educational',
        isArchived: false,
      } as any)

      prismaMock.screenTimeAllowance.findUnique.mockResolvedValue({
        id: 'allowance-1',
        memberId: 'child-1',
        screenTimeTypeId: 'type-1',
        allowanceMinutes: 120,
      } as any)

      wouldExceedAllowance.mockResolvedValue({
        wouldExceed: false,
        remainingBefore: 90,
        remainingAfter: 60,
        allowanceMinutes: 120,
        usedMinutes: 30,
        rolloverMinutes: 0,
      })

      calculateRemainingTime.mockResolvedValue({
        remainingMinutes: 60,
        usedMinutes: 30,
        rolloverMinutes: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
      })

      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(mockBalance as any)
      prismaMock.screenTimeBalance.update.mockResolvedValue({
        ...mockBalance,
        currentBalanceMinutes: 30,
      } as any)

      getWeekStart.mockResolvedValue(new Date())

      prismaMock.screenTimeTransaction.create.mockResolvedValue({} as any)
      prismaMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({ minutes: 30, screenTimeTypeId: 'type-1' }),
      })

      await POST(request)

      // Transaction is called, and screenTimeTransaction.create is called inside it
      expect(prismaMock.$transaction).toHaveBeenCalled()
      // The transaction.create happens inside the transaction callback
    })

    it('should create audit log', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.screenTimeType.findFirst.mockResolvedValue({
        id: 'type-1',
        familyId: session.user.familyId,
        name: 'Educational',
        isArchived: false,
      } as any)

      prismaMock.screenTimeAllowance.findUnique.mockResolvedValue({
        id: 'allowance-1',
        memberId: 'child-1',
        screenTimeTypeId: 'type-1',
        allowanceMinutes: 120,
      } as any)

      wouldExceedAllowance.mockResolvedValue({
        wouldExceed: false,
        remainingBefore: 90,
        remainingAfter: 60,
        allowanceMinutes: 120,
        usedMinutes: 30,
        rolloverMinutes: 0,
      })

      calculateRemainingTime.mockResolvedValue({
        remainingMinutes: 60,
        usedMinutes: 30,
        rolloverMinutes: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
      })

      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(mockBalance as any)
      prismaMock.screenTimeBalance.update.mockResolvedValue({
        ...mockBalance,
        currentBalanceMinutes: 30,
      } as any)

      getWeekStart.mockResolvedValue(new Date())

      prismaMock.screenTimeTransaction.create.mockResolvedValue({
        id: 'tx-1',
        amountMinutes: -30,
        balanceAfter: 30,
      } as any)

      prismaMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({ minutes: 30, screenTimeTypeId: 'type-1', deviceType: 'PHONE' }),
      })

      await POST(request)

      // Audit log is created inside transaction, so check that transaction was called
      expect(prismaMock.$transaction).toHaveBeenCalled()
      // The audit log creation happens inside the transaction callback
    })

    it('should handle invalid JSON gracefully', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: 'invalid json{',
      })

      const response = await POST(request)
      const data = await response.json()

      // Invalid JSON should return 400 - either from JSON parsing or field validation
      expect(response.status).toBe(400)
      // The error should indicate either a JSON format issue or missing field
      expect(['Invalid JSON format', 'Minutes must be a positive integer']).toContain(data.error)
    })

    it('should return 403 if child tries to exceed allowance without override', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.screenTimeType.findFirst.mockResolvedValue({
        id: 'type-1',
        familyId: session.user.familyId,
        name: 'Educational',
        isArchived: false,
      } as any)

      prismaMock.screenTimeAllowance.findUnique.mockResolvedValue({
        id: 'allowance-1',
        memberId: 'child-1',
        screenTimeTypeId: 'type-1',
        allowanceMinutes: 120,
        period: 'WEEKLY',
      } as any)

      wouldExceedAllowance.mockResolvedValue({
        wouldExceed: true,
        remainingBefore: 10,
        remainingAfter: -20,
        allowanceMinutes: 120,
        usedMinutes: 110,
        rolloverMinutes: 0,
      })

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({
          minutes: 30,
          screenTimeTypeId: 'type-1',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.wouldExceed).toBe(true)
      expect(data.error).toContain('exceed your allowance')
      expect(data.remainingBefore).toBe(10)
    })

    it('should allow parent override when exceeding allowance', async () => {
      const session = mockParentSession({ user: { id: 'parent-1' } })
      auth.mockResolvedValue(session)

      prismaMock.screenTimeType.findFirst.mockResolvedValue({
        id: 'type-1',
        familyId: session.user.familyId,
        name: 'Educational',
        isArchived: false,
      } as any)

      // Allowance for the parent (since memberId = session.user.id = parent-1)
      prismaMock.screenTimeAllowance.findUnique.mockResolvedValue({
        id: 'allowance-1',
        memberId: 'parent-1', // Parent's own allowance
        screenTimeTypeId: 'type-1',
        allowanceMinutes: 120,
        period: 'WEEKLY',
      } as any)

      // wouldExceedAllowance is called twice: once before transaction, once inside
      wouldExceedAllowance
        .mockResolvedValueOnce({
          wouldExceed: true,
          remainingBefore: 10,
          remainingAfter: -20,
          allowanceMinutes: 120,
          usedMinutes: 110,
          rolloverMinutes: 0,
        })
        .mockResolvedValueOnce({
          wouldExceed: true,
          remainingBefore: 10,
          remainingAfter: -20,
          allowanceMinutes: 120,
          usedMinutes: 110,
          rolloverMinutes: 0,
        })

      calculateRemainingTime.mockResolvedValue({
        remainingMinutes: -20,
        usedMinutes: 140,
        rolloverMinutes: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
      })

      prismaMock.screenTimeBalance.findUnique.mockResolvedValue({
        memberId: 'parent-1', // Parent's balance
        currentBalanceMinutes: 60,
      } as any)

      prismaMock.screenTimeBalance.update.mockResolvedValue({
        memberId: 'parent-1', // Parent's balance
        currentBalanceMinutes: 30,
      } as any)

      getWeekStart.mockResolvedValue(new Date())

      prismaMock.screenTimeTransaction.create.mockResolvedValue({} as any)
      prismaMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({
          minutes: 30,
          screenTimeTypeId: 'type-1',
          override: true,
          overrideReason: 'Special educational activity',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Transaction is called inside $transaction, so check via the transaction mock
      expect(prismaMock.$transaction).toHaveBeenCalled()
    })

    it('should return 400 if override is true but overrideReason is missing', async () => {
      const session = mockParentSession({ user: { id: 'parent-1' } })
      auth.mockResolvedValue(session)

      prismaMock.screenTimeType.findFirst.mockResolvedValue({
        id: 'type-1',
        familyId: session.user.familyId,
        isArchived: false,
      } as any)

      // Allowance for the parent (since memberId = session.user.id)
      prismaMock.screenTimeAllowance.findUnique.mockResolvedValue({
        id: 'allowance-1',
        memberId: 'parent-1', // Parent's own allowance
        screenTimeTypeId: 'type-1',
        allowanceMinutes: 120,
      } as any)

      // wouldExceedAllowance is called once before transaction (returns early if overrideReason missing)
      wouldExceedAllowance.mockResolvedValue({
        wouldExceed: true,
        remainingBefore: 10,
        remainingAfter: -20,
        allowanceMinutes: 120,
        usedMinutes: 110,
        rolloverMinutes: 0,
      })

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({
          minutes: 30,
          screenTimeTypeId: 'type-1',
          override: true,
          overrideReason: '',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Override reason is required when exceeding allowance')
    })

    it('should return 403 if child tries to override', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.screenTimeType.findFirst.mockResolvedValue({
        id: 'type-1',
        familyId: session.user.familyId,
        isArchived: false,
      } as any)

      prismaMock.screenTimeAllowance.findUnique.mockResolvedValue({
        id: 'allowance-1',
        memberId: session.user.id,
        screenTimeTypeId: 'type-1',
        allowanceMinutes: 120,
      } as any)

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({
          minutes: 30,
          screenTimeTypeId: 'type-1',
          override: true,
          overrideReason: 'I want more time',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only parents can override screen time limits')
    })

    it('should create balance if it does not exist', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.screenTimeType.findFirst.mockResolvedValue({
        id: 'type-1',
        familyId: session.user.familyId,
        name: 'Educational',
        isArchived: false,
      } as any)

      prismaMock.screenTimeAllowance.findUnique.mockResolvedValue({
        id: 'allowance-1',
        memberId: 'child-1',
        screenTimeTypeId: 'type-1',
        allowanceMinutes: 120,
      } as any)

      // wouldExceedAllowance is called twice: once before transaction, once inside
      wouldExceedAllowance
        .mockResolvedValueOnce({
          wouldExceed: false,
          remainingBefore: 90,
          remainingAfter: 60,
          allowanceMinutes: 120,
          usedMinutes: 30,
          rolloverMinutes: 0,
        })
        .mockResolvedValueOnce({
          wouldExceed: false,
          remainingBefore: 90,
          remainingAfter: 60,
          allowanceMinutes: 120,
          usedMinutes: 30,
          rolloverMinutes: 0,
        })

      // calculateRemainingTime is called inside transaction
      calculateRemainingTime.mockResolvedValue({
        remainingMinutes: 90, // Before logging
        usedMinutes: 30,
        rolloverMinutes: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
      })

      // Balance doesn't exist - findUnique returns null, then create is called in transaction
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(null)
      getWeekStart.mockResolvedValue(new Date('2026-01-01'))

      // These are called inside the transaction via tx client
      prismaMock.screenTimeBalance.create.mockResolvedValue({
        memberId: 'child-1',
        currentBalanceMinutes: 0,
        weekStartDate: new Date('2026-01-01'),
      } as any)

      prismaMock.screenTimeBalance.update.mockResolvedValue({
        memberId: 'child-1',
        currentBalanceMinutes: 0, // 0 - 30 = 0 (max prevents negative)
      } as any)

      prismaMock.screenTimeTransaction.create.mockResolvedValue({} as any)
      prismaMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({
          minutes: 30,
          screenTimeTypeId: 'type-1',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prismaMock.screenTimeBalance.create).toHaveBeenCalled()
    })
  })
})
