'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { useCurrentMember } from '@/hooks/useCurrentMember';
import {
  FolderIcon,
  PlusIcon,
  RectangleStackIcon,
  FunnelIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  budget: number | null;
  createdAt: string;
  creator: {
    id: string;
    name: string;
  };
  _count: {
    tasks: number;
  };
}

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useSupabaseSession();
  const { isParent, loading: memberLoading } = useCurrentMember();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all'
        ? '/api/projects'
        : `/api/projects?status=${statusFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // Handle pagination response structure: { data: Project[], pagination: {...} }
        // or legacy structure: { projects: Project[] }
        const projectsArray = data.data || data.projects || [];
        setProjects(Array.isArray(projectsArray) ? projectsArray : []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'ON_HOLD':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
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

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'No budget';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading || memberLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isParent) {
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <FolderIcon className="h-8 w-8 text-ember-700 dark:text-ember-500" />
              Projects
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Plan and track family projects with tasks and dependencies
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard/projects/templates')}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <RectangleStackIcon className="h-5 w-5" />
              Browse Templates
            </button>
            <button
              onClick={() => router.push('/dashboard/projects/new')}
              className="flex items-center gap-2 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Create Project
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
          </div>
          <div className="flex gap-2">
            {['all', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-ember-700 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700 dark:border-ember-500 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading projects...</p>
        </div>
      ) : !projects || projects.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <FolderIcon className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No projects found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {statusFilter === 'all'
              ? 'Get started by creating your first project or using a template.'
              : `No ${statusFilter.toLowerCase().replace('_', ' ')} projects found.`}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/dashboard/projects/templates')}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <RectangleStackIcon className="h-5 w-5" />
              Browse Templates
            </button>
            <button
              onClick={() => router.push('/dashboard/projects/new')}
              className="flex items-center gap-2 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Create Project
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(projects || []).map((project) => (
            <div
              key={project.id}
              onClick={() => router.push(`/dashboard/projects/${project.id}`)}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              {/* Project Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status.replace('_', ' ')}
                </span>
              </div>

              {/* Project Stats */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>{project._count.tasks} tasks</span>
                </div>
                {project.dueDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Due {formatDate(project.dueDate)}</span>
                  </div>
                )}
                {project.budget && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CurrencyDollarIcon className="h-4 w-4" />
                    <span>{formatCurrency(project.budget)}</span>
                  </div>
                )}
              </div>

              {/* Creator */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Created by {project.creator.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
