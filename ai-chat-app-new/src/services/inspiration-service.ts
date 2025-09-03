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
        // 🔧 **NEW: 統一されたAPI routing使用**
        const result = await apiManager.generateMessageUnified(
          prompt,
          '返信提案を生成',
          [],
          { 
            strategy: 'auto-optimal', // 自動で最適ルート選択
            textFormatting: 'readable',
            temperature: apiConfig?.temperature || 0.7,
            maxTokens: 800,
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
        
        // 🔧 **無効なモデルIDエラーのハンドリング** - モデル自動移行を実行
        if (error.message.includes('is not a valid model') || 
            error.message.includes('not a valid model ID') || 
            error.message.includes('model not found') ||
            error.message.includes('gemini-1.5-flash-8b')) {
          
          console.warn('⚠️ 無効なモデルIDを検出。モデル移行を強制実行して再試行します。');
          
          // 即座にモデル移行を実行
          const { migrateUserSettings } = require('@/utils/model-migration');
          try {
            migrateUserSettings();
            console.log('✅ レガシーモデル設定の自動移行を実行しました');
          } catch (migrationError) {
            console.warn('⚠️ 設定移行に失敗しましたが、デフォルトモデルで続行します');
          }
          
          try {
            const fallbackResponse = await apiRequestQueue.enqueueInspirationRequest(async () => {
              // 🔧 **NEW: 確実にサポートされたモデルで再試行**
              return apiManager.generateMessageUnified(
                prompt,
                '返信提案を生成（モデル移行後）',
                [],
                { 
                  strategy: 'gemini-direct', 
                  textFormatting: 'readable',
                  temperature: apiConfig?.temperature || 0.7,
                  maxTokens: 800,
                  // 確実にサポートされているモデルを使用
                  model: 'google/gemini-2.5-flash'
                }
              );
            });
            
            const fallbackSuggestions = this.parseReplySuggestionsAdvanced(fallbackResponse);
            if (fallbackSuggestions.length > 0) {
              console.log('✅ モデル移行後の再試行が成功しました');
              return fallbackSuggestions;
            }
          } catch (fallbackError) {
            console.error('❌ モデル移行後のフォールバックも失敗:', fallbackError);
          }
          
          return [
            {
              id: `model_migrated_${Date.now()}_0`,
              type: 'empathy' as const,
              content: 'モデル設定を最新版に自動更新しました。',
              confidence: 0.7
            },
            {
              id: `model_migrated_${Date.now()}_1`,
              type: 'question' as const,
              content: '設定画面で最新のモデル選択を確認できます。',
              confidence: 0.7
            },
            {
              id: `model_migrated_${Date.now()}_2`,
              type: 'topic' as const,
              content: '現在は最新の Gemini 2.5 Flash を使用しています。',
              confidence: 0.7
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
                // 🔧 **NEW: OpenRouter経由も統一API使用**
                return apiManager.generateMessageUnified(
                  prompt,
                  '返信提案を生成（OpenRouter経由）',
                  [],
                  { 
                    strategy: 'gemini-openrouter', // OpenRouter経由でGemini使用
                    textFormatting: 'readable',
                    temperature: apiConfig?.temperature || 0.7,
                    maxTokens: 800 
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
        // 🔧 **NEW: 文章強化も統一API使用**
        return apiManager.generateMessageUnified(
          prompt,
          '文章を強化',
          [],
          { 
            strategy: 'auto-optimal', // 自動最適ルート選択
            textFormatting: 'readable',
            temperature: apiConfig?.temperature || 0.7,
            maxTokens: 400
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
          
          // 🔧 **JSON構文エラー完全修正 - 日本語文字列対応強化**
          cleanedContent = cleanedContent
            // 基本的なクリーニング
            .replace(/,\s*([}\]])/g, '$1') // 末尾カンマ削除
            .replace(/([^\\])\\(?!["\\/bfnrtu])/g, '$1\\\\') // 不正エスケープ修正
            
            // 🔧 **日本語文字列の安全なエスケープ処理**
            .replace(/"([^"\\]*[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF][^"\\]*)"/g, (match, content) => {
              // 日本語を含む文字列内の特殊文字をエスケープ
              const escaped = content
                .replace(/\\/g, '\\\\') // バックスラッシュ
                .replace(/"/g, '\\"')     // クォート
                .replace(/\n/g, '\\n')    // 改行
                .replace(/\r/g, '\\r')    // キャリッジリターン
                .replace(/\t/g, '\\t');   // タブ
              return `"${escaped}"`;
            })
            
            // プロパティ名の修正（日本語プロパティ対応）
            .replace(/([{,]\s*)([a-zA-Z_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF][\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]*)\s*:/g, '$1"$2":')
            .replace(/([{,]\s*)'([^']*)'\s*:/g, '$1"$2":')
            
            // 値の修正（文字列以外は保護）
            .replace(/([{,]\s*"[^"]*")\s*:\s*'([^']*)'/g, '$1: "$2"')
            .replace(/([{,]\s*"[^"]*")\s*:\s*([^",}\]\s][^",}\]]*?)([,}\]])/g, (match, key, value, ending) => {
              const trimmedValue = value.trim();
              // 数値、真偽値、nullは引用符で囲まない
              if (/^(true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)$/.test(trimmedValue)) {
                return `${key}: ${trimmedValue}${ending}`;
              }
              // その他は文字列として扱う
              return `${key}: "${trimmedValue.replace(/"/g, '\\"')}"${ending}`;
            })
            
            // 最終クリーニング
            .replace(/\s+/g, ' ') // 余分な空白削除
            .trim()
          
          let jsonData;
          try {
            jsonData = JSON.parse(cleanedContent);
            console.log('✅ JSON解析成功');
          } catch (parseError: any) {
            // 🔧 **JSON構文エラーの詳細ログと安全なフォールバック**
            console.warn('⚠️ JSON構文エラー詳細:', {
              error: parseError?.message || parseError,
              position: parseError?.message?.match(/position (\d+)/)?.[1] || 'unknown',
              contentLength: cleanedContent.length,
              contentSample: cleanedContent.substring(0, 200) + '...'
            });
            
            // 一般的なJSON構文エラーを修復する最後の試み
            const lastAttemptContent = cleanedContent
              .replace(/([{,]\s*)([^"\s:]+)(\s*:)/g, '$1"$2"$3') // プロパティ名の引用符補完
              .replace(/:\s*([^"\d\[{},\s][^,}\]]*)/g, ': "$1"') // 値の引用符補完
              .replace(/"(true|false|null|\d+(?:\.\d+)?)\"([,}\]])/g, '$1$2') // 引用符で囲まれた数値・真偽値の修正
              .replace(/,\s*}/g, '}') // 最終チェック: 末尾カンマ削除
              .replace(/,\s*]/g, ']');
              
            try {
              jsonData = JSON.parse(lastAttemptContent);
              console.log('✅ JSON構文修復成功');
            } catch (finalParseError) {
              console.log('❌ JSON構文修復も失敗。テキスト解析へフォールバック');
              return this.parseReplySuggestionsFromText(content);
            }
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