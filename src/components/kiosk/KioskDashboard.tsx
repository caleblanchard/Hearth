'use client';

import TransportWidget from '@/components/dashboard/widgets/TransportWidget';
import MedicationWidget from '@/components/dashboard/widgets/MedicationWidget';
import MaintenanceWidget from '@/components/dashboard/widgets/MaintenanceWidget';
import InventoryWidget from '@/components/dashboard/widgets/InventoryWidget';
import WeatherWidget from '@/components/dashboard/widgets/WeatherWidget';

interface KioskDashboardProps {
  memberId?: string;
  role?: string;
  enabledWidgets?: string[];
  enabledModules?: string[];
}

const WIDGET_MODULE_MAP: Record<string, string | null> = {
  transport: 'TRANSPORT',
  medication: 'HEALTH',
  maintenance: 'MAINTENANCE',
  inventory: 'INVENTORY',
  weather: null,
  chores: 'CHORES',
  screenTime: 'SCREEN_TIME',
  todos: 'TODOS',
};

export default function KioskDashboard({
  memberId,
  role,
  enabledWidgets = ['transport', 'medication', 'maintenance', 'inventory', 'weather'],
  enabledModules = [],
}: KioskDashboardProps) {
  // Determine which widgets to show based on role and enabled settings
  const isWidgetEnabled = (widgetName: string): boolean => {
    return enabledWidgets.includes(widgetName);
  };

  const enabledModuleSet = new Set(
    enabledModules.length
      ? enabledModules
      : ['TRANSPORT', 'HEALTH', 'MAINTENANCE', 'INVENTORY', 'WEATHER', 'CHORES', 'SCREEN_TIME', 'TODOS']
  );
  const isModuleEnabled = (widgetName: string): boolean => {
    const requiredModule = WIDGET_MODULE_MAP[widgetName];
    if (!requiredModule) {
      return true;
    }
    return enabledModuleSet.has(requiredModule);
  };

  const hasVisibleWidgets = ['transport', 'weather', 'medication', 'maintenance', 'inventory', 'chores', 'screenTime', 'todos'].some(
    (widgetName) => isWidgetEnabled(widgetName) && isModuleEnabled(widgetName)
  );

  const actionTiles = [
    { key: 'chores', module: 'CHORES', title: 'Chores', description: 'View and complete your chores', href: '/dashboard/chores' },
    { key: 'screenTime', module: 'SCREEN_TIME', title: 'Screen Time', description: 'View balance and log time', href: '/dashboard/screentime' },
    { key: 'todos', module: 'TODOS', title: 'To-Dos', description: 'Manage your to-dos', href: '/dashboard/todos' },
    { key: 'transport', module: 'TRANSPORT', title: 'Transport', description: 'See today’s rides', href: '/dashboard/transport' },
    { key: 'medication', module: 'HEALTH', title: 'Medications', description: 'View and log doses', href: '/dashboard/medications' },
    { key: 'maintenance', module: 'MAINTENANCE', title: 'Maintenance', description: 'Upcoming maintenance tasks', href: '/dashboard/maintenance' },
    { key: 'inventory', module: 'INVENTORY', title: 'Inventory', description: 'Check low-stock items', href: '/dashboard/inventory' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Transport Widget */}
        {isWidgetEnabled('transport') && isModuleEnabled('transport') && (
          <div className="md:col-span-2 lg:col-span-2">
            <TransportWidget memberId={memberId} />
          </div>
        )}

        {/* Weather Widget */}
        {isWidgetEnabled('weather') && isModuleEnabled('weather') && (
          <div className="md:col-span-1 lg:col-span-1">
            <WeatherWidget />
          </div>
        )}

        {/* Medication Widget */}
        {isWidgetEnabled('medication') && isModuleEnabled('medication') && (
          <div className="md:col-span-1 lg:col-span-1">
            <MedicationWidget memberId={memberId} />
          </div>
        )}


        {/* Maintenance Widget */}
        {isWidgetEnabled('maintenance') && isModuleEnabled('maintenance') && (
          <div className="md:col-span-1 lg:col-span-1">
            <MaintenanceWidget />
          </div>
        )}

        {/* Inventory Widget */}
        {isWidgetEnabled('inventory') && isModuleEnabled('inventory') && (
          <div className="md:col-span-1 lg:col-span-1">
            <InventoryWidget />
          </div>
        )}
      </div>

      {/* Empty state if no widgets enabled */}
      {!hasVisibleWidgets && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No widgets enabled. Please configure kiosk settings.
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actionTiles
          .filter(({ module }) => enabledModuleSet.has(module))
          .map(({ key, title, description, href }) => (
            <a
              key={key}
              href={href}
              className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <p className="text-base font-semibold text-gray-900 dark:text-white">{title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
            </a>
          ))}
      </div>
    </div>
  );
}
