'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

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
  createdAt: string;
  updatedAt: string;
}

export default function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (!resolvedParams?.id) return;

    const loadItem = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/inventory/${resolvedParams.id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Inventory item not found');
          } else {
            setError('Failed to load inventory item');
          }
          return;
        }

        const data = await response.json();
        setItem(data.item);
      } catch (err) {
        setError('Failed to load inventory item');
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [resolvedParams]);

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;
    if (!confirm('Are you sure you want to delete this inventory item?')) return;

    try {
      const response = await fetch(`/api/inventory/${resolvedParams.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/dashboard/inventory');
      } else {
        alert('Failed to delete inventory item');
      }
    } catch (err) {
      alert('Failed to delete inventory item');
    }
  };

  const isLowStock = (item: InventoryItem) => {
    return item.lowStockThreshold !== null && item.currentQuantity <= item.lowStockThreshold;
  };

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">{error || 'Item not found'}</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/inventory')}
          className="mt-4 text-ember-700 dark:text-ember-400 hover:underline"
        >
          ← Back to Inventory
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/inventory')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Back to Inventory
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {item.name}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                {item.category}
              </span>
              <span>•</span>
              <span>{item.location}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/dashboard/inventory/${item.id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
            >
              <PencilIcon className="h-5 w-5" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <TrashIcon className="h-5 w-5" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Status Alerts */}
      <div className="space-y-2 mb-6">
        {isExpired(item.expiresAt) && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg">
            <span className="text-xl">🚫</span>
            <span className="font-medium">Expired on {new Date(item.expiresAt!).toLocaleDateString()}</span>
          </div>
        )}
        {!isExpired(item.expiresAt) && isExpiringSoon(item.expiresAt) && (
          <div className="flex items-center gap-2 px-4 py-3 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-lg">
            <span className="text-xl">⚠️</span>
            <span className="font-medium">Expires soon: {new Date(item.expiresAt!).toLocaleDateString()}</span>
          </div>
        )}
        {isLowStock(item) && (
          <div className="flex items-center gap-2 px-4 py-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-lg">
            <span className="text-xl">📦</span>
            <span className="font-medium">Low stock: {item.currentQuantity} {item.unit} remaining</span>
          </div>
        )}
      </div>

      {/* Details Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Quantity */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quantity</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Stock</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {item.currentQuantity} {item.unit}
                </p>
              </div>
              {item.lowStockThreshold !== null && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Low Stock Threshold</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {item.lowStockThreshold} {item.unit}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Expiration */}
          {item.expiresAt && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Expiration</h2>
              <p className="text-gray-700 dark:text-gray-300">
                {new Date(item.expiresAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}

          {/* Barcode */}
          {item.barcode && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Barcode</h2>
              <p className="font-mono text-gray-700 dark:text-gray-300">{item.barcode}</p>
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Notes</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}

          {/* Last Restocked */}
          {item.lastRestockedAt && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Last Restocked</h2>
              <p className="text-gray-700 dark:text-gray-300">
                {new Date(item.lastRestockedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <p className="font-medium mb-1">Created</p>
                <p>{new Date(item.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="font-medium mb-1">Last Updated</p>
                <p>{new Date(item.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
