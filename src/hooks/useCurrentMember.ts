'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { getStoredActiveFamilyId } from '@/lib/active-family-storage';
import { useSupabaseSession } from './useSupabaseSession';
import {
  fetchCurrentFamilyApiMembers,
  fetchCurrentFamilyRole,
  getCurrentFamilyKioskChildToken,
  mapCurrentFamilyApiMember,
  type CurrentFamilyMemberApiRecord,
  type CurrentFamilyMemberRecord,
  type CurrentFamilyMemberRoleResponse,
} from '@/lib/current-family-member-client';
import type { CurrentFamilyMemberRole } from '@/types/current-family-member-lifecycle';

export type CurrentFamilyMember = CurrentFamilyMemberRecord;

export interface UseCurrentMemberOptions {
  activeFamilyId?: string | null;
  familyLoading?: boolean;
  kioskFallbackName?: string;
  setActiveFamilyId?: (familyId: string) => void;
}

export interface UseCurrentMemberResult {
  user: User | null;
  member: CurrentFamilyMember | null;
  loading: boolean;
  error: string | null;
  isParent: boolean;
  isChild: boolean;
}

interface DatabaseFamilyMemberRecord {
  id: string;
  name: string;
  email: string | null;
  role: CurrentFamilyMemberRole;
  family_id: string;
  avatar_url: string | null;
  birth_date: string | null;
  is_active: boolean;
}

interface CurrentFamilyMemberResolution {
  member: CurrentFamilyMember | null;
  resolvedFamilyId: string | null;
}

const FAMILY_MEMBER_SELECT =
  'id, name, email, role, family_id, avatar_url, birth_date, is_active';

function mapDatabaseFamilyMember(
  member: DatabaseFamilyMemberRecord
): CurrentFamilyMember {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    familyId: member.family_id,
    avatarUrl: member.avatar_url,
    birthDate: member.birth_date,
    isActive: member.is_active,
  };
}

function findCurrentApiFamilyMember(
  members: CurrentFamilyMemberApiRecord[],
  user: User | null,
  roleData: CurrentFamilyMemberRoleResponse
): CurrentFamilyMemberApiRecord | undefined {
  return (
    members.find(
      (member) =>
        (roleData.memberId && member.id === roleData.memberId) ||
        (user?.id &&
          (member.userId === user.id || member.authUserId === user.id)) ||
        (roleData.authUserId &&
          (member.userId === roleData.authUserId ||
            member.authUserId === roleData.authUserId))
    ) ??
    members.find((member) => user?.email && member.email === user.email)
  );
}

function createFallbackKioskMember(
  roleData: CurrentFamilyMemberRoleResponse,
  fallbackName: string
): CurrentFamilyMember | null {
  if (!roleData.memberId || !roleData.familyId) {
    return null;
  }

  return {
    id: roleData.memberId,
    name: fallbackName,
    email: null,
    role: roleData.role ?? 'CHILD',
    familyId: roleData.familyId,
    avatarUrl: null,
    birthDate: null,
    isActive: true,
  };
}

async function resolveKioskCurrentFamilyMember(
  user: User | null,
  fallbackName: string
): Promise<CurrentFamilyMemberResolution> {
  const [roleData, members] = await Promise.all([
    fetchCurrentFamilyRole(user?.id ?? null),
    fetchCurrentFamilyApiMembers(user?.id ?? null),
  ]);

  const currentMember = findCurrentApiFamilyMember(members, user, roleData);

  if (currentMember) {
    return {
      member: mapCurrentFamilyApiMember(currentMember, roleData.role),
      resolvedFamilyId: roleData.familyId ?? currentMember.familyId,
    };
  }

  const fallback = createFallbackKioskMember(roleData, fallbackName);
  return {
    member: fallback,
    resolvedFamilyId: fallback?.familyId ?? roleData.familyId ?? null,
  };
}

async function resolveAuthenticatedCurrentFamilyMember(
  user: User,
  activeFamilyId: string | null
): Promise<CurrentFamilyMemberResolution> {
  const supabase = createClient();
  const resolvedActiveFamilyId =
    activeFamilyId ?? getStoredActiveFamilyId(user.id);

  if (resolvedActiveFamilyId) {
    const { data, error } = await supabase
      .from('family_members')
      .select(FAMILY_MEMBER_SELECT)
      .eq('auth_user_id', user.id)
      .eq('family_id', resolvedActiveFamilyId)
      .eq('is_active', true)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      member: data
        ? mapDatabaseFamilyMember(data as DatabaseFamilyMemberRecord)
        : null,
      resolvedFamilyId: data?.family_id ?? resolvedActiveFamilyId,
    };
  }

  const { data, error } = await supabase
    .from('family_members')
    .select(FAMILY_MEMBER_SELECT)
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const firstMember = (data?.[0] as DatabaseFamilyMemberRecord | undefined) ?? null;
  return {
    member: firstMember ? mapDatabaseFamilyMember(firstMember) : null,
    resolvedFamilyId: firstMember?.family_id ?? null,
  };
}

export function useCurrentMember(
  options: UseCurrentMemberOptions = {}
): UseCurrentMemberResult {
  const {
    activeFamilyId = null,
    familyLoading = false,
    kioskFallbackName = 'Current Member',
    setActiveFamilyId,
  } = options;
  const { user, loading: authLoading } = useSupabaseSession();
  const kioskChildToken = !user ? getCurrentFamilyKioskChildToken() : null;
  const [member, setMember] = useState<CurrentFamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || familyLoading) {
      return;
    }

    if (!user && !kioskChildToken) {
      setMember(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchMember = async () => {
      setLoading(true);
      try {
        const resolution = kioskChildToken
          ? await resolveKioskCurrentFamilyMember(user, kioskFallbackName)
          : await resolveAuthenticatedCurrentFamilyMember(
              user as User,
              activeFamilyId
            );

        if (cancelled) {
          return;
        }

        setMember(resolution.member);
        setError(null);

        if (
          resolution.resolvedFamilyId &&
          resolution.resolvedFamilyId !== activeFamilyId &&
          setActiveFamilyId
        ) {
          setActiveFamilyId(resolution.resolvedFamilyId);
        }
      } catch (err) {
        console.error('Error resolving current family member:', err);
        if (cancelled) {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load current family member'
        );
        setMember(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchMember();

    return () => {
      cancelled = true;
    };
  }, [
    activeFamilyId,
    authLoading,
    familyLoading,
    kioskChildToken,
    kioskFallbackName,
    setActiveFamilyId,
    user,
  ]);

  return {
    user,
    member,
    loading: authLoading || familyLoading || loading,
    error,
    isParent: member?.role === 'PARENT',
    isChild: member?.role === 'CHILD',
  };
}
