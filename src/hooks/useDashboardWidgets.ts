import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiRequest, buildQueryString } from '@/lib/api-client';
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

  // Stringify widgets array to get a stable identity that survives
  // new array references from the caller between renders.
  const widgetsKey = useMemo(() => JSON.stringify(widgets), [widgets]);

  const fetchWidgets = useCallback(async () => {
    const widgetsArray = JSON.parse(widgetsKey) as DashboardWidgetKind[];

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
      const query = buildQueryString({ 'widgets[]': widgetsArray, memberId });
      const widgetData = await apiRequest<DashboardWidgetCollection>(
        `/api/dashboard/widgets${query}`
      );
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
    const widgetsArray = JSON.parse(widgetsKey) as DashboardWidgetKind[];
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
