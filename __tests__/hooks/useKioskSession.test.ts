import { renderHook, act, waitFor } from '@testing-library/react';
import { useKioskSession } from '@/hooks/useKioskSession';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useKioskSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('initialization', () => {
    it('should initialize with no session', () => {
      const { result } = renderHook(() => useKioskSession());

      expect(result.current.sessionToken).toBeNull();
      expect(result.current.isActive).toBe(false);
      expect(result.current.isLocked).toBe(true);
      expect(result.current.currentMember).toBeNull();
      expect(result.current.autoLockMinutes).toBe(15);
    });

    it('should load sessionToken from localStorage on mount', async () => {
      localStorageMock.setItem('kioskSessionToken', 'existing-token');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          isActive: true,
          isLocked: false,
          currentMember: { id: 'member-1', name: 'Test Member' },
          autoLockMinutes: 20,
        }),
      });

      const { result } = renderHook(() => useKioskSession());

      await waitFor(() => {
        expect(result.current.sessionToken).toBe('existing-token');
        expect(result.current.isActive).toBe(true);
        expect(result.current.isLocked).toBe(false);
      });
    });

    it('should fetch session status on mount if token exists', async () => {
      localStorageMock.setItem('kioskSessionToken', 'test-token');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          isActive: true,
          isLocked: true,
          currentMember: null,
          autoLockMinutes: 15,
        }),
      });

      renderHook(() => useKioskSession());

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/kiosk/session', {
          headers: { 'X-Kiosk-Token': 'test-token' },
        });
      });
    });
  });

  describe('startSession', () => {
    it('should start a new kiosk session', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionToken: 'new-token',
          autoLockMinutes: 15,
          enabledWidgets: ['transport', 'medication'],
        }),
      });

      const { result } = renderHook(() => useKioskSession());

      await act(async () => {
        await result.current.startSession('device-123', 'family-456');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/kiosk/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: 'device-123', familyId: 'family-456' }),
      });

      expect(result.current.sessionToken).toBe('new-token');
      expect(localStorageMock.getItem('kioskSessionToken')).toBe('new-token');
    });

    it('should handle startSession errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' }),
      });

      const { result } = renderHook(() => useKioskSession());

      await expect(
        act(async () => {
          await result.current.startSession('device-123', 'family-456');
        })
      ).rejects.toThrow();
    });
  });

  describe('endSession', () => {
    it('should end the kiosk session', async () => {
      localStorageMock.setItem('kioskSessionToken', 'test-token');

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ isActive: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => useKioskSession());

      await waitFor(() => {
        expect(result.current.sessionToken).toBe('test-token');
      });

      await act(async () => {
        await result.current.endSession();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/kiosk/session', {
        method: 'DELETE',
        headers: { 'X-Kiosk-Token': 'test-token' },
      });

      expect(result.current.sessionToken).toBeNull();
      expect(localStorageMock.getItem('kioskSessionToken')).toBeNull();
    });
  });

  describe('updateActivity', () => {
    it('should update last activity timestamp', async () => {
      localStorageMock.setItem('kioskSessionToken', 'test-token');

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ isActive: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, lastActivityAt: new Date().toISOString() }),
        });

      const { result } = renderHook(() => useKioskSession());

      await waitFor(() => {
        expect(result.current.sessionToken).toBe('test-token');
      });

      await act(async () => {
        await result.current.updateActivity();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/kiosk/session/activity', {
        method: 'POST',
        headers: { 'X-Kiosk-Token': 'test-token' },
      });
    });
  });

  describe('unlock', () => {
    it('should unlock session with valid PIN', async () => {
      localStorageMock.setItem('kioskSessionToken', 'test-token');

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ isActive: true, isLocked: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            member: { id: 'member-1', name: 'Test Child' },
          }),
        });

      const { result } = renderHook(() => useKioskSession());

      // Wait for initial session load to complete
      await waitFor(() => {
        expect(result.current.sessionToken).toBe('test-token');
        expect(result.current.isLocked).toBe(true);
      });

      await act(async () => {
        await result.current.unlock('member-1', '1234');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/kiosk/session/unlock', {
        method: 'POST',
        headers: {
          'X-Kiosk-Token': 'test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId: 'member-1', pin: '1234' }),
      });

      expect(result.current.isLocked).toBe(false);
      expect(result.current.currentMember).toEqual({ id: 'member-1', name: 'Test Child' });
    });

    it('should handle unlock errors', async () => {
      localStorageMock.setItem('kioskSessionToken', 'test-token');

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ isActive: true }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ error: 'Invalid PIN' }),
        });

      const { result } = renderHook(() => useKioskSession());

      await waitFor(() => {
        expect(result.current.sessionToken).toBe('test-token');
      });

      await act(async () => {
        await expect(result.current.unlock('member-1', 'wrong-pin')).rejects.toThrow();
      });
    });
  });

  describe('lock', () => {
    it('should lock the session', async () => {
      localStorageMock.setItem('kioskSessionToken', 'test-token');

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            isActive: true,
            isLocked: false,
            currentMember: { id: 'member-1', name: 'Test Child' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => useKioskSession());

      // Wait for initial session load to complete
      await waitFor(() => {
        expect(result.current.sessionToken).toBe('test-token');
        expect(result.current.isLocked).toBe(false);
      });

      await act(async () => {
        await result.current.lock();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/kiosk/session/lock', {
        method: 'POST',
        headers: { 'X-Kiosk-Token': 'test-token' },
      });

      expect(result.current.isLocked).toBe(true);
      expect(result.current.currentMember).toBeNull();
    });
  });
});
