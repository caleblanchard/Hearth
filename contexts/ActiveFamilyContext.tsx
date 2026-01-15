'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';

interface ActiveFamilyContextType {
  activeFamilyId: string | null;
  setActiveFamilyId: (familyId: string) => void;
  loading: boolean;
}

const ActiveFamilyContext = createContext<ActiveFamilyContextType | undefined>(undefined);

const STORAGE_KEY = 'hearth_active_family_id';

export function ActiveFamilyProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useSupabaseSession();
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load active family ID from localStorage on mount
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setActiveFamilyIdState(null);
      setLoading(false);
      return;
    }

    // Try to load from localStorage
    const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    if (stored) {
      setActiveFamilyIdState(stored);
    }
    setLoading(false);
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
