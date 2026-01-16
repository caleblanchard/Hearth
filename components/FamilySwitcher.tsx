'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useActiveFamily } from '@/contexts/ActiveFamilyContext';

interface Family {
  id: string;
  name: string;
}

export function FamilySwitcher() {
  const router = useRouter();
  const { activeFamilyId, setActiveFamilyId } = useActiveFamily();
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadFamilies();
  }, []);

  const loadFamilies = async () => {
    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all families user belongs to
      const { data: memberships } = await supabase
        .from('family_members')
        .select(`
          id,
          family_id,
          families:families(id, name)
        `)
        .eq('auth_user_id', user.id)
        .eq('is_active', true);

      if (memberships) {
        const familyList = memberships
          .map(m => m.families)
          .filter(Boolean) as Family[];
        
        setFamilies(familyList);
      }
    } catch (error) {
      console.error('Error loading families:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchFamily = async (familyId: string) => {
    // Update active family in context (persists to localStorage)
    setActiveFamilyId(familyId);
    setIsOpen(false);
    
    // Hard reload the page to ensure all data refreshes with new family
    // This is more reliable than router.refresh() for client-side state
    window.location.reload();
  };

  if (loading) {
    return null;
  }

  const currentFamily = families.find(f => f.id === activeFamilyId) || families[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {currentFamily?.name || 'Select Family'}
        </span>
        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown - Opens UPWARD */}
          <div className="absolute left-0 bottom-full mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <div className="p-2 max-h-80 overflow-y-auto">
              {families.length > 1 && (
                <>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2">
                    YOUR FAMILIES
                  </div>
                  
                  {families.map(family => (
                    <button
                      key={family.id}
                      onClick={() => switchFamily(family.id)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        family.id === activeFamilyId
                          ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {family.id === activeFamilyId && (
                          <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="text-sm font-medium">{family.name}</span>
                      </div>
                    </button>
                  ))}
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                </>
              )}
              
              {families.length === 1 && (
                <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                  <p className="mb-3">Create an additional family to manage multiple households.</p>
                </div>
              )}
              
              <a
                href="/onboarding"
                className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Family
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
