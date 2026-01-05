'use client';

import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import NotificationBell from '@/components/notifications/NotificationBell';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/chores': 'Chores',
  '/dashboard/chores/manage': 'Manage Chores',
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
  '/dashboard/meals': 'Meal Planning',
  '/dashboard/meals/plans': 'Meal Plans',
  '/dashboard/meals/recipes': 'Recipe Collection',
  '/dashboard/meals/recipes/new': 'Create Recipe',
  '/dashboard/allowance': 'Allowance',
  '/dashboard/allowance/manage': 'Manage Allowance',
  '/dashboard/transport': 'Transportation',
  '/dashboard/transport/create': 'Create Transport Request',
  '/dashboard/medications': 'Medications',
  '/dashboard/communication': 'Communication Board',
  '/dashboard/routines': 'Routines',
  '/dashboard/documents': 'Documents',
  '/dashboard/projects': 'Projects',
  '/dashboard/settings': 'Settings',
  '/dashboard/settings/modules': 'Module Settings',
  '/dashboard/settings/kiosk': 'Kiosk Mode',
  '/dashboard/rules': 'Automation Rules',
  '/dashboard/inventory': 'Inventory',
  '/dashboard/health': 'Health & Wellness',
  '/dashboard/financial': 'Financial Management',
};

export default function TopBar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  // Get page title - check exact match first, then check patterns for dynamic routes
  let pageTitle = PAGE_TITLES[pathname];

  if (!pageTitle) {
    // Check for dynamic route patterns
    if (pathname.startsWith('/dashboard/meals/recipes/') && pathname !== '/dashboard/meals/recipes/new') {
      pageTitle = 'Recipe Details';
    } else if (pathname.startsWith('/dashboard/projects/') && pathname.split('/').length > 3) {
      pageTitle = 'Project Details';
    } else if (pathname.startsWith('/dashboard/chores/') && pathname.split('/').length > 3) {
      pageTitle = 'Chore Details';
    } else if (pathname.startsWith('/dashboard/rewards/') && pathname.split('/').length > 3) {
      pageTitle = 'Reward Details';
    } else if (pathname.startsWith('/dashboard/documents/') && pathname.split('/').length > 3) {
      pageTitle = 'Document Details';
    } else if (pathname.startsWith('/dashboard/rules/') && pathname.split('/').length > 3) {
      pageTitle = 'Rule Details';
    } else {
      pageTitle = 'Hearth';
    }
  }

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {pageTitle}
          </h1>
        </div>

        {/* Right side - Notifications, User info and Sign out */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <NotificationBell />

          {/* User badge */}
          {session?.user && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-canvas-100 dark:bg-slate-700 rounded-lg">
              <div className="w-8 h-8 bg-ember-700 dark:bg-ember-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
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
