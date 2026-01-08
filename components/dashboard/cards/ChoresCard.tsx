'use client';

import { useRouter } from 'next/navigation';

interface ChoreData {
  id: string;
  name: string;
  description?: string;
  status: string;
  creditValue: number;
  difficulty: string;
  dueDate: string;
  requiresApproval: boolean;
}

interface ChoresCardProps {
  chores: ChoreData[];
}

export default function ChoresCard({ chores }: ChoresCardProps) {
  const router = useRouter();

  const completedChores = chores.filter(
    (c) => c.status === 'COMPLETED' || c.status === 'APPROVED'
  ).length;

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer h-full"
      onClick={() => router.push('/dashboard/chores')}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Today's Chores
        </h2>
        <span className="bg-info/20 dark:bg-info/30 text-info dark:text-info text-xs font-medium px-2.5 py-0.5 rounded">
          {completedChores}/{chores.length}
        </span>
      </div>
      {chores.length > 0 ? (
        <div className="space-y-2">
          {chores.slice(0, 3).map((chore) => (
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
          {chores.length > 3 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
              +{chores.length - 3} more
            </p>
          )}
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          No chores scheduled for today.
        </p>
      )}
    </div>
  );
}
