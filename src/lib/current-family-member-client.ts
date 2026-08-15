import { addActiveFamilyHeader } from '@/hooks/useFamilyFetch'

export type CurrentFamilyMemberRole = 'PARENT' | 'CHILD'

export interface CurrentFamilyMemberRecord {
  id: string
  name: string
  email: string | null
  role: CurrentFamilyMemberRole
  familyId: string
  avatarUrl: string | null
  birthDate: string | null
  isActive: boolean
}

export interface CurrentFamilyMemberRoleResponse {
  role?: CurrentFamilyMemberRole
  memberId?: string
  familyId?: string
  authUserId?: string
}

export interface CurrentFamilyMemberApiRecord {
  id: string
  familyId: string
  userId?: string | null
  authUserId?: string | null
  name: string
  email?: string | null
  role: CurrentFamilyMemberRole
  birthDate?: string | null
  avatarUrl?: string | null
  isActive?: boolean
}

export function getCurrentFamilyKioskChildToken() {
  if (typeof window === 'undefined') {
    return null
  }

  return localStorage.getItem('kioskChildToken')
}

export function createCurrentFamilyRequestHeaders(userId?: string | null) {
  const headers = addActiveFamilyHeader({}, userId)
  const kioskChildToken = getCurrentFamilyKioskChildToken()

  if (kioskChildToken) {
    headers.set('X-Kiosk-Child', kioskChildToken)
  }

  return headers
}

export function mapCurrentFamilyApiMember(
  member: CurrentFamilyMemberApiRecord,
  resolvedRole?: CurrentFamilyMemberRole
): CurrentFamilyMemberRecord {
  return {
    id: member.id,
    name: member.name,
    email: member.email ?? null,
    role: resolvedRole ?? member.role,
    familyId: member.familyId,
    avatarUrl: member.avatarUrl ?? null,
    birthDate: member.birthDate ?? null,
    isActive: member.isActive ?? true,
  }
}

export async function fetchCurrentFamilyRole(
  userId?: string | null
): Promise<CurrentFamilyMemberRoleResponse> {
  const response = await fetch('/api/user/role', {
    headers: createCurrentFamilyRequestHeaders(userId),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch member role: ${response.status}`)
  }

  return (await response.json()) as CurrentFamilyMemberRoleResponse
}

export async function fetchCurrentFamilyApiMembers(
  userId?: string | null
): Promise<CurrentFamilyMemberApiRecord[]> {
  const response = await fetch('/api/family/members', {
    headers: createCurrentFamilyRequestHeaders(userId),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch family members: ${response.status}`)
  }

  const data = (await response.json()) as {
    members?: CurrentFamilyMemberApiRecord[]
  }

  return data.members ?? []
}
