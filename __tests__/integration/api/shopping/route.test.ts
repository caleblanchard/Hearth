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
import { GET } from '@/app/api/shopping/route'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'

const { auth } = require('@/lib/auth')

describe('/api/shopping', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return existing active shopping list', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const mockList = {
        id: 'list-1',
        name: 'Family Shopping List',
        familyId: session.user.familyId,
        isActive: true,
        items: [
          {
            id: 'item-1',
            name: 'Milk',
            status: 'PENDING',
            priority: 'NORMAL',
          },
        ],
      }

      prismaMock.shoppingList.findFirst.mockResolvedValue(mockList as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.list.id).toBe('list-1')
      expect(data.items).toEqual(mockList.items)
      expect(prismaMock.shoppingList.findFirst).toHaveBeenCalledWith({
        where: {
          familyId: session.user.familyId,
          isActive: true,
        },
        include: expect.objectContaining({
          items: expect.objectContaining({
            where: expect.any(Object),
            orderBy: expect.any(Array),
          }),
        }),
      })
    })

    it('should create shopping list if none exists', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.shoppingList.findFirst.mockResolvedValue(null)
      prismaMock.shoppingList.create.mockResolvedValue({
        id: 'new-list-1',
        name: 'Family Shopping List',
        familyId: session.user.familyId,
        isActive: true,
        items: [],
      } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.list.id).toBe('new-list-1')
      expect(prismaMock.shoppingList.create).toHaveBeenCalledWith({
        data: {
          familyId: session.user.familyId,
          name: 'Family Shopping List',
          isActive: true,
        },
        include: {
          items: true,
        },
      })
    })

    it('should filter items by status', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const mockList = {
        id: 'list-1',
        items: [
          { id: 'item-1', status: 'PENDING' },
          { id: 'item-2', status: 'IN_CART' },
          { id: 'item-3', status: 'PURCHASED' }, // Should be filtered out
        ],
      }

      prismaMock.shoppingList.findFirst.mockResolvedValue(mockList as any)

      await GET()

      expect(prismaMock.shoppingList.findFirst).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.objectContaining({
          items: expect.objectContaining({
            where: {
              status: {
                in: ['PENDING', 'IN_CART'],
              },
            },
          }),
        }),
      })
    })

    it('should calculate item counts', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const mockList = {
        id: 'list-1',
        name: 'Family Shopping List',
        items: [
          { id: 'item-1', priority: 'URGENT' },
          { id: 'item-2', priority: 'NORMAL' },
          { id: 'item-3', priority: 'URGENT' },
        ],
      }

      prismaMock.shoppingList.findFirst.mockResolvedValue(mockList as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.list.itemCount).toBe(3)
      expect(data.list.urgentCount).toBe(2)
    })
  })
})
