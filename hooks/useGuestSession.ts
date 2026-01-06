'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface GuestSessionInfo {
  sessionToken: string;
  guestName: string;
  accessLevel: 'VIEW_ONLY' | 'LIMITED' | 'CAREGIVER';
  expiresAt: string;
}

export function useGuestSession() {
  const [guestSession, setGuestSession] = useState<GuestSessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for guest session in localStorage or sessionStorage
    const sessionToken = typeof window !== 'undefined' 
      ? localStorage.getItem('guestSessionToken') || sessionStorage.getItem('guestSessionToken')
      : null;

    if (sessionToken) {
      // Validate session with API
      fetch('/api/auth/guest/session', {
        headers: {
          'x-guest-session-token': sessionToken,
        },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          // Session invalid, clear it
          if (typeof window !== 'undefined') {
            localStorage.removeItem('guestSessionToken');
            sessionStorage.removeItem('guestSessionToken');
          }
          return null;
        })
        .then((data) => {
          if (data?.session) {
            setGuestSession(data.session);
          } else {
            setGuestSession(null);
          }
        })
        .catch(() => {
          setGuestSession(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const endSession = async () => {
    const sessionToken = typeof window !== 'undefined' 
      ? localStorage.getItem('guestSessionToken') 
      : null;

    if (!sessionToken) {
      return;
    }

    try {
      const response = await fetch('/api/auth/guest/end-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-guest-session-token': sessionToken,
        },
      });

      if (response.ok) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('guestSessionToken');
          sessionStorage.removeItem('guestSessionToken');
        }
        setGuestSession(null);
        router.push('/guest');
      }
    } catch (error) {
      console.error('Error ending guest session:', error);
    }
  };

  return {
    guestSession,
    loading,
    endSession,
    isGuest: !!guestSession,
  };
}
