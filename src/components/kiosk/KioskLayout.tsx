'use client';

import { useState, useCallback } from 'react';
import { useKioskSession } from '@/hooks/useKioskSession';
import { useKioskAutoLock } from '@/hooks/useKioskAutoLock';
import { useActivityDetection } from '@/hooks/useActivityDetection';
import KioskHeader from './KioskHeader';
import KioskPinModal from './KioskPinModal';
import { AlertModal } from '@/components/ui/Modal';

interface KioskLayoutProps {
  children: React.ReactNode;
  familyId: string;
}

export default function KioskLayout({ children, familyId }: KioskLayoutProps) {
  const [showPinModal, setShowPinModal] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({ isOpen: false, title: '', message: '', type: 'error' });

  const {
    sessionToken,
    isLocked,
    currentMember,
    autoLockMinutes,
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
    try {
      await endSession();
      // Redirect to home or kiosk setup page
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Failed to end session:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to end kiosk session',
        type: 'error',
      });
    }
  };

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
        sessionToken={sessionToken}
      />
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}
