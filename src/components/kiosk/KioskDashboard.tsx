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

  const enabledModuleSet = new Set(enabledModules);
  const isModuleEnabled = (widgetName: string): boolean => {
    const requiredModule = WIDGET_MODULE_MAP[widgetName];
    if (!requiredModule) {
      return true;
    }
    return enabledModuleSet.has(requiredModule);
  };

  const hasVisibleWidgets = ['transport', 'weather', 'medication', 'maintenance', 'inventory'].some(
    (widgetName) => isWidgetEnabled(widgetName) && isModuleEnabled(widgetName)
  );

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
    </div>
  );
}
