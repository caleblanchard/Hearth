import { renderHook, waitFor, act } from '@testing-library/react';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';

// Mock fetch
global.fetch = jest.fn();

describe('useDashboardWidgets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  const mockWidgetData = {
    transport: {
      success: true,
      data: { todaySchedules: [] },
    },
    weather: {
      success: true,
      data: { current: { temp: 65 } },
    },
  };

  it('should initialize with loading state', () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockWidgetData,
    });

    const { result } = renderHook(() =>
      useDashboardWidgets({ widgets: ['transport', 'weather'] })
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual({});
    expect(result.current.error).toBeNull();
  });

  it('should fetch widget data on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockWidgetData,
    });

    const { result } = renderHook(() =>
      useDashboardWidgets({ widgets: ['transport', 'weather'] })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockWidgetData);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/dashboard/widgets?widgets')
    );
  });

  it('should pass memberId in query if provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockWidgetData,
    });

    renderHook(() =>
      useDashboardWidgets({
        widgets: ['transport'],
        memberId: 'member-123',
      })
    );

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall).toContain('/api/dashboard/widgets');
      expect(lastCall).toContain('transport');
      expect(lastCall).toContain('memberId=member-123');
    });
  });

  it('should handle fetch errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    const { result } = renderHook(() =>
      useDashboardWidgets({ widgets: ['transport'] })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toEqual({});
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useDashboardWidgets({ widgets: ['transport'] })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('Network error');
  });

  it('should refetch data when refetch is called', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockWidgetData,
    });

    const { result } = renderHook(() =>
      useDashboardWidgets({ widgets: ['transport'] })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should auto-refresh at specified interval', async () => {
    jest.useFakeTimers();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockWidgetData,
    });

    renderHook(() =>
      useDashboardWidgets({
        widgets: ['transport'],
        refreshInterval: 10000, // 10 seconds
      })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const initialCalls = (global.fetch as jest.Mock).mock.calls.length;

    // Advance time by 10 seconds
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(initialCalls);
    });

    jest.useRealTimers();
  });

  it('should use default refresh interval of 5 minutes', async () => {
    jest.useFakeTimers();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockWidgetData,
    });

    renderHook(() => useDashboardWidgets({ widgets: ['transport'] }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const initialCalls = (global.fetch as jest.Mock).mock.calls.length;

    // Advance time by 5 minutes
    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(initialCalls);
    });

    jest.useRealTimers();
  });

  it('should cleanup interval on unmount', async () => {
    jest.useFakeTimers();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockWidgetData,
    });

    const { unmount } = renderHook(() =>
      useDashboardWidgets({
        widgets: ['transport'],
        refreshInterval: 10000,
      })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const callsBeforeUnmount = (global.fetch as jest.Mock).mock.calls.length;

    unmount();

    // Advance time after unmount
    act(() => {
      jest.advanceTimersByTime(20000);
    });

    // Should not fetch again after unmount
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(callsBeforeUnmount);

    jest.useRealTimers();
  });

  it('should refetch when widgets array changes', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockWidgetData,
    });

    const { rerender } = renderHook(
      ({ widgets }) => useDashboardWidgets({ widgets }),
      {
        initialProps: { widgets: ['transport'] },
      }
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    rerender({ widgets: ['transport', 'weather'] });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    const lastCall = (global.fetch as jest.Mock).mock.calls[1][0];
    expect(lastCall).toContain('/api/dashboard/widgets');
    expect(lastCall).toContain('transport');
    expect(lastCall).toContain('weather');
  });

  it('should handle empty widgets array', async () => {
    const { result } = renderHook(() => useDashboardWidgets({ widgets: [] }));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({});
    expect(result.current.error).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
