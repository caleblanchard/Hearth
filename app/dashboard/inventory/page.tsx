'use client';

import { useRouter } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import InventoryList from './InventoryList';

export default function InventoryPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Household Inventory
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track pantry items, supplies, and household staples
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/inventory/create')}
          className="flex items-center gap-2 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg font-medium transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Add Item
        </button>
      </div>

      <InventoryList />
    </div>
  );
}
