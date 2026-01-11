'use client';

import { useState, useEffect } from 'react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  ChartBarIcon,
  CalendarIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface TemperatureLog {
  id: string;
  memberId: string;
  temperature: number;
  method: string;
  recordedAt: string;
  notes: string | null;
  member: {
    id: string;
    name: string;
  };
}

interface FamilyMember {
  id: string;
  name: string;
  role: string;
}

const METHOD_LABELS: Record<string, string> = {
  ORAL: 'Oral',
  RECTAL: 'Rectal',
  ARMPIT: 'Armpit',
  EAR: 'Ear',
  FOREHEAD: 'Forehead',
};

export default function TemperatureHistoryPage() {
  const { user } = useSupabaseSession();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [logs, setLogs] = useState<TemperatureLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Date range filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Fetch family members
  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch('/api/family');
        if (res.ok) {
          const data = await res.json();
          setMembers(data.family.members || []);
          // Auto-select current user if they're a child
          if (user?.role === 'CHILD') {
            setSelectedMemberId(user.id);
          }
        }
      } catch (error) {
        console.error('Error fetching family members:', error);
      }
    }
    if (user) {
      fetchMembers();
    }
  }, [user]);

  // Fetch temperature logs
  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedMemberId) {
          params.set('memberId', selectedMemberId);
        }
        if (startDate) {
          params.set('startDate', new Date(startDate).toISOString());
        }
        if (endDate) {
          params.set('endDate', new Date(endDate).toISOString());
        }

        const res = await fetch(`/api/health/temperature?${params}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } catch (error) {
        console.error('Error fetching temperature logs:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [selectedMemberId, startDate, endDate]);

  // Prepare chart data
  const chartData = logs
    .slice()
    .reverse()
    .map((log) => ({
      time: new Date(log.recordedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
      temperature: log.temperature,
      name: log.member.name,
    }));

  // Temperature classification
  const getTempClass = (temp: number) => {
    if (temp >= 100.4) return 'fever';
    if (temp >= 99.5) return 'elevated';
    return 'normal';
  };

  const getTempColor = (temp: number) => {
    const classification = getTempClass(temp);
    if (classification === 'fever') return 'text-red-600 dark:text-red-400';
    if (classification === 'elevated')
      return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getTempBgColor = (temp: number) => {
    const classification = getTempClass(temp);
    if (classification === 'fever')
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    if (classification === 'elevated')
      return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
  };

  const isParent = user?.role === 'PARENT';

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Temperature History
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track temperature readings over time
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Member Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Family Member
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              disabled={!isParent}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-ember-500 disabled:opacity-50"
            >
              <option value="">All family members</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-ember-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-ember-500"
            />
          </div>
        </div>
      </div>

      {/* Chart */}
      {logs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-6 w-6" />
            Temperature Trend
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  domain={[95, 105]}
                  tick={{ fontSize: 12 }}
                  label={{
                    value: 'Temperature (°F)',
                    angle: -90,
                    position: 'insideLeft',
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <ReferenceLine
                  y={98.6}
                  label="Normal"
                  stroke="green"
                  strokeDasharray="3 3"
                />
                <ReferenceLine
                  y={99.5}
                  label="Elevated"
                  stroke="orange"
                  strokeDasharray="3 3"
                />
                <ReferenceLine
                  y={100.4}
                  label="Fever"
                  stroke="red"
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Normal (&lt; 99.5°F)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Elevated (99.5-100.3°F)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Fever (≥ 100.4°F)</span>
            </div>
          </div>
        </div>
      )}

      {/* Temperature Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Temperature Readings
        </h2>

        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Loading...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No temperature readings found
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Temperature logs will appear here once recorded
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-4 rounded-lg border ${getTempBgColor(
                  log.temperature
                )}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div
                        className={`text-2xl font-bold ${getTempColor(
                          log.temperature
                        )}`}
                      >
                        {log.temperature.toFixed(1)}°F
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {METHOD_LABELS[log.method]} method
                      </div>
                    </div>
                    <div className="border-l border-gray-300 dark:border-gray-600 pl-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.member.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(log.recordedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {log.notes && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                      {log.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
