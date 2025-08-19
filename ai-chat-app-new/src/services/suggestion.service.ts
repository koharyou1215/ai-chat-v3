import { geminiClient } from './api/gemini-client';
import { useAppStore } from '@/store';

export interface ReplyRequest {
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  characterId?: string;
  personaId?: string;
}

export interface ReplySuggestion {
  id: string;
  type: 'empathy' | 'exploration' | 'provocative' | 'affection';
  content: string;
}

export interface TextEnhancementRequest {
  text: string;
  characterId?: string;
  personaId?: string;
}

export class SuggestionService {
  /**
   * 返信提案を生成
   */
  async generateReplySuggestions(request: ReplyRequest): Promise<ReplySuggestion[]> {
    const { current_character, current_persona, systemPrompts } = useAppStore.getState();
    
    // 設定からプロンプトを取得し、{{conversation}}を実際の会話履歴に置換
    const conversationText = request.conversationHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    
    const systemPrompt = systemPrompts.replySuggestion.replace('{{conversation}}', conversationText);

    try {
      const response = await geminiClient.generateMessage({
        user_message: systemPrompt,
        character: current_character,
        persona: current_persona,
        conversation_history: [],
        generation_options: {
          temperature: 0.8,
          max_length: 800
        }
      });

      // レスポンスをパースして4つの提案に分割
      return this.parseReplySuggestions(response.content);
    } catch (error) {
      console.error('返信提案生成エラー:', error);
      throw error;
    }
  }

  /**
   * 文章強化
   */
  async enhanceText(request: TextEnhancementRequest): Promise<string> {
    const { current_character, current_persona, systemPrompts } = useAppStore.getState();
    
    // 設定からプロンプトを取得し、{{user}}を実際のテキストに置換
    const systemPrompt = systemPrompts.textEnhancement.replace('{{user}}', request.text);

    try {
      const response = await geminiClient.generateMessage({
        user_message: systemPrompt,
        character: current_character,
        persona: current_persona,
        conversation_history: [],
        generation_options: {
          temperature: 0.7,
          max_length: 400
        }
      });

      return response.content;
    } catch (error) {
      console.error('文章強化エラー:', error);
      throw error;
    }
  }

  /**
   * 返信提案をパース
   */
  private parseReplySuggestions(content: string): ReplySuggestion[] {
    const suggestions: ReplySuggestion[] = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    const types: ReplySuggestion['type'][] = ['empathy', 'exploration', 'provocative', 'affection'];
    let currentIndex = 0;
    
    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        // 番号付きの行をスキップ
        continue;
      }
      
      if (line.trim() && !line.includes('[') && !line.includes(']') && currentIndex < 4) {
        suggestions.push({
          id: `suggestion_${Date.now()}_${currentIndex}`,
          type: types[currentIndex],
          content: line.trim()
        });
        currentIndex++;
      }
    }
    
    // フォールバック提案
    while (suggestions.length < 4) {
      suggestions.push({
        id: `fallback_${Date.now()}_${suggestions.length}`,
        type: types[suggestions.length],
        content: 'そうですね...'
      });
    }
    
    return suggestions;
  }
}

// シングルトンインスタンス
export const suggestionService = new SuggestionService();