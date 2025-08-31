// Inspiration Service v2 - Simplified & Reliable
// 返信提案と文章強化機能のためのシンプルなサービス

import { UnifiedMessage } from '@/types/memory';
import { apiManager } from '@/services/api-manager';
import { apiRequestQueue } from '@/services/api-request-queue';
import { APIConfig, Character, Persona } from '@/types';

export interface InspirationSuggestion {
  id: string;
  type: 'empathy' | 'question' | 'topic';
  content: string;
  confidence: number;
}

export class InspirationService {
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
      prompt = customPrompt.replace(/{{conversation}}/g, context);
    } else {
      prompt = this.buildReplySuggestionPrompt(context, character, user, isGroupMode);
    }

    try {
      const response = await apiRequestQueue.enqueueInspirationRequest(async () => {
        console.log('📤 API呼び出し開始');
        const result = await apiManager.generateMessage(
          prompt,
          '返信提案を生成',
          [],
          { ...apiConfig, max_tokens: 600 }
        );
        console.log('📥 API応答受信:', result.substring(0, 200));
        return result;
      });

      return this.parseReplySuggestions(response);
    } catch (error) {
      console.error('❌ 返信提案生成エラー:', error);
      console.error('詳細:', {
        errorMessage: error instanceof Error ? error.message : String(error),
        apiConfig: apiConfig?.model || 'default',
        isGroupMode
      });
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
      throw new Error('入力テキストが空です');
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

    try {
      const response = await apiRequestQueue.enqueueInspirationRequest(async () => {
        return apiManager.generateMessage(
          prompt,
          '文章を強化',
          [],
          { ...apiConfig, max_tokens: 400 }
        );
      });

      return this.parseEnhancedText(response, inputText);
    } catch (error) {
      console.error('文章強化エラー:', error);
      throw new Error('文章強化に失敗しました');
    }
  }

  /**
   * 会話コンテキストの構築
   */
  private buildContext(messages: UnifiedMessage[], isGroupMode?: boolean): string {
    const recentMessages = messages.slice(-6);
    
    return recentMessages.map(msg => {
      if (isGroupMode) {
        const speaker = msg.role === 'user' 
          ? (msg.user_name || 'ユーザー')
          : (msg.character_name || 'キャラクター');
        return `${speaker}: ${msg.content}`;
      } else {
        const role = msg.role === 'user' ? 'ユーザー' : 'キャラクター';
        return `${role}: ${msg.content}`;
      }
    }).join('\n');
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
    const target = isGroupMode ? 'グループ全体' : character.name;
    
    return `${speaker}として${target}への返信を3パターン生成してください。

会話履歴:
${context}

以下3つのアプローチで各150文字程度の返信を生成:

1. 【共感・受容】相手の気持ちに寄り添い理解を示す
2. 【質問・探求】興味を持って質問し会話を深める  
3. 【トピック展開】新しい視点や話題を提供する

出力形式:
1: [共感・受容の返信]
2: [質問・探求の返信]
3: [トピック展開の返信]

条件: 返信文のみ出力、説明や番号は含めない`;
  }

  /**
   * 文章強化プロンプトの構築
   */
  private buildEnhancementPrompt(
    inputText: string,
    context: string, 
    user: Persona
  ): string {
    return `以下の文章を${user.name}のトーンで自然に強化してください。

会話履歴:
${context}

強化対象: "${inputText}"

条件:
- 元の意味を保持
- ${user.name}らしい表現に調整
- 自然で読みやすく
- 強化された文章のみ出力`;
  }

  /**
   * 返信提案のパース
   */
  private parseReplySuggestions(response: string): InspirationSuggestion[] {
    console.log('🔍 AI応答をパース中:', response.substring(0, 200));
    
    const lines = response.split('\n').filter(line => line.trim());
    const suggestions: InspirationSuggestion[] = [];
    
    const types: ('empathy' | 'question' | 'topic')[] = ['empathy', 'question', 'topic'];
    
    for (const line of lines) {
      // より柔軟なパターンマッチング
      let content = line
        .replace(/^[1-3][\.:：]\s*/, '')  // 1: 1. 1：など
        .replace(/^【[^】]+】\s*/, '')     // 【共感・受容】など
        .replace(/^[\[「『]/, '')          // 開始記号
        .replace(/[\]」』]$/, '')          // 終了記号
        .trim();
      
      // 有効な提案をチェック（10文字以上、200文字以下）
      if (content.length >= 10 && content.length <= 200 && !content.includes('：')) {
        if (suggestions.length < 3) {
          suggestions.push({
            id: `suggestion_${Date.now()}_${suggestions.length}`,
            type: types[suggestions.length],
            content,
            confidence: 0.8
          });
        }
      }
    }
    
    console.log(`✅ ${suggestions.length}個の提案を抽出`);
    
    // 1つでも取得できればOK、0個ならフォールバック
    return suggestions.length > 0 ? suggestions : this.getFallbackSuggestions();
  }

  /**
   * 強化テキストのパース
   */
  private parseEnhancedText(response: string, fallback: string): string {
    const cleaned = response
      .replace(/^強化された文章:\s*/, '')
      .replace(/^出力:\s*/, '')
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
        type: 'empathy',
        content: 'そうですね、よくわかります。',
        confidence: 0.6
      },
      {
        id: `fallback_${Date.now()}_1`, 
        type: 'question',
        content: 'もう少し詳しく聞かせてください。',
        confidence: 0.6
      },
      {
        id: `fallback_${Date.now()}_2`,
        type: 'topic', 
        content: 'とても興味深いお話ですね。',
        confidence: 0.6
      }
    ];
  }
}