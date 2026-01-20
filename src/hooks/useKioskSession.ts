import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'kioskSessionToken';

interface KioskMember {
  id: string;
  name: string;
  role?: string;
  avatarUrl?: string;
}

interface KioskSessionState {
  sessionToken: string | null;
  isActive: boolean;
  isLocked: boolean;
  currentMember: KioskMember | null;
  autoLockMinutes: number;
  lastActivityAt?: string;
}

interface UseKioskSessionReturn extends KioskSessionState {
  startSession: (deviceId: string, familyId: string) => Promise<void>;
  endSession: () => Promise<void>;
  updateActivity: () => Promise<void>;
  unlock: (memberId: string, pin: string) => Promise<void>;
  lock: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export function useKioskSession(): UseKioskSessionReturn {
  const [state, setState] = useState<KioskSessionState>({
    sessionToken: null,
    isActive: false,
    isLocked: true,
    currentMember: null,
    autoLockMinutes: 15,
  });

  // Fetch session status from server
  const fetchSessionStatus = useCallback(async (token: string) => {
    try {
      const response = await fetch('/api/kiosk/session', {
        headers: {
          'X-Kiosk-Token': token,
        },
      });

      if (!response.ok) {
        // Session not found or expired, clear local storage
        if (response.status === 404 || response.status === 401) {
          localStorage.removeItem(STORAGE_KEY);
          setState((prev) => ({
            ...prev,
            sessionToken: null,
            isActive: false,
            isLocked: true,
            currentMember: null,
          }));
        }
        return;
      }

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        sessionToken: token,
        isActive: data.isActive,
        isLocked: data.isLocked,
        currentMember: data.currentMember,
        autoLockMinutes: data.autoLockMinutes,
        lastActivityAt: data.lastActivityAt,
      }));
    } catch (error) {
      console.error('Error fetching kiosk session status:', error);
    }
  }, []);

  // Load session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEY);
    if (storedToken) {
      fetchSessionStatus(storedToken);
    }
  }, [fetchSessionStatus]);

  // Start a new kiosk session
  const startSession = useCallback(async (deviceId: string, familyId: string) => {
    const response = await fetch('/api/kiosk/session/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceId, familyId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start kiosk session');
    }

    const data = await response.json();
    const token = data.sessionToken;

    // Save token to localStorage
    localStorage.setItem(STORAGE_KEY, token);

    setState((prev) => ({
      ...prev,
      sessionToken: token,
      isActive: true,
      isLocked: true,
      autoLockMinutes: data.autoLockMinutes,
    }));
  }, []);

  // End the kiosk session
  const endSession = useCallback(async () => {
    if (!state.sessionToken) return;

    const response = await fetch('/api/kiosk/session', {
      method: 'DELETE',
      headers: {
        'X-Kiosk-Token': state.sessionToken,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to end kiosk session');
    }

    // Clear localStorage and reset state
    localStorage.removeItem(STORAGE_KEY);
    setState({
      sessionToken: null,
      isActive: false,
      isLocked: true,
      currentMember: null,
      autoLockMinutes: 15,
    });
  }, [state.sessionToken]);

  // Update activity timestamp
  const updateActivity = useCallback(async () => {
    if (!state.sessionToken) return;

    const response = await fetch('/api/kiosk/session/activity', {
      method: 'POST',
      headers: {
        'X-Kiosk-Token': state.sessionToken,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to update activity');
    }

    const data = await response.json();
    setState((prev) => ({
      ...prev,
      lastActivityAt: data.lastActivityAt,
    }));
  }, [state.sessionToken]);

  // Unlock session with PIN
  const unlock = useCallback(
    async (memberId: string, pin: string) => {
      if (!state.sessionToken) {
        throw new Error('No active kiosk session');
      }

      const response = await fetch('/api/kiosk/session/unlock', {
        method: 'POST',
        headers: {
          'X-Kiosk-Token': state.sessionToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId, pin }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlock session');
      }

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        isLocked: false,
        currentMember: data.member,
      }));
    },
    [state.sessionToken]
  );

  // Lock session
  const lock = useCallback(async () => {
    if (!state.sessionToken) return;

    const response = await fetch('/api/kiosk/session/lock', {
      method: 'POST',
      headers: {
        'X-Kiosk-Token': state.sessionToken,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to lock session');
    }

    setState((prev) => ({
      ...prev,
      isLocked: true,
      currentMember: null,
    }));
  }, [state.sessionToken]);

  // Refresh session status
  const refreshSession = useCallback(async () => {
    if (state.sessionToken) {
      await fetchSessionStatus(state.sessionToken);
    }
  }, [state.sessionToken, fetchSessionStatus]);

  return {
    ...state,
    startSession,
    endSession,
    updateActivity,
    unlock,
    lock,
    refreshSession,
  };
}
