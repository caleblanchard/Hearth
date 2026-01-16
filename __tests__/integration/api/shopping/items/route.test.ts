// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock'

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
import { POST } from '@/app/api/shopping/items/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'

describe('/api/shopping/items', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('POST', () => {
    const validItemData = {
      name: 'Milk',
      category: 'DAIRY',
      quantity: 2,
      unit: 'gallons',
      priority: 'NORMAL',
      notes: 'Whole milk',
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/shopping/items', {
        method: 'POST',
        body: JSON.stringify(validItemData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if name is missing', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/shopping/items', {
        method: 'POST',
        body: JSON.stringify({
          ...validItemData,
          name: '',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Item name is required')
    })

    it('should return 400 if name is only whitespace', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/shopping/items', {
        method: 'POST',
        body: JSON.stringify({
          ...validItemData,
          name: '   ',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Item name is required')
    })

    it('should create item on existing shopping list', async () => {
      const session = mockChildSession()

      prismaMock.shoppingList.findFirst.mockResolvedValue({
        id: 'list-1',
        familyId: session.user.familyId,
        isActive: true,
      } as any)

      const mockCreatedItem = {
        id: 'item-1',
        listId: 'list-1',
        name: 'Milk',
        category: 'DAIRY',
        quantity: 2,
        unit: 'gallons',
        priority: 'NORMAL',
        status: 'PENDING',
        notes: 'Whole milk',
        requestedById: session.user.id,
        addedById: session.user.id,
      }

      prismaMock.shoppingItem.create.mockResolvedValue(mockCreatedItem as any)
      prismaMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/shopping/items', {
        method: 'POST',
        body: JSON.stringify(validItemData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.item).toBeDefined()
      expect(data.message).toBe('Item added to shopping list')
      expect(prismaMock.shoppingItem.create).toHaveBeenCalledWith({
        data: {
          listId: 'list-1',
          name: 'Milk',
          category: 'DAIRY',
          quantity: 2,
          unit: 'gallons',
          priority: 'NORMAL',
          status: 'PENDING',
          notes: 'Whole milk',
          requestedById: session.user.id,
          addedById: session.user.id,
        },
      })
    })

    it('should create shopping list if none exists', async () => {
      const session = mockChildSession()

      prismaMock.shoppingList.findFirst.mockResolvedValue(null)
      prismaMock.shoppingList.create.mockResolvedValue({
        id: 'new-list-1',
        familyId: session.user.familyId,
        isActive: true,
      } as any)

      prismaMock.shoppingItem.create.mockResolvedValue({
        id: 'item-1',
        listId: 'new-list-1',
        name: 'Milk',
      } as any)

      prismaMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/shopping/items', {
        method: 'POST',
        body: JSON.stringify(validItemData),
      })

      await POST(request)

      expect(prismaMock.shoppingList.create).toHaveBeenCalledWith({
        data: {
          familyId: session.user.familyId,
          name: 'Family Shopping List',
          isActive: true,
        },
      })
    })

    it('should use default values for optional fields', async () => {
      const session = mockChildSession()

      prismaMock.shoppingList.findFirst.mockResolvedValue({
        id: 'list-1',
        familyId: session.user.familyId,
      } as any)

      prismaMock.shoppingItem.create.mockResolvedValue({
        id: 'item-1',
        name: 'Bread',
      } as any)

      prismaMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/shopping/items', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Bread',
        }),
      })

      await POST(request)

      expect(prismaMock.shoppingItem.create).toHaveBeenCalledWith({
        data: {
          listId: 'list-1',
          name: 'Bread',
          category: null,
          quantity: 1,
          unit: null,
          priority: 'NORMAL',
          status: 'PENDING',
          notes: null,
          requestedById: session.user.id,
          addedById: session.user.id,
        },
      })
    })

    it('should trim item name', async () => {
      const session = mockChildSession()

      prismaMock.shoppingList.findFirst.mockResolvedValue({
        id: 'list-1',
        familyId: session.user.familyId,
      } as any)

      prismaMock.shoppingItem.create.mockResolvedValue({
        id: 'item-1',
        name: 'Trimmed Name',
      } as any)

      prismaMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/shopping/items', {
        method: 'POST',
        body: JSON.stringify({
          name: '  Trimmed Name  ',
        }),
      })

      await POST(request)

      expect(prismaMock.shoppingItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Trimmed Name',
        }),
      })
    })

    it('should create audit log', async () => {
      const session = mockChildSession()

      prismaMock.shoppingList.findFirst.mockResolvedValue({
        id: 'list-1',
        familyId: session.user.familyId,
      } as any)

      prismaMock.shoppingItem.create.mockResolvedValue({
        id: 'item-1',
        name: 'Milk',
      } as any)

      prismaMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/shopping/items', {
        method: 'POST',
        body: JSON.stringify(validItemData),
      })

      await POST(request)

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          familyId: session.user.familyId,
          memberId: session.user.id,
          action: 'SHOPPING_ITEM_ADDED',
          entityType: 'ShoppingItem',
          result: 'SUCCESS',
          metadata: expect.objectContaining({
            itemName: 'Milk',
            category: 'DAIRY',
            priority: 'NORMAL',
          }),
        }),
      })
    })
  })
})
