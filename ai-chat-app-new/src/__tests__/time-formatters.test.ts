/**
 * Time Formatters Tests
 * 時間フォーマット関数のテスト
 */

import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  formatMilliseconds,
  formatLongDuration,
} from '@/utils/time-formatters';

describe('Time Formatters', () => {
  describe('formatDuration', () => {
    it('should format seconds correctly in MM:SS format', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(5)).toBe('00:05');
      expect(formatDuration(59)).toBe('00:59');
      expect(formatDuration(60)).toBe('01:00');
      expect(formatDuration(61)).toBe('01:01');
      expect(formatDuration(125)).toBe('02:05');
      expect(formatDuration(342)).toBe('05:42');
      expect(formatDuration(599)).toBe('09:59');
      expect(formatDuration(600)).toBe('10:00');
      expect(formatDuration(3599)).toBe('59:59');
      expect(formatDuration(3600)).toBe('60:00'); // 1 hour displays as 60:00
    });

    it('should handle edge cases', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(1)).toBe('00:01');
      expect(formatDuration(9)).toBe('00:09');
      expect(formatDuration(10)).toBe('00:10');
    });

    it('should pad single digits with zeros', () => {
      const result = formatDuration(65); // 1:05
      expect(result).toBe('01:05');
      expect(result.length).toBe(5);
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('formatMilliseconds', () => {
    it('should convert milliseconds to MM:SS format', () => {
      expect(formatMilliseconds(0)).toBe('00:00');
      expect(formatMilliseconds(1000)).toBe('00:01');
      expect(formatMilliseconds(5000)).toBe('00:05');
      expect(formatMilliseconds(59000)).toBe('00:59');
      expect(formatMilliseconds(60000)).toBe('01:00');
      expect(formatMilliseconds(125000)).toBe('02:05');
      expect(formatMilliseconds(342000)).toBe('05:42');
    });

    it('should handle fractional seconds by flooring', () => {
      expect(formatMilliseconds(1500)).toBe('00:01'); // 1.5s → 1s
      expect(formatMilliseconds(1999)).toBe('00:01'); // 1.999s → 1s
      expect(formatMilliseconds(2000)).toBe('00:02'); // exactly 2s
      expect(formatMilliseconds(59999)).toBe('00:59'); // 59.999s → 59s
    });

    it('should handle large millisecond values', () => {
      expect(formatMilliseconds(3600000)).toBe('60:00'); // 1 hour
      expect(formatMilliseconds(7200000)).toBe('120:00'); // 2 hours
    });
  });

  describe('formatLongDuration', () => {
    it('should format seconds in HH:MM:SS format', () => {
      expect(formatLongDuration(0)).toBe('00:00:00');
      expect(formatLongDuration(1)).toBe('00:00:01');
      expect(formatLongDuration(59)).toBe('00:00:59');
      expect(formatLongDuration(60)).toBe('00:01:00');
      expect(formatLongDuration(61)).toBe('00:01:01');
      expect(formatLongDuration(3599)).toBe('00:59:59');
      expect(formatLongDuration(3600)).toBe('01:00:00'); // 1 hour
      expect(formatLongDuration(3661)).toBe('01:01:01'); // 1h 1m 1s
    });

    it('should handle durations over 1 hour', () => {
      expect(formatLongDuration(3942)).toBe('01:05:42'); // From JSDoc example
      expect(formatLongDuration(7200)).toBe('02:00:00'); // 2 hours
      expect(formatLongDuration(7261)).toBe('02:01:01'); // 2h 1m 1s
    });

    it('should handle very long durations', () => {
      expect(formatLongDuration(36000)).toBe('10:00:00'); // 10 hours
      expect(formatLongDuration(86400)).toBe('24:00:00'); // 24 hours (1 day)
      expect(formatLongDuration(90061)).toBe('25:01:01'); // 25h 1m 1s
    });

    it('should pad all components with zeros', () => {
      const result = formatLongDuration(3665); // 1:01:05
      expect(result).toBe('01:01:05');
      expect(result.length).toBe(8);
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('should handle edge cases', () => {
      expect(formatLongDuration(0)).toBe('00:00:00');
      expect(formatLongDuration(1)).toBe('00:00:01');
      expect(formatLongDuration(60)).toBe('00:01:00');
      expect(formatLongDuration(3600)).toBe('01:00:00');
    });
  });

  describe('Integration and consistency', () => {
    it('should have consistent output formats', () => {
      // All functions should return properly padded strings
      const duration = formatDuration(65);
      const milliseconds = formatMilliseconds(65000);
      const longDuration = formatLongDuration(65);

      expect(duration).toMatch(/^\d{2}:\d{2}$/);
      expect(milliseconds).toMatch(/^\d{2}:\d{2}$/);
      expect(longDuration).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('should handle the same time value consistently across functions', () => {
      const seconds = 342; // 5 minutes 42 seconds

      const shortFormat = formatDuration(seconds);
      const fromMillis = formatMilliseconds(seconds * 1000);
      const longFormat = formatLongDuration(seconds);

      expect(shortFormat).toBe('05:42');
      expect(fromMillis).toBe('05:42');
      expect(longFormat).toBe('00:05:42');

      // Verify that short and milliseconds formats match
      expect(shortFormat).toBe(fromMillis);
    });
  });

  describe('Real-world usage scenarios', () => {
    it('should format typical voice call durations', () => {
      expect(formatDuration(30)).toBe('00:30'); // 30 seconds
      expect(formatDuration(180)).toBe('03:00'); // 3 minutes
      expect(formatDuration(600)).toBe('10:00'); // 10 minutes
      expect(formatLongDuration(3600)).toBe('01:00:00'); // 1 hour call
    });

    it('should format typical audio/video playback times', () => {
      expect(formatMilliseconds(30000)).toBe('00:30'); // 30s video
      expect(formatMilliseconds(180000)).toBe('03:00'); // 3min song
      expect(formatLongDuration(7200)).toBe('02:00:00'); // 2h movie
    });

    it('should format session/conversation durations', () => {
      expect(formatLongDuration(1800)).toBe('00:30:00'); // 30min session
      expect(formatLongDuration(5400)).toBe('01:30:00'); // 1.5h session
      expect(formatLongDuration(10800)).toBe('03:00:00'); // 3h session
    });
  });
});
