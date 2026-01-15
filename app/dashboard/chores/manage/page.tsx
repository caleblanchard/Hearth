'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { useCurrentMember } from '@/hooks/useCurrentMember';
import { ConfirmModal, AlertModal } from '@/components/ui/Modal';
import {
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CurrencyDollarIcon,
  StarIcon,
  ClockIcon,
  CalendarIcon,
  UsersIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';

const DIFFICULTIES = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
];

const FREQUENCIES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Biweekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const ASSIGNMENT_TYPES = [
  { value: 'FIXED', label: 'Fixed (same person every time)' },
  { value: 'ROTATING', label: 'Rotating (takes turns)' },
  { value: 'OPT_IN', label: 'Opt-in (available to all)' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

interface Chore {
  id: string;
  name: string;
  description?: string;
  creditValue: number;
  difficulty: string;
  estimatedMinutes: number;
  minimumAge?: number;
  iconName?: string;
  isActive: boolean;
  schedules: Schedule[];
}

interface Schedule {
  id: string;
  assignmentType: string;
  frequency: string;
  dayOfWeek?: number;
  requiresApproval: boolean;
  requiresPhoto: boolean;
  assignments: Assignment[];
  _count?: {
    instances: number;
  };
}

interface Assignment {
  id: string;
  memberId: string;
  rotationOrder?: number;
  member: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  isActive: boolean;
}

export default function ManageChoresPage() {
  console.log('🚀 ManageChoresPage component rendered');
  const session = useSupabaseSession();
  const { user } = session;
  const { isParent, loading: memberLoading } = useCurrentMember();
  const router = useRouter();
  const [chores, setChores] = useState<Chore[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  console.log('📊 Current familyMembers state:', familyMembers);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);

  const [newChore, setNewChore] = useState({
    name: '',
    description: '',
    creditValue: 10,
    difficulty: 'MEDIUM',
    estimatedMinutes: 15,
    minimumAge: 0,
    assignmentType: 'FIXED',
    frequency: 'DAILY',
    dayOfWeek: 1,
    requiresApproval: false,
    requiresPhoto: false,
    selectedMembers: [] as string[],
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    choreId: string;
    choreName: string;
  }>({ isOpen: false, choreId: '', choreName: '' });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  // Check authorization
  useEffect(() => {
    // Only redirect if loading is complete and user is not a parent
    if (!memberLoading && !isParent && user) {
      router.push('/dashboard');
    }
  }, [memberLoading, isParent, user, router]);

  const fetchChores = async () => {
    try {
      const response = await fetch('/api/chores');
      if (response.ok) {
        const data = await response.json();
        // Handle paginated response structure
        const choresArray = data.data || data.chores || [];
        setChores(Array.isArray(choresArray) ? choresArray : []);
      }
    } catch (error) {
      console.error('Failed to fetch chores:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilyMembers = async () => {
    console.log('🔍 fetchFamilyMembers called');
    try {
      console.log('📡 Fetching from /api/family...');
      const response = await fetch('/api/family-data');
      console.log('📥 Response status:', response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Family API response:', data);

        // Get all family members
        const allMembers = data.family?.members || [];
        console.log('📋 All family members:', allMembers, 'Count:', allMembers.length);

        setFamilyMembers(allMembers);
        console.log('✅ State updated with', allMembers.length, 'members');
      } else {
        console.error('❌ Failed to fetch family members - response not ok:', response.status);
      }
    } catch (error) {
      console.error('❌ Failed to fetch family members - error:', error);
    }
  };

  useEffect(() => {
    fetchChores();
    fetchFamilyMembers();
  }, []);

  // Fetch family members when the add form is opened
  useEffect(() => {
    if (showAddForm) {
      console.log('Add form opened, fetching family members...');
      fetchFamilyMembers();
    }
  }, [showAddForm]);

  const handleAddChore = async () => {
    // Validation
    if (!newChore.name.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please enter a chore name',
      });
      return;
    }

    if (newChore.selectedMembers.length === 0) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please select at least one family member',
      });
      return;
    }

    if (newChore.assignmentType === 'ROTATING' && newChore.selectedMembers.length < 2) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Selection',
        message: 'Rotating chores require at least 2 family members',
      });
      return;
    }

    if ((newChore.frequency === 'WEEKLY' || newChore.frequency === 'BIWEEKLY') && newChore.dayOfWeek == null) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please select a day of the week',
      });
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChore.name,
          description: newChore.description || null,
          creditValue: newChore.creditValue,
          difficulty: newChore.difficulty,
          estimatedMinutes: newChore.estimatedMinutes,
          minimumAge: newChore.minimumAge || null,
          schedule: {
            assignmentType: newChore.assignmentType,
            frequency: newChore.frequency,
            dayOfWeek: (newChore.frequency === 'WEEKLY' || newChore.frequency === 'BIWEEKLY') ? newChore.dayOfWeek : null,
            requiresApproval: newChore.requiresApproval,
            requiresPhoto: newChore.requiresPhoto,
            assignments: newChore.selectedMembers.map((memberId, index) => ({
              memberId,
              rotationOrder: newChore.assignmentType === 'ROTATING' ? index : null,
            })),
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: data.message || 'Chore created successfully!',
        });

        // Reset form
        setNewChore({
          name: '',
          description: '',
          creditValue: 10,
          difficulty: 'MEDIUM',
          estimatedMinutes: 15,
          minimumAge: 0,
          assignmentType: 'FIXED',
          frequency: 'DAILY',
          dayOfWeek: 1,
          requiresApproval: false,
          requiresPhoto: false,
          selectedMembers: [],
        });
        setShowAddForm(false);
        fetchChores();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to create chore',
        });
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'An error occurred while creating the chore',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteChore = async (choreId: string) => {
    try {
      const response = await fetch(`/api/chores/${choreId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: data.message || 'Chore deleted successfully',
        });
        fetchChores();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to delete chore',
        });
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'An error occurred while deleting the chore',
      });
    } finally {
      setConfirmModal({ isOpen: false, choreId: '', choreName: '' });
    }
  };

  const handleStartEdit = (chore: Chore) => {
    setEditingChore(chore);
    setNewChore({
      name: chore.name,
      description: chore.description || '',
      creditValue: chore.creditValue,
      difficulty: chore.difficulty,
      estimatedMinutes: chore.estimatedMinutes,
      minimumAge: chore.minimumAge || 0,
      assignmentType: chore.schedules[0]?.assignmentType || 'FIXED',
      frequency: chore.schedules[0]?.frequency || 'DAILY',
      dayOfWeek: chore.schedules[0]?.dayOfWeek ?? 1,
      requiresApproval: chore.schedules[0]?.requiresApproval || false,
      requiresPhoto: chore.schedules[0]?.requiresPhoto || false,
      selectedMembers: chore.schedules[0]?.assignments.map(a => a.memberId) || [],
    });
    setShowAddForm(true);
  };

  const handleEditChore = async () => {
    if (!editingChore) return;

    // Validation
    if (!newChore.name.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please enter a chore name',
      });
      return;
    }

    setAdding(true);
    try {
      const response = await fetch(`/api/chores/${editingChore.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChore.name,
          description: newChore.description || null,
          creditValue: newChore.creditValue,
          difficulty: newChore.difficulty,
          estimatedMinutes: newChore.estimatedMinutes,
          minimumAge: newChore.minimumAge || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: data.message || 'Chore updated successfully!',
        });

        // Reset form
        setNewChore({
          name: '',
          description: '',
          creditValue: 10,
          difficulty: 'MEDIUM',
          estimatedMinutes: 15,
          minimumAge: 0,
          assignmentType: 'FIXED',
          frequency: 'DAILY',
          dayOfWeek: 1,
          requiresApproval: false,
          requiresPhoto: false,
          selectedMembers: [],
        });
        setShowAddForm(false);
        setEditingChore(null);
        fetchChores();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update chore',
        });
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'An error occurred while updating the chore',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingChore(null);
    setShowAddForm(false);
    setNewChore({
      name: '',
      description: '',
      creditValue: 10,
      difficulty: 'MEDIUM',
      estimatedMinutes: 15,
      minimumAge: 0,
      assignmentType: 'FIXED',
      frequency: 'DAILY',
      dayOfWeek: 1,
      requiresApproval: false,
      requiresPhoto: false,
      selectedMembers: [],
    });
  };

  const handleToggleMemberSelection = (memberId: string) => {
    setNewChore(prev => {
      const isSelected = prev.selectedMembers.includes(memberId);
      if (isSelected) {
        return {
          ...prev,
          selectedMembers: prev.selectedMembers.filter(id => id !== memberId),
        };
      } else {
        return {
          ...prev,
          selectedMembers: [...prev.selectedMembers, memberId],
        };
      }
    });
  };

  const getFrequencyDisplay = (schedule: Schedule) => {
    if (schedule.frequency === 'WEEKLY' || schedule.frequency === 'BIWEEKLY') {
      const day = DAYS_OF_WEEK.find(d => d.value === schedule.dayOfWeek);
      return `${schedule.frequency === 'BIWEEKLY' ? 'Biweekly' : 'Weekly'} (${day?.label || 'Unknown'})`;
    }
    return schedule.frequency.charAt(0) + schedule.frequency.slice(1).toLowerCase();
  };

  const getAssignmentDisplay = (schedule: Schedule) => {
    const names = schedule.assignments.map(a => a.member.name).join(' → ');
    const type = schedule.assignmentType === 'FIXED' ? 'Fixed' :
                 schedule.assignmentType === 'ROTATING' ? 'Rotating' : 'Opt-in';
    return `${names} (${type})`;
  };

  if (!isParent) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Manage Chores
        </h2>
        <button
          onClick={() => {
            if (showAddForm) {
              handleCancelEdit();
            } else {
              setShowAddForm(true);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg transition-colors"
        >
          {showAddForm ? <XMarkIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
          {showAddForm ? 'Cancel' : 'Add Chore'}
        </button>
      </div>

      {/* Add/Edit Chore Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingChore ? 'Edit Chore' : 'Create New Chore'}
          </h3>

          <div className="space-y-4">
            {/* Chore Definition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Chore Name *
              </label>
              <input
                type="text"
                value={newChore.name}
                onChange={(e) => setNewChore({ ...newChore, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., Make Your Bed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={newChore.description}
                onChange={(e) => setNewChore({ ...newChore, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={2}
                placeholder="Optional instructions or details"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Credits *
                </label>
                <input
                  type="number"
                  value={newChore.creditValue}
                  onChange={(e) => setNewChore({ ...newChore, creditValue: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Difficulty *
                </label>
                <select
                  value={newChore.difficulty}
                  onChange={(e) => setNewChore({ ...newChore, difficulty: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {DIFFICULTIES.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Est. Minutes *
                </label>
                <input
                  type="number"
                  value={newChore.estimatedMinutes}
                  onChange={(e) => setNewChore({ ...newChore, estimatedMinutes: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="1"
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                Schedule
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Frequency *
                  </label>
                  <select
                    value={newChore.frequency}
                    onChange={(e) => setNewChore({ ...newChore, frequency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {FREQUENCIES.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {(newChore.frequency === 'WEEKLY' || newChore.frequency === 'BIWEEKLY') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Day of Week *
                    </label>
                    <select
                      value={newChore.dayOfWeek}
                      onChange={(e) => setNewChore({ ...newChore, dayOfWeek: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {DAYS_OF_WEEK.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newChore.requiresApproval}
                    onChange={(e) => setNewChore({ ...newChore, requiresApproval: e.target.checked })}
                    className="rounded border-gray-300 text-ember-700 focus:ring-ember-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Requires parent approval
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newChore.requiresPhoto}
                    onChange={(e) => setNewChore({ ...newChore, requiresPhoto: e.target.checked })}
                    className="rounded border-gray-300 text-ember-700 focus:ring-ember-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Requires photo proof
                  </span>
                </label>
              </div>
            </div>

            {/* Assignment */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                Assignment
              </h4>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assignment Type *
                </label>
                <select
                  value={newChore.assignmentType}
                  onChange={(e) => setNewChore({ ...newChore, assignmentType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {ASSIGNMENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assign To * {newChore.assignmentType === 'ROTATING' && '(order matters)'}
                </label>
                <div className="space-y-2">
                  {(() => {
                    console.log('🎨 Rendering assignment section. familyMembers:', familyMembers);
                    console.log('🎨 familyMembers.length:', familyMembers.length);
                    return null;
                  })()}
                  {familyMembers.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
                      <p>No family members available. Please add family members first.</p>
                      <p className="text-xs mt-2">Debug: familyMembers array has {familyMembers.length} items</p>
                    </div>
                  ) : (
                    familyMembers.map(member => (
                      <label key={member.id} className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newChore.selectedMembers.includes(member.id)}
                          onChange={() => handleToggleMemberSelection(member.id)}
                          className="rounded border-gray-300 text-ember-700 focus:ring-ember-500"
                        />
                        <span className="ml-3 text-sm text-gray-900 dark:text-white">
                          {member.name}
                          {newChore.assignmentType === 'ROTATING' && newChore.selectedMembers.includes(member.id) && (
                            <span className="ml-2 text-xs text-gray-500">
                              (#{newChore.selectedMembers.indexOf(member.id) + 1})
                            </span>
                          )}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={editingChore ? handleEditChore : handleAddChore}
                disabled={adding}
                className="flex-1 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? (editingChore ? 'Updating...' : 'Creating...') : (editingChore ? 'Update Chore' : 'Create Chore')}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chores List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading chores...
        </div>
      ) : chores.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No chores yet. Click "Add Chore" to create your first chore.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {chores.map(chore => (
            <div
              key={chore.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {chore.name}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      chore.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {chore.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {chore.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {chore.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <span className="flex items-center gap-1">
                      <CurrencyDollarIcon className="h-4 w-4" />
                      {chore.creditValue} credits
                    </span>
                    <span className="flex items-center gap-1">
                      <StarIcon className="h-4 w-4" />
                      {chore.difficulty}
                    </span>
                    <span className="flex items-center gap-1">
                      <ClockIcon className="h-4 w-4" />
                      {chore.estimatedMinutes} min
                    </span>
                  </div>

                  {chore.schedules?.map(schedule => (
                    <div key={schedule.id} className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                          <CalendarIcon className="h-4 w-4" />
                          {getFrequencyDisplay(schedule)}
                        </span>
                        <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                          <UsersIcon className="h-4 w-4" />
                          {getAssignmentDisplay(schedule)}
                        </span>
                        {schedule.requiresApproval && (
                          <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                            <CheckCircleIcon className="h-4 w-4" />
                            Approval Required
                          </span>
                        )}
                        {schedule.requiresPhoto && (
                          <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                            <CameraIcon className="h-4 w-4" />
                            Photo Required
                          </span>
                        )}
                      </div>
                      {schedule._count && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {schedule._count.instances} instances created
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleStartEdit(chore)}
                    className="p-2 text-ember-700 hover:bg-ember-300/30 dark:hover:bg-slate-900/20 rounded-lg transition-colors"
                    title="Edit chore"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setConfirmModal({ isOpen: true, choreId: chore.id, choreName: chore.name })}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete chore"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, choreId: '', choreName: '' })}
        onConfirm={() => handleDeleteChore(confirmModal.choreId)}
        title="Delete Chore"
        message={`Are you sure you want to delete "${confirmModal.choreName}"? This will deactivate the chore and stop generating future instances.`}
        confirmText="Delete"
        confirmColor="red"
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
      />
    </div>
  );
}
