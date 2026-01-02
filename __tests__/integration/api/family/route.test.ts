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
import { GET, PATCH } from '@/app/api/family/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { Role } from '@/app/generated/prisma'

const { auth } = require('@/lib/auth')

describe('/api/family', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    const mockFamily = {
      id: 'family-1',
      name: 'Test Family',
      timezone: 'America/New_York',
      settings: {},
      members: [
        {
          id: 'parent-1',
          name: 'Parent One',
          email: 'parent@test.com',
          role: Role.PARENT,
          birthDate: null,
          avatarUrl: null,
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: 'child-1',
          name: 'Child One',
          email: null,
          role: Role.CHILD,
          birthDate: new Date('2010-01-01'),
          avatarUrl: null,
          isActive: true,
          createdAt: new Date(),
        },
      ],
    }

    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return family details for authenticated user', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.family.findUnique.mockResolvedValue(mockFamily as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.family).toEqual(mockFamily)

      expect(prismaMock.family.findUnique).toHaveBeenCalledWith({
        where: { id: session.user.familyId },
        include: {
          members: {
            orderBy: [
              { role: 'asc' },
              { name: 'asc' },
            ],
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              birthDate: true,
              avatarUrl: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
      })
    })

    it('should return 404 if family not found', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.family.findUnique.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Family not found')
    })

    it('should return 500 on error', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.family.findUnique.mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch family')
    })
  })

  describe('PATCH', () => {
    it('should return 403 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/family', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Family' }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/family', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Family' }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should update family settings successfully', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const mockUpdatedFamily = {
        id: session.user.familyId,
        name: 'Updated Family',
        timezone: 'America/Los_Angeles',
        settings: { theme: 'dark' },
      }

      prismaMock.family.update.mockResolvedValue(mockUpdatedFamily as any)

      const request = new NextRequest('http://localhost/api/family', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Updated Family',
          timezone: 'America/Los_Angeles',
          settings: { theme: 'dark' },
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.family).toEqual(mockUpdatedFamily)
      expect(data.message).toBe('Family settings updated successfully')

      expect(prismaMock.family.update).toHaveBeenCalledWith({
        where: { id: session.user.familyId },
        data: {
          name: 'Updated Family',
          timezone: 'America/Los_Angeles',
          settings: { theme: 'dark' },
        },
      })
    })

    it('should return 500 on error', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.family.update.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/family', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Family' }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update family')
    })
  })
})
