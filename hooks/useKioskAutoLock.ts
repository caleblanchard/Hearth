import { useState, useEffect, useCallback, useRef } from 'react';

interface UseKioskAutoLockParams {
  autoLockMinutes: number;
  onLock: () => void;
  isLocked: boolean;
}

interface UseKioskAutoLockReturn {
  timeUntilLock: number; // seconds remaining
  resetTimer: () => void;
}

export function useKioskAutoLock({
  autoLockMinutes,
  onLock,
  isLocked,
}: UseKioskAutoLockParams): UseKioskAutoLockReturn {
  const [timeUntilLock, setTimeUntilLock] = useState(autoLockMinutes * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onLockRef = useRef(onLock);

  // Keep onLock ref up to date
  useEffect(() => {
    onLockRef.current = onLock;
  }, [onLock]);

  // Update time when autoLockMinutes changes
  useEffect(() => {
    setTimeUntilLock(autoLockMinutes * 60);
  }, [autoLockMinutes]);

  // Reset timer function
  const resetTimer = useCallback(() => {
    setTimeUntilLock(autoLockMinutes * 60);
  }, [autoLockMinutes]);

  // Countdown timer
  useEffect(() => {
    // Don't run timer if already locked
    if (isLocked) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Start countdown
    timerRef.current = setInterval(() => {
      setTimeUntilLock((prev) => {
        const next = prev - 1;

        // If timer reaches 0, call onLock
        if (next <= 0) {
          onLockRef.current();
          return 0;
        }

        return next;
      });
    }, 1000);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLocked]);

  return {
    timeUntilLock,
    resetTimer,
  };
}
