import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  ParentAuthorizationContext,
  ParentAuthorizationContextError,
  requireParentAuthorizationContext,
  resolveParentAuthorizationContext,
} from '@/lib/auth/parent-authorization-context'
import {
  readBoolean,
  readDateString,
  readNullableNumber,
  readNullableObject,
  readNullableString,
  readNumber,
  readObject,
  readString,
} from '@/lib/readers'

export type DatabaseClient = SupabaseClient<Database>

export {
  readBoolean,
  readDateString,
  readNullableNumber,
  readNullableObject,
  readNullableString,
  readNumber,
  readObject,
  readString,
}

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
  memberName: string | null
  role: string | null
  isParent: boolean
  isChild: boolean
  memberships: ParentAuthorizationContext['memberships']
}

function toViewerContext(context: ParentAuthorizationContext): LifecycleViewerContext {
  return {
    familyId: context.familyId,
    memberId: context.memberId,
    memberName: context.activeMembership?.name ?? null,
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

export type AuditAction = Database['public']['Enums']['audit_action']
export type AuditResult = Database['public']['Enums']['audit_result']

/**
 * Canonical audit entity vocabulary. Every audit_logs write through
 * `insertAuditLog` must name its entity with one of these values so the
 * vocabulary stays consistent across the old and lifecycle layers.
 */
export type AuditEntityType =
  | 'SCREENTIME_ALLOWANCE'
  | 'SCREEN_TIME'
  | 'ROUTINE'
  | 'PROJECT'
  | 'MEAL_PLAN'
  | 'DOCUMENT'
  | 'COMMUNICATION_POST'
  | 'GUEST_SESSION'
  | 'GUEST_INVITE'
  | 'PET'
  | 'HEALTH_EVENT'
  | 'SICK_MODE_INSTANCE'
  | 'SICK_MODE_SETTINGS'
  | 'AUTOMATION_RULE'
  | 'REWARD'
  | 'KIOSK_SETTINGS'

export interface AuditLogInput {
  familyId: string
  memberId: string | null
  action: AuditAction
  entityType: AuditEntityType
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
export async function insertAuditLog(
  input: AuditLogInput,
  client?: DatabaseClient
): Promise<void> {
  const supabase = client ?? (await createClient())
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

/**
 * Best-effort audit write.
 *
 * Every audit_logs insert happens AFTER the primary mutation it describes, so a
 * failed audit must never retroactively fail an already-succeeded operation.
 * All audit call sites (old and lifecycle layers) go through this wrapper so the
 * swallow-and-log policy is decided once, and the error is always logged.
 */
export async function writeAuditLog(
  input: AuditLogInput,
  client?: DatabaseClient
): Promise<void> {
  try {
    await insertAuditLog(input, client)
  } catch (error) {
    logger.warn('Failed to write audit log', { error })
  }
}