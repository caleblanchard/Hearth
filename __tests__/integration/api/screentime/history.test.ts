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
import { GET } from '@/app/api/screentime/history/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'

const { auth } = require('@/lib/auth')

describe('/api/screentime/history', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/screentime/history')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return own history for child', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      const mockTransactions = [
        {
          id: 'tx-1',
          memberId: 'child-1',
          type: 'SPENT',
          amountMinutes: -30,
          balanceAfter: 30,
          createdAt: new Date(),
          createdBy: { id: 'child-1', name: 'Child 1' },
        },
      ]

      prismaMock.screenTimeTransaction.findMany.mockResolvedValue(mockTransactions as any)
      prismaMock.screenTimeTransaction.count.mockResolvedValue(1)

      const request = new NextRequest('http://localhost/api/screentime/history')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transactions).toEqual(mockTransactions)
      expect(data.pagination.total).toBe(1)
      expect(prismaMock.screenTimeTransaction.findMany).toHaveBeenCalledWith({
        where: { memberId: 'child-1' },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
          screenTimeType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      })
    })

    it('should return 403 if child tries to view another member history', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      const request = new NextRequest(
        'http://localhost/api/screentime/history?memberId=child-2'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should allow parent to view child history', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
      } as any)
      prismaMock.screenTimeTransaction.findMany.mockResolvedValue([])
      prismaMock.screenTimeTransaction.count.mockResolvedValue(0)

      const request = new NextRequest(
        'http://localhost/api/screentime/history?memberId=child-1'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(prismaMock.familyMember.findUnique).toHaveBeenCalledWith({
        where: { id: 'child-1' },
        select: { familyId: true },
      })
    })

    it.skip('should allow parent to view child history', async () => {
      const session = mockParentSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      const mockTransactions = [
        {
          id: 'tx-1',
          memberId: 'child-1',
          type: 'SPENT',
          amountMinutes: -30,
          balanceAfter: 30,
          createdAt: new Date(),
          createdBy: { id: 'child-1', name: 'Child 1' },
        },
      ]

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: 'family-1',
      } as any)

      prismaMock.screenTimeTransaction.findMany.mockResolvedValue(mockTransactions as any)
      prismaMock.screenTimeTransaction.count.mockResolvedValue(1)

      const request = new NextRequest(
        'http://localhost/api/screentime/history?memberId=child-1'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transactions).toEqual(mockTransactions)
      expect(prismaMock.screenTimeTransaction.findMany).toHaveBeenCalledWith({
        where: { memberId: 'child-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      })
    })

    it('should return 404 if member not found', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost/api/screentime/history?memberId=nonexistent'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Member not found')
    })

    it('should return 404 if member belongs to different family', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: 'different-family', // Different from session.user.familyId
      } as any)

      const request = new NextRequest(
        'http://localhost/api/screentime/history?memberId=child-1'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Member not found')
    })

    it('should support pagination', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.screenTimeTransaction.findMany.mockResolvedValue([])
      prismaMock.screenTimeTransaction.count.mockResolvedValue(100)

      const request = new NextRequest(
        'http://localhost/api/screentime/history?limit=20&offset=40'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.limit).toBe(20)
      expect(data.pagination.offset).toBe(40)
      expect(data.pagination.total).toBe(100)
      expect(data.pagination.hasMore).toBe(true)
      expect(prismaMock.screenTimeTransaction.findMany).toHaveBeenCalledWith({
        where: { memberId: 'child-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 40,
      })
    })

    it('should use default pagination values', async () => {
      const session = mockChildSession({ user: { id: 'child-1' } })
      auth.mockResolvedValue(session)

      prismaMock.screenTimeTransaction.findMany.mockResolvedValue([])
      prismaMock.screenTimeTransaction.count.mockResolvedValue(0)

      const request = new NextRequest('http://localhost/api/screentime/history')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.limit).toBe(50)
      expect(data.pagination.offset).toBe(0)
      expect(data.pagination.hasMore).toBe(false)
    })
  })
})
