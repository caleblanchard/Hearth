/**
 * Input validation and sanitization utilities
 */

/**
 * Sanitize a string by removing potentially dangerous characters
 * Note: For production, consider using a library like DOMPurify or sanitize-html
 */
export function sanitizeString(input: string | null | undefined, maxLength?: number): string | null {
  if (!input) return null;
  
  // Trim whitespace
  let sanitized = input.trim();
  
  // Remove null bytes and control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  // Apply length limit if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Validate and sanitize a name field
 */
export function sanitizeName(name: string | null | undefined, maxLength: number = 100): string | null {
  return sanitizeString(name, maxLength);
}

/**
 * Validate and sanitize a description field
 */
export function sanitizeDescription(description: string | null | undefined, maxLength: number = 1000): string | null {
  return sanitizeString(description, maxLength);
}

/**
 * Validate and sanitize notes field
 */
export function sanitizeNotes(notes: string | null | undefined, maxLength: number = 500): string | null {
  return sanitizeString(notes, maxLength);
}

/**
 * Validate email format (basic validation)
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate request body size
 */
export function validateRequestSize(contentLength: string | null, maxSizeBytes: number): boolean {
  if (!contentLength) return true; // Can't validate without content-length header
  const size = parseInt(contentLength, 10);
  return !isNaN(size) && size <= maxSizeBytes;
}
