'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { useDashboardCustomize } from '@/contexts/DashboardCustomizeContext';
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
  ComputerDesktopIcon,
  HeartIcon,
  BeakerIcon,
  CakeIcon,
  Cog6ToothIcon,
  ArchiveBoxIcon,
  TruckIcon,
  DocumentTextIcon,
  FolderIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  path: string;
  icon: any;
  moduleId?: string; // Optional module ID for filtering
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

export default function Sidebar() {
  const { user } = useSupabaseSession();
  const router = useRouter();
  const pathname = usePathname();
  const customizeContext = useDashboardCustomize();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['Tasks & Activities', 'Family Management', 'Settings'])
  );
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());

  // Fetch enabled modules
  useEffect(() => {
    async function fetchEnabledModules() {
      try {
        const res = await fetch('/api/settings/modules/enabled');
        if (res.ok) {
          const data = await res.json();
          setEnabledModules(new Set(data.enabledModules));
        }
      } catch (error) {
        console.error('Error fetching enabled modules:', error);
        // On error, assume all modules are enabled
        setEnabledModules(new Set([
          'CHORES', 'PROJECTS', 'SCREEN_TIME', 'CREDITS', 'SHOPPING', 'CALENDAR', 'TODOS',
          'ROUTINES', 'MEAL_PLANNING', 'HEALTH', 'PETS', 'LEADERBOARD', 'FINANCIAL',
          'INVENTORY', 'MAINTENANCE', 'TRANSPORT', 'DOCUMENTS', 'RULES_ENGINE'
        ]));
      }
    }
    if (user) {
      fetchEnabledModules();
    }
  }, [session]);

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
        { name: 'Chores', path: '/dashboard/chores', icon: CheckCircleIcon, moduleId: 'CHORES' },
        { name: 'Projects', path: '/dashboard/projects', icon: FolderIcon, moduleId: 'PROJECTS' },
        { name: 'To-Do', path: '/dashboard/todos', icon: ListBulletIcon, moduleId: 'TODOS' },
        { name: 'Shopping', path: '/dashboard/shopping', icon: ShoppingCartIcon, moduleId: 'SHOPPING' },
      ],
    },
    {
      name: 'Family Management',
      items: [
        { name: 'Rewards', path: '/dashboard/rewards', icon: GiftIcon, moduleId: 'CREDITS' },
        { name: 'Screen Time', path: '/dashboard/screentime', icon: ClockIcon, moduleId: 'SCREEN_TIME' },
        ...(user?.role === 'PARENT' 
          ? [{ name: 'Family Screen Time', path: '/dashboard/screentime/manage-family', icon: UsersIcon, moduleId: 'SCREEN_TIME' }]
          : []
        ),
        { name: 'Financial', path: '/dashboard/financial', icon: ChartBarIcon, moduleId: 'FINANCIAL' },
        { name: 'Transactions', path: '/dashboard/financial/transactions', icon: ReceiptPercentIcon, moduleId: 'FINANCIAL' },
        { name: 'Savings Goals', path: '/dashboard/financial/savings', icon: BanknotesIcon, moduleId: 'FINANCIAL' },
        { name: 'Budgets', path: '/dashboard/financial/budgets', icon: BanknotesIcon, moduleId: 'FINANCIAL' },
        { name: 'Calendar', path: '/dashboard/calendar', icon: CalendarDaysIcon, moduleId: 'CALENDAR' },
        { name: 'Meals', path: '/dashboard/meals', icon: CakeIcon, moduleId: 'MEAL_PLANNING' },
        { name: 'Recipes', path: '/dashboard/meals/recipes', icon: BookOpenIcon, moduleId: 'RECIPES' },
        { name: 'Communication', path: '/dashboard/communication', icon: ChatBubbleLeftRightIcon, moduleId: 'COMMUNICATION' },
        { name: 'Health', path: '/dashboard/health', icon: BeakerIcon, moduleId: 'HEALTH' },
        { name: 'Pets', path: '/dashboard/pets', icon: HeartIcon, moduleId: 'PETS' },
        { name: 'Inventory', path: '/dashboard/inventory', icon: ArchiveBoxIcon, moduleId: 'INVENTORY' },
        { name: 'Maintenance', path: '/dashboard/maintenance', icon: WrenchScrewdriverIcon, moduleId: 'MAINTENANCE' },
        { name: 'Transportation', path: '/dashboard/transport', icon: TruckIcon, moduleId: 'TRANSPORT' },
        { name: 'Documents', path: '/dashboard/documents', icon: DocumentTextIcon, moduleId: 'DOCUMENTS' },
        { name: 'Leaderboard', path: '/dashboard/leaderboard', icon: TrophyIcon, moduleId: 'LEADERBOARD' },
        { name: 'Profile', path: '/dashboard/profile', icon: UserCircleIcon },
      ],
    },
  ];

  // Add parent-only settings group
  if (user?.role === 'PARENT') {
    navGroups.push({
      name: 'Kiosk',
      items: [
        { name: 'Kiosk Mode', path: '/kiosk', icon: ComputerDesktopIcon },
        { name: 'Kiosk Settings', path: '/dashboard/settings/kiosk', icon: WrenchScrewdriverIcon },
      ],
    });
    navGroups.push({
      name: 'Settings',
      items: [
        { name: 'Module Settings', path: '/dashboard/settings/modules', icon: Cog6ToothIcon },
        { name: 'Calendar Settings', path: '/dashboard/settings/calendars', icon: CalendarDaysIcon, moduleId: 'CALENDAR' },
        { name: 'Automation Rules', path: '/dashboard/rules', icon: BoltIcon, moduleId: 'RULES_ENGINE' },
        { name: 'Reports', path: '/dashboard/reports', icon: ChartBarIcon },
        { name: 'Approvals', path: '/dashboard/approvals', icon: CheckBadgeIcon },
        { name: 'Manage Chores', path: '/dashboard/chores/manage', icon: WrenchScrewdriverIcon },
        { name: 'Manage Rewards', path: '/dashboard/rewards/manage', icon: GiftIcon },
        { name: 'Allowance', path: '/dashboard/allowance/manage', icon: CurrencyDollarIcon },
        { name: 'Screen Time Settings', path: '/dashboard/screentime/manage', icon: ClockIcon },
        { name: 'Family', path: '/dashboard/family', icon: UsersIcon },
        { name: 'Guest Access', path: '/dashboard/guests', icon: UsersIcon },
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
            ? 'bg-ember-300 dark:bg-slate-900 text-ember-700 dark:text-ember-300'
            : 'text-slate-700 dark:text-slate-300 hover:bg-canvas-200 dark:hover:bg-slate-700'
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

    // Filter items based on enabled modules
    const filteredItems = group.items.filter((item) => {
      // If no moduleId, always show (like Dashboard, Profile, Family)
      if (!item.moduleId) return true;
      // RULES_ENGINE is always available to parents (non-configurable)
      if (item.moduleId === 'RULES_ENGINE' && user?.role === 'PARENT') {
        return true;
      }
      // Check if module is enabled
      return enabledModules.has(item.moduleId);
    });

    // Don't render empty groups
    if (filteredItems.length === 0) return null;

    if (isMainGroup) {
      // Main group items are always visible, no grouping
      return (
        <div key={group.name} className="space-y-1">
          {filteredItems.map(renderNavItem)}
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
          <div className="space-y-1">{filteredItems.map(renderNavItem)}</div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {isOpen ? (
          <div className="flex items-center gap-2">
            <img 
              src="/logo-icon.png" 
              alt="Hearth" 
              className="h-8 w-8"
            />
            <h1 className="text-2xl font-bold text-ember-700 dark:text-ember-500">
              Hearth
            </h1>
          </div>
        ) : (
          <img 
            src="/logo-icon.png" 
            alt="Hearth" 
            className="h-8 w-8 mx-auto"
          />
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
        {/* Customize Dashboard - Mobile Only */}
        {customizeContext && pathname === '/dashboard' && (
          <div className="md:hidden pb-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                customizeContext.openCustomizer();
                setIsMobileOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors bg-ember-50 dark:bg-ember-900/20 text-ember-700 dark:text-ember-300 hover:bg-ember-100 dark:hover:bg-ember-900/30"
            >
              <Cog6ToothIcon className="h-5 w-5 flex-shrink-0" />
              <span>Customize Dashboard</span>
            </button>
          </div>
        )}
        
        {navGroups.map(renderNavGroup)}
      </nav>

      {/* Sidebar Footer */}
      {isOpen && user && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-ember-700 dark:bg-ember-500 rounded-full flex items-center justify-center text-white font-bold">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user.role}
              </p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              v{process.env.NEXT_PUBLIC_BUILD_VERSION || '0.1.0-dev'}
            </p>
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
        className="md:hidden fixed bottom-4 right-4 z-40 p-3 bg-ember-700 hover:bg-ember-500 text-white rounded-full shadow-lg transition-colors"
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
