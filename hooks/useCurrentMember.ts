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
  const [member, setMember] = useState<CurrentMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMember() {
      if (authLoading) return;
      
      if (!user) {
        setMember(null);
        setLoading(false);
        return;
      }

      try {
        // Use separate endpoints due to Next.js routing bug with /api/family
        const [roleRes, membersRes] = await Promise.all([
          fetch('/api/user/role'),
          fetch('/api/family/members'),
        ]);

        if (!roleRes.ok || !membersRes.ok) {
          throw new Error('Failed to fetch member data');
        }

        const roleData = await roleRes.json();
        const membersData = await membersRes.json();

        const currentMember = membersData.members?.find(
          (m: any) => m.email === user.email || m.userId === user.id
        );

        if (currentMember) {
          setMember({
            id: currentMember.id,
            name: currentMember.name,
            email: currentMember.email,
            role: roleData.role,
            familyId: currentMember.familyId,
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
  }, [user, authLoading]);

  return {
    member,
    loading: loading || authLoading,
    error,
    isParent: member?.role === 'PARENT',
    isChild: member?.role === 'CHILD',
  };
}
