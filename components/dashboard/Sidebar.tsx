'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
  ChevronDownIcon,
  ChevronRightIcon,
  Bars3Icon,
  XMarkIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  TrophyIcon,
  UserCircleIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  path: string;
  icon: any;
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

export default function Sidebar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['Tasks & Activities', 'Family Management', 'Settings'])
  );

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const navGroups: NavGroup[] = [
    {
      name: 'Main',
      items: [{ name: 'Dashboard', path: '/dashboard', icon: HomeIcon }],
    },
    {
      name: 'Tasks & Activities',
      items: [
        { name: 'Chores', path: '/dashboard/chores', icon: CheckCircleIcon },
        { name: 'To-Do', path: '/dashboard/todos', icon: ListBulletIcon },
        { name: 'Shopping', path: '/dashboard/shopping', icon: ShoppingCartIcon },
      ],
    },
    {
      name: 'Family Management',
      items: [
        { name: 'Rewards', path: '/dashboard/rewards', icon: GiftIcon },
        { name: 'Screen Time', path: '/dashboard/screentime', icon: ClockIcon },
        { name: 'Financial', path: '/dashboard/financial', icon: ChartBarIcon },
        { name: 'Transactions', path: '/dashboard/financial/transactions', icon: ReceiptPercentIcon },
        { name: 'Savings Goals', path: '/dashboard/financial/savings', icon: BanknotesIcon },
        { name: 'Budgets', path: '/dashboard/financial/budgets', icon: BanknotesIcon },
        { name: 'Calendar', path: '/dashboard/calendar', icon: CalendarDaysIcon },
        { name: 'Leaderboard', path: '/dashboard/leaderboard', icon: TrophyIcon },
        { name: 'Profile', path: '/dashboard/profile', icon: UserCircleIcon },
      ],
    },
  ];

  // Add parent-only settings group
  if (session?.user?.role === 'PARENT') {
    navGroups.push({
      name: 'Settings',
      items: [
        { name: 'Reports', path: '/dashboard/reports', icon: ChartBarIcon },
        { name: 'Approvals', path: '/dashboard/approvals', icon: CheckBadgeIcon },
        { name: 'Manage Chores', path: '/dashboard/chores/manage', icon: WrenchScrewdriverIcon },
        { name: 'Manage Rewards', path: '/dashboard/rewards/manage', icon: GiftIcon },
        { name: 'Allowance', path: '/dashboard/allowance/manage', icon: CurrencyDollarIcon },
        { name: 'Screen Time', path: '/dashboard/screentime/manage', icon: ClockIcon },
        { name: 'Family', path: '/dashboard/family', icon: UsersIcon },
      ],
    });
  }

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.path;
    const Icon = item.icon;

    return (
      <button
        key={item.path}
        onClick={() => {
          router.push(item.path);
          setIsMobileOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {isOpen && <span>{item.name}</span>}
      </button>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const isExpanded = expandedGroups.has(group.name);
    const isMainGroup = group.name === 'Main';

    if (isMainGroup) {
      // Main group items are always visible, no grouping
      return (
        <div key={group.name} className="space-y-1">
          {group.items.map(renderNavItem)}
        </div>
      );
    }

    return (
      <div key={group.name} className="space-y-1">
        {isOpen && (
          <button
            onClick={() => toggleGroup(group.name)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <span>{group.name}</span>
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </button>
        )}
        {(!isOpen || isExpanded) && (
          <div className="space-y-1">{group.items.map(renderNavItem)}</div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {isOpen && (
          <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            Hearth
          </h1>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors hidden md:block"
        >
          <Bars3Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={() => setIsMobileOpen(false)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors md:hidden"
        >
          <XMarkIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {navGroups.map(renderNavGroup)}
      </nav>

      {/* Sidebar Footer */}
      {isOpen && session?.user && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
              {session.user.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {session.user.role}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed bottom-4 right-4 z-40 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-colors"
      >
        <Bars3Icon className="h-6 w-6" />
      </button>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:block fixed inset-y-0 left-0 z-30 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
          isOpen ? 'w-64' : 'w-20'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Spacer for main content */}
      <div
        className={`hidden md:block transition-all duration-300 ${
          isOpen ? 'w-64' : 'w-20'
        }`}
      />
    </>
  );
}
