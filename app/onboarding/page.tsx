'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

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
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
];

type OnboardingStep = 'welcome' | 'account' | 'modules' | 'complete';

interface OnboardingData {
  familyName: string;
  timezone: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
  selectedModules: string[];
  generateSampleData: boolean;
}

// Module definitions with descriptions
const AVAILABLE_MODULES = [
  { id: 'CHORES', name: 'Chores', description: 'Assign and track household tasks', icon: '🧹', category: 'Core' },
  { id: 'SCREEN_TIME', name: 'Screen Time', description: 'Manage device usage limits', icon: '📱', category: 'Core' },
  { id: 'CREDITS', name: 'Credits & Rewards', description: 'Earn and spend family credits', icon: '💰', category: 'Core' },
  { id: 'SHOPPING', name: 'Shopping List', description: 'Collaborative shopping lists', icon: '🛒', category: 'Core' },
  { id: 'CALENDAR', name: 'Calendar', description: 'Family events and schedules', icon: '📅', category: 'Core' },
  { id: 'TODOS', name: 'To-Do List', description: 'Track tasks and reminders', icon: '✅', category: 'Core' },
  { id: 'ROUTINES', name: 'Routines', description: 'Morning, bedtime checklists', icon: '🔄', category: 'Lifestyle' },
  { id: 'MEAL_PLANNING', name: 'Meal Planning', description: 'Weekly meal schedules', icon: '🍽️', category: 'Lifestyle' },
  { id: 'RECIPES', name: 'Recipes', description: 'Family recipe collection', icon: '📖', category: 'Lifestyle' },
  { id: 'HEALTH', name: 'Health & Medications', description: 'Track health and meds', icon: '💊', category: 'Lifestyle' },
  { id: 'INVENTORY', name: 'Inventory', description: 'Track household items', icon: '📦', category: 'Organization' },
  { id: 'DOCUMENTS', name: 'Documents', description: 'Secure document vault', icon: '📄', category: 'Organization' },
  { id: 'MAINTENANCE', name: 'Home Maintenance', description: 'Track repairs and upkeep', icon: '🔧', category: 'Organization' },
  { id: 'PROJECTS', name: 'Projects', description: 'Manage family projects', icon: '📊', category: 'Organization' },
  { id: 'COMMUNICATION', name: 'Family Board', description: 'Share updates and photos', icon: '💬', category: 'Social' },
  { id: 'TRANSPORT', name: 'Transportation', description: 'Carpool and schedules', icon: '🚗', category: 'Social' },
  { id: 'PETS', name: 'Pet Care', description: 'Track pet needs and vet visits', icon: '🐾', category: 'Social' },
  { id: 'RULES_ENGINE', name: 'Automation Rules', description: 'Create smart automations', icon: '⚡', category: 'Advanced' },
  { id: 'LEADERBOARD', name: 'Leaderboards', description: 'Gamify achievements', icon: '🏆', category: 'Advanced' },
  { id: 'FINANCIAL', name: 'Financial', description: 'Track allowances and expenses', icon: '💵', category: 'Advanced' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState<OnboardingData>({
    familyName: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    location: '',
    latitude: null,
    longitude: null,
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    selectedModules: ['CHORES', 'SCREEN_TIME', 'CREDITS', 'SHOPPING', 'CALENDAR', 'TODOS'], // Default core modules
    generateSampleData: false,
  });

  // Geocoding state
  const [geocodingMethod, setGeocodingMethod] = useState<'zip' | 'city'>('zip');
  const [zipCode, setZipCode] = useState('');
  const [cityName, setCityName] = useState('');
  const [country, setCountry] = useState('US');
  const [lookingUp, setLookingUp] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setError(''); // Clear error on input change
  };

  const toggleModule = (moduleId: string) => {
    setData((prev) => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(moduleId)
        ? prev.selectedModules.filter((id) => id !== moduleId)
        : [...prev.selectedModules, moduleId],
    }));
  };

  const selectAllModules = () => {
    setData((prev) => ({
      ...prev,
      selectedModules: AVAILABLE_MODULES.map((m) => m.id),
    }));
  };

  const selectCoreModules = () => {
    setData((prev) => ({
      ...prev,
      selectedModules: AVAILABLE_MODULES.filter((m) => m.category === 'Core').map((m) => m.id),
    }));
  };

  const handleGeocodeLookup = async () => {
    setLookingUp(true);
    setGeocodeResults([]);

    try {
      const params = new URLSearchParams();
      if (geocodingMethod === 'zip') {
        if (!zipCode.trim()) {
          setError('Please enter a zip code');
          setLookingUp(false);
          return;
        }
        params.append('zip', zipCode.trim());
        params.append('country', country);
      } else {
        if (!cityName.trim()) {
          setError('Please enter a city name');
          setLookingUp(false);
          return;
        }
        params.append('city', cityName.trim());
        params.append('country', country);
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
        setData({
          ...data,
          location: `${responseData.name}, ${responseData.state || responseData.country}`,
          latitude: responseData.lat,
          longitude: responseData.lon,
        });
        setError(''); // Clear any errors on success
      } else {
        // Handle city name results (array of matches)
        if (responseData.results.length === 1) {
          const result = responseData.results[0];
          setData({
            ...data,
            location: `${result.name}, ${result.state || result.country}`,
            latitude: result.lat,
            longitude: result.lon,
          });
          setError(''); // Clear any errors on success
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
    setData({
      ...data,
      location: `${result.name}, ${result.state || result.country}`,
      latitude: result.lat,
      longitude: result.lon,
    });
    setGeocodeResults([]);
    setError(''); // Clear any errors
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

  const handleAccountNext = () => {
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

    setStep('modules');
  };

  const handleModulesBack = () => {
    setStep('account');
  };

  const handleModulesSubmit = async () => {
    if (data.selectedModules.length === 0) {
      setError('Please select at least one module to continue');
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
          location: data.location?.trim() || undefined,
          latitude: data.latitude || undefined,
          longitude: data.longitude || undefined,
          adminName: data.adminName.trim(),
          adminEmail: data.adminEmail.trim().toLowerCase(),
          adminPassword: data.adminPassword,
          selectedModules: data.selectedModules,
          generateSampleData: data.generateSampleData,
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

  // Group modules by category
  const modulesByCategory = AVAILABLE_MODULES.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_MODULES>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
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
            <div className={`flex items-center ${step === 'welcome' ? 'text-indigo-600' : ['account', 'modules', 'complete'].includes(step) ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step === 'welcome' ? 'border-indigo-600 bg-indigo-50' : ['account', 'modules', 'complete'].includes(step) ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-white'}`}>
                {['account', 'modules', 'complete'].includes(step) ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">1</span>
                )}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">Family</span>
            </div>

            <div className="w-12 h-0.5 bg-gray-300"></div>

            <div className={`flex items-center ${step === 'account' ? 'text-indigo-600' : ['modules', 'complete'].includes(step) ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step === 'account' ? 'border-indigo-600 bg-indigo-50' : ['modules', 'complete'].includes(step) ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-white'}`}>
                {['modules', 'complete'].includes(step) ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">2</span>
                )}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">Account</span>
            </div>

            <div className="w-12 h-0.5 bg-gray-300"></div>

            <div className={`flex items-center ${step === 'modules' ? 'text-indigo-600' : step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step === 'modules' ? 'border-indigo-600 bg-indigo-50' : step === 'complete' ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-white'}`}>
                {step === 'complete' ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">3</span>
                )}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">Features</span>
            </div>

            <div className="w-12 h-0.5 bg-gray-300"></div>

            <div className={`flex items-center ${step === 'complete' ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step === 'complete' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-white'}`}>
                <span className="text-sm font-semibold">✓</span>
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">Done</span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-8 max-h-[70vh] overflow-y-auto">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
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

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Location (for Weather Widget) <span className="text-gray-500 font-normal">(Optional)</span>
                </h3>
                <div className="space-y-4">

                  {/* Geocoding Method Selector */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setGeocodingMethod('zip')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        geocodingMethod === 'zip'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Zip/Postal Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setGeocodingMethod('city')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        geocodingMethod === 'city'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      City Name
                    </button>
                  </div>

                  {/* Zip Code Input */}
                  {geocodingMethod === 'zip' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Zip/Postal Code
                        </label>
                        <input
                          type="text"
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleGeocodeLookup()}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                          placeholder="e.g., 90210 or SW1A 1AA"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Country
                        </label>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* City Name Input */}
                  {geocodingMethod === 'city' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City Name
                        </label>
                        <input
                          type="text"
                          value={cityName}
                          onChange={(e) => setCityName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleGeocodeLookup()}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                          placeholder="e.g., London or New York"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Country
                        </label>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Look Up Button */}
                  <div>
                    <button
                      type="button"
                      onClick={handleGeocodeLookup}
                      disabled={lookingUp}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {lookingUp ? 'Looking up...' : 'Look Up Coordinates'}
                    </button>
                  </div>

                  {/* Multiple Results Selection */}
                  {geocodeResults.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-900 mb-2">
                        Multiple locations found - please choose one:
                      </p>
                      <div className="space-y-2">
                        {geocodeResults.map((result, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectGeocodeResult(result)}
                            className="w-full text-left px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                          >
                            <span className="font-medium text-gray-900">
                              {result.name}
                            </span>
                            {result.state && (
                              <span className="text-gray-600">, {result.state}</span>
                            )}
                            <span className="text-gray-600"> ({result.country})</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {result.lat.toFixed(4)}, {result.lon.toFixed(4)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Current Location Display */}
                  {data.latitude && data.longitude && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-green-900">
                        ✓ Location set: {data.location}
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Coordinates: {data.latitude.toFixed(4)}, {data.longitude.toFixed(4)}
                      </p>
                    </div>
                  )}

                  {/* Advanced Manual Entry */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      {showAdvanced ? '▼ Hide' : '▶'} Advanced: Manual Coordinate Entry
                    </button>
                    {showAdvanced && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Location Name
                          </label>
                          <input
                            type="text"
                            value={data.location || ''}
                            onChange={(e) => updateData('location', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                            placeholder="e.g., New York, NY"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Latitude
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={data.latitude ?? ''}
                              onChange={(e) => updateData('latitude', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                              placeholder="e.g., 40.7128"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Longitude
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={data.longitude ?? ''}
                              onChange={(e) => updateData('longitude', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                              placeholder="e.g., -74.0060"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
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
                  onClick={handleAccountNext}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Modules Step */}
          {step === 'modules' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Choose your features
                </h2>
                <p className="text-gray-600">
                  Select the modules you'd like to use. You can always enable or disable features later in settings.
                </p>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={selectAllModules}
                  className="px-4 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={selectCoreModules}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Core Only
                </button>
                <button
                  onClick={() => updateData('selectedModules', [])}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear All
                </button>
              </div>

              {/* Module Categories */}
              <div className="space-y-6">
                {Object.entries(modulesByCategory).map(([category, modules]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {modules.map((module) => (
                        <button
                          key={module.id}
                          onClick={() => toggleModule(module.id)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            data.selectedModules.includes(module.id)
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start">
                            <span className="text-2xl mr-3">{module.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900">{module.name}</h4>
                                {data.selectedModules.includes(module.id) && (
                                  <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Sample Data Option */}
              <div className="border-t pt-6">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.generateSampleData}
                    onChange={(e) => updateData('generateSampleData', e.target.checked)}
                    className="mt-1 h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">Generate sample data (optional)</span>
                    <p className="text-sm text-gray-600">
                      Populate with example chores, recipes, and other data to help you explore features. You can delete this data later.
                    </p>
                  </div>
                </label>
              </div>

              <p className="text-sm text-gray-500">
                Selected: {data.selectedModules.length} of {AVAILABLE_MODULES.length} modules
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={handleModulesBack}
                  disabled={loading}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 focus:ring-4 focus:ring-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Back
                </button>
                <button
                  onClick={handleModulesSubmit}
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
                {data.generateSampleData && (
                  <p className="text-sm text-indigo-600 mt-2">
                    Sample data has been generated to help you explore the features!
                  </p>
                )}
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
                    {data.generateSampleData ? 'Explore the sample data or create your own' : 'Set up your first chore, task, or event'}
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Check your email for a welcome message with tips
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
