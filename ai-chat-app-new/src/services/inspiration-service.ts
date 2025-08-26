// Inspiration Service for AI Chat V3
// Generates reply suggestions and text enhancements

import { UnifiedMessage, InspirationSuggestion } from '@/types/memory';
import { apiManager } from '@/services/api-manager';
import { apiRequestQueue } from '@/services/api-request-queue';
import { APIConfig, Character, Persona } from '@/types';

interface WindowWithInspirationStats extends Window {
  inspirationCacheStats: () => void;
}

export class InspirationService {
  // 軽量キャッシュシステム（パフォーマンス最適化）
  private suggestionCache = new Map<string, { 
    suggestions: InspirationSuggestion[], 
    timestamp: number 
  }>();
  private enhancementCache = new Map<string, { 
    result: string, 
    timestamp: number 
  }>();
  // Increased cache timeout to reduce repeated heavy inspiration calls
  private cacheTimeout = 10 * 60 * 1000; // 10分間キャッシュ
  /**
   * 会話履歴から返信候補を生成
   * @param recentMessages 直近の会話（3ラウンド）
   * @param character キャラクター情報
   * @param user ユーザー情報
   * @param customPrompt カスタムプロンプト（ユーザー設定）
   * @param suggestionCount 生成する候補数
   */
  async generateReplySuggestions(
    recentMessages: UnifiedMessage[],
    character: Character,
    user: Persona,
    customPrompt?: string,
  suggestionCount: number = 2, // デフォルト提案数を3 -> 2 に減らして負荷を下げる
    apiConfig?: Partial<APIConfig> & { openRouterApiKey?: string }
  ): Promise<InspirationSuggestion[]> {
    // 🚀 キャッシュチェック（パフォーマンス最適化）
    const context = this.buildLightweightContext(recentMessages);
    const cacheKey = `suggestions_${context.substring(0, 100)}_${customPrompt || 'default'}_${suggestionCount}`;
    const cached = this.suggestionCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('✨ Using cached inspiration suggestions');
      return cached.suggestions;
    }
    
    let prompt: string;
    let approaches: string[] = [];

    if (customPrompt) {
      // ユーザーのカスタムプロンプトからアプローチを抽出
      approaches = this.extractApproachesFromPrompt(customPrompt) || [];
      // プレースホルダーを実際の会話コンテキストで置換
      prompt = customPrompt.replace(/{{conversation}}/g, context);
    } else {
      approaches = []; // アプローチのリストは空にする
      prompt = this.buildDefaultSuggestionPrompt(context, character, user);
    }

    try {
      // ⚡ インスピレーションリクエストをキュー経由で実行（チャットと競合しない）
      const responseContent = await apiRequestQueue.enqueueInspirationRequest(async () => {
        console.log('✨ Inspiration request started via queue');
        // デフォルトは 512 トークンにして API 負荷とレイテンシを下げる
        const effectiveMaxTokens = apiConfig?.max_tokens ?? 512;
        console.log(`💡 Using max_tokens for reply suggestions: ${effectiveMaxTokens}`);
        const inspirationApiConfig = {
          ...apiConfig,
          max_tokens: effectiveMaxTokens
        };
  return this.tryGenerateWithRetry(prompt, inspirationApiConfig);
      });
      const suggestions = this.parseSuggestions(responseContent, approaches);
      
      // アプローチが見つからない場合でも、レスポンスをそのまま提案として返す
      if (suggestions.length === 0 && responseContent) {
        return responseContent.split('\n').filter(s => s.trim()).map((s, i) => ({
          id: `suggestion_${Date.now()}_${i}`,
          type: 'continuation',
          content: s,
          context,
          confidence: 0.7,
          source: 'pattern' as const
        }));
      }

      const result = suggestions.map((content, index) => ({
        id: `suggestion_${Date.now()}_${index}`,
        type: this.getApproachType(approaches[index] || 'continuation'),
        content,
        context,
        confidence: 0.8,
        source: 'pattern' as const
      }));
      
      // 🚀 結果をキャッシュに保存
      this.suggestionCache.set(cacheKey, {
        suggestions: result,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      return this.generateFallbackSuggestions(recentMessages);
    }
  }

  /**
   * テキストを強化・拡張
   * @param inputText 入力されたテキスト
   * @param recentMessages 直近の会話
   * @param user ユーザー（ペルソナ）情報
   * @param enhancePrompt カスタムプロンプト
   */
  async enhanceText(
    inputText: string,
    recentMessages: UnifiedMessage[],
    user: Persona,
    enhancePrompt?: string,
    apiConfig?: Partial<APIConfig> & { openRouterApiKey?: string }
  ): Promise<string> {
    // 🚀 キャッシュチェック（パフォーマンス最適化）
    const context = this.buildLightweightContext(recentMessages.slice(-3));
    const cacheKey = `enhance_${inputText}_${context.substring(0, 50)}_${enhancePrompt || 'default'}`;
    const cached = this.enhancementCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('✨ Using cached text enhancement');
      return cached.result;
    }
    
    let prompt: string;
    
    if (enhancePrompt) {
        // プレースホルダーを置換
        prompt = enhancePrompt
            .replace(/{{conversation}}/g, context)
            .replace(/{{user}}/g, inputText)
            .replace(/{{text}}/g, inputText); // {{text}} もエイリアスとして対応
    } else {
        // デフォルトの強化プロンプト
        prompt = `あなたは、ユーザー「${user.name}」本人です。
以下の「元のテキスト」を、「${user.name}」のペルソナ設定に合わせて、より自然で魅力的な文章に書き換えてください。

### あなた（ユーザー）のペルソナ設定
- 名前: ${user.name}
- プロフィール: ${user.description}

### 会話の文脈
${context}

### 元のテキスト
${inputText}

### 書き換え後のテキスト:`;
    }

    try {
      // ⚡ テキスト拡張もキュー経由で実行
      const enhancedText = await apiRequestQueue.enqueueInspirationRequest(async () => {
        console.log('🎆 Text enhancement request started via queue');
  // テキスト強化は中程度のトークンで十分なことが多いためデフォルトを 512 にする
  const effectiveMaxTokens = apiConfig?.max_tokens ?? 512;
  console.log(`🎯 Using max_tokens for text enhancement: ${effectiveMaxTokens}`);
  return this.tryGenerateWithRetry(prompt, { ...apiConfig, max_tokens: effectiveMaxTokens });
      });
      
      const result = enhancedText || inputText;
      
      // 🚀 結果をキャッシュに保存
      this.enhancementCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      console.error('Failed to enhance text:', error);
      return this.fallbackEnhance(inputText);
    }
  }

  /**
   * Try generating a message, retrying with trimmed prompt or reduced tokens
   * when max token / MAXTALK style errors occur.
   */
  private async tryGenerateWithRetry(prompt: string, apiConfig?: Partial<APIConfig>): Promise<string> {
    let attempt = 0;
    let currentPrompt = prompt;
    let currentMax = apiConfig?.max_tokens ?? 512;

    while (attempt < 3) {
      try {
        attempt++;
        const resp = await apiManager.generateMessage(currentPrompt, '', [], { ...apiConfig, max_tokens: currentMax });
        return resp;
      } catch (err: unknown) {
        const isErrorLike = (v: unknown): v is { message?: unknown } => typeof v === 'object' && v !== null && 'message' in v;
        const msg = isErrorLike(err) && typeof err.message === 'string' ? err.message : String(err);
        // detect token-limit style errors (MAX_TOKENS, MAXTALK, truncated reply, etc.)
        if (/MAX_TOKENS|MAXTALK|token limit|exceeded|max tokens/i.test(msg) || attempt < 3) {
          // reduce max tokens and trim prompt context
          currentMax = Math.max(64, Math.floor(currentMax / 2));
          // trim last 1/3 of prompt to reduce token count
          const keep = Math.floor((currentPrompt.length * 2) / 3);
          currentPrompt = currentPrompt.substring(0, Math.max(keep, 200));
          console.warn(`Retrying generation after token error (attempt ${attempt}), new max_tokens=${currentMax}`);
          // small backoff
          await new Promise(r => setTimeout(r, 200 * attempt));
          continue;
        }

        throw err;
      }
    }

    // last resort: try minimal prompt
    return apiManager.generateMessage(currentPrompt.slice(0, 200), '', [], { ...apiConfig, max_tokens: 64 });
  }

  /**
   * 会話の続きを提案
   */
  async suggestContinuation(recentMessages: UnifiedMessage[]): Promise<InspirationSuggestion[]> {
    const lastMessage = recentMessages[recentMessages.length - 1];
    
    if (!lastMessage) {
      return this.generateGreetingSuggestions();
    }

    // 文脈に基づく続き提案
    const continuationTypes = this.analyzeContinuationNeeds(lastMessage);
    
    const suggestions: InspirationSuggestion[] = [];
    
    for (const type of continuationTypes) {
      const content = await this.generateContinuationByType(type, recentMessages);
      suggestions.push({
        id: `continuation_${Date.now()}_${type}`,
        type,
        content,
        context: this.buildConversationContext(recentMessages),
        confidence: 0.7,
        source: 'pattern' as const
      });
    }

    return suggestions;
  }

  /**
   * 軽量文脈構築 - インスピレーション生成用高速版
   */
  private buildLightweightContext(messages: UnifiedMessage[]): string {
    // 最新3-5メッセージのみ使用（パフォーマンス優先）
    const recentMessages = messages.slice(-5);
    return recentMessages.map(msg => {
      const role = msg.role === 'user' ? 'ユーザー' : (msg.character_name || 'アシスタント');
      // 長いメッセージは要約（100文字制限）
      const content = msg.content.length > 100 ? 
        msg.content.substring(0, 100) + '...' : 
        msg.content;
      return `${role}: ${content}`;
    }).join('\n');
  }

  /**
   * 会話コンテキストの構築（フル版 - 後方互換性のため保持）
   */
  private buildConversationContext(messages: UnifiedMessage[]): string {
    return messages.map(msg => {
      const role = msg.role === 'user' ? 'ユーザー' : 'アシスタント';
      return `${role}: ${msg.content}`;
    }).join('\n');
  }

  /**
   * 返信提案用プロンプトの構築（デフォルト）
   */
  private buildDefaultSuggestionPrompt(
    context: string, 
    character: Character,
    user: Persona
  ): string {
    return `あなたはユーザー「${user.name}」として、キャラクター「${character.name}」と会話しています。
以下の状況設定と会話の流れを深く理解し、ユーザー「${user.name}」として次に行う返信として、最も自然で魅力的なものを互いに全く異なる方向性で3つ提案してください。

### 対話相手のキャラクター情報
- 名前: ${character.name}
- 背景設定: ${character.background}
- 現在のシナリオ: ${character.scenario}

### あなた（ユーザー）のプロフィール
${user.description}

### 最近の会話
${context}

### 非常に重要な指示
- **最優先事項**: 生成する文章は、必ずユーザー「${user.name}」視点の発言です。
- 3つの提案は、それぞれが全く異なるアプローチ（例：感情的な反応、論理的な質問、意外な行動提案など）になるようにしてください。
- 各提案は、150文字以内で、できるだけ表現豊かに記述してください。
- 箇条書き（\`1.\` \`2.\` \`3.\` の形式）で、提案の文章だけを記述してください。
- キャラクター「${character.name}」のセリフは絶対に生成しないでください。
- あなたのプロフィールを考慮した、適切な口調や態度で返信してください。
- 前置きや説明は一切不要です。`;
  }

  /**
   * プロンプトからアプローチを抽出
   */
  private extractApproachesFromPrompt(prompt: string): string[] | null {
    const regex = /\[([^\]]+)\]/g;
    const matches = prompt.match(regex);
    if (matches) {
      // 括弧 `[]` を取り除く
      return matches.map(match => match.substring(1, match.length - 1));
    }
    return null;
  }

  /**
   * 生成された提案のパース
   */
  private parseSuggestions(content: string, approaches: string[]): string[] {
    if (approaches.length === 0) {
        return content.split('\n').map(s => s.trim()).filter(Boolean);
    }
      
    const suggestions: string[] = [];
    
    // 方法1: 正確な[カテゴリー]マッチング
    const escapedApproaches = approaches.map(app => 
        app.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    
    const regex = new RegExp(`\\[(?:\\d+\\.\\s*)?(${escapedApproaches.join('|')})\\]\\s*([\\s\\S]*?)(?=\\s*\\[|$)`, 'g');
    
    let match;
    while ((match = regex.exec(content)) !== null) {
      const suggestion = match[2].trim();
      if (suggestion.length > 0) {
        suggestions.push(suggestion);
      }
    }

    // 方法2: より柔軟な解析（[任意のテキスト]形式）
    if (suggestions.length === 0) {
      const flexibleRegex = /\[([^\]]+)\]\s*([^\[]*?)(?=\s*\[|$)/g;
      let flexMatch;
      while ((flexMatch = flexibleRegex.exec(content)) !== null) {
        const suggestion = flexMatch[2].trim();
        if (suggestion.length > 5) { // 最低5文字以上
          suggestions.push(suggestion);
        }
      }
    }

    // 方法3: 番号付きリストでの分割
    if (suggestions.length === 0) {
      const lines = content.split('\n');
      const numberedSuggestions: string[] = [];
      
      for (const line of lines) {
        // 1. 2. 3. などの番号付き形式を検出
        const numberedMatch = line.match(/^\s*\d+\.\s*(.+)/);
        if (numberedMatch) {
          numberedSuggestions.push(numberedMatch[1].trim());
        }
        // - や • などの箇条書き形式を検出
        else if (line.match(/^\s*[-•]\s*(.+)/)) {
          const bulletMatch = line.match(/^\s*[-•]\s*(.+)/);
          if (bulletMatch) {
            numberedSuggestions.push(bulletMatch[1].trim());
          }
        }
        // 何も頭に付けない形式（空行で区切られた段落）
        else if (line.trim().length > 10 && !line.includes('[') && !line.includes('※') && !line.includes('以下')) {
          numberedSuggestions.push(line.trim());
        }
      }
      
      if (numberedSuggestions.length > 0) {
        return numberedSuggestions.slice(0, approaches.length);
      }
    }

    // 方法4: 最終フォールバック（段落分割）
    if (suggestions.length === 0) {
      const paragraphs = content.split(/\n\s*\n/)
        .map(p => p.replace(/\[.*?\]/g, '').trim())
        .filter(p => p.length > 10);
      
      return paragraphs.slice(0, approaches.length);
    }

    return suggestions.slice(0, approaches.length);
  }

  /**
   * アプローチから提案タイプを決定
   */
  private getApproachType(approach: string): InspirationSuggestion['type'] {
    if (approach.includes('質問')) return 'question';
    if (approach.includes('ユーモア')) return 'creative';
    if (approach.includes('共感')) return 'continuation';
    if (approach.includes('論理')) return 'topic';
    return 'continuation';
  }

  /**
   * 続きの必要性を分析
   */
  private analyzeContinuationNeeds(lastMessage: UnifiedMessage): InspirationSuggestion['type'][] {
    const content = lastMessage.content;
    const types: InspirationSuggestion['type'][] = [];

    if (content.includes('？') || content.includes('?')) {
      types.push('question');
    }
    
    if (content.length > 100) {
      types.push('topic');
    }
    
    types.push('continuation');
    
    return Array.from(new Set(types));
  }

  /**
   * タイプ別の続き生成
   */
  private async generateContinuationByType(
    type: InspirationSuggestion['type'], 
    _messages: UnifiedMessage[]
  ): Promise<string> {
    const templates = {
      continuation: 'そうですね。',
      question: 'それについて詳しく教えていただけますか？',
      topic: '興味深いお話ですね。',
      creative: 'なるほど、面白い視点ですね！'
    };

    return templates[type] || templates.continuation;
  }

  /**
   * 挨拶提案の生成
   */
  private generateGreetingSuggestions(): InspirationSuggestion[] {
    const greetings = [
      'こんにちは！何かお手伝いできることはありますか？',
      'お疲れ様です。今日はいかがお過ごしでしたか？',
      'はじめまして。よろしくお願いします。'
    ];

    return greetings.map((content, index) => ({
      id: `greeting_${Date.now()}_${index}`,
      type: 'continuation' as const,
      content,
      context: '',
      confidence: 0.9,
      source: 'pattern' as const
    }));
  }

  /**
   * フォールバック用の提案生成
   */
  private generateFallbackSuggestions(messages: UnifiedMessage[]): InspirationSuggestion[] {
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage) {
      return this.generateGreetingSuggestions();
    }

    const fallbackSuggestions = [
      'なるほど、わかりました。',
      'ありがとうございます。',
      'そうですね。'
    ];

    // 簡単なパターンマッチング
    if (lastMessage.content.includes('？') || lastMessage.content.includes('?')) {
      fallbackSuggestions.unshift(
        'はい、そうですね。',
        'それについて詳しく説明します。',
        'ご質問ありがとうございます。'
      );
    }

    return fallbackSuggestions.slice(0, 3).map((content, index) => ({
      id: `fallback_${Date.now()}_${index}`,
      type: 'continuation' as const,
      content,
      context: this.buildConversationContext(messages),
      confidence: 0.5,
      source: 'pattern' as const
    }));
  }

  /**
   * フォールバック用のテキスト強化
   */
  private fallbackEnhance(text: string): string {
    // 基本的な敬語変換
    let enhanced = text;
    
    // 簡単な置換ルール
    const replacements = [
      { from: /^はい$/i, to: 'はい、承知いたしました。' },
      { from: /^ありがとう$/i, to: 'ありがとうございます。' },
      { from: /^わかった$/i, to: 'わかりました。' },
      { from: /^OK$/i, to: '了解いたしました。' },
    ];

    replacements.forEach(rule => {
      enhanced = enhanced.replace(rule.from, rule.to);
    });

    // 文末に句読点がない場合は追加
    if (!/[。！？!?]$/.test(enhanced)) {
      enhanced += '。';
    }

    return enhanced;
  }

  /**
   * 最近のメッセージをフォーマット
   */
  private formatRecentMessages(messages: UnifiedMessage[]): string {
    return messages.slice(-6).map(msg => {
      const role = msg.role === 'user' ? 'ユーザー' : 'アシスタント';
      return `${role}: ${msg.content}`;
    }).join('\n');
  }

  /**
   * 提案の品質評価
   */
  evaluateSuggestion(suggestion: InspirationSuggestion, context: UnifiedMessage[]): number {
    let score = suggestion.confidence;
    
    // 長さによる調整
    if (suggestion.content.length > 10 && suggestion.content.length < 100) {
      score += 0.1;
    }
    
    // 多様性による調整
    const lastMessage = context[context.length - 1];
    if (lastMessage && !suggestion.content.includes(lastMessage.content.slice(0, 10))) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * キャッシュクリーンアップ - メモリリーク防止
   */
  cleanupCache(): void {
    const now = Date.now();
    
    // 期限切れのキャッシュエントリを削除
    for (const [key, value] of this.suggestionCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.suggestionCache.delete(key);
      }
    }
    
    for (const [key, value] of this.enhancementCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.enhancementCache.delete(key);
      }
    }
    
    console.log('🧹 Inspiration cache cleanup completed');
  }

  /**
   * キャッシュ統計情報取得
   */
  getCacheStats() {
    return {
      suggestions: {
        size: this.suggestionCache.size,
        entries: Array.from(this.suggestionCache.keys()).slice(0, 5) // サンプル表示
      },
      enhancements: {
        size: this.enhancementCache.size,
        entries: Array.from(this.enhancementCache.keys()).slice(0, 5) // サンプル表示
      },
      timeout: this.cacheTimeout / 1000 + ' seconds'
    };
  }
}

// 定期的なキャッシュクリーンアップ（開発環境のみ）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const inspirationService = new InspirationService();
  
  setInterval(() => {
    inspirationService.cleanupCache();
  }, 10 * 60 * 1000); // 10分ごと
  
  // デベロッパー用統計関数
  (window as unknown as WindowWithInspirationStats).inspirationCacheStats = () => {
    const stats = inspirationService.getCacheStats();
    console.log('📊 Inspiration Cache Stats:', stats);
    return stats;
  };
}