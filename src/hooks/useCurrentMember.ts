'use client';

import { useCurrentFamilyMember } from './useCurrentFamilyMember';
import type { CurrentFamilyMemberRecord } from '@/lib/current-family-member-client';

interface UseCurrentMemberOptions {
  activeFamilyId?: string | null;
  familyLoading?: boolean;
  kioskFallbackName?: string;
  setActiveFamilyId?: (familyId: string) => void;
}

/**
 * Hook to get the current user's family member data including role
 * Use this instead of checking user.user_metadata.role which doesn't exist
 */
export function useCurrentMember(options: UseCurrentMemberOptions = {}) {
  const { user, member, loading, error } = useCurrentFamilyMember({
    activeFamilyId: options.activeFamilyId,
    familyLoading: options.familyLoading,
    kioskFallbackName: options.kioskFallbackName ?? 'Current Member',
    setActiveFamilyId: options.setActiveFamilyId,
  });

  const currentMember = member as CurrentFamilyMemberRecord | null;

  return {
    user,
    member: currentMember,
    loading,
    error,
    isParent: currentMember?.role === 'PARENT',
    isChild: currentMember?.role === 'CHILD',
  };
}
