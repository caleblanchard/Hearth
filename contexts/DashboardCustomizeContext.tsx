'use client';

import { createContext, useContext, ReactNode } from 'react';

interface DashboardCustomizeContextType {
  openCustomizer: () => void;
}

const DashboardCustomizeContext = createContext<DashboardCustomizeContextType | null>(null);

export function useDashboardCustomize() {
  const context = useContext(DashboardCustomizeContext);
  return context; // Return null if not in provider (other pages)
}

interface DashboardCustomizeProviderProps {
  children: ReactNode;
  onCustomize: () => void;
}

export function DashboardCustomizeProvider({
  children,
  onCustomize,
}: DashboardCustomizeProviderProps) {
  return (
    <DashboardCustomizeContext.Provider value={{ openCustomizer: onCustomize }}>
      {children}
    </DashboardCustomizeContext.Provider>
  );
}
