'use client';

import { useGuestSession } from '@/hooks/useGuestSession';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function GuestStatusBanner() {
  const { guestSession, endSession, loading } = useGuestSession();

  if (loading || !guestSession) {
    return null;
  }

  const getAccessLevelLabel = (level: string): string => {
    const labels: Record<string, string> = {
      VIEW_ONLY: 'View Only',
      LIMITED: 'Limited Access',
      CAREGIVER: 'Caregiver',
    };
    return labels[level] || level;
  };

  const getAccessLevelColor = (level: string): string => {
    const colors: Record<string, string> = {
      VIEW_ONLY: 'bg-info/20 dark:bg-info/30 text-info dark:text-info',
      LIMITED: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      CAREGIVER: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    };
    return colors[level] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
  };

  const expiresAt = new Date(guestSession.expiresAt);
  const now = new Date();
  const hoursUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getAccessLevelColor(guestSession.accessLevel)}`}>
                {getAccessLevelLabel(guestSession.accessLevel)}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <span className="font-medium">Guest Access:</span> Logged in as{' '}
                <span className="font-semibold">{guestSession.guestName}</span>
                {hoursUntilExpiry > 0 && (
                  <span className="ml-2">
                    • Expires in {hoursUntilExpiry} {hoursUntilExpiry === 1 ? 'hour' : 'hours'}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={endSession}
            className="flex-shrink-0 ml-4 p-1.5 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
            title="End Guest Session"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
