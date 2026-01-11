'use client';

import { useState, useEffect } from 'react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { useRouter } from 'next/navigation';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { ConfirmModal } from '@/components/ui/Modal';

interface ScreenTimeType {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isArchived: boolean;
  _count?: {
    transactions: number;
    allowances: number;
  };
}

interface FamilyMember {
  id: string;
  name: string;
  role: string;
}

interface ScreenTimeAllowance {
  id: string;
  memberId: string;
  screenTimeTypeId: string;
  allowanceMinutes: number;
  period: 'DAILY' | 'WEEKLY';
  rolloverEnabled: boolean;
  rolloverCapMinutes: number | null;
  member: {
    id: string;
    name: string;
  };
  screenTimeType: {
    id: string;
    name: string;
  };
}

export default function ScreenTimeManagePage() {
  const { user, loading } = useSupabaseSession();
  const router = useRouter();
  const [types, setTypes] = useState<ScreenTimeType[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [allowances, setAllowances] = useState<ScreenTimeAllowance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Type management state
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<ScreenTimeType | null>(null);
  const [typeForm, setTypeForm] = useState({
    name: '',
    description: '',
    isActive: true,
  });

  // Allowance management state
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [editingAllowance, setEditingAllowance] = useState<ScreenTimeAllowance | null>(null);
  const [allowanceForm, setAllowanceForm] = useState({
    memberId: '',
    screenTimeTypeId: '',
    allowanceMinutes: 60,
    period: 'WEEKLY' as 'DAILY' | 'WEEKLY',
    rolloverEnabled: false,
    rolloverCapMinutes: '',
  });

  const [activeTab, setActiveTab] = useState<'types' | 'allowances'>('types');
  const [archiveConfirmModal, setArchiveConfirmModal] = useState<{
    isOpen: boolean;
    type: ScreenTimeType | null;
  }>({
    isOpen: false,
    type: null,
  });

  useEffect(() => {
    // Wait for session to load before checking role
    if (loading) {
      // Session is still loading
      return;
    }
    
    if (!session || user?.role !== 'PARENT') {
      router.push('/dashboard/screentime');
      return;
    }
    
    loadData();
  }, [user, loading, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [typesRes, familyRes, allowancesRes] = await Promise.all([
        fetch('/api/screentime/types'),
        fetch('/api/family'),
        fetch('/api/screentime/allowances'),
      ]);

      if (!typesRes.ok || !familyRes.ok || !allowancesRes.ok) {
        throw new Error('Failed to load data');
      }

      const typesData = await typesRes.json();
      const familyData = await familyRes.json();
      const allowancesData = await allowancesRes.json();

      setTypes(typesData.types || []);
      setMembers(familyData.family?.members?.filter((m: any) => m.isActive) || []);
      setAllowances(allowancesData.allowances || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load screen time settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateType = () => {
    setEditingType(null);
    setTypeForm({ name: '', description: '', isActive: true });
    setShowTypeModal(true);
  };

  const handleEditType = (type: ScreenTimeType) => {
    setEditingType(type);
    setTypeForm({
      name: type.name,
      description: type.description || '',
      isActive: type.isActive,
    });
    setShowTypeModal(true);
  };

  const handleSaveType = async () => {
    if (!typeForm.name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setError(null);
      const url = editingType
        ? `/api/screentime/types/${editingType.id}`
        : '/api/screentime/types';
      const method = editingType ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: typeForm.name.trim(),
          description: typeForm.description.trim() || null,
          isActive: typeForm.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save type');
      }

      setSuccess(editingType ? 'Type updated successfully' : 'Type created successfully');
      setShowTypeModal(false);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving type:', err);
      setError(err instanceof Error ? err.message : 'Failed to save type');
    }
  };

  const handleArchiveType = async (type: ScreenTimeType) => {
    setArchiveConfirmModal({ isOpen: true, type });
  };

  const confirmArchiveType = async () => {
    if (!archiveConfirmModal.type) return;
    const type = archiveConfirmModal.type;

    try {
      setError(null);
      setArchiveConfirmModal({ isOpen: false, type: null });
      const response = await fetch(`/api/screentime/types/${type.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to archive type');
      }

      setSuccess('Type archived successfully');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error archiving type:', err);
      setError(err instanceof Error ? err.message : 'Failed to archive type');
    }
  };

  const handleCreateAllowance = () => {
    setEditingAllowance(null);
    setAllowanceForm({
      memberId: '',
      screenTimeTypeId: '',
      allowanceMinutes: 60,
      period: 'WEEKLY',
      rolloverEnabled: false,
      rolloverCapMinutes: '',
    });
    setShowAllowanceModal(true);
  };

  const handleEditAllowance = (allowance: ScreenTimeAllowance) => {
    setEditingAllowance(allowance);
    setAllowanceForm({
      memberId: allowance.memberId,
      screenTimeTypeId: allowance.screenTimeTypeId,
      allowanceMinutes: allowance.allowanceMinutes,
      period: allowance.period,
      rolloverEnabled: allowance.rolloverEnabled,
      rolloverCapMinutes: allowance.rolloverCapMinutes?.toString() || '',
    });
    setShowAllowanceModal(true);
  };

  const handleSaveAllowance = async () => {
    if (!allowanceForm.memberId || !allowanceForm.screenTimeTypeId) {
      setError('Member and screen time type are required');
      return;
    }

    if (allowanceForm.allowanceMinutes < 0) {
      setError('Allowance must be non-negative');
      return;
    }

    if (allowanceForm.rolloverEnabled && allowanceForm.rolloverCapMinutes) {
      const cap = parseInt(allowanceForm.rolloverCapMinutes);
      if (isNaN(cap) || cap < 0) {
        setError('Rollover cap must be a non-negative number');
        return;
      }
    }

    try {
      setError(null);
      const response = await fetch('/api/screentime/allowances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: allowanceForm.memberId,
          screenTimeTypeId: allowanceForm.screenTimeTypeId,
          allowanceMinutes: allowanceForm.allowanceMinutes,
          period: allowanceForm.period,
          rolloverEnabled: allowanceForm.rolloverEnabled,
          rolloverCapMinutes: allowanceForm.rolloverCapMinutes
            ? parseInt(allowanceForm.rolloverCapMinutes)
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save allowance');
      }

      setSuccess(editingAllowance ? 'Allowance updated successfully' : 'Allowance created successfully');
      setShowAllowanceModal(false);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving allowance:', err);
      setError(err instanceof Error ? err.message : 'Failed to save allowance');
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700">        </div>
      </div>

      {/* Archive Confirmation Modal */}
      <ConfirmModal
        isOpen={archiveConfirmModal.isOpen}
        onClose={() => setArchiveConfirmModal({ isOpen: false, type: null })}
        onConfirm={confirmArchiveType}
        title="Archive Screen Time Type"
        message={archiveConfirmModal.type ? `Are you sure you want to archive "${archiveConfirmModal.type.name}"?` : ''}
        confirmText="Archive"
        cancelText="Cancel"
        confirmColor="red"
      />
    </div>
  );
}

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Screen Time Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage screen time types and allowances for your family
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 dark:text-red-400 text-sm mt-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <p className="text-green-800 dark:text-green-300">{success}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('types')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'types'
                ? 'border-ember-700 text-ember-700 dark:text-ember-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Screen Time Types
          </button>
          <button
            onClick={() => setActiveTab('allowances')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'allowances'
                ? 'border-ember-700 text-ember-700 dark:text-ember-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Allowances
          </button>
        </nav>
      </div>

      {/* Types Tab */}
      {activeTab === 'types' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Screen Time Types
            </h2>
            <button
              onClick={handleCreateType}
              className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Add Type
            </button>
          </div>

          {types.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No screen time types configured yet.
              </p>
              <button
                onClick={handleCreateType}
                className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors"
              >
                Create Your First Type
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {types.map((type) => (
                <div
                  key={type.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-4 ${
                    type.isActive
                      ? 'border-gray-200 dark:border-gray-700'
                      : 'border-gray-300 dark:border-gray-600 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {type.name}
                      </h3>
                      {type.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {type.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditType(type)}
                        className="p-1 text-gray-600 dark:text-gray-400 hover:text-ember-700 dark:hover:text-ember-500"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleArchiveType(type)}
                        className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Archive"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span
                      className={`px-2 py-1 rounded ${
                        type.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {type.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {type._count && (
                      <>
                        <span>{type._count.allowances} allowances</span>
                        <span>{type._count.transactions} logs</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Allowances Tab */}
      {activeTab === 'allowances' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Screen Time Allowances
            </h2>
            <button
              onClick={handleCreateAllowance}
              className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Add Allowance
            </button>
          </div>

          {allowances.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No allowances configured yet.
              </p>
              <button
                onClick={handleCreateAllowance}
                className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors"
              >
                Create Your First Allowance
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Member
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Allowance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Period
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Rollover
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {allowances.map((allowance) => (
                    <tr key={allowance.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {allowance.member.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {allowance.screenTimeType.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {formatTime(allowance.allowanceMinutes)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {allowance.period}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {allowance.rolloverEnabled ? (
                          <span>
                            Yes
                            {allowance.rolloverCapMinutes !== null && (
                              <span className="ml-1">
                                (cap: {formatTime(allowance.rolloverCapMinutes)})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span>No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleEditAllowance(allowance)}
                          className="p-1 text-gray-600 dark:text-gray-400 hover:text-ember-700 dark:hover:text-ember-500"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {editingType ? 'Edit Screen Time Type' : 'Create Screen Time Type'}
              </h3>
              <button
                onClick={() => setShowTypeModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., Educational, Entertainment, Gaming"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={3}
                  placeholder="Describe this screen time type..."
                />
              </div>

              {editingType && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={typeForm.isActive}
                    onChange={(e) => setTypeForm({ ...typeForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-ember-700 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Active
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveType}
                className="flex-1 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded font-medium"
              >
                {editingType ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => setShowTypeModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allowance Modal */}
      {showAllowanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {editingAllowance ? 'Edit Allowance' : 'Create Allowance'}
              </h3>
              <button
                onClick={() => setShowAllowanceModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Family Member *
                </label>
                <select
                  value={allowanceForm.memberId}
                  onChange={(e) => setAllowanceForm({ ...allowanceForm, memberId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="">Select a member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Screen Time Type *
                </label>
                <select
                  value={allowanceForm.screenTimeTypeId}
                  onChange={(e) =>
                    setAllowanceForm({ ...allowanceForm, screenTimeTypeId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="">Select a type</option>
                  {types
                    .filter((t) => t.isActive && !t.isArchived)
                    .map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Allowance (minutes) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={allowanceForm.allowanceMinutes}
                  onChange={(e) =>
                    setAllowanceForm({
                      ...allowanceForm,
                      allowanceMinutes: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatTime(allowanceForm.allowanceMinutes)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Period *
                </label>
                <select
                  value={allowanceForm.period}
                  onChange={(e) =>
                    setAllowanceForm({
                      ...allowanceForm,
                      period: e.target.value as 'DAILY' | 'WEEKLY',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rolloverEnabled"
                  checked={allowanceForm.rolloverEnabled}
                  onChange={(e) =>
                    setAllowanceForm({ ...allowanceForm, rolloverEnabled: e.target.checked })
                  }
                  className="w-4 h-4 text-ember-700 border-gray-300 rounded"
                />
                <label htmlFor="rolloverEnabled" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Enable rollover
                </label>
              </div>

              {allowanceForm.rolloverEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rollover Cap (minutes, optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={allowanceForm.rolloverCapMinutes}
                    onChange={(e) =>
                      setAllowanceForm({ ...allowanceForm, rolloverCapMinutes: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="No cap"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Maximum minutes that can roll over. Leave empty for no cap.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveAllowance}
                className="flex-1 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded font-medium"
              >
                {editingAllowance ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => setShowAllowanceModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
