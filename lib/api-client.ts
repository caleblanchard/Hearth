/**
 * API Client Utilities
 * 
 * Provides helpers for making authenticated API requests
 * that work with both NextAuth sessions and guest sessions
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
