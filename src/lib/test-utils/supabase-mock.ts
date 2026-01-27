// @ts-nocheck
// Ensure we reuse the already-declared global jest to avoid redeclaration errors in Jest runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let jestLocal: any = (globalThis as any).jest

if (!jestLocal || typeof jestLocal.fn !== 'function') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    jestLocal = require('@jest/globals').jest
  } catch {
    jestLocal = undefined
  }
}

if (!jestLocal || typeof jestLocal.fn !== 'function') {
  const fallbackFn = () => {
    const mockFn: any = (...args: any[]) => {
      mockFn.mock.calls.push(args)
      return mockFn.mockReturnValueValue
    }
    mockFn.mock = { calls: [] }
    mockFn.mockReturnValue = (v: any) => {
      mockFn.mockReturnValueValue = v
      return mockFn
    }
    mockFn.mockResolvedValue = (v: any) => {
      mockFn.mockReturnValueValue = Promise.resolve(v)
      return mockFn
    }
    mockFn.mockReturnThis = () => mockFn
    return mockFn
  }
  jestLocal = { fn: fallbackFn }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockJest: any = jestLocal

/**
 * Supabase Client Mock
 *
 * Provides a comprehensive mock for the Supabase client that can be used in tests.
 * Supports chaining methods and customizable responses.
 */

export interface SupabaseQueryBuilder {
  from: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  select: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  insert: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  update: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  delete: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  upsert: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  eq: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  neq: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  gt: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  gte: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  lt: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  lte: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  like: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  ilike: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  is: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  in: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  contains: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  containedBy: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  rangeGt: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  rangeGte: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  rangeLt: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  rangeLte: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  rangeAdjacent: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  overlaps: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  textSearch: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  match: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  not: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  or: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  filter: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  order: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  limit: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  range: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  abortSignal: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  single: jest.Mock<(...args: any[]) => Promise<{ data: any; error: any }>>
  maybeSingle: jest.Mock<(...args: any[]) => Promise<{ data: any; error: any }>>
  csv: jest.Mock<(...args: any[]) => Promise<{ data: any; error: any }>>
  geojson: jest.Mock<(...args: any[]) => Promise<{ data: any; error: any }>>
  explain: jest.Mock<(...args: any[]) => Promise<{ data: any; error: any }>>
  rollback: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  returns: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
}

export interface SupabaseAuthMethods {
  getUser: jest.Mock<(...args: any[]) => Promise<{ data: { user: any }; error: any }>>
  getSession: jest.Mock<(...args: any[]) => Promise<{ data: { session: any }; error: any }>>
  signUp: jest.Mock<(...args: any[]) => Promise<{ data: { user: any; session: any }; error: any }>>
  signInWithPassword: jest.Mock<(...args: any[]) => Promise<{ data: { user: any; session: any }; error: any }>>
  signInWithOAuth: jest.Mock<(...args: any[]) => Promise<{ data: { url: any }; error: any }>>
  signOut: jest.Mock<(...args: any[]) => Promise<{ error: any }>>
  resetPasswordForEmail: jest.Mock<(...args: any[]) => Promise<{ data: any; error: any }>>
  updateUser: jest.Mock<(...args: any[]) => Promise<{ data: { user: any }; error: any }>>
  setSession: jest.Mock<(...args: any[]) => Promise<{ data: { session: any }; error: any }>>
  refreshSession: jest.Mock<(...args: any[]) => Promise<{ data: { session: any }; error: any }>>
  onAuthStateChange: jest.Mock<(...args: any[]) => { data: { subscription: { unsubscribe: jest.Mock } } }>
}

export interface SupabaseStorageMethods {
  from: jest.Mock<(...args: any[]) => SupabaseStorageMethods>
  list: jest.Mock<(...args: any[]) => Promise<{ data: any[]; error: any }>>
  upload: jest.Mock<(...args: any[]) => Promise<{ data: any; error: any }>>
  download: jest.Mock<(...args: any[]) => Promise<{ data: any; error: any }>>
  getPublicUrl: jest.Mock<(...args: any[]) => { data: { publicUrl: string } }>
  createSignedUrl: jest.Mock<(...args: any[]) => Promise<{ data: { signedUrl: string }; error: any }>>
  remove: jest.Mock<(...args: any[]) => Promise<{ data: any; error: any }>>
  move: jest.Mock<(...args: any[]) => Promise<{ data: any; error: any }>>
  copy: jest.Mock<(...args: any[]) => Promise<{ data: any; error: any }>>
}

export interface MockSupabaseClient {
  from: jest.Mock<(...args: any[]) => SupabaseQueryBuilder>
  auth: SupabaseAuthMethods
  storage: SupabaseStorageMethods
  rpc: jest.Mock<(...args: any[]) => Promise<{ data: any; error: any }>>
  channel: jest.Mock<(...args: any[]) => any>
  removeChannel: jest.Mock<(...args: any[]) => Promise<{ status: string }>>
  removeAllChannels: jest.Mock<(...args: any[]) => Promise<any[]>>
  getChannels: jest.Mock<(...args: any[]) => any[]>
}

/**
 * Creates a mock Supabase client with chainable query builder
 */
export function createMockSupabaseClient(): MockSupabaseClient {
  const queryBuilder: SupabaseQueryBuilder = {
    from: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    select: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    insert: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    update: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    delete: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    upsert: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    eq: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    neq: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    gt: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    gte: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    lt: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    lte: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    like: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    ilike: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    is: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    in: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    contains: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    containedBy: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    rangeGt: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    rangeGte: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    rangeLt: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    rangeLte: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    rangeAdjacent: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    overlaps: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    textSearch: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    match: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    not: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    or: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    filter: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    order: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    limit: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    range: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    abortSignal: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    single: mockJest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    maybeSingle: mockJest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    csv: mockJest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    geojson: mockJest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    explain: mockJest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    rollback: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    returns: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
  }

  // Default response for query chains
  Object.keys(queryBuilder).forEach((key) => {
    if (!['single', 'maybeSingle', 'csv', 'geojson', 'explain'].includes(key)) {
      (queryBuilder[key as keyof SupabaseQueryBuilder] as jest.Mock<any>).mockReturnValue(queryBuilder)
    }
  })

  const authMethods: SupabaseAuthMethods = {
    getUser: mockJest.fn<() => Promise<{ data: { user: any }; error: any }>>().mockResolvedValue({ data: { user: null }, error: null }) as any,
    getSession: mockJest.fn<() => Promise<{ data: { session: any }; error: any }>>().mockResolvedValue({ data: { session: null }, error: null }) as any,
    signUp: mockJest.fn<() => Promise<{ data: { user: any; session: any }; error: any }>>().mockResolvedValue({ data: { user: null, session: null }, error: null }) as any,
    signInWithPassword: mockJest.fn<() => Promise<{ data: { user: any; session: any }; error: any }>>().mockResolvedValue({ data: { user: null, session: null }, error: null }) as any,
    signInWithOAuth: mockJest.fn<() => Promise<{ data: { url: any }; error: any }>>().mockResolvedValue({ data: { url: null }, error: null }) as any,
    signOut: mockJest.fn<() => Promise<{ error: any }>>().mockResolvedValue({ error: null }) as any,
    resetPasswordForEmail: mockJest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    updateUser: mockJest.fn<() => Promise<{ data: { user: any }; error: any }>>().mockResolvedValue({ data: { user: null }, error: null }) as any,
    setSession: mockJest.fn<() => Promise<{ data: { session: any }; error: any }>>().mockResolvedValue({ data: { session: null }, error: null }) as any,
    refreshSession: mockJest.fn<() => Promise<{ data: { session: any }; error: any }>>().mockResolvedValue({ data: { session: null }, error: null }) as any,
    onAuthStateChange: mockJest.fn<() => { data: { subscription: { unsubscribe: jest.Mock } } }>().mockReturnValue({ data: { subscription: { unsubscribe: mockJest.fn() } } }) as any,
  }

  const storageMethods: SupabaseStorageMethods = {
    from: mockJest.fn<() => SupabaseStorageMethods>().mockReturnThis() as any,
    list: mockJest.fn<() => Promise<{ data: any[]; error: any }>>().mockResolvedValue({ data: [], error: null }) as any,
    upload: mockJest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    download: mockJest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    getPublicUrl: mockJest.fn<() => { data: { publicUrl: string } }>().mockReturnValue({ data: { publicUrl: '' } }) as any,
    createSignedUrl: mockJest.fn<() => Promise<{ data: { signedUrl: string }; error: any }>>().mockResolvedValue({ data: { signedUrl: '' }, error: null }) as any,
    remove: mockJest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    move: mockJest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    copy: mockJest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
  }

  const client: MockSupabaseClient = {
    from: mockJest.fn<() => SupabaseQueryBuilder>().mockReturnValue(queryBuilder) as any,
    auth: authMethods,
    storage: storageMethods,
    rpc: mockJest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    channel: mockJest.fn().mockReturnValue({
      on: mockJest.fn().mockReturnThis(),
      subscribe: mockJest.fn().mockReturnThis(),
      unsubscribe: mockJest.fn().mockResolvedValue({ status: 'ok' } as any),
    }) as any,
    removeChannel: mockJest.fn<() => Promise<{ status: string }>>().mockResolvedValue({ status: 'ok' }) as any,
    removeAllChannels: mockJest.fn<() => Promise<any[]>>().mockResolvedValue([]) as any,
    getChannels: mockJest.fn<() => any[]>().mockReturnValue([]) as any,
  }

  return client
}

/**
 * Helper to mock successful SELECT query
 */
export function mockSupabaseSelect<T>(client: MockSupabaseClient, data: T[]) {
  const queryBuilder = client.from('mock_table')
  // Return the query builder to allow chaining
  queryBuilder.select.mockReturnValue({
    ...queryBuilder,
    // But have the promise resolve with data
    then: (resolve: any) => resolve({ data, error: null }),
  } as any)
  return client
}

/**
 * Helper to mock successful SELECT with single()
 */
export function mockSupabaseSingle<T>(client: MockSupabaseClient, data: T | null) {
  const queryBuilder = client.from('mock_table')
  queryBuilder.single.mockResolvedValue({ data, error: null })
  return client
}

/**
 * Helper to mock successful INSERT
 */
export function mockSupabaseInsert<T>(client: MockSupabaseClient, data: T) {
  const queryBuilder = client.from('mock_table')
  queryBuilder.insert.mockReturnValue({
    ...queryBuilder,
    select: jest.fn().mockResolvedValue({ data: Array.isArray(data) ? data : [data], error: null } as any),
  } as any)
  return client
}

/**
 * Helper to mock successful UPDATE
 */
export function mockSupabaseUpdate<T>(client: MockSupabaseClient, data: T) {
  const queryBuilder = client.from('mock_table')
  queryBuilder.update.mockReturnValue({
    ...queryBuilder,
    select: jest.fn().mockResolvedValue({ data: Array.isArray(data) ? data : [data], error: null } as any),
  } as any)
  return client
}

/**
 * Helper to mock successful DELETE
 */
export function mockSupabaseDelete(client: MockSupabaseClient) {
  const queryBuilder = client.from('mock_table')
  queryBuilder.delete.mockResolvedValue({ data: null, error: null } as any)
  return client
}

/**
 * Helper to mock Supabase error
 */
export function mockSupabaseError(client: MockSupabaseClient, error: { message: string; code?: string }) {
  const queryBuilder = client.from('mock_table')
  const errorObj = { message: error.message, code: error.code || 'ERROR', details: '', hint: '' }
  
  // Mock error on terminal operations
  queryBuilder.select.mockResolvedValue({ data: null, error: errorObj } as any)
  queryBuilder.single.mockResolvedValue({ data: null, error: errorObj } as any)
  queryBuilder.maybeSingle.mockResolvedValue({ data: null, error: errorObj } as any)
  
  return client
}

/**
 * Helper to mock RPC call
 */
export function mockSupabaseRpc<T>(client: MockSupabaseClient, functionName: string, data: T) {
  client.rpc.mockImplementation((name: string) => {
    if (name === functionName) {
      return Promise.resolve({ data, error: null })
    }
    return Promise.resolve({ data: null, error: null })
  })
  return client
}

/**
 * Reset all mocks on a Supabase client
 */
export function resetSupabaseMocks(client: MockSupabaseClient) {
  jest.clearAllMocks()
}
