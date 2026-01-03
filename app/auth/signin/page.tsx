'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ParentLoginForm from '@/components/auth/ParentLoginForm';
import ChildPinLogin from '@/components/auth/ChildPinLogin';

export default function SignInPage() {
  const [mode, setMode] = useState<'select' | 'parent' | 'child'>('select');
  const router = useRouter();

  const handleParentLogin = async (email: string, password: string) => {
    const result = await signIn('parent-login', {
      email,
      password,
      redirect: false,
    });

    if (result?.ok) {
      router.push('/dashboard');
    } else {
      throw new Error('Invalid email or password');
    }
  };

  const handleChildLogin = async (memberId: string, pin: string) => {
    const result = await signIn('child-pin', {
      memberId,
      pin,
      redirect: false,
    });

    if (result?.ok) {
      router.push('/dashboard');
    } else {
      throw new Error('Invalid PIN');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ember-300/30 via-canvas-50 to-canvas-100 dark:from-gray-900 dark:via-slate-900 dark:to-slate-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          {/* Logo and Header */}
          <div className="text-center mb-8">
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
            </div>
          )}

          {/* Parent Login Form */}
          {mode === 'parent' && (
            <div>
              <button
                onClick={() => setMode('select')}
                className="mb-4 text-ember-700 dark:text-ember-500 hover:underline flex items-center gap-1"
              >
                ← Back
              </button>
              <ParentLoginForm onLogin={handleParentLogin} />
            </div>
          )}

          {/* Child PIN Login */}
          {mode === 'child' && (
            <div>
              <button
                onClick={() => setMode('select')}
                className="mb-4 text-ember-700 dark:text-ember-500 hover:underline flex items-center gap-1"
              >
                ← Back
              </button>
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
