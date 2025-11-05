/**
 * Time Formatting Utilities
 *
 * Shared utility functions for formatting time values across the application.
 * Extracted from duplicate implementations in voice call components.
 *
 * @module utils/time-formatters
 */

/**
 * Format seconds into MM:SS format
 *
 * @param seconds - The number of seconds to format
 * @returns Formatted time string in MM:SS format (e.g., "05:42")
 *
 * @example
 * ```typescript
 * formatDuration(342); // Returns "05:42"
 * formatDuration(59);  // Returns "00:59"
 * formatDuration(0);   // Returns "00:00"
 * ```
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format milliseconds into MM:SS format
 *
 * @param milliseconds - The number of milliseconds to format
 * @returns Formatted time string in MM:SS format
 *
 * @example
 * ```typescript
 * formatMilliseconds(342000); // Returns "05:42"
 * formatMilliseconds(59000);  // Returns "00:59"
 * ```
 */
export const formatMilliseconds = (milliseconds: number): string => {
  return formatDuration(Math.floor(milliseconds / 1000));
};

/**
 * Format seconds into HH:MM:SS format for longer durations
 *
 * @param seconds - The number of seconds to format
 * @returns Formatted time string in HH:MM:SS format (e.g., "01:05:42")
 *
 * @example
 * ```typescript
 * formatLongDuration(3942); // Returns "01:05:42"
 * formatLongDuration(59);   // Returns "00:00:59"
 * ```
 */
export const formatLongDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
