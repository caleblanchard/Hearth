'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { createClient } from '@/lib/supabase/client';
import { getActiveFamilyStorageKey } from '@/lib/active-family-storage';

interface ActiveFamilyContextType {
  activeFamilyId: string | null;
  setActiveFamilyId: (familyId: string) => void;
  loading: boolean;
}

export const ActiveFamilyContext = createContext<ActiveFamilyContextType | undefined>(undefined);

export function ActiveFamilyProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useSupabaseSession();
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load and validate active family ID on mount
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setActiveFamilyIdState(null);
      setLoading(false);
      return;
    }

    async function validateAndSetFamily() {
      const supabase = createClient();

      // Get all active family memberships for this user
      const { data: memberships } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('auth_user_id', user!.id)
        .eq('is_active', true);

      const validFamilyIds = new Set(
        (memberships || []).map((m: any) => m.family_id)
      );

      // Try to load stored family ID
      const stored = localStorage.getItem(getActiveFamilyStorageKey(user!.id));

      if (stored && validFamilyIds.has(stored)) {
        // Stored family is still valid
        setActiveFamilyIdState(stored);
      } else if (validFamilyIds.size > 0) {
        // Stored family is stale or missing — fall back to first valid family
        const firstValid = (memberships || [])[0]?.family_id;
        setActiveFamilyIdState(firstValid);
        localStorage.setItem(getActiveFamilyStorageKey(user!.id), firstValid);
      } else {
        // No valid families — clear stored value
        localStorage.removeItem(getActiveFamilyStorageKey(user!.id));
        setActiveFamilyIdState(null);
      }

      setLoading(false);
    }

    validateAndSetFamily();
  }, [user, authLoading]);

  // Function to set active family and persist to localStorage
  const setActiveFamilyId = useCallback((familyId: string) => {
    setActiveFamilyIdState(familyId);
    if (user?.id) {
      localStorage.setItem(getActiveFamilyStorageKey(user.id), familyId);
    }
  }, [user?.id]);

  const value = useMemo(
    () => ({ activeFamilyId, setActiveFamilyId, loading }),
    [activeFamilyId, setActiveFamilyId, loading]
  );

  return (
    <ActiveFamilyContext.Provider value={value}>
      {children}
    </ActiveFamilyContext.Provider>
  );
}

export function useActiveFamily() {
  const context = useContext(ActiveFamilyContext);
  if (context === undefined) {
    throw new Error('useActiveFamily must be used within an ActiveFamilyProvider');
  }
  return context;
}
