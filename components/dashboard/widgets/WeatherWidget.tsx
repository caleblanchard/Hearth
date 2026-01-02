'use client';

import { useState, useEffect } from 'react';
import { Cloud } from 'lucide-react';

interface WeatherData {
  location: string;
  current: {
    temp: number;
    feelsLike: number;
    condition: string;
    description: string;
    icon: string;
  };
  today: {
    high: number;
    low: number;
  };
  forecast: {
    date: string;
    high: number;
    low: number;
    condition: string;
    description: string;
    icon: string;
  }[];
}

export default function WeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeather();
  }, []);

  async function fetchWeather() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/weather');

      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const data = await response.json();
      setData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weather');
    } finally {
      setLoading(false);
    }
  }

  // Format date for forecast
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateOnly = date.toDateString();
    const todayOnly = today.toDateString();
    const tomorrowOnly = tomorrow.toDateString();

    if (dateOnly === todayOnly) return 'Today';
    if (dateOnly === tomorrowOnly) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          Weather
        </h2>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
      )}

      {error && (
        <div className="text-center py-8 text-red-600 dark:text-red-400">
          Failed to load weather
        </div>
      )}

      {!loading && !error && data && (
        <div>
          {/* Current Weather */}
          <div className="text-center mb-4">
            <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
              {data.current.temp}°
            </div>
            <div className="text-gray-600 dark:text-gray-400 capitalize mb-1">
              {data.current.description}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              H: {data.today.high}° L: {data.today.low}°
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {data.location}
            </div>
          </div>

          {/* Forecast */}
          {data.forecast && data.forecast.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="grid grid-cols-3 gap-2">
                {data.forecast.slice(0, 3).map((day, index) => (
                  <div
                    key={index}
                    className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {formatDate(day.date)}
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {day.high}°
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {day.low}°
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
