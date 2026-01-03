'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmModal, AlertModal } from '@/components/ui/Modal';
import {
  ShoppingCartIcon,
  HomeIcon,
  BeakerIcon,
  HeartIcon,
  DevicePhoneMobileIcon,
  UserIcon,
  SparklesIcon,
  ArchiveBoxIcon,
  CheckIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const CATEGORIES = [
  { value: 'GROCERIES', label: 'Groceries', Icon: ShoppingCartIcon },
  { value: 'HOUSEHOLD', label: 'Household', Icon: HomeIcon },
  { value: 'PERSONAL_CARE', label: 'Personal Care', Icon: BeakerIcon },
  { value: 'HEALTH', label: 'Health', Icon: HeartIcon },
  { value: 'ELECTRONICS', label: 'Electronics', Icon: DevicePhoneMobileIcon },
  { value: 'CLOTHING', label: 'Clothing', Icon: UserIcon },
  { value: 'PETS', label: 'Pets', Icon: SparklesIcon },
  { value: 'OTHER', label: 'Other', Icon: ArchiveBoxIcon },
];

const PRIORITIES = [
  { value: 'URGENT', label: 'Urgent', color: 'red' },
  { value: 'HIGH', label: 'High', color: 'orange' },
  { value: 'NORMAL', label: 'Normal', color: 'gray' },
  { value: 'LOW', label: 'Low', color: 'gray' },
];

interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit?: string;
  priority: string;
  status: string;
  notes?: string;
  addedAt: string;
}

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState('ACTIVE'); // ACTIVE, ALL, PURCHASED
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const router = useRouter();

  // Form state
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'GROCERIES',
    quantity: 1,
    unit: '',
    priority: 'NORMAL',
    notes: '',
  });

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    itemId: string;
    itemName: string;
    isClearAll?: boolean;
  }>({ isOpen: false, itemId: '', itemName: '', isClearAll: false });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/shopping');
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch shopping list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please enter an item name',
      });
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/shopping/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: data.message || 'Item added to shopping list',
        });
        setNewItem({
          name: '',
          category: 'GROCERIES',
          quantity: 1,
          unit: '',
          priority: 'NORMAL',
          notes: '',
        });
        setShowAddForm(false);
        await fetchItems();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to add item',
        });
      }
    } catch (error) {
      console.error('Error adding item:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to add item',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateStatus = async (itemId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/shopping/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchItems();
      } else {
        const data = await response.json();
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update item',
        });
      }
    } catch (error) {
      console.error('Error updating item:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to update item',
      });
    }
  };

  const handleDeleteClick = (itemId: string, itemName: string) => {
    setConfirmModal({
      isOpen: true,
      itemId,
      itemName,
    });
  };

  const handleDeleteConfirm = async () => {
    const { itemId, isClearAll } = confirmModal;
    setConfirmModal({ ...confirmModal, isOpen: false });

    if (isClearAll) {
      // Clear all purchased items
      await handleClearPurchased();
      return;
    }

    // Single item delete
    try {
      const response = await fetch(`/api/shopping/items/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: 'Item removed from shopping list',
        });
        await fetchItems();
      } else {
        const data = await response.json();
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to delete item',
        });
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to delete item',
      });
    }
  };

  const handleClearPurchasedClick = () => {
    const purchasedCount = items.filter(i => i.status === 'PURCHASED').length;
    if (purchasedCount === 0) return;

    setConfirmModal({
      isOpen: true,
      itemId: '',
      itemName: '',
      isClearAll: true,
    });
  };

  const handleClearPurchased = async () => {
    const purchasedItems = items.filter(i => i.status === 'PURCHASED');

    try {
      // Delete all purchased items
      const deletePromises = purchasedItems.map(item =>
        fetch(`/api/shopping/items/${item.id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      setAlertModal({
        isOpen: true,
        type: 'success',
        title: 'Success!',
        message: `Cleared ${purchasedItems.length} purchased item${purchasedItems.length !== 1 ? 's' : ''}`,
      });
      await fetchItems();
    } catch (error) {
      console.error('Error clearing purchased items:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to clear purchased items',
      });
    }
  };

  const handleStartEdit = (item: ShoppingItem) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit || '',
      priority: item.priority,
      notes: item.notes || '',
    });
    setShowAddForm(true);
  };

  const handleEditItem = async () => {
    if (!editingItem) return;

    if (!newItem.name.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please enter an item name',
      });
      return;
    }

    setAdding(true);
    try {
      const response = await fetch(`/api/shopping/items/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItem.name,
          category: newItem.category,
          quantity: newItem.quantity,
          unit: newItem.unit || null,
          priority: newItem.priority,
          notes: newItem.notes || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: data.message || 'Item updated successfully',
        });
        setNewItem({
          name: '',
          category: 'GROCERIES',
          quantity: 1,
          unit: '',
          priority: 'NORMAL',
          notes: '',
        });
        setShowAddForm(false);
        setEditingItem(null);
        await fetchItems();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update item',
        });
      }
    } catch (error) {
      console.error('Error updating item:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to update item',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setNewItem({
      name: '',
      category: 'GROCERIES',
      quantity: 1,
      unit: '',
      priority: 'NORMAL',
      notes: '',
    });
    setShowAddForm(false);
  };

  const filteredItems = items.filter(item => {
    if (filter === 'ACTIVE') {
      return item.status === 'PENDING' || item.status === 'IN_CART';
    } else if (filter === 'PURCHASED') {
      return item.status === 'PURCHASED';
    }
    return true; // ALL
  });

  const urgentItems = filteredItems.filter(i => i.priority === 'URGENT');
  const regularItems = filteredItems.filter(i => i.priority !== 'URGENT');

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Shopping List
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {filteredItems.length} items
                {urgentItems.length > 0 && (
                  <span className="ml-2 text-red-600 dark:text-red-400 font-medium">
                    ({urgentItems.length} urgent)
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => {
                if (showAddForm) {
                  handleCancelEdit();
                } else {
                  setShowAddForm(true);
                }
              }}
              className="px-6 py-3 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              {showAddForm ? 'Cancel' : '+ Add Item'}
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex items-center gap-2">
          <button
            onClick={() => setFilter('ACTIVE')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'ACTIVE'
                ? 'bg-ember-700 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'ALL'
                ? 'bg-ember-700 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('PURCHASED')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'PURCHASED'
                ? 'bg-ember-700 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Purchased
          </button>
          {items.filter(i => i.status === 'PURCHASED').length > 0 && (
            <button
              onClick={handleClearPurchasedClick}
              className="ml-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <TrashIcon className="h-4 w-4" />
              Clear Purchased
            </button>
          )}
        </div>

        {/* Add/Edit Item Form */}
        {showAddForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g., Milk, Bread, etc."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={newItem.priority}
                  onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {PRIORITIES.map((pri) => (
                    <option key={pri.value} value={pri.value}>
                      {pri.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit (optional)
                </label>
                <input
                  type="text"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  placeholder="e.g., lbs, oz, gallons"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  placeholder="Any additional details..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={editingItem ? handleEditItem : handleAddItem}
                disabled={adding}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors duration-200"
              >
                {adding ? (editingItem ? 'Updating...' : 'Adding...') : (editingItem ? 'Update Item' : 'Add to List')}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-semibold rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Urgent Items */}
        {urgentItems.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
              Urgent Items
            </h2>
            <div className="space-y-3">
              {urgentItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onUpdateStatus={handleUpdateStatus}
                  onDelete={handleDeleteClick}
                  onEdit={handleStartEdit}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Items */}
        {regularItems.length > 0 ? (
          <div className="space-y-3">
            {regularItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDeleteClick}
                onEdit={handleStartEdit}
              />
            ))}
          </div>
        ) : urgentItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {filter === 'PURCHASED' ? 'No purchased items yet.' : 'Your shopping list is empty!'}
            </p>
          </div>
        ) : null}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleDeleteConfirm}
        title={confirmModal.isClearAll ? 'Clear Purchased Items' : 'Remove Item'}
        message={
          confirmModal.isClearAll
            ? `Clear all ${items.filter(i => i.status === 'PURCHASED').length} purchased items from the list?`
            : `Remove "${confirmModal.itemName}" from shopping list?`
        }
        confirmText={confirmModal.isClearAll ? 'Clear All' : 'Remove'}
        cancelText="Cancel"
        confirmColor="red"
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}

function ItemCard({
  item,
  onUpdateStatus,
  onDelete,
  onEdit,
}: {
  item: ShoppingItem;
  onUpdateStatus: (id: string, status: string) => void;
  onDelete: (id: string, name: string) => void;
  onEdit: (item: ShoppingItem) => void;
}) {
  const category = CATEGORIES.find(c => c.value === item.category);
  const CategoryIcon = category?.Icon || ArchiveBoxIcon;
  const isPurchased = item.status === 'PURCHASED';
  const isInCart = item.status === 'IN_CART';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 ${isPurchased ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <CategoryIcon className="h-8 w-8 text-ember-700 dark:text-ember-500 flex-shrink-0" />
            <div className="flex-1">
              <h3 className={`text-lg font-semibold ${isPurchased ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                {item.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {item.quantity} {item.unit || 'item'}
                  {item.quantity > 1 && !item.unit && 's'}
                </span>
                <span className="text-sm text-gray-400">•</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {category?.label || item.category}
                </span>
                {item.priority !== 'NORMAL' && (
                  <>
                    <span className="text-sm text-gray-400">•</span>
                    <span className={`text-sm font-medium ${
                      item.priority === 'URGENT' ? 'text-red-600 dark:text-red-400' :
                      item.priority === 'HIGH' ? 'text-orange-600 dark:text-orange-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {item.priority}
                    </span>
                  </>
                )}
              </div>
              {item.notes && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {item.notes}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 ml-4">
          {!isPurchased && (
            <>
              {!isInCart ? (
                <button
                  onClick={() => onUpdateStatus(item.id, 'IN_CART')}
                  className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white text-sm font-semibold rounded-lg transition-colors duration-200 whitespace-nowrap"
                >
                  Add to Cart
                </button>
              ) : (
                <button
                  onClick={() => onUpdateStatus(item.id, 'PURCHASED')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
                >
                  <CheckIcon className="h-4 w-4" />
                  Purchased
                </button>
              )}
            </>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(item)}
              className="p-2 text-ember-700 hover:bg-ember-300/30 dark:hover:bg-slate-900/20 rounded-lg transition-colors"
              title="Edit item"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => onDelete(item.id, item.name)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Remove item"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
