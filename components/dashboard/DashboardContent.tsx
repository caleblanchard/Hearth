'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MapPinIcon } from '@heroicons/react/24/outline';

interface DashboardData {
  chores: Array<{
    id: string;
    name: string;
    description?: string;
    status: string;
    creditValue: number;
    difficulty: string;
    dueDate: string;
    requiresApproval: boolean;
  }>;
  screenTime: {
    currentBalance: number;
    weeklyAllocation: number;
    weekStartDate: string;
  } | null;
  credits: {
    current: number;
    lifetimeEarned: number;
    lifetimeSpent: number;
  } | null;
  shopping: {
    id: string;
    name: string;
    itemCount: number;
    urgentCount: number;
  } | null;
  todos: Array<{
    id: string;
    title: string;
    priority: string;
    dueDate: string | null;
    status: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location?: string;
    color?: string;
  }>;
}

export default function DashboardContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      fetchDashboard();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-700 dark:text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const completedChores = data.chores.filter(c => c.status === 'COMPLETED' || c.status === 'APPROVED').length;
  const pendingChores = data.chores.filter(c => c.status === 'PENDING').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Chores Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/chores')}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Today's Chores
          </h2>
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded">
            {completedChores}/{data.chores.length}
          </span>
        </div>
        {data.chores.length > 0 ? (
          <div className="space-y-2">
            {data.chores.slice(0, 3).map(chore => (
              <div
                key={chore.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {chore.name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    +{chore.creditValue} credits
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    chore.status === 'COMPLETED' || chore.status === 'APPROVED'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}
                >
                  {chore.status.toLowerCase()}
                </span>
              </div>
            ))}
            {data.chores.length > 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                +{data.chores.length - 3} more
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            No chores scheduled for today.
          </p>
        )}
      </div>

      {/* Screen Time Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/screentime')}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Screen Time
          </h2>
          <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium px-2.5 py-0.5 rounded">
            {data.screenTime?.currentBalance || 0} min
          </span>
        </div>
        {data.screenTime ? (
          <div>
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Weekly Balance</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {data.screenTime.currentBalance} / {data.screenTime.weeklyAllocation} min
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      (data.screenTime.currentBalance / data.screenTime.weeklyAllocation) * 100,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
              {Math.floor(data.screenTime.currentBalance / 60)}h {data.screenTime.currentBalance % 60}m remaining this week
            </p>
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Balance not configured yet.
          </p>
        )}
      </div>

      {/* Credits Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Credits
          </h2>
          <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs font-medium px-2.5 py-0.5 rounded">
            {data.credits?.current || 0}
          </span>
        </div>
        {data.credits ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Current Balance</span>
              <span className="text-gray-900 dark:text-white font-semibold">
                {data.credits.current} credits
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Lifetime Earned</span>
              <span className="text-gray-600 dark:text-gray-400">
                {data.credits.lifetimeEarned}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Lifetime Spent</span>
              <span className="text-gray-600 dark:text-gray-400">
                {data.credits.lifetimeSpent}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Balance not configured yet.
          </p>
        )}
      </div>

      {/* Shopping List Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/shopping')}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Shopping List
          </h2>
          <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium px-2.5 py-0.5 rounded">
            {data.shopping?.itemCount || 0}
          </span>
        </div>
        {data.shopping && data.shopping.itemCount > 0 ? (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {data.shopping.itemCount} items on the list
            </p>
            {data.shopping.urgentCount > 0 && (
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                {data.shopping.urgentCount} urgent item{data.shopping.urgentCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Shopping list is empty.
          </p>
        )}
      </div>

      {/* To-Do List Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/todos')}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            To-Do List
          </h2>
          <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-medium px-2.5 py-0.5 rounded">
            {data.todos.length}
          </span>
        </div>
        {data.todos.length > 0 ? (
          <div className="space-y-2">
            {data.todos.slice(0, 3).map(todo => (
              <div
                key={todo.id}
                className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {todo.title}
                  </p>
                  {todo.dueDate && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Due: {new Date(todo.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    todo.priority === 'HIGH' || todo.priority === 'URGENT'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : todo.priority === 'MEDIUM'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                  }`}
                >
                  {todo.priority}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            No tasks pending.
          </p>
        )}
      </div>

      {/* Calendar Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upcoming Events
          </h2>
          <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-xs font-medium px-2.5 py-0.5 rounded">
            {data.events.length}
          </span>
        </div>
        {data.events.length > 0 ? (
          <div className="space-y-2">
            {data.events.slice(0, 3).map(event => (
              <div
                key={event.id}
                className="p-2 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {event.title}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {new Date(event.startTime).toLocaleDateString()} at{' '}
                  {new Date(event.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {event.location && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <MapPinIcon className="h-3 w-3" />
                    {event.location}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            No events scheduled.
          </p>
        )}
      </div>
    </div>
  );
}
