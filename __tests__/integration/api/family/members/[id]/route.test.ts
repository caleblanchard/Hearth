// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock'

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}))

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
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
import { PATCH, DELETE } from '@/app/api/family/members/[id]/route'
import { mockParentSession } from '@/lib/test-utils/auth-mock'
import { Role } from '@/app/generated/prisma'
import { BCRYPT_ROUNDS } from '@/lib/constants'

const { auth } = require('@/lib/auth')
const { hash } = require('bcrypt')

describe('/api/family/members/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('PATCH', () => {
    const memberId = 'member-1'
    const mockMember = {
      id: memberId,
      name: 'Test Member',
      email: 'test@test.com',
      role: Role.CHILD,
      familyId: 'family-1',
      isActive: true,
    }

    it('should return 403 if not a parent', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue({ ...session, user: { ...session.user, role: 'CHILD' } })

      const request = new NextRequest('http://localhost/api/family/members/123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      })

      const response = await PATCH(request, { params: { id: memberId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 404 if member not found', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/family/members/123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      })

      const response = await PATCH(request, { params: { id: memberId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Family member not found')
    })

    it('should return 404 if member belongs to different family', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        ...mockMember,
        familyId: session.user.familyId,
        familyId: 'different-family', // Different from session.user.familyId
      } as any)

      const request = new NextRequest('http://localhost/api/family/members/123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      })

      const response = await PATCH(request, { params: { id: memberId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Family member not found')
    })

    it('should return 400 if trying to deactivate self', async () => {
      const session = mockParentSession()
      // Set session user ID to match memberId
      const sessionWithMatchingId = {
        ...session,
        user: { ...session.user, id: memberId },
      }
      auth.mockResolvedValue(sessionWithMatchingId)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        ...mockMember,
        id: memberId,
        familyId: sessionWithMatchingId.user.familyId,
      } as any)

      const request = new NextRequest('http://localhost/api/family/members/123', {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      })

      const response = await PATCH(request, { params: { id: memberId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot deactivate your own account')
    })

    it('should return 400 if email already in use by another member', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique
        .mockResolvedValueOnce({
          ...mockMember,
          familyId: session.user.familyId,
        } as any) // First call for member lookup
        .mockResolvedValueOnce({
          id: 'other-member',
          email: 'existing@test.com',
          familyId: session.user.familyId,
        } as any) // Second call for email check

      const request = new NextRequest('http://localhost/api/family/members/123', {
        method: 'PATCH',
        body: JSON.stringify({ email: 'existing@test.com' }),
      })

      const response = await PATCH(request, { params: { id: memberId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email already in use')
    })

    it('should update member name', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        ...mockMember,
        familyId: session.user.familyId,
        familyId: session.user.familyId,
      } as any)
      prismaMock.familyMember.update.mockResolvedValue({
        ...mockMember,
        name: 'Updated Name',
      } as any)

      const request = new NextRequest('http://localhost/api/family/members/123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      })

      const response = await PATCH(request, { params: { id: memberId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.member.name).toBe('Updated Name')
      expect(prismaMock.familyMember.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { name: 'Updated Name' },
        select: expect.any(Object),
      })
    })

    it('should update parent password with hashing', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const parentMember = {
        ...mockMember,
        role: Role.PARENT,
        familyId: session.user.familyId,
      }

      ;(hash as jest.Mock).mockResolvedValue('new-hashed-password')

      prismaMock.familyMember.findUnique.mockResolvedValue(parentMember as any)
      prismaMock.familyMember.update.mockResolvedValue({
        ...parentMember,
        passwordHash: 'new-hashed-password',
      } as any)

      const request = new NextRequest('http://localhost/api/family/members/123', {
        method: 'PATCH',
        body: JSON.stringify({ password: 'newpassword123' }),
      })

      const response = await PATCH(request, { params: { id: memberId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(hash).toHaveBeenCalledWith('newpassword123', BCRYPT_ROUNDS)
      expect(prismaMock.familyMember.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { passwordHash: 'new-hashed-password' },
        select: expect.any(Object),
      })
    })

    it('should update child PIN with hashing', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      ;(hash as jest.Mock).mockResolvedValue('new-hashed-pin')

      prismaMock.familyMember.findUnique.mockResolvedValue({
        ...mockMember,
        familyId: session.user.familyId,
        familyId: session.user.familyId,
      } as any)
      prismaMock.familyMember.update.mockResolvedValue({
        ...mockMember,
        pin: 'new-hashed-pin',
      } as any)

      const request = new NextRequest('http://localhost/api/family/members/123', {
        method: 'PATCH',
        body: JSON.stringify({ pin: '5678' }),
      })

      const response = await PATCH(request, { params: { id: memberId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(hash).toHaveBeenCalledWith('5678', BCRYPT_ROUNDS)
      expect(prismaMock.familyMember.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { pin: 'new-hashed-pin' },
        select: expect.any(Object),
      })
    })

    it('should handle invalid JSON gracefully', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const request = new NextRequest('http://localhost/api/family/members/123', {
        method: 'PATCH',
        body: 'invalid json{',
      })

      const response = await PATCH(request, { params: { id: memberId } })
      const data = await response.json()

      // Next.js Request.json() throws SyntaxError which is caught by try-catch, returning 500
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update family member')
    })
  })

  describe('DELETE', () => {
    const memberId = 'member-1'
    const mockMember = {
      id: memberId,
      name: 'Test Member',
      role: Role.CHILD,
      familyId: 'family-1',
      isActive: true,
    }

    it('should return 403 if not a parent', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue({ ...session, user: { ...session.user, role: 'CHILD' } })

      const request = new NextRequest('http://localhost/api/family/members/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: memberId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 404 if member not found', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/family/members/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: memberId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Family member not found')
    })

    it('should return 400 if trying to delete self', async () => {
      const session = mockParentSession()
      // Set session user ID to match memberId
      const sessionWithMatchingId = {
        ...session,
        user: { ...session.user, id: memberId },
      }
      auth.mockResolvedValue(sessionWithMatchingId)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        ...mockMember,
        id: memberId,
        familyId: sessionWithMatchingId.user.familyId,
      } as any)

      const request = new NextRequest('http://localhost/api/family/members/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: memberId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot delete your own account')
    })

    it('should return 400 if trying to delete last parent', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const parentMember = {
        ...mockMember,
        role: Role.PARENT,
        familyId: session.user.familyId,
      }

      prismaMock.familyMember.findUnique.mockResolvedValue(parentMember as any)
      prismaMock.familyMember.count.mockResolvedValue(1) // Only one parent

      const request = new NextRequest('http://localhost/api/family/members/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: memberId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot delete the last parent account')
    })

    it('should deactivate child member', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      prismaMock.familyMember.findUnique.mockResolvedValue({
        ...mockMember,
        familyId: session.user.familyId,
        familyId: session.user.familyId,
      } as any)
      prismaMock.familyMember.update.mockResolvedValue({
        ...mockMember,
        isActive: false,
      } as any)

      const request = new NextRequest('http://localhost/api/family/members/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: memberId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Family member deactivated successfully')
      expect(prismaMock.familyMember.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { isActive: false },
      })
    })

    it('should deactivate parent if not last parent', async () => {
      const session = mockParentSession()
      auth.mockResolvedValue(session)

      const parentMember = {
        ...mockMember,
        role: Role.PARENT,
        familyId: session.user.familyId,
      }

      prismaMock.familyMember.findUnique.mockResolvedValue(parentMember as any)
      prismaMock.familyMember.count.mockResolvedValue(2) // Two parents
      prismaMock.familyMember.update.mockResolvedValue({
        ...parentMember,
        isActive: false,
      } as any)

      const request = new NextRequest('http://localhost/api/family/members/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: memberId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Family member deactivated successfully')
    })
  })
})
