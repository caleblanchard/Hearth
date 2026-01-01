'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmModal, AlertModal } from '@/components/ui/Modal';
import { XMarkIcon, CheckIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: 'gray' },
  { value: 'MEDIUM', label: 'Medium', color: 'blue' },
  { value: 'HIGH', label: 'High', color: 'orange' },
  { value: 'URGENT', label: 'Urgent', color: 'red' },
];

interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  dueDate?: string;
  category?: string;
  notes?: string;
  createdBy: {
    id: string;
    name: string;
  };
  assignedTo?: {
    id: string;
    name: string;
  };
}

interface FamilyMember {
  id: string;
  name: string;
  role: string;
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'MY_TODOS' | 'COMPLETED'>('ALL');
  const router = useRouter();

  // Form state
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    category: '',
    notes: '',
    assignedToId: '',
  });

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    todoId: string;
    todoTitle: string;
    type: 'delete' | 'clearCompleted';
  }>({ isOpen: false, todoId: '', todoTitle: '', type: 'delete' });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const fetchTodos = async (filterType: 'ALL' | 'MY_TODOS' | 'COMPLETED' = filter) => {
    try {
      // Map filter to API parameter
      const apiFilter = filterType === 'COMPLETED' ? 'completed' : 'all';
      const response = await fetch(`/api/todos?filter=${apiFilter}`);
      if (response.ok) {
        const data = await response.json();
        setTodos(data.todos || []);
        if (data.currentUserId) {
          setCurrentUserId(data.currentUserId);
        }
      }
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilyMembers = async () => {
    try {
      const response = await fetch('/api/family');
      if (response.ok) {
        const data = await response.json();
        setFamilyMembers(data.family.members.filter((m: any) => m.isActive));
      }
    } catch (error) {
      console.error('Failed to fetch family members:', error);
    }
  };

  useEffect(() => {
    fetchTodos();
    fetchFamilyMembers();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchTodos(filter);
    }
  }, [filter]);

  const handleAddTodo = async () => {
    if (!newTodo.title.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please enter a title for the task',
      });
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: data.message || 'Task created successfully',
        });
        setNewTodo({
          title: '',
          description: '',
          priority: 'MEDIUM',
          dueDate: '',
          category: '',
          notes: '',
          assignedToId: '',
        });
        setShowAddForm(false);
        await fetchTodos();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to create task',
        });
      }
    } catch (error) {
      console.error('Error creating todo:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to create task',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateStatus = async (todoId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchTodos();
      } else {
        const data = await response.json();
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update task',
        });
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to update task',
      });
    }
  };

  const handleDeleteClick = (todoId: string, todoTitle: string) => {
    setConfirmModal({
      isOpen: true,
      todoId,
      todoTitle,
      type: 'delete',
    });
  };

  const handleClearCompletedClick = () => {
    const completedCount = filteredTodos.length;
    setConfirmModal({
      isOpen: true,
      todoId: '',
      todoTitle: `${completedCount} completed task${completedCount !== 1 ? 's' : ''}`,
      type: 'clearCompleted',
    });
  };

  const handleDeleteConfirm = async () => {
    const { todoId, type } = confirmModal;
    setConfirmModal({ ...confirmModal, isOpen: false });

    if (type === 'clearCompleted') {
      try {
        const response = await fetch('/api/todos/clear-completed', {
          method: 'DELETE',
        });

        if (response.ok) {
          const data = await response.json();
          setAlertModal({
            isOpen: true,
            type: 'success',
            title: 'Success!',
            message: data.message || 'Completed tasks cleared',
          });
          await fetchTodos();
        } else {
          const data = await response.json();
          setAlertModal({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: data.error || 'Failed to clear completed tasks',
          });
        }
      } catch (error) {
        console.error('Error clearing completed todos:', error);
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: 'Failed to clear completed tasks',
        });
      }
    } else {
      try {
        const response = await fetch(`/api/todos/${todoId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setAlertModal({
            isOpen: true,
            type: 'success',
            title: 'Success!',
            message: 'Task deleted successfully',
          });
          await fetchTodos();
        } else {
          const data = await response.json();
          setAlertModal({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: data.error || 'Failed to delete task',
          });
        }
      } catch (error) {
        console.error('Error deleting todo:', error);
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: 'Failed to delete task',
        });
      }
    }
  };

  const handleStartEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setNewTodo({
      title: todo.title,
      description: todo.description || '',
      priority: todo.priority,
      dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '',
      category: todo.category || '',
      notes: todo.notes || '',
      assignedToId: todo.assignedTo?.id || '',
    });
    setShowAddForm(true);
  };

  const handleEditTodo = async () => {
    if (!editingTodo) return;

    if (!newTodo.title.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please enter a title for the task',
      });
      return;
    }

    setAdding(true);
    try {
      const response = await fetch(`/api/todos/${editingTodo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTodo.title,
          description: newTodo.description || null,
          priority: newTodo.priority,
          dueDate: newTodo.dueDate || null,
          category: newTodo.category || null,
          notes: newTodo.notes || null,
          assignedToId: newTodo.assignedToId || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: data.message || 'Task updated successfully',
        });
        setNewTodo({
          title: '',
          description: '',
          priority: 'MEDIUM',
          dueDate: '',
          category: '',
          notes: '',
          assignedToId: '',
        });
        setShowAddForm(false);
        setEditingTodo(null);
        await fetchTodos();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update task',
        });
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to update task',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTodo(null);
    setNewTodo({
      title: '',
      description: '',
      priority: 'MEDIUM',
      dueDate: '',
      category: '',
      notes: '',
      assignedToId: '',
    });
    setShowAddForm(false);
  };

  // Apply client-side filtering for "My Todos"
  const filteredTodos = filter === 'MY_TODOS'
    ? todos.filter(t => t.assignedTo?.id === currentUserId || t.createdBy.id === currentUserId)
    : todos;

  const urgentTodos = filteredTodos.filter(t => t.priority === 'URGENT');
  const regularTodos = filteredTodos.filter(t => t.priority !== 'URGENT');

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
                To-Do List
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {filteredTodos.length} task{filteredTodos.length !== 1 ? 's' : ''}
                {urgentTodos.length > 0 && (
                  <span className="ml-2 text-red-600 dark:text-red-400 font-medium">
                    ({urgentTodos.length} urgent)
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
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              {showAddForm ? (
                <>
                  <XMarkIcon className="h-5 w-5" />
                  Cancel
                </>
              ) : (
                '+ Add Task'
              )}
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
              }`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setFilter('MY_TODOS')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'MY_TODOS'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
              }`}
            >
              My Tasks
            </button>
            <button
              onClick={() => setFilter('COMPLETED')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'COMPLETED'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
              }`}
            >
              Completed
            </button>
          </div>
          {filter === 'COMPLETED' && filteredTodos.length > 0 && (
            <button
              onClick={handleClearCompletedClick}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <TrashIcon className="h-5 w-5" />
              Clear Completed
            </button>
          )}
        </div>

        {/* Add/Edit Todo Form */}
        {showAddForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {editingTodo ? 'Edit Task' : 'Add New Task'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newTodo.title}
                  onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                  placeholder="What needs to be done?"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newTodo.description}
                  onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                  placeholder="Additional details..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={newTodo.priority}
                    onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                    Due Date (optional)
                  </label>
                  <input
                    type="date"
                    value={newTodo.dueDate}
                    onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category (optional)
                </label>
                <input
                  type="text"
                  value={newTodo.category}
                  onChange={(e) => setNewTodo({ ...newTodo, category: e.target.value })}
                  placeholder="e.g., Work, Home, Personal"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assign To (optional)
                </label>
                <select
                  value={newTodo.assignedToId}
                  onChange={(e) => setNewTodo({ ...newTodo, assignedToId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Unassigned</option>
                  {familyMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={editingTodo ? handleEditTodo : handleAddTodo}
                disabled={adding}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors duration-200"
              >
                {adding ? (editingTodo ? 'Updating...' : 'Adding...') : (editingTodo ? 'Update Task' : 'Add Task')}
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

        {/* Urgent Todos */}
        {urgentTodos.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
              Urgent Tasks
            </h2>
            <div className="space-y-3">
              {urgentTodos.map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  onUpdateStatus={handleUpdateStatus}
                  onDelete={handleDeleteClick}
                  onEdit={handleStartEdit}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Todos */}
        {regularTodos.length > 0 ? (
          <div className="space-y-3">
            {regularTodos.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDeleteClick}
                onEdit={handleStartEdit}
              />
            ))}
          </div>
        ) : urgentTodos.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {filter === 'COMPLETED'
                ? 'No completed tasks yet.'
                : filter === 'MY_TODOS'
                ? 'No tasks assigned to or created by you.'
                : 'No active tasks. Create one to get started!'}
            </p>
          </div>
        ) : null}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleDeleteConfirm}
        title={confirmModal.type === 'clearCompleted' ? 'Clear Completed Tasks' : 'Delete Task'}
        message={
          confirmModal.type === 'clearCompleted'
            ? `Clear all ${confirmModal.todoTitle}? This cannot be undone.`
            : `Delete "${confirmModal.todoTitle}"? This cannot be undone.`
        }
        confirmText={confirmModal.type === 'clearCompleted' ? 'Clear All' : 'Delete'}
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

function TodoCard({
  todo,
  onUpdateStatus,
  onDelete,
  onEdit,
}: {
  todo: Todo;
  onUpdateStatus: (id: string, status: string) => void;
  onDelete: (id: string, title: string) => void;
  onEdit: (todo: Todo) => void;
}) {
  const priority = PRIORITIES.find(p => p.value === todo.priority);
  const isPending = todo.status === 'PENDING';
  const isInProgress = todo.status === 'IN_PROGRESS';
  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && todo.status !== 'COMPLETED';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 ${isOverdue ? 'border-l-4 border-red-500' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {todo.title}
              </h3>
              {todo.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {todo.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  todo.priority === 'URGENT' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  todo.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                  todo.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                }`}>
                  {priority?.label}
                </span>
                {todo.assignedTo && (
                  <span className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 font-medium">
                    Assigned to {todo.assignedTo.name}
                  </span>
                )}
                {todo.dueDate && (
                  <span className={`text-xs px-2 py-1 rounded ${isOverdue ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                    Due: {new Date(todo.dueDate).toLocaleDateString()}
                  </span>
                )}
                {todo.category && (
                  <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    {todo.category}
                  </span>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Created by {todo.createdBy.name}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 ml-4">
          {isPending && (
            <button
              onClick={() => onUpdateStatus(todo.id, 'IN_PROGRESS')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200 whitespace-nowrap"
            >
              Start
            </button>
          )}
          {isInProgress && (
            <button
              onClick={() => onUpdateStatus(todo.id, 'COMPLETED')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
            >
              <CheckIcon className="h-5 w-5" />
              Complete
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(todo)}
              className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              title="Edit task"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => onDelete(todo.id, todo.title)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete task"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
