'use client';

import { useRouter } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import InventoryList from './InventoryList';

export default function InventoryPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-end gap-4">
        <button
          onClick={() => router.push('/dashboard/inventory/create')}
          className="flex items-center gap-2 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg font-medium transition-colors sm:flex-shrink-0"
        >
          <PlusIcon className="h-5 w-5" />
          Add Item
        </button>
      </div>

      <InventoryList />
    </div>
  );
}
