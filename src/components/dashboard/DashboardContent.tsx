'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { useRouter } from 'next/navigation';
import { useGuestSession } from '@/hooks/useGuestSession';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';
import TransportWidget from '@/components/dashboard/widgets/TransportWidget';
import MedicationWidget from '@/components/dashboard/widgets/MedicationWidget';
import MaintenanceWidget from '@/components/dashboard/widgets/MaintenanceWidget';
import InventoryWidget from '@/components/dashboard/widgets/InventoryWidget';
import WeatherWidget from '@/components/dashboard/widgets/WeatherWidget';
import CommunicationWidget from '@/components/dashboard/widgets/CommunicationWidget';
import MealsWidget from '@/components/dashboard/widgets/MealsWidget';
import SickModeBanner from '@/components/sick-mode/SickModeBanner';
import DashboardCustomizer from '@/components/dashboard/DashboardCustomizer';
import DashboardCustomizerButton from '@/components/dashboard/DashboardCustomizerButton';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { DashboardCustomizeProvider } from '@/contexts/DashboardCustomizeContext';
import DashboardSnapshotSection from '@/components/dashboard/DashboardSnapshotSection';
import type { DashboardSnapshot, DashboardSnapshotCardKind } from '@/types/dashboard-snapshot';
import type { DashboardWidgetKind } from '@/types/dashboard-widget-collection';

export default function DashboardContent() {
  const { user, loading: sessionLoading } = useSupabaseSession();
  const { guestSession, loading: guestLoading } = useGuestSession();
  const isKiosk = typeof window !== 'undefined' && !!localStorage.getItem('kioskChildToken');
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());
  const [isCustomizing, setIsCustomizing] = useState(false);
  
  // Dashboard layout customization
  const {
    layout,
    availableWidgets,
    saveLayout,
    resetLayout,
  } = useDashboardLayout();

  // Redirect if no session (user or guest) - but only after both are done loading
  useEffect(() => {
    // Wait for both session and guest session to finish loading
    const stillLoading = sessionLoading || guestLoading;
    
    // Only redirect if we're done loading and there's no session (user or guest)
    if (!stillLoading && !user && !guestSession && !isKiosk) {
      router.push('/auth/signin');
    }
  }, [user, sessionLoading, guestSession, guestLoading, router, isKiosk]);

  useEffect(() => {
    async function fetchEnabledModules() {
      try {
        const headers: HeadersInit = {};
        if (guestSession?.sessionToken) {
          headers['x-guest-session-token'] = guestSession.sessionToken;
        }
        const kioskChild = typeof window !== 'undefined' ? localStorage.getItem('kioskChildToken') : null;
        if (kioskChild) {
          headers['X-Kiosk-Child'] = kioskChild;
        }
        
        const res = await fetch('/api/settings/modules/enabled', { headers });
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
          'INVENTORY', 'MAINTENANCE', 'TRANSPORT', 'DOCUMENTS', 'RULES_ENGINE', 'COMMUNICATION', 'RECIPES'
        ]));
      }
    }

    async function fetchDashboard() {
      try {
        const headers: HeadersInit = {};
        if (guestSession?.sessionToken) {
          headers['x-guest-session-token'] = guestSession.sessionToken;
        }
        const kioskChild = typeof window !== 'undefined' ? localStorage.getItem('kioskChildToken') : null;
        if (kioskChild) {
          headers['X-Kiosk-Child'] = kioskChild;
        }
        
        const response = await fetch('/api/dashboard', { headers });
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const dashboardData = await response.json();
        setSnapshot(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    // Wait for session to finish loading before fetching data
    const stillLoading = sessionLoading || guestLoading;
    
    // Don't fetch if we're still loading or if there's no session
    if (stillLoading) {
      return;
    }
    
    // If no session (user or guest), don't fetch (redirect will happen)
    if (!user && !guestSession && !isKiosk) {
      return;
    }

    fetchEnabledModules();
    fetchDashboard();
  }, [user, sessionLoading, guestSession, guestLoading, isKiosk]);

  const isWidgetEnabled = (widgetId: string): boolean => {
    if (!layout || layout.length === 0) return true;
    const widget = layout.find(w => w.id === widgetId);
    return widget?.enabled !== false;
  };

  const getWidgetStyle = (widgetId: string): React.CSSProperties => {
    if (!layout || layout.length === 0) return {};
    const widget = layout.find(w => w.id === widgetId);
    return widget ? { order: widget.order } : {};
  };

  const requestedWidgets = useMemo<DashboardWidgetKind[]>(() => {
    const hasViewerSession = Boolean(user || guestSession || isKiosk);
    if (!hasViewerSession || sessionLoading || guestLoading) {
      return [];
    }

    const widgets: DashboardWidgetKind[] = [];

    if (enabledModules.has('TRANSPORT') && isWidgetEnabled('transport')) {
      widgets.push('transport');
    }
    if (isWidgetEnabled('weather')) {
      widgets.push('weather');
    }
    if (enabledModules.has('HEALTH') && isWidgetEnabled('medication')) {
      widgets.push('medication');
    }
    if (enabledModules.has('MAINTENANCE') && isWidgetEnabled('maintenance')) {
      widgets.push('maintenance');
    }
    if (enabledModules.has('INVENTORY') && isWidgetEnabled('inventory')) {
      widgets.push('inventory');
    }

    return widgets;
  }, [enabledModules, layout, user, guestSession, isKiosk, sessionLoading, guestLoading]);

  const widgetCollection = useDashboardWidgets({
    widgets: requestedWidgets,
    memberId: user?.id,
  });
  const widgetCollectionError = widgetCollection.error?.message ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-700 dark:text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (!snapshot) {
    return null;
  }

  const getSnapshotCard = (kind: DashboardSnapshotCardKind) =>
    snapshot.cards.find((card) => card.kind === kind);

  const choresCard = getSnapshotCard('chores');
  const screenTimeCard = getSnapshotCard('screentime');
  const creditsCard = getSnapshotCard('credits');
  const shoppingCard = getSnapshotCard('shopping');
  const todosCard = getSnapshotCard('todos');
  const calendarCard = getSnapshotCard('calendar');
  const projectsCard = getSnapshotCard('projects');

  return (
    <DashboardCustomizeProvider onCustomize={() => setIsCustomizing(true)}>
      {/* Sick Mode Banner */}
      <div className="mb-6">
        <SickModeBanner />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {enabledModules.has('CHORES') && isWidgetEnabled('chores') && choresCard && (
        <DashboardSnapshotSection
          card={choresCard}
          style={getWidgetStyle('chores')}
          onOpen={(href) => router.push(href)}
        />
      )}

      {enabledModules.has('SCREEN_TIME') &&
        isWidgetEnabled('screentime') &&
        screenTimeCard && (
          <DashboardSnapshotSection
            card={screenTimeCard}
            style={getWidgetStyle('screentime')}
            onOpen={(href) => router.push(href)}
          />
        )}

      {enabledModules.has('CREDITS') && isWidgetEnabled('credits') && creditsCard && (
        <DashboardSnapshotSection
          card={creditsCard}
          style={getWidgetStyle('credits')}
          onOpen={(href) => router.push(href)}
        />
      )}

      {enabledModules.has('SHOPPING') && isWidgetEnabled('shopping') && shoppingCard && (
        <DashboardSnapshotSection
          card={shoppingCard}
          style={getWidgetStyle('shopping')}
          onOpen={(href) => router.push(href)}
        />
      )}

      {enabledModules.has('TODOS') && isWidgetEnabled('todos') && todosCard && (
        <DashboardSnapshotSection
          card={todosCard}
          style={getWidgetStyle('todos')}
          onOpen={(href) => router.push(href)}
        />
      )}

      {enabledModules.has('CALENDAR') && isWidgetEnabled('calendar') && calendarCard && (
        <DashboardSnapshotSection
          card={calendarCard}
          style={getWidgetStyle('calendar')}
          onOpen={(href) => router.push(href)}
        />
      )}

      {enabledModules.has('PROJECTS') && isWidgetEnabled('projects') && projectsCard && (
        <DashboardSnapshotSection
          card={projectsCard}
          style={getWidgetStyle('projects')}
          onOpen={(href) => router.push(href)}
        />
      )}

      {/* Transport Widget - spans 2 columns on large screens */}
      {enabledModules.has('TRANSPORT') && isWidgetEnabled('transport') && (
        <div style={getWidgetStyle('transport')} className="md:col-span-2 lg:col-span-2">
          <TransportWidget
            memberId={user?.id}
            widget={widgetCollection.data.transport}
            collectionEnabled={requestedWidgets.includes('transport')}
            collectionLoading={widgetCollection.loading}
            collectionError={widgetCollectionError}
          />
        </div>
      )}

      {/* Communication Widget */}
      {enabledModules.has('COMMUNICATION') && isWidgetEnabled('communication') && (
        <div style={getWidgetStyle('communication')} className="md:col-span-1 lg:col-span-1">
          <CommunicationWidget />
        </div>
      )}

      {/* Weather Widget - Always visible (not module-specific) */}
      {isWidgetEnabled('weather') && (
        <div style={getWidgetStyle('weather')} className="md:col-span-1 lg:col-span-1">
          <WeatherWidget
            widget={widgetCollection.data.weather}
            collectionEnabled={requestedWidgets.includes('weather')}
            collectionLoading={widgetCollection.loading}
            collectionError={widgetCollectionError}
          />
        </div>
      )}

      {/* Medication Widget */}
      {enabledModules.has('HEALTH') && isWidgetEnabled('medication') && (
        <div style={getWidgetStyle('medication')} className="md:col-span-1 lg:col-span-1">
          <MedicationWidget
            memberId={user?.id}
            widget={widgetCollection.data.medication}
            collectionEnabled={requestedWidgets.includes('medication')}
            collectionLoading={widgetCollection.loading}
            collectionError={widgetCollectionError}
            onRefresh={widgetCollection.refetch}
          />
        </div>
      )}

      {/* Maintenance Widget */}
      {enabledModules.has('MAINTENANCE') && isWidgetEnabled('maintenance') && (
        <div style={getWidgetStyle('maintenance')} className="md:col-span-1 lg:col-span-1">
          <MaintenanceWidget
            widget={widgetCollection.data.maintenance}
            collectionEnabled={requestedWidgets.includes('maintenance')}
            collectionLoading={widgetCollection.loading}
            collectionError={widgetCollectionError}
          />
        </div>
      )}

      {/* Inventory Widget */}
      {enabledModules.has('INVENTORY') && isWidgetEnabled('inventory') && (
        <div style={getWidgetStyle('inventory')} className="md:col-span-1 lg:col-span-1">
          <InventoryWidget
            widget={widgetCollection.data.inventory}
            collectionEnabled={requestedWidgets.includes('inventory')}
            collectionLoading={widgetCollection.loading}
            collectionError={widgetCollectionError}
          />
        </div>
      )}

      {/* Meals Widget */}
      {enabledModules.has('MEAL_PLANNING') && isWidgetEnabled('meals') && (
        <div style={getWidgetStyle('meals')} className="md:col-span-1 lg:col-span-1">
          <MealsWidget />
        </div>
      )}
    </div>
    
    {/* Dashboard Customizer Button - Only show for authenticated users */}
    {user && !guestSession && (
      <DashboardCustomizerButton 
        onClick={() => setIsCustomizing(true)} 
      />
    )}
    
    {/* Dashboard Customizer Modal */}
    <DashboardCustomizer
      isOpen={isCustomizing}
      onClose={() => setIsCustomizing(false)}
      widgets={layout}
      availableWidgets={availableWidgets}
      onSave={saveLayout}
      onReset={resetLayout}
    />
    </DashboardCustomizeProvider>
  );
}
