import { apiRequest, buildQueryString } from '@/lib/api-client'

export type LifecycleQuery = Record<string, string | number | boolean | null | undefined>

export interface LifecycleResourceClient<T> {
  list(query?: LifecycleQuery): Promise<T[]>
  get(id: string): Promise<T>
  create(input: unknown): Promise<T>
  update(id: string, input: unknown): Promise<T>
  remove(id: string): Promise<void>
  action<U = T>(
    path: string,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT',
    body?: unknown,
    unwrapKey?: string,
    query?: LifecycleQuery
  ): Promise<U>
}

export interface CreateLifecycleClientOptions {
  /** Base path without a trailing slash, e.g. '/api/screentime/types'. */
  basePath: string
  /** Envelope key unwrapped by get/create/update/action. Omit to return the whole envelope. */
  itemKey?: string
  /** Envelope key unwrapped by list. Omit to return the whole envelope. */
  listKey?: string
  /** HTTP method used by update; defaults to PATCH. */
  updateMethod?: 'PATCH' | 'PUT'
}

/**
 * Build a typed CRUD client for a single lifecycle resource.
 *
 * Mechanical create/update/delete/list functions across the *-lifecycle-client
 * modules shared one shape: `apiRequest<{ <key>: T }>(endpoint, ...)` followed by
 * `return data.<key>`. This factory owns that shape once; per-domain modules keep
 * only their genuinely bespoke verbs.
 */
export function createLifecycleClient<T>(options: CreateLifecycleClientOptions): LifecycleResourceClient<T> {
  const { basePath, itemKey, listKey, updateMethod = 'PATCH' } = options

  function url(path: string, query?: LifecycleQuery): string {
    return `${basePath}${path}${buildQueryString(query ?? {})}`
  }

  function unwrap<U>(data: Record<string, unknown>, key?: string): U {
    return (key ? data[key] : data) as U
  }

  function request(path: string, method: string, body?: unknown, query?: LifecycleQuery): Promise<Record<string, unknown>> {
    return apiRequest<Record<string, unknown>>(url(path, query), {
      method,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  }

  return {
    list(query) {
      return request('', 'GET', undefined, query).then((data) => unwrap<T[]>(data, listKey))
    },
    get(id) {
      return request(`/${id}`, 'GET', undefined).then((data) => unwrap<T>(data, itemKey))
    },
    create(input) {
      return request('', 'POST', input).then((data) => unwrap<T>(data, itemKey))
    },
    update(id, input) {
      return request(`/${id}`, updateMethod, input).then((data) => unwrap<T>(data, itemKey))
    },
    remove(id) {
      return request(`/${id}`, 'DELETE', undefined).then(() => undefined)
    },
    action<U = T>(
      path: string,
      method: 'GET' | 'POST' | 'PATCH' | 'PUT',
      body?: unknown,
      unwrapKey?: string,
      query?: LifecycleQuery,
    ): Promise<U> {
      return request(path, method, body, query).then((data) => unwrap<U>(data, unwrapKey))
    },
  }
}
