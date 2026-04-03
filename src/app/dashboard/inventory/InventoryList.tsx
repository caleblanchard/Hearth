'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  location: string;
  currentQuantity: number;
  unit: string;
  lowStockThreshold: number | null;
  expiresAt: string | null;
  barcode: string | null;
  notes: string | null;
  lastRestockedAt: string | null;
  familyId: string;
  createdAt: string;
  updatedAt: string;
}

interface InventoryResponse {
  items: InventoryItem[];
}

interface UndoToast {
  id: string;
  itemId: string;
  name: string;
  prevQuantity: number;
  amount: number;
}

export default function InventoryList() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'low-stock' | 'expiring'>('all');
  const [undoToasts, setUndoToasts] = useState<UndoToast[]>([]);
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!openPopover) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
        setCustomAmount('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openPopover]);

  const adjustQuantity = useCallback(async (itemId: string, delta: number, itemName: string, currentQty: number) => {
    const newQty = Math.max(0, currentQty + delta);
    if (newQty === currentQty) return;

    // Optimistic update
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, currentQuantity: newQty } : i
    ));

    if (delta < 0) {
      const toastId = Math.random().toString(36).slice(2);
      const toast: UndoToast = { id: toastId, itemId, name: itemName, prevQuantity: currentQty, amount: Math.abs(delta) };
      setUndoToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setUndoToasts(prev => prev.filter(t => t.id !== toastId));
      }, 4000);
    }

    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_quantity: newQty }),
      });
      if (!res.ok) throw new Error('Failed');
    } catch {
      // Revert on failure
      setItems(prev => prev.map(i =>
        i.id === itemId ? { ...i, currentQuantity: currentQty } : i
      ));
    }
  }, []);

  const undoAdjust = useCallback(async (toast: UndoToast) => {
    setUndoToasts(prev => prev.filter(t => t.id !== toast.id));
    setItems(prev => prev.map(i =>
      i.id === toast.itemId ? { ...i, currentQuantity: toast.prevQuantity } : i
    ));
    try {
      await fetch(`/api/inventory/${toast.itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_quantity: toast.prevQuantity }),
      });
    } catch {
      // best-effort undo
    }
  }, []);

  const loadItems = async () => {
    setLoading(true);
    setError(null);

    try {
      let url = '/api/inventory';
      if (filter === 'low-stock') {
        url = '/api/inventory/low-stock';
      } else if (filter === 'expiring') {
        url = '/api/inventory/expiring';
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load inventory items');
      }

      const data: InventoryResponse = await response.json();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [filter]);

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      FOOD_PANTRY: 'Pantry',
      FOOD_FRIDGE: 'Fridge',
      FOOD_FREEZER: 'Freezer',
      CLEANING: 'Cleaning',
      TOILETRIES: 'Toiletries',
      PAPER_GOODS: 'Paper Goods',
      MEDICINE: 'Medicine',
      PET_SUPPLIES: 'Pet Supplies',
      OTHER: 'Other',
    };
    return labels[category] || category;
  };

  const getLocationLabel = (location: string): string => {
    const labels: Record<string, string> = {
      PANTRY: 'Pantry',
      FRIDGE: 'Fridge',
      FREEZER: 'Freezer',
      BATHROOM: 'Bathroom',
      GARAGE: 'Garage',
      LAUNDRY_ROOM: 'Laundry Room',
      KITCHEN_CABINET: 'Kitchen Cabinet',
      OTHER: 'Other',
    };
    return labels[location] || location;
  };

  const getCategoryEmoji = (category: string): string => {
    const emojis: Record<string, string> = {
      FOOD_PANTRY: '🥫',
      FOOD_FRIDGE: '🥛',
      FOOD_FREEZER: '🧊',
      CLEANING: '🧹',
      TOILETRIES: '🧴',
      PAPER_GOODS: '🧻',
      MEDICINE: '💊',
      PET_SUPPLIES: '🐾',
      OTHER: '📦',
    };
    return emojis[category] || '📦';
  };

  const isLowStock = (item: InventoryItem): boolean => {
    return (
      item.lowStockThreshold !== null && item.currentQuantity <= item.lowStockThreshold
    );
  };

  const isExpiringSoon = (item: InventoryItem): boolean => {
    if (!item.expiresAt) return false;
    const expiresDate = new Date(item.expiresAt);
    const now = new Date();
    const daysUntilExpiration = Math.ceil(
      (expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiration <= 7 && daysUntilExpiration >= 0;
  };

  const getExpirationText = (expiresAt: string | null): string | null => {
    if (!expiresAt) return null;
    const expiresDate = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiration = Math.ceil(
      (expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration < 0) return 'Expired';
    if (daysUntilExpiration === 0) return 'Expires today';
    if (daysUntilExpiration === 1) return 'Expires tomorrow';
    return `Expires in ${daysUntilExpiration} days`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-600 dark:text-gray-400">Loading inventory...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-ember-700 text-ember-700 dark:border-ember-500 dark:text-ember-500'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          All Items
        </button>
        <button
          onClick={() => setFilter('low-stock')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'low-stock'
              ? 'border-orange-600 text-orange-600 dark:border-orange-400 dark:text-orange-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Low Stock
        </button>
        <button
          onClick={() => setFilter('expiring')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'expiring'
              ? 'border-red-600 text-red-600 dark:border-red-400 dark:text-red-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Expiring Soon
        </button>
      </div>

      {/* Inventory Grid */}
      {items.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            {filter === 'all'
              ? 'No inventory items yet. Add items to get started!'
              : filter === 'low-stock'
              ? 'No low-stock items found.'
              : 'No items expiring soon.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              {/* Item Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl">{getCategoryEmoji(item.category)}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getCategoryLabel(item.category)} · {getLocationLabel(item.location)}
                  </p>
                </div>
              </div>

              {/* Quantity + quick-use controls */}
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-baseline gap-2 flex-1">
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {item.currentQuantity}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.unit}
                    </span>
                  </div>
                  {/* Use / Restock buttons */}
                  <div className="flex items-center gap-1" ref={openPopover === item.id ? popoverRef : null}>
                    <div className="flex relative">
                      <button
                        onClick={() => adjustQuantity(item.id, -1, item.name, item.currentQuantity)}
                        disabled={item.currentQuantity === 0}
                        title="Use 1"
                        className="w-8 h-8 flex items-center justify-center rounded-l-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold text-base leading-none"
                      >
                        −
                      </button>
                      <button
                        onClick={() => { setOpenPopover(openPopover === item.id ? null : item.id); setCustomAmount(''); }}
                        disabled={item.currentQuantity === 0}
                        title="Use custom amount"
                        className="w-5 h-8 flex items-center justify-center rounded-r-lg bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border-l border-orange-200 dark:border-orange-800 text-xs"
                      >
                        ▾
                      </button>
                      {/* Custom amount popover */}
                      {openPopover === item.id && (
                        <div className="absolute top-full right-0 mt-1 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 w-44">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Use how many?</p>
                          <div className="flex gap-1 mb-2">
                            {[2, 5, 10].map(n => (
                              <button
                                key={n}
                                onClick={() => { adjustQuantity(item.id, -n, item.name, item.currentQuantity); setOpenPopover(null); }}
                                disabled={item.currentQuantity < n}
                                className="flex-1 py-1 text-sm rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                −{n}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              min="1"
                              max={item.currentQuantity}
                              value={customAmount}
                              onChange={e => setCustomAmount(e.target.value)}
                              placeholder="Other"
                              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w-0"
                            />
                            <button
                              onClick={() => {
                                const n = parseInt(customAmount);
                                if (n > 0 && n <= item.currentQuantity) {
                                  adjustQuantity(item.id, -n, item.name, item.currentQuantity);
                                  setOpenPopover(null);
                                  setCustomAmount('');
                                }
                              }}
                              disabled={!customAmount || parseInt(customAmount) <= 0 || parseInt(customAmount) > item.currentQuantity}
                              className="px-2 py-1 text-sm rounded bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Use
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => adjustQuantity(item.id, 1, item.name, item.currentQuantity)}
                      title="Restock 1"
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors font-bold text-base leading-none"
                    >
                      +
                    </button>
                  </div>
                </div>
                {item.lowStockThreshold !== null && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Low stock threshold: {item.lowStockThreshold} {item.unit}
                  </p>
                )}
              </div>

              {/* Alerts */}
              <div className="space-y-2 mb-3">
                {isLowStock(item) && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded text-sm">
                    <span>⚠️</span>
                    <span>Low stock</span>
                  </div>
                )}
                {isExpiringSoon(item) && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded text-sm">
                    <span>⏰</span>
                    <span>{getExpirationText(item.expiresAt)}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {item.notes && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {item.notes}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/dashboard/inventory/${item.id}`)}
                  className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Undo toast stack */}
      {undoToasts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
          {undoToasts.map(toast => (
            <div
              key={toast.id}
              className="flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-xl shadow-lg text-sm whitespace-nowrap"
            >
              <span>Used {toast.amount} {toast.name}</span>
              <button
                onClick={() => undoAdjust(toast)}
                className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                Undo
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
