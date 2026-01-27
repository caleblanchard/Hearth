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
import { GET } from '@/app/api/shopping/route'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'

describe('/api/shopping', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return existing active shopping list', async () => {
      const session = mockChildSession()

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

      dbMock.shoppingList.findFirst.mockResolvedValue(mockList as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.list.id).toBe('list-1')
      expect(data.items).toEqual(mockList.items)
      expect(dbMock.shoppingList.findFirst).toHaveBeenCalledWith({
        where: {
          familyId: session.user.familyId,
          isActive: true,
        },
        include: expect.objectContaining({
          items: expect.objectContaining({
            where: {
              status: {
                in: ['PENDING', 'IN_CART'],
              },
            },
            include: {
              addedBy: { select: { id: true, name: true } },
              purchasedBy: { select: { id: true, name: true } },
              requestedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
          }),
        }),
        orderBy: { createdAt: 'desc' },
        take: 1,
      })
    })

    it('should create shopping list if none exists', async () => {
      const session = mockChildSession()
      
      const mockList = {
        id: 'new-list-1',
        name: 'Family Shopping List',
        familyId: session.user.familyId,
        isActive: true,
        items: [],
      }

      // First call returns null (not found)
      // Second call (inside getOrCreate) returns null (not found) to trigger create
      // Third call returns the created list with items
      dbMock.shoppingList.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockList as any)
        
      dbMock.shoppingList.create.mockResolvedValue(mockList as any)
      dbMock.shoppingList.updateMany.mockResolvedValue({ count: 0 })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.list.id).toBe('new-list-1')
      expect(dbMock.shoppingList.create).toHaveBeenCalledWith({
        data: {
          familyId: session.user.familyId,
          name: 'Family Shopping List',
          isActive: true,
        },
      })
    })

    it('should filter items by status', async () => {
      const session = mockChildSession()

      const mockList = {
        id: 'list-1',
        items: [
          { id: 'item-1', status: 'PENDING' },
          { id: 'item-2', status: 'IN_CART' },
          { id: 'item-3', status: 'PURCHASED' }, // Should be filtered out
        ],
      }

      dbMock.shoppingList.findFirst.mockResolvedValue(mockList as any)

      await GET()

      expect(dbMock.shoppingList.findFirst).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.objectContaining({
          items: expect.objectContaining({
            where: {
              status: {
                in: ['PENDING', 'IN_CART'],
              },
            },
            include: {
              addedBy: { select: { id: true, name: true } },
              purchasedBy: { select: { id: true, name: true } },
              requestedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
          }),
        }),
        orderBy: { createdAt: 'desc' },
        take: 1,
      })
    })

    it('should calculate item counts', async () => {
      const session = mockChildSession()

      const mockList = {
        id: 'list-1',
        name: 'Family Shopping List',
        items: [
          { id: 'item-1', priority: 'URGENT' },
          { id: 'item-2', priority: 'NORMAL' },
          { id: 'item-3', priority: 'URGENT' },
        ],
      }

      dbMock.shoppingList.findFirst.mockResolvedValue(mockList as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.list.itemCount).toBe(3)
      expect(data.list.urgentCount).toBe(2)
    })
  })
})
