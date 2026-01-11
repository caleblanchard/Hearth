'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartBarIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ListBulletIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface ReportData {
  period: {
    type: string;
    startDate: string;
    endDate: string;
  };
  summary: {
    chores: {
      completed: number;
      assigned: number;
      completionRate: number;
    };
    credits: {
      earned: number;
      spent: number;
      net: number;
    };
    screenTime: {
      totalMinutes: number;
      hours: number;
      minutes: number;
    };
    todos: {
      created: number;
      completed: number;
      completionRate: number;
    };
  };
  children: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
    chores: {
      completed: number;
      assigned: number;
      completionRate: number;
    };
    credits: {
      earned: number;
      spent: number;
      net: number;
    };
    screenTime: {
      used: number;
      hours: number;
      minutes: number;
    };
    todos: {
      completed: number;
      total: number;
    };
  }>;
  trends: Array<{
    date: string;
    chores: number;
    credits: number;
    screenTime: number;
    todos: number;
  }>;
}

export default function ReportsPage() {
  const { user } = useSupabaseSession();
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  // Redirect non-parents
  useEffect(() => {
    if (user?.user_metadata?.role !== 'PARENT') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchReportData = async (selectedPeriod: 'week' | 'month' = period) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/family?period=${selectedPeriod}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.user_metadata?.role === 'PARENT') {
      fetchReportData();
    }
  }, [user]);

  const handlePeriodChange = (newPeriod: 'week' | 'month') => {
    setPeriod(newPeriod);
    fetchReportData(newPeriod);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Family Reports & Analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Insights into your family's activity and progress
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Period Filter */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePeriodChange('week')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    period === 'week'
                      ? 'bg-ember-700 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => handlePeriodChange('month')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    period === 'month'
                      ? 'bg-ember-700 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  This Month
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Chores */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Chores</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reportData.summary.chores.completed}/{reportData.summary.chores.assigned}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                {reportData.summary.chores.completionRate}%
              </p>
            </div>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-600 dark:bg-green-500 h-2 rounded-full"
                style={{ width: `${reportData.summary.chores.completionRate}%` }}
              />
            </div>
          </div>

          {/* Credits */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Credits</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reportData.summary.credits.earned}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Earned</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  +{reportData.summary.credits.earned}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Spent</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  -{reportData.summary.credits.spent}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Net</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {reportData.summary.credits.net}
                </span>
              </div>
            </div>
          </div>

          {/* Screen Time */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-info/20 dark:bg-info/30 rounded-lg">
                <ClockIcon className="h-6 w-6 text-slate-700 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Screen Time</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reportData.summary.screenTime.hours}h {reportData.summary.screenTime.minutes}m
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total: {reportData.summary.screenTime.totalMinutes} minutes
            </p>
          </div>

          {/* Todos */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-ember-300/30 dark:bg-slate-900/30 rounded-lg">
                <ListBulletIcon className="h-6 w-6 text-ember-700 dark:text-ember-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tasks</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reportData.summary.todos.completed}/{reportData.summary.todos.created}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
              <p className="text-sm font-semibold text-ember-700 dark:text-ember-500">
                {reportData.summary.todos.completionRate}%
              </p>
            </div>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-ember-700 dark:bg-ember-500 h-2 rounded-full"
                style={{ width: `${reportData.summary.todos.completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Trend Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Activity Trends */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Daily Activity Trends
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip labelFormatter={formatDate} />
                <Legend />
                <Line type="monotone" dataKey="chores" stroke="#10b981" name="Chores" />
                <Line type="monotone" dataKey="todos" stroke="#8b5cf6" name="Tasks" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Credits & Screen Time Trends */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Credits & Screen Time
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip labelFormatter={formatDate} />
                <Legend />
                <Line type="monotone" dataKey="credits" stroke="#f59e0b" name="Credits" />
                <Line type="monotone" dataKey="screenTime" stroke="#3b82f6" name="Screen Time (min)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Child Performance Comparison */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Child Performance Comparison
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.children}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="chores.completed" fill="#10b981" name="Chores Completed" />
              <Bar dataKey="credits.earned" fill="#f59e0b" name="Credits Earned" />
              <Bar dataKey="todos.completed" fill="#8b5cf6" name="Tasks Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Individual Child Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportData.children.map(child => (
            <div key={child.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                {child.avatarUrl ? (
                  <img
                    src={child.avatarUrl}
                    alt={child.name}
                    className="h-12 w-12 rounded-full"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-ember-300 dark:bg-slate-900 flex items-center justify-center">
                    <span className="text-lg font-semibold text-ember-700 dark:text-ember-500">
                      {child.name[0]}
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {child.name}
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Chores</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {child.chores.completed}/{child.chores.assigned} ({child.chores.completionRate}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-600 dark:bg-green-500 h-2 rounded-full"
                      style={{ width: `${child.chores.completionRate}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Credits Earned</span>
                  <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                    {child.credits.earned}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Screen Time</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-400">
                    {child.screenTime.hours}h {child.screenTime.minutes}m
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Tasks</span>
                  <span className="text-sm font-semibold text-ember-700 dark:text-ember-500">
                    {child.todos.completed}/{child.todos.total}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
