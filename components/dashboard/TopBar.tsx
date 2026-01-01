'use client';

import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import NotificationBell from '@/components/notifications/NotificationBell';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/chores': 'Chores',
  '/dashboard/rewards': 'Rewards',
  '/dashboard/rewards/manage': 'Manage Rewards',
  '/dashboard/rewards/redemptions': 'Reward Redemptions',
  '/dashboard/screentime': 'Screen Time',
  '/dashboard/calendar': 'Calendar',
  '/dashboard/shopping': 'Shopping List',
  '/dashboard/todos': 'To-Do List',
  '/dashboard/approvals': 'Approvals',
  '/dashboard/family': 'Family Management',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/reports': 'Reports',
};

export default function TopBar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const handleSignOut = async () => {
    const callbackUrl = `${window.location.origin}/auth/signin`;
    await signOut({ callbackUrl });
  };

  const pageTitle = PAGE_TITLES[pathname] || 'Hearth';

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {pageTitle}
          </h1>
        </div>

        {/* Right side - Notifications, User info and Sign out */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <NotificationBell />

          {/* User badge */}
          {session?.user && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {session.user.name?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {session.user.name}
                </p>
              </div>
            </div>
          )}

          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
