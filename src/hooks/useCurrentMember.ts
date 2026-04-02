'use client';

import { useState, useEffect } from 'react';
import { useSupabaseSession } from './useSupabaseSession';

interface CurrentMember {
  id: string;
  name: string;
  email: string;
  role: 'PARENT' | 'CHILD';
  familyId: string;
}

/**
 * Hook to get the current user's family member data including role
 * Use this instead of checking user.user_metadata.role which doesn't exist
 */
export function useCurrentMember() {
  const { user, loading: authLoading } = useSupabaseSession();
  const kioskChild =
    typeof window !== 'undefined' && !user ? localStorage.getItem('kioskChildToken') : null;
  const [member, setMember] = useState<CurrentMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMember() {
      if (authLoading) return;

      // Avoid treating normal parent sessions as kiosk when kiosk token lingers
      const kioskToken = kioskChild && !user ? kioskChild : null;

      if (!user && !kioskToken) {
        setMember(null);
        setLoading(false);
        return;
      }
      try {
        // Use separate endpoints due to Next.js routing bug with /api/family
        const headers: HeadersInit = {};
        if (kioskToken) headers['X-Kiosk-Child'] = kioskToken;

        const [roleRes, membersRes] = await Promise.all([
          fetch('/api/user/role', { headers }),
          fetch('/api/family/members', { headers }),
        ]);

        if (!roleRes.ok || !membersRes.ok) {
          throw new Error('Failed to fetch member data');
        }

        const roleData = await roleRes.json();
        const membersData = await membersRes.json();

        const currentMember =
          membersData.members?.find((m: any) => {
            if (roleData?.memberId && m.id === roleData.memberId) return true;
            if (user?.id && (m.userId === user.id || m.authUserId === user.id)) return true;
            // Also match on auth_user_id from role response
            if (roleData?.authUserId && (m.userId === roleData.authUserId || m.authUserId === roleData.authUserId)) return true;
            return false;
          }) || membersData.members?.find((m: any) => user?.email && m.email === user.email);

        const resolvedRole = currentMember?.role || roleData.role;

        if (currentMember) {
          setMember({
            id: currentMember.id,
            name: currentMember.name,
            email: currentMember.email,
            role: resolvedRole,
            familyId: currentMember.familyId,
          });
        } else if (roleData?.memberId && roleData?.familyId) {
          setMember({
            id: roleData.memberId,
            name: 'Current Member',
            email: user?.email || '',
            role: resolvedRole,
            familyId: roleData.familyId,
          });
        } else {
          setMember(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load member data');
        setMember(null);
      } finally {
        setLoading(false);
      }
    }

    fetchMember();
  }, [user, authLoading, kioskChild]);

  return {
    member,
    loading: loading || authLoading,
    error,
    isParent: member?.role === 'PARENT',
    isChild: member?.role === 'CHILD',
  };
}
