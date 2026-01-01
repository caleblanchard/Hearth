/**
 * Application-wide constants
 */

// Authentication
export const BCRYPT_ROUNDS = 12;

// Pagination
export const DEFAULT_PAGINATION_LIMIT = 50;
export const MAX_PAGINATION_LIMIT = 100;

// Date ranges
export const MAX_DATE_RANGE_MS = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

// Rate limiting (in milliseconds)
export const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
export const API_RATE_LIMIT_MAX_REQUESTS = 100;
export const AUTH_RATE_LIMIT_MAX_REQUESTS = 5;
export const CRON_RATE_LIMIT_MAX_REQUESTS = 10;

// Request size limits
export const MAX_REQUEST_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// String length limits
export const MAX_NAME_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_NOTES_LENGTH = 500;

// Batch processing
export const CRON_BATCH_SIZE = 20;
