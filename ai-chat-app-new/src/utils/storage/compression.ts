// src/utils/storage/compression.ts

/**
 * Storage Compression Utility
 *
 * Provides data compression/decompression using LZ-String for IndexedDB storage.
 * Achieves 50-70% compression ratio for typical JSON data.
 */

import * as LZString from 'lz-string';

export interface CompressionMetrics {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTime: number;
  decompressionTime?: number;
}

export interface CompressResult<T = unknown> {
  compressed: string;
  metrics: CompressionMetrics;
  originalType: string;
}

export interface DecompressResult<T = unknown> {
  data: T;
  metrics: Partial<CompressionMetrics>;
}

/**
 * Storage Compressor
 *
 * Handles compression and decompression of data for storage optimization.
 */
export class StorageCompressor {
  private static instance: StorageCompressor;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): StorageCompressor {
    if (!StorageCompressor.instance) {
      StorageCompressor.instance = new StorageCompressor();
    }
    return StorageCompressor.instance;
  }

  /**
   * Compress data
   *
   * Typical compression ratio: 50-70% size reduction
   * Compression time: ~10-50ms for 10KB, ~100-500ms for 100KB
   *
   * @param data Data to compress
   * @returns Compressed data with metrics
   */
  compress<T>(data: T): CompressResult<T> {
    const startTime = performance.now();

    // Serialize to JSON
    const jsonString = JSON.stringify(data);
    const originalSize = this.calculateByteSize(jsonString);

    // Compress using LZ-String (UTF-16 encoding for IndexedDB compatibility)
    const compressed = LZString.compressToUTF16(jsonString);
    const compressedSize = this.calculateByteSize(compressed);

    const compressionTime = performance.now() - startTime;
    const compressionRatio = 1 - compressedSize / originalSize;

    return {
      compressed,
      metrics: {
        originalSize,
        compressedSize,
        compressionRatio,
        compressionTime,
      },
      originalType: this.getTypeName(data),
    };
  }

  /**
   * Decompress data
   *
   * Decompression time: ~5-20ms for 10KB, ~50-200ms for 100KB
   *
   * @param compressed Compressed string
   * @returns Decompressed data with metrics
   * @throws Error if decompression fails
   */
  decompress<T>(compressed: string): DecompressResult<T> {
    const startTime = performance.now();

    // Decompress
    const jsonString = LZString.decompressFromUTF16(compressed);

    if (!jsonString) {
      throw new Error('Decompression failed - corrupted or invalid data');
    }

    // Parse JSON
    let data: T;
    try {
      data = JSON.parse(jsonString) as T;
    } catch (error) {
      throw new Error(
        `JSON parse failed after decompression: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const decompressionTime = performance.now() - startTime;

    return {
      data,
      metrics: {
        decompressionTime,
      },
    };
  }

  /**
   * Compress batch of items
   *
   * Useful for bulk operations
   */
  compressBatch<T>(items: T[]): Array<CompressResult<T>> {
    return items.map(item => this.compress(item));
  }

  /**
   * Decompress batch of items
   */
  decompressBatch<T>(compressedItems: string[]): Array<DecompressResult<T>> {
    return compressedItems.map(item => this.decompress<T>(item));
  }

  /**
   * Test compression on sample data
   *
   * Useful for determining if compression is beneficial for specific data types
   *
   * @param data Sample data to test
   * @returns Compression metrics
   */
  testCompression<T>(data: T): CompressionMetrics {
    const result = this.compress(data);
    return result.metrics;
  }

  /**
   * Calculate byte size of string
   */
  private calculateByteSize(str: string): number {
    // Use Blob for accurate byte size calculation (handles UTF-16)
    return new Blob([str]).size;
  }

  /**
   * Get type name for debugging
   */
  private getTypeName<T>(data: T): string {
    if (data === null) return 'null';
    if (data === undefined) return 'undefined';
    if (Array.isArray(data)) return 'array';
    return typeof data;
  }

  /**
   * Format metrics for logging
   */
  static formatMetrics(metrics: CompressionMetrics): string {
    const originalKB = (metrics.originalSize / 1024).toFixed(2);
    const compressedKB = (metrics.compressedSize / 1024).toFixed(2);
    const ratio = (metrics.compressionRatio * 100).toFixed(1);
    const time = metrics.compressionTime.toFixed(2);

    return `${originalKB}KB → ${compressedKB}KB (${ratio}% reduction, ${time}ms)`;
  }
}

/**
 * Convenience functions for common use cases
 */

export const compressor = StorageCompressor.getInstance();

export function compress<T>(data: T): CompressResult<T> {
  return compressor.compress(data);
}

export function decompress<T>(compressed: string): DecompressResult<T> {
  return compressor.decompress(compressed);
}

export function testCompression<T>(data: T): CompressionMetrics {
  return compressor.testCompression(data);
}
