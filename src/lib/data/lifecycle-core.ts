import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'
import {
  ParentAuthorizationContext,
  ParentAuthorizationContextError,
  requireParentAuthorizationContext,
  resolveParentAuthorizationContext,
} from '@/lib/auth/parent-authorization-context'

/**
 * LifecycleError is the single error type for every *-lifecycle data module.
 *
 * Any `Error` carrying a numeric `status` is treated as an HTTP response spec:
 * `isLifecycleError` is deliberately structural so that it recognizes both real
 * `LifecycleError` instances and error classes that mirror this contract.
 */
export class LifecycleError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'LifecycleError'
    this.status = status
    if (details !== undefined) {
      this.details = details
    }
  }
}

export function isLifecycleError(error: unknown): error is LifecycleError {
  if (!error || typeof error !== 'object') return false
  const candidate = error as LifecycleError
  return typeof candidate.status === 'number' && typeof candidate.message === 'string'
}

export interface LifecycleViewerContext {
  familyId: string
  memberId: string
  role: string | null
  isParent: boolean
  isChild: boolean
  memberships: ParentAuthorizationContext['memberships']
}

function toViewerContext(context: ParentAuthorizationContext): LifecycleViewerContext {
  return {
    familyId: context.familyId,
    memberId: context.memberId,
    role: context.role,
    isParent: context.isParent,
    isChild: context.isChild,
    memberships: context.memberships,
  }
}

function mapParentAuthorizationError(error: unknown): never {
  if (error instanceof ParentAuthorizationContextError) {
    throw new LifecycleError(error.status, error.message)
  }

  throw error
}

/**
 * Resolve the current viewer (authenticated family member). Throws a
 * `LifecycleError` with status 401 when unauthenticated or 400 when no family
 * context is available.
 */
export async function requireViewerContext(): Promise<LifecycleViewerContext> {
  try {
    return toViewerContext(await resolveParentAuthorizationContext())
  } catch (error) {
    mapParentAuthorizationError(error)
  }
}

/**
 * Resolve the current viewer and require PARENT role. Throws a `LifecycleError`
 * with status 403 (and the given message) when the viewer is not a parent.
 */
export async function requireParentContext(
  forbiddenMessage = 'Parent access required'
): Promise<LifecycleViewerContext> {
  try {
    return toViewerContext(await requireParentAuthorizationContext({ forbiddenMessage }))
  } catch (error) {
    mapParentAuthorizationError(error)
  }
}

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

export type AuditAction = Database['public']['Enums']['audit_action']
export type AuditResult = Database['public']['Enums']['audit_result']

export interface AuditLogInput {
  familyId: string
  memberId: string | null
  action: AuditAction
  entityType: string
  entityId?: string | null
  result?: AuditResult
  metadata?: unknown | null
  previousValue?: unknown
  newValue?: unknown
}

/**
 * Write an audit_logs row through the typed payload boundary.
 *
 * Always build the payload against `Database['public']['Tables']['audit_logs']['Insert']`
 * so the schema (and not just the runtime) validates the columns we write. This is
 * the single place that touches the `metadata` / `previous_value` / `new_value`
 * Json columns.
 */
export async function insertAuditLog(input: AuditLogInput): Promise<void> {
  const supabase = await createClient()
  const payload: Database['public']['Tables']['audit_logs']['Insert'] = {
    family_id: input.familyId,
    member_id: input.memberId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    result: input.result ?? 'SUCCESS',
    metadata: (input.metadata ?? null) as Database['public']['Tables']['audit_logs']['Insert']['metadata'],
    ...(input.previousValue !== undefined
      ? {
          previous_value:
            input.previousValue as Database['public']['Tables']['audit_logs']['Insert']['previous_value'],
        }
      : {}),
    ...(input.newValue !== undefined
      ? {
          new_value:
            input.newValue as Database['public']['Tables']['audit_logs']['Insert']['new_value'],
        }
      : {}),
  }

  const { error } = await supabase.from('audit_logs').insert(payload)
  if (error) throw error
}