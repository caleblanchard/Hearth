'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useGuestSession } from '@/hooks/useGuestSession';
import { MapPinIcon } from '@heroicons/react/24/outline';
import TransportWidget from '@/components/dashboard/widgets/TransportWidget';
import MedicationWidget from '@/components/dashboard/widgets/MedicationWidget';
import MaintenanceWidget from '@/components/dashboard/widgets/MaintenanceWidget';
import InventoryWidget from '@/components/dashboard/widgets/InventoryWidget';
import WeatherWidget from '@/components/dashboard/widgets/WeatherWidget';
import CommunicationWidget from '@/components/dashboard/widgets/CommunicationWidget';

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
    allowances?: Array<{
      id: string;
      screenTimeTypeId: string;
      allowanceMinutes: number;
      remainingMinutes: number;
      screenTimeType: {
        id: string;
        name: string;
      };
    }>;
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
    items: Array<{
      id: string;
      name: string;
      quantity?: number;
      unit?: string;
      priority: string;
      category?: string;
    }>;
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
  projectTasks: Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    dueDate: string | null;
    projectId: string;
    projectName: string;
  }>;
}

export default function DashboardContent() {
  const { data: session, status: sessionStatus } = useSession();
  const { guestSession, loading: guestLoading } = useGuestSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());

  // Redirect if no session (user or guest) - but only after both are done loading
  useEffect(() => {
    // Wait for both session and guest session to finish loading
    const sessionLoading = sessionStatus === 'loading';
    const stillLoading = sessionLoading || guestLoading;
    
    // Only redirect if we're done loading and there's no session (user or guest)
    if (!stillLoading && !session?.user && !guestSession) {
      router.push('/auth/signin');
    }
  }, [session, sessionStatus, guestSession, guestLoading, router]);

  useEffect(() => {
    async function fetchEnabledModules() {
      try {
        const headers: HeadersInit = {};
        if (guestSession?.sessionToken) {
          headers['x-guest-session-token'] = guestSession.sessionToken;
        }
        
        const res = await fetch('/api/settings/modules/enabled', { headers });
        if (res.ok) {
          const data = await res.json();
          setEnabledModules(new Set(data.enabledModules));
        }
      } catch (error) {
        console.error('Error fetching enabled modules:', error);
        // On error, assume all modules are enabled
        setEnabledModules(new Set([
          'CHORES', 'PROJECTS', 'SCREEN_TIME', 'CREDITS', 'SHOPPING', 'CALENDAR', 'TODOS',
          'ROUTINES', 'MEAL_PLANNING', 'HEALTH', 'PETS', 'LEADERBOARD', 'FINANCIAL',
          'INVENTORY', 'MAINTENANCE', 'TRANSPORT', 'DOCUMENTS', 'RULES_ENGINE', 'COMMUNICATION', 'RECIPES'
        ]));
      }
    }

    async function fetchDashboard() {
      try {
        const headers: HeadersInit = {};
        if (guestSession?.sessionToken) {
          headers['x-guest-session-token'] = guestSession.sessionToken;
        }
        
        const response = await fetch('/api/dashboard', { headers });
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

    // Wait for session to finish loading before fetching data
    const sessionLoading = sessionStatus === 'loading';
    const stillLoading = sessionLoading || guestLoading;
    
    // Don't fetch if we're still loading or if there's no session
    if (stillLoading) {
      return;
    }
    
    // If no session (user or guest), don't fetch (redirect will happen)
    if (!session?.user && !guestSession) {
      return;
    }

    fetchEnabledModules();
    fetchDashboard();
  }, [session, sessionStatus, guestSession, guestLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700 mx-auto mb-4"></div>
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
      {enabledModules.has('CHORES') && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/chores')}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Today's Chores
          </h2>
          <span className="bg-info/20 dark:bg-info/30 text-info dark:text-info text-xs font-medium px-2.5 py-0.5 rounded">
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
      )}

      {/* Screen Time Card */}
      {enabledModules.has('SCREEN_TIME') && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/screentime')}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Screen Time
          </h2>
          {data.screenTime?.allowances && data.screenTime.allowances.length > 0 ? (
            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium px-2.5 py-0.5 rounded">
              {data.screenTime.allowances.reduce((sum: number, a: any) => sum + a.remainingMinutes, 0)} min
            </span>
          ) : (
            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium px-2.5 py-0.5 rounded">
              {data.screenTime?.currentBalance || 0} min
            </span>
          )}
        </div>
        {data.screenTime?.allowances && data.screenTime.allowances.length > 0 ? (
          <div>
            <div className="space-y-3">
              {data.screenTime.allowances.slice(0, 3).map((allowance: any) => {
                const percentage = allowance.allowanceMinutes > 0
                  ? (allowance.remainingMinutes / allowance.allowanceMinutes) * 100
                  : 0;
                const isLow = allowance.remainingMinutes < allowance.allowanceMinutes * 0.2;
                const formatTime = (min: number) => {
                  const h = Math.floor(min / 60);
                  const m = min % 60;
                  return h > 0 ? `${h}h ${m}m` : `${m}m`;
                };

                return (
                  <div key={allowance.id} className="border border-gray-200 dark:border-gray-700 rounded p-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {allowance.screenTimeTypeName}
                      </span>
                      <span className={`text-xs font-semibold ${
                        isLow ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                      }`}>
                        {formatTime(allowance.remainingMinutes)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          isLow ? 'bg-red-600 dark:bg-red-400' : 'bg-green-600 dark:bg-green-400'
                        }`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {data.screenTime.allowances.length > 3 && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 text-center">
                +{data.screenTime.allowances.length - 3} more type{data.screenTime.allowances.length - 3 !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        ) : data.screenTime ? (
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
      )}

      {/* Credits Card */}
      {enabledModules.has('CREDITS') && (
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
      )}

      {/* Shopping List Card */}
      {enabledModules.has('SHOPPING') && (
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
          <div className="space-y-2">
            {data.shopping.items && data.shopping.items.length > 0 ? (
              <>
                {data.shopping.items.slice(0, 3).map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.name}
                      </p>
                      {(item.quantity || item.unit) && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {item.quantity && item.unit
                            ? `${item.quantity} ${item.unit}`
                            : item.quantity
                            ? `${item.quantity}`
                            : item.unit
                            ? item.unit
                            : ''}
                        </p>
                      )}
                    </div>
                    {item.priority === 'URGENT' && (
                      <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Urgent
                      </span>
                    )}
                  </div>
                ))}
                {data.shopping.items.length > 3 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                    +{data.shopping.items.length - 3} more
                  </p>
                )}
              </>
            ) : (
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
            )}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Shopping list is empty.
          </p>
        )}
        </div>
      )}

      {/* To-Do List Card */}
      {enabledModules.has('TODOS') && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/todos')}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            To-Do List
          </h2>
          <span className="bg-ember-300 dark:bg-slate-900 text-ember-700 dark:text-ember-300 text-xs font-medium px-2.5 py-0.5 rounded">
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
      )}

      {/* Calendar Card */}
      {enabledModules.has('CALENDAR') && (
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push('/dashboard/calendar?view=week')}
        >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upcoming Events
          </h2>
          <span className="bg-ember-300 dark:bg-slate-900 text-ember-700 dark:text-ember-300 text-xs font-medium px-2.5 py-0.5 rounded">
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
      )}

      {/* Project Tasks Card */}
      {enabledModules.has('PROJECTS') && data.projectTasks && data.projectTasks.length > 0 && (
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push('/dashboard/projects')}
        >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            My Project Tasks
          </h2>
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded">
            {data.projectTasks.length}
          </span>
        </div>
        <div className="space-y-2">
          {data.projectTasks.slice(0, 3).map(task => {
            const getStatusColor = (status: string) => {
              switch (status) {
                case 'PENDING':
                  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
                case 'IN_PROGRESS':
                  return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
                case 'BLOCKED':
                  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
                default:
                  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
              }
            };

            return (
              <div
                key={task.id}
                className="p-2 bg-gray-50 dark:bg-gray-700 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/projects/${task.projectId}/tasks/${task.id}`);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {task.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {task.projectName}
                    </p>
                    {task.dueDate && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })}
          {data.projectTasks.length > 3 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
              +{data.projectTasks.length - 3} more
            </p>
          )}
        </div>
        </div>
      )}

      {/* Transport Widget - spans 2 columns on large screens */}
      {enabledModules.has('TRANSPORT') && (
        <div className="md:col-span-2 lg:col-span-2">
          <TransportWidget memberId={session?.user?.id} />
        </div>
      )}

      {/* Communication Widget */}
      {enabledModules.has('COMMUNICATION') && (
        <div className="md:col-span-1 lg:col-span-1">
          <CommunicationWidget />
        </div>
      )}

      {/* Weather Widget - Always visible (not module-specific) */}
      <div className="md:col-span-1 lg:col-span-1">
        <WeatherWidget />
      </div>

      {/* Medication Widget */}
      {enabledModules.has('HEALTH') && (
        <div className="md:col-span-1 lg:col-span-1">
          <MedicationWidget memberId={session?.user?.id} />
        </div>
      )}

      {/* Maintenance Widget */}
      {enabledModules.has('MAINTENANCE') && (
        <div className="md:col-span-1 lg:col-span-1">
          <MaintenanceWidget />
        </div>
      )}

      {/* Inventory Widget */}
      {enabledModules.has('INVENTORY') && (
        <div className="md:col-span-1 lg:col-span-1">
          <InventoryWidget />
        </div>
      )}
    </div>
  );
}
