'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';

type OnboardingStep = 'family' | 'modules' | 'complete';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
];

const AVAILABLE_MODULES = [
  { id: 'CHORES', name: 'Chores', description: 'Assign and track household tasks', icon: '🧹' },
  { id: 'SCREEN_TIME', name: 'Screen Time', description: 'Manage device usage limits', icon: '📱' },
  { id: 'CREDITS', name: 'Credits & Rewards', description: 'Earn and spend family credits', icon: '💰' },
  { id: 'SHOPPING', name: 'Shopping List', description: 'Collaborative shopping lists', icon: '🛒' },
  { id: 'CALENDAR', name: 'Calendar', description: 'Family events and schedules', icon: '📅' },
  { id: 'TODOS', name: 'To-Do List', description: 'Track tasks and reminders', icon: '✅' },
  { id: 'ROUTINES', name: 'Routines', description: 'Morning, bedtime checklists', icon: '🔄' },
  { id: 'MEAL_PLANNING', name: 'Meal Planning', description: 'Weekly meal schedules', icon: '🍽️' },
  { id: 'RECIPES', name: 'Recipes', description: 'Family recipe collection', icon: '📖' },
  { id: 'HEALTH', name: 'Health', description: 'Track health and medications', icon: '💊' },
  { id: 'INVENTORY', name: 'Inventory', description: 'Track household items', icon: '📦' },
  { id: 'DOCUMENTS', name: 'Documents', description: 'Secure document vault', icon: '📄' },
  { id: 'MAINTENANCE', name: 'Maintenance', description: 'Home repairs and upkeep', icon: '🔧' },
  { id: 'PROJECTS', name: 'Projects', description: 'Manage family projects', icon: '📊' },
  { id: 'COMMUNICATION', name: 'Family Board', description: 'Share updates and photos', icon: '💬' },
  { id: 'TRANSPORT', name: 'Transportation', description: 'Carpool and schedules', icon: '🚗' },
  { id: 'PETS', name: 'Pet Care', description: 'Track pet needs and vet visits', icon: '🐾' },
  { id: 'RULES_ENGINE', name: 'Automation', description: 'Create smart automations', icon: '⚡' },
  { id: 'LEADERBOARD', name: 'Leaderboards', description: 'Gamify achievements', icon: '🏆' },
  { id: 'FINANCIAL', name: 'Financial', description: 'Track budgets and expenses', icon: '💵' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSupabaseSession();
  const [step, setStep] = useState<OnboardingStep>('family');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [familyName, setFamilyName] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York');
  const [weekStartDay, setWeekStartDay] = useState<'SUNDAY' | 'MONDAY'>('SUNDAY');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'CHORES', 'SCREEN_TIME', 'CREDITS', 'SHOPPING', 'CALENDAR', 'TODOS'
  ]);

  // Location lookup states
  const [geocodingMethod, setGeocodingMethod] = useState<'zip' | 'city'>('zip');
  const [zipCode, setZipCode] = useState('');
  const [cityName, setCityName] = useState('');
  const [country, setCountry] = useState('US');
  const [lookingUp, setLookingUp] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState<any[]>([]);

  // Check auth status
  useEffect(() => {
    async function checkAuthStatus() {
      if (sessionLoading) return;
      
      if (!user) {
        router.push('/auth/signup');
        return;
      }

      // Allow users to create additional families
      // Don't redirect even if they already have one
      setLoading(false);
    }

    checkAuthStatus();
  }, [user, sessionLoading, router]);

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleGeocodeLookup = async () => {
    setLookingUp(true);
    setError('');
    setGeocodeResults([]);

    try {
      const params = new URLSearchParams();
      
      if (geocodingMethod === 'zip') {
        params.set('zip', zipCode.trim());
        params.set('country', country);
      } else {
        params.set('city', cityName.trim());
        params.set('country', country);
      }

      const response = await fetch(`/api/geocoding?${params.toString()}`);
      const responseData = await response.json();

      if (!response.ok) {
        setError(responseData.error || 'Failed to look up location');
        setLookingUp(false);
        return;
      }

      // Handle zip code result (single location)
      if (geocodingMethod === 'zip') {
        setLocation(`${responseData.name}, ${responseData.state || responseData.country}`);
        setLatitude(responseData.lat);
        setLongitude(responseData.lon);
        setError('');
      } else {
        // Handle city name results (array of matches)
        if (responseData.results.length === 1) {
          const result = responseData.results[0];
          setLocation(`${result.name}, ${result.state || result.country}`);
          setLatitude(result.lat);
          setLongitude(result.lon);
          setError('');
        } else {
          // Multiple matches - show user choice
          setGeocodeResults(responseData.results);
        }
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Failed to look up location');
    } finally {
      setLookingUp(false);
    }
  };

  const handleSelectGeocodeResult = (result: any) => {
    setLocation(`${result.name}, ${result.state || result.country}`);
    setLatitude(result.lat);
    setLongitude(result.lon);
    setGeocodeResults([]);
    setError('');
  };

  const handleFamilySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!familyName.trim()) {
      setError('Please enter your family name');
      return;
    }

    setStep('modules');
  };

  const handleFinish = async () => {
    if (!user) return;

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/setup/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyName: familyName.trim(),
          timezone,
          weekStartDay,
          location: location.trim() || undefined,
          latitude,
          longitude,
          selectedModules,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to complete setup');
        setSaving(false);
        return;
      }

      // Store the new family ID as the active family in localStorage
      if (data.familyId && user?.id) {
        localStorage.setItem(`hearth_active_family_id_${user.id}`, data.familyId);
      }

      // Refresh router to update auth context with new family
      router.refresh();
      setStep('complete');
    } catch (err) {
      console.error('Setup error:', err);
      setError('An error occurred during setup');
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    // Hard redirect to dashboard to force middleware re-check
    // Active family ID is already set in localStorage from handleFinish
    window.location.href = '/dashboard';
  };

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${step === 'family' ? 'text-orange-600 dark:text-orange-500' : 'text-green-600 dark:text-green-500'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                step === 'family' ? 'border-orange-600 bg-orange-50 dark:border-orange-500 dark:bg-orange-900/20' : 'border-green-600 bg-green-50 dark:border-green-500 dark:bg-green-900/20'
              }`}>
                {step !== 'family' ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">1</span>
                )}
              </div>
              <span className="ml-2 text-sm font-medium">Family</span>
            </div>

            <div className="w-16 h-0.5 bg-gray-300 dark:bg-gray-600"></div>

            <div className={`flex items-center ${
              step === 'modules' ? 'text-orange-600 dark:text-orange-500' : step === 'complete' ? 'text-green-600 dark:text-green-500' : 'text-gray-400 dark:text-gray-500'
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                step === 'modules' ? 'border-orange-600 bg-orange-50 dark:border-orange-500 dark:bg-orange-900/20' : 
                step === 'complete' ? 'border-green-600 bg-green-50 dark:border-green-500 dark:bg-green-900/20' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'
              }`}>
                {step === 'complete' ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">2</span>
                )}
              </div>
              <span className="ml-2 text-sm font-medium">Features</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Family Step */}
          {step === 'family' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Hearth!</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Let's set up your family</p>

              <form onSubmit={handleFamilySubmit} className="space-y-6">
                <div>
                  <label htmlFor="familyName" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Family Name
                  </label>
                  <input
                    id="familyName"
                    type="text"
                    required
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    placeholder="The Smith Family"
                  />
                </div>

                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Timezone
                  </label>
                  <select
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="weekStart" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Week Starts On
                  </label>
                  <select
                    id="weekStart"
                    value={weekStartDay}
                    onChange={(e) => setWeekStartDay(e.target.value as 'SUNDAY' | 'MONDAY')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="SUNDAY">Sunday</option>
                    <option value="MONDAY">Monday</option>
                  </select>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Location <span className="text-gray-500 dark:text-gray-400 font-normal">(Optional - for Weather Widget)</span>
                  </h3>

                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setGeocodingMethod('zip')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          geocodingMethod === 'zip'
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        Zip/Postal Code
                      </button>
                      <button
                        type="button"
                        onClick={() => setGeocodingMethod('city')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          geocodingMethod === 'city'
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        City Name
                      </button>
                    </div>

                    {geocodingMethod === 'zip' ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            value={zipCode}
                            onChange={(e) => setZipCode(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleGeocodeLookup())}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:ring-orange-500 focus:border-orange-500"
                            placeholder="e.g., 90210"
                          />
                        </div>
                        <div>
                          <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:ring-orange-500 focus:border-orange-500"
                          >
                            {COUNTRIES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={cityName}
                          onChange={(e) => setCityName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleGeocodeLookup())}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:ring-orange-500 focus:border-orange-500"
                          placeholder="e.g., Los Angeles"
                        />
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleGeocodeLookup}
                      disabled={lookingUp || (geocodingMethod === 'zip' ? !zipCode.trim() : !cityName.trim())}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {lookingUp ? 'Looking up...' : 'Look Up Location'}
                    </button>

                    {geocodeResults.length > 0 && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Multiple locations found - please choose one:
                        </p>
                        <div className="space-y-2">
                          {geocodeResults.map((result, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectGeocodeResult(result)}
                              className="w-full text-left px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
                            >
                              {result.name}, {result.state || result.country}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {location && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          ✓ Location set: {location}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-orange-600 text-white py-3 px-4 rounded-md font-medium hover:bg-orange-700 transition-colors"
                >
                  Continue
                </button>
              </form>
            </div>
          )}

          {/* Modules Step */}
          {step === 'modules' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Choose Your Features</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Select the features you want to enable (you can change this later)</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {AVAILABLE_MODULES.map(module => (
                  <div
                    key={module.id}
                    onClick={() => toggleModule(module.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedModules.includes(module.id)
                        ? 'border-orange-600 bg-orange-50 dark:border-orange-500 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{module.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">{module.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{module.description}</p>
                      </div>
                      {selectedModules.includes(module.id) && (
                        <svg className="w-5 h-5 text-orange-600 dark:text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setStep('family')}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-md font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving || selectedModules.length === 0}
                  className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-md font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Setting up...' : 'Finish Setup'}
                </button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <div className="text-center py-8">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-600 dark:text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">You're All Set!</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Your family has been created. Let's get started!
              </p>

              <button
                onClick={handleComplete}
                className="bg-orange-600 text-white py-3 px-8 rounded-md font-medium hover:bg-orange-700 transition-colors"
              >
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
