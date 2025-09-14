/**
 * MediaCache
 * メディアコンテンツのキャッシュ管理
 * LRU（Least Recently Used）アルゴリズムでキャッシュを管理
 */

interface CacheEntry {
  key: string;
  value: any;
  size: number;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export class MediaCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private currentSize = 0;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number = 50 * 1024 * 1024) {
    // デフォルト50MB
    this.maxSize = maxSize;
  }

  /**
   * キャッシュから値を取得
   */
  public async get(key: string): Promise<any | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // アクセス情報を更新
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.hits++;

    console.log(
      `💾 MediaCache: Hit for ${key} (${entry.accessCount} accesses)`
    );

    return entry.value;
  }

  /**
   * キャッシュに値を設定
   */
  public async set(key: string, value: any): Promise<void> {
    // 値のサイズを推定
    const size = this.estimateSize(value);

    // キャッシュサイズが上限を超える場合は古いエントリを削除
    if (this.currentSize + size > this.maxSize) {
      await this.evict(size);
    }

    // 既存のエントリがある場合は削除
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      this.currentSize -= oldEntry.size;
    }

    // 新しいエントリを追加
    const entry: CacheEntry = {
      key,
      value,
      size,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
    this.currentSize += size;

    console.log(
      `💾 MediaCache: Stored ${key} (${this.formatSize(size)}), ` +
        `total: ${this.formatSize(this.currentSize)}/${this.formatSize(this.maxSize)}`
    );
  }

  /**
   * キャッシュから値を削除
   */
  public async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    this.currentSize -= entry.size;
    this.cache.delete(key);

    console.log(
      `🗑️ MediaCache: Deleted ${key} (${this.formatSize(entry.size)})`
    );

    return true;
  }

  /**
   * キャッシュに値が存在するかを確認
   */
  public has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * LRUアルゴリズムで古いエントリを削除
   */
  private async evict(requiredSize: number): Promise<void> {
    const entries = Array.from(this.cache.values());

    // 最終アクセス時刻でソート（古い順）
    entries.sort((a, b) => a.lastAccessed - b.lastAccessed);

    let freedSize = 0;
    const keysToDelete: string[] = [];

    for (const entry of entries) {
      if (this.currentSize - freedSize + requiredSize <= this.maxSize) {
        break;
      }

      keysToDelete.push(entry.key);
      freedSize += entry.size;
    }

    // エントリを削除
    for (const key of keysToDelete) {
      await this.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(
        `🧹 MediaCache: Evicted ${keysToDelete.length} entries ` +
          `(${this.formatSize(freedSize)})`
      );
    }
  }

  /**
   * データサイズを推定
   */
  private estimateSize(data: any): number {
    if (typeof data === 'string') {
      // Base64エンコードされた画像の場合
      if (data.startsWith('data:image')) {
        // Base64データ部分のサイズを計算
        const base64Start = data.indexOf(',') + 1;
        const base64Length = data.length - base64Start;
        // Base64は元データの約1.33倍のサイズ
        return Math.floor(base64Length * 0.75);
      }
      // 通常の文字列（UTF-8として2バイト/文字で計算）
      return data.length * 2;
    }

    // オブジェクトの場合はJSON文字列化してサイズを推定
    try {
      const json = JSON.stringify(data);
      return json.length * 2;
    } catch {
      // シリアライズできない場合は1KBと仮定
      return 1024;
    }
  }

  /**
   * サイズを人間が読みやすい形式にフォーマット
   */
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * キャッシュの統計を取得
   */
  public getStats(): {
    size: number;
    count: number;
    hits: number;
    misses: number;
    hitRate: number;
    usage: number;
  } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;
    const usage = this.maxSize > 0 ? this.currentSize / this.maxSize : 0;

    return {
      size: this.currentSize,
      count: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      usage,
    };
  }

  /**
   * キャッシュの詳細情報を取得
   */
  public getDetails(): Array<{
    key: string;
    size: number;
    timestamp: number;
    accessCount: number;
    lastAccessed: number;
  }> {
    return Array.from(this.cache.values()).map((entry) => ({
      key: entry.key,
      size: entry.size,
      timestamp: entry.timestamp,
      accessCount: entry.accessCount,
      lastAccessed: entry.lastAccessed,
    }));
  }

  /**
   * 最も頻繁にアクセスされるエントリを取得
   */
  public getMostAccessed(limit: number = 10): Array<{
    key: string;
    accessCount: number;
  }> {
    const entries = Array.from(this.cache.values());
    entries.sort((a, b) => b.accessCount - a.accessCount);

    return entries.slice(0, limit).map((entry) => ({
      key: entry.key,
      accessCount: entry.accessCount,
    }));
  }

  /**
   * 最近アクセスされたエントリを取得
   */
  public getRecentlyAccessed(limit: number = 10): Array<{
    key: string;
    lastAccessed: number;
  }> {
    const entries = Array.from(this.cache.values());
    entries.sort((a, b) => b.lastAccessed - a.lastAccessed);

    return entries.slice(0, limit).map((entry) => ({
      key: entry.key,
      lastAccessed: entry.lastAccessed,
    }));
  }

  /**
   * キャッシュをクリア
   */
  public async clear(): Promise<void> {
    const count = this.cache.size;
    const size = this.currentSize;

    this.cache.clear();
    this.currentSize = 0;

    console.log(
      `🧹 MediaCache: Cleared ${count} entries (${this.formatSize(size)})`
    );
  }

  /**
   * 古いエントリを削除
   */
  public async cleanOldEntries(maxAge: number): Promise<number> {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(
        `🧹 MediaCache: Cleaned ${keysToDelete.length} old entries`
      );
    }

    return keysToDelete.length;
  }

  /**
   * 統計をリセット
   */
  public resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    console.log('📊 MediaCache: Stats reset');
  }
}