import { apiRequest } from '@/lib/api-client'
import type {
  CurrentFamilyMemberApiRecord,
  CurrentFamilyMemberRecord,
  CurrentFamilyMemberRoleResponse,
} from '@/types/current-family-member-lifecycle'

export type {
  CurrentFamilyMemberApiRecord,
  CurrentFamilyMemberRecord,
  CurrentFamilyMemberRole,
  CurrentFamilyMemberRoleResponse,
} from '@/types/current-family-member-lifecycle'

export function getCurrentFamilyKioskChildToken() {
  if (typeof window === 'undefined') {
    return null
  }

  return localStorage.getItem('kioskChildToken')
}

export function mapCurrentFamilyApiMember(
  member: CurrentFamilyMemberApiRecord,
  resolvedRole?: CurrentFamilyMemberRoleResponse['role']
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
  _userId?: string | null
): Promise<CurrentFamilyMemberRoleResponse> {
  return apiRequest<CurrentFamilyMemberRoleResponse>('/api/user/role')
}

export async function fetchCurrentFamilyApiMembers(
  _userId?: string | null
): Promise<CurrentFamilyMemberApiRecord[]> {
  const data = await apiRequest<{ members?: CurrentFamilyMemberApiRecord[] }>(
    '/api/family/members'
  )
  return data.members ?? []
}
