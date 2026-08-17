/**
 * API Client Utilities
 * 
 * Provides helpers for making authenticated API requests
 * that work with both Supabase sessions and guest sessions
 */

import { getStoredActiveFamilyId } from '@/lib/active-family-storage';

/**
 * Get default headers for API requests
 * Automatically includes guest session token, active family id,
 * and kiosk credentials if available
 */
export function getApiHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    // Add guest session token if available
    const guestSessionToken = localStorage.getItem('guestSessionToken') ||
                              sessionStorage.getItem('guestSessionToken');
    if (guestSessionToken) {
      headers['x-guest-session-token'] = guestSessionToken;
    }

    // Add active family id if available
    const activeFamilyId = getStoredActiveFamilyId();
    if (activeFamilyId) {
      headers['x-active-family-id'] = activeFamilyId;
    }

    // Add kiosk credentials if available
    const childToken = localStorage.getItem('kioskChildToken');
    if (childToken) {
      headers['X-Kiosk-Child'] = childToken;
    } else {
      const deviceSecret = localStorage.getItem('kioskDeviceSecret');
      if (deviceSecret) {
        headers['X-Kiosk-Device'] = deviceSecret;
      }
    }
  }

  return headers;
}

/**
 * Build a query string from a params object, skipping empty values
 * Array values are repeated as separate query params (e.g. `a=1&a=2`)
 */
export function buildQueryString(
  params: Record<
    string,
    string | number | boolean | null | undefined | Array<string | number | boolean>
  >
): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === null || item === undefined || item === '') continue
        search.append(key, String(item))
      }
      continue
    }
    search.set(key, String(value))
  }

  const serialized = search.toString()
  return serialized ? `?${serialized}` : ''
}

/**
 * Make an authenticated API request
 * Automatically includes guest session token if available
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = {
    ...getApiHeaders(),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API request failed: ${response.statusText}`);
  }

  return response.json();
}
