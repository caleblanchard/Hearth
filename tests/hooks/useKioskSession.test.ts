import { act, renderHook, waitFor } from '@testing-library/react';
import { useKioskSession } from '@/hooks/useKioskSession';

describe('useKioskSession', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  const mockResponse = (data: unknown = {}, ok = true) =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(data),
    } as Response);

  const deviceSecret = 'device-secret';
  const childToken = 'child-token';

  it('activates device and stores secret', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ deviceSecret }));

    const { result } = renderHook(() => useKioskSession());

    await act(async () => {
      await result.current.activateDevice('123456', 'device-1');
    });

    expect(localStorage.getItem('kioskDeviceSecret')).toBe(deviceSecret);
    expect(result.current.deviceSecret).toBe(deviceSecret);
    expect(result.current.isLocked).toBe(true);
  });

  it('unlocks child session and stores token', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ deviceSecret }))
      .mockResolvedValueOnce(mockResponse({ token: childToken }));

    const member = { id: 'child-id', name: 'Test' };
    const { result } = renderHook(() => useKioskSession());

    await act(async () => {
      await result.current.activateDevice('123456', 'device-1');
    });
    await waitFor(() => expect(result.current.deviceSecret).toBe(deviceSecret));

    await act(async () => {
      await result.current.unlock(member, '1234');
    });

    expect(localStorage.getItem('kioskChildToken')).toBe(childToken);
    expect(result.current.childToken).toBe(childToken);
    expect(result.current.isLocked).toBe(false);
    expect(result.current.currentMember).toEqual(member);
  });

  it('clears child session on logout', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ deviceSecret }))
      .mockResolvedValueOnce(mockResponse({ token: childToken }))
      .mockResolvedValueOnce(mockResponse({}));

    const { result } = renderHook(() => useKioskSession());
    await act(async () => {
      await result.current.activateDevice('123456', 'device-1');
    });
    await waitFor(() => expect(result.current.deviceSecret).toBe(deviceSecret));

    await act(async () => {
      await result.current.unlock({ id: 'child-id', name: 'Test' }, '1234');
    });
    await waitFor(() => expect(result.current.childToken).toBe(childToken));

    await act(async () => {
      await result.current.logoutChild();
    });

    expect(localStorage.getItem('kioskChildToken')).toBeNull();
    expect(result.current.childToken).toBeNull();
    expect(result.current.isLocked).toBe(true);
    expect(result.current.currentMember).toBeNull();
  });

  it('clears device on clearDevice', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ deviceSecret }))
      .mockResolvedValueOnce(mockResponse({ token: childToken }));

    const { result } = renderHook(() => useKioskSession());
    await act(async () => {
      await result.current.activateDevice('123456', 'device-1');
    });
    await waitFor(() => expect(result.current.deviceSecret).toBe(deviceSecret));

    await act(async () => {
      await result.current.unlock({ id: 'child-id', name: 'Test' }, '1234');
    });
    await waitFor(() => expect(result.current.childToken).toBe(childToken));

    await act(async () => {
      result.current.clearDevice();
    });

    expect(localStorage.getItem('kioskDeviceSecret')).toBeNull();
    expect(localStorage.getItem('kioskChildToken')).toBeNull();
    expect(result.current.deviceSecret).toBeNull();
    expect(result.current.childToken).toBeNull();
    expect(result.current.isLocked).toBe(true);
  });

  it('sends heartbeat when child token present', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ deviceSecret }))
      .mockResolvedValueOnce(mockResponse({ token: childToken }))
      .mockResolvedValueOnce(mockResponse({}));

    const { result } = renderHook(() => useKioskSession());
    await act(async () => {
      await result.current.activateDevice('123456', 'device-1');
    });
    await waitFor(() => expect(result.current.deviceSecret).toBe(deviceSecret));

    await act(async () => {
      await result.current.unlock({ id: 'child-id', name: 'Test' }, '1234');
    });
    await waitFor(() => expect(result.current.childToken).toBe(childToken));

    await act(async () => {
      await result.current.heartbeat();
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/kiosk/session/heartbeat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Kiosk-Child': childToken }),
      })
    );
  });
});
