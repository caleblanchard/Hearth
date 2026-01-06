/**
 * Environment Variable Validation
 * 
 * Validates all required environment variables on application startup.
 * Fails fast if required variables are missing or invalid.
 */

import { logger } from './logger';

interface EnvConfig {
  // Database
  DATABASE_URL: string;
  
  // Authentication
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL?: string;
  
  // Optional: Redis for rate limiting
  REDIS_URL?: string;
  
  // Optional: Cron secret
  CRON_SECRET?: string;
  
  // Optional: App URL
  NEXT_PUBLIC_APP_URL?: string;
  
  // Optional: VAPID keys for push notifications
  NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  
  // Optional: Google OAuth
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  
  // Optional: Email service
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
}

type EnvVar = keyof EnvConfig;

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate environment variables
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required variables
  const required: EnvVar[] = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
  ];
  
  // Check required variables
  for (const key of required) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }
  
  // Validate DATABASE_URL format
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && !databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
  }
  
  // Validate NEXTAUTH_SECRET length (should be at least 32 characters)
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (nextAuthSecret && nextAuthSecret.length < 32) {
    warnings.push('NEXTAUTH_SECRET should be at least 32 characters long for security');
  }
  
  // Check for NEXTAUTH_URL in production
  if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_URL) {
    warnings.push('NEXTAUTH_URL should be set in production');
  }
  
  // Validate Redis URL format if provided
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl && !redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    warnings.push('REDIS_URL should be a valid Redis connection string (redis:// or rediss://)');
  }
  
  // Check for VAPID keys (both or neither)
  const hasVapidPublic = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const hasVapidPrivate = !!process.env.VAPID_PRIVATE_KEY;
  if (hasVapidPublic !== hasVapidPrivate) {
    warnings.push('VAPID keys should both be set or both be omitted (push notifications require both)');
  }
  
  // Check for Google OAuth (both or neither)
  const hasGoogleClientId = !!process.env.GOOGLE_CLIENT_ID;
  const hasGoogleClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
  if (hasGoogleClientId !== hasGoogleClientSecret) {
    warnings.push('Google OAuth credentials should both be set or both be omitted');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get validated environment configuration
 * Throws if validation fails
 */
export function getEnvConfig(): EnvConfig {
  const result = validateEnv();
  
  if (!result.valid) {
    const errorMessage = [
      'Environment variable validation failed:',
      ...result.errors,
    ].join('\n');
    throw new Error(errorMessage);
  }
  
  // Log warnings but don't fail
  if (result.warnings.length > 0) {
    logger.warn('Environment variable warnings:', { warnings: result.warnings });
  }
  
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    REDIS_URL: process.env.REDIS_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  };
}
