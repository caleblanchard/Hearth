'use client';

import { useMemberContext } from '@/hooks/useMemberContext';
import { signOut } from '@/hooks/useSupabaseSession';
import { useRouter, usePathname } from 'next/navigation';
import { FamilySwitcher } from '@/components/FamilySwitcher';
import {
  HomeIcon,
  CheckCircleIcon,
  GiftIcon,
  ClockIcon,
  ShoppingCartIcon,
  ListBulletIcon,
  CheckBadgeIcon,
  UsersIcon,
  CalendarDaysIcon,
  HeartIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';

export default function DashboardNav() {
  const { user, member } = useMemberContext();
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
    { name: 'Chores', path: '/dashboard/chores', icon: CheckCircleIcon },
    { name: 'Rewards', path: '/dashboard/rewards', icon: GiftIcon },
    { name: 'Screen Time', path: '/dashboard/screentime', icon: ClockIcon },
    { name: 'Calendar', path: '/dashboard/calendar', icon: CalendarDaysIcon },
    { name: 'Shopping', path: '/dashboard/shopping', icon: ShoppingCartIcon },
    { name: 'To-Do', path: '/dashboard/todos', icon: ListBulletIcon },
    { name: 'Health', path: '/dashboard/health', icon: BeakerIcon },
    { name: 'Pets', path: '/dashboard/pets', icon: HeartIcon },
  ];

  // Add parent-only items
  if (member?.role === 'PARENT') {
    navItems.push({ name: 'Approvals', path: '/dashboard/approvals', icon: CheckBadgeIcon });
    navItems.push({ name: 'Family', path: '/dashboard/family', icon: UsersIcon });
  }

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-2xl font-bold text-ember-700 dark:text-ember-500 hover:text-ember-500 dark:hover:text-ember-300 transition-colors"
            >
              Hearth
            </button>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-ember-300 dark:bg-slate-900 text-ember-700 dark:text-ember-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-canvas-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </button>
              );
            })}
          </div>

          {/* User Info & Sign Out */}
          <div className="flex items-center gap-4">
            <FamilySwitcher />
            
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">{member?.name || user?.email}</span>
              {member?.role && (
                <span className="ml-2 text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">
                  {member.role}
                </span>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-3 pt-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-ember-300 dark:bg-slate-900 text-ember-700 dark:text-ember-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-canvas-200 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
