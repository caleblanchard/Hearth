'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import {
  ArrowLeftIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ConfirmModal } from '@/components/ui/Modal';

interface Dependency {
  id: string;
  blockingTask: {
    id: string;
    name: string;
    status: string;
  };
}

interface Dependent {
  id: string;
  dependentTask: {
    id: string;
    name: string;
    status: string;
  };
}

interface FamilyMember {
  id: string;
  name: string;
  role: string;
}

interface Task {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  status: string;
  assigneeId: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  sortOrder: number;
  assignee: {
    id: string;
    name: string;
  } | null;
  project: {
    id: string;
  };
  dependencies: Dependency[];
  dependents: Dependent[];
}

export default function TaskDetailPage({ 
  params 
}: { 
  params: { id: string; taskId: string } 
}) {
  const router = useRouter();
  const { user } = useSupabaseSession();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false });
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingAssignee, setEditingAssignee] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [formData, setFormData] = useState({
    status: '',
    assigneeId: '',
    notes: '',
  });

  useEffect(() => {
    fetchTask();
    fetchFamilyMembers();
  }, [params.taskId]);

  const fetchFamilyMembers = async () => {
    try {
      const res = await fetch('/api/family');
      if (res.ok) {
        const data = await res.json();
        setFamilyMembers(data.family.members || []);
      }
    } catch (error) {
      console.error('Error fetching family members:', error);
    }
  };

  const fetchTask = async () => {
    try {
      const res = await fetch(`/api/projects/tasks/${params.taskId}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data.task);
        setFormData({
          status: data.task.status,
          assigneeId: data.task.assigneeId || '',
          notes: data.task.notes || '',
        });
      } else if (res.status === 404) {
        router.push(`/dashboard/projects/${params.id}`);
      }
    } catch (error) {
      console.error('Error fetching task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStatus = async () => {
    try {
      setSaving(true);
      setError('');
      const res = await fetch(`/api/projects/tasks/${params.taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: formData.status }),
      });

      if (res.ok) {
        const data = await res.json();
        // Refetch the full task to get all relations (dependencies, dependents)
        await fetchTask();
        setEditingStatus(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update status');
      }
    } catch (err) {
      setError('An error occurred while updating status');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAssignee = async () => {
    try {
      setSaving(true);
      setError('');
      const res = await fetch(`/api/projects/tasks/${params.taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId: formData.assigneeId || null }),
      });

      if (res.ok) {
        // Refetch the full task to get all relations (dependencies, dependents)
        await fetchTask();
        setEditingAssignee(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update assignee');
      }
    } catch (err) {
      setError('An error occurred while updating assignee');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSaving(true);
      setError('');
      const res = await fetch(`/api/projects/tasks/${params.taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: formData.notes || null }),
      });

      if (res.ok) {
        // Refetch the full task to get all relations (dependencies, dependents)
        await fetchTask();
        setEditingNotes(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update notes');
      }
    } catch (err) {
      setError('An error occurred while updating notes');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    setDeleteConfirmModal({ isOpen: true });
  };

  const confirmDeleteTask = async () => {
    try {
      const res = await fetch(`/api/projects/tasks/${params.taskId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push(`/dashboard/projects/${params.id}`);
      } else {
        setDeleteConfirmModal({ isOpen: false });
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      setDeleteConfirmModal({ isOpen: false });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'BLOCKED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (user?.user_metadata?.role !== 'PARENT') {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Only parents can manage tasks.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700 dark:border-ember-500 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading task...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <button
        onClick={() => router.push(`/dashboard/projects/${params.id}`)}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        Back to Project
      </button>

      {/* Task Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {task.name}
            </h1>
            {!editingStatus ? (
              <div className="flex items-center gap-2">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </span>
                <button
                  onClick={() => setEditingStatus(true)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Change status"
                >
                  <PencilIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  disabled={saving}
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <button
                  onClick={handleSaveStatus}
                  disabled={saving}
                  className="p-1 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
                  title="Save status"
                >
                  <CheckIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                </button>
                <button
                  onClick={() => {
                    setEditingStatus(false);
                    setFormData({ ...formData, status: task.status });
                  }}
                  disabled={saving}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="Cancel"
                >
                  <XMarkIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDeleteTask}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete task"
            >
              <TrashIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {task.description && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h3>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {task.description}
            </p>
          </div>
        )}

        {/* Notes Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</h3>
            {!editingNotes && (
              <button
                onClick={() => {
                  setEditingNotes(true);
                  setFormData({ ...formData, notes: task.notes || '' });
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Edit notes"
              >
                <PencilIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>
          {!editingNotes ? (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {task.notes || <span className="text-gray-400 dark:text-gray-500 italic">No notes</span>}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={4}
                placeholder="Add notes about this task..."
                disabled={saving}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors disabled:opacity-50"
                >
                  <CheckIcon className="h-4 w-4" />
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingNotes(false);
                    setFormData({ ...formData, notes: task.notes || '' });
                  }}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded text-sm transition-colors disabled:opacity-50"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {!editingAssignee ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                <UserIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Assigned to</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {task.assignee ? task.assignee.name : 'Unassigned'}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingAssignee(true);
                  setFormData({ ...formData, assigneeId: task.assigneeId || '' });
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Change assignee"
              >
                <PencilIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                <UserIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Assigned to</p>
                <select
                  value={formData.assigneeId}
                  onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  disabled={saving}
                >
                  <option value="">Unassigned</option>
                  {familyMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSaveAssignee}
                disabled={saving}
                className="p-1 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
                title="Save assignee"
              >
                <CheckIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
              </button>
              <button
                onClick={() => {
                  setEditingAssignee(false);
                  setFormData({ ...formData, assigneeId: task.assigneeId || '' });
                }}
                disabled={saving}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                title="Cancel"
              >
                <XMarkIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
              </button>
            </div>
          )}

          {task.dueDate && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(task.dueDate)}
                </p>
              </div>
            </div>
          )}

          {task.estimatedHours && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <ClockIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Hours</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {task.estimatedHours}h
                </p>
              </div>
            </div>
          )}

          {task.actualHours !== null && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <ClockIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Actual Hours</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {task.actualHours}h
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Dependencies */}
        {task.dependencies && task.dependencies.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Blocked By ({task.dependencies.length})
            </h3>
            <div className="space-y-2">
              {task.dependencies.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                >
                  <XCircleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {dep.blockingTask.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Status: {dep.blockingTask.status.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dependents */}
        {task.dependents && task.dependents.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Blocks ({task.dependents.length})
            </h3>
            <div className="space-y-2">
              {task.dependents.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <CheckCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {dep.dependentTask.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Status: {dep.dependentTask.status.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false })}
        onConfirm={confirmDeleteTask}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="red"
      />
    </div>
  );
}
