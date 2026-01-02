'use client';

import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';
import TransportWidget from '@/components/dashboard/widgets/TransportWidget';
import MedicationWidget from '@/components/dashboard/widgets/MedicationWidget';
import MaintenanceWidget from '@/components/dashboard/widgets/MaintenanceWidget';
import InventoryWidget from '@/components/dashboard/widgets/InventoryWidget';
import WeatherWidget from '@/components/dashboard/widgets/WeatherWidget';

interface KioskDashboardProps {
  memberId?: string;
  role?: string;
  enabledWidgets?: string[];
}

export default function KioskDashboard({
  memberId,
  role,
  enabledWidgets = ['transport', 'medication', 'maintenance', 'inventory', 'weather'],
}: KioskDashboardProps) {
  // Determine which widgets to show based on role and enabled settings
  const isWidgetEnabled = (widgetName: string): boolean => {
    return enabledWidgets.includes(widgetName);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Transport Widget */}
        {isWidgetEnabled('transport') && (
          <div className="md:col-span-2 lg:col-span-2">
            <TransportWidget memberId={memberId} />
          </div>
        )}

        {/* Weather Widget */}
        {isWidgetEnabled('weather') && (
          <div className="md:col-span-1 lg:col-span-1">
            <WeatherWidget />
          </div>
        )}

        {/* Medication Widget */}
        {isWidgetEnabled('medication') && (
          <div className="md:col-span-1 lg:col-span-1">
            <MedicationWidget memberId={memberId} />
          </div>
        )}

        {/* Maintenance Widget */}
        {isWidgetEnabled('maintenance') && (
          <div className="md:col-span-1 lg:col-span-1">
            <MaintenanceWidget />
          </div>
        )}

        {/* Inventory Widget */}
        {isWidgetEnabled('inventory') && (
          <div className="md:col-span-1 lg:col-span-1">
            <InventoryWidget />
          </div>
        )}
      </div>

      {/* Empty state if no widgets enabled */}
      {enabledWidgets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No widgets enabled. Please configure kiosk settings.
          </p>
        </div>
      )}
    </div>
  );
}
