// Inspiration Service v3 - 成功例を基にした改良版
// 返信提案と文章強化機能のためのサービス

import { UnifiedMessage } from '@/types/memory';
import { simpleAPIManagerV2 } from '@/services/simple-api-manager-v2';
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
      prompt = this.buildReplySuggestionPrompt(context, character, user, isGroupMode);
    }

    try {
      console.log('📤 返信提案API呼び出し開始');
      
      const response = await apiRequestQueue.enqueueInspirationRequest(async () => {
        const result = await simpleAPIManagerV2.generateMessage(
          prompt,
          '返信提案を生成',
          [],
          { ...apiConfig, max_tokens: 800 }
        );
        console.log('📥 API応答受信（先頭200文字）:', result.substring(0, 200));
        return result;
      });

      // 成功例のパース方法を採用
      const suggestions = this.parseReplySuggestionsAdvanced(response);
      
      if (suggestions.length === 0) {
        console.warn('⚠️ 提案を抽出できませんでした。フォールバックを使用');
        return this.getFallbackSuggestions();
      }
      
      return suggestions;
    } catch (error) {
      console.error('❌ 返信提案生成エラー:', error);
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
      console.log('📝 文章強化リクエスト:', {
        inputTextLength: inputText.length,
        contextLength: context.length,
        promptLength: prompt.length,
        apiConfig
      });
      
      // プロンプトを大幅に短縮してトークン制限を回避（500文字まで）
      const truncatedPrompt = prompt.length > 500 ? 
        `文章強化: "${inputText}"\n${user.name}らしく拡張。` : 
        prompt;
      
      const response = await apiRequestQueue.enqueueInspirationRequest(async () => {
        return simpleAPIManagerV2.generateMessage(
          truncatedPrompt,
          '文章を強化',
          [],
          { ...apiConfig, max_tokens: 200 }  // トークン数も大幅削減
        );
      });

      const enhancedText = this.parseEnhancedText(response, inputText);
      console.log('✅ 文章強化成功:', {
        originalLength: inputText.length,
        enhancedLength: enhancedText.length
      });
      
      return enhancedText;
    } catch (error: any) {
      console.error('❌ 文章強化エラー:', {
        error: error.message || error,
        inputText,
        promptLength: prompt.length,
        apiConfig
      });
      
      // より詳細なエラーメッセージを提供
      if (error.message?.includes('OpenRouter')) {
        throw new Error(`文章強化に失敗しました: ${error.message}。APIキーの設定を確認してください。`);
      } else if (error.message?.includes('Gemini')) {
        throw new Error(`文章強化に失敗しました: ${error.message}`);
      } else {
        throw new Error(`文章強化に失敗しました: ${error.message || '不明なエラー'}`);
      }
    }
  }

  /**
   * 高度な返信提案パース（成功例から移植）
   */
  private parseReplySuggestionsAdvanced(content: string): InspirationSuggestion[] {
    console.log('🔍 AI応答をパース中（先頭200文字）:', content.substring(0, 200));
    
    const suggestions: InspirationSuggestion[] = [];
    const types: ('empathy' | 'question' | 'topic')[] = ['empathy', 'question', 'topic'];
    
    // 1. まず番号付きリスト（1. 2. 3.）で分割を試行
    const numberedSections = content.split(/(?=\d+\.)/);
    const validNumberedSections = numberedSections
      .filter(section => section.trim().match(/^\d+\./))
      .map(section => {
        // 番号と改行を削除してクリーンなテキストを取得
        return section
          .replace(/^\d+\.\s*/, '')
          .replace(/^【[^】]+】\s*/, '')
          .replace(/^[\[「『]/, '')
          .replace(/[\]」』]$/, '')
          .trim();
      })
      .filter(text => text.length >= 10 && text.length <= 250);
    
    if (validNumberedSections.length > 0) {
      console.log(`✅ 番号付きリストを検出: ${validNumberedSections.length}件`);
      
      validNumberedSections.forEach((text, index) => {
        if (index < 3) {
          suggestions.push({
            id: `suggestion_${Date.now()}_${index}`,
            type: types[index],
            content: text,
            confidence: 0.9
          });
        }
      });
      
      return suggestions;
    }
    
    // 2. 番号がない場合、［タイトル］形式で抽出
    const bracketPattern = /\[([^\]]+)\]\s*([\s\S]*?)(?=\[|$)/g;
    const bracketMatches = [...content.matchAll(bracketPattern)];
    
    if (bracketMatches.length > 0) {
      console.log(`✅ ブラケット形式を検出: ${bracketMatches.length}件`);
      
      bracketMatches.forEach((match, index) => {
        if (index < 3) {
          const title = match[1];
          const contentAfterTitle = match[2]?.trim() || '';
          
          // タイトルと内容を組み合わせるか、内容のみを使用
          const text = contentAfterTitle || title;
          
          if (text.length >= 10 && text.length <= 250) {
            suggestions.push({
              id: `suggestion_${Date.now()}_${index}`,
              type: types[index],
              content: text,
              confidence: 0.8
            });
          }
        }
      });
      
      return suggestions;
    }
    
    // 3. 改行で分割してパース（フォールバック）
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length >= 10 && line.length <= 250)
      .filter(line => !line.includes('：') && !line.includes(':'));
    
    if (lines.length > 0) {
      console.log(`✅ 改行区切りで検出: ${lines.length}件`);
      
      lines.slice(0, 3).forEach((text, index) => {
        suggestions.push({
          id: `suggestion_${Date.now()}_${index}`,
          type: types[index],
          content: text,
          confidence: 0.7
        });
      });
    }
    
    console.log(`📊 最終的に${suggestions.length}個の提案を抽出`);
    return suggestions;
  }

  /**
   * 会話コンテキストの構築
   */
  private buildContext(messages: UnifiedMessage[], isGroupMode?: boolean): string {
    // コンテキストを短縮（最新3メッセージのみ、各メッセージ最大100文字）
    const recentMessages = messages.slice(-3);
    
    return recentMessages.map(msg => {
      const content = msg.content.length > 100 ? 
        msg.content.substring(0, 100) + '...' : 
        msg.content;
      
      if (isGroupMode) {
        const speaker = msg.role === 'user' 
          ? ((msg.metadata as any)?.user_name || 'ユーザー')
          : (msg.character_name || 'キャラクター');
        return `${speaker}: ${content}`;
      } else {
        const role = msg.role === 'user' ? 'ユーザー' : 'キャラクター';
        return `${role}: ${content}`;
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
    
    return `${speaker}として${target}への返信を3つ生成してください。

会話履歴:
${context}

以下の形式で3つの返信を生成してください：

1. 相手の気持ちに寄り添い理解を示す返信（100-150文字）
2. 興味を持って質問し会話を深める返信（100-150文字）  
3. 新しい視点や話題を提供する返信（100-150文字）

注意事項：
- 各返信は番号（1. 2. 3.）で始めること
- 説明や見出しは不要、返信文のみ
- ${speaker}の性格を反映させること`;
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
    return `文章を自然に強化:
"${inputText}"

${user.name}らしく、元の意味を保持して拡張。
強化された文章のみ出力。`;
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