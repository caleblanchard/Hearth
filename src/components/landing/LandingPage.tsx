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
    <div className="min-h-screen bg-gradient-to-br from-canvas-50 via-white to-canvas-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <HomeIcon className="h-8 w-8 text-ember-700 dark:text-ember-500" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">Hearth</span>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/auth/signin"
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 text-sm font-medium text-white bg-ember-700 rounded-lg hover:bg-ember-500 transition-colors shadow-sm"
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
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Your Family's Digital
            <span className="block text-ember-700 dark:text-ember-500">Command Center</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-slate-700 dark:text-slate-300">
            Organize your household, manage chores, plan meals, track schedules, and bring your family closer together—all in one place.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-8 py-4 text-lg font-medium text-white bg-ember-700 rounded-lg hover:bg-ember-500 transition-colors shadow-lg hover:shadow-xl"
            >
              Start Free Today
            </Link>
            <a
              href="#features"
              className="px-8 py-4 text-lg font-medium text-ember-700 dark:text-ember-500 bg-white dark:bg-slate-800 rounded-lg hover:bg-canvas-50 dark:hover:bg-slate-700 transition-colors shadow-lg border border-slate-300 dark:border-slate-700"
            >
              Learn More
            </a>
          </div>
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            Free forever. No credit card required.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            Everything Your Family Needs
          </h2>
          <p className="mt-4 text-lg text-slate-700 dark:text-slate-300">
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
      <section className="bg-ember-700 dark:bg-ember-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Get Organized?
          </h2>
          <p className="text-xl text-ember-300 dark:text-slate-200 mb-8 max-w-2xl mx-auto">
            Join thousands of families who have simplified their lives with Hearth.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-4 text-lg font-medium text-ember-700 bg-white rounded-lg hover:bg-canvas-50 transition-colors shadow-lg hover:shadow-xl"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            <p>&copy; 2026 Hearth. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg bg-canvas-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-ember-500 dark:hover:border-ember-500 transition-colors">
      <div className="text-ember-700 dark:text-ember-500 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-slate-700 dark:text-slate-300">{description}</p>
    </div>
  );
}
