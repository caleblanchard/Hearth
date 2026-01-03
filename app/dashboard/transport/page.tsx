'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';

interface TransportSchedule {
  id: string;
  dayOfWeek: number;
  time: string;
  type: string;
  notes: string | null;
  member: { id: string; name: string };
  location: { id: string; name: string; address: string | null } | null;
  driver: { id: string; name: string; phone: string | null } | null;
  carpool: { id: string; name: string } | null;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TransportPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<TransportSchedule[]>([]);
  const [todaySchedules, setTodaySchedules] = useState<TransportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchedules();
    loadTodaySchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const response = await fetch('/api/transport/schedules');
      if (!response.ok) throw new Error('Failed to load schedules');
      const data = await response.json();
      setSchedules(data.schedules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const loadTodaySchedules = async () => {
    try {
      const response = await fetch('/api/transport/today');
      if (!response.ok) throw new Error('Failed to load today\'s transport');
      const data = await response.json();
      setTodaySchedules(data.schedules);
    } catch (err) {
      console.error('Error loading today\'s transport:', err);
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'PICKUP'
      ? 'bg-info/20 dark:bg-info/30 text-info dark:text-info'
      : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-gray-600 dark:text-gray-400">Loading transportation schedules...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Transportation & Carpool
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage pickup/dropoff schedules and carpool coordination
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/transport/create')}
          className="flex items-center gap-2 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg font-medium transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Add Schedule
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Today's Transport */}
      {todaySchedules.length > 0 && (
        <div className="bg-info/10 dark:bg-info/20 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Today's Transport - {DAYS_OF_WEEK[new Date().getDay()]}
          </h2>
          <div className="space-y-3">
            {todaySchedules.map((schedule) => (
              <div key={schedule.id} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatTime(schedule.time)}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(schedule.type)}`}>
                        {schedule.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {schedule.member.name}
                      {schedule.location && ` → ${schedule.location.name}`}
                    </p>
                    {schedule.driver && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Driver: {schedule.driver.name}
                        {schedule.driver.phone && ` (${schedule.driver.phone})`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Schedule */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Weekly Schedule
        </h2>

        {schedules.length === 0 ? (
          <p className="text-center py-12 text-gray-500 dark:text-gray-400">
            No transport schedules yet. Add schedules to organize pickups and dropoffs.
          </p>
        ) : (
          <div className="space-y-6">
            {DAYS_OF_WEEK.map((day, dayIndex) => {
              const daySchedules = schedules.filter(s => s.dayOfWeek === dayIndex);
              if (daySchedules.length === 0) return null;

              return (
                <div key={dayIndex}>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    {day}
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {daySchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatTime(schedule.time)}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(schedule.type)}`}>
                            {schedule.type}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {schedule.member.name}
                        </p>
                        {schedule.location && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            📍 {schedule.location.name}
                          </p>
                        )}
                        {schedule.driver && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            🚗 {schedule.driver.name}
                          </p>
                        )}
                        {schedule.carpool && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            👥 {schedule.carpool.name}
                          </p>
                        )}
                        {schedule.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 italic">
                            {schedule.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
