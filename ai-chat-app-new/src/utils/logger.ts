/**
 * Environment-based Logger Utility
 * Controls console output based on environment variables
 *
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.info('Message');
 *   logger.warn('Warning');
 *   logger.error('Error');
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  timestamp: boolean;
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;

  constructor() {
    this.config = {
      enabled: this.isLoggingEnabled(),
      level: this.getLogLevel(),
      timestamp: process.env.NEXT_PUBLIC_LOG_TIMESTAMP === 'true',
      prefix: process.env.NEXT_PUBLIC_LOG_PREFIX,
    };
  }

  private isLoggingEnabled(): boolean {
    // Development mode: always enabled
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    // Production mode: controlled by environment variable
    return process.env.NEXT_PUBLIC_ENABLE_LOGGING === 'true';
  }

  private getLogLevel(): LogLevel {
    const level = process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel;
    return level || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;

    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.config.level];
  }

  private formatMessage(level: LogLevel, ...args: unknown[]): unknown[] {
    const parts: unknown[] = [];

    if (this.config.timestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    if (this.config.prefix) {
      parts.push(`[${this.config.prefix}]`);
    }

    parts.push(`[${level.toUpperCase()}]`);
    parts.push(...args);

    return parts;
  }

  /**
   * Debug level logging (development only)
   */
  debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.log(...this.formatMessage('debug', ...args));
    }
  }

  /**
   * Info level logging
   */
  info(...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(...this.formatMessage('info', ...args));
    }
  }

  /**
   * Warning level logging
   */
  warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatMessage('warn', ...args));
    }
  }

  /**
   * Error level logging (always enabled)
   */
  error(...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(...this.formatMessage('error', ...args));
    }
  }

  /**
   * Group logging (development only)
   */
  group(label: string): void {
    if (this.config.enabled && process.env.NODE_ENV === 'development') {
      console.group(label);
    }
  }

  /**
   * End group logging
   */
  groupEnd(): void {
    if (this.config.enabled && process.env.NODE_ENV === 'development') {
      console.groupEnd();
    }
  }

  /**
   * Table logging (development only)
   */
  table(data: unknown): void {
    if (this.config.enabled && process.env.NODE_ENV === 'development') {
      console.table(data);
    }
  }

  /**
   * Direct console.log passthrough (for migration compatibility)
   * Use sparingly - prefer typed methods above
   */
  log(...args: unknown[]): void {
    if (this.config.enabled) {
      console.log(...args);
    }
  }
}

// Singleton instance
export const logger = new Logger();

// Export type for external use
export type { LogLevel, LoggerConfig };
