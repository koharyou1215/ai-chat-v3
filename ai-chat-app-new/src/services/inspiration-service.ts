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
  suggestionCount: number = 3, // デフォルト提案数を3つに戻す
    apiConfig?: Partial<APIConfig> & { openRouterApiKey?: string },
    forceRegenerate: boolean = false
  ): Promise<InspirationSuggestion[]> {
    // 🚀 キャッシュチェック（パフォーマンス最適化）
    const context = this.buildLightweightContext(recentMessages);
    const cacheKey = `suggestions_${context.substring(0, 100)}_${customPrompt || 'default'}_${suggestionCount}`;
    const cached = this.suggestionCache.get(cacheKey);
    
    if (!forceRegenerate && cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('✨ Using cached inspiration suggestions');
      return cached.suggestions;
    }
    
    if (forceRegenerate) {
      console.log('🔄 Force regenerating suggestions (cache ignored)');
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
      prompt = this.buildDefaultSuggestionPrompt(context, character, user, suggestionCount);
    }

    try {
      // ⚡ インスピレーションリクエストをキュー経由で実行（チャットと競合しない）
      const responseContent = await apiRequestQueue.enqueueInspirationRequest(async () => {
        console.log('\n🌟 ===== Inspiration Request =====');
        console.log('✨ Inspiration request started via queue');
        console.log(`🎯 Suggestion count: ${suggestionCount}`);
        console.log(`📚 Recent messages count: ${recentMessages.length}`);
        console.log(`👤 Character: ${character.name}`);
        console.log(`🧑 User: ${user.name}`);
        if (customPrompt) {
          console.log(`🎨 Custom prompt (${customPrompt.length} chars):`);
          console.log(`   ${customPrompt.substring(0, 150)}...`);
        } else {
          console.log('🎨 Using default inspiration prompt');
        }
        // 返信提案用に十分なトークンを確保
        const effectiveMaxTokens = apiConfig?.max_tokens ?? 800;
        console.log(`💡 Using max_tokens for reply suggestions: ${effectiveMaxTokens}`);
        console.log('=====================================\n');
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
    // 入力テキストの長さをチェック
    if (inputText.trim().length === 0) {
      throw new Error('入力テキストが空です。文章を入力してから強化を実行してください。');
    }
    
    if (inputText.trim().length > 2000) {
      throw new Error('入力テキストが長すぎます。2000文字以内で入力してください。');
    }

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
        // デフォルトの強化プロンプト（簡潔版）
        prompt = `${user.name}として以下の文章をより表現豊かに書き直す。

文脈: ${context}
ユーザー: ${user.name}${user.personality ? ` (${user.personality})` : ''}

元の文章: "${inputText}"

書き直した文章:`;
    }

    try {
      // ⚡ テキスト拡張もキュー経由で実行
      const enhancedText = await apiRequestQueue.enqueueInspirationRequest(async () => {
        console.log('\n🎆 ===== Text Enhancement Request =====');
        console.log('🎆 Text enhancement request started via queue');
        console.log(`📝 Input text (${inputText.length} chars):`);
        console.log(`   ${inputText.substring(0, 100)}...`);
        console.log(`🧑 User: ${user.name}${user.personality ? ` (${user.personality})` : ''}`);
        if (enhancePrompt) {
          console.log(`🎨 Custom enhancement prompt (${enhancePrompt.length} chars):`);
          console.log(`   ${enhancePrompt.substring(0, 150)}...`);
        } else {
          console.log('🎨 Using default enhancement prompt');
        }
        // 文章強化用に十分なトークンを確保（元の文章より長くなることを想定）
        const effectiveMaxTokens = apiConfig?.max_tokens ?? 1000;
        console.log(`🎯 Using max_tokens for text enhancement: ${effectiveMaxTokens}`);
        console.log('========================================\n');
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
      // エラーメッセージをより具体的に
      if (error instanceof Error) {
        throw new Error(`文章強化に失敗しました: ${error.message}`);
      }
      throw new Error('文章強化中に予期しないエラーが発生しました。しばらく時間をおいて再試行してください。');
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
    let lastError: string | null = null;

    while (attempt < 3) {
      try {
        attempt++;
        const resp = await apiManager.generateMessage(currentPrompt, '', [], { ...apiConfig, max_tokens: currentMax });
        return resp;
      } catch (err: unknown) {
        const isErrorLike = (v: unknown): v is { message?: unknown } => typeof v === 'object' && v !== null && 'message' in v;
        const msg = isErrorLike(err) && typeof err.message === 'string' ? err.message : String(err);
        lastError = msg;
        
        // detect token-limit style errors (MAX_TOKENS, MAXTALK, truncated reply, etc.)
        if (/MAX_TOKENS|MAXTALK|token limit|exceeded|max tokens/i.test(msg)) {
          // reduce max tokens and retry silently
          currentMax = Math.max(64, Math.floor(currentMax / 2));
          // trim last 1/3 of prompt to reduce token count
          const keep = Math.floor((currentPrompt.length * 2) / 3);
          currentPrompt = currentPrompt.substring(0, Math.max(keep, 200));
          // Don't show error to user - just retry
          // small backoff
          await new Promise(r => setTimeout(r, 200 * attempt));
          continue;
        }

        // For other errors, don't continue the retry loop
        throw new Error(`生成エラー: ${msg}`);
      }
    }

    // last resort: try minimal prompt
    try {
      console.warn('🆘 Final attempt with minimal prompt and 64 tokens');
      return await apiManager.generateMessage(currentPrompt.slice(0, 200), '', [], { ...apiConfig, max_tokens: 64 });
    } catch (finalErr) {
      const isErrorLike = (v: unknown): v is { message?: unknown } => typeof v === 'object' && v !== null && 'message' in v;
      const finalMsg = isErrorLike(finalErr) && typeof finalErr.message === 'string' ? finalErr.message : String(finalErr);
      throw new Error(`生成に失敗しました: ${finalMsg}`);
    }
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
   * 会話文脈構築 - インスピレーション生成用（会話の流れを重視）
   */
  private buildLightweightContext(messages: UnifiedMessage[]): string {
    // 最新8メッセージを使用（会話の流れを十分に把握）
    const recentMessages = messages.slice(-8);
    
    const contextLines = recentMessages.map(msg => {
      const role = msg.role === 'user' ? 'ユーザー' : (msg.character_name || 'アシスタント');
      // 会話の流れを把握するため、長いメッセージも保持（500文字まで）
      const content = msg.content.length > 500 ? 
        msg.content.substring(0, 500) + '...' : 
        msg.content;
      return `${role}: ${content}`;
    });
    
    return contextLines.join('\n');
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
    user: Persona,
    suggestionCount: number
  ): string {
    return `あなたは「${user.name}」です。以下の会話を読んで、「${character.name}」に返事をしてください。

会話:
${context}

あなた: ${user.name}
相手: ${character.name}

指示: 会話の流れに沿って、${suggestionCount}通りの異なるアプローチで返事を書いてください。各返事は約150文字程度の長さで、それぞれ異なる感情や反応を表現してください。

重要な注意：
- 見出しや番号は一切付けないでください
- 「提案」「返信」「候補」という言葉は絶対に使わないでください
- 説明文は書かないでください
- 各返事は完結した文章にしてください（150文字程度）
- それぞれ異なる感情・アプローチで書いてください（優しく・積極的・心配そうに など）

良い例:
おはよう。よく眠れた？
昨夜は遅くまでありがとう。

悪い例（絶対にしないでください）:
提案1: おはよう
返信①: 昨夜は...

あなたの${suggestionCount}通りの返事:`;
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
   * 生成された提案のパース（シンプル版）
   */
  private parseSuggestions(content: string, approaches: string[]): string[] {
    const expectedCount = approaches.length > 0 ? approaches.length : 3;
    
    // 改行で分割し、不要な行を除外
    const allLines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    const validLines = [];
    
    for (const line of allLines) {
      // 除外パターン
      if (line.match(/^提案\s*\d+/i)) continue;
      if (line.match(/^返信[①②③④⑤]/i)) continue;
      if (line.match(/^候補\s*\d+/i)) continue;
      if (line.match(/^\d+[\.\)]/)) continue;
      if (line.match(/^[-•·]\s/)) continue;
      if (line.includes('通りの返事') || line.includes('書いてください')) continue;
      if (line.includes('例:') || line.includes('間違った例')) continue;
      if (line.length < 5) continue;
      
      // 有効な行として追加
      validLines.push(line);
      
      // 必要な数が揃ったら停止
      if (validLines.length >= expectedCount) {
        break;
      }
    }
    
    // 最終クリーンアップ
    const result = validLines.map(line => {
      return line
        .replace(/^「/, '').replace(/」$/, '')
        .replace(/^『/, '').replace(/』$/, '')
        .replace(/^"/, '').replace(/"$/, '')
        .trim();
    });
    
    // フォールバック
    if (result.length === 0) {
      return ['そうですね...', 'なるほど。'];
    }
    
    return result;
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