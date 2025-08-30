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
    forceRegenerate: boolean = false,
    isGroupMode: boolean = false // グループモード判定を外部から受け取る
  ): Promise<InspirationSuggestion[]> {
    // グループモード自動判定（パラメータがない場合）
    if (!isGroupMode) {
      isGroupMode = recentMessages.some(msg => 
        msg.character_name && msg.user_name && 
        recentMessages.some(other => 
          other.character_name !== msg.character_name || other.user_name !== msg.user_name
        )
      );
    }

    // 🚀 キャッシュチェック（パフォーマンス最適化）
    const context = this.buildLightweightContext(recentMessages, isGroupMode);
    const cacheKey = `suggestions_${context.substring(0, 100)}_${customPrompt || 'default'}_${suggestionCount}_${isGroupMode ? 'group' : 'solo'}`;
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
      prompt = this.buildDefaultSuggestionPrompt(context, character, user, suggestionCount, isGroupMode);
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
      console.log('🔍 [DEBUG] Raw AI response:', responseContent.substring(0, 500) + '...');
      
      const suggestions = this.parseSuggestions(responseContent, approaches);
      console.log('🔍 [DEBUG] Parsed suggestions:', suggestions);
      
      // レスポンスが取得できていても提案が0の場合の改善された処理
      if (suggestions.length === 0 && responseContent) {
        console.log('🔄 Using improved content extraction from raw response');
        const extractedSuggestions = this.extractSuggestionsFromRawContent(responseContent, 3);
        if (extractedSuggestions.length > 0) {
          return extractedSuggestions.map((content, i) => ({
            id: `extracted_${Date.now()}_${i}`,
            type: 'continuation',
            content,
            context,
            confidence: 0.7,
            source: 'pattern' as const
          }));
        }
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
      console.error('🚨 [InspirationService] Failed to generate suggestions:', error);
      
      // 開発環境ではエラー詳細をUI表示用に出力
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('🔍 [DEBUG] Error details:', {
          errorType: error?.constructor?.name,
          errorMessage,
          stack: error instanceof Error ? error.stack : 'No stack available',
          recentMessagesCount: recentMessages.length,
          character: character.name,
          user: user.name
        });
        
        // デバッグモードではエラーを含む提案を返す
        return [{
          id: `error_debug_${Date.now()}`,
          type: 'continuation',
          content: `🚨 DEBUG: API Error - ${errorMessage}`,
          context: this.buildConversationContext(recentMessages),
          confidence: 0.0,
          source: 'error' as const
        }, {
          id: `error_info_${Date.now()}`,
          type: 'continuation', 
          content: `🔧 Check console for full error details`,
          context: this.buildConversationContext(recentMessages),
          confidence: 0.0,
          source: 'error' as const
        }];
      }
      
      // 本番環境のみフォールバック使用
      console.log('🚨 [DEBUG] Error in suggestion generation:', error);
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
      console.error('🚨 [InspirationService] Failed to enhance text:', error);
      
      // 開発環境では詳細なエラー情報を出力
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('🔍 [DEBUG] Text enhancement error details:', {
          errorType: error?.constructor?.name,
          errorMessage,
          stack: error instanceof Error ? error.stack : 'No stack available',
          inputText: inputText.substring(0, 100) + '...',
          inputLength: inputText.length,
          user: user.name
        });
      }
      
      // エラーメッセージをより具体的に（開発モードでは詳細含む）
      if (error instanceof Error) {
        const baseMessage = `文章強化に失敗しました: ${error.message}`;
        const debugInfo = isDevelopment ? `\n🔍 DEBUG: Check console for full error details` : '';
        throw new Error(baseMessage + debugInfo);
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
        const resp = await apiManager.generateMessage(currentPrompt, 'Generate reply suggestions based on the conversation.', [], { ...apiConfig, max_tokens: currentMax });
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
      return await apiManager.generateMessage(currentPrompt.slice(0, 200), 'Generate a brief fallback response.', [], { ...apiConfig, max_tokens: 64 });
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
  private buildLightweightContext(messages: UnifiedMessage[], isGroupMode?: boolean): string {
    // 最新8メッセージを使用（会話の流れを十分に把握）
    const recentMessages = messages.slice(-8);
    
    // グループモードの場合は複数参加者を明示
    if (isGroupMode) {
      const contextLines = recentMessages.map(msg => {
        const role = msg.role === 'user' ? 
          (msg.user_name || 'ユーザー') : 
          (msg.character_name || 'アシスタント');
        
        // 会話の流れを把握するため、長いメッセージも保持（500文字まで）
        const content = msg.content.length > 500 ? 
          msg.content.substring(0, 500) + '...' : 
          msg.content;
        return `${role}: ${content}`;
      });
      
      // グループチャットであることを明示
      return `グループチャット参加者:\n${contextLines.join('\n')}`;
    } else {
      // ソロモードの場合
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
    suggestionCount: number,
    isGroupMode: boolean = false
  ): string {
    
    if (isGroupMode) {
      // グループモード用プロンプト（シンプル版）
      return `グループチャットの参加者「${user.name}」として、${suggestionCount}つの異なる返事を生成してください。

会話:
${context}

条件:
- 各返事は独立した内容（120-150文字）
- 番号や見出しは不要
- 改行で区切る

${suggestionCount}つの返事:`;
    } else {
      // ソロモード用プロンプト（シンプル版）
      return `あなたは${user.name}です。以下の会話に対して、3つの異なる返事を生成してください。

会話:
${context}

条件:
- 各返事は完全に独立した内容
- 120-150文字程度
- 番号や見出しは不要
- 改行で区切る

3つの返事:`;
    }
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
   * 生成された提案のパース（簡潔版）
   */
  private parseSuggestions(content: string, approaches: string[]): string[] {
    const expectedCount = approaches.length > 0 ? approaches.length : 3;
    
    // 1. まず基本的な行分割とクリーンアップ
    const allLines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // 2. ストーリー継続か独立提案かを判定
    const isNarrativeContinuation = this.detectNarrativeContinuation(allLines);
    
    if (isNarrativeContinuation) {
      // ストーリー継続の場合: 全体を一つの提案として扱う
      console.log('📖 Detected narrative continuation, treating as single suggestion');
      const fullStory = allLines
        .filter(line => !line.match(/^(提案|返信|候補|\d+[\.\)]|例|アプローチ|条件)/i))
        .join(' ')
        .replace(/^[「『"'-]+|[」』"'-]+$/g, '')
        .trim();
      
      if (fullStory.length > 20) {
        return [fullStory];
      }
    }
    
    // 3. 通常の独立提案処理
    const validLines = [];
    
    for (const line of allLines) {
      // 最小限の除外パターンのみ適用
      if (line.match(/^提案\s*\d+|^返信[①②③④⑤]|^候補\s*\d+|^\d+[\.\)]/i)) continue;
      if (line.match(/^[-•·]\s|例:|アプローチ:|出力形式:|通りの返事|書いてください/i)) continue;
      if (line.length < 5 || line.length > 300) continue; // 長さ制限を緩和
      
      // 引用符のクリーンアップ
      const cleaned = line
        .replace(/^[「『"']/g, '').replace(/[」』"']$/g, '')
        .replace(/^[\-\.\s]+/g, '')
        .trim();
      
      if (cleaned.length < 5) continue;
      
      // 基本的な重複チェックのみ（より緩い条件）
      const isDuplicate = validLines.some(existing => {
        return existing === cleaned || this.calculateSimilarity(cleaned, existing) > 0.85;
      });
      
      if (!isDuplicate) {
        validLines.push(cleaned);
      }
      
      // 必要な数が揃ったら停止
      if (validLines.length >= expectedCount) {
        break;
      }
    }
    
    // 結果が不足している場合のみフォールバック
    if (validLines.length === 0) {
      console.log('🔄 No valid suggestions parsed, using contextual fallback');
      return this.generateContextualFallback(content, expectedCount);
    }
    
    // 不足分を補完（必要な場合のみ）
    while (validLines.length < expectedCount) {
      const fallbacks = [
        'その通りだと思います。',
        '面白い視点ですね。',
        'もう少し詳しく教えてください。'
      ];
      
      const availableFallback = fallbacks.find(fb => 
        !validLines.some(existing => this.calculateSimilarity(fb, existing) > 0.6)
      );
      
      if (availableFallback) {
        validLines.push(availableFallback);
      } else {
        break; // これ以上追加できない
      }
    }
    
    return validLines.slice(0, expectedCount);
  }

  /**
   * 文章の類似度を計算（簡単なレーベンシュタイン距離ベース）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;
    
    // 簡単な共通単語数ベースの類似度計算
    const words1 = str1.replace(/[。、！？]/g, '').split('');
    const words2 = str2.replace(/[。、！？]/g, '').split('');
    
    let commonChars = 0;
    const minLength = Math.min(words1.length, words2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (words1[i] === words2[i]) {
        commonChars++;
      }
    }
    
    // より厳密なチェック：同じ文字の出現頻度を比較
    const charCount1: { [key: string]: number } = {};
    const charCount2: { [key: string]: number } = {};
    
    for (const char of words1) {
      charCount1[char] = (charCount1[char] || 0) + 1;
    }
    
    for (const char of words2) {
      charCount2[char] = (charCount2[char] || 0) + 1;
    }
    
    let sharedChars = 0;
    for (const char in charCount1) {
      if (charCount2[char]) {
        sharedChars += Math.min(charCount1[char], charCount2[char]);
      }
    }
    
    return sharedChars / maxLength;
  }

  /**
   * ストーリー継続と独立提案を区別する検出ロジック
   */
  private detectNarrativeContinuation(lines: string[]): boolean {
    if (lines.length < 2) return false;
    
    // ストーリー継続の特徴を検出
    let narrativeScore = 0;
    const joinedText = lines.join(' ');
    
    // グローバル指標: 全体的な連続性
    // 1. 同一人称の一貫使用
    const firstPersonCount = (joinedText.match(/(俺|私|僕|オレ)/g) || []).length;
    if (firstPersonCount >= 2) {
      narrativeScore += 2;
      console.log('📖 Consistent first person usage +2');
    }
    
    // 2. 時系列的な行動シーケンス
    const actionSequence = joinedText.match(/(起きろ|起き|作る|寝て|寝る|眠)/g);
    if (actionSequence && actionSequence.length >= 2) {
      narrativeScore += 2;
      console.log('📖 Action sequence detected +2');
    }
    
    // 行間の関係性チェック
    for (let i = 1; i < lines.length; i++) {
      const current = lines[i].trim();
      const previous = lines[i-1].trim();
      
      // 3. 接続詞での継続
      if (current.match(/^(でも|だから|それで|そして|また|さらに|しかし|だけど|けれど|なので|そのため)/)) {
        narrativeScore += 1;
      }
      
      // 4. 時間的継続
      if (current.match(/^(その後|それから|次に|今度は)/)) {
        narrativeScore += 1;
      }
      
      // 5. 状況の継続（場所・時間・人物の一貫性）
      if (previous.includes('寝') && current.includes('眠')) {
        narrativeScore += 1;
      }
      
      // 6. 直接的な人物言及の継続
      if (previous.includes('ひまり') && current.match(/(マジで|ま、)/)) {
        narrativeScore += 1;
      }
    }
    
    // より低い閾値でストーリー継続と判定（柔軟性向上）
    const isNarrative = narrativeScore >= 1;
    console.log(`📖 Narrative detection: score=${narrativeScore}, isNarrative=${isNarrative}`);
    
    return isNarrative;
  }
  
  /**
   * コンテキストベースのフォールバック生成
   */
  private generateContextualFallback(content: string, expectedCount: number): string[] {
    // AIの生成内容から意味のある部分を抽出
    const sentences = content.split(/[。！？\n]/).filter(s => s.trim().length > 10);
    
    const contextualSuggestions = [];
    
    // 生成された内容から文脈に合った提案を作成
    for (const sentence of sentences.slice(0, expectedCount)) {
      const trimmed = sentence.trim();
      if (trimmed.length > 5 && trimmed.length < 200) {
        contextualSuggestions.push(trimmed);
      }
    }
    
    // まだ不足している場合の汎用フォールバック
    const genericFallbacks = [
      'そうですね、よくわかります。',
      'とても興味深いお話ですね。',
      'もう少し詳しく聞かせてください。'
    ];
    
    while (contextualSuggestions.length < expectedCount && genericFallbacks.length > 0) {
      const fallback = genericFallbacks.shift()!;
      if (!contextualSuggestions.includes(fallback)) {
        contextualSuggestions.push(fallback);
      }
    }
    
    return contextualSuggestions;
  }

  /**
   * 生のコンテンツから提案を抽出する改善されたメソッド
   */
  private extractSuggestionsFromRawContent(content: string, expectedCount: number): string[] {
    console.log('📝 Extracting suggestions from raw content:', content.substring(0, 200) + '...');
    
    // より柔軟な抽出ロジック
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const extracted = [];
    
    for (const line of lines) {
      // 非常に基本的なフィルタリングのみ
      if (
        !line.match(/^(提案|返信|候補|\d+[.\)]|出力|例|アプローチ|条件|重要|生成|以下|上記)/i) &&
        line.length >= 10 && 
        line.length <= 250 &&
        !line.includes('番号') &&
        !line.includes('見出し')
      ) {
        // 簡単なクリーンアップ
        const cleaned = line
          .replace(/^[「『"'-]+|[」』"'-]+$/g, '')
          .replace(/^\s*[-•·]\s*/, '')
          .trim();
        
        if (cleaned.length >= 10) {
          extracted.push(cleaned);
        }
      }
      
      if (extracted.length >= expectedCount) break;
    }
    
    console.log('🎯 Extracted suggestions:', extracted);
    return extracted;
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
   * 改善されたフォールバック提案生成
   */
  private generateFallbackSuggestions(messages: UnifiedMessage[]): InspirationSuggestion[] {
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage) {
      return this.generateGreetingSuggestions();
    }

    console.log('🔄 Generating contextual fallback for:', lastMessage.content.substring(0, 100));
    
    const suggestions = [];
    const messageContent = lastMessage.content.toLowerCase();
    
    // 文脈ベースの動的提案生成
    if (messageContent.includes('？') || messageContent.includes('?')) {
      suggestions.push('その話題について、もっと詳しく教えていただけますか？');
      suggestions.push('とても興味深いご質問ですね。私の考えも聞いていただけますか？');
    } else if (messageContent.match(/楽しい|嬉しい|よかった|ありがとう/)) {
      suggestions.push('こちらこそ、素晴らしい時間をありがとうございます！');
      suggestions.push('一緒に楽しめて嬉しいです。またお話ししましょう。');
    } else if (messageContent.match(/悲しい|つらい|大変|疑問/)) {
      suggestions.push('お疲れ様でした。何かお手伝いできることはありますか？');
      suggestions.push('そんなことがあったんですね。一人で抱え込まないでくださいね。');
    } else {
      // 一般的な内容への応答
      suggestions.push('なるほど、そういう考え方もあるんですね。');
      suggestions.push('それは面白い発想ですね。どんなきっかけでしたか？');
    }
    
    // 三番目の提案（汎用）
    if (suggestions.length < 3) {
      suggestions.push('もっと詳しくお話してみませんか？お時間があるときにでも。');
    }

    return suggestions.slice(0, 3).map((content, index) => ({
      id: `fallback_${Date.now()}_${index}`,
      type: index === 0 ? 'question' : index === 1 ? 'topic' : 'continuation' as const,
      content,
      context: this.buildConversationContext(messages),
      confidence: 0.6,
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