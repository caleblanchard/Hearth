import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  DashboardWidgetCollection,
  DashboardWidgetKind,
  DashboardWidgetResults,
  DashboardWidgetIssue,
} from '@/types/dashboard-widget-collection';

interface UseDashboardWidgetsParams {
  widgets: DashboardWidgetKind[];
  memberId?: string;
  refreshInterval?: number; // default: 300000 (5 min)
}

interface UseDashboardWidgetsReturn {
  data: DashboardWidgetResults;
  loading: boolean;
  error: Error | null;
  partial: boolean;
  capturedAt: string | null;
  issues: DashboardWidgetIssue[];
  refetch: () => Promise<void>;
}

export function useDashboardWidgets({
  widgets,
  memberId,
  refreshInterval = 300000, // 5 minutes default
}: UseDashboardWidgetsParams): UseDashboardWidgetsReturn {
  const [collection, setCollection] = useState<DashboardWidgetCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stringify widgets array to avoid reference comparison issues
  const widgetsKey = JSON.stringify(widgets);

  const fetchWidgets = useCallback(async () => {
    const widgetsArray = JSON.parse(widgetsKey);

    // Don't fetch if no widgets specified
    if (!widgetsArray || widgetsArray.length === 0) {
      setCollection(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query string
      const params = new URLSearchParams();
      widgetsArray.forEach((widget: string) => params.append('widgets[]', widget));
      if (memberId) {
        params.append('memberId', memberId);
      }

      const response = await fetch(`/api/dashboard/widgets?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch widgets');
      }

      const widgetData = (await response.json()) as DashboardWidgetCollection;
      setCollection(widgetData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setCollection(null);
    } finally {
      setLoading(false);
    }
  }, [widgetsKey, memberId]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  // Set up auto-refresh interval
  useEffect(() => {
    const widgetsArray = JSON.parse(widgetsKey);
    if (!widgetsArray || widgetsArray.length === 0 || !refreshInterval) {
      return;
    }

    intervalRef.current = setInterval(() => {
      fetchWidgets();
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [widgetsKey, refreshInterval, fetchWidgets]);

  return {
    data: collection?.widgets ?? {},
    loading,
    error,
    partial: collection?.partial ?? false,
    capturedAt: collection?.capturedAt ?? null,
    issues: collection?.issues ?? [],
    refetch: fetchWidgets,
  };
}
