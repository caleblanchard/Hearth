'use client';

import { useState, useCallback } from 'react';
import { useKioskSession } from '@/hooks/useKioskSession';
import { useKioskAutoLock } from '@/hooks/useKioskAutoLock';
import { useActivityDetection } from '@/hooks/useActivityDetection';
import KioskHeader from './KioskHeader';
import KioskPinModal from './KioskPinModal';

interface KioskLayoutProps {
  children: React.ReactNode;
  familyId: string;
}

export default function KioskLayout({ children, familyId }: KioskLayoutProps) {
  const [showPinModal, setShowPinModal] = useState(false);

  const {
    isLocked,
    currentMember,
    autoLockMinutes,
    loading,
    unlock,
    lock,
    endSession,
    updateActivity,
  } = useKioskSession();

  const { timeUntilLock, resetTimer } = useKioskAutoLock({
    autoLockMinutes,
    onLock: handleAutoLock,
    isLocked,
  });

  // Handle auto-lock when timer reaches zero
  async function handleAutoLock() {
    await lock();
  }

  // Handle activity detection
  const handleActivity = useCallback(() => {
    updateActivity();
    resetTimer();
  }, [updateActivity, resetTimer]);

  useActivityDetection({
    onActivity: handleActivity,
    throttleMs: 5000,
  });

  // Handle unlock from PIN modal
  const handleUnlock = async (memberId: string, pin: string) => {
    await unlock(memberId, pin);
    setShowPinModal(false);
  };

  // Handle lock button
  const handleLock = async () => {
    await lock();
  };

  // Handle end session button
  const handleEndSession = async () => {
    await endSession();
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading kiosk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <KioskHeader
        isLocked={isLocked}
        currentMember={currentMember}
        timeUntilLock={timeUntilLock}
        onLock={handleLock}
        onEndSession={handleEndSession}
      />

      {/* Main content area - clickable when locked to open PIN modal */}
      <div
        className={isLocked ? 'cursor-pointer' : ''}
        onClick={isLocked ? () => setShowPinModal(true) : undefined}
      >
        {children}
      </div>

      {/* PIN Modal */}
      <KioskPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onUnlock={handleUnlock}
        familyId={familyId}
      />
    </div>
  );
}
