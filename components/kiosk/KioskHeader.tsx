'use client';

import { Lock, Unlock, LogOut } from 'lucide-react';

interface KioskMember {
  id: string;
  name: string;
  role?: string;
  avatarUrl?: string;
}

interface KioskHeaderProps {
  isLocked: boolean;
  currentMember: KioskMember | null;
  timeUntilLock: number; // seconds
  onLock: () => void;
  onEndSession: () => void;
  showWarning?: boolean; // Show warning when time is low
}

export default function KioskHeader({
  isLocked,
  currentMember,
  timeUntilLock,
  onLock,
  onEndSession,
  showWarning = false,
}: KioskHeaderProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show warning if less than 60 seconds remaining
  const isWarning = !isLocked && timeUntilLock <= 60;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo/Title */}
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Family Kiosk
            </h1>
          </div>

          {/* Center: Current Member or Locked Status */}
          <div className="flex items-center space-x-4">
            {isLocked ? (
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <Lock className="w-5 h-5" />
                <span className="font-medium">Locked</span>
              </div>
            ) : currentMember ? (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-200 dark:bg-blue-700 rounded-full flex items-center justify-center text-lg font-bold text-blue-700 dark:text-blue-200">
                  {currentMember.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {currentMember.name}
                  </p>
                  {currentMember.role && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {currentMember.role.toLowerCase()}
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {/* Auto-lock Countdown */}
            {!isLocked && (
              <div
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${
                  isWarning
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Unlock className="w-4 h-4" />
                <span className="text-sm font-mono font-semibold">
                  {formatTime(timeUntilLock)}
                </span>
              </div>
            )}
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center space-x-2">
            {!isLocked && (
              <button
                onClick={onLock}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors duration-200"
              >
                <Lock className="w-4 h-4" />
                <span className="font-medium">Lock</span>
              </button>
            )}

            <button
              onClick={onEndSession}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
              title="End kiosk session (Parents only)"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium hidden sm:inline">End Session</span>
            </button>
          </div>
        </div>

        {/* Warning Banner */}
        {isWarning && (
          <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-2">
            <p className="text-sm text-yellow-800 dark:text-yellow-300 text-center font-medium">
              ⚠️ Locking in {timeUntilLock} seconds due to inactivity
            </p>
          </div>
        )}
      </div>
    </header>
  );
}
