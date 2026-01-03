'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmModal, AlertModal } from '@/components/ui/Modal';
import { PencilIcon, TrashIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

const CATEGORIES = [
  { value: 'PRIVILEGE', label: 'Privilege' },
  { value: 'ITEM', label: 'Item' },
  { value: 'EXPERIENCE', label: 'Experience' },
  { value: 'SCREEN_TIME', label: 'Screen Time' },
  { value: 'OTHER', label: 'Other' },
];

interface Reward {
  id: string;
  name: string;
  description?: string;
  category: string;
  costCredits: number;
  quantity?: number;
  status: string;
}

export default function ManageRewardsPage() {
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  const [newReward, setNewReward] = useState({
    name: '',
    description: '',
    category: 'OTHER',
    costCredits: 10,
    quantity: '',
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    rewardId: string;
    rewardName: string;
  }>({ isOpen: false, rewardId: '', rewardName: '' });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const fetchRewards = async () => {
    try {
      const response = await fetch('/api/rewards');
      if (response.ok) {
        const data = await response.json();
        setRewards(data.rewards || []);
      }
    } catch (error) {
      console.error('Failed to fetch rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const handleAddReward = async () => {
    if (!newReward.name.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please enter a reward name',
      });
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newReward,
          quantity: newReward.quantity ? parseInt(newReward.quantity) : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: data.message || 'Reward created successfully!',
        });
        setNewReward({
          name: '',
          description: '',
          category: 'OTHER',
          costCredits: 10,
          quantity: '',
        });
        setShowAddForm(false);
        await fetchRewards();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to create reward',
        });
      }
    } catch (error) {
      console.error('Error creating reward:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to create reward',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleStartEdit = (reward: Reward) => {
    setEditingReward(reward);
    setNewReward({
      name: reward.name,
      description: reward.description || '',
      category: reward.category,
      costCredits: reward.costCredits,
      quantity: reward.quantity?.toString() || '',
    });
    setShowAddForm(true);
  };

  const handleEditReward = async () => {
    if (!editingReward) return;

    if (!newReward.name.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please enter a reward name',
      });
      return;
    }

    setAdding(true);
    try {
      const response = await fetch(`/api/rewards/${editingReward.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newReward.name,
          description: newReward.description || null,
          category: newReward.category,
          costCredits: newReward.costCredits,
          quantity: newReward.quantity ? parseInt(newReward.quantity) : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: data.message || 'Reward updated successfully!',
        });
        setNewReward({
          name: '',
          description: '',
          category: 'OTHER',
          costCredits: 10,
          quantity: '',
        });
        setShowAddForm(false);
        setEditingReward(null);
        await fetchRewards();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update reward',
        });
      }
    } catch (error) {
      console.error('Error updating reward:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to update reward',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingReward(null);
    setNewReward({
      name: '',
      description: '',
      category: 'OTHER',
      costCredits: 10,
      quantity: '',
    });
    setShowAddForm(false);
  };

  const handleDeleteClick = (rewardId: string, rewardName: string) => {
    setConfirmModal({
      isOpen: true,
      rewardId,
      rewardName,
    });
  };

  const handleDeleteConfirm = async () => {
    const { rewardId, rewardName } = confirmModal;
    setConfirmModal({ ...confirmModal, isOpen: false });

    try {
      const response = await fetch(`/api/rewards/${rewardId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: 'Reward deleted successfully',
        });
        await fetchRewards();
      } else {
        const data = await response.json();
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to delete reward',
        });
      }
    } catch (error) {
      console.error('Error deleting reward:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to delete reward',
      });
    }
  };

  const handleToggleStatus = async (rewardId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      const response = await fetch(`/api/rewards/${rewardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchRewards();
      } else {
        const data = await response.json();
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update reward',
        });
      }
    } catch (error) {
      console.error('Error updating reward:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to update reward',
      });
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Manage Rewards
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Create and manage reward items
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
              className="px-6 py-3 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {showAddForm ? (
                <>
                  <XMarkIcon className="h-5 w-5" />
                  Cancel
                </>
              ) : (
                <>
                  <PlusIcon className="h-5 w-5" />
                  Add Reward
                </>
              )}
            </button>
          </div>
        </div>

        {/* Add/Edit Reward Form */}
        {showAddForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {editingReward ? 'Edit Reward' : 'Create New Reward'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reward Name *
                </label>
                <input
                  type="text"
                  value={newReward.name}
                  onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                  placeholder="e.g., Extra Screen Time, Favorite Dinner, New Toy"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newReward.description}
                  onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
                  placeholder="Describe the reward..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    value={newReward.category}
                    onChange={(e) => setNewReward({ ...newReward, category: e.target.value })}
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
                    Cost (Credits) *
                  </label>
                  <input
                    type="number"
                    value={newReward.costCredits}
                    onChange={(e) => setNewReward({ ...newReward, costCredits: parseInt(e.target.value) || 0 })}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity (optional)
                  </label>
                  <input
                    type="number"
                    value={newReward.quantity}
                    onChange={(e) => setNewReward({ ...newReward, quantity: e.target.value })}
                    placeholder="Unlimited"
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={editingReward ? handleEditReward : handleAddReward}
                disabled={adding}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors"
              >
                {adding ? (editingReward ? 'Updating...' : 'Creating...') : (editingReward ? 'Update Reward' : 'Create Reward')}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Rewards List */}
        {rewards.length > 0 ? (
          <div className="space-y-4">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {reward.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        reward.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {reward.status}
                      </span>
                    </div>
                    {reward.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {reward.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-ember-700 dark:text-ember-500 font-medium">
                        {reward.costCredits} credits
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {reward.category}
                      </span>
                      {reward.quantity !== null && (
                        <>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {reward.quantity} in stock
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleStartEdit(reward)}
                      className="p-2 text-ember-700 hover:bg-ember-300/30 dark:hover:bg-slate-900/20 rounded-lg transition-colors"
                      title="Edit reward"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(reward.id, reward.status)}
                      className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {reward.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteClick(reward.id, reward.name)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete reward"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
              No rewards created yet.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors"
            >
              Create First Reward
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleDeleteConfirm}
        title="Delete Reward"
        message={`Delete "${confirmModal.rewardName}"? This cannot be undone.`}
        confirmText="Delete"
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
