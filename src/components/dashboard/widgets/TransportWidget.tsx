'use client';

import { useState, useEffect } from 'react';
import { Car } from 'lucide-react';

interface TransportSchedule {
  id: string;
  time: string;
  type: string;
  member: {
    id: string;
    name: string;
  };
  location: {
    id: string;
    name: string;
    address: string;
  };
  driver: {
    id: string;
    name: string;
    phone: string;
    relationship: string;
  } | null;
  carpool: {
    id: string;
    name: string;
  } | null;
}

interface TransportWidgetData {
  schedules: TransportSchedule[];
}

export default function TransportWidget({ memberId }: { memberId?: string } = {}) {
  const [data, setData] = useState<TransportWidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTransport() {
      try {
        setLoading(true);
        setError(null);

        const url = memberId
          ? `/api/transport/today?memberId=${memberId}`
          : '/api/transport/today';

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch transport data');
        }

        const data = await response.json();
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transport');
      } finally {
        setLoading(false);
      }
    }

    fetchTransport();
  }, [memberId]);

  // Format time from HH:mm:ss to h:mm AM/PM
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Format transport type
  const formatType = (type: string): string => {
    return type
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get color for transport type
  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      SCHOOL_DROPOFF: 'bg-info/20 dark:bg-info/30 text-info dark:text-info',
      SCHOOL_PICKUP: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      ACTIVITY_DROPOFF:
        'bg-ember-300/30 dark:bg-slate-900/30 text-ember-700 dark:text-ember-300',
      ACTIVITY_PICKUP:
        'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      APPOINTMENT: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      OTHER: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
    };
    return colors[type] || colors.OTHER;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Car className="w-5 h-5" />
          Transport
        </h2>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
      )}

      {error && (
        <div className="text-center py-8 text-red-600 dark:text-red-400">
          Failed to load transport
        </div>
      )}

      {!loading && !error && data && data.schedules.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No transport scheduled today
        </div>
      )}

      {!loading && !error && data && data.schedules.length > 0 && (
        <div className="space-y-3">
          {data.schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatTime(schedule.time)}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${getTypeColor(
                        schedule.type
                      )}`}
                    >
                      {formatType(schedule.type)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {schedule.member.name}
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div className="flex items-center gap-1">
                  <span className="font-medium">{schedule.location.name}</span>
                </div>
                {schedule.driver && (
                  <div className="flex items-center gap-1">
                    <span>Driver: {schedule.driver.name}</span>
                  </div>
                )}
                {schedule.carpool && (
                  <div className="flex items-center gap-1">
                    <span>Carpool: {schedule.carpool.name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
