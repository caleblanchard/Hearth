import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

export type MockDb = DeepMockProxy<any>

export const dbMock: MockDb = mockDeep<any>() as MockDb

export function resetDbMock() {
  mockReset(dbMock)
}
