'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { createClient } from '@/lib/supabase/client';

interface ActiveFamilyContextType {
  activeFamilyId: string | null;
  setActiveFamilyId: (familyId: string) => void;
  loading: boolean;
}

export const ActiveFamilyContext = createContext<ActiveFamilyContextType | undefined>(undefined);

const STORAGE_KEY = 'hearth_active_family_id';

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
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user!.id}`);

      if (stored && validFamilyIds.has(stored)) {
        // Stored family is still valid
        setActiveFamilyIdState(stored);
      } else if (validFamilyIds.size > 0) {
        // Stored family is stale or missing — fall back to first valid family
        const firstValid = (memberships || [])[0]?.family_id;
        setActiveFamilyIdState(firstValid);
        localStorage.setItem(`${STORAGE_KEY}_${user!.id}`, firstValid);
      } else {
        // No valid families — clear stored value
        localStorage.removeItem(`${STORAGE_KEY}_${user!.id}`);
        setActiveFamilyIdState(null);
      }

      setLoading(false);
    }

    validateAndSetFamily();
  }, [user, authLoading]);

  // Function to set active family and persist to localStorage
  const setActiveFamilyId = (familyId: string) => {
    setActiveFamilyIdState(familyId);
    if (user?.id) {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, familyId);
    }
  };

  return (
    <ActiveFamilyContext.Provider value={{ activeFamilyId, setActiveFamilyId, loading }}>
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
