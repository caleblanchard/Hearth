import { dbMock } from '@/lib/test-utils/db-mock'
import { getMockSession } from '@/lib/test-utils/auth-mock'

type Filter = {
  op:
    | 'eq'
    | 'neq'
    | 'in'
    | 'gte'
    | 'lte'
    | 'gt'
    | 'lt'
    | 'ilike'
    | 'like'
    | 'is'
    | 'contains'
    | 'not'
  column: string
  value: unknown
  modifier?: string
}

type OrderBy = {
  column: string
  ascending: boolean
  foreignTable?: string
}

type QueryState = {
  table: string
  action: 'select' | 'insert' | 'update' | 'delete' | 'upsert'
  data?: unknown
  filters: Filter[]
  orderBy: OrderBy[]
  orFilters: string[]
  relationOrders: Record<string, OrderBy[]>
  relationLimits: Record<string, number>
  limit?: number
  range?: { from: number; to: number }
  select?: string
  onConflict?: string | string[]
  count?: string
  head?: boolean
}

const RELATION_ALIAS_MAP: Record<string, string> = {
  added_by: 'addedBy',
  requested_by: 'requestedBy',
  purchased_by: 'purchasedBy',
  created_by: 'createdBy',
  assigned_to: 'assignedTo',
  approved_by: 'approvedBy',
  uploaded_by: 'uploader',
  uploaded_by_member: 'uploader',
  screen_type: 'screenTimeType',
  screen_time_type: 'screenTimeType',
  screenTimeType: 'screenTimeType',
}

const TABLE_MODEL_OVERRIDES: Record<string, string> = {
  screen_time_settings: 'screenTimeSettings',
  sick_mode_settings: 'sickModeSettings',
  meal_plan_dishes: 'mealPlanDish',
  chore_completions: 'choreInstance',
  screen_time_grace_settings: 'screenTimeGraceSettings', // Add this override
  grace_period_logs: 'gracePeriodLog', // Add this override
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
  if (TABLE_MODEL_OVERRIDES[base]) {
    return TABLE_MODEL_OVERRIDES[base]
  }
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

function parseListValue(value: unknown) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }
  return value
}

function buildCondition(filter: Filter) {
  const value = parseListValue(filter.value)
  switch (filter.op) {
    case 'eq':
      return value
    case 'neq':
      return { not: value }
    case 'in':
      return { in: value }
    case 'gte':
      return { gte: value }
    case 'lte':
      return { lte: value }
    case 'gt':
      return { gt: value }
    case 'lt':
      return { lt: value }
    case 'ilike': {
      const normalized = String(value ?? '').replace(/%/g, '')
      return { contains: normalized, mode: 'insensitive' }
    }
    case 'like': {
      const normalized = String(value ?? '').replace(/%/g, '')
      return { contains: normalized }
    }
    case 'contains':
      if (Array.isArray(value)) {
        return { hasEvery: value }
      }
      if (value && typeof value === 'object') {
        return { contains: value }
      }
      return { has: value }
    case 'not': {
      const modifier = filter.modifier || 'eq'
      if (modifier === 'in') {
        return { notIn: value }
      }
      if (modifier === 'ilike' || modifier === 'like') {
        const normalized = String(value ?? '').replace(/%/g, '')
        return {
          not: {
            contains: normalized,
            ...(modifier === 'ilike' ? { mode: 'insensitive' } : {}),
          },
        }
      }
      if (['gt', 'gte', 'lt', 'lte'].includes(modifier)) {
        return { not: { [modifier]: value } }
      }
      return { not: value }
    }
    case 'is':
      return value
    default:
      return value
  }
}

function mergeCondition(target: Record<string, any>, key: string, condition: any) {
  if (
    condition &&
    typeof condition === 'object' &&
    !Array.isArray(condition) &&
    !(condition instanceof Date)
  ) {
    if (
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key]) &&
      !(target[key] instanceof Date)
    ) {
      target[key] = { ...target[key], ...condition }
      return
    }
  }
  target[key] = condition
}

function setNestedWhere(
  where: Record<string, any>,
  path: string[],
  condition: any
) {
  let cursor = where
  const lastIndex = path.length - 1
  path.forEach((segment, index) => {
    if (index === lastIndex) {
      mergeCondition(cursor, segment, condition)
      return
    }
    if (!cursor[segment] || typeof cursor[segment] !== 'object') {
      cursor[segment] = {}
    }
    cursor = cursor[segment]
  })
}

function buildWhere(filters: Filter[]) {
  if (filters.length === 0) return undefined
  const where: Record<string, unknown> = {}

  for (const filter of filters) {
    const condition = buildCondition(filter)
    const path = filter.column.split('.').map(snakeToCamel)
    if (path.length === 1) {
      mergeCondition(where as Record<string, any>, path[0], condition)
      continue
    }
    setNestedWhere(where as Record<string, any>, path, condition)
  }

  return where
}

function parseOrExpression(expression: string) {
  const trimmed = expression.trim()
  const isAnd = trimmed.startsWith('and(') && trimmed.endsWith(')')
  const inner = isAnd ? trimmed.slice(4, -1) : trimmed
  const parts = inner
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  const filters = parts.map((part) => {
    const [column, operator, ...rest] = part.split('.')
    const rawValue = rest.join('.')
    let value: unknown = rawValue
    if (rawValue === 'null') value = null
    if (rawValue === 'true') value = true
    if (rawValue === 'false') value = false
    if (rawValue && !Number.isNaN(Number(rawValue))) value = Number(rawValue)
    return {
      column,
      op: operator as Filter['op'],
      value,
    }
  })

  return { type: isAnd ? 'AND' : 'OR', filters }
}

const proxyCache = new WeakMap<object, any>()

function wrapValue<T>(value: T): T {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') return value
  if (value instanceof Date) return value
  if (Array.isArray(value)) {
    return value.map((entry) => wrapValue(entry)) as T
  }

  const cached = proxyCache.get(value as object)
  if (cached) return cached

  const proxy = new Proxy(value as Record<string, any>, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && !(prop in target)) {
        const camel = snakeToCamel(prop)
        if (camel in target) {
          return wrapValue(target[camel])
        }
      }
      const result = Reflect.get(target, prop, receiver)
      return wrapValue(result)
    },
  })

  proxyCache.set(value as object, proxy)
  return proxy as T
}

function buildOrder(orderBy: OrderBy[]) {
  const directOrders = orderBy.filter((order) => !order.foreignTable)
  if (directOrders.length === 0) return undefined
  const mapped = directOrders.map((order) => ({
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

function applyRelationOptions(
  includeFields: Record<string, any>,
  relationKey: string,
  options: { orderBy?: Record<string, any>; take?: number }
) {
  const path = relationKey.split('.').map(snakeToCamel)
  let current = includeFields

  path.forEach((segment, index) => {
    // If entry is boolean true (simple include), convert to empty object so we can attach options
    if (current[segment] === true) {
      current[segment] = {}
    }
    
    const entry = current[segment]
    if (!entry || typeof entry !== 'object') {
      return
    }
    if (index === path.length - 1) {
      if (options.orderBy) {
        entry.orderBy = options.orderBy
      }
      if (typeof options.take === 'number') {
        entry.take = options.take
      }
      return
    }
    if (!entry.include) {
      entry.include = {}
    }
    current = entry.include
  })
}

function buildSelection(
  select?: string,
  relationOrders?: Record<string, OrderBy[]>,
  relationLimits?: Record<string, number>
) {
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
      // Use splitSelect to correctly handle nested parentheses
      const fields = splitSelect(relationMatch[2])
      
      const hasWildcard = fields.includes('*')
      const relations = fields.filter(f => f.includes('(') && f.includes(')'))
      
      if (fields.length === 0 || (hasWildcard && relations.length === 0)) {
        includeFields[relation] = true
        continue
      }

      if (hasWildcard && relations.length > 0) {
        // Handle case where we have * AND relations (e.g. *, author:users(*))
        // In Prisma, we use include for the relation to get all fields + nested relations
        const nestedIncludes: Record<string, any> = {}
        
        for (const relField of relations) {
           const nestedSelect = buildSelection(relField)
           if (nestedSelect.include) {
             Object.assign(nestedIncludes, nestedSelect.include)
           }
        }
        
        includeFields[relation] = { include: nestedIncludes }
        continue
      }

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
    if (relationOrders) {
      Object.entries(relationOrders).forEach(([relationKey, orders]) => {
        const orderBy = orders.map((order) => ({
          [snakeToCamel(order.column)]: order.ascending ? 'asc' : 'desc',
        }))
        applyRelationOptions(includeFields, relationKey, {
          orderBy: orderBy.length === 1 ? orderBy[0] : orderBy,
        })
      })
    }

    if (relationLimits) {
      Object.entries(relationLimits).forEach(([relationKey, limit]) => {
        applyRelationOptions(includeFields, relationKey, { take: limit })
      })
    }
    return { include: includeFields }
  }

  if (Object.keys(selectFields).length > 0) {
    return { select: selectFields }
  }

  return {}
}

const UNIQUE_KEYS_BY_MODEL: Record<string, string[]> = {
  notificationPreference: ['userId'],
  sickModeSettings: ['familyId'],
  creditBalance: ['memberId'],
  screenTimeBalance: ['memberId'],
  familyMember: ['authUserId', 'email', 'family_id'],
  screenTimeSettings: ['memberId'],
  screenTimeGraceSettings: ['memberId'], // Add this
  achievement: ['key'],
  userAchievement: ['userId', 'achievementId'],
  streak: ['userId', 'type'],
}

function hasUniqueWhere(where?: Record<string, unknown>, model?: string) {
  if (!where) return false
  if (Object.prototype.hasOwnProperty.call(where, 'id')) return true
  if (model && UNIQUE_KEYS_BY_MODEL[model]) {
    return UNIQUE_KEYS_BY_MODEL[model].some((key) =>
      Object.prototype.hasOwnProperty.call(where, key)
    )
  }
  return false
}

async function executeQuery(state: QueryState, single: boolean) {
  const model = tableToModel(state.table)
  const dbModel = (dbMock as Record<string, any>)[model]

  if (!dbModel) {
    return { data: single ? null : [], error: null }
  }

  let where = buildWhere(state.filters)
  if (state.orFilters.length > 0) {
    const parsed = parseOrExpression(state.orFilters[0])
    const conditions = parsed.filters
      .map((filter) => buildWhere([filter]))
      .filter(Boolean) as Record<string, unknown>[]
    const baseWhere = (where ?? {}) as Record<string, any>
    if (parsed.type === 'AND') {
      baseWhere.AND = [...(baseWhere.AND ?? []), ...conditions]
    } else {
      baseWhere.OR = conditions
    }
    where = baseWhere
  }
  const orderBy = buildOrder(state.orderBy)
  const selection = buildSelection(
    state.select,
    state.relationOrders,
    state.relationLimits
  )

  // Move relation filters from top-level 'where' to 'include'
  if (where && selection.include) {
    Object.keys(where).forEach((key) => {
      // Check if this key corresponds to an included relation
      // The key in 'where' is already camelCase (from buildWhere)
      // The key in 'selection.include' is also camelCase (from buildSelection)
      if (key in selection.include) {
        const relationInclude = selection.include[key]
        
        // Ensure relationInclude is an object (it might be 'true' if just included without options)
        if (relationInclude === true) {
          selection.include[key] = { where: where[key] }
        } else {
          // It's already an object, merge or set where
          // If it already has a where (e.g. from parsing *), merge it?
          // For now just set/overwrite or merge if we want to be safe
          selection.include[key] = {
            ...(relationInclude as any),
            where: { ...((relationInclude as any).where || {}), ...(where[key] as any) },
          }
        }
        
        // Remove from top-level where
        delete where[key]
      }
    })
    
    // cleanup empty where
    if (Object.keys(where).length === 0) {
      // where = undefined // Can't assign to const variable
      // We can't reassign 'where' because it's const (implied by let/const usage above? No it is let)
      // But we need to handle the case where we passed `where` to findMany/findFirst
    }
  }

  const count = state.count
    ? await dbModel.count({ ...(where && Object.keys(where).length > 0 ? { where } : {}) })
    : undefined

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
      const result = await dbModel.createMany({
        data: data.map((entry) => toCamelCaseKeys(entry as Record<string, unknown>)),
      })
      return { data: wrapValue(result), error: null }
    }

    const result = await dbModel.create({
      data: toCamelCaseKeys((state.data || {}) as Record<string, unknown>),
      ...selection,
    })
    return { data: wrapValue(result ?? null), error: null }
  }

  if (state.action === 'update') {
    const data = toCamelCaseKeys((state.data || {}) as Record<string, unknown>)
    if (hasUniqueWhere(where, model)) {
      const result = await dbModel.update({ where, data, ...selection })
      return { data: wrapValue(result ?? null), error: null }
    }

    const result = await dbModel.updateMany({ where, data })
    
    // If selection is requested (via select()), return an array of mock objects
    // based on the count returned by updateMany, to mimic Supabase returning updated rows
    if (selection && (selection.select || selection.include) && result && typeof result.count === 'number') {
      return { 
        data: Array(result.count).fill({ id: 'mock-id' }), 
        error: null 
      }
    }

    return { data: wrapValue(result ?? null), error: null }
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
    const updateData = { ...data }
    conflictFields.forEach((field) => {
      delete updateData[snakeToCamel(field.trim()) as keyof typeof updateData]
    })

    const result = await dbModel.upsert({
      where: conflictWhere,
      update: updateData,
      create: data,
      ...selection,
    })
    return { data: wrapValue(result ?? null), error: null }
  }

  if (state.action === 'delete') {
    if (hasUniqueWhere(where, model)) {
      const result = await dbModel.delete({ where })
      return { data: wrapValue(result ?? null), error: null }
    }

    const result = await dbModel.deleteMany({ where })
    return { data: wrapValue(result ?? null), error: null }
  }

  if (single) {
    const method = hasUniqueWhere(where, model) ? 'findUnique' : 'findFirst'
    let result = await dbModel[method]({
      ...(where && Object.keys(where).length > 0 ? { where } : {}),
      ...(orderBy ? { orderBy } : {}),
      ...pagination,
      ...selection,
    })

    // If using mock, verify where clauses match the result
    if (result && where) {
        const mismatch = Object.entries(where).some(([key, value]) => {
            if (key === 'AND' || key === 'OR') return false; // Skip complex logic for now
            // Simple check: if result has key and value doesn't match
            if (Object.prototype.hasOwnProperty.call(result, key)) {
                if (typeof value === 'object' && value !== null && !(value instanceof Date)) return false; // Skip complex filters
                if (result[key] !== value) return true;
            }
            return false;
        });
        if (mismatch) result = null;
    }

    return {
      data: wrapValue(result ?? null),
      error: null,
      ...(state.count ? { count: count ?? 0 } : {}),
    }
  }

  if (state.head) {
    return {
      data: null,
      error: null,
      ...(state.count ? { count: count ?? 0 } : {}),
    }
  }

  const result = await dbModel.findMany({
    ...(where && Object.keys(where).length > 0 ? { where } : {}),
    ...(orderBy ? { orderBy } : {}),
    ...pagination,
    ...selection,
  })
  return {
    data: wrapValue(result ?? []),
    error: null,
    ...(state.count ? { count: count ?? 0 } : {}),
  }
}

function createQueryBuilder(table: string) {
  const state: QueryState = {
    table,
    action: 'select',
    filters: [],
    orderBy: [],
    orFilters: [],
    relationOrders: {},
    relationLimits: {},
  }

  const builder: Record<string, any> = {
    select: (select?: string, options?: { count?: string; head?: boolean }) => {
      state.select = select
      state.count = options?.count
      state.head = options?.head
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
    contains: (column: string, value: unknown) => {
      state.filters.push({ op: 'contains', column, value })
      return builder
    },
    not: (column: string, modifier: string, value: unknown) => {
      state.filters.push({ op: 'not', column, value, modifier })
      return builder
    },
    is: (column: string, value: unknown) => {
      state.filters.push({ op: 'is', column, value })
      return builder
    },
    or: (expression: string) => {
      state.orFilters.push(expression)
      return builder
    },
    order: (column: string, options?: { ascending?: boolean; foreignTable?: string }) => {
      if (options?.foreignTable) {
        const key = options.foreignTable
        if (!state.relationOrders[key]) {
          state.relationOrders[key] = []
        }
        state.relationOrders[key].push({
          column,
          ascending: options.ascending !== false,
          foreignTable: key,
        })
        return builder
      }
      state.orderBy.push({ column, ascending: options?.ascending !== false })
      return builder
    },
    limit: (value: number, options?: { foreignTable?: string }) => {
      if (options?.foreignTable) {
        state.relationLimits[options.foreignTable] = value
        return builder
      }
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

async function dispatchRedeemReward(params: Record<string, unknown>) {
  const rewardId = params.p_reward_id as string
  const memberId = params.p_member_id as string

  // 1. Fetch reward (simulates SELECT ... FOR UPDATE)
  const reward = await (dbMock as Record<string, any>).rewardItem.findUnique({ where: { id: rewardId } })
  if (!reward) return { data: null, error: { message: 'Reward not found' } }
  if (reward.status !== 'ACTIVE') return { data: null, error: { message: 'Reward is not available' } }
  const quantity: number | null | undefined = reward.quantity
  if (quantity !== null && quantity !== undefined && quantity <= 0) {
    return { data: null, error: { message: 'Reward is out of stock' } }
  }

  // 2. Fetch balance (simulates SELECT ... FOR UPDATE)
  const balance = await (dbMock as Record<string, any>).creditBalance.findUnique({ where: { memberId } })
  const currentBalance: number = balance?.current_balance ?? balance?.currentBalance ?? 0
  const costCredits: number = reward.cost_credits ?? reward.costCredits ?? 0

  if (!balance || currentBalance < costCredits) {
    return { data: null, error: { message: 'Insufficient credits' } }
  }

  // 3. Deduct credits (with optimistic-lock simulation so existing test assertions pass)
  const newBalance = currentBalance - costCredits
  const lifetimeSpent = (balance.lifetime_spent ?? balance.lifetimeSpent ?? 0) + costCredits
  let updatedBalance: unknown
  try {
    updatedBalance = await (dbMock as Record<string, any>).creditBalance.update({
      where: { memberId, currentBalance },
      data: { currentBalance: newBalance, lifetimeSpent },
    })
  } catch {
    return { data: null, error: { message: 'Transaction failed due to concurrent modification. Please try again.' } }
  }
  if (!updatedBalance) {
    return { data: null, error: { message: 'Transaction failed due to concurrent modification. Please try again.' } }
  }

  // 4. Record the credit transaction
  const tx = await (dbMock as Record<string, any>).creditTransaction.create({
    data: {
      memberId,
      type: 'REWARD_REDEMPTION',
      amount: -costCredits,
      balanceAfter: newBalance,
      reason: `Redeemed: ${reward.name}`,
      category: 'REWARDS',
    },
  })

  // 5. Decrement limited-quantity stock
  if (quantity !== null && quantity !== undefined) {
    const newQty = quantity - 1
    await (dbMock as Record<string, any>).rewardItem.update({
      where: { id: rewardId },
      data: { quantity: newQty, status: newQty <= 0 ? 'OUT_OF_STOCK' : 'ACTIVE' },
    })
  }

  // 6. Create redemption record
  const redemption = await (dbMock as Record<string, any>).rewardRedemption.create({
    data: { rewardId, memberId, creditTransactionId: tx?.id, status: 'PENDING' },
  })

  return {
    data: {
      redemption_id: redemption?.id,
      transaction_id: tx?.id,
      credits_deducted: costCredits,
      new_balance: newBalance,
      redemption,
    },
    error: null,
  }
}

export function createSupabaseMockClient() {
  const session = getMockSession()
  const user = session?.user ? { id: session.user.id } : null

  return {
    from: (table: string) => createQueryBuilder(table),
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      getSession: async () => ({ data: { session: session ?? null }, error: null }),
      signUp: async () => ({ 
        data: { 
          user: { id: 'new-user-id', email: 'test@example.com' }, 
          session: { user: { id: 'new-user-id' } } 
        }, 
        error: null 
      }),
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
    rpc: async (fn: string, params?: Record<string, unknown>) => {
      if (fn === 'redeem_reward') {
        return dispatchRedeemReward(params || {})
      }
      return { data: null, error: null }
    },
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
