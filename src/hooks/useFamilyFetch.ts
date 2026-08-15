'use client';

import { useActiveFamily } from '@/contexts/ActiveFamilyContext';
import { getStoredActiveFamilyId } from '@/lib/active-family-storage';

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
export function addActiveFamilyHeader(
  headers: HeadersInit = {},
  userId?: string | null
): Headers {
  const headersObj = new Headers(headers);

  const familyId = getStoredActiveFamilyId(userId);
  if (familyId) {
    headersObj.set('x-active-family-id', familyId);
  }

  return headersObj;
}
