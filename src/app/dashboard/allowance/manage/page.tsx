'use client';

import { useEffect, useState } from 'react';
import { ConfirmModal, AlertModal } from '@/components/ui/Modal';
import { PencilIcon, TrashIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/outline';

const FREQUENCIES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
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

interface Member {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface AllowanceSchedule {
  id: string;
  memberId: string;
  amount: number;
  frequency: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  isActive: boolean;
  isPaused: boolean;
  startDate: string;
  endDate?: string | null;
  lastProcessedAt?: string | null;
  member: {
    id: string;
    name: string;
    email?: string;
  };
}

export default function ManageAllowancePage() {
  const [schedules, setSchedules] = useState<AllowanceSchedule[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<AllowanceSchedule | null>(null);

  const [newSchedule, setNewSchedule] = useState({
    memberId: '',
    amount: 10,
    frequency: 'WEEKLY',
    dayOfWeek: 0,
    dayOfMonth: 1,
    startDate: '',
    endDate: '',
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    scheduleId: string;
    memberName: string;
  }>({ isOpen: false, scheduleId: '', memberName: '' });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/allowance');
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/children');
      if (response.ok) {
        const data = await response.json();
        setMembers(data || []);
        if (data && data.length > 0 && !newSchedule.memberId) {
          setNewSchedule({ ...newSchedule, memberId: data[0].id });
        }
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchMembers();
  }, []);

  const handleAddSchedule = async () => {
    if (!newSchedule.memberId) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please select a family member',
      });
      return;
    }

    if (newSchedule.amount <= 0) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Amount',
        message: 'Allowance amount must be greater than 0',
      });
      return;
    }

    setAdding(true);
    try {
      const payload: any = {
        memberId: newSchedule.memberId,
        amount: newSchedule.amount,
        frequency: newSchedule.frequency,
        startDate: newSchedule.startDate || undefined,
        endDate: newSchedule.endDate || undefined,
      };

      if (newSchedule.frequency === 'WEEKLY' || newSchedule.frequency === 'BIWEEKLY') {
        payload.dayOfWeek = newSchedule.dayOfWeek;
      } else if (newSchedule.frequency === 'MONTHLY') {
        payload.dayOfMonth = newSchedule.dayOfMonth;
      }

      const response = await fetch('/api/allowance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: data.message || 'Allowance schedule created successfully!',
        });
        setNewSchedule({
          memberId: members[0]?.id || '',
          amount: 10,
          frequency: 'WEEKLY',
          dayOfWeek: 0,
          dayOfMonth: 1,
          startDate: '',
          endDate: '',
        });
        setShowAddForm(false);
        await fetchSchedules();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to create allowance schedule',
        });
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to create allowance schedule',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleStartEdit = (schedule: AllowanceSchedule) => {
    setEditingSchedule(schedule);
    setNewSchedule({
      memberId: schedule.memberId,
      amount: schedule.amount,
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek ?? 0,
      dayOfMonth: schedule.dayOfMonth ?? 1,
      startDate: schedule.startDate ? schedule.startDate.split('T')[0] : '',
      endDate: schedule.endDate ? schedule.endDate.split('T')[0] : '',
    });
    setShowAddForm(true);
  };

  const handleEditSchedule = async () => {
    if (!editingSchedule) return;

    if (newSchedule.amount <= 0) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Amount',
        message: 'Allowance amount must be greater than 0',
      });
      return;
    }

    setAdding(true);
    try {
      const payload: any = {
        amount: newSchedule.amount,
        frequency: newSchedule.frequency,
        startDate: newSchedule.startDate || undefined,
        endDate: newSchedule.endDate || undefined,
      };

      if (newSchedule.frequency === 'WEEKLY' || newSchedule.frequency === 'BIWEEKLY') {
        payload.dayOfWeek = newSchedule.dayOfWeek;
      } else if (newSchedule.frequency === 'MONTHLY') {
        payload.dayOfMonth = newSchedule.dayOfMonth;
      }

      const response = await fetch(`/api/allowance/${editingSchedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: data.message || 'Allowance schedule updated successfully!',
        });
        setNewSchedule({
          memberId: members[0]?.id || '',
          amount: 10,
          frequency: 'WEEKLY',
          dayOfWeek: 0,
          dayOfMonth: 1,
          startDate: '',
          endDate: '',
        });
        setShowAddForm(false);
        setEditingSchedule(null);
        await fetchSchedules();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update allowance schedule',
        });
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to update allowance schedule',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingSchedule(null);
    setNewSchedule({
      memberId: members[0]?.id || '',
      amount: 10,
      frequency: 'WEEKLY',
      dayOfWeek: 0,
      dayOfMonth: 1,
      startDate: '',
      endDate: '',
    });
    setShowAddForm(false);
  };

  const handleDeleteClick = (scheduleId: string, memberName: string) => {
    setConfirmModal({
      isOpen: true,
      scheduleId,
      memberName,
    });
  };

  const handleDeleteConfirm = async () => {
    const { scheduleId, memberName } = confirmModal;
    setConfirmModal({ ...confirmModal, isOpen: false });

    try {
      const response = await fetch(`/api/allowance/${scheduleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: 'Allowance schedule deleted successfully',
        });
        await fetchSchedules();
      } else {
        const data = await response.json();
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to delete allowance schedule',
        });
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to delete allowance schedule',
      });
    }
  };

  const handleTogglePause = async (scheduleId: string, isPaused: boolean) => {
    try {
      const response = await fetch(`/api/allowance/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaused: !isPaused }),
      });

      if (response.ok) {
        await fetchSchedules();
      } else {
        const data = await response.json();
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update allowance schedule',
        });
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to update allowance schedule',
      });
    }
  };

  const getFrequencyDisplay = (schedule: AllowanceSchedule) => {
    const freq = schedule.frequency.toLowerCase();
    if (schedule.frequency === 'WEEKLY' || schedule.frequency === 'BIWEEKLY') {
      const dayName = DAYS_OF_WEEK.find((d) => d.value === schedule.dayOfWeek)?.label || 'Sunday';
      return `${freq} on ${dayName}`;
    } else if (schedule.frequency === 'MONTHLY') {
      return `${freq} on day ${schedule.dayOfMonth}`;
    }
    return freq;
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
                Manage Allowances
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Configure automatic allowance schedules for family members
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
              className="px-6 py-3 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors"
            >
              {showAddForm ? '✕ Cancel' : '+ Add Schedule'}
            </button>
          </div>
        </div>

        {/* Add/Edit Schedule Form */}
        {showAddForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {editingSchedule ? 'Edit Allowance Schedule' : 'Create Allowance Schedule'}
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="member-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Family Member *
                </label>
                <select
                  id="member-select"
                  value={newSchedule.memberId}
                  onChange={(e) => setNewSchedule({ ...newSchedule, memberId: e.target.value })}
                  disabled={!!editingSchedule}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600"
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                {editingSchedule && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Member cannot be changed after creation
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="amount-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount (Credits) *
                  </label>
                  <input
                    id="amount-input"
                    type="number"
                    value={newSchedule.amount}
                    onChange={(e) => setNewSchedule({ ...newSchedule, amount: parseInt(e.target.value) || 0 })}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="frequency-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Frequency *
                  </label>
                  <select
                    id="frequency-select"
                    value={newSchedule.frequency}
                    onChange={(e) => setNewSchedule({ ...newSchedule, frequency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {FREQUENCIES.map((freq) => (
                      <option key={freq.value} value={freq.value}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(newSchedule.frequency === 'WEEKLY' || newSchedule.frequency === 'BIWEEKLY') && (
                <div>
                  <label htmlFor="day-of-week-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Day of Week *
                  </label>
                  <select
                    id="day-of-week-select"
                    value={newSchedule.dayOfWeek}
                    onChange={(e) => setNewSchedule({ ...newSchedule, dayOfWeek: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newSchedule.frequency === 'MONTHLY' && (
                <div>
                  <label htmlFor="day-of-month-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Day of Month *
                  </label>
                  <input
                    id="day-of-month-input"
                    type="number"
                    value={newSchedule.dayOfMonth}
                    onChange={(e) => setNewSchedule({ ...newSchedule, dayOfMonth: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="31"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    For months with fewer days, the last day of the month will be used
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start-date-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date (optional)
                  </label>
                  <input
                    id="start-date-input"
                    type="date"
                    value={newSchedule.startDate}
                    onChange={(e) => setNewSchedule({ ...newSchedule, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="end-date-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date (optional)
                  </label>
                  <input
                    id="end-date-input"
                    type="date"
                    value={newSchedule.endDate}
                    onChange={(e) => setNewSchedule({ ...newSchedule, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={editingSchedule ? handleEditSchedule : handleAddSchedule}
                disabled={adding}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors"
              >
                {adding ? (editingSchedule ? 'Updating...' : 'Creating...') : (editingSchedule ? 'Update Schedule' : 'Create Schedule')}
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

        {/* Schedules List */}
        {schedules.length > 0 ? (
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {schedule.member.name}
                      </h3>
                      {schedule.isPaused && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          PAUSED
                        </span>
                      )}
                      {!schedule.isActive && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          INACTIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm mb-2">
                      <span className="text-ember-700 dark:text-ember-500 font-medium">
                        {schedule.amount} credits
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {getFrequencyDisplay(schedule)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {schedule.lastProcessedAt && (
                        <p>
                          Last distributed:{' '}
                          {new Date(schedule.lastProcessedAt).toLocaleDateString()}
                        </p>
                      )}
                      {schedule.endDate && (
                        <p>
                          Ends: {new Date(schedule.endDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleStartEdit(schedule)}
                      className="p-2 text-ember-700 hover:bg-ember-300/30 dark:hover:bg-slate-900/20 rounded-lg transition-colors"
                      title="Edit schedule"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleTogglePause(schedule.id, schedule.isPaused)}
                      className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                      title={schedule.isPaused ? 'Resume schedule' : 'Pause schedule'}
                    >
                      {schedule.isPaused ? (
                        <>
                          <PlayIcon className="h-4 w-4" />
                          Resume
                        </>
                      ) : (
                        <>
                          <PauseIcon className="h-4 w-4" />
                          Pause
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteClick(schedule.id, schedule.member.name)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete schedule"
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
              No allowance schedules configured yet.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors"
            >
              Create First Schedule
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleDeleteConfirm}
        title="Delete Allowance Schedule"
        message={`Delete allowance schedule for "${confirmModal.memberName}"? This cannot be undone.`}
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
