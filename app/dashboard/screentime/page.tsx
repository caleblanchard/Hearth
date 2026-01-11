'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { AlertModal } from '@/components/ui/Modal';
import GraceRequestButton from '@/components/screentime/GraceRequestButton';
import {
  ClockIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';

const QUICK_TIMES = [15, 30, 60, 120];

interface Transaction {
  id: string;
  type: string;
  amountMinutes: number;
  balanceAfter: number;
  deviceType?: string;
  screenTimeTypeId?: string;
  screenTimeType?: {
    id: string;
    name: string;
  };
  reason?: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
}

interface Stats {
  summary: {
    totalMinutes: number;
    totalHours: number;
    averagePerDay: number;
    currentBalance: number;
    weeklyAllocation: number;
  };
  deviceBreakdown: Array<{ device: string; minutes: number }>;
  dailyTrend: Array<{ date: string; minutes: number }>;
}

interface GraceStatus {
  canRequestGrace: boolean;
  currentBalance: number;
  borrowedMinutes: number;
  lowBalanceWarning: boolean;
  remainingDailyRequests: number;
  remainingWeeklyRequests: number;
  nextResetTime: string;
  settings: {
    gracePeriodMinutes: number;
    maxGracePerDay: number;
    maxGracePerWeek: number;
    requiresApproval: boolean;
  };
}

interface GraceLog {
  id: string;
  requestedAt: string;
  minutesGranted: number;
  reason?: string;
  repaymentStatus: string;
  approvedBy?: {
    id: string;
    name: string;
  };
}

interface ScreenTimeType {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isArchived: boolean;
}

interface AllowanceWithRemaining {
  id: string;
  screenTimeTypeId: string;
  allowanceMinutes: number;
  period: 'DAILY' | 'WEEKLY';
  rolloverEnabled: boolean;
  rolloverCapMinutes: number | null;
  screenTimeType: ScreenTimeType;
  remaining: {
    remainingMinutes: number;
    usedMinutes: number;
    rolloverMinutes: number;
    periodStart: string;
    periodEnd: string;
  };
}

export default function ScreenTimePage() {
  const { user } = useSupabaseSession();
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  // Device type is now optional and defaults to OTHER
  const [selectedDevice] = useState('OTHER');
  const [selectedScreenTimeType, setSelectedScreenTimeType] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [graceStatus, setGraceStatus] = useState<GraceStatus | null>(null);
  const [graceLogs, setGraceLogs] = useState<GraceLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showGraceHistory, setShowGraceHistory] = useState(false);
  const [allowances, setAllowances] = useState<AllowanceWithRemaining[]>([]);
  const [availableTypes, setAvailableTypes] = useState<ScreenTimeType[]>([]);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [pendingLog, setPendingLog] = useState<{ minutes: number; screenTimeTypeId: string } | null>(null);

  // Alert modal state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const fetchBalance = async () => {
    try {
      // Balance is now calculated from allowances, so we'll get it from allowances
      // This function is kept for backward compatibility but balance is calculated from allowances
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        // Calculate total remaining from allowances
        const totalRemaining = data.screenTime?.allowances?.reduce(
          (sum: number, a: any) => sum + (a.remainingMinutes || 0),
          0
        ) || 0;
        setBalance(totalRemaining);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/screentime/history?limit=20');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/screentime/stats?period=week');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchGraceStatus = async () => {
    try {
      const response = await fetch('/api/screentime/grace/status');
      if (response.ok) {
        const data = await response.json();
        setGraceStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch grace status:', error);
    }
  };

  const fetchGraceHistory = async () => {
    try {
      const response = await fetch('/api/screentime/grace/history?limit=20');
      if (response.ok) {
        const data = await response.json();
        setGraceLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch grace history:', error);
    }
  };

  const fetchAllowances = async () => {
    try {
      const memberId = user?.id;
      if (!memberId) return;

      // Fetch both allowances and available types
      const [memberAllowancesRes, typesRes] = await Promise.all([
        fetch(`/api/screentime/allowances/${memberId}`),
        fetch('/api/screentime/types'),
      ]);

      let memberData = { allowances: [] };
      if (memberAllowancesRes.ok) {
        memberData = await memberAllowancesRes.json();
        setAllowances(memberData.allowances || []);
      }

      if (typesRes.ok) {
        const typesData = await typesRes.json();
        const activeTypes = (typesData.types || []).filter((t: ScreenTimeType) => t.isActive && !t.isArchived);
        setAvailableTypes(activeTypes);
        
        // Set first type as default if none selected
        if (!selectedScreenTimeType && activeTypes.length > 0) {
          // Prefer first type with allowance, otherwise first type
          const firstWithAllowance = activeTypes.find((t: ScreenTimeType) => 
            memberData.allowances?.some((a: AllowanceWithRemaining) => a.screenTimeTypeId === t.id)
          );
          setSelectedScreenTimeType(firstWithAllowance?.id || activeTypes[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch allowances:', error);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    
    const loadData = async () => {
      await Promise.all([
        fetchBalance(),
        fetchHistory(),
        fetchStats(),
        fetchGraceStatus(),
        fetchGraceHistory(),
        fetchAllowances(),
      ]);
    };
    loadData();
  }, [session]);

  const handleLogTime = async (minutes: number, override: boolean = false) => {
    if (minutes <= 0) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Input',
        message: 'Please enter a valid number of minutes',
      });
      return;
    }

    if (!selectedScreenTimeType) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Screen Time Type Required',
        message: 'Please select a screen time type',
      });
      return;
    }

    if (override && !overrideReason.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Override Reason Required',
        message: 'Please provide a reason for overriding the limit',
      });
      return;
    }

    setLogging(true);
    try {
      const response = await fetch('/api/screentime/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minutes,
          screenTimeTypeId: selectedScreenTimeType,
          deviceType: selectedDevice,
          override: override || false,
          overrideReason: override ? overrideReason.trim() : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Time Logged',
          message: data.message,
        });
        // Balance is now calculated from allowances, refresh allowances to get updated balance
        // setBalance is handled by fetchBalance which calculates from allowances
        setCustomMinutes('');
        setOverrideReason('');
        setShowOverrideModal(false);
        setPendingLog(null);
        // Refresh all data
        await Promise.all([
          fetchBalance(),
          fetchHistory(),
          fetchStats(),
          fetchAllowances(),
        ]);
      } else {
        // Check if it's an exceed error that requires override
        if (data.wouldExceed && !override) {
          setPendingLog({ minutes, screenTimeTypeId: selectedScreenTimeType });
          setShowOverrideModal(true);
        } else {
          setAlertModal({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: data.error || 'Failed to log screen time',
          });
        }
      }
    } catch (error) {
      console.error('Error logging screen time:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to log screen time',
      });
    } finally {
      setLogging(false);
    }
  };

  const handleGraceGranted = async (newBalance: number) => {
    // Update balance immediately
    setBalance(newBalance);
    // Refresh all data to reflect the grace period
    await Promise.all([
      fetchBalance(),
      fetchHistory(),
      fetchStats(),
      fetchGraceStatus(),
      fetchGraceHistory(),
    ]);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700"></div>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Screen Time
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage your screen time usage
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-2">
                <ClockIcon className="h-6 w-6 text-ember-700 dark:text-ember-500" />
                <p className="text-sm text-slate-600 dark:text-slate-400">Current Balance</p>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-ember-700 dark:text-ember-500">
                  {formatTime(stats.summary.currentBalance)}
                </p>
                {graceStatus && graceStatus.borrowedMinutes > 0 && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                    (+{formatTime(graceStatus.borrowedMinutes)} borrowed)
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-2">
                <ChartBarIcon className="h-6 w-6 text-slate-700 dark:text-slate-400" />
                <p className="text-sm text-slate-600 dark:text-slate-400">This Week</p>
              </div>
              <p className="text-3xl font-bold text-slate-700 dark:text-slate-400">
                {formatTime(stats.summary.totalMinutes)}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-2">
                <ArrowTrendingUpIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Daily Average</p>
              </div>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatTime(stats.summary.averagePerDay)}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-2">
                <DevicePhoneMobileIcon className="h-6 w-6 text-slate-700 dark:text-slate-400" />
                <p className="text-sm text-slate-600 dark:text-slate-400">Weekly Limit</p>
              </div>
              <p className="text-3xl font-bold text-slate-700 dark:text-slate-400">
                {formatTime(stats.summary.weeklyAllocation)}
              </p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {stats && stats.summary.weeklyAllocation > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Weekly Usage</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {((stats.summary.weeklyAllocation - stats.summary.currentBalance) / stats.summary.weeklyAllocation * 100).toFixed(1)}% used
              </p>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div
                className="bg-ember-700 dark:bg-ember-500 h-4 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((stats.summary.weeklyAllocation - stats.summary.currentBalance) / stats.summary.weeklyAllocation * 100))}%`
                }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatTime(stats.summary.weeklyAllocation - stats.summary.currentBalance)} used
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatTime(stats.summary.currentBalance)} remaining
              </p>
            </div>
          </div>
        )}

        {/* Screen Time Type Breakdown */}
        {allowances.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Remaining Time by Type
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allowances.map((allowance) => {
                const remaining = allowance.remaining;
                const percentage = allowance.allowanceMinutes > 0
                  ? (remaining.remainingMinutes / allowance.allowanceMinutes) * 100
                  : 0;
                const isLow = remaining.remainingMinutes < allowance.allowanceMinutes * 0.2;

                return (
                  <div
                    key={allowance.id}
                    className={`border-2 rounded-lg p-4 ${
                      isLow
                        ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {allowance.screenTimeType.name}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {allowance.period === 'DAILY' ? 'Daily' : 'Weekly'} allowance
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          isLow
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-ember-700 dark:text-ember-500'
                        }`}>
                          {formatTime(remaining.remainingMinutes)}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          of {formatTime(allowance.allowanceMinutes)}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full ${
                          isLow
                            ? 'bg-red-600 dark:bg-red-400'
                            : 'bg-ember-700 dark:bg-ember-500'
                        }`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Used: {formatTime(remaining.usedMinutes)}
                      {allowance.rolloverEnabled && remaining.rolloverMinutes > 0 && (
                        <span className="ml-2 text-green-600 dark:text-green-400">
                          (+{formatTime(remaining.rolloverMinutes)} rolled over)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Screen Time Type Selection */}
        {availableTypes.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Select Screen Time Type *
            </h2>
            {!selectedScreenTimeType && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Please select a screen time type before logging time.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableTypes
                .filter((type) => type.isActive && !type.isArchived)
                .map((type) => {
                  // Find allowance for this type if it exists
                  const allowance = allowances.find((a) => a.screenTimeTypeId === type.id);
                  const hasAllowance = !!allowance;
                  
                  let remainingMinutes = 0;
                  let isLow = false;
                  let period = 'WEEKLY';
                  
                  if (allowance) {
                    const remaining = allowance.remaining;
                    remainingMinutes = remaining.remainingMinutes;
                    isLow = remainingMinutes < allowance.allowanceMinutes * 0.2;
                    period = allowance.period;
                  }

                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedScreenTimeType(type.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedScreenTimeType === type.id
                          ? 'border-ember-700 bg-ember-300/30 dark:bg-slate-900/20 ring-2 ring-ember-500'
                          : isLow
                          ? 'border-red-300 dark:border-red-700 hover:border-red-500'
                          : hasAllowance
                          ? 'border-slate-300 dark:border-slate-700 hover:border-ember-500'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-400 opacity-75'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                        {type.name}
                      </div>
                      {type.description && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {type.description}
                        </div>
                      )}
                      {hasAllowance ? (
                        <>
                          <div className={`text-sm font-semibold ${
                            isLow
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-ember-700 dark:text-ember-500'
                          }`}>
                            {formatTime(remainingMinutes)} remaining
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {period === 'DAILY' ? 'Daily' : 'Weekly'} allowance
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          No allowance configured
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
            {allowances.length === 0 && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 You can see the types, but you need an allowance configured to log time. Ask a parent to set up allowances in{' '}
                  <a
                    href="/dashboard/screentime/manage"
                    className="font-medium underline"
                  >
                    Screen Time Settings
                  </a>
                  .
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No screen time types configured yet.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Parents can set up screen time types and allowances in{' '}
                <a
                  href="/dashboard/screentime/manage"
                  className="text-ember-700 dark:text-ember-500 hover:underline font-medium"
                >
                  Screen Time Settings
                </a>
                .
              </p>
            </div>
          </div>
        )}

        {/* Quick Log Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Log
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_TIMES.map((minutes) => (
              <button
                key={minutes}
                onClick={() => handleLogTime(minutes)}
                disabled={logging || !selectedScreenTimeType}
                className="p-4 bg-ember-700 hover:bg-ember-500 disabled:bg-ember-300 text-white font-semibold rounded-lg transition-colors duration-200"
              >
                {minutes} min
              </button>
            ))}
          </div>
        </div>

        {/* Custom Time */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Custom Time
          </h2>
          <div className="flex gap-3">
            <input
              type="number"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              placeholder="Enter minutes..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              min="1"
            />
            <button
              onClick={() => handleLogTime(parseInt(customMinutes) || 0)}
              disabled={logging || !customMinutes || !selectedScreenTimeType}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              {logging ? 'Logging...' : 'Log Time'}
            </button>
          </div>
        </div>

        {/* Type Breakdown - Show breakdown by screen time type if available */}
        {allowances.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Usage by Type
            </h2>
            <div className="space-y-3">
              {allowances.map((allowance) => {
                const remaining = allowance.remaining;
                const totalForType = remaining.usedMinutes + remaining.remainingMinutes;
                const percentage = totalForType > 0
                  ? ((remaining.usedMinutes / totalForType) * 100).toFixed(1)
                  : '0';

                return (
                  <div key={allowance.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {allowance.screenTimeType.name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(remaining.usedMinutes)} / {formatTime(allowance.allowanceMinutes)} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-ember-700 dark:bg-ember-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, parseFloat(String(percentage)))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Usage History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Usage History
            </h2>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-sm text-ember-700 dark:text-ember-500 hover:underline"
            >
              {showHistory ? 'Hide' : 'Show'} ({transactions.length})
            </button>
          </div>

          {showHistory && transactions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Screen Time Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Balance After
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((transaction) => {
                    return (
                      <tr key={transaction.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {formatDate(transaction.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex text-xs px-2 py-1 rounded font-medium ${
                              transaction.type === 'SPENT'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : transaction.type === 'EARNED'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-info/20 text-info dark:bg-info/30 dark:text-info'
                            }`}
                          >
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {transaction.screenTimeType ? (
                            <span className="font-medium">{transaction.screenTimeType.name}</span>
                          ) : transaction.deviceType ? (
                            <span className="text-gray-500 dark:text-gray-400">{transaction.deviceType}</span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">-</span>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${
                          transaction.amountMinutes < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {transaction.amountMinutes > 0 ? '+' : ''}{transaction.amountMinutes}m
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                          {formatTime(transaction.balanceAfter)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {showHistory && transactions.length === 0 && (
            <p className="text-center text-gray-600 dark:text-gray-400 py-8">
              No usage history yet
            </p>
          )}
        </div>

        {/* Grace History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Grace Period History
            </h2>
            <button
              onClick={() => setShowGraceHistory(!showGraceHistory)}
              className="text-sm text-ember-700 dark:text-ember-500 hover:underline"
            >
              {showGraceHistory ? 'Hide' : 'Show'} ({graceLogs.length})
            </button>
          </div>

          {showGraceHistory && graceLogs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Minutes
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Approved By
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {graceLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {formatDate(log.requestedAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                        +{log.minutesGranted}m
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {log.reason || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex text-xs px-2 py-1 rounded font-medium ${
                            log.repaymentStatus === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : log.repaymentStatus === 'DEDUCTED'
                              ? 'bg-info/20 text-info dark:bg-info/30 dark:text-info'
                              : log.repaymentStatus === 'EARNED_BACK'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {log.repaymentStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {log.approvedBy?.name || 'Auto-approved'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showGraceHistory && graceLogs.length === 0 && (
            <p className="text-center text-gray-600 dark:text-gray-400 py-8">
              No grace period history yet
            </p>
          )}
        </div>

        {/* Grace Request Button */}
        {graceStatus && (
          <div className="mt-6">
            <GraceRequestButton
              status={graceStatus}
              onGraceGranted={handleGraceGranted}
            />
          </div>
        )}
      </div>

      {/* Override Modal */}
      {showOverrideModal && pendingLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              ⚠️ Exceeds Allowance - Parent Override Required
            </h3>
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-4 mb-4">
              <p className="text-sm text-orange-900 dark:text-orange-100">
                <strong>Warning:</strong> This would exceed your screen time allowance for this type.
                Parent override is required to proceed.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Override Reason (Required) *
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Explain why override is necessary..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleLogTime(pendingLog.minutes, true)}
                disabled={logging || !overrideReason.trim()}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded font-medium"
              >
                {logging ? 'Logging...' : 'Confirm Override'}
              </button>
              <button
                onClick={() => {
                  setShowOverrideModal(false);
                  setPendingLog(null);
                  setOverrideReason('');
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
