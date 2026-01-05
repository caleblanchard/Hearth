/**
 * Centralized logging utility
 * 
 * In production, consider integrating with:
 * - Sentry for error tracking
 * - Datadog/New Relic for APM
 * - CloudWatch/Loggly for log aggregation
 * 
 * This logger sanitizes sensitive data and only outputs to console in development.
 * In production, logs should be captured by process managers or log aggregation services.
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

// Sensitive fields that should be redacted in logs
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'pin',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
  'session',
];

/**
 * Sanitize log context to remove sensitive information
 */
function sanitizeContext(context?: LogContext): LogContext {
  if (!context) return {};
  
  const sanitized: LogContext = {};
  
  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field => lowerKey.includes(field));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      sanitized[key] = sanitizeContext(value as LogContext);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Log an error message
   * Always logs errors, even in production
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const sanitizedContext = sanitizeContext(context);
    const logData: any = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...sanitizedContext,
    };

    if (error instanceof Error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      };
    } else if (error) {
      logData.error = error;
    }

    // In production, write to stderr (captured by process managers)
    // In development, use console.error for better formatting
    if (this.isProduction) {
      process.stderr.write(JSON.stringify(logData) + '\n');
    } else {
      console.error(JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    const sanitizedContext = sanitizeContext(context);
    const logData = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...sanitizedContext,
    };

    if (this.isProduction) {
      process.stderr.write(JSON.stringify(logData) + '\n');
    } else {
      console.warn(JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Log an info message
   * Only logs in development or if explicitly enabled
   */
  info(message: string, context?: LogContext): void {
    const sanitizedContext = sanitizeContext(context);
    const logData = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...sanitizedContext,
    };

    // Only log info in development or if LOG_LEVEL includes info
    if (this.isDevelopment || process.env.LOG_LEVEL === 'info' || process.env.LOG_LEVEL === 'debug') {
      if (this.isProduction) {
        process.stdout.write(JSON.stringify(logData) + '\n');
      } else {
        console.info(JSON.stringify(logData, null, 2));
      }
    }
  }

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment || process.env.LOG_LEVEL === 'debug') {
      const sanitizedContext = sanitizeContext(context);
      const logData = {
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        ...sanitizedContext,
      };
      
      if (this.isProduction) {
        process.stdout.write(JSON.stringify(logData) + '\n');
      } else {
        console.debug(JSON.stringify(logData, null, 2));
      }
    }
  }
}

// Export singleton instance
export const logger = new Logger();
