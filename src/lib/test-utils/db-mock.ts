import type { DeepMockProxy } from 'jest-mock-extended'

export type MockDb = DeepMockProxy<any>

const globalDbMockKey = Symbol.for('hearth.test-utils.db-mock')

const isTestEnv =
  process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined

const jestAvailable = () =>
  typeof (globalThis as any).jest !== 'undefined' &&
  typeof (globalThis as any).jest.fn === 'function'

function createJestMockDb(): MockDb {
  const { mockDeep, mockReset } = require('jest-mock-extended')
  const dbMock = mockDeep() as MockDb
  const resetDbMock = () => mockReset(dbMock)
  return Object.assign(dbMock, { __resetDbMock: resetDbMock })
}

function createNoopMockDb(): MockDb {
  const noop = () => {
    throw new Error('dbMock is only available in test environment')
  }

  const proxy = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === '__resetDbMock') return () => {}
        return new Proxy(noop, {
          get: () => noop,
        })
      },
    }
  )

  return proxy as MockDb
}

function getDbMock(): MockDb {
  const globalStore = globalThis as unknown as Record<symbol, MockDb | undefined>
  if (!globalStore[globalDbMockKey]) {
    globalStore[globalDbMockKey] =
      isTestEnv || jestAvailable() ? createJestMockDb() : createNoopMockDb()
  }
  return globalStore[globalDbMockKey] as MockDb
}

export const dbMock: MockDb = getDbMock()

export function resetDbMock() {
  const reset = (dbMock as any).__resetDbMock
  if (typeof reset === 'function') reset()
}
