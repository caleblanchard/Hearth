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
