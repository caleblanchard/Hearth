'use client';

import { useState, useEffect, FormEvent } from 'react';

interface ParentLoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  initialError?: string;
}

export default function ParentLoginForm({ onLogin, initialError }: ParentLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(initialError || '');
  
  // Update error if initialError changes (e.g., from URL parameter)
  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent any event bubbling that might cause navigation
    
    setError('');
    setIsLoading(true);

    try {
      await onLogin(email, password);
      // Only clear form on success - if we get here, login was successful
      // and navigation will happen in the parent component
    } catch (err) {
      // Display error and keep form state
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="you@example.com"
          disabled={isLoading}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="••••••••"
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-ember-700 hover:bg-ember-500 disabled:bg-ember-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>

      <div className="text-center">
        <a
          href="/auth/forgot-password"
          className="text-sm text-ember-700 dark:text-ember-500 hover:underline"
        >
          Forgot password?
        </a>
      </div>
    </form>
  );
}
