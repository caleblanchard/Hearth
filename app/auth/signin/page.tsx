'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ParentLoginForm from '@/components/auth/ParentLoginForm';
import ChildPinLogin from '@/components/auth/ChildPinLogin';

function SignInContent() {
  // Use sessionStorage to persist mode across page reloads/navigations
  const getInitialMode = (): 'select' | 'parent' | 'child' => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('signin-mode');
      if (saved === 'parent' || saved === 'child') {
        return saved;
      }
    }
    return 'select';
  };

  const [mode, setMode] = useState<'select' | 'parent' | 'child'>(getInitialMode);
  const [urlError, setUrlError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeRef = useRef(mode);

  // Persist mode to sessionStorage whenever it changes
  useEffect(() => {
    modeRef.current = mode;
    if (typeof window !== 'undefined') {
      if (mode === 'select') {
        sessionStorage.removeItem('signin-mode');
      } else {
        sessionStorage.setItem('signin-mode', mode);
      }
    }
  }, [mode]);

  // Restore mode from sessionStorage immediately on mount (in case of page reload)
  // This runs on every mount to ensure mode is restored, especially after NextAuth redirects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('signin-mode');
      const loginAttempt = sessionStorage.getItem('login-attempt');
      
      // If we have a saved mode, restore it
      if (saved === 'parent' || saved === 'child') {
        setMode(saved);
      }
      
      // If we were in a login attempt, make sure we stay in the right mode
      if (loginAttempt === 'true' && saved) {
        setMode(saved as 'parent' | 'child');
      }
    }
  }, []); // Empty deps - only run on mount

  // Check for error in URL parameters (NextAuth sometimes redirects with error)
  // This handles the case where NextAuth redirects to /auth/signin?error=CredentialsSignin
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const errorParam = searchParams?.get('error');
    if (errorParam) {
      const errorMessage = errorParam === 'CredentialsSignin'
        ? 'Invalid email or password'
        : errorParam === 'Configuration'
        ? 'Authentication configuration error. Please contact support.'
        : errorParam === 'AccessDenied'
        ? 'Access denied. Please contact support.'
        : 'Login failed. Please try again.';
      
      // Set error message
      setUrlError(errorMessage);
      
      // Restore mode from sessionStorage - this is critical!
      const saved = sessionStorage.getItem('signin-mode');
      if (saved === 'parent' || saved === 'child') {
        setMode(saved);
      } else {
        // If no saved mode but we have an error, assume it was a parent login attempt
        setMode('parent');
        sessionStorage.setItem('signin-mode', 'parent');
      }
      
      // Clear the error from URL without resetting the page
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

  const handleParentLogin = async (email: string, password: string) => {
    // CRITICAL: Set mode and sessionStorage BEFORE any async operations
    // This ensures state persists even if NextAuth causes a redirect
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('signin-mode', 'parent');
      // Also set a flag to indicate we're in a login attempt
      sessionStorage.setItem('login-attempt', 'true');
    }
    setMode('parent');
    setUrlError(null);
    
    try {
      // Call signIn with redirect: false to prevent automatic redirects
      const result = await signIn('parent-login', {
        email,
        password,
        redirect: false,
        callbackUrl: '/dashboard',
      });

      // Remove login attempt flag
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('login-attempt');
      }

      // Check if result is null/undefined
      if (!result) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('signin-mode', 'parent');
        }
        setMode('parent');
        throw new Error('Invalid email or password');
      }

      // IMPORTANT: Check for errors FIRST before checking ok
      // NextAuth may set ok: true even when there's an error
      if (result.error) {
        const errorMessage = result.error === 'CredentialsSignin' 
          ? 'Invalid email or password'
          : result.error === 'Configuration'
          ? 'Authentication configuration error. Please contact support.'
          : result.error === 'AccessDenied'
          ? 'Access denied. Please contact support.'
          : result.error === 'OAuthSignin' || result.error === 'OAuthCallback'
          ? 'OAuth error occurred. Please try again.'
          : result.error === 'OAuthCreateAccount'
          ? 'Could not create OAuth account. Please try again.'
          : result.error === 'EmailCreateAccount'
          ? 'Could not create account. Please try again.'
          : result.error === 'Callback'
          ? 'Callback error. Please try again.'
          : result.error === 'OAuthAccountNotLinked'
          ? 'Account not linked. Please try again.'
          : result.error === 'EmailSignin'
          ? 'Email sign-in error. Please try again.'
          : result.error === 'SessionRequired'
          ? 'Session required. Please try again.'
          : 'Invalid email or password';
        
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('signin-mode', 'parent');
        }
        setMode('parent');
        throw new Error(errorMessage);
      }

      // Only check for success if there's no error
      if (result.ok === true) {
        // CRITICAL: Verify the session actually exists before navigating
        // NextAuth sometimes returns ok: true even when auth fails, or there's a race condition
        // Wait a brief moment for the session to be established, then verify it
        await new Promise(resolve => setTimeout(resolve, 100));
        const session = await getSession();
        
        if (!session || !session.user || !session.user.id) {
          // Session doesn't exist, authentication actually failed
          // This can happen if NextAuth sets a cookie but the session isn't valid
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('signin-mode', 'parent');
          }
          setMode('parent');
          throw new Error('Invalid email or password');
        }
        
        // Session exists and is valid, authentication was successful
        // Clear session storage on successful login
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('signin-mode');
          sessionStorage.removeItem('login-attempt');
        }
        router.push('/dashboard');
        return;
      }

      // If we get here and result.ok is not true, login failed
      // This shouldn't happen if we checked errors above, but just in case
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('signin-mode', 'parent');
      }
      setMode('parent');
      throw new Error('Invalid email or password');
    } catch (err) {
      // Remove login attempt flag
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('login-attempt');
      }
      
      // Ensure we stay in parent mode even on error
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('signin-mode', 'parent');
      }
      setMode('parent');
      
      // Re-throw to be caught by the form component
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Login failed. Please try again.');
    }
  };

  const handleChildLogin = async (memberId: string, pin: string) => {
    try {
      const result = await signIn('child-pin', {
        memberId,
        pin,
        redirect: false,
      });

      if (result?.ok) {
        router.push('/dashboard');
        return;
      }

      // Handle authentication errors
      if (result?.error) {
        const errorMessage = result.error === 'CredentialsSignin' 
          ? 'Invalid PIN'
          : result.error === 'Configuration'
          ? 'Authentication configuration error. Please contact support.'
          : result.error === 'AccessDenied'
          ? 'Access denied. Please contact support.'
          : 'Invalid PIN';
        
        throw new Error(errorMessage);
      }

      // If no error but not ok, assume PIN is invalid
      throw new Error('Invalid PIN');
    } catch (err) {
      // Re-throw to be caught by the form component
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ember-300/30 via-canvas-50 to-canvas-100 dark:from-gray-900 dark:via-slate-900 dark:to-slate-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image
                src="/hearth-logo.svg"
                alt="Hearth Logo"
                width={80}
                height={80}
                className="object-contain drop-shadow-sm"
                priority
              />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-ember-700 to-ember-500 bg-clip-text text-transparent mb-2">
              Hearth
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome to your household
            </p>
          </div>

          {/* Mode Selection */}
          {mode === 'select' && (
            <div className="space-y-4">
              <button
                onClick={() => setMode('parent')}
                className="w-full bg-ember-700 hover:bg-ember-500 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-md"
              >
                Parent Login
              </button>
              <button
                onClick={() => setMode('child')}
                className="w-full bg-ember-700 hover:bg-ember-500 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-md"
              >
                Child Login
              </button>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href="/guest"
                  className="block w-full text-center text-ember-700 dark:text-ember-500 hover:text-ember-500 dark:hover:text-ember-300 font-medium py-2 text-sm transition-colors"
                >
                  Guest Access →
                </Link>
              </div>
            </div>
          )}

          {/* Parent Login Form */}
          {mode === 'parent' && (
            <div>
              <button
                onClick={() => {
                  setMode('select');
                  setUrlError(null);
                  if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('signin-mode');
                  }
                }}
                className="mb-4 text-ember-700 dark:text-ember-500 hover:underline flex items-center gap-1"
              >
                ← Back
              </button>
              {urlError && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                  {urlError}
                </div>
              )}
              <ParentLoginForm 
                onLogin={handleParentLogin}
                initialError={urlError || undefined}
              />
            </div>
          )}

          {/* Child PIN Login */}
          {mode === 'child' && (
            <div>
              <button
                onClick={() => {
                  setMode('select');
                  setUrlError(null);
                }}
                className="mb-4 text-ember-700 dark:text-ember-500 hover:underline flex items-center gap-1"
              >
                ← Back
              </button>
              {urlError && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                  {urlError}
                </div>
              )}
              <ChildPinLogin onLogin={handleChildLogin} />
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-6">
          Hearth - Family-first household management
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ember-300/30 via-canvas-50 to-canvas-100 dark:from-gray-900 dark:via-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
