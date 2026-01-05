'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeftIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { ConfirmModal } from '@/components/ui/Modal';

interface Task {
  id: string;
  name: string;
  description: string | null;
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
  _count: {
    dependencies: number;
    dependents: number;
  };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  budget: number | null;
  notes: string | null;
  createdAt: string;
  creator: {
    id: string;
    name: string;
  };
  tasks: Task[];
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false });

  useEffect(() => {
    fetchProject();
  }, [params.id]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
      } else if (res.status === 404) {
        router.push('/dashboard/projects');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    setDeleteConfirmModal({ isOpen: true });
  };

  const confirmDeleteProject = async () => {
    try {
      const res = await fetch(`/api/projects/${params.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/dashboard/projects');
      } else {
        setDeleteConfirmModal({ isOpen: false });
      }
    } catch (error) {
      console.error('Error deleting project:', error);
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

  if (session?.user?.role !== 'PARENT') {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Only parents can manage projects.
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
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const filteredTasks = taskFilter === 'all'
    ? project.tasks
    : project.tasks.filter((t) => t.status === taskFilter);

  const taskStats = {
    total: project.tasks.length,
    pending: project.tasks.filter((t) => t.status === 'PENDING').length,
    inProgress: project.tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    completed: project.tasks.filter((t) => t.status === 'COMPLETED').length,
    blocked: project.tasks.filter((t) => t.status === 'BLOCKED').length,
  };

  const completionPercentage = taskStats.total > 0
    ? Math.round((taskStats.completed / taskStats.total) * 100)
    : 0;

  return (
    <div className="p-8">
      {/* Header */}
      <button
        onClick={() => router.push('/dashboard/projects')}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        Back to Projects
      </button>

      {/* Project Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-gray-600 dark:text-gray-400">{project.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/dashboard/projects/${params.id}/edit`)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Edit project"
            >
              <PencilIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={handleDeleteProject}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete project"
            >
              <TrashIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {project.status.replace('_', ' ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatDate(project.dueDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <CurrencyDollarIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Budget</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {project.budget
                  ? `$${project.budget.toLocaleString()}`
                  : 'No budget'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
              <UserIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Created by</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {project.creator.name}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Progress
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {completionPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
            <span>{taskStats.completed} completed</span>
            <span>{taskStats.inProgress} in progress</span>
            <span>{taskStats.pending} pending</span>
            {taskStats.blocked > 0 && (
              <span className="text-red-600 dark:text-red-400">
                {taskStats.blocked} blocked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Tasks ({filteredTasks.length})
          </h2>
          <button
            onClick={() => router.push(`/dashboard/projects/${params.id}/tasks/new`)}
            className="flex items-center gap-2 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Add Task
          </button>
        </div>

        {/* Task Filter */}
        <div className="flex gap-2 mb-6">
          {[
            { value: 'all', label: 'All' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'IN_PROGRESS', label: 'In Progress' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'BLOCKED', label: 'Blocked' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setTaskFilter(filter.value)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                taskFilter === filter.value
                  ? 'bg-ember-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircleIcon className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No tasks found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {taskFilter === 'all'
                ? 'Add your first task to get started.'
                : `No ${taskFilter.toLowerCase().replace('_', ' ')} tasks.`}
            </p>
            <button
              onClick={() => router.push(`/dashboard/projects/${params.id}/tasks/new`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Add Task
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => router.push(`/dashboard/projects/${params.id}/tasks/${task.id}`)}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {task.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      {task.assignee && (
                        <span className="flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          {task.assignee.name}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                      {task.estimatedHours && (
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          {task.estimatedHours}h estimated
                        </span>
                      )}
                      {task._count.dependencies > 0 && (
                        <span className="text-orange-600 dark:text-orange-400">
                          {task._count.dependencies} dependencies
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false })}
        onConfirm={confirmDeleteProject}
        title="Delete Project"
        message="Are you sure you want to delete this project? This will also delete all tasks."
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="red"
      />
    </div>
  );
}
