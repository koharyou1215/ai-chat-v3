// src/types/storage/indexeddb.types.ts

/**
 * IndexedDB Type Definitions for AI Chat V3
 *
 * Defines the schema for IndexedDB storage used for session persistence,
 * memory cards, and memory layers with LZ-String compression.
 */

import type { UnifiedChatSession } from '../core/session.types';
import type { MemoryCard, MemoryLayer } from '../core/memory.types';

// Type alias for backward compatibility
export type Session = UnifiedChatSession;

/**
 * Database Version
 */
export const DB_NAME = 'ai-chat-v3-db';
export const DB_VERSION = 1;

/**
 * Store Names
 */
export enum StoreNames {
  SESSIONS = 'sessions',
  MEMORY_CARDS = 'memoryCards',
  MEMORY_LAYERS = 'memoryLayers',
  METADATA = 'metadata',
}

/**
 * Compressed Data Wrapper
 *
 * Stores compressed data along with metadata for optimization
 */
export interface CompressedData<T = unknown> {
  /** Unique identifier */
  id: string;

  /** LZ-compressed JSON string */
  data: string;

  /** Original uncompressed size in bytes */
  uncompressedSize: number;

  /** Compressed size in bytes */
  compressedSize: number;

  /** Compression ratio (0-1, higher = better compression) */
  compressionRatio: number;

  /** Last accessed timestamp for LRU cache */
  lastAccessed: number;

  /** Schema version for future migrations */
  version: number;

  /** Type tag for runtime type checking */
  type: string;
}

/**
 * Compressed Session
 */
export interface CompressedSession extends CompressedData<Session> {
  type: 'session';

  /** Character ID (for indexing) */
  characterId: string;

  /** Updated timestamp (for indexing) */
  updatedAt: number;

  /** Created timestamp (for indexing) */
  createdAt: number;
}

/**
 * Compressed Memory Card
 */
export interface CompressedMemoryCard extends CompressedData<MemoryCard> {
  type: 'memory-card';

  /** Session ID (for indexing) */
  sessionId: string;

  /** Timestamp (for indexing) */
  timestamp: number;

  /** Card type (for filtering) */
  cardType: string;
}

/**
 * Compressed Memory Layer
 */
export interface CompressedMemoryLayer extends CompressedData<MemoryLayer> {
  type: 'memory-layer';

  /** Session ID (for indexing) */
  sessionId: string;

  /** Layer depth (for indexing) */
  depth: number;
}

/**
 * Metadata Store Value
 */
export type MetadataValue = string | number | boolean | object;

/**
 * Database Schema Definition
 */
export interface AIChatV3DBSchema {
  version: typeof DB_VERSION;
  stores: {
    [StoreNames.SESSIONS]: {
      key: string; // session_id
      value: CompressedSession;
      indexes: {
        'by-updated': number;
        'by-character': string;
        'by-created': number;
      };
    };
    [StoreNames.MEMORY_CARDS]: {
      key: string; // card_id
      value: CompressedMemoryCard;
      indexes: {
        'by-session': string;
        'by-timestamp': number;
        'by-type': string;
      };
    };
    [StoreNames.MEMORY_LAYERS]: {
      key: string; // layer_id
      value: CompressedMemoryLayer;
      indexes: {
        'by-session': string;
        'by-depth': number;
      };
    };
    [StoreNames.METADATA]: {
      key: string;
      value: MetadataValue;
    };
  };
}

/**
 * Storage Configuration
 */
export interface StorageConfig {
  /** IndexedDB is supported in current environment */
  indexedDBSupported: boolean;

  /** Maximum IndexedDB size in MB */
  maxIndexedDBSize: number;

  /** Maximum localStorage size in MB */
  maxLocalStorageSize: number;

  /** Number of items to keep in memory cache */
  cacheSize: number;

  /** Enable compression for storage */
  compressionEnabled: boolean;

  /** Enable detailed logging */
  debugMode: boolean;
}

/**
 * Storage Metrics
 */
export interface StorageMetrics {
  /** Total items stored */
  totalItems: number;

  /** Total compressed size in bytes */
  compressedSize: number;

  /** Total uncompressed size in bytes */
  uncompressedSize: number;

  /** Average compression ratio */
  averageCompressionRatio: number;

  /** Storage usage percentage (0-100) */
  usagePercentage: number;

  /** Available space in bytes */
  availableSpace: number;
}

/**
 * Index Definitions for IndexedDB
 */
export interface IndexDefinition {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
}

export const SESSION_INDEXES: IndexDefinition[] = [
  { name: 'by-updated', keyPath: 'updatedAt' },
  { name: 'by-character', keyPath: 'characterId' },
  { name: 'by-created', keyPath: 'createdAt' },
];

export const MEMORY_CARD_INDEXES: IndexDefinition[] = [
  { name: 'by-session', keyPath: 'sessionId' },
  { name: 'by-timestamp', keyPath: 'timestamp' },
  { name: 'by-type', keyPath: 'cardType' },
];

export const MEMORY_LAYER_INDEXES: IndexDefinition[] = [
  { name: 'by-session', keyPath: 'sessionId' },
  { name: 'by-depth', keyPath: 'depth' },
];

/**
 * Query Options
 */
export interface QueryOptions {
  /** Index to use for query */
  index?: string;

  /** Key range for query */
  range?: IDBKeyRange;

  /** Maximum number of results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Sort direction */
  direction?: 'next' | 'prev';
}

/**
 * Transaction Options
 */
export interface TransactionOptions {
  /** Transaction mode */
  mode?: IDBTransactionMode;

  /** Durability hint */
  durability?: 'default' | 'strict' | 'relaxed';
}
