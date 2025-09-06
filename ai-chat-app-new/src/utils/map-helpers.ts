/**
 * Map/Set永続化ヘルパー
 * 
 * 問題: ZustandとlocalStorageがMapをObjectとして永続化し、
 * 復元時に型が不一致になることがある
 * 
 * 解決: Map/Object両対応の安全な操作ヘルパーを提供
 */

/**
 * 安全にMapを作成（MapまたはObjectから）
 */
export function safeCreateMap<K extends string | number, V>(
  data: Map<K, V> | Record<K, V> | undefined | null
): Map<K, V> {
  if (!data) return new Map<K, V>();
  
  if (data instanceof Map) {
    return new Map(data);
  }
  
  if (typeof data === 'object') {
    return new Map(Object.entries(data) as [K, V][]);
  }
  
  return new Map<K, V>();
}

/**
 * 安全にMapから値を取得
 */
export function safeMapGet<K extends string | number, V>(
  mapOrObject: Map<K, V> | Record<K, V> | undefined | null,
  key: K
): V | undefined {
  if (!mapOrObject) return undefined;
  
  if (mapOrObject instanceof Map) {
    return mapOrObject.get(key);
  }
  
  if (typeof mapOrObject === 'object') {
    return (mapOrObject as Record<K, V>)[key];
  }
  
  return undefined;
}

/**
 * 安全にMapに値を設定（イミュータブル）
 */
export function safeMapSet<K extends string | number, V>(
  mapOrObject: Map<K, V> | Record<K, V> | undefined | null,
  key: K,
  value: V
): Map<K, V> {
  const map = safeCreateMap(mapOrObject);
  return new Map(map).set(key, value);
}

/**
 * 安全にMapから値を削除（イミュータブル）
 */
export function safeMapDelete<K extends string | number, V>(
  mapOrObject: Map<K, V> | Record<K, V> | undefined | null,
  key: K
): Map<K, V> {
  const map = safeCreateMap(mapOrObject);
  const newMap = new Map(map);
  newMap.delete(key);
  return newMap;
}

/**
 * 安全にMapのキー存在確認
 */
export function safeMapHas<K extends string | number, V>(
  mapOrObject: Map<K, V> | Record<K, V> | undefined | null,
  key: K
): boolean {
  if (!mapOrObject) return false;
  
  if (mapOrObject instanceof Map) {
    return mapOrObject.has(key);
  }
  
  if (typeof mapOrObject === 'object') {
    return key in mapOrObject;
  }
  
  return false;
}

/**
 * 安全にMapのサイズを取得
 */
export function safeMapSize<K extends string | number, V>(
  mapOrObject: Map<K, V> | Record<K, V> | undefined | null
): number {
  if (!mapOrObject) return 0;
  
  if (mapOrObject instanceof Map) {
    return mapOrObject.size;
  }
  
  if (typeof mapOrObject === 'object') {
    return Object.keys(mapOrObject).length;
  }
  
  return 0;
}

/**
 * 安全にMapを配列に変換
 */
export function safeMapToArray<K extends string | number, V>(
  mapOrObject: Map<K, V> | Record<K, V> | undefined | null
): [K, V][] {
  if (!mapOrObject) return [];
  
  if (mapOrObject instanceof Map) {
    return Array.from(mapOrObject.entries());
  }
  
  if (typeof mapOrObject === 'object') {
    return Object.entries(mapOrObject) as [K, V][];
  }
  
  return [];
}

/**
 * 安全にMapの値を配列で取得
 */
export function safeMapValues<K extends string | number, V>(
  mapOrObject: Map<K, V> | Record<K, V> | undefined | null
): V[] {
  if (!mapOrObject) return [];
  
  if (mapOrObject instanceof Map) {
    return Array.from(mapOrObject.values());
  }
  
  if (typeof mapOrObject === 'object') {
    return Object.values(mapOrObject);
  }
  
  return [];
}

/**
 * 安全にMapのキーを配列で取得
 */
export function safeMapKeys<K extends string | number, V>(
  mapOrObject: Map<K, V> | Record<K, V> | undefined | null
): K[] {
  if (!mapOrObject) return [];
  
  if (mapOrObject instanceof Map) {
    return Array.from(mapOrObject.keys());
  }
  
  if (typeof mapOrObject === 'object') {
    return Object.keys(mapOrObject) as K[];
  }
  
  return [];
}

/**
 * Map永続化用シリアライザー
 */
export function serializeMap<K extends string | number, V>(
  map: Map<K, V> | undefined | null
): Record<K, V> | null {
  if (!map || map.size === 0) return null;
  
  const obj: Record<K, V> = {} as Record<K, V>;
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

/**
 * Set永続化用ヘルパー
 */
export function safeCreateSet<T>(
  data: Set<T> | T[] | undefined | null
): Set<T> {
  if (!data) return new Set<T>();
  
  if (data instanceof Set) {
    return new Set(data);
  }
  
  if (Array.isArray(data)) {
    return new Set(data);
  }
  
  return new Set<T>();
}

/**
 * Set永続化用シリアライザー
 */
export function serializeSet<T>(
  set: Set<T> | undefined | null
): T[] | null {
  if (!set || set.size === 0) return null;
  return Array.from(set);
}

/**
 * メモ化されたJSON.parse
 */
const parseCache = new WeakMap<object, any>();
export function memoizedJsonParse<T>(text: string): T {
  const key = { text };
  if (parseCache.has(key)) {
    return parseCache.get(key);
  }
  
  try {
    const result = JSON.parse(text);
    parseCache.set(key, result);
    return result;
  } catch (error) {
    console.error('JSON parse error:', error);
    throw error;
  }
}

/**
 * メモ化されたJSON.stringify
 */
const stringifyCache = new WeakMap<object, string>();
export function memoizedJsonStringify(obj: any): string {
  if (stringifyCache.has(obj)) {
    return stringifyCache.get(obj)!;
  }
  
  try {
    const result = JSON.stringify(obj);
    stringifyCache.set(obj, result);
    return result;
  } catch (error) {
    console.error('JSON stringify error:', error);
    throw error;
  }
}