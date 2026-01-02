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
import { POST } from '@/app/api/screentime/adjust/route'
import { mockParentSession } from '@/lib/test-utils/auth-mock'
import { ScreenTimeTransactionType } from '@/app/generated/prisma'

const { auth } = require('@/lib/auth')

describe('/api/screentime/adjust', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('POST', () => {
    const mockBalance = {
      memberId: 'child-1',
      currentBalanceMinutes: 60,
    }

    const mockMember = {
      id: 'child-1',
      name: 'Test Child',
      familyId: 'family-1',
    }

    it('should return 403 if not a parent', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue({ ...session, user: { ...session.user, role: 'CHILD' } })

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amountMinutes: 10,
          reason: 'Test reason',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 400 if memberId is missing', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          amountMinutes: 10,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Member ID and non-zero amount required')
    })

    it('should return 400 if amountMinutes is zero', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amountMinutes: 0,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Member ID and non-zero amount required')
    })

    it('should return 404 if member not found', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'nonexistent',
          amountMinutes: 10,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Member not found')
    })

    it('should return 404 if member belongs to different family', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        ...mockMember,
        familyId: 'different-family', // Different from session.user.familyId
      } as any)

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amountMinutes: 10,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Member not found')
    })

    it('should return 400 if screen time not configured', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        ...mockMember,
        familyId: session.user.familyId,
      } as any)
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amountMinutes: 10,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Screen time not configured for this member')
    })

    it('should return 400 if trying to remove more than available balance', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        ...mockMember,
        familyId: session.user.familyId,
      } as any)
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue({
        ...mockBalance,
        currentBalanceMinutes: 30, // Only 30 minutes available
      } as any)

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amountMinutes: -50, // Trying to remove 50
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Insufficient balance')
      expect(data.message).toContain('30 minutes')
    })

    it('should successfully add screen time', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        ...mockMember,
        familyId: session.user.familyId,
      } as any)
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(mockBalance as any)
      prismaMock.screenTimeBalance.update.mockResolvedValue({
        ...mockBalance,
        currentBalanceMinutes: 70, // 60 + 10
      } as any)

      prismaMock.screenTimeTransaction.create.mockResolvedValue({
        id: 'tx-1',
        memberId: 'child-1',
        type: ScreenTimeTransactionType.ADJUSTMENT,
        amountMinutes: 10,
        balanceAfter: 70,
      } as any)

      prismaMock.auditLog.create.mockResolvedValue({} as any)
      prismaMock.notification.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amountMinutes: 10,
          reason: 'Good behavior',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.balance).toBe(70)
      expect(prismaMock.screenTimeBalance.update).toHaveBeenCalledWith({
        where: { memberId: 'child-1' },
        data: { currentBalanceMinutes: 70 },
      })
    })

    it('should successfully remove screen time', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        ...mockMember,
        familyId: session.user.familyId,
      } as any)
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(mockBalance as any)
      prismaMock.screenTimeBalance.update.mockResolvedValue({
        ...mockBalance,
        currentBalanceMinutes: 50, // 60 - 10
      } as any)

      prismaMock.screenTimeTransaction.create.mockResolvedValue({
        id: 'tx-1',
        memberId: 'child-1',
        type: ScreenTimeTransactionType.ADJUSTMENT,
        amountMinutes: -10,
        balanceAfter: 50,
      } as any)

      prismaMock.auditLog.create.mockResolvedValue({} as any)
      prismaMock.notification.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amountMinutes: -10,
          reason: 'Misbehavior',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.balance).toBe(50)
    })

    it('should prevent negative balance', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        ...mockMember,
        familyId: session.user.familyId,
      } as any)
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue({
        ...mockBalance,
        currentBalanceMinutes: 20,
      } as any)

      // Try to remove 30 minutes when only 20 available
      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amountMinutes: -30,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Insufficient balance')
      expect(prismaMock.screenTimeBalance.update).not.toHaveBeenCalled()
    })

    it('should handle invalid JSON gracefully', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: 'invalid json{',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON in request body')
    })

    it('should create notification for child', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        ...mockMember,
        familyId: session.user.familyId,
      } as any)
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(mockBalance as any)
      prismaMock.screenTimeBalance.update.mockResolvedValue({
        ...mockBalance,
        currentBalanceMinutes: 70,
      } as any)

      prismaMock.screenTimeTransaction.create.mockResolvedValue({
        id: 'tx-1',
        amountMinutes: 10,
        balanceAfter: 70,
      } as any)

      prismaMock.auditLog.create.mockResolvedValue({} as any)
      prismaMock.notification.create.mockResolvedValue({
        id: 'notif-1',
        userId: 'child-1',
        type: 'SCREENTIME_ADJUSTED',
      } as any)

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amountMinutes: 10,
          reason: 'Bonus',
        }),
      })

      await POST(request)

      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'child-1',
          type: 'SCREENTIME_ADJUSTED',
          title: 'Screen time updated',
          message: expect.stringContaining('added'),
        }),
      })
    })

    it('should create audit log', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        ...mockMember,
        familyId: session.user.familyId,
      } as any)
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(mockBalance as any)
      prismaMock.screenTimeBalance.update.mockResolvedValue({
        ...mockBalance,
        currentBalanceMinutes: 70,
      } as any)

      prismaMock.screenTimeTransaction.create.mockResolvedValue({
        id: 'tx-1',
        amountMinutes: 10,
        balanceAfter: 70,
      } as any)

      prismaMock.auditLog.create.mockResolvedValue({} as any)
      prismaMock.notification.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amountMinutes: 10,
          reason: 'Test',
        }),
      })

      await POST(request)

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          familyId: session.user.familyId,
          memberId: session.user.id,
          action: 'SCREENTIME_ADJUSTED',
          entityType: 'ScreenTimeTransaction',
          result: 'SUCCESS',
          metadata: expect.objectContaining({
            targetMemberId: 'child-1',
            amountMinutes: 10,
            newBalance: 70,
          }),
        }),
      })
    })
  })
})
