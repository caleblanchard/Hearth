'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

interface Analytics {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netChange: number;
    averageTransaction: number;
    transactionCount: number;
  };
  spendingByCategory: Array<{
    category: string;
    amount: number;
  }>;
  trends: Array<{
    periodKey: string;
    income: number;
    expenses: number;
  }>;
  period: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  REWARDS: '#8b5cf6',
  SCREEN_TIME: '#3b82f6',
  SAVINGS: '#10b981',
  TRANSFER: '#f59e0b',
  OTHER: '#6b7280',
};

export default function FinancialDashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/financial/analytics?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-600 dark:text-gray-400">
            Failed to load analytics data
          </div>
        </div>
      </div>
    );
  }

  const { summary, spendingByCategory, trends } = analytics;

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Financial Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Track your credit transactions and spending patterns
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPeriod('weekly')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  period === 'weekly'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  period === 'monthly'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Total Income
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {summary.totalIncome}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <ArrowTrendingUpIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Total Expenses
                </p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {summary.totalExpenses}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <ArrowTrendingDownIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Net Change
                </p>
                <p
                  className={`text-3xl font-bold ${
                    summary.netChange >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {summary.netChange >= 0 ? '+' : ''}
                  {summary.netChange}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <CurrencyDollarIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Trends Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Income vs Expenses
            </h2>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="periodKey"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Income"
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Expenses"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                No trend data available
              </div>
            )}
          </div>

          {/* Spending by Category Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Spending by Category
            </h2>
            {spendingByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={spendingByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.category}: ${entry.amount}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {spendingByCategory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.OTHER}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                No spending data available
              </div>
            )}
          </div>
        </div>

        {/* Additional Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Average Transaction
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.averageTransaction.toFixed(1)} credits
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Total Transactions
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.transactionCount}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
