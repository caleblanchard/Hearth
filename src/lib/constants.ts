/**
 * Application-wide constants
 * 
 * These can be overridden via environment variables for different environments
 */

// Authentication
export const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

// Pagination
export const DEFAULT_PAGINATION_LIMIT = parseInt(process.env.DEFAULT_PAGINATION_LIMIT || '50', 10);
export const MAX_PAGINATION_LIMIT = parseInt(process.env.MAX_PAGINATION_LIMIT || '100', 10);

// Date ranges
export const MAX_DATE_RANGE_MS = parseInt(
  process.env.MAX_DATE_RANGE_MS || String(365 * 24 * 60 * 60 * 1000),
  10
); // 1 year in milliseconds

// Rate limiting (in milliseconds)
export const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); // 1 minute
export const API_RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '100', 10);
export const AUTH_RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5', 10);
export const CRON_RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.CRON_RATE_LIMIT_MAX_REQUESTS || '10', 10);

// Request size limits
export const MAX_REQUEST_SIZE_BYTES = parseInt(
  process.env.MAX_REQUEST_SIZE_BYTES || String(10 * 1024 * 1024),
  10
); // 10MB default

// String length limits
export const MAX_NAME_LENGTH = parseInt(process.env.MAX_NAME_LENGTH || '100', 10);
export const MAX_DESCRIPTION_LENGTH = parseInt(process.env.MAX_DESCRIPTION_LENGTH || '1000', 10);
export const MAX_NOTES_LENGTH = parseInt(process.env.MAX_NOTES_LENGTH || '500', 10);

// Batch processing
export const CRON_BATCH_SIZE = parseInt(process.env.CRON_BATCH_SIZE || '20', 10);

// Cache TTL (in milliseconds)
export const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS || '60000', 10); // 1 minute default
