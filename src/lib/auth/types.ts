export type SessionRole = 'PARENT' | 'CHILD' | 'GUEST'

export interface SessionUser {
  id: string
  role: SessionRole
  familyId: string
  familyName: string
  name?: string | null
  email?: string | null
}

export interface Session {
  user: SessionUser
  expires: string
}
