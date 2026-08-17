export function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function readNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function readNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function readNullableObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function readDateString(value: unknown): string {
  if (typeof value === 'string') {
    return new Date(value).toISOString()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return new Date(0).toISOString()
}

/**
 * A DB row (snake_case) that may also carry camelCase aliases. Rows arrive in
 * either shape depending on whether a caller passed a raw supabase row or an
 * already-normalized record, so reads prefer camelCase and fall back to
 * snake_case via `pickKey`.
 */
export type RowLike<T> = T & Record<string, unknown>

/**
 * Read a field from a loosely-typed row, preferring the camelCase key and
 * falling back to the snake_case key. Order is canonical (camel first) so the
 * same row shape reads consistently across every *-lifecycle module.
 */
export function pickKey(
  row: Record<string, unknown>,
  camelKey: string,
  snakeKey: string
): unknown {
  const value = row[camelKey]
  return value !== undefined ? value : row[snakeKey]
}
