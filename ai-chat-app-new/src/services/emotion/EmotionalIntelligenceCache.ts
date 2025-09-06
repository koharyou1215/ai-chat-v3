// 💾 感情知能キャッシュシステム - 高性能戦略的キャッシング
// 設計文書の「戦略的キャッシュシステム強化」に基づく実装

import { 
  EmotionalWeight, 
  ConversationalContext,
  EmotionCacheEntry,
  ContextCacheEntry
} from '@/types/core/emotional-intelligence.types';
import { UnifiedMessage, Character } from '@/types';

/**
 * 感情知能インテリジェントキャッシュシステム
 * - LRUキャッシュによる効率的なメモリ管理
 * - 類似性検索による高速感情取得
 * - 戦略的プリロード機能
 */
export class EmotionalIntelligenceCache {
  private emotionCache: Map<string, EmotionCacheEntry> = new Map();
  private contextCache: Map<string, ContextCacheEntry> = new Map();
  private promptCache: Map<string, string> = new Map();
  
  // キャッシュ設定
  private readonly maxEmotionCacheSize: number;
  private readonly maxContextCacheSize: number;
  private readonly maxPromptCacheSize: number;
  private readonly cacheTTL: number; // Time To Live in milliseconds

  // 統計情報
  private stats = {
    emotionHits: 0,
    emotionMisses: 0,
    contextHits: 0,
    contextMisses: 0,
    promptHits: 0,
    promptMisses: 0,
    totalEvictions: 0
  };

  constructor(
    maxEmotionCache = 200,
    maxContextCache = 100,
    maxPromptCache = 50,
    cacheTTLHours = 24
  ) {
    this.maxEmotionCacheSize = maxEmotionCache;
    this.maxContextCacheSize = maxContextCache;
    this.maxPromptCacheSize = maxPromptCache;
    this.cacheTTL = cacheTTLHours * 60 * 60 * 1000; // ミリ秒に変換

    this.initializeCache();
  }

  /**
   * 感情分析結果を取得またはキャッシュ
   * @param content メッセージ内容
   * @param context 会話文脈
   * @returns キャッシュされた感情または null
   */
  async getOrAnalyzeEmotion(
    content: string,
    context: string[]
  ): Promise<EmotionalWeight | null> {
    const cacheKey = this.generateEmotionCacheKey(content, context);

    // 1. キャッシュヒット確認
    const cached = this.emotionCache.get(cacheKey);
    if (cached && this.isValidCacheEntry(cached.timestamp)) {
      // ヒット統計更新
      this.stats.emotionHits++;
      cached.hitCount++;
      
      console.log('💾✅ Emotion cache hit:', cacheKey.substring(0, 50) + '...');
      return cached.emotion;
    }

    // 2. 類似コンテンツのキャッシュ検索
    const similarEmotion = this.findSimilarCachedEmotion(content);
    if (similarEmotion && similarEmotion.similarity > 0.8) {
      console.log('💾🔍 Similar emotion cache hit:', similarEmotion.similarity);
      this.stats.emotionHits++;
      return similarEmotion.emotion;
    }

    // 3. キャッシュミス
    this.stats.emotionMisses++;
    console.log('💾❌ Emotion cache miss for:', cacheKey.substring(0, 50) + '...');
    return null;
  }

  /**
   * 感情分析結果をキャッシュに保存
   */
  cacheEmotion(content: string, context: string[], emotion: EmotionalWeight): void {
    const cacheKey = this.generateEmotionCacheKey(content, context);
    
    const entry: EmotionCacheEntry = {
      key: cacheKey,
      emotion,
      timestamp: new Date().toISOString(),
      hitCount: 0,
      similarity: 1.0
    };

    this.emotionCache.set(cacheKey, entry);
    
    // キャッシュサイズ管理
    this.maintainEmotionCacheSize();
    
    console.log('💾💿 Emotion cached:', cacheKey.substring(0, 50) + '...');
  }

  /**
   * 文脈情報をキャッシュから取得
   */
  getCachedContext(
    characters: Character[],
    recentMessages: UnifiedMessage[]
  ): ConversationalContext | null {
    const cacheKey = this.generateContextCacheKey(characters, recentMessages);
    
    const cached = this.contextCache.get(cacheKey);
    if (cached && this.isValidCacheEntry(cached.timestamp)) {
      this.stats.contextHits++;
      console.log('💾✅ Context cache hit');
      return cached.context;
    }

    this.stats.contextMisses++;
    return null;
  }

  /**
   * 文脈情報をキャッシュに保存
   */
  cacheContext(
    characters: Character[],
    recentMessages: UnifiedMessage[],
    context: ConversationalContext
  ): void {
    const cacheKey = this.generateContextCacheKey(characters, recentMessages);
    
    const entry: ContextCacheEntry = {
      key: cacheKey,
      context,
      timestamp: new Date().toISOString(),
      relevanceScore: 1.0
    };

    this.contextCache.set(cacheKey, entry);
    this.maintainContextCacheSize();
    
    console.log('💾💿 Context cached');
  }

  /**
   * プロンプトキャッシュから取得
   */
  async getCachedContextualPrompt(
    character: Character,
    recentContext: ConversationalContext
  ): Promise<string | null> {
    const contextSignature = this.generateContextSignature(character, recentContext);
    
    const cached = this.promptCache.get(contextSignature);
    if (cached) {
      this.stats.promptHits++;
      console.log('💾✅ Prompt cache hit');
      return cached;
    }

    this.stats.promptMisses++;
    return null;
  }

  /**
   * プロンプトをキャッシュに保存
   */
  cachePrompt(
    character: Character,
    context: ConversationalContext,
    prompt: string
  ): void {
    const contextSignature = this.generateContextSignature(character, context);
    
    this.promptCache.set(contextSignature, prompt);
    this.maintainPromptCacheSize();
    
    console.log('💾💿 Prompt cached');
  }

  // ======================== プライベートメソッド ========================

  /**
   * 感情キャッシュキーを生成
   */
  private generateEmotionCacheKey(content: string, context: string[]): string {
    // コンテンツと文脈のハッシュを生成
    const contentHash = this.simpleHash(content);
    const contextHash = this.simpleHash(context.join('|'));
    return `emotion_${contentHash}_${contextHash}`;
  }

  /**
   * 文脈キャッシュキーを生成
   */
  private generateContextCacheKey(
    characters: Character[],
    recentMessages: UnifiedMessage[]
  ): string {
    const characterIds = characters.map(c => c.id).sort().join('|');
    const messageIds = recentMessages.slice(-5).map(m => m.id).join('|');
    return `context_${this.simpleHash(characterIds)}_${this.simpleHash(messageIds)}`;
  }

  /**
   * プロンプト用文脈署名を生成
   */
  private generateContextSignature(
    character: Character,
    context: ConversationalContext
  ): string {
    const elements = [
      character.id,
      character.personality?.substring(0, 100) || '',
      context.conversationPhase,
      context.messageCount.toString(),
      context.sessionType
    ];
    
    return `prompt_${this.simpleHash(elements.join('|'))}`;
  }

  /**
   * 類似した感情キャッシュエントリを検索
   */
  private findSimilarCachedEmotion(content: string): 
    { emotion: EmotionalWeight; similarity: number } | null {
    
    let bestMatch: { emotion: EmotionalWeight; similarity: number } | null = null;
    let maxSimilarity = 0;

    for (const [key, entry] of this.emotionCache) {
      // 簡易的な類似度計算（実際はより高度なアルゴリズムを使用）
      const similarity = this.calculateTextSimilarity(
        content,
        key.split('_')[1] // キーからコンテンツハッシュを取得
      );

      if (similarity > maxSimilarity && similarity > 0.7) {
        maxSimilarity = similarity;
        bestMatch = {
          emotion: entry.emotion,
          similarity
        };
      }
    }

    return bestMatch;
  }

  /**
   * テキスト類似度を計算（簡易版）
   */
  private calculateTextSimilarity(text1: string, hash2: string): number {
    // 実際の実装では、より高度な類似度計算を行う
    // ここでは簡易的な実装
    const hash1 = this.simpleHash(text1);
    
    // ハッシュベースの簡易類似度
    let matches = 0;
    const len = Math.min(hash1.length, hash2.length);
    
    for (let i = 0; i < len; i++) {
      if (hash1[i] === hash2[i]) {
        matches++;
      }
    }
    
    return matches / Math.max(hash1.length, hash2.length);
  }

  /**
   * 簡易ハッシュ関数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * キャッシュエントリの有効性チェック
   */
  private isValidCacheEntry(timestamp: string): boolean {
    const entryTime = new Date(timestamp).getTime();
    const now = new Date().getTime();
    return (now - entryTime) < this.cacheTTL;
  }

  /**
   * 感情キャッシュサイズ管理（LRU）
   */
  private maintainEmotionCacheSize(): void {
    if (this.emotionCache.size <= this.maxEmotionCacheSize) return;

    // 最も使用頻度の低いエントリを削除
    let lruKey: string | null = null;
    let lruHitCount = Infinity;
    let oldestTime = Infinity;

    for (const [key, entry] of this.emotionCache) {
      const entryTime = new Date(entry.timestamp).getTime();
      
      // 期限切れエントリを優先削除
      if (!this.isValidCacheEntry(entry.timestamp)) {
        lruKey = key;
        break;
      }
      
      // 使用頻度とアクセス時間を考慮
      if (entry.hitCount < lruHitCount || 
          (entry.hitCount === lruHitCount && entryTime < oldestTime)) {
        lruKey = key;
        lruHitCount = entry.hitCount;
        oldestTime = entryTime;
      }
    }

    if (lruKey) {
      this.emotionCache.delete(lruKey);
      this.stats.totalEvictions++;
      console.log('💾🗑️ Evicted emotion cache entry:', lruKey.substring(0, 30) + '...');
    }
  }

  /**
   * 文脈キャッシュサイズ管理
   */
  private maintainContextCacheSize(): void {
    if (this.contextCache.size <= this.maxContextCacheSize) return;

    // 最も古いエントリを削除
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.contextCache) {
      const entryTime = new Date(entry.timestamp).getTime();
      if (entryTime < oldestTime) {
        oldestTime = entryTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.contextCache.delete(oldestKey);
      this.stats.totalEvictions++;
      console.log('💾🗑️ Evicted context cache entry');
    }
  }

  /**
   * プロンプトキャッシュサイズ管理
   */
  private maintainPromptCacheSize(): void {
    if (this.promptCache.size <= this.maxPromptCacheSize) return;

    // ランダムに古いエントリを削除（簡易実装）
    const keys = Array.from(this.promptCache.keys());
    const keyToDelete = keys[0];
    
    this.promptCache.delete(keyToDelete);
    this.stats.totalEvictions++;
    console.log('💾🗑️ Evicted prompt cache entry');
  }

  /**
   * キャッシュ初期化
   */
  private initializeCache(): void {
    console.log('💾 Emotional Intelligence Cache initialized:', {
      maxEmotionCache: this.maxEmotionCacheSize,
      maxContextCache: this.maxContextCacheSize,
      maxPromptCache: this.maxPromptCacheSize,
      cacheTTL: this.cacheTTL / (1000 * 60 * 60) + ' hours'
    });

    // 定期的なキャッシュクリーンアップ
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 300000); // 5分間隔
  }

  /**
   * 期限切れエントリのクリーンアップ
   */
  private cleanupExpiredEntries(): void {
    let cleanedCount = 0;

    // 感情キャッシュのクリーンアップ
    for (const [key, entry] of this.emotionCache) {
      if (!this.isValidCacheEntry(entry.timestamp)) {
        this.emotionCache.delete(key);
        cleanedCount++;
      }
    }

    // 文脈キャッシュのクリーンアップ
    for (const [key, entry] of this.contextCache) {
      if (!this.isValidCacheEntry(entry.timestamp)) {
        this.contextCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`💾🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  // ======================== パブリックメソッド ========================

  /**
   * キャッシュ統計情報を取得
   */
  getStats() {
    const emotionHitRate = this.stats.emotionHits / 
      (this.stats.emotionHits + this.stats.emotionMisses) || 0;
    const contextHitRate = this.stats.contextHits / 
      (this.stats.contextHits + this.stats.contextMisses) || 0;
    const promptHitRate = this.stats.promptHits / 
      (this.stats.promptHits + this.stats.promptMisses) || 0;

    return {
      // ヒット率
      emotionHitRate: Math.round(emotionHitRate * 100),
      contextHitRate: Math.round(contextHitRate * 100),
      promptHitRate: Math.round(promptHitRate * 100),
      
      // キャッシュサイズ
      emotionCacheSize: this.emotionCache.size,
      contextCacheSize: this.contextCache.size,
      promptCacheSize: this.promptCache.size,
      
      // 統計
      ...this.stats
    };
  }

  /**
   * キャッシュをクリア
   */
  clearCache(type?: 'emotion' | 'context' | 'prompt'): void {
    if (!type) {
      // 全キャッシュクリア
      this.emotionCache.clear();
      this.contextCache.clear();
      this.promptCache.clear();
      console.log('💾🧹 All caches cleared');
    } else {
      // 指定キャッシュのみクリア
      switch (type) {
        case 'emotion':
          this.emotionCache.clear();
          console.log('💾🧹 Emotion cache cleared');
          break;
        case 'context':
          this.contextCache.clear();
          console.log('💾🧹 Context cache cleared');
          break;
        case 'prompt':
          this.promptCache.clear();
          console.log('💾🧹 Prompt cache cleared');
          break;
      }
    }
  }

  /**
   * キャッシュ設定を更新
   */
  updateCacheSettings(settings: {
    maxEmotionCache?: number;
    maxContextCache?: number;
    maxPromptCache?: number;
  }): void {
    if (settings.maxEmotionCache) {
      (this as any).maxEmotionCacheSize = settings.maxEmotionCache;
      this.maintainEmotionCacheSize();
    }
    
    if (settings.maxContextCache) {
      (this as any).maxContextCacheSize = settings.maxContextCache;
      this.maintainContextCacheSize();
    }
    
    if (settings.maxPromptCache) {
      (this as any).maxPromptCacheSize = settings.maxPromptCache;
      this.maintainPromptCacheSize();
    }

    console.log('💾⚙️ Cache settings updated:', settings);
  }
}