import { renderHook, act } from '@testing-library/react';
import { useKioskAutoLock } from '@/hooks/useKioskAutoLock';

describe('useKioskAutoLock', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with full time remaining', () => {
    const onLock = jest.fn();
    const { result } = renderHook(() =>
      useKioskAutoLock({
        autoLockMinutes: 15,
        onLock,
        isLocked: false,
      })
    );

    expect(result.current.timeUntilLock).toBe(15 * 60); // 900 seconds
  });

  it('should count down every second', () => {
    const onLock = jest.fn();
    const { result } = renderHook(() =>
      useKioskAutoLock({
        autoLockMinutes: 1,
        onLock,
        isLocked: false,
      })
    );

    expect(result.current.timeUntilLock).toBe(60);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.timeUntilLock).toBe(59);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.timeUntilLock).toBe(54);
  });

  it('should call onLock when timer reaches 0', () => {
    const onLock = jest.fn();
    const { result } = renderHook(() =>
      useKioskAutoLock({
        autoLockMinutes: 1,
        onLock,
        isLocked: false,
      })
    );

    expect(onLock).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(60000); // 60 seconds
    });

    expect(result.current.timeUntilLock).toBe(0);
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it('should not count down when already locked', () => {
    const onLock = jest.fn();
    const { result } = renderHook(() =>
      useKioskAutoLock({
        autoLockMinutes: 1,
        onLock,
        isLocked: true,
      })
    );

    const initialTime = result.current.timeUntilLock;

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.timeUntilLock).toBe(initialTime);
    expect(onLock).not.toHaveBeenCalled();
  });

  it('should reset timer when resetTimer is called', () => {
    const onLock = jest.fn();
    const { result } = renderHook(() =>
      useKioskAutoLock({
        autoLockMinutes: 2,
        onLock,
        isLocked: false,
      })
    );

    expect(result.current.timeUntilLock).toBe(120);

    act(() => {
      jest.advanceTimersByTime(30000); // 30 seconds
    });

    expect(result.current.timeUntilLock).toBe(90);

    act(() => {
      result.current.resetTimer();
    });

    expect(result.current.timeUntilLock).toBe(120);
  });

  it('should update timer when autoLockMinutes changes', () => {
    const onLock = jest.fn();
    const { result, rerender } = renderHook(
      ({ autoLockMinutes }) =>
        useKioskAutoLock({
          autoLockMinutes,
          onLock,
          isLocked: false,
        }),
      {
        initialProps: { autoLockMinutes: 15 },
      }
    );

    expect(result.current.timeUntilLock).toBe(15 * 60);

    rerender({ autoLockMinutes: 20 });

    expect(result.current.timeUntilLock).toBe(20 * 60);
  });

  it('should stop timer when isLocked becomes true', () => {
    const onLock = jest.fn();
    const { result, rerender } = renderHook(
      ({ isLocked }) =>
        useKioskAutoLock({
          autoLockMinutes: 1,
          onLock,
          isLocked,
        }),
      {
        initialProps: { isLocked: false },
      }
    );

    act(() => {
      jest.advanceTimersByTime(10000); // 10 seconds
    });

    expect(result.current.timeUntilLock).toBe(50);

    rerender({ isLocked: true });

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Timer should not continue counting down
    expect(result.current.timeUntilLock).toBe(50);
  });

  it('should resume timer when isLocked becomes false', () => {
    const onLock = jest.fn();
    const { result, rerender } = renderHook(
      ({ isLocked }) =>
        useKioskAutoLock({
          autoLockMinutes: 1,
          onLock,
          isLocked,
        }),
      {
        initialProps: { isLocked: true },
      }
    );

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Timer should not count down while locked
    expect(result.current.timeUntilLock).toBe(60);

    rerender({ isLocked: false });

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Timer should resume countdown
    expect(result.current.timeUntilLock).toBe(50);
  });

  it('should cleanup timer on unmount', () => {
    const onLock = jest.fn();
    const { unmount } = renderHook(() =>
      useKioskAutoLock({
        autoLockMinutes: 1,
        onLock,
        isLocked: false,
      })
    );

    const timerCount = jest.getTimerCount();
    expect(timerCount).toBeGreaterThan(0);

    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });
});
