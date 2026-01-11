import { jest } from '@jest/globals'

/**
 * Supabase Client Mock
 * 
 * Provides a comprehensive mock for the Supabase client that can be used in tests.
 * Supports chaining methods and customizable responses.
 */

export interface SupabaseQueryBuilder {
  from: jest.Mock
  select: jest.Mock
  insert: jest.Mock
  update: jest.Mock
  delete: jest.Mock
  upsert: jest.Mock
  eq: jest.Mock
  neq: jest.Mock
  gt: jest.Mock
  gte: jest.Mock
  lt: jest.Mock
  lte: jest.Mock
  like: jest.Mock
  ilike: jest.Mock
  is: jest.Mock
  in: jest.Mock
  contains: jest.Mock
  containedBy: jest.Mock
  rangeGt: jest.Mock
  rangeGte: jest.Mock
  rangeLt: jest.Mock
  rangeLte: jest.Mock
  rangeAdjacent: jest.Mock
  overlaps: jest.Mock
  textSearch: jest.Mock
  match: jest.Mock
  not: jest.Mock
  or: jest.Mock
  filter: jest.Mock
  order: jest.Mock
  limit: jest.Mock
  range: jest.Mock
  abortSignal: jest.Mock
  single: jest.Mock
  maybeSingle: jest.Mock
  csv: jest.Mock
  geojson: jest.Mock
  explain: jest.Mock
  rollback: jest.Mock
  returns: jest.Mock
}

export interface SupabaseAuthMethods {
  getUser: jest.Mock
  getSession: jest.Mock
  signUp: jest.Mock
  signInWithPassword: jest.Mock
  signInWithOAuth: jest.Mock
  signOut: jest.Mock
  resetPasswordForEmail: jest.Mock
  updateUser: jest.Mock
  setSession: jest.Mock
  refreshSession: jest.Mock
  onAuthStateChange: jest.Mock
}

export interface SupabaseStorageMethods {
  from: jest.Mock
  list: jest.Mock
  upload: jest.Mock
  download: jest.Mock
  getPublicUrl: jest.Mock
  createSignedUrl: jest.Mock
  remove: jest.Mock
  move: jest.Mock
  copy: jest.Mock
}

export interface MockSupabaseClient {
  from: jest.Mock
  auth: SupabaseAuthMethods
  storage: SupabaseStorageMethods
  rpc: jest.Mock
  channel: jest.Mock
  removeChannel: jest.Mock
  removeAllChannels: jest.Mock
  getChannels: jest.Mock
}

/**
 * Creates a mock Supabase client with chainable query builder
 */
export function createMockSupabaseClient(): MockSupabaseClient {
  const queryBuilder: SupabaseQueryBuilder = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    rangeGt: jest.fn().mockReturnThis(),
    rangeGte: jest.fn().mockReturnThis(),
    rangeLt: jest.fn().mockReturnThis(),
    rangeLte: jest.fn().mockReturnThis(),
    rangeAdjacent: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    csv: jest.fn().mockResolvedValue({ data: null, error: null }),
    geojson: jest.fn().mockResolvedValue({ data: null, error: null }),
    explain: jest.fn().mockResolvedValue({ data: null, error: null }),
    rollback: jest.fn().mockReturnThis(),
    returns: jest.fn().mockReturnThis(),
  }

  // Default response for query chains
  Object.keys(queryBuilder).forEach((key) => {
    if (!['single', 'maybeSingle', 'csv', 'geojson', 'explain'].includes(key)) {
      (queryBuilder[key as keyof SupabaseQueryBuilder] as jest.Mock).mockReturnValue(queryBuilder)
    }
  })

  const authMethods: SupabaseAuthMethods = {
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signUp: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signInWithOAuth: jest.fn().mockResolvedValue({ data: { url: null }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: jest.fn().mockResolvedValue({ data: null, error: null }),
    updateUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    setSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    refreshSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  }

  const storageMethods: SupabaseStorageMethods = {
    from: jest.fn().mockReturnThis(),
    list: jest.fn().mockResolvedValue({ data: [], error: null }),
    upload: jest.fn().mockResolvedValue({ data: null, error: null }),
    download: jest.fn().mockResolvedValue({ data: null, error: null }),
    getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: '' } }),
    createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: '' }, error: null }),
    remove: jest.fn().mockResolvedValue({ data: null, error: null }),
    move: jest.fn().mockResolvedValue({ data: null, error: null }),
    copy: jest.fn().mockResolvedValue({ data: null, error: null }),
  }

  const client: MockSupabaseClient = {
    from: jest.fn().mockReturnValue(queryBuilder),
    auth: authMethods,
    storage: storageMethods,
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn().mockResolvedValue({ status: 'ok' }),
    }),
    removeChannel: jest.fn().mockResolvedValue({ status: 'ok' }),
    removeAllChannels: jest.fn().mockResolvedValue([]),
    getChannels: jest.fn().mockReturnValue([]),
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
    select: jest.fn().mockResolvedValue({ data: Array.isArray(data) ? data : [data], error: null }),
  })
  return client
}

/**
 * Helper to mock successful UPDATE
 */
export function mockSupabaseUpdate<T>(client: MockSupabaseClient, data: T) {
  const queryBuilder = client.from('mock_table')
  queryBuilder.update.mockReturnValue({
    ...queryBuilder,
    select: jest.fn().mockResolvedValue({ data: Array.isArray(data) ? data : [data], error: null }),
  })
  return client
}

/**
 * Helper to mock successful DELETE
 */
export function mockSupabaseDelete(client: MockSupabaseClient) {
  const queryBuilder = client.from('mock_table')
  queryBuilder.delete.mockResolvedValue({ data: null, error: null })
  return client
}

/**
 * Helper to mock Supabase error
 */
export function mockSupabaseError(client: MockSupabaseClient, error: { message: string; code?: string }) {
  const queryBuilder = client.from('mock_table')
  const errorObj = { message: error.message, code: error.code || 'ERROR', details: '', hint: '' }
  
  // Mock error on terminal operations
  queryBuilder.select.mockResolvedValue({ data: null, error: errorObj })
  queryBuilder.single.mockResolvedValue({ data: null, error: errorObj })
  queryBuilder.maybeSingle.mockResolvedValue({ data: null, error: errorObj })
  
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
