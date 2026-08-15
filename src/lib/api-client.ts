/**
 * API Client Utilities
 * 
 * Provides helpers for making authenticated API requests
 * that work with both Supabase sessions and guest sessions
 */

/**
 * Get default headers for API requests
 * Automatically includes guest session token if available
 */
export function getApiHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add guest session token if available
  if (typeof window !== 'undefined') {
    const guestSessionToken = localStorage.getItem('guestSessionToken') || 
                              sessionStorage.getItem('guestSessionToken');
    if (guestSessionToken) {
      headers['x-guest-session-token'] = guestSessionToken;
    }
  }

  return headers;
}

/**
 * Build a query string from a params object, skipping empty values
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | null | undefined>
): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue
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
