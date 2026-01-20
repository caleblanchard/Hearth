/**
 * Input Sanitization Utilities
 * 
 * Provides functions to sanitize user input to prevent XSS and injection attacks
 */

/**
 * Sanitize a string by removing potentially dangerous characters
 * For HTML content, use a library like DOMPurify
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 10000); // Limit length
}

/**
 * Sanitize HTML content (basic - for production, use DOMPurify)
 * This is a basic implementation. For production, install and use DOMPurify:
 * npm install dompurify isomorphic-dompurify
 */
export function sanitizeHTML(html: string | null | undefined): string {
  if (!html) return '';
  
  // Basic HTML sanitization - remove script tags and dangerous attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '')
    .trim();
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return null;
  }
  
  return trimmed.slice(0, 255); // Max email length
}

/**
 * Validate and sanitize URL
 */
export function sanitizeURL(url: string | null | undefined): string | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(
  input: string | number | null | undefined,
  min?: number,
  max?: number
): number | null {
  if (input === null || input === undefined) return null;
  
  const num = typeof input === 'string' ? parseFloat(input) : input;
  
  if (isNaN(num)) return null;
  
  if (min !== undefined && num < min) return null;
  if (max !== undefined && num > max) return null;
  
  return num;
}

/**
 * Sanitize integer input
 */
export function sanitizeInteger(
  input: string | number | null | undefined,
  min?: number,
  max?: number
): number | null {
  const num = sanitizeNumber(input, min, max);
  if (num === null) return null;
  
  const int = Math.floor(num);
  return int === num ? int : null;
}

/**
 * Sanitize array of strings
 */
export function sanitizeStringArray(
  input: unknown,
  maxLength: number = 100,
  maxItems: number = 100
): string[] {
  if (!Array.isArray(input)) return [];
  
  return input
    .slice(0, maxItems)
    .map(item => sanitizeString(String(item)))
    .filter(item => item.length > 0 && item.length <= maxLength);
}
