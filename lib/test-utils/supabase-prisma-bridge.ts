import { prismaMock } from '@/lib/test-utils/prisma-mock'
import { getMockSession } from '@/lib/test-utils/auth-mock'

type Filter = {
  op: 'eq' | 'neq' | 'in' | 'gte' | 'lte' | 'gt' | 'lt' | 'ilike' | 'like' | 'is'
  column: string
  value: unknown
}

type OrderBy = {
  column: string
  ascending: boolean
}

type QueryState = {
  table: string
  action: 'select' | 'insert' | 'update' | 'delete' | 'upsert'
  data?: unknown
  filters: Filter[]
  orderBy: OrderBy[]
  limit?: number
  range?: { from: number; to: number }
  select?: string
  onConflict?: string | string[]
}

const RELATION_ALIAS_MAP: Record<string, string> = {
  added_by: 'addedBy',
  requested_by: 'requestedBy',
  purchased_by: 'purchasedBy',
  created_by: 'createdBy',
  screen_type: 'screenTimeType',
  screen_time_type: 'screenTimeType',
  screenTimeType: 'screenTimeType',
}

const TEST_SQL_TAG = (strings: TemplateStringsArray, ...values: unknown[]) =>
  strings.reduce((acc, part, index) => `${acc}${part}${values[index] ?? ''}`, '')

function snakeToCamel(value: string) {
  return value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

function singularize(value: string) {
  if (value.endsWith('ies')) return `${value.slice(0, -3)}y`
  if (value.endsWith('s')) return value.slice(0, -1)
  return value
}

function tableToModel(table: string) {
  const base = table.split('.').pop() || table
  const parts = base.split('_')
  const last = parts.pop() || base
  const singularLast = singularize(last)
  return snakeToCamel([...parts, singularLast].join('_'))
}

function toCamelCaseKeys<T extends Record<string, unknown>>(value: T) {
  const entries = Object.entries(value).map(([key, entryValue]) => [
    snakeToCamel(key),
    entryValue,
  ])
  return Object.fromEntries(entries)
}

function buildWhere(filters: Filter[]) {
  if (filters.length === 0) return undefined
  const where: Record<string, unknown> = {}

  for (const filter of filters) {
    const field = snakeToCamel(filter.column)
    switch (filter.op) {
      case 'eq':
        where[field] = filter.value
        break
      case 'neq':
        where[field] = { not: filter.value }
        break
      case 'in':
        where[field] = { in: filter.value }
        break
      case 'gte':
        where[field] = { gte: filter.value }
        break
      case 'lte':
        where[field] = { lte: filter.value }
        break
      case 'gt':
        where[field] = { gt: filter.value }
        break
      case 'lt':
        where[field] = { lt: filter.value }
        break
      case 'ilike': {
        const value = String(filter.value ?? '').replace(/%/g, '')
        where[field] = { contains: value, mode: 'insensitive' }
        break
      }
      case 'like': {
        const value = String(filter.value ?? '').replace(/%/g, '')
        where[field] = { contains: value }
        break
      }
      case 'is':
        where[field] = filter.value
        break
      default:
        break
    }
  }

  return where
}

function buildOrder(orderBy: OrderBy[]) {
  if (orderBy.length === 0) return undefined
  const mapped = orderBy.map((order) => ({
    [snakeToCamel(order.column)]: order.ascending ? 'asc' : 'desc',
  }))
  return mapped.length === 1 ? mapped[0] : mapped
}

function splitSelect(select?: string) {
  if (!select) return []
  const normalized = select.replace(/\s+/g, ' ').trim()
  if (!normalized) return []

  const tokens: string[] = []
  let depth = 0
  let current = ''

  for (const char of normalized) {
    if (char === '(') depth += 1
    if (char === ')') depth -= 1

    if (char === ',' && depth === 0) {
      if (current.trim()) tokens.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  if (current.trim()) tokens.push(current.trim())
  return tokens
}

function mapRelationAlias(alias: string) {
  return RELATION_ALIAS_MAP[alias] || snakeToCamel(alias)
}

function buildSelection(select?: string) {
  const tokens = splitSelect(select)
  if (tokens.length === 0) return {}

  const selectFields: Record<string, boolean> = {}
  const includeFields: Record<string, unknown> = {}

  for (const token of tokens) {
    if (token === '*' || token === '') continue

    const relationMatch = token.match(/^(.*?)\((.*)\)$/)
    if (relationMatch) {
      const rawRelation = relationMatch[1].split(':')[0].split('!')[0].trim()
      const relation = mapRelationAlias(rawRelation)
      const fields = relationMatch[2]
        .split(',')
        .map((field) => field.trim())
        .filter(Boolean)
      includeFields[relation] = {
        select: Object.fromEntries(
          fields.map((field) => [snakeToCamel(field), true])
        ),
      }
      continue
    }

    const field = token.split(':')[0].trim()
    if (!field) continue
    selectFields[snakeToCamel(field)] = true
  }

  if (Object.keys(includeFields).length > 0) {
    return { include: includeFields }
  }

  if (Object.keys(selectFields).length > 0) {
    return { select: selectFields }
  }

  return {}
}

function hasUniqueWhere(where?: Record<string, unknown>) {
  if (!where) return false
  return Object.prototype.hasOwnProperty.call(where, 'id')
}

async function executeQuery(state: QueryState, single: boolean) {
  const model = tableToModel(state.table)
  const prismaModel = (prismaMock as Record<string, any>)[model]

  if (!prismaModel) {
    return { data: single ? null : [], error: null }
  }

  const where = buildWhere(state.filters)
  const orderBy = buildOrder(state.orderBy)
  const selection = buildSelection(state.select)

  const pagination: Record<string, number> = {}
  if (state.range) {
    pagination.skip = state.range.from
    pagination.take = state.range.to - state.range.from + 1
  } else if (typeof state.limit === 'number') {
    pagination.take = state.limit
  }

  if (state.action === 'insert') {
    const data = Array.isArray(state.data) ? state.data : [state.data]
    if (Array.isArray(state.data)) {
      const result = await prismaModel.createMany({
        data: data.map((entry) => toCamelCaseKeys(entry as Record<string, unknown>)),
      })
      return { data: result, error: null }
    }

    const result = await prismaModel.create({
      data: toCamelCaseKeys((state.data || {}) as Record<string, unknown>),
    })
    return { data: result ?? null, error: null }
  }

  if (state.action === 'update') {
    const data = toCamelCaseKeys((state.data || {}) as Record<string, unknown>)
    if (hasUniqueWhere(where)) {
      const result = await prismaModel.update({ where, data })
      return { data: result ?? null, error: null }
    }

    const result = await prismaModel.updateMany({ where, data })
    return { data: result ?? null, error: null }
  }

  if (state.action === 'upsert') {
    const data = toCamelCaseKeys((state.data || {}) as Record<string, unknown>)
    const conflictFields = state.onConflict
      ? Array.isArray(state.onConflict)
        ? state.onConflict
        : state.onConflict.split(',')
      : []

    const conflictWhere =
      conflictFields.length > 0
        ? Object.fromEntries(
            conflictFields.map((field) => [
              snakeToCamel(field.trim()),
              data[snakeToCamel(field.trim()) as keyof typeof data],
            ])
          )
        : where || {}

    const result = await prismaModel.upsert({
      where: conflictWhere,
      update: data,
      create: data,
    })
    return { data: result ?? null, error: null }
  }

  if (state.action === 'delete') {
    if (hasUniqueWhere(where)) {
      const result = await prismaModel.delete({ where })
      return { data: result ?? null, error: null }
    }

    const result = await prismaModel.deleteMany({ where })
    return { data: result ?? null, error: null }
  }

  if (single) {
    const method = hasUniqueWhere(where) ? 'findUnique' : 'findFirst'
    const result = await prismaModel[method]({
      ...(where ? { where } : {}),
      ...(orderBy ? { orderBy } : {}),
      ...pagination,
      ...selection,
    })
    return { data: result ?? null, error: null }
  }

  const result = await prismaModel.findMany({
    ...(where ? { where } : {}),
    ...(orderBy ? { orderBy } : {}),
    ...pagination,
    ...selection,
  })
  return { data: result ?? [], error: null }
}

function createQueryBuilder(table: string) {
  const state: QueryState = {
    table,
    action: 'select',
    filters: [],
    orderBy: [],
  }

  const builder: Record<string, any> = {
    select: (select?: string) => {
      state.select = select
      return builder
    },
    insert: (data: unknown) => {
      state.action = 'insert'
      state.data = data
      return builder
    },
    update: (data: unknown) => {
      state.action = 'update'
      state.data = data
      return builder
    },
    upsert: (data: unknown, options?: { onConflict?: string | string[] }) => {
      state.action = 'upsert'
      state.data = data
      state.onConflict = options?.onConflict
      return builder
    },
    delete: () => {
      state.action = 'delete'
      return builder
    },
    eq: (column: string, value: unknown) => {
      state.filters.push({ op: 'eq', column, value })
      return builder
    },
    neq: (column: string, value: unknown) => {
      state.filters.push({ op: 'neq', column, value })
      return builder
    },
    in: (column: string, value: unknown) => {
      state.filters.push({ op: 'in', column, value })
      return builder
    },
    gte: (column: string, value: unknown) => {
      state.filters.push({ op: 'gte', column, value })
      return builder
    },
    lte: (column: string, value: unknown) => {
      state.filters.push({ op: 'lte', column, value })
      return builder
    },
    gt: (column: string, value: unknown) => {
      state.filters.push({ op: 'gt', column, value })
      return builder
    },
    lt: (column: string, value: unknown) => {
      state.filters.push({ op: 'lt', column, value })
      return builder
    },
    ilike: (column: string, value: unknown) => {
      state.filters.push({ op: 'ilike', column, value })
      return builder
    },
    like: (column: string, value: unknown) => {
      state.filters.push({ op: 'like', column, value })
      return builder
    },
    is: (column: string, value: unknown) => {
      state.filters.push({ op: 'is', column, value })
      return builder
    },
    order: (column: string, options?: { ascending?: boolean }) => {
      state.orderBy.push({ column, ascending: options?.ascending !== false })
      return builder
    },
    limit: (value: number) => {
      state.limit = value
      return builder
    },
    range: (from: number, to: number) => {
      state.range = { from, to }
      return builder
    },
    single: () => executeQuery(state, true),
    maybeSingle: () => executeQuery(state, true),
    then: (resolve: (value: unknown) => void, reject: (reason?: unknown) => void) =>
      executeQuery(state, false).then(resolve, reject),
  }

  return builder
}

export function createPrismaSupabaseClient() {
  const session = getMockSession()
  const user = session?.user ? { id: session.user.id } : null

  return {
    from: (table: string) => createQueryBuilder(table),
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      getSession: async () => ({ data: { session: session ?? null }, error: null }),
      signUp: async () => ({ data: { user: null, session: null }, error: null }),
      signInWithPassword: async () => ({ data: { user, session }, error: null }),
      signInWithOAuth: async () => ({ data: { url: null }, error: null }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ data: null, error: null }),
      updateUser: async () => ({ data: { user }, error: null }),
      setSession: async () => ({ data: { session }, error: null }),
      refreshSession: async () => ({ data: { session }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    storage: {
      from: () => ({
        list: async () => ({ data: [], error: null }),
        upload: async () => ({ data: null, error: null }),
        download: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        createSignedUrl: async () => ({ data: { signedUrl: '' }, error: null }),
        remove: async () => ({ data: null, error: null }),
        move: async () => ({ data: null, error: null }),
        copy: async () => ({ data: null, error: null }),
      }),
    },
    rpc: async () => ({ data: null, error: null }),
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
      subscribe: () => ({}),
      unsubscribe: async () => ({ status: 'ok' }),
    }),
    removeChannel: async () => ({ status: 'ok' }),
    removeAllChannels: async () => [],
    getChannels: () => [],
    sql: TEST_SQL_TAG,
  }
}
