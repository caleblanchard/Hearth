'use client';

import Link from 'next/link';
import {
  HomeIcon,
  CalendarIcon,
  ShoppingBagIcon,
  ClipboardDocumentListIcon,
  HeartIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <HomeIcon className="h-8 w-8 text-indigo-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">Hearth</span>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/auth/signin"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Your Family's Digital
            <span className="block text-indigo-600 dark:text-indigo-400">Command Center</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600 dark:text-gray-300">
            Organize your household, manage chores, plan meals, track schedules, and bring your family closer together—all in one place.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-8 py-4 text-lg font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Start Free Today
            </Link>
            <a
              href="#features"
              className="px-8 py-4 text-lg font-medium text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-lg border border-gray-200 dark:border-gray-700"
            >
              Learn More
            </a>
          </div>
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Free forever. No credit card required.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Everything Your Family Needs
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Powerful features designed to make family life easier
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<ClipboardDocumentListIcon className="h-8 w-8" />}
            title="Chore Management"
            description="Assign tasks, track completion, and reward family members for helping out."
          />
          <FeatureCard
            icon={<CalendarIcon className="h-8 w-8" />}
            title="Shared Calendar"
            description="Keep everyone on the same page with a family calendar for events and activities."
          />
          <FeatureCard
            icon={<ShoppingBagIcon className="h-8 w-8" />}
            title="Shopping Lists"
            description="Collaborative shopping lists that sync across all family members' devices."
          />
          <FeatureCard
            icon={<SparklesIcon className="h-8 w-8" />}
            title="Meal Planning"
            description="Plan your weekly meals, save recipes, and generate shopping lists automatically."
          />
          <FeatureCard
            icon={<HeartIcon className="h-8 w-8" />}
            title="Health Tracking"
            description="Track medications, appointments, and health records for every family member."
          />
          <FeatureCard
            icon={<HomeIcon className="h-8 w-8" />}
            title="Home Inventory"
            description="Keep track of household items, maintenance schedules, and important documents."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-indigo-600 dark:bg-indigo-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Get Organized?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Join thousands of families who have simplified their lives with Hearth.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-4 text-lg font-medium text-indigo-600 bg-white rounded-lg hover:bg-gray-50 transition-colors shadow-lg hover:shadow-xl"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>&copy; 2026 Hearth. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
      <div className="text-indigo-600 dark:text-indigo-400 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}
