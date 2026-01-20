'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmEmailMessage, setConfirmEmailMessage] = useState<string | null>(null)

  // Check for email confirmation message from signup
  useEffect(() => {
    const confirmEmail = searchParams.get('confirmEmail')
    const emailParam = searchParams.get('email')
    
    if (confirmEmail === 'true' && emailParam) {
      setEmail(emailParam)
      setConfirmEmailMessage(
        'Please check your email and click the confirmation link to activate your account. Once confirmed, you can sign in below.'
      )
    }
  }, [searchParams])

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Check if the error is about email confirmation
        if (error.message?.toLowerCase().includes('email not confirmed') || 
            error.message?.toLowerCase().includes('email not verified') ||
            error.message?.toLowerCase().includes('confirm your email')) {
          setError(
            'Please check your email and click the confirmation link to activate your account before signing in.'
          )
        } else {
          setError(error.message || 'Failed to sign in')
        }
        setLoading(false)
        return
      }

      // Redirect to dashboard or the page they were trying to access
      const searchParams = new URLSearchParams(window.location.search)
      const redirectTo = searchParams.get('redirectTo') || '/dashboard'
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome Back</h1>
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          Sign in to your Hearth family account
        </p>
      </div>

      {confirmEmailMessage && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Email Confirmation Required
              </h3>
              <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                {confirmEmailMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-orange-600 px-4 py-2 text-white font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-gray-50 dark:bg-gray-900 px-2 text-gray-600 dark:text-gray-400">Or continue with</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
      >
        <div className="flex items-center justify-center gap-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </div>
      </button>

      <div className="text-center text-sm">
        <span className="text-gray-700 dark:text-gray-300">Don't have an account? </span>
        <a
          href="/auth/signup"
          className="font-medium text-orange-600 dark:text-orange-400 hover:text-orange-500 dark:hover:text-orange-300"
        >
          Sign up
        </a>
      </div>
    </div>
  )
}
