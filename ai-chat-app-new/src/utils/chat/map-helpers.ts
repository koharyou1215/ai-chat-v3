/**
 * Map操作ヘルパーユーティリティ
 * Map/Record型の安全な操作を提供
 */

import { UnifiedChatSession, UnifiedMessage } from '@/types';

/**
 * MapまたはRecordから安全に値を取得
 */
export function getSessionSafely<T = UnifiedChatSession>(
  sessions: Map<string, T> | Record<string, T> | undefined,
  sessionId: string
): T | undefined {
  if (!sessions || !sessionId) {
    return undefined;
  }

  if (sessions instanceof Map) {
    return sessions.get(sessionId);
  }

  return sessions[sessionId];
}

/**
 * MapまたはRecordを安全にMapに変換
 */
export function createMapSafely<K = string, V = any>(
  source: Map<K, V> | Record<string, V> | undefined
): Map<K, V> {
  if (!source) {
    return new Map<K, V>();
  }

  if (source instanceof Map) {
    return new Map(source);
  }

  // RecordからMapへの変換
  const entries = Object.entries(source) as [K, V][];
  return new Map<K, V>(entries);
}

/**
 * Map/Recordから安全に値を削除
 */
export function deleteFromMapSafely<T>(
  collection: Map<string, T> | Record<string, T>,
  key: string
): Map<string, T> | Record<string, T> {
  if (collection instanceof Map) {
    const newMap = new Map(collection);
    newMap.delete(key);
    return newMap;
  }

  const { [key]: _, ...rest } = collection;
  return rest;
}

/**
 * Map/Recordに安全に値を設定
 */
export function setInMapSafely<T>(
  collection: Map<string, T> | Record<string, T>,
  key: string,
  value: T
): Map<string, T> | Record<string, T> {
  if (collection instanceof Map) {
    const newMap = new Map(collection);
    newMap.set(key, value);
    return newMap;
  }

  return {
    ...collection,
    [key]: value,
  };
}

/**
 * Map/Recordのサイズを取得
 */
export function getMapSize<T>(
  collection: Map<string, T> | Record<string, T> | undefined
): number {
  if (!collection) {
    return 0;
  }

  if (collection instanceof Map) {
    return collection.size;
  }

  return Object.keys(collection).length;
}

/**
 * Map/Recordが空かどうかチェック
 */
export function isMapEmpty<T>(
  collection: Map<string, T> | Record<string, T> | undefined
): boolean {
  return getMapSize(collection) === 0;
}

/**
 * Map/Recordの値を配列として取得
 */
export function getMapValues<T>(
  collection: Map<string, T> | Record<string, T> | undefined
): T[] {
  if (!collection) {
    return [];
  }

  if (collection instanceof Map) {
    return Array.from(collection.values());
  }

  return Object.values(collection);
}

/**
 * Map/Recordのキーを配列として取得
 */
export function getMapKeys<T>(
  collection: Map<string, T> | Record<string, T> | undefined
): string[] {
  if (!collection) {
    return [];
  }

  if (collection instanceof Map) {
    return Array.from(collection.keys());
  }

  return Object.keys(collection);
}

/**
 * セッション内のメッセージを安全に取得
 */
export function getSessionMessages(
  session: UnifiedChatSession | undefined
): UnifiedMessage[] {
  if (!session?.messages) {
    return [];
  }

  if (Array.isArray(session.messages)) {
    return session.messages;
  }

  if (typeof session.messages === 'object' && session.messages !== null && 'size' in session.messages) {
    return Array.from((session.messages as Map<string, UnifiedMessage>).values());
  }

  // Recordの場合
  return Object.values(session.messages);
}

/**
 * Map/Recordをフィルタリング
 */
export function filterMap<T>(
  collection: Map<string, T> | Record<string, T>,
  predicate: (value: T, key: string) => boolean
): Map<string, T> | Record<string, T> {
  if (collection instanceof Map) {
    const filtered = new Map<string, T>();
    collection.forEach((value, key) => {
      if (predicate(value, key)) {
        filtered.set(key, value);
      }
    });
    return filtered;
  }

  const filtered: Record<string, T> = {};
  Object.entries(collection).forEach(([key, value]) => {
    if (predicate(value, key)) {
      filtered[key] = value;
    }
  });
  return filtered;
}

/**
 * Map/Recordをマッピング
 */
export function mapMap<T, U>(
  collection: Map<string, T> | Record<string, T>,
  mapper: (value: T, key: string) => U
): Map<string, U> | Record<string, U> {
  if (collection instanceof Map) {
    const mapped = new Map<string, U>();
    collection.forEach((value, key) => {
      mapped.set(key, mapper(value, key));
    });
    return mapped;
  }

  const mapped: Record<string, U> = {};
  Object.entries(collection).forEach(([key, value]) => {
    mapped[key] = mapper(value, key);
  });
  return mapped;
}

/**
 * Map/Recordの深いクローンを作成
 */
export function deepCloneMap<T>(
  collection: Map<string, T> | Record<string, T>
): Map<string, T> | Record<string, T> {
  const jsonString = JSON.stringify(
    collection instanceof Map 
      ? Object.fromEntries(collection) 
      : collection
  );
  
  const cloned = JSON.parse(jsonString);
  
  if (collection instanceof Map) {
    return new Map(Object.entries(cloned));
  }
  
  return cloned;
}

/**
 * 複数のMap/Recordをマージ
 */
export function mergeMaps<T>(
  ...collections: (Map<string, T> | Record<string, T>)[]
): Map<string, T> {
  const result = new Map<string, T>();
  
  collections.forEach(collection => {
    if (collection instanceof Map) {
      collection.forEach((value, key) => {
        result.set(key, value);
      });
    } else {
      Object.entries(collection).forEach(([key, value]) => {
        result.set(key, value);
      });
    }
  });
  
  return result;
}