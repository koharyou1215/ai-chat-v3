// Inspiration Service v3 - 成功例を基にした改良版
// 返信提案と文章強化機能のためのサービス

import { UnifiedMessage } from "@/types/memory";
import { simpleAPIManagerV2 } from "@/services/simple-api-manager-v2";
import { apiRequestQueue } from "@/services/api-request-queue";
import { APIConfig, Character, Persona } from "@/types";

export interface InspirationSuggestion {
  id: string;
  type: "empathy" | "question" | "topic";
  content: string;
  confidence: number;
}

// Cache entry interface
interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  hitCount: number;
}

/**
 * High-performance API response cache for inspiration service
 * Features:
 * - 15-minute TTL for cached responses
 * - Prompt-based cache keys with hashing
 * - Automatic cleanup of expired entries
 * - Prevention of duplicate API requests
 * - In-memory storage with LRU eviction
 */
class InspirationCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly cacheTTL: number = 15 * 60 * 1000; // 15 minutes in milliseconds
  private readonly maxCacheSize: number = 100; // Maximum cache entries
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Statistics for performance monitoring
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0,
  };

  constructor() {
    this.initializeCleanup();
  }

  /**
   * Get cached response if available and not expired
   */
  get<T>(key: string): T | null {
    this.stats.totalRequests++;

    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      console.log(
        "💾❌ Inspiration cache miss for key:",
        this.truncateKey(key)
      );
      return null;
    }

    // Check if entry is expired
    if (this.isExpired(entry.timestamp)) {
      this.cache.delete(key);
      this.stats.misses++;
      console.log("💾⏰ Expired cache entry removed:", this.truncateKey(key));
      return null;
    }

    // Cache hit
    entry.hitCount++;
    this.stats.hits++;
    console.log("💾✅ Inspiration cache hit:", this.truncateKey(key));
    return entry.data;
  }

  /**
   * Store response in cache
   */
  set<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      hitCount: 0,
    };

    this.cache.set(key, entry);
    this.maintainCacheSize();

    console.log("💾💿 Inspiration response cached:", this.truncateKey(key));
  }

  /**
   * Generate cache key from prompt content
   */
  generateCacheKey(prompt: string, apiConfig?: Partial<APIConfig>): string {
    // Create a hash from the prompt and relevant config options
    const configHash = apiConfig
      ? this.hashObject({
          model: apiConfig.model,
          temperature: apiConfig.temperature,
          max_tokens: apiConfig.max_tokens,
          top_p: apiConfig.top_p,
        })
      : "";

    const promptHash = this.simpleHash(prompt);
    return `inspiration_${promptHash}_${configHash}`;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate =
      this.stats.totalRequests > 0
        ? Math.round((this.stats.hits / this.stats.totalRequests) * 100)
        : 0;

    return {
      ...this.stats,
      hitRate,
      cacheSize: this.cache.size,
      maxSize: this.maxCacheSize,
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    console.log("💾🧹 Inspiration cache cleared");
  }

  /**
   * Clear expired entries and get count
   */
  cleanupExpired(): number {
    let cleanedCount = 0;
    const now = Date.now();

    // Use Array.from to ensure compatibility
    const entries = Array.from(this.cache.entries());

    for (let i = 0; i < entries.length; i++) {
      const [key, entry] = entries[i];
      if (this.isExpired(entry.timestamp, now)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(
        `💾🧹 Cleaned up ${cleanedCount} expired inspiration cache entries`
      );
    }

    return cleanedCount;
  }

  // Private methods

  private initializeCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);

    console.log("💾 Inspiration cache initialized with 15-minute TTL");
  }

  private isExpired(timestamp: number, now: number = Date.now()): boolean {
    return now - timestamp > this.cacheTTL;
  }

  private maintainCacheSize(): void {
    if (this.cache.size <= this.maxCacheSize) return;

    // Find least recently used entry (LRU eviction)
    let lruKey: string | null = null;
    let lruHitCount = Infinity;
    let oldestTime = Infinity;

    // Use Array.from to ensure compatibility
    const entries = Array.from(this.cache.entries());

    for (let i = 0; i < entries.length; i++) {
      const [key, entry] = entries[i];

      // Prioritize expired entries for removal
      if (this.isExpired(entry.timestamp)) {
        lruKey = key;
        break;
      }

      // Find entry with least hits or oldest timestamp
      if (
        entry.hitCount < lruHitCount ||
        (entry.hitCount === lruHitCount && entry.timestamp < oldestTime)
      ) {
        lruKey = key;
        lruHitCount = entry.hitCount;
        oldestTime = entry.timestamp;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
      console.log(
        "💾🗑️ Evicted inspiration cache entry:",
        this.truncateKey(lruKey)
      );
    }
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private hashObject(obj: any): string {
    return this.simpleHash(JSON.stringify(obj));
  }

  private truncateKey(key: string): string {
    return key.length > 50 ? key.substring(0, 50) + "..." : key;
  }
}

export class InspirationService {
  private cache = new InspirationCache();

  /**
   * 返信提案生成 - 3つのアプローチで150文字程度
   */
  async generateReplySuggestions(
    recentMessages: UnifiedMessage[],
    character: Character,
    user: Persona,
    customPrompt?: string,
    isGroupMode: boolean = false,
    apiConfig?: Partial<APIConfig> & { openRouterApiKey?: string }
  ): Promise<InspirationSuggestion[]> {
    const context = this.buildContext(recentMessages, isGroupMode);

    let prompt: string;
    if (customPrompt) {
      // カスタムプロンプトのプレースホルダー置換
      prompt = customPrompt
        .replace(/{{conversation}}/g, context)
        .replace(/{{user}}と{{char}}間の会話履歴/g, context)
        .replace(/会話履歴:/g, `会話履歴:\n${context}`);

      // プレースホルダーが見つからない場合は末尾に追加
      if (prompt === customPrompt) {
        prompt = `${customPrompt}\n\n会話履歴:\n${context}`;
      }
    } else {
      prompt = this.buildReplySuggestionPrompt(
        context,
        character,
        user,
        isGroupMode
      );
    }

    // Check cache first
    const cacheKey = this.cache.generateCacheKey(prompt, apiConfig);
    const cachedResponse = this.cache.get<string>(cacheKey);

    if (cachedResponse) {
      // Parse cached response
      const suggestions = this.parseReplySuggestionsAdvanced(cachedResponse);

      if (suggestions.length > 0) {
        console.log(
          `📥 Using cached reply suggestions (${suggestions.length} items)`
        );
        return suggestions;
      }
    }

    try {
      console.log("📤 返信提案API呼び出し開始");
      console.log(
        `📊 返信提案 max_tokens: ${
          apiConfig?.max_tokens || 2048
        } (設定値を使用)`
      );
      console.log(`🔧 返信提案: AIタブのトグルで自動判定`);

      const response = await apiRequestQueue.enqueueInspirationRequest(
        async () => {
          const result = await simpleAPIManagerV2.generateMessage(
            prompt,
            "返信提案を生成",
            [],
            apiConfig // API設定を渡す（OpenRouterキー等含む）
          );
          console.log(
            "📥 API応答受信（先頭200文字）:",
            result.substring(0, 200)
          );
          return result;
        }
      );

      // Cache the successful response
      this.cache.set(cacheKey, response);

      // 成功例のパース方法を採用
      const suggestions = this.parseReplySuggestionsAdvanced(response);

      if (suggestions.length === 0) {
        console.warn("⚠️ 提案を抽出できませんでした。フォールバックを使用");
        return this.getFallbackSuggestions();
      }

      return suggestions;
    } catch (error) {
      console.error("❌ 返信提案生成エラー:", error);
      return this.getFallbackSuggestions();
    }
  }

  /**
   * 文章強化 - 入力テキストを自然に拡張
   */
  async enhanceText(
    inputText: string,
    recentMessages: UnifiedMessage[],
    user: Persona,
    enhancePrompt?: string,
    apiConfig?: Partial<APIConfig> & { openRouterApiKey?: string }
  ): Promise<string> {
    if (!inputText.trim()) {
      throw new Error("入力テキストが空です");
    }

    const context = this.buildContext(recentMessages);

    let prompt: string;
    if (enhancePrompt) {
      prompt = enhancePrompt
        .replace(/{{conversation}}/g, context)
        .replace(/{{user}}/g, inputText)
        .replace(/{{text}}/g, inputText);
    } else {
      prompt = this.buildEnhancementPrompt(inputText, context, user);
    }

    // Check cache first
    const cacheKey = this.cache.generateCacheKey(
      prompt + "|enhance|" + inputText,
      apiConfig
    );
    const cachedResponse = this.cache.get<string>(cacheKey);

    if (cachedResponse) {
      const enhancedText = this.parseEnhancedText(cachedResponse, inputText);
      console.log("✅ 文章強化成功 (キャッシュ):", {
        originalLength: inputText.length,
        enhancedLength: enhancedText.length,
      });
      return enhancedText;
    }

    try {
      console.log("📝 文章強化リクエスト:", {
        inputTextLength: inputText.length,
        contextLength: context.length,
        promptLength: prompt.length,
        apiConfig,
      });

      // 設定のmax_tokensを使用（デフォルトは2048）
      const maxTokens = apiConfig?.max_tokens || 2048;
      console.log(`📊 文章強化 max_tokens: ${maxTokens} (設定値を使用)`);

      // プロンプトは入力が長い場合のみ短縮
      const truncatedPrompt =
        prompt.length > 4000
          ? prompt.substring(0, 4000) + '...\n\n強化対象: "' + inputText + '"'
          : prompt;

      const response = await apiRequestQueue.enqueueInspirationRequest(
        async () => {
          return simpleAPIManagerV2.generateMessage(
            truncatedPrompt,
            "文章を強化",
            [],
            apiConfig // API設定を渡す（OpenRouterキー等含む）
          );
        }
      );

      // Cache the successful response
      this.cache.set(cacheKey, response);

      const enhancedText = this.parseEnhancedText(response, inputText);
      console.log("✅ 文章強化成功:", {
        originalLength: inputText.length,
        enhancedLength: enhancedText.length,
      });

      return enhancedText;
    } catch (error: any) {
      console.error("❌ 文章強化エラー:", {
        error: error.message || error,
        inputText,
        promptLength: prompt.length,
        apiConfig,
      });

      // より詳細なエラーメッセージを提供
      if (error.message?.includes("OpenRouter")) {
        throw new Error(
          `文章強化に失敗しました: ${error.message}。APIキーの設定を確認してください。`
        );
      } else if (error.message?.includes("Gemini")) {
        throw new Error(`文章強化に失敗しました: ${error.message}`);
      } else {
        throw new Error(
          `文章強化に失敗しました: ${error.message || "不明なエラー"}`
        );
      }
    }
  }

  /**
   * Get cache statistics for performance monitoring
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear inspiration cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 高度な返信提案パース（成功例から移植）
   */
  private parseReplySuggestionsAdvanced(
    content: string
  ): InspirationSuggestion[] {
    console.log(
      "🔍 AI応答をパース中（先頭200文字）:",
      content.substring(0, 200)
    );

    const suggestions: InspirationSuggestion[] = [];
    const types: ("empathy" | "question" | "topic")[] = [
      "empathy",
      "question",
      "topic",
    ];

    // 1. まず番号付きリスト（1. 2. 3.）で分割を試行
    const numberedSections = content.split(/(?=\d+\.)/);
    const validNumberedSections = numberedSections
      .filter((section) => section.trim().match(/^\d+\./))
      .map((section) => {
        // 番号と改行を削除してクリーンなテキストを取得
        return section
          .replace(/^\d+\.\s*/, "")
          .replace(/^【[^】]+】\s*/, "")
          .replace(/^[\[「『]/, "")
          .replace(/[\]」』]$/, "")
          .trim();
      })
      .filter((text) => text.length >= 10 && text.length <= 250);

    if (validNumberedSections.length > 0) {
      console.log(`✅ 番号付きリストを検出: ${validNumberedSections.length}件`);

      validNumberedSections.forEach((text, index) => {
        if (index < 3) {
          suggestions.push({
            id: `suggestion_${Date.now()}_${index}`,
            type: types[index],
            content: text,
            confidence: 0.9,
          });
        }
      });

      return suggestions;
    }

    // 2. 番号がない場合、［タイトル］形式で抽出
    const bracketPattern = /\[([^\]]+)\]\s*([\s\S]*?)(?=\[|$)/g;
    const bracketMatches = Array.from(content.matchAll(bracketPattern));

    if (bracketMatches.length > 0) {
      console.log(`✅ ブラケット形式を検出: ${bracketMatches.length}件`);

      bracketMatches.forEach((match, index) => {
        if (index < 3) {
          const title = match[1];
          const contentAfterTitle = match[2]?.trim() || "";

          // タイトルと内容を組み合わせるか、内容のみを使用
          const text = contentAfterTitle || title;

          if (text.length >= 10 && text.length <= 250) {
            suggestions.push({
              id: `suggestion_${Date.now()}_${index}`,
              type: types[index],
              content: text,
              confidence: 0.8,
            });
          }
        }
      });

      return suggestions;
    }

    // 3. 改行で分割してパース（フォールバック）
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length >= 10 && line.length <= 250)
      .filter((line) => !line.includes("：") && !line.includes(":"));

    if (lines.length > 0) {
      console.log(`✅ 改行区切りで検出: ${lines.length}件`);

      lines.slice(0, 3).forEach((text, index) => {
        suggestions.push({
          id: `suggestion_${Date.now()}_${index}`,
          type: types[index],
          content: text,
          confidence: 0.7,
        });
      });
    }

    console.log(`📊 最終的に${suggestions.length}個の提案を抽出`);
    return suggestions;
  }

  /**
   * 会話コンテキストの構築
   */
  private buildContext(
    messages: UnifiedMessage[],
    isGroupMode?: boolean
  ): string {
    // コンテキストを短縮（最新3メッセージのみ、各メッセージ最大100文字）
    const recentMessages = messages.slice(-3);

    return recentMessages
      .map((msg) => {
        const content =
          msg.content.length > 150
            ? msg.content.substring(0, 150) + "..."
            : msg.content;

        if (isGroupMode) {
          const speaker =
            msg.role === "user"
              ? (msg.metadata as any)?.user_name || "ユーザー"
              : msg.character_name || "キャラクター";
          return `${speaker}: ${content}`;
        } else {
          const role = msg.role === "user" ? "ユーザー" : "キャラクター";
          return `${role}: ${content}`;
        }
      })
      .join("\n");
  }

  /**
   * 返信提案プロンプトの構築
   */
  private buildReplySuggestionPrompt(
    context: string,
    character: Character,
    user: Persona,
    isGroupMode: boolean
  ): string {
    const speaker = isGroupMode ? character.name : user.name;
    const target = isGroupMode ? "グループ全体" : character.name;

    return `あなたは{{user}}そのものであり、感情と欲望を隠さずに{{char}}へ反応してくださ 


      会話履歴:
      ${context}
      ###**分析すべき要素**
      - 会話の文脈と話題の流れ
      - {{user}}と発言意図と感情状態
      - これまでの{{user}}とトーンとスタイル
      - {{char}}との関係性  
      ###生成する4つのアプローチ 
      - ${speaker}の性格を反映させること
     - 各提案頭には番号を付けて、150～300字で、濃密かつ描写的に。  
      - 言葉だけでなく、息づかい・体温・視線・匂いなど五感を織り込む。  
      - トーンは状況に没入できるよう「セリフ＋モノローグ＋仕草」を自然に混在させる。 
      ### 出力の仕様
      
      - **見出し不要:** 出力は純粋に返信文のみとする。
      - **{{user}}視点:** {{user}}視点で文章を生成すること。
      以下の4パターンを必ず出力：  
      [ 1. 共感・受容（相手を甘く包み込む） ] 

      [ 2. 探求・開発（弱点を見つけようとする） ] 

      [ 3. 挑発・逸脱（相手を翻弄・焦らす） ] 

      [ 4. 自由形（予測不能・即興的） ] 
       
      注意事項：
      - 返信は、それぞれのアプローチに応じたパターンを持つものとする。
      - 説明や見出しは不要、返信文のみ
      `;
  }

  /**
   * 文章強化プロンプトの構築
   */
  private buildEnhancementPrompt(
    inputText: string,
    context: string,
    user: Persona
  ): string {
    // プロンプトを大幅に短縮
    return `{{user}}視点の文章をパワーアップさせる。:

あなたは感情表現のエキスパートです。  
以下の文章を、${{
      user,
    }}らしくキャラクターを保持したまま、元の意味を保持して強化し拡張しください。  

条件:
会話履歴:
      ${context}
      ###**分析すべき要素**
      - 会話の文脈と話題の流れ
      - {{user}}と発言意図と感情状態
      - これまでの{{user}}とトーンとスタイル
      - {{char}}との関係性  
- 原文の意味や意図は保持すること  
- ${{ user }}の口調やキャラクター性を尊重すること  
- 語彙や表現を拡張し、豊かで自然に聞こえる文章にすること  
- 必要に応じて原文の1.5～2倍に拡張してよい  
- 不要な解説や注釈は含めず、強化後の文章のみを出力すること

入力文:  
"${inputText}"

出力文（強化後）:
強化された文章のみ出力`;
  }

  /**
   * 強化テキストのパース
   */
  private parseEnhancedText(response: string, fallback: string): string {
    const cleaned = response
      .replace(/^強化された文章:\s*/, "")
      .replace(/^出力:\s*/, "")
      .trim();

    return cleaned.length > 5 ? cleaned : fallback;
  }

  /**
   * フォールバック提案
   */
  private getFallbackSuggestions(): InspirationSuggestion[] {
    return [
      {
        id: `fallback_${Date.now()}_0`,
        type: "empathy",
        content: "そうですね、よくわかります。",
        confidence: 0.6,
      },
      {
        id: `fallback_${Date.now()}_1`,
        type: "question",
        content: "もう少し詳しく聞かせてください。",
        confidence: 0.6,
      },
      {
        id: `fallback_${Date.now()}_2`,
        type: "topic",
        content: "とても興味深いお話ですね。",
        confidence: 0.6,
      },
    ];
  }
}
