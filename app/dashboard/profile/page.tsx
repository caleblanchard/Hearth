'use client';

import { useState, useEffect } from 'react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { TrophyIcon, FireIcon, StarIcon, LockClosedIcon } from '@heroicons/react/24/outline';

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  iconName: string;
  requirement: number;
  progress: number;
  isCompleted: boolean;
  completedAt?: string;
  percentage: number;
}

interface Streak {
  type: string;
  currentCount: number;
  longestCount: number;
  isActive: boolean;
}

export default function ProfilePage() {
  const { user } = useSupabaseSession();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress'>('all');

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/achievements');
      if (response.ok) {
        const data = await response.json();
        setAchievements(data.achievements);
        setStreaks(data.streaks);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'BRONZE': return 'text-orange-700 bg-orange-100 dark:bg-orange-900/30';
      case 'SILVER': return 'text-gray-600 bg-gray-200 dark:bg-gray-700';
      case 'GOLD': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'PLATINUM': return 'text-ember-700 bg-ember-300 dark:bg-slate-900/30';
      case 'DIAMOND': return 'text-slate-700 bg-slate-300 dark:bg-slate-900/30';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredAchievements = achievements.filter((a) => {
    if (filter === 'completed') return a.isCompleted;
    if (filter === 'in-progress') return !a.isCompleted;
    return true;
  });

  const dailyStreak = streaks.find((s) => s.type === 'DAILY_CHORES');

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with Stats */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            {user?.name}'s Profile
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Achievements Progress */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <TrophyIcon className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Achievements</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.completed}/{stats.total}
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.percentage}% Complete
              </p>
            </div>

            {/* Daily Streak */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <FireIcon className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current Streak</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dailyStreak?.currentCount || 0} days
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Longest: {dailyStreak?.longestCount || 0} days
              </p>
            </div>

            {/* Level */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <StarIcon className="h-8 w-8 text-ember-700" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Level</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Math.floor(stats.completed / 5) + 1}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Next level: {((stats.completed % 5) + 1) * 5} achievements
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-ember-700 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            All ({achievements.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-ember-700 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            Completed ({stats.completed})
          </button>
          <button
            onClick={() => setFilter('in-progress')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'in-progress'
                ? 'bg-ember-700 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            In Progress ({stats.total - stats.completed})
          </button>
        </div>

        {/* Achievements Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-all ${
                  achievement.isCompleted ? 'border-2 border-yellow-400' : 'opacity-75'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`text-4xl ${achievement.isCompleted ? '' : 'opacity-30'}`}>
                      {achievement.isCompleted ? '🏆' : <LockClosedIcon className="h-10 w-10 text-gray-400" />}
                    </div>
                    <span className={`px-2 py-1 text-xs font-bold rounded ${getTierColor(achievement.tier)}`}>
                      {achievement.tier}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {achievement.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {achievement.description}
                </p>

                {!achievement.isCompleted && (
                  <>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {achievement.progress}/{achievement.requirement}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-ember-700 h-2 rounded-full transition-all"
                        style={{ width: `${achievement.percentage}%` }}
                      />
                    </div>
                  </>
                )}

                {achievement.isCompleted && achievement.completedAt && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    ✓ Unlocked {new Date(achievement.completedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
