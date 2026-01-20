'use client';

import { useState, useEffect } from 'react';
import { Package } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentQuantity: number;
  lowStockThreshold: number;
  unit: string | null;
  location: string | null;
}

interface InventoryWidgetData {
  items: InventoryItem[];
}

export default function InventoryWidget() {
  const [data, setData] = useState<InventoryWidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/inventory/low-stock');

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

  // Get urgency level based on how far below threshold
  const getUrgencyLevel = (item: InventoryItem): 'critical' | 'low' | 'moderate' => {
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
  const sortedItems = [...(data?.items || [])].sort((a, b) => {
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

      {loading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
      )}

      {error && (
        <div className="text-center py-8 text-red-600 dark:text-red-400">
          Failed to load inventory
        </div>
      )}

      {!loading && !error && sortedItems.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          All items well stocked!
        </div>
      )}

      {!loading && !error && sortedItems.length > 0 && (
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
