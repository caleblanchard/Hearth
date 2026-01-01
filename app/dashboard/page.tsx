import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardContent from '@/components/dashboard/DashboardContent';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardContent />

      {/* Implementation Status */}
      <div className="mt-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
          Phase 2: Core Features - In Progress
        </h3>
        <p className="text-green-800 dark:text-green-200 text-sm mb-4">
          Now showing real data from your database! The dashboard is connected and displaying:
        </p>
        <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            Today's chores with status tracking
          </li>
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            Screen time balance and weekly allocation
          </li>
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            Credit balance and transaction history
          </li>
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            Shopping list with items and priorities
          </li>
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            To-do items with due dates
          </li>
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            Upcoming calendar events
          </li>
        </ul>
        <p className="text-green-800 dark:text-green-200 text-sm mt-4">
          <strong>Test with:</strong> sarah@example.com / password123 or Child PIN: 1234
        </p>
      </div>
    </div>
  );
}
