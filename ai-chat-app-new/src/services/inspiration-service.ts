// Inspiration Service v3 - 成功例を基にした改良版
// 返信提案と文章強化機能のためのサービス

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
    apiConfig?: Partial<APIConfig> & { openRouterApiKey?: string; geminiApiKey?: string }
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
      // Starting reply suggestion API call
      
      const response = await apiRequestQueue.enqueueInspirationRequest(async () => {
        const result = await apiManager.generateMessage(
          prompt,
          '返信提案を生成',
          [],
          { 
            ...apiConfig, 
            max_tokens: 800,
            // 🔧 **認可されたモデルのみ使用**
            model: 'gemini-2.5-flash', 
            provider: 'gemini'
          }
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
    } catch (error: any) {
      console.error('❌ 返信提案生成エラー:', error);
      
      // エラーメッセージの詳細をログ
      if (error?.message) {
        console.error('エラーメッセージ:', error.message);
        
        // 🔧 **無効なモデルIDエラーのハンドリング**
        if (error.message.includes('is not a valid model') || 
            error.message.includes('not a valid model ID') || 
            error.message.includes('model not found')) {
          
          console.warn('⚠️ 無効なモデルIDを検出。安定したモデルで再試行します。');
          
          try {
            const fallbackResponse = await apiRequestQueue.enqueueInspirationRequest(async () => {
              return apiManager.generateMessage(
                prompt,
                '返信提案を生成（フォールバック）',
                [],
                { 
                  ...apiConfig, 
                  model: 'gemini-2.5-flash', // 安定したモデルに変更
                  provider: 'gemini',
                  max_tokens: 800 
                }
              );
            });
            
            const fallbackSuggestions = this.parseReplySuggestionsAdvanced(fallbackResponse);
            if (fallbackSuggestions.length > 0) {
              console.log('✅ フォールバックモデルでの再試行が成功しました');
              return fallbackSuggestions;
            }
          } catch (fallbackError) {
            console.error('❌ フォールバックも失敗:', fallbackError);
          }
          
          return [
            {
              id: `model_error_${Date.now()}_0`,
              type: 'empathy' as const,
              content: '使用中のモデルが更新されました。設定を確認してください。',
              confidence: 0.4
            },
            {
              id: `model_error_${Date.now()}_1`,
              type: 'question' as const,
              content: 'モデル設定で最新のバージョンを選択することをお勧めします。',
              confidence: 0.4
            },
            {
              id: `model_error_${Date.now()}_2`,
              type: 'topic' as const,
              content: '一時的にデフォルトのモデルを使用しています。',
              confidence: 0.4
            }
          ];
        }
        
        // レート制限やクォータエラーの場合
        if (error.message.includes('Quota exceeded') || 
            error.message.includes('Rate limit') || 
            error.message.includes('429') || 
            error.message.includes('Too many requests') || 
            error.message.includes('requests per minute')) {
          
          console.warn('⚠️ Gemini API制限に達しました。フォールバック処理を実行します。');
          
          // OpenRouterキーが利用可能な場合、OpenRouter経由で再試行
          if (apiConfig?.openRouterApiKey) {
            console.log('🔄 OpenRouter経由で再試行中...');
            try {
              const fallbackResponse = await apiRequestQueue.enqueueInspirationRequest(async () => {
                return apiManager.generateMessage(
                  prompt,
                  '返信提案を生成（OpenRouter経由）',
                  [],
                  { 
                    ...apiConfig, 
                    provider: 'openrouter', 
                    model: 'google/gemini-2.5-flash', // 安定したモデルを使用
                    max_tokens: 800 
                  }
                );
              });
              const fallbackSuggestions = this.parseReplySuggestionsAdvanced(fallbackResponse);
              if (fallbackSuggestions.length > 0) {
                console.log('✅ OpenRouter経由での再試行が成功しました');
                return fallbackSuggestions;
              }
            } catch (fallbackError) {
              console.warn('OpenRouter経由の再試行も失敗:', fallbackError);
            }
          }
          
          // エラー固有のフォールバック
          return [
            {
              id: `quota_${Date.now()}_0`,
              type: 'empathy' as const,
              content: 'APIクォータ制限のため、一時的に利用できません。しばらく待ってお試しください。',
              confidence: 0.4
            },
            {
              id: `quota_${Date.now()}_1`,
              type: 'question' as const,
              content: '設定でOpenRouterキーを追加すると、より安定して利用できます。',
              confidence: 0.4
            },
            {
              id: `quota_${Date.now()}_2`,
              type: 'topic' as const,
              content: 'API制限の間は、手動で返信内容をお考えください。',
              confidence: 0.4
            }
          ];
        }
        
        // JSONパースエラーの場合
        if (error.message.includes('JSON')) {
          console.warn('⚠️ レスポンスの解析に失敗しました。');
        }
      }
      
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
    apiConfig?: Partial<APIConfig> & { openRouterApiKey?: string; geminiApiKey?: string }
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
          { 
            ...apiConfig, 
            max_tokens: 400,
            model: 'gemini-2.5-flash', // 安定したモデル
            provider: 'gemini'
          }
        );
      });

      return this.parseEnhancedText(response, inputText);
    } catch (error) {
      console.error('文章強化エラー:', error);
      throw new Error('文章強化に失敗しました');
    }
  }

  /**
   * 高度な返信提案パース（成功例から移植）
   */
  private parseReplySuggestionsAdvanced(content: string): InspirationSuggestion[] {
    // Parsing AI response
    
    const suggestions: InspirationSuggestion[] = [];
    const types: ('empathy' | 'question' | 'topic')[] = ['empathy', 'question', 'topic'];
    
    try {
      // JSONレスポンスをパースする試み
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        try {
          // コメントや余分な文字を削除してからパース
          let cleanedContent = content.trim()
            .replace(/^```json\s*/i, '') // ```json プレフィックスを削除
            .replace(/```\s*$/i, '') // ``` サフィックスを削除
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 制御文字を削除
            .replace(/\r\n/g, '\n'); // 改行文字を統一
          
          // 不正なJSON構造を修正
          cleanedContent = cleanedContent
            .replace(/,\s*([}\]])/g, '$1') // オブジェクトや配列の末尾のカンマを削除
            .replace(/([^\\])\\(?!["\\/bfnrtu])/g, '$1\\\\') // 不正なエスケープシーケンスを修正
            .replace(/\n/g, '\\n') // 改行文字をエスケープ
            .replace(/\t/g, '\\t') // タブ文字をエスケープ
            .replace(/\r/g, '\\r') // キャリッジリターンをエスケープ
            .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // クォートなしプロパティ名を修正
            .replace(/([{,]\s*)'([^']*)'\s*:/g, '$1"$2":') // シングルクォートをダブルクォートに変換
            .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*'([^']*)'/g, '$1"$2": "$3"') // 値のシングルクォートも修正
            .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^",}\]]+)([,}\]])/g, '$1"$2": "$3"$4') // 値にクォートがない場合を修正
          
          let jsonData;
          try {
            jsonData = JSON.parse(cleanedContent);
          } catch (parseError) {
            console.log('JSONパース失敗、フォールバック処理を実行:', parseError);
            console.log('パース対象（先頭500文字）:', cleanedContent.substring(0, 500));
            // JSON構文エラーの場合、フォールバック処理に移行（テキスト解析へ）
            return this.parseReplySuggestionsFromText(content);
          }
          
          // 配列形式の場合
          if (Array.isArray(jsonData)) {
            jsonData.forEach((item, index) => {
              if (index < 3) {
                const content = item.content || item.text || (typeof item === 'string' ? item : null);
                if (content) {
                  suggestions.push({
                    id: `suggestion_${Date.now()}_${index}`,
                    type: item.type || types[index] || 'topic',
                    content: String(content).trim(),
                    confidence: item.confidence || 0.8
                  });
                }
              }
            });
            
            if (suggestions.length > 0) {
              // Extracted suggestions from JSON array
              return suggestions;
            }
          }
          
          // オブジェクト形式の場合
          if (jsonData.suggestions && Array.isArray(jsonData.suggestions)) {
            jsonData.suggestions.forEach((item: any, index: number) => {
              if (index < 3 && item) {
                const content = item.content || item.text || (typeof item === 'string' ? item : null);
                if (content && String(content).trim()) {
                  suggestions.push({
                    id: `suggestion_${Date.now()}_${index}`,
                    type: item.type || types[index] || 'topic',
                    content: String(content).trim(),
                    confidence: item.confidence || 0.8
                  });
                }
              }
            });
            
            if (suggestions.length > 0) {
              // Extracted suggestions from JSON object
              return suggestions;
            }
          }
        } catch (jsonError) {
          console.log('JSONパース失敗、テキスト形式として処理:', jsonError);
        }
      }
    } catch (error) {
      console.log('JSONパース処理でエラー、テキスト形式として処理:', error);
    }
    
    return this.parseReplySuggestionsFromText(content);
  }

  /**
   * テキスト形式の返信提案パース
   */
  private parseReplySuggestionsFromText(content: string): InspirationSuggestion[] {
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
      // Detected numbered list
      
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
      // Detected bracket format
      
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
      // Detected line-separated format
      
      lines.slice(0, 3).forEach((text, index) => {
        suggestions.push({
          id: `suggestion_${Date.now()}_${index}`,
          type: types[index],
          content: text,
          confidence: 0.7
        });
      });
    }
    
    // Extraction complete
    return suggestions;
  }

  /**
   * 会話コンテキストの構築
   */
  private buildContext(messages: UnifiedMessage[], isGroupMode?: boolean): string {
    const recentMessages = messages.slice(-6);
    
    return recentMessages.map(msg => {
      if (isGroupMode) {
        const speaker = msg.role === 'user' 
          ? 'ユーザー'
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

  // Export singleton instance
  static getInstance(): InspirationService {
    if (!InspirationService.instance) {
      InspirationService.instance = new InspirationService();
    }
    return InspirationService.instance;
  }

  private static instance: InspirationService;
}

// Export default instance
export const inspirationService = InspirationService.getInstance();