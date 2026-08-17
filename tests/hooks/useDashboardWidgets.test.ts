import { renderHook, waitFor, act } from '@testing-library/react';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';

// Mock fetch
global.fetch = jest.fn();

describe('useDashboardWidgets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  const mockCollection = {
    capturedAt: '2026-05-19T15:00:00.000Z',
    partial: false,
    requested: ['transport', 'weather'],
    issues: [],
    widgets: {
      transport: {
        kind: 'transport',
        state: 'ready',
        data: { schedules: [] },
      },
      weather: {
        kind: 'weather',
        state: 'ready',
        data: { current: { temp: 65 } },
      },
    },
  };

  it('should initialize with loading state', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() =>
      useDashboardWidgets({ widgets: ['transport', 'weather'] })
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual({});
    expect(result.current.error).toBeNull();
  });

  it('should fetch widget collection on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCollection,
    });

    const { result } = renderHook(() =>
      useDashboardWidgets({ widgets: ['transport', 'weather'] })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockCollection.widgets);
    expect(result.current.partial).toBe(false);
    expect(result.current.capturedAt).toBe(mockCollection.capturedAt);
    expect(result.current.error).toBeNull();
    const firstCallUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(firstCallUrl).toContain('/api/dashboard/widgets?widgets');
    expect(firstCallUrl).toContain('transport');
    expect(firstCallUrl).toContain('weather');
  });

  it('should pass memberId in query if provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCollection,
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

  it('should expose partial results and issues', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockCollection,
        partial: true,
        issues: [{ kind: 'weather', message: 'Weather unavailable' }],
        widgets: {
          ...mockCollection.widgets,
          weather: {
            kind: 'weather',
            state: 'unavailable',
            error: 'Weather unavailable',
          },
        },
      }),
    });

    const { result } = renderHook(() =>
      useDashboardWidgets({ widgets: ['transport', 'weather'] })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.partial).toBe(true);
    expect(result.current.issues).toEqual([
      { kind: 'weather', message: 'Weather unavailable' },
    ]);
    expect(result.current.data.weather).toEqual({
      kind: 'weather',
      state: 'unavailable',
      error: 'Weather unavailable',
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
      json: async () => mockCollection,
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
      json: async () => mockCollection,
    });

    renderHook(() =>
      useDashboardWidgets({
        widgets: ['transport'],
        refreshInterval: 10000,
      })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const initialCalls = (global.fetch as jest.Mock).mock.calls.length;

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
      json: async () => mockCollection,
    });

    renderHook(() => useDashboardWidgets({ widgets: ['transport'] }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const initialCalls = (global.fetch as jest.Mock).mock.calls.length;

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
      json: async () => mockCollection,
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

    act(() => {
      jest.advanceTimersByTime(20000);
    });

    expect((global.fetch as jest.Mock).mock.calls.length).toBe(callsBeforeUnmount);

    jest.useRealTimers();
  });

  it('should refetch when widgets array changes', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCollection,
    });

    const { rerender } = renderHook(
      ({ widgets }: { widgets: Array<'transport' | 'weather'> }) =>
        useDashboardWidgets({ widgets }),
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
