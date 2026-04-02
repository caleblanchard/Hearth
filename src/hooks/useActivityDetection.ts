import { useEffect, useRef } from 'react';

interface UseActivityDetectionParams {
  onActivity: () => void;
  throttleMs?: number; // default: 5000
}

export function useActivityDetection({
  onActivity,
  throttleMs = 5000,
}: UseActivityDetectionParams): void {
  const lastActivityRef = useRef<number>(0);
  const onActivityRef = useRef(onActivity);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep onActivity ref up to date
  useEffect(() => {
    onActivityRef.current = onActivity;
  }, [onActivity]);

  useEffect(() => {
    const handleActivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      // Only trigger if enough time has passed since last activity
      if (timeSinceLastActivity >= throttleMs) {
        lastActivityRef.current = now;

        // Use setTimeout to ensure callback is called after event processing
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          onActivityRef.current();
        }, 0);
      }
    };

    // Add event listeners for different activity types
    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('touchstart', handleActivity);
    document.addEventListener('keydown', handleActivity);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('touchstart', handleActivity);
      document.removeEventListener('keydown', handleActivity);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [throttleMs]);
}
