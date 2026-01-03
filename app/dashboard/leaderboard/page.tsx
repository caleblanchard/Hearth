'use client';

import { useState, useEffect } from 'react';
import { TrophyIcon, FireIcon } from '@heroicons/react/24/outline';

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl?: string;
  score: number;
  streak: number;
  rank: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all-time'>('weekly');
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async (selectedPeriod: typeof period) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leaderboard?period=${selectedPeriod}`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(period);
  }, [period]);

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-orange-600';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 dark:bg-yellow-900/30';
    if (rank === 2) return 'bg-gray-100 dark:bg-gray-800';
    if (rank === 3) return 'bg-orange-100 dark:bg-orange-900/30';
    return 'bg-white dark:bg-gray-800';
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <TrophyIcon className="h-10 w-10 text-yellow-500" />
            Leaderboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            See who's leading the family!
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'weekly'
                ? 'bg-ember-700 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'monthly'
                ? 'bg-ember-700 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setPeriod('all-time')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'all-time'
                ? 'bg-ember-700 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            All Time
          </button>
        </div>

        {/* Leaderboard */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700"></div>
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="space-y-4">
            {leaderboard.map((entry) => (
              <div
                key={entry.userId}
                className={`${getRankBg(entry.rank)} rounded-lg shadow-md p-6 transition-all hover:shadow-lg`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={`text-5xl font-bold ${getRankColor(entry.rank)} w-16 text-center`}>
                    {entry.rank === 1 && '🥇'}
                    {entry.rank === 2 && '🥈'}
                    {entry.rank === 3 && '🥉'}
                    {entry.rank > 3 && `#${entry.rank}`}
                  </div>

                  {/* Avatar */}
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={entry.name}
                      className="w-16 h-16 rounded-full"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-ember-300 dark:bg-slate-900 flex items-center justify-center">
                      <span className="text-2xl font-bold text-ember-700 dark:text-ember-500">
                        {entry.name[0]}
                      </span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {entry.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {entry.score} points
                    </p>
                  </div>

                  {/* Streak */}
                  {entry.streak > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <FireIcon className="h-6 w-6 text-orange-500" />
                      <div>
                        <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                          {entry.streak} day{entry.streak !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-orange-500">Streak</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <TrophyIcon className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-xl font-medium text-gray-600 dark:text-gray-400">
              No data yet
            </p>
            <p className="text-gray-500 dark:text-gray-500">
              Complete some chores to get on the leaderboard!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
