'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  registerFamily,
  validateRegistrationData,
  checkEmailAvailable,
  type FamilyRegistrationData,
} from '@/lib/auth/signup'

type Step = 'family' | 'account' | 'pin' | 'review'

export function SignUpWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('family')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data
  const [familyName, setFamilyName] = useState('')
  const [timezone, setTimezone] = useState(
    typeof window !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'America/New_York'
  )
  const [parentName, setParentName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pin, setPin] = useState('')
  const [setupPin, setSetupPin] = useState(false)

  const handleFamilyStep = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!familyName.trim()) {
      setError('Please enter your family name')
      return
    }

    setCurrentStep('account')
  }

  const handleAccountStep = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate password match
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      // Validate registration data
      const validation = validateRegistrationData({
        familyName,
        parentName,
        email,
        password,
      })

      if (!validation.valid) {
        setError(validation.errors.join(', '))
        setLoading(false)
        return
      }

      // Check if email is available
      const emailAvailable = await checkEmailAvailable(email)
      if (!emailAvailable) {
        setError('This email is already registered')
        setLoading(false)
        return
      }

      setCurrentStep('pin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate account')
    } finally {
      setLoading(false)
    }
  }

  const handlePinStep = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate PIN if user wants to set one up
    if (setupPin) {
      if (!/^\d{4,6}$/.test(pin)) {
        setError('PIN must be 4-6 digits')
        return
      }
    }

    setCurrentStep('review')
  }

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)

    try {
      const registrationData: FamilyRegistrationData = {
        familyName,
        timezone,
        parentName,
        email,
        password,
        pin: setupPin ? pin : undefined,
      }

      const result = await registerFamily(registrationData)

      if (!result.success) {
        setError(result.error || 'Failed to create account')
        setLoading(false)
        return
      }

      // Success! Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'family':
        return (
          <form onSubmit={handleFamilyStep} className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Welcome to Hearth</h2>
              <p className="text-gray-600 mb-6">Let's start by setting up your family</p>
            </div>

            <div>
              <label htmlFor="familyName" className="block text-sm font-medium text-gray-700">
                Family Name
              </label>
              <input
                id="familyName"
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="The Smiths"
              />
            </div>

            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                Timezone
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="America/Anchorage">Alaska Time</option>
                <option value="Pacific/Honolulu">Hawaii Time</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Continue
            </button>
          </form>
        )

      case 'account':
        return (
          <form onSubmit={handleAccountStep} className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Create Your Account</h2>
              <p className="text-gray-600 mb-6">
                You'll use this to sign in as a parent
              </p>
            </div>

            <div>
              <label htmlFor="parentName" className="block text-sm font-medium text-gray-700">
                Your Name
              </label>
              <input
                id="parentName"
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="••••••••"
              />
              <p className="mt-1 text-sm text-gray-500">
                At least 8 characters with uppercase, lowercase, and numbers
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep('family')}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Continue'}
              </button>
            </div>
          </form>
        )

      case 'pin':
        return (
          <form onSubmit={handlePinStep} className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Kiosk Mode (Optional)</h2>
              <p className="text-gray-600 mb-6">
                Set up a PIN for quick sign-in on shared devices
              </p>
            </div>

            <div className="rounded-md bg-blue-50 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={setupPin}
                  onChange={(e) => setSetupPin(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Enable Kiosk Mode</div>
                  <div className="text-sm text-gray-600">
                    Let family members sign in with a 4-6 digit PIN on shared devices
                  </div>
                </div>
              </label>
            </div>

            {setupPin && (
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
                  Your PIN
                </label>
                <input
                  id="pin"
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  required={setupPin}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="1234"
                />
                <p className="mt-1 text-sm text-gray-500">Enter 4-6 digits</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep('account')}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Continue
              </button>
            </div>
          </form>
        )

      case 'review':
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Review & Create</h2>
              <p className="text-gray-600 mb-6">Please review your information</p>
            </div>

            <div className="rounded-md bg-gray-50 p-4 space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-500">Family Name</div>
                <div className="text-gray-900">{familyName}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Timezone</div>
                <div className="text-gray-900">{timezone}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Your Name</div>
                <div className="text-gray-900">{parentName}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Email</div>
                <div className="text-gray-900">{email}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Kiosk Mode</div>
                <div className="text-gray-900">
                  {setupPin ? `Enabled (PIN: ${'•'.repeat(pin.length)})` : 'Disabled'}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep('pin')}
                disabled={loading}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'family'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              1
            </div>
            <div
              className={`flex-1 h-1 ${
                ['account', 'pin', 'review'].includes(currentStep)
                  ? 'bg-blue-600'
                  : 'bg-gray-200'
              }`}
            />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'account'
                  ? 'bg-blue-600 text-white'
                  : ['pin', 'review'].includes(currentStep)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              2
            </div>
            <div
              className={`flex-1 h-1 ${
                ['pin', 'review'].includes(currentStep) ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'pin'
                  ? 'bg-blue-600 text-white'
                  : currentStep === 'review'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              3
            </div>
            <div
              className={`flex-1 h-1 ${
                currentStep === 'review' ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          </div>
        </div>
        <div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'review'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            4
          </div>
        </div>
      </div>

      {renderStep()}

      <div className="text-center text-sm">
        <span className="text-gray-600">Already have an account? </span>
        <a href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
          Sign in
        </a>
      </div>
    </div>
  )
}
