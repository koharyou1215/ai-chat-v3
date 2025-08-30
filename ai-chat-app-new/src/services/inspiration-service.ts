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
      // グループモード用プロンプト
      return `グループチャット参加者「${user.name}」として、以下の会話に返事してください。

会話履歴:
${context}

重要：${suggestionCount}つの全く異なるアプローチで返事を生成してください。各返事は完全に独立した内容で、約120-150文字でまとめてください。

アプローチの例（必ずこの多様性を実現）:
- 共感・理解を示すアプローチ
- 積極的・行動的なアプローチ  
- 質問・興味を示すアプローチ
- ユーモア・軽快なアプローチ
- 深く考察するアプローチ

出力形式：番号や見出しは一切不要。各返事を改行で区切るだけ。

例：
そうなんですね。私も同じような経験があって、とても共感します。お疲れ様でした。
それは面白そうですね！私もぜひ参加してみたいです。何か手伝えることがあれば声をかけてください。
詳しく教えてもらえますか？どんな感じだったのか、もう少し聞きたいです。

あなたの${suggestionCount}通りの返事:`;
    } else {
      // ソロモード用プロンプト
      return `**超重要**: 3つの全く別の人格として返答してください。**続き話ではありません**。

会話状況:
${context}

あなた（${user.name}）として、3つの**完全に異なる人格・感情**で返事をしてください。

**絶対に守る条件**:
1. 各返事は**独立した完結文章**（120-150文字）
2. **つながりのない別々の反応**
3. **番号・説明・見出し一切禁止**
4. **改行で分けるだけ**

**3つの人格設定**:
・優しく理解のある反応
・元気で積極的な反応  
・好奇心旺盛な質問系反応

**禁止例**（ストーリー続き）:
ひまり、起きてるんだろ？俺も気づいてたよ。
でも別に怒ってないから安心してくれ。
寒かったんだろ？毛布貸してやるよ。

**正解例**（独立した反応）:
大丈夫ですよ、お疲れさまでした。気にしないでくださいね。今度は毛布を2つ用意しておきましょうか。私も気をつけるので、お互い快適に過ごせるようにしたいと思います。

わあ、寒い思いをさせてしまってごめんなさい！今度からは遠慮なく起こしてくださいね。私も毛布をしっかり確保しておきます。一緒に温かく過ごしましょう！

起きてたんですか？どのくらい前から気づいてたんでしょう？寝顔を見られてたのはちょっと恥ずかしいですが...今度はどうしたらいいでしょうか？

3つの異なる反応:

**最終確認**: 各行が独立した完全な文章になっていることを確認してから出力してください。続き話や関連する内容は絶対に避けてください。`;
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
   * 生成された提案のパース（改良版）
   */
  private parseSuggestions(content: string, approaches: string[]): string[] {
    const expectedCount = approaches.length > 0 ? approaches.length : 3;
    
    // 改行で分割し、不要な行を除外
    const allLines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    const validLines = [];
    let skipNext = false;
    
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      
      if (skipNext) {
        skipNext = false;
        continue;
      }
      
      // 除外パターン（強化版）
      if (line.match(/^提案\s*\d+/i)) continue;
      if (line.match(/^返信[①②③④⑤]/i)) continue;
      if (line.match(/^候補\s*\d+/i)) continue;
      if (line.match(/^\d+[\.\)]/)) continue;
      if (line.match(/^[-•·]\s/)) continue;
      if (line.includes('通りの返事') || line.includes('書いてください')) continue;
      if (line.includes('例:') || line.includes('良い例') || line.includes('悪い例')) {
        // 例の説明行をスキップし、次の数行も除外
        skipNext = true;
        continue;
      }
      if (line.includes('アプローチ') || line.includes('多様性') || line.includes('重要')) continue;
      if (line.includes('出力形式') || line.includes('番号') || line.includes('見出し')) continue;
      if (line.length < 10) continue; // 最低文字数を10文字に引き上げ
      if (line.length > 200) continue; // 長すぎる行を除外
      
      // 重複チェック - 似たような文章を排除
      const isDuplicate = validLines.some(existing => {
        const similarity = this.calculateSimilarity(line, existing);
        return similarity > 0.7; // 70%以上似ている場合は重複とみなす
      });
      
      if (isDuplicate) continue;
      
      // 連続性チェック - つながった文章を検出して除外
      if (validLines.length > 0) {
        const lastLine = validLines[validLines.length - 1];
        if (this.isSequentialText(lastLine, line)) {
          console.log('🚫 Sequential text detected, skipping:', line);
          continue;
        }
      }
      
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
        .replace(/^\./, '').replace(/^\-/, '')
        .trim();
    });
    
    // フォールバック - より多様性のある提案
    if (result.length === 0) {
      return [
        'そうですね、とても興味深いお話だと思います。',
        'それは素晴らしいアイデアですね！ぜひ詳しく教えてください。',
        '同じような経験があります。一緒に考えてみませんか？'
      ];
    }
    
    // 結果が少ない場合の補完
    if (result.length < expectedCount) {
      const fallbackSuggestions = [
        'その通りだと思います。とても共感できます。',
        '面白い視点ですね。もう少し詳しく聞かせてください。',
        'なるほど、そういう考え方もありますね。参考になります。',
        'それは良いアイデアですね。実現できそうでしょうか？',
        '同感です。私も同じようなことを考えていました。'
      ];
      
      for (const fallback of fallbackSuggestions) {
        if (result.length >= expectedCount) break;
        
        const isDuplicate = result.some(existing => {
          return this.calculateSimilarity(fallback, existing) > 0.6;
        });
        
        if (!isDuplicate) {
          result.push(fallback);
        }
      }
    }
    
    return result.slice(0, expectedCount);
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
   * 2つの文章が連続的（つながっている）かどうかを判定
   */
  private isSequentialText(prevText: string, currentText: string): boolean {
    // 明らかな連続パターンを検出
    const sequentialPatterns = [
      // 代名詞での継続
      /^(でも|だから|それで|そして|また|さらに)/,
      // 接続詞での継続
      /^(しかし|だけど|けれど|なので|そのため)/,
      // 話の流れの継続
      /^(俺も|私も|君も|あなたも)/,
      // 時間的継続
      /^(その後|それから|次に|今度は)/
    ];
    
    // 現在のテキストが連続パターンで始まっている場合
    const startsWithSequential = sequentialPatterns.some(pattern => 
      pattern.test(currentText.trim())
    );
    
    if (startsWithSequential) {
      return true;
    }
    
    // 前のテキストの終わりと現在のテキストの始まりの文脈的関連性をチェック
    const prevWords = prevText.replace(/[。、！？]/g, '').split('').slice(-10);
    const currentWords = currentText.replace(/[。、！？]/g, '').split('').slice(0, 10);
    
    // 共通する文字が多すぎる場合（同じ話題の継続）
    let commonCount = 0;
    for (const word of currentWords) {
      if (prevWords.includes(word)) {
        commonCount++;
      }
    }
    
    // 50%以上共通している場合は連続性があると判定
    return commonCount / Math.min(prevWords.length, currentWords.length) > 0.5;
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