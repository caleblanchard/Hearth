// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock'

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}))

// NOW import after mocks
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/financial/transactions/route'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'

const { auth } = require('@/lib/auth')

describe('/api/financial/transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  const mockTransactions = [
    {
      id: 'tx-1',
      memberId: 'child-1',
      type: 'BONUS',
      amount: 100,
      balanceAfter: 100,
      reason: 'Allowance',
      category: 'OTHER',
      createdAt: new Date('2025-01-05'),
    },
    {
      id: 'tx-2',
      memberId: 'child-1',
      type: 'DEDUCTION',
      amount: -50,
      balanceAfter: 50,
      reason: 'Reward redemption',
      category: 'REWARDS',
      createdAt: new Date('2025-01-10'),
    },
  ]

  it('should return 401 if not authenticated', async () => {
    auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/financial/transactions')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return transactions for authenticated user', async () => {
    const session = mockChildSession()
    auth.mockResolvedValue(session)

    prismaMock.creditTransaction.findMany.mockResolvedValue(mockTransactions as any)

    const request = new NextRequest('http://localhost/api/financial/transactions')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.transactions).toHaveLength(2)
  })

  it('should filter by memberId', async () => {
    const session = mockParentSession()
    auth.mockResolvedValue(session)

    prismaMock.creditTransaction.findMany.mockResolvedValue([mockTransactions[0]] as any)

    const request = new NextRequest(
      'http://localhost/api/financial/transactions?memberId=child-1'
    )
    const response = await GET(request)

    expect(prismaMock.creditTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          memberId: 'child-1',
        }),
      })
    )
  })

  it('should filter by type', async () => {
    auth.mockResolvedValue(mockChildSession())
    prismaMock.creditTransaction.findMany.mockResolvedValue([mockTransactions[0]] as any)

    const request = new NextRequest(
      'http://localhost/api/financial/transactions?type=BONUS'
    )
    const response = await GET(request)

    expect(prismaMock.creditTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'BONUS',
        }),
      })
    )
  })

  it('should filter by category', async () => {
    auth.mockResolvedValue(mockChildSession())
    prismaMock.creditTransaction.findMany.mockResolvedValue([mockTransactions[1]] as any)

    const request = new NextRequest(
      'http://localhost/api/financial/transactions?category=REWARDS'
    )
    const response = await GET(request)

    expect(prismaMock.creditTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: 'REWARDS',
        }),
      })
    )
  })

  it('should filter by date range', async () => {
    auth.mockResolvedValue(mockChildSession())
    prismaMock.creditTransaction.findMany.mockResolvedValue(mockTransactions as any)

    const request = new NextRequest(
      'http://localhost/api/financial/transactions?startDate=2025-01-01&endDate=2025-01-31'
    )
    const response = await GET(request)

    expect(prismaMock.creditTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        }),
      })
    )
  })

  it('should support pagination', async () => {
    auth.mockResolvedValue(mockChildSession())
    prismaMock.creditTransaction.findMany.mockResolvedValue(mockTransactions as any)
    prismaMock.creditTransaction.count.mockResolvedValue(50)

    const request = new NextRequest(
      'http://localhost/api/financial/transactions?page=2&limit=20'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(prismaMock.creditTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
      })
    )
    expect(data.pagination.total).toBe(50)
    expect(data.pagination.page).toBe(2)
  })

  it('should only show own transactions for child users', async () => {
    const session = mockChildSession()
    auth.mockResolvedValue(session)

    prismaMock.creditTransaction.findMany.mockResolvedValue(mockTransactions as any)

    const request = new NextRequest('http://localhost/api/financial/transactions')
    await GET(request)

    expect(prismaMock.creditTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          memberId: session.user.id,
        }),
      })
    )
  })

  it('should allow parents to view any family member transactions', async () => {
    const session = mockParentSession()
    auth.mockResolvedValue(session)

    prismaMock.creditTransaction.findMany.mockResolvedValue(mockTransactions as any)

    const request = new NextRequest(
      'http://localhost/api/financial/transactions?memberId=child-1'
    )
    await GET(request)

    expect(prismaMock.creditTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          memberId: 'child-1',
        }),
      })
    )
  })
})
