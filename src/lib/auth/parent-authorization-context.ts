import { getAuthContext } from '@/lib/supabase/server'
import { readNullableString } from '@/lib/readers'

type AuthContextLike = Awaited<ReturnType<typeof getAuthContext>>

export interface FamilyAuthorizationMembership {
  id: string
  familyId: string
  name: string | null
  role: string | null
  familyName: string | null
}

export interface ParentAuthorizationContext {
  user: NonNullable<AuthContextLike>['user']
  memberships: FamilyAuthorizationMembership[]
  defaultFamilyId: string | null
  defaultMemberId: string | null
  familyId: string
  memberId: string
  familyName: string | null
  role: string | null
  isParent: boolean
  isChild: boolean
  canManageFamily: boolean
  activeMembership: FamilyAuthorizationMembership | null
}

export interface AuthorizationContextOptions {
  unauthorizedMessage?: string
  noFamilyMessage?: string
  forbiddenMessage?: string
}

export class ParentAuthorizationContextError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ParentAuthorizationContextError'
    this.status = status
  }
}

export function isParentAuthorizationContextError(
  error: unknown
): error is ParentAuthorizationContextError {
  return error instanceof ParentAuthorizationContextError
}

function normalizeMembership(membership: unknown): FamilyAuthorizationMembership | null {
  if (!membership || typeof membership !== 'object') {
    return null
  }

  const record = membership as Record<string, unknown>
  const families =
    record.families && typeof record.families === 'object'
      ? (record.families as Record<string, unknown>)
      : null

  const id = readNullableString(record.id)
  const familyId = readNullableString(record.family_id)

  if (!id || !familyId) {
    return null
  }

  return {
    id,
    familyId,
    name: readNullableString(record.name),
    role: readNullableString(record.role),
    familyName: readNullableString(families?.name),
  }
}

function normalizeMemberships(memberships: unknown): FamilyAuthorizationMembership[] {
  if (!Array.isArray(memberships)) {
    return []
  }

  return memberships
    .map((membership) => normalizeMembership(membership))
    .filter((membership): membership is FamilyAuthorizationMembership => Boolean(membership))
}

export async function resolveParentAuthorizationContext(
  options: AuthorizationContextOptions = {}
): Promise<ParentAuthorizationContext> {
  const authContext = await getAuthContext()

  if (!authContext) {
    throw new ParentAuthorizationContextError(
      401,
      options.unauthorizedMessage ?? 'Unauthorized'
    )
  }

  const familyId = authContext.activeFamilyId
  const memberId = authContext.activeMemberId

  if (!familyId || !memberId) {
    throw new ParentAuthorizationContextError(
      400,
      options.noFamilyMessage ?? 'No family found'
    )
  }

  const memberships = normalizeMemberships(authContext.memberships)
  const activeMembership =
    memberships.find((membership) => membership.id === memberId) ??
    memberships.find((membership) => membership.familyId === familyId) ??
    null

  const fallbackRole =
    authContext.user && typeof authContext.user === 'object'
      ? readNullableString((authContext.user as Record<string, unknown>).role)
      : null

  const fallbackFamilyName =
    authContext.user && typeof authContext.user === 'object'
      ? readNullableString((authContext.user as Record<string, unknown>).familyName)
      : null

  const role = activeMembership?.role ?? fallbackRole
  const isParent = role === 'PARENT'
  const isChild = role === 'CHILD'

  return {
    user: authContext.user,
    memberships,
    defaultFamilyId: authContext.defaultFamilyId ?? null,
    defaultMemberId: authContext.defaultMemberId ?? null,
    familyId,
    memberId,
    familyName: activeMembership?.familyName ?? fallbackFamilyName,
    role,
    isParent,
    isChild,
    canManageFamily: isParent,
    activeMembership,
  }
}

export async function requireParentAuthorizationContext(
  options: AuthorizationContextOptions = {}
): Promise<ParentAuthorizationContext> {
  const context = await resolveParentAuthorizationContext(options)

  if (!context.isParent) {
    throw new ParentAuthorizationContextError(
      403,
      options.forbiddenMessage ?? 'Forbidden - Parent access required'
    )
  }

  return context
}
