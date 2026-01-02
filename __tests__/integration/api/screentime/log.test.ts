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

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/screentime/log/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { ScreenTimeTransactionType } from '@/app/generated/prisma'

const { auth } = require('@/lib/auth')

describe('/api/screentime/log', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
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
      expect(data.error).toBe('Minutes must be greater than 0')
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
      expect(data.error).toBe('Minutes must be greater than 0')
    })

    it('should return 400 if screen time not configured', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({ minutes: 30 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Screen time not configured')
    })

    it('should log screen time and deduct from balance', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(mockBalance as any)
      prismaMock.screenTimeBalance.update.mockResolvedValue({
        ...mockBalance,
        currentBalanceMinutes: 30, // 60 - 30
      } as any)

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
        body: JSON.stringify({ minutes: 30, deviceType: 'TABLET', notes: 'Watched videos' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.balance).toBe(30)
      expect(data.message).toContain('30 minutes')
      expect(prismaMock.screenTimeBalance.update).toHaveBeenCalledWith({
        where: { memberId: 'child-1' },
        data: { currentBalanceMinutes: 30 },
      })
      expect(prismaMock.screenTimeTransaction.create).toHaveBeenCalledWith({
        data: {
          memberId: 'child-1',
          type: ScreenTimeTransactionType.SPENT,
          amountMinutes: -30,
          balanceAfter: 30,
          deviceType: 'TABLET',
          notes: 'Watched videos',
          createdById: 'child-1',
        },
      })
    })

    it('should prevent negative balance', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.screenTimeBalance.findUnique.mockResolvedValue({
        ...mockBalance,
        currentBalanceMinutes: 20, // Only 20 minutes available
      } as any)

      prismaMock.screenTimeBalance.update.mockResolvedValue({
        ...mockBalance,
        currentBalanceMinutes: 0, // Math.max(0, 20 - 30) = 0
      } as any)

      prismaMock.screenTimeTransaction.create.mockResolvedValue({} as any)
      prismaMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({ minutes: 30 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.balance).toBe(0) // Should be 0, not negative
    })

    it('should use default deviceType if not provided', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(mockBalance as any)
      prismaMock.screenTimeBalance.update.mockResolvedValue({
        ...mockBalance,
        currentBalanceMinutes: 30,
      } as any)

      prismaMock.screenTimeTransaction.create.mockResolvedValue({} as any)
      prismaMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({ minutes: 30 }),
      })

      await POST(request)

      expect(prismaMock.screenTimeTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviceType: 'OTHER',
        }),
      })
    })

    it('should create audit log', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(mockBalance as any)
      prismaMock.screenTimeBalance.update.mockResolvedValue({
        ...mockBalance,
        currentBalanceMinutes: 30,
      } as any)

      prismaMock.screenTimeTransaction.create.mockResolvedValue({
        id: 'tx-1',
        amountMinutes: -30,
        balanceAfter: 30,
      } as any)

      prismaMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/screentime/log', {
        method: 'POST',
        body: JSON.stringify({ minutes: 30, deviceType: 'PHONE' }),
      })

      await POST(request)

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          familyId: session.user.familyId,
          memberId: 'child-1',
          action: 'SCREENTIME_LOGGED',
          entityType: 'ScreenTimeTransaction',
          result: 'SUCCESS',
          metadata: expect.objectContaining({
            minutes: 30,
            deviceType: 'PHONE',
            newBalance: 30,
          }),
        }),
      })
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

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to log screen time')
    })
  })
})
