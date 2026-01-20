'use client';

import { useActiveFamily } from '@/contexts/ActiveFamilyContext';

/**
 * Custom fetch hook that automatically adds the active family ID header
 * to all API requests. This ensures all server-side queries are scoped
 * to the correct family in multi-family environments.
 */
export function useFamilyFetch() {
  const { activeFamilyId } = useActiveFamily();

  const familyFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    
    // Add active family ID header if available
    if (activeFamilyId) {
      headers.set('x-active-family-id', activeFamilyId);
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  return familyFetch;
}

/**
 * Helper function for components that can't use hooks
 * Gets active family ID from localStorage and adds header
 */
export function addActiveFamilyHeader(headers: HeadersInit = {}): Headers {
  const headersObj = new Headers(headers);
  
  // Get user ID from session to construct storage key
  // This is a fallback - prefer using the hook when possible
  if (typeof window !== 'undefined') {
    // Try to get from any stored family ID (checking all potential user IDs)
    const allKeys = Object.keys(localStorage);
    const familyKey = allKeys.find(key => key.startsWith('hearth_active_family_id_'));
    
    if (familyKey) {
      const familyId = localStorage.getItem(familyKey);
      if (familyId) {
        headersObj.set('x-active-family-id', familyId);
      }
    }
  }
  
  return headersObj;
}
