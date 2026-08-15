export const ACTIVE_FAMILY_STORAGE_KEY = 'hearth_active_family_id'

export function getActiveFamilyStorageKey(userId: string) {
  return `${ACTIVE_FAMILY_STORAGE_KEY}_${userId}`
}

export function getStoredActiveFamilyId(userId?: string | null): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  if (userId) {
    return localStorage.getItem(getActiveFamilyStorageKey(userId))
  }

  const familyKey = Object.keys(localStorage).find((key) =>
    key.startsWith(`${ACTIVE_FAMILY_STORAGE_KEY}_`)
  )

  return familyKey ? localStorage.getItem(familyKey) : null
}
