'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertModal } from '@/components/ui/Modal';
import GraceRequestButton from '@/components/screentime/GraceRequestButton';
import {
  ClockIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  DevicePhoneMobileIcon,
  TvIcon,
  DeviceTabletIcon,
  ComputerDesktopIcon,
  Squares2X2Icon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

const DEVICE_TYPES = [
  { value: 'TV', label: 'TV', Icon: TvIcon },
  { value: 'TABLET', label: 'Tablet', Icon: DeviceTabletIcon },
  { value: 'PHONE', label: 'Phone', Icon: DevicePhoneMobileIcon },
  { value: 'COMPUTER', label: 'Computer', Icon: ComputerDesktopIcon },
  { value: 'GAMING', label: 'Gaming', Icon: Squares2X2Icon },
  { value: 'OTHER', label: 'Other', Icon: CpuChipIcon },
];

const QUICK_TIMES = [15, 30, 60, 120];

interface Transaction {
  id: string;
  type: string;
  amountMinutes: number;
  balanceAfter: number;
  deviceType?: string;
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

export default function ScreenTimePage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('OTHER');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [graceStatus, setGraceStatus] = useState<GraceStatus | null>(null);
  const [graceLogs, setGraceLogs] = useState<GraceLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showGraceHistory, setShowGraceHistory] = useState(false);
  const router = useRouter();

  // Alert modal state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        setBalance(data.screenTime?.currentBalance || 0);
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

  useEffect(() => {
    fetchBalance();
    fetchHistory();
    fetchStats();
    fetchGraceStatus();
    fetchGraceHistory();
  }, []);

  const handleLogTime = async (minutes: number) => {
    if (minutes <= 0) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Input',
        message: 'Please enter a valid number of minutes',
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
          deviceType: selectedDevice,
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
        setBalance(data.balance);
        setCustomMinutes('');
        // Refresh history and stats
        await fetchHistory();
        await fetchStats();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to log screen time',
        });
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

        {/* Device Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Select Device Type
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {DEVICE_TYPES.map((device) => {
              const DeviceIcon = device.Icon;
              return (
                <button
                  key={device.value}
                  onClick={() => setSelectedDevice(device.value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedDevice === device.value
                      ? 'border-ember-700 bg-ember-300/30 dark:bg-slate-900/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-ember-500'
                  }`}
                >
                  <div className="mb-2 flex justify-center">
                    <DeviceIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {device.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

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
                disabled={logging}
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
              disabled={logging || !customMinutes}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              {logging ? 'Logging...' : 'Log Time'}
            </button>
          </div>
        </div>

        {/* Device Breakdown */}
        {stats && stats.deviceBreakdown.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Device Breakdown
            </h2>
            <div className="space-y-3">
              {stats.deviceBreakdown.map((item) => {
                const deviceInfo = DEVICE_TYPES.find(d => d.value === item.device) || DEVICE_TYPES[DEVICE_TYPES.length - 1];
                const DeviceIcon = deviceInfo.Icon;
                const percentage = stats.summary.totalMinutes > 0
                  ? ((item.minutes / stats.summary.totalMinutes) * 100).toFixed(1)
                  : 0;

                return (
                  <div key={item.device}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <DeviceIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {deviceInfo.label}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(item.minutes)} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-ember-700 dark:bg-ember-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
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
                      Device
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
                    const deviceInfo = transaction.deviceType
                      ? DEVICE_TYPES.find(d => d.value === transaction.deviceType)
                      : null;
                    const DeviceIcon = deviceInfo?.Icon;

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
                          {deviceInfo && DeviceIcon ? (
                            <div className="flex items-center gap-2">
                              <DeviceIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              {deviceInfo.label}
                            </div>
                          ) : '-'}
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
