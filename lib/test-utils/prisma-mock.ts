import { PrismaClient } from '@/app/generated/prisma'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

export type MockPrisma = DeepMockProxy<PrismaClient>

export const prismaMock = mockDeep<PrismaClient>() as MockPrisma

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
  prisma: prismaMock,
}))

export function resetPrismaMock() {
  mockReset(prismaMock)
}
