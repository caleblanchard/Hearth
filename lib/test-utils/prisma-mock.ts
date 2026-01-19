import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

export type MockPrisma = DeepMockProxy<any>

export const prismaMock: MockPrisma = mockDeep<any>() as MockPrisma

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
  prisma: prismaMock,
}))

export function resetPrismaMock() {
  mockReset(prismaMock)
}
