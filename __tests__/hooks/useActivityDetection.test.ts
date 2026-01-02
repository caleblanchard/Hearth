import { renderHook } from '@testing-library/react';
import { useActivityDetection } from '@/hooks/useActivityDetection';
import { fireEvent } from '@testing-library/react';

describe('useActivityDetection', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call onActivity when mouse moves', () => {
    const onActivity = jest.fn();
    renderHook(() => useActivityDetection({ onActivity }));

    fireEvent.mouseMove(document);

    jest.runAllTimers();

    expect(onActivity).toHaveBeenCalledTimes(1);
  });

  it('should call onActivity when touch starts', () => {
    const onActivity = jest.fn();
    renderHook(() => useActivityDetection({ onActivity }));

    fireEvent.touchStart(document);

    jest.runAllTimers();

    expect(onActivity).toHaveBeenCalledTimes(1);
  });

  it('should call onActivity when key is pressed', () => {
    const onActivity = jest.fn();
    renderHook(() => useActivityDetection({ onActivity }));

    fireEvent.keyDown(document);

    jest.runAllTimers();

    expect(onActivity).toHaveBeenCalledTimes(1);
  });

  it('should throttle activity callbacks', () => {
    const onActivity = jest.fn();
    renderHook(() =>
      useActivityDetection({
        onActivity,
        throttleMs: 5000,
      })
    );

    // Fire multiple events quickly
    fireEvent.mouseMove(document);
    fireEvent.mouseMove(document);
    fireEvent.mouseMove(document);

    jest.runAllTimers();

    // Should only call once due to throttling
    expect(onActivity).toHaveBeenCalledTimes(1);
  });

  it('should call onActivity again after throttle period', () => {
    const onActivity = jest.fn();
    renderHook(() =>
      useActivityDetection({
        onActivity,
        throttleMs: 5000,
      })
    );

    fireEvent.mouseMove(document);
    jest.runAllTimers();

    expect(onActivity).toHaveBeenCalledTimes(1);

    // Advance time past throttle period
    jest.advanceTimersByTime(5000);

    fireEvent.mouseMove(document);
    jest.runAllTimers();

    expect(onActivity).toHaveBeenCalledTimes(2);
  });

  it('should use default throttle of 5000ms', () => {
    const onActivity = jest.fn();
    renderHook(() => useActivityDetection({ onActivity }));

    fireEvent.mouseMove(document);
    jest.runAllTimers();

    expect(onActivity).toHaveBeenCalledTimes(1);

    // Fire event before 5 seconds
    jest.advanceTimersByTime(4000);
    fireEvent.mouseMove(document);
    jest.runAllTimers();

    // Should not call again (still throttled)
    expect(onActivity).toHaveBeenCalledTimes(1);

    // Fire event after 5 seconds
    jest.advanceTimersByTime(1000);
    fireEvent.mouseMove(document);
    jest.runAllTimers();

    // Should call again
    expect(onActivity).toHaveBeenCalledTimes(2);
  });

  it('should cleanup event listeners on unmount', () => {
    const onActivity = jest.fn();
    const { unmount } = renderHook(() => useActivityDetection({ onActivity }));

    // Verify listeners work before unmount
    fireEvent.mouseMove(document);
    jest.runAllTimers();
    expect(onActivity).toHaveBeenCalledTimes(1);

    unmount();

    // Events after unmount should not trigger callback
    fireEvent.mouseMove(document);
    fireEvent.touchStart(document);
    fireEvent.keyDown(document);
    jest.runAllTimers();

    expect(onActivity).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple activity types', () => {
    const onActivity = jest.fn();
    renderHook(() =>
      useActivityDetection({
        onActivity,
        throttleMs: 1000,
      })
    );

    fireEvent.mouseMove(document);
    jest.runAllTimers();
    expect(onActivity).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);

    fireEvent.touchStart(document);
    jest.runAllTimers();
    expect(onActivity).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(1000);

    fireEvent.keyDown(document);
    jest.runAllTimers();
    expect(onActivity).toHaveBeenCalledTimes(3);
  });

  it('should update onActivity callback when it changes', () => {
    const onActivity1 = jest.fn();
    const onActivity2 = jest.fn();

    const { rerender } = renderHook(
      ({ callback }) => useActivityDetection({ onActivity: callback }),
      {
        initialProps: { callback: onActivity1 },
      }
    );

    fireEvent.mouseMove(document);
    jest.runAllTimers();

    expect(onActivity1).toHaveBeenCalledTimes(1);
    expect(onActivity2).not.toHaveBeenCalled();

    rerender({ callback: onActivity2 });

    jest.advanceTimersByTime(5000);

    fireEvent.mouseMove(document);
    jest.runAllTimers();

    expect(onActivity1).toHaveBeenCalledTimes(1);
    expect(onActivity2).toHaveBeenCalledTimes(1);
  });
});
