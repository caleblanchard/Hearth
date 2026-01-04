'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

type OnboardingStep = 'welcome' | 'account' | 'complete';

interface OnboardingData {
  familyName: string;
  timezone: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState<OnboardingData>({
    familyName: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
  });

  const updateData = (field: keyof OnboardingData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setError(''); // Clear error on input change
  };

  const handleWelcomeNext = () => {
    if (!data.familyName.trim()) {
      setError('Please enter your family name');
      return;
    }
    setStep('account');
  };

  const handleAccountBack = () => {
    setStep('welcome');
  };

  const handleAccountSubmit = async () => {
    // Validation
    if (!data.adminName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!data.adminEmail.trim()) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.adminEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!data.adminPassword) {
      setError('Please enter a password');
      return;
    }

    if (data.adminPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (data.adminPassword !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Call onboarding API
      const response = await fetch('/api/onboarding/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyName: data.familyName.trim(),
          timezone: data.timezone,
          adminName: data.adminName.trim(),
          adminEmail: data.adminEmail.trim().toLowerCase(),
          adminPassword: data.adminPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Setup failed');
      }

      // Auto-login the user
      const signInResult = await signIn('parent-login', {
        email: data.adminEmail.trim().toLowerCase(),
        password: data.adminPassword,
        redirect: false,
      });

      if (signInResult?.error) {
        // Setup succeeded but login failed - not critical
        console.error('Auto-login failed:', signInResult.error);
        setStep('complete');
      } else {
        // Both setup and login succeeded
        setStep('complete');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during setup');
      setLoading(false);
    }
  };

  const handleComplete = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to Hearth 🏠
          </h1>
          <p className="text-lg text-gray-600">
            Your family-first household management system
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${step === 'welcome' ? 'text-indigo-600' : step === 'account' || step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step === 'welcome' ? 'border-indigo-600 bg-indigo-50' : step === 'account' || step === 'complete' ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-white'}`}>
                {step === 'account' || step === 'complete' ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">1</span>
                )}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">Family</span>
            </div>

            <div className="w-16 h-0.5 bg-gray-300"></div>

            <div className={`flex items-center ${step === 'account' ? 'text-indigo-600' : step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step === 'account' ? 'border-indigo-600 bg-indigo-50' : step === 'complete' ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-white'}`}>
                {step === 'complete' ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">2</span>
                )}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">Account</span>
            </div>

            <div className="w-16 h-0.5 bg-gray-300"></div>

            <div className={`flex items-center ${step === 'complete' ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step === 'complete' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-white'}`}>
                <span className="text-sm font-semibold">✓</span>
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">Done</span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Welcome Step */}
          {step === 'welcome' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Let's set up your family account
                </h2>
                <p className="text-gray-600">
                  Hearth helps you manage your household like a pro. Let's start with some basic information.
                </p>
              </div>

              <div>
                <label htmlFor="familyName" className="block text-sm font-medium text-gray-700 mb-2">
                  Family Name *
                </label>
                <input
                  type="text"
                  id="familyName"
                  value={data.familyName}
                  onChange={(e) => updateData('familyName', e.target.value)}
                  placeholder='e.g., "The Smith Family"'
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone *
                </label>
                <select
                  id="timezone"
                  value={data.timezone}
                  onChange={(e) => updateData('timezone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Phoenix">Arizona Time (MST)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Anchorage">Alaska Time (AKT)</option>
                  <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Auto-detected: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <button
                onClick={handleWelcomeNext}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-colors"
              >
                Next →
              </button>
            </div>
          )}

          {/* Account Step */}
          {step === 'account' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Create your parent account
                </h2>
                <p className="text-gray-600">
                  This will be the primary administrator account for <strong>{data.familyName}</strong>.
                </p>
              </div>

              <div>
                <label htmlFor="adminName" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  id="adminName"
                  value={data.adminName}
                  onChange={(e) => updateData('adminName', e.target.value)}
                  placeholder="e.g., John Smith"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="adminEmail"
                  value={data.adminEmail}
                  onChange={(e) => updateData('adminEmail', e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  id="adminPassword"
                  value={data.adminPassword}
                  onChange={(e) => updateData('adminPassword', e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Must be at least 8 characters long
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={data.confirmPassword}
                  onChange={(e) => updateData('confirmPassword', e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={handleAccountBack}
                  disabled={loading}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 focus:ring-4 focus:ring-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Back
                </button>
                <button
                  onClick={handleAccountSubmit}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Setting up...
                    </>
                  ) : (
                    'Complete Setup →'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  All set! 🎉
                </h2>
                <p className="text-gray-600">
                  Your family account for <strong>{data.familyName}</strong> has been created successfully.
                </p>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 text-left">
                <h3 className="font-semibold text-indigo-900 mb-3">What's next?</h3>
                <ul className="space-y-2 text-sm text-indigo-800">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Add other family members (parents, children, guests)
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Set up your first chore or task
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Explore the dashboard and discover features
                  </li>
                </ul>
              </div>

              <button
                onClick={handleComplete}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-colors"
              >
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Need help? Check out the <a href="#" className="text-indigo-600 hover:text-indigo-700 underline">documentation</a></p>
        </div>
      </div>
    </div>
  );
}
