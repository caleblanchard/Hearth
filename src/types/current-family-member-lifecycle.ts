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
