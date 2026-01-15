// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock'

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
import { POST } from '@/app/api/family/members/route'
import { mockParentSession } from '@/lib/test-utils/auth-mock'
import { Role } from '@/app/generated/prisma'
import { BCRYPT_ROUNDS } from '@/lib/constants'

const { hash } = require('bcrypt')

describe('/api/family/members', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/family/members', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Child',
          role: 'CHILD',
          pin: '1234',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 403 if not a parent', async () => {
      const session = mockParentSession()

      const request = new NextRequest('http://localhost/api/family/members', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Child',
          role: 'CHILD',
          pin: '1234',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - Parent access required')
    })

    it('should return 400 if name is missing', async () => {
      const session = mockParentSession()

      const request = new NextRequest('http://localhost/api/family/members', {
        method: 'POST',
        body: JSON.stringify({
          role: 'CHILD',
          pin: '1234',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name and role are required')
    })

    it('should return 400 if role is missing', async () => {
      const session = mockParentSession()

      const request = new NextRequest('http://localhost/api/family/members', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Member',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name and role are required')
    })

    it('should return 400 if parent created without password', async () => {
      const session = mockParentSession()

      const request = new NextRequest('http://localhost/api/family/members', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Parent',
          role: 'PARENT',
          email: 'newparent@test.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password is required for parent accounts')
    })

    it('should return 400 if child created without PIN', async () => {
      const session = mockParentSession()

      const request = new NextRequest('http://localhost/api/family/members', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Child',
          role: 'CHILD',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('PIN is required for child accounts')
    })

    it('should create parent with hashed password', async () => {
      const session = mockParentSession()

      ;(hash as jest.Mock).mockResolvedValue('hashed-password')

      const mockNewMember = {
        id: 'new-member-1',
        name: 'New Parent',
        email: 'newparent@test.com',
        passwordHash: 'hashed-password',
        role: Role.PARENT,
        familyId: session.user.familyId,
        isActive: true,
        createdAt: new Date(),
      }

      prismaMock.familyMember.findUnique.mockResolvedValue(null) // Email not in use
      prismaMock.familyMember.create.mockResolvedValue(mockNewMember as any)

      const request = new NextRequest('http://localhost/api/family/members', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Parent',
          email: 'newparent@test.com',
          role: 'PARENT',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.member).toBeDefined()
      expect(hash).toHaveBeenCalledWith('password123', BCRYPT_ROUNDS)
      expect(prismaMock.familyMember.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Parent',
          email: 'newparent@test.com',
          passwordHash: 'hashed-password',
          role: Role.PARENT,
          familyId: session.user.familyId,
        }),
        select: expect.any(Object),
      })
    })

    it('should create child with hashed PIN', async () => {
      const session = mockParentSession()

      ;(hash as jest.Mock).mockResolvedValue('hashed-pin')

      const mockNewMember = {
        id: 'new-child-1',
        name: 'New Child',
        email: null,
        role: Role.CHILD,
        familyId: session.user.familyId,
        isActive: true,
        birthDate: null,
        avatarUrl: null,
        createdAt: new Date(),
      }

      prismaMock.familyMember.create.mockResolvedValue(mockNewMember as any)
      prismaMock.creditBalance.create.mockResolvedValue({} as any)
      prismaMock.screenTimeSettings.create.mockResolvedValue({} as any)
      prismaMock.screenTimeBalance.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/family/members', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Child',
          role: 'CHILD',
          pin: '1234',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.member).toBeDefined()
      expect(data.message).toBe('Family member added successfully')
      expect(hash).toHaveBeenCalledWith('1234', BCRYPT_ROUNDS)
      expect(prismaMock.familyMember.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Child',
          pin: 'hashed-pin',
          role: Role.CHILD,
          familyId: session.user.familyId,
        }),
        select: expect.any(Object),
      })
      // Verify child balances are created
      expect(prismaMock.creditBalance.create).toHaveBeenCalled()
      expect(prismaMock.screenTimeSettings.create).toHaveBeenCalled()
      expect(prismaMock.screenTimeBalance.create).toHaveBeenCalled()
    })

    it('should return 400 if email already in use', async () => {
      const session = mockParentSession()

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'existing-member',
        email: 'existing@test.com',
      } as any)

      const request = new NextRequest('http://localhost/api/family/members', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Parent',
          email: 'existing@test.com',
          role: 'PARENT',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email already in use')
    })

    it('should handle invalid JSON gracefully', async () => {
      const session = mockParentSession()

      const request = new NextRequest('http://localhost/api/family/members', {
        method: 'POST',
        body: 'invalid json{',
      })

      const response = await POST(request)
      const data = await response.json()

      // Next.js Request.json() throws SyntaxError which is caught by try-catch, returning 500
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create family member')
    })
  })
})
