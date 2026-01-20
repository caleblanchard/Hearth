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
import { PATCH, DELETE } from '@/app/api/shopping/items/[id]/route'
import { mockChildSession } from '@/lib/test-utils/auth-mock'

describe('/api/shopping/items/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  describe('PATCH', () => {
    const itemId = 'item-1'
    const mockItem = {
      id: itemId,
      name: 'Milk',
      status: 'PENDING',
      list: {
        id: 'list-1',
        familyId: 'family-1',
      },
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/shopping/items/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_CART' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: itemId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if item not found', async () => {
      const session = mockChildSession()

      dbMock.shoppingItem.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/shopping/items/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_CART' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: itemId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Item not found')
    })

    it('should return 403 if item belongs to different family', async () => {
      const session = mockChildSession()

      dbMock.shoppingItem.findUnique.mockResolvedValue({
        ...mockItem,
        list: {
          familyId: 'family-2', // Different family
        },
      } as any)

      const request = new NextRequest('http://localhost/api/shopping/items/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_CART' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: itemId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should update item successfully', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1', id: 'user-1' } })

      dbMock.shoppingItem.findUnique.mockResolvedValue(mockItem as any)
      dbMock.shoppingItem.update.mockResolvedValue({
        ...mockItem,
        status: 'IN_CART',
      } as any)

      const request = new NextRequest('http://localhost/api/shopping/items/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_CART' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: itemId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.item.status).toBe('IN_CART')
      expect(dbMock.shoppingItem.update).toHaveBeenCalledWith({
        where: { id: itemId },
        data: {
          status: 'IN_CART',
          purchasedAt: null,
          purchasedById: null,
        },
      })
    })

    it('should set purchasedAt and purchasedById when status is PURCHASED', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1', id: 'user-1' } })

      dbMock.shoppingItem.findUnique.mockResolvedValue(mockItem as any)
      dbMock.shoppingItem.update.mockResolvedValue({
        ...mockItem,
        status: 'PURCHASED',
        purchasedAt: new Date(),
        purchasedById: 'user-1',
      } as any)

      const request = new NextRequest('http://localhost/api/shopping/items/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PURCHASED' }),
      })

      await PATCH(request, { params: Promise.resolve({ id: itemId }) })

      expect(dbMock.shoppingItem.update).toHaveBeenCalledWith({
        where: { id: itemId },
        data: {
          status: 'PURCHASED',
          purchasedAt: expect.any(Date),
          purchasedById: 'user-1',
        },
      })
    })

    it('should create audit log when status changes', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1', id: 'user-1' } })

      dbMock.shoppingItem.findUnique.mockResolvedValue(mockItem as any)
      dbMock.shoppingItem.update.mockResolvedValue({
        ...mockItem,
        status: 'IN_CART',
      } as any)

      dbMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/shopping/items/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_CART' }),
      })

      await PATCH(request, { params: Promise.resolve({ id: itemId }) })

      expect(dbMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          familyId: 'family-1',
          memberId: 'user-1',
          action: 'SHOPPING_ITEM_UPDATED',
          entityType: 'ShoppingItem',
          entityId: itemId,
          result: 'SUCCESS',
          metadata: expect.objectContaining({
            itemName: 'Milk',
            oldStatus: 'PENDING',
            newStatus: 'IN_CART',
          }),
        }),
      })
    })

    it('should not create audit log if status does not change', async () => {
      const session = mockChildSession()

      dbMock.shoppingItem.findUnique.mockResolvedValue(mockItem as any)
      dbMock.shoppingItem.update.mockResolvedValue(mockItem as any)

      const request = new NextRequest('http://localhost/api/shopping/items/123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      })

      await PATCH(request, { params: Promise.resolve({ id: itemId }) })

      expect(dbMock.auditLog.create).not.toHaveBeenCalled()
    })
  })

  describe('DELETE', () => {
    const itemId = 'item-1'
    const mockItem = {
      id: itemId,
      name: 'Milk',
      list: {
        id: 'list-1',
        familyId: 'family-1',
      },
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/shopping/items/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: itemId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if item not found', async () => {
      const session = mockChildSession()

      dbMock.shoppingItem.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/shopping/items/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: itemId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Item not found')
    })

    it('should return 403 if item belongs to different family', async () => {
      const session = mockChildSession()

      dbMock.shoppingItem.findUnique.mockResolvedValue({
        ...mockItem,
        list: {
          familyId: 'family-2',
        },
      } as any)

      const request = new NextRequest('http://localhost/api/shopping/items/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: itemId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should delete item successfully', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1', id: 'user-1' } })

      dbMock.shoppingItem.findUnique.mockResolvedValue(mockItem as any)
      dbMock.shoppingItem.delete.mockResolvedValue(mockItem as any)
      dbMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/shopping/items/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: itemId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Item removed from shopping list')
      expect(dbMock.shoppingItem.delete).toHaveBeenCalledWith({
        where: { id: itemId },
      })
    })

    it('should create audit log on delete', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1', id: 'user-1' } })

      dbMock.shoppingItem.findUnique.mockResolvedValue(mockItem as any)
      dbMock.shoppingItem.delete.mockResolvedValue(mockItem as any)
      dbMock.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/shopping/items/123', {
        method: 'DELETE',
      })

      await DELETE(request, { params: Promise.resolve({ id: itemId }) })

      expect(dbMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          familyId: 'family-1',
          memberId: 'user-1',
          action: 'SHOPPING_ITEM_DELETED',
          entityType: 'ShoppingItem',
          entityId: itemId,
          result: 'SUCCESS',
          metadata: expect.objectContaining({
            itemName: 'Milk',
          }),
        }),
      })
    })
  })
})
