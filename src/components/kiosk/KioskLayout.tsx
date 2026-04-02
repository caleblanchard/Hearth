'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import React from 'react';
import { useKioskSession } from '@/hooks/useKioskSession';
import { useKioskAutoLock } from '@/hooks/useKioskAutoLock';
import { useActivityDetection } from '@/hooks/useActivityDetection';
import KioskHeader from './KioskHeader';
import KioskPinModal from './KioskPinModal';
import { AlertModal } from '@/components/ui/Modal';

export default function KioskLayout({ children }: { children?: React.ReactNode }) {
  const [showPinModal, setShowPinModal] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({ isOpen: false, title: '', message: '', type: 'error' });
  const [activationCode, setActivationCode] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [qrPayload, setQrPayload] = useState('');

  const {
    deviceSecret,
    childToken,
    isLocked,
    currentMember,
    autoLockMinutes,
    activateDevice,
    unlock,
    logoutChild,
    clearDevice,
    heartbeat,
  } = useKioskSession();

  const { timeUntilLock, resetTimer } = useKioskAutoLock({
    autoLockMinutes,
    onLock: handleAutoLock,
    isLocked,
  });

  const activationAttempted = useRef(false);

  useEffect(() => {
    if (deviceSecret || activationAttempted.current) return;
    activationAttempted.current = true;
  }, [deviceSecret]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const existing = localStorage.getItem('kioskDeviceId');
    if (existing) {
      setDeviceId(existing);
    } else {
      const generated = crypto.randomUUID();
      setDeviceId(generated);
      localStorage.setItem('kioskDeviceId', generated);
    }
  }, []);

  // Handle auto-lock when timer reaches zero
  async function handleAutoLock() {
    await handleLock();
  }

  // Handle activity detection
  const handleActivity = useCallback(() => {
    heartbeat();
    resetTimer();
  }, [heartbeat, resetTimer]);

  useActivityDetection({
    onActivity: handleActivity,
    throttleMs: 5000,
  });

  // Handle unlock from PIN modal
  const handleUnlock = async (memberId: string, memberName: string, pin: string) => {
    await unlock({ id: memberId, name: memberName }, pin);
    setShowPinModal(false);
  };

  // Handle lock button
  const handleLock = async () => {
    await logoutChild();
  };

  // Handle end session button
  const handleEndSession = async () => {
    clearDevice();
    window.location.href = '/kiosk';
  };

  const handleActivate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activationCode.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Activation required',
        message: 'Enter the activation code to proceed.',
        type: 'warning',
      });
      return;
    }
    try {
      await activateDevice(activationCode.trim(), deviceId);
      setAlertModal({
        isOpen: true,
        title: 'Device activated',
        message: 'You can now use the kiosk.',
        type: 'success',
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Activation failed',
        message: error instanceof Error ? error.message : 'Unable to activate device',
        type: 'error',
      });
    }
  };

  const handleParseQr = () => {
    if (!qrPayload.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'QR payload empty',
        message: 'Paste QR text to parse.',
        type: 'warning',
      });
      return;
    }

    try {
      // Support JSON payload or raw code
      const parsed = JSON.parse(qrPayload);
      if (parsed.code) setActivationCode(parsed.code.toString().toUpperCase());
      if (parsed.deviceId) setDeviceId(parsed.deviceId.toString());
      setAlertModal({
        isOpen: true,
        title: 'QR parsed',
        message: 'Fields populated from QR data.',
        type: 'success',
      });
    } catch {
      // Fallback: treat entire payload as code
      setActivationCode(qrPayload.toUpperCase());
      setAlertModal({
        isOpen: true,
        title: 'QR parsed',
        message: 'Activation code populated from QR text.',
        type: 'success',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {deviceSecret ? (
        <>
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
            {children &&
              (currentMember
                ? (() => {
                    const childElement = children as React.ReactElement<any>;
                    return React.cloneElement(childElement, {
                      memberId: currentMember.id,
                      role: currentMember.role,
                    });
                  })()
                : children)}
          </div>

          {/* PIN Modal */}
          <KioskPinModal
            isOpen={showPinModal}
            onClose={() => setShowPinModal(false)}
            onUnlock={handleUnlock}
            sessionToken={deviceSecret}
          />
        </>
      ) : (
        <div className="max-w-xl mx-auto px-4 py-10">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Activate this kiosk</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Enter the single-use activation code provided by a parent. This will bind the kiosk to your family.
                </p>
                <form onSubmit={handleActivate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Activation code</label>
                <input
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ember-500"
                  placeholder="Enter code"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Device ID</label>
                <input
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ember-500"
                  placeholder="device-identifier"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">QR payload (paste)</label>
                <textarea
                  value={qrPayload}
                  onChange={(e) => setQrPayload(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ember-500"
                  placeholder='{"code":"ABCD1234","deviceId":"device-123"}'
                />
                <button
                  type="button"
                  onClick={handleParseQr}
                  className="mt-2 inline-flex items-center px-3 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Parse QR text
                </button>
              </div>
                <button
                  type="submit"
                  className="w-full inline-flex justify-center items-center px-4 py-2 rounded-md bg-ember-600 text-white font-semibold hover:bg-ember-700 transition-colors focus:outline-none focus:ring-2 focus:ring-ember-500 focus:ring-offset-2"
                >
                  Activate device
                </button>
                </form>
              </div>
            </div>
          )}

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
