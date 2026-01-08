import { useState, useEffect } from 'react';
import { WidgetConfig, DashboardLayoutResponse } from '@/types/dashboard';

export function useDashboardLayout() {
  const [layout, setLayout] = useState<WidgetConfig[]>([]);
  const [availableWidgets, setAvailableWidgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLayout = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/layout');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard layout');
      }

      const data: DashboardLayoutResponse = await response.json();
      setLayout(data.layout.widgets);
      setAvailableWidgets(data.availableWidgets);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const saveLayout = async (widgets: WidgetConfig[]) => {
    const response = await fetch('/api/dashboard/layout', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ widgets }),
    });

    if (!response.ok) {
      throw new Error('Failed to save dashboard layout');
    }

    const data = await response.json();
    setLayout(data.layout.widgets);
  };

  const resetLayout = async () => {
    const response = await fetch('/api/dashboard/layout/reset', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to reset dashboard layout');
    }

    const data = await response.json();
    setLayout(data.layout.widgets);
    setAvailableWidgets(data.availableWidgets);
  };

  useEffect(() => {
    fetchLayout();
  }, []);

  return {
    layout,
    availableWidgets,
    loading,
    error,
    saveLayout,
    resetLayout,
    refetch: fetchLayout,
  };
}
