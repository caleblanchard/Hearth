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

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/screentime/adjust/route'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'
import { ScreenTimeTransactionType } from '@/lib/enums'

describe('/api/screentime/adjust', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  describe('POST', () => {
    const mockBalance = {
      memberId: 'child-1',
      currentBalanceMinutes: 60,
    }

    // This will be updated in tests
    const mockMember = {
      id: 'child-1',
      name: 'Test Child',
      familyId: 'family-test-123', // Matches default session
    }
    
    const mockScreenTimeType = {
      id: 'type-1',
      familyId: 'family-test-123',
      name: 'General',
      isArchived: false,
    }

    const mockAllowance = {
      id: 'allowance-1',
      memberId: 'child-1',
      screenTimeTypeId: 'type-1',
      remaining_minutes: 60,
    }

    it('should return 403 if not a parent', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
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

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          amountMinutes: 10,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Member ID, screen time type ID, and non-zero amount required')
    })

    it('should return 400 if amountMinutes is zero', async () => {
      const session = mockParentSession()

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          amountMinutes: 0,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Member ID, screen time type ID, and non-zero amount required')
    })

    it('should return 404 if member not found', async () => {
      const session = mockParentSession()

      dbMock.familyMember.findFirst.mockResolvedValue(null)
      dbMock.familyMember.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'nonexistent',
          screenTimeTypeId: 'type-1',
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

      // Mock finding member but with wrong family ID
      const wrongFamilyMember = {
        ...mockMember,
        familyId: 'different-family',
      }
      dbMock.familyMember.findFirst.mockResolvedValue(wrongFamilyMember as any)
      dbMock.familyMember.findUnique.mockResolvedValue(wrongFamilyMember as any)

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          amountMinutes: 10,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Member not found')
    })

    it('should return 404 if allowance not found', async () => {
      const session = mockParentSession()

      dbMock.familyMember.findFirst.mockResolvedValue(mockMember as any)
      dbMock.familyMember.findUnique.mockResolvedValue(mockMember as any)
      
      dbMock.screenTimeAllowance.findFirst.mockResolvedValue(null)
      dbMock.screenTimeAllowance.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          amountMinutes: 10,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Allowance not found')
    })

    it('should successfully add screen time', async () => {
      const session = mockParentSession()

      dbMock.familyMember.findFirst.mockResolvedValue(mockMember as any)
      dbMock.familyMember.findUnique.mockResolvedValue(mockMember as any)
      
      const mockAllowance = {
        id: 'allowance-1',
        memberId: 'child-1',
        screenTimeTypeId: 'type-1',
        remaining_minutes: 60,
      }
      dbMock.screenTimeAllowance.findFirst.mockResolvedValue(mockAllowance as any)
      dbMock.screenTimeAllowance.findUnique.mockResolvedValue(mockAllowance as any)
      
      // Mock update
      dbMock.screenTimeAllowance.update.mockResolvedValue({
        ...mockAllowance,
        remaining_minutes: 70,
      } as any)

      dbMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          amountMinutes: 10,
          reason: 'Good behavior',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.allowance.remaining_minutes).toBe(70)
      expect(dbMock.screenTimeAllowance.update).toHaveBeenCalled()
    })

    it('should successfully remove screen time', async () => {
      const session = mockParentSession()

      dbMock.familyMember.findFirst.mockResolvedValue(mockMember as any)
      dbMock.familyMember.findUnique.mockResolvedValue(mockMember as any)
      
      const mockAllowance = {
        id: 'allowance-1',
        memberId: 'child-1',
        screenTimeTypeId: 'type-1',
        remaining_minutes: 60,
      }
      dbMock.screenTimeAllowance.findFirst.mockResolvedValue(mockAllowance as any)
      dbMock.screenTimeAllowance.findUnique.mockResolvedValue(mockAllowance as any)
      
      // Mock update
      dbMock.screenTimeAllowance.update.mockResolvedValue({
        ...mockAllowance,
        remaining_minutes: 50,
      } as any)

      dbMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          amountMinutes: -10,
          reason: 'Misbehavior',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.allowance.remaining_minutes).toBe(50)
    })

    it('should handle invalid JSON gracefully', async () => {
      const session = mockParentSession()

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: 'invalid json{',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to adjust allowance')
    })

    it('should create audit log', async () => {
      const session = mockParentSession()

      dbMock.familyMember.findFirst.mockResolvedValue(mockMember as any)
      dbMock.familyMember.findUnique.mockResolvedValue(mockMember as any)
      
      const mockAllowance = {
        id: 'allowance-1',
        memberId: 'child-1',
        screenTimeTypeId: 'type-1',
        remaining_minutes: 60,
      }
      dbMock.screenTimeAllowance.findFirst.mockResolvedValue(mockAllowance as any)
      dbMock.screenTimeAllowance.findUnique.mockResolvedValue(mockAllowance as any)
      dbMock.screenTimeAllowance.update.mockResolvedValue({
        ...mockAllowance,
        remaining_minutes: 70,
      } as any)

      dbMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/screentime/adjust', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          amountMinutes: 10,
          reason: 'Test',
        }),
      })

      await POST(request)

      expect(dbMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          familyId: session.user.familyId,
          action: 'SCREENTIME_ALLOWANCE_INCREASED',
          entityType: 'SCREENTIME_ALLOWANCE',
          result: 'SUCCESS',
          metadata: expect.objectContaining({
            targetMember: 'Test Child',
            adjustment: 10,
          }),
        }),
      })
    })
  })
})
