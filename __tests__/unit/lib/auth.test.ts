import { compare, hash } from 'bcrypt'
import { Role } from '@/app/generated/prisma'
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock'
import { config } from '@/lib/auth'

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}))

describe('lib/auth.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('Parent Login Provider', () => {
    const parentProvider = config.providers.find((p: any) => p.id === 'parent-login')
    const authorize = parentProvider?.authorize

    it('should return null if email is missing', async () => {
      const result = await authorize?.({
        email: undefined,
        password: 'password123',
      } as any)

      expect(result).toBeNull()
      expect(prismaMock.familyMember.findUnique).not.toHaveBeenCalled()
    })

    it('should return null if password is missing', async () => {
      const result = await authorize?.({
        email: 'parent@test.com',
        password: undefined,
      } as any)

      expect(result).toBeNull()
      expect(prismaMock.familyMember.findUnique).not.toHaveBeenCalled()
    })

    it('should return null if member not found', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(null)

      const result = await authorize?.({
        email: 'nonexistent@test.com',
        password: 'password123',
      } as any)

      expect(result).toBeNull()
      expect(prismaMock.familyMember.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@test.com' },
        include: { family: true },
      })
    })

    it('should return null if member has no password hash', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        email: 'parent@test.com',
        passwordHash: null,
        role: Role.PARENT,
        familyId: 'family-1',
        family: { id: 'family-1', name: 'Test Family' },
      } as any)

      const result = await authorize?.({
        email: 'parent@test.com',
        password: 'password123',
      } as any)

      expect(result).toBeNull()
    })

    it('should return null if member is not a parent', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        email: 'child@test.com',
        passwordHash: 'hashed-password',
        role: Role.CHILD,
        familyId: 'family-1',
        family: { id: 'family-1', name: 'Test Family' },
      } as any)

      const result = await authorize?.({
        email: 'child@test.com',
        password: 'password123',
      } as any)

      expect(result).toBeNull()
    })

    it('should return null if password is invalid', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        email: 'parent@test.com',
        passwordHash: 'hashed-password',
        role: Role.PARENT,
        name: 'Test Parent',
        familyId: 'family-1',
        family: { id: 'family-1', name: 'Test Family' },
      } as any)

      ;(compare as jest.Mock).mockResolvedValue(false)

      const result = await authorize?.({
        email: 'parent@test.com',
        password: 'wrong-password',
      } as any)

      expect(result).toBeNull()
      expect(compare).toHaveBeenCalledWith('wrong-password', 'hashed-password')
    })

    it('should authenticate valid parent credentials', async () => {
      const mockMember = {
        id: 'member-1',
        email: 'parent@test.com',
        passwordHash: 'hashed-password',
        role: Role.PARENT,
        name: 'Test Parent',
        familyId: 'family-1',
        family: { id: 'family-1', name: 'Test Family' },
      }

      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember as any)
      prismaMock.familyMember.update.mockResolvedValue({
        ...mockMember,
        lastLoginAt: new Date(),
      } as any)

      ;(compare as jest.Mock).mockResolvedValue(true)

      const result = await authorize?.({
        email: 'parent@test.com',
        password: 'password123',
      } as any)

      expect(result).toEqual({
        id: 'member-1',
        name: 'Test Parent',
        email: 'parent@test.com',
        role: Role.PARENT,
        familyId: 'family-1',
        familyName: 'Test Family',
      })
      expect(compare).toHaveBeenCalledWith('password123', 'hashed-password')
      expect(prismaMock.familyMember.update).toHaveBeenCalledWith({
        where: { id: 'member-1' },
        data: { lastLoginAt: expect.any(Date) },
      })
    })
  })

  describe('Child PIN Login Provider', () => {
    const childProvider = config.providers.find((p: any) => p.id === 'child-pin')
    const authorize = childProvider?.authorize

    it('should return null if PIN is missing', async () => {
      const result = await authorize?.({
        pin: undefined,
        memberId: 'child-1',
      } as any)

      expect(result).toBeNull()
    })

    it('should return null if memberId is missing', async () => {
      const result = await authorize?.({
        pin: '1234',
        memberId: undefined,
      } as any)

      expect(result).toBeNull()
    })

    it('should return null if member not found', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(null)

      const result = await authorize?.({
        pin: '1234',
        memberId: 'nonexistent',
      } as any)

      expect(result).toBeNull()
    })

    it('should return null if member has no PIN', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        pin: null,
        role: Role.CHILD,
        familyId: 'family-1',
        family: { id: 'family-1', name: 'Test Family' },
      } as any)

      const result = await authorize?.({
        pin: '1234',
        memberId: 'child-1',
      } as any)

      expect(result).toBeNull()
    })

    it('should return null if member is not a child', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'parent-1',
        pin: 'hashed-pin',
        role: Role.PARENT,
        familyId: 'family-1',
        family: { id: 'family-1', name: 'Test Family' },
      } as any)

      const result = await authorize?.({
        pin: '1234',
        memberId: 'parent-1',
      } as any)

      expect(result).toBeNull()
    })

    it('should return null if PIN is invalid', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        pin: 'hashed-pin',
        role: Role.CHILD,
        name: 'Test Child',
        familyId: 'family-1',
        family: { id: 'family-1', name: 'Test Family' },
      } as any)

      ;(compare as jest.Mock).mockResolvedValue(false)

      const result = await authorize?.({
        pin: 'wrong-pin',
        memberId: 'child-1',
      } as any)

      expect(result).toBeNull()
      expect(compare).toHaveBeenCalledWith('wrong-pin', 'hashed-pin')
    })

    it('should authenticate valid child PIN', async () => {
      const mockMember = {
        id: 'child-1',
        pin: 'hashed-pin',
        role: Role.CHILD,
        name: 'Test Child',
        email: null,
        familyId: 'family-1',
        family: { id: 'family-1', name: 'Test Family' },
      }

      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember as any)
      prismaMock.familyMember.update.mockResolvedValue({
        ...mockMember,
        lastLoginAt: new Date(),
      } as any)

      ;(compare as jest.Mock).mockResolvedValue(true)

      const result = await authorize?.({
        pin: '1234',
        memberId: 'child-1',
      } as any)

      expect(result).toEqual({
        id: 'child-1',
        name: 'Test Child',
        email: null,
        role: Role.CHILD,
        familyId: 'family-1',
        familyName: 'Test Family',
      })
      expect(compare).toHaveBeenCalledWith('1234', 'hashed-pin')
      expect(prismaMock.familyMember.update).toHaveBeenCalledWith({
        where: { id: 'child-1' },
        data: { lastLoginAt: expect.any(Date) },
      })
    })
  })

  describe('JWT Callbacks', () => {
    const jwtCallback = config.callbacks?.jwt

    it('should add user data to token on first call', async () => {
      const user = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@test.com',
        role: Role.PARENT,
        familyId: 'family-1',
        familyName: 'Test Family',
      }

      const result = await jwtCallback?.({ token: {}, user } as any)

      expect(result).toEqual({
        id: 'user-1',
        role: Role.PARENT,
        familyId: 'family-1',
        familyName: 'Test Family',
      })
    })

    it('should preserve token data on subsequent calls', async () => {
      const token = {
        id: 'user-1',
        role: Role.PARENT,
        familyId: 'family-1',
        familyName: 'Test Family',
      }

      const result = await jwtCallback?.({ token, user: undefined } as any)

      expect(result).toEqual(token)
    })
  })

  describe('Session Callbacks', () => {
    const sessionCallback = config.callbacks?.session

    it('should add user data to session from token', async () => {
      const token = {
        id: 'user-1',
        role: Role.PARENT,
        familyId: 'family-1',
        familyName: 'Test Family',
      }

      const session = {
        user: {
          name: 'Test User',
          email: 'test@test.com',
        },
      }

      const result = await sessionCallback?.({ session, token } as any)

      expect(result?.user).toEqual({
        name: 'Test User',
        email: 'test@test.com',
        id: 'user-1',
        role: Role.PARENT,
        familyId: 'family-1',
        familyName: 'Test Family',
      })
    })

    it('should handle missing token gracefully', async () => {
      const session = {
        user: {
          name: 'Test User',
          email: 'test@test.com',
        },
      }

      const result = await sessionCallback?.({ session, token: {} } as any)

      expect(result?.user).toEqual({
        name: 'Test User',
        email: 'test@test.com',
        id: undefined,
        role: undefined,
        familyId: undefined,
        familyName: undefined,
      })
    })
  })
})
