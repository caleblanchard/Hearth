/**
 * Centralized logging utility
 * 
 * In production, consider integrating with:
 * - Sentry for error tracking
 * - Datadog/New Relic for APM
 * - CloudWatch/Loggly for log aggregation
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Log an error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const logData: any = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...context,
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

    console.error(JSON.stringify(logData));
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    const logData = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };

    console.warn(JSON.stringify(logData));
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    const logData = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };

    if (this.isDevelopment) {
      console.info(JSON.stringify(logData));
    }
  }

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      const logData = {
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        ...context,
      };
      console.debug(JSON.stringify(logData));
    }
  }
}

// Export singleton instance
export const logger = new Logger();
