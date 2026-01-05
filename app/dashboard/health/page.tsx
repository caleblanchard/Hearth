'use client';

import { useRouter } from 'next/navigation';
import HealthEventsList from './HealthEventsList';
import {
  UserCircleIcon,
  ChartBarIcon,
  BeakerIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

export default function HealthPage() {
  const router = useRouter();

  const quickLinks = [
    {
      name: 'Medical Profiles',
      description: 'Manage medical information, allergies, and medications',
      icon: UserCircleIcon,
      path: '/dashboard/health/profile',
      color: 'blue',
    },
    {
      name: 'Medication Safety',
      description: 'Track medications with safety interlock to prevent double-dosing',
      icon: ShieldCheckIcon,
      path: '/dashboard/medications',
      color: 'green',
    },
    {
      name: 'Temperature History',
      description: 'View temperature trends and readings over time',
      icon: ChartBarIcon,
      path: '/dashboard/health/temperature',
      color: 'red',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <BeakerIcon className="h-8 w-8" />
          Health & Wellness
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Track health events, symptoms, temperatures, and medical information for your family
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.path}
              onClick={() => router.push(link.path)}
              className={`p-6 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-${link.color}-500 dark:hover:border-${link.color}-400 transition-all text-left group`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-3 bg-${link.color}-100 dark:bg-${link.color}-900/30 rounded-lg group-hover:bg-${link.color}-200 dark:group-hover:bg-${link.color}-900/50 transition-colors`}
                >
                  <Icon
                    className={`h-6 w-6 text-${link.color}-600 dark:text-${link.color}-400`}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {link.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {link.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <HealthEventsList />
    </div>
  );
}
