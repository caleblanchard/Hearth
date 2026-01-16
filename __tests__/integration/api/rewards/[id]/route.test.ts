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
import { PATCH, DELETE } from '@/app/api/rewards/[id]/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { RewardStatus } from '@/app/generated/prisma'

describe('/api/rewards/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('PATCH', () => {
    const rewardId = 'reward-1'
    const mockReward = {
      id: rewardId,
      familyId: 'family-1',
      name: 'Test Reward',
      status: RewardStatus.ACTIVE,
    }

    const mockUpdatedReward = {
      id: rewardId,
      familyId: 'family-1',
      name: 'Updated Reward',
      description: 'Updated description',
      status: RewardStatus.ACTIVE,
      createdBy: {
        id: 'parent-1',
        name: 'Parent One',
      },
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/rewards/123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Reward' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/rewards/123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Reward' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should return 404 if reward not found', async () => {
      const session = mockParentSession()

      prismaMock.rewardItem.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/rewards/123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Reward' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Reward not found')
    })

    it('should return 403 if reward belongs to different family', async () => {
      const session = mockParentSession()

      prismaMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        familyId: 'different-family',
      } as any)

      const request = new NextRequest('http://localhost/api/rewards/123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Reward' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should update reward successfully', async () => {
      const session = mockParentSession()

      prismaMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        familyId: session.user.familyId,
      } as any)
      prismaMock.rewardItem.update.mockResolvedValue(mockUpdatedReward as any)

      const request = new NextRequest('http://localhost/api/rewards/123', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Updated Reward',
          description: 'Updated description',
        }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.reward).toEqual(mockUpdatedReward)
      expect(data.message).toBe('Reward updated successfully')

      expect(prismaMock.rewardItem.findUnique).toHaveBeenCalledWith({
        where: { id: rewardId },
      })

      expect(prismaMock.rewardItem.update).toHaveBeenCalledWith({
        where: { id: rewardId },
        data: {
          name: 'Updated Reward',
          description: 'Updated description',
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()

      prismaMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        familyId: session.user.familyId,
      } as any)
      prismaMock.rewardItem.update.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/rewards/123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Reward' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update reward')
    })
  })

  describe('DELETE', () => {
    const rewardId = 'reward-1'
    const mockReward = {
      id: rewardId,
      familyId: 'family-1',
      name: 'Test Reward',
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/rewards/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/rewards/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should return 404 if reward not found', async () => {
      const session = mockParentSession()

      prismaMock.rewardItem.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/rewards/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Reward not found')
    })

    it('should return 403 if reward belongs to different family', async () => {
      const session = mockParentSession()

      prismaMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        familyId: 'different-family',
      } as any)

      const request = new NextRequest('http://localhost/api/rewards/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should delete reward successfully', async () => {
      const session = mockParentSession()

      prismaMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        familyId: session.user.familyId,
      } as any)
      prismaMock.rewardItem.delete.mockResolvedValue(mockReward as any)

      const request = new NextRequest('http://localhost/api/rewards/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Reward deleted successfully')

      expect(prismaMock.rewardItem.findUnique).toHaveBeenCalledWith({
        where: { id: rewardId },
      })

      expect(prismaMock.rewardItem.delete).toHaveBeenCalledWith({
        where: { id: rewardId },
      })
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()

      prismaMock.rewardItem.findUnique.mockResolvedValue({
        ...mockReward,
        familyId: session.user.familyId,
      } as any)
      prismaMock.rewardItem.delete.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/rewards/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: rewardId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete reward')
    })
  })
})
