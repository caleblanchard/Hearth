'use client';

import { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import type { DashboardWidgetResult, InventoryWidgetItem } from '@/types/dashboard-widget-collection';

interface InventoryWidgetProps {
  widget?: DashboardWidgetResult<'inventory'>;
  collectionEnabled?: boolean;
  collectionLoading?: boolean;
  collectionError?: string | null;
}

export default function InventoryWidget({
  widget,
  collectionEnabled = false,
  collectionLoading = false,
  collectionError = null,
}: InventoryWidgetProps = {}) {
  const [data, setData] = useState<{ items: InventoryWidgetItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (collectionEnabled) {
      return;
    }
    fetchInventory();
  }, [collectionEnabled]);

  async function fetchInventory() {
    try {
      setLoading(true);
      setError(null);

      const deviceSecret = typeof window !== 'undefined' ? localStorage.getItem('kioskDeviceSecret') : null;
      const childToken = typeof window !== 'undefined' ? localStorage.getItem('kioskChildToken') : null;
      const headers: Record<string, string> = {};
      if (childToken) headers['X-Kiosk-Child'] = childToken;
      else if (deviceSecret) headers['X-Kiosk-Device'] = deviceSecret;

      const response = await fetch('/api/inventory/low-stock', { headers: Object.keys(headers).length ? headers : undefined });

      if (!response.ok) {
        throw new Error('Failed to fetch inventory data');
      }

      const data = await response.json();
      setData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }

  const resolvedData =
    widget?.state === 'ready' ? widget.data : data;
  const resolvedLoading = collectionEnabled ? collectionLoading : loading;
  const resolvedError =
    widget?.state === 'unavailable' ? widget.error : collectionEnabled ? collectionError : error;

  // Get urgency level based on how far below threshold
  const getUrgencyLevel = (item: InventoryWidgetItem): 'critical' | 'low' | 'moderate' => {
    if (item.currentQuantity === 0) return 'critical';

    const percentOfThreshold = (item.currentQuantity / item.lowStockThreshold) * 100;
    if (percentOfThreshold <= 25) return 'critical';
    if (percentOfThreshold <= 50) return 'low';
    return 'moderate';
  };

  // Get color based on urgency
  const getUrgencyColor = (urgency: 'critical' | 'low' | 'moderate'): string => {
    const colors = {
      critical: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20',
      low: 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20',
      moderate: 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20',
    };
    return colors[urgency];
  };

  // Sort items by urgency (critical first)
  const sortedItems = [...(resolvedData?.items || [])].sort((a, b) => {
    const urgencyOrder = { critical: 0, low: 1, moderate: 2 };
    const urgencyA = getUrgencyLevel(a);
    const urgencyB = getUrgencyLevel(b);
    return urgencyOrder[urgencyA] - urgencyOrder[urgencyB];
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Package className="w-5 h-5" />
          Inventory
        </h2>
      </div>

      {resolvedLoading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
      )}

      {resolvedError && (
        <div className="text-center py-8 text-red-600 dark:text-red-400">
          Failed to load inventory
        </div>
      )}

      {!resolvedLoading && !resolvedError && sortedItems.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          All items well stocked!
        </div>
      )}

      {!resolvedLoading && !resolvedError && sortedItems.length > 0 && (
        <div className="space-y-2">
          {sortedItems.map((item) => {
            const urgency = getUrgencyLevel(item);

            return (
              <div
                key={item.id}
                className={`border rounded-lg p-3 ${getUrgencyColor(urgency)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">
                      {item.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {item.currentQuantity} {item.unit || 'items'} (need {item.lowStockThreshold})
                    </div>
                    {item.location && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {item.location}
                      </div>
                    )}
                  </div>
                  {urgency === 'critical' && (
                    <div className="ml-2 text-xs font-medium px-2 py-1 bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
                      Urgent
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
