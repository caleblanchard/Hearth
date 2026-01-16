// @ts-nocheck
import { jest } from '@jest/globals'

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
    from: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    select: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    insert: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    update: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    delete: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    upsert: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    eq: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    neq: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    gt: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    gte: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    lt: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    lte: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    like: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    ilike: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    is: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    in: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    contains: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    containedBy: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    rangeGt: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    rangeGte: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    rangeLt: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    rangeLte: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    rangeAdjacent: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    overlaps: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    textSearch: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    match: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    not: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    or: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    filter: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    order: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    limit: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    range: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    abortSignal: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    single: jest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    maybeSingle: jest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    csv: jest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    geojson: jest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    explain: jest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    rollback: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
    returns: jest.fn<() => SupabaseQueryBuilder>().mockReturnThis() as any,
  }

  // Default response for query chains
  Object.keys(queryBuilder).forEach((key) => {
    if (!['single', 'maybeSingle', 'csv', 'geojson', 'explain'].includes(key)) {
      (queryBuilder[key as keyof SupabaseQueryBuilder] as jest.Mock<any>).mockReturnValue(queryBuilder)
    }
  })

  const authMethods: SupabaseAuthMethods = {
    getUser: jest.fn<() => Promise<{ data: { user: any }; error: any }>>().mockResolvedValue({ data: { user: null }, error: null }) as any,
    getSession: jest.fn<() => Promise<{ data: { session: any }; error: any }>>().mockResolvedValue({ data: { session: null }, error: null }) as any,
    signUp: jest.fn<() => Promise<{ data: { user: any; session: any }; error: any }>>().mockResolvedValue({ data: { user: null, session: null }, error: null }) as any,
    signInWithPassword: jest.fn<() => Promise<{ data: { user: any; session: any }; error: any }>>().mockResolvedValue({ data: { user: null, session: null }, error: null }) as any,
    signInWithOAuth: jest.fn<() => Promise<{ data: { url: any }; error: any }>>().mockResolvedValue({ data: { url: null }, error: null }) as any,
    signOut: jest.fn<() => Promise<{ error: any }>>().mockResolvedValue({ error: null }) as any,
    resetPasswordForEmail: jest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    updateUser: jest.fn<() => Promise<{ data: { user: any }; error: any }>>().mockResolvedValue({ data: { user: null }, error: null }) as any,
    setSession: jest.fn<() => Promise<{ data: { session: any }; error: any }>>().mockResolvedValue({ data: { session: null }, error: null }) as any,
    refreshSession: jest.fn<() => Promise<{ data: { session: any }; error: any }>>().mockResolvedValue({ data: { session: null }, error: null }) as any,
    onAuthStateChange: jest.fn<() => { data: { subscription: { unsubscribe: jest.Mock } } }>().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }) as any,
  }

  const storageMethods: SupabaseStorageMethods = {
    from: jest.fn<() => SupabaseStorageMethods>().mockReturnThis() as any,
    list: jest.fn<() => Promise<{ data: any[]; error: any }>>().mockResolvedValue({ data: [], error: null }) as any,
    upload: jest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    download: jest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    getPublicUrl: jest.fn<() => { data: { publicUrl: string } }>().mockReturnValue({ data: { publicUrl: '' } }) as any,
    createSignedUrl: jest.fn<() => Promise<{ data: { signedUrl: string }; error: any }>>().mockResolvedValue({ data: { signedUrl: '' }, error: null }) as any,
    remove: jest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    move: jest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    copy: jest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
  }

  const client: MockSupabaseClient = {
    from: jest.fn<() => SupabaseQueryBuilder>().mockReturnValue(queryBuilder) as any,
    auth: authMethods,
    storage: storageMethods,
    rpc: jest.fn<() => Promise<{ data: any; error: any }>>().mockResolvedValue({ data: null, error: null }) as any,
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn().mockResolvedValue({ status: 'ok' } as any),
    }) as any,
    removeChannel: jest.fn<() => Promise<{ status: string }>>().mockResolvedValue({ status: 'ok' }) as any,
    removeAllChannels: jest.fn<() => Promise<any[]>>().mockResolvedValue([]) as any,
    getChannels: jest.fn<() => any[]>().mockReturnValue([]) as any,
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
