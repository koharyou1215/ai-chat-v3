// Memory Card Generator Service for AI Chat V3
// Automatically generates memory cards from conversation messages

import { UnifiedMessage, MemoryCard, MemoryCategory } from '@/types';
import { simpleAPIManagerV2 } from '@/services/simple-api-manager-v2';

// AI分析結果の型定義
interface MemoryAnalysisResult {
  title?: string;
  summary?: string;
  keywords?: string[];
  category?: string;
  importance_score?: number;
  emotion_tags?: string[];
  context_tags?: string[];
  [key: string]: unknown;
}

export class MemoryCardGenerator {
  /**
   * メッセージからメモリーカードを自動生成
   */
  async generateMemoryCard(
    messages: UnifiedMessage[],
    session_id: string,
    _character_id?: string
  ): Promise<Partial<MemoryCard>> {
    if (messages.length === 0) {
      throw new Error('No messages provided for memory card generation');
    }

    const content = this.formatMessagesForAnalysis(messages);
    
    try {
      // AI分析プロンプト
      const analysisPrompt = `
以下の会話内容を分析して、メモリーカードの情報を生成してください。

会話内容:
${content}

以下のJSON形式で出力してください:
{
  "title": "短い要約タイトル（20文字以内）",
  "summary": "会話の要約（100-200文字）",
  "keywords": ["キーワード1", "キーワード2", "キーワード3"],
  "category": "カテゴリー（personal_info/preference/event/relationship/promise/important_date/emotion/decision/knowledge/other）",
  "importance_score": 0.7,
  "emotion_tags": ["感情タグ1", "感情タグ2"],
  "context_tags": ["文脈タグ1", "文脈タグ2"]
}

重要度スコア（importance_score）は以下の基準で判定:
- 0.9-1.0: 極めて重要（約束、重要な決定、感情的な出来事）
- 0.7-0.8: 重要（個人情報、好み、関係性の変化）
- 0.5-0.6: 普通（一般的な会話、質問応答）
- 0.3-0.4: 軽微（雑談、挨拶）

カテゴリーの選択基準:
- personal_info: 個人的な情報（名前、年齢、職業等）
- preference: 好みや嗜好
- event: 出来事や体験
- relationship: 関係性に関する内容
- promise: 約束や予定
- important_date: 重要な日付
- emotion: 感情的な内容
- decision: 決定事項
- knowledge: 知識・情報
- other: その他
`;

      console.log('[MemoryCard] Generating memory card analysis...');
      const response = await simpleAPIManagerV2.generateMessage(analysisPrompt, '', [], { 
        max_tokens: 1024,
        temperature: 0.3
      });
      console.log('[MemoryCard] Raw API response:', response);

      // JSON解析
      const analysisResult = this.parseAnalysisResult(response);

      if (!analysisResult) {
        console.warn('[MemoryCard] Failed to parse analysis result, using fallback.');
        return this.generateFallbackMemoryCard(messages, content);
      }
      
      return {
        title: analysisResult.title || this.generateFallbackTitle(messages),
        summary: analysisResult.summary || this.generateFallbackSummary(messages),
        keywords: analysisResult.keywords || this.extractFallbackKeywords(content),
        category: this.validateCategory(analysisResult.category),
        original_content: content,
        importance: {
          score: Math.max(0.1, Math.min(1.0, analysisResult.importance_score || 0.5)),
          factors: {
            emotional_weight: this.calculateEmotionalWeight(content),
            repetition_count: this.calculateRepetitionCount(messages),
            user_emphasis: this.calculateUserEmphasis(content),
            ai_judgment: analysisResult.importance_score || 0.5
          }
        },
        confidence: 0.8,
        emotion_tags: (analysisResult.emotion_tags || []).map(tag => ({ emotion: tag, intensity: 0.5})),
        context_tags: analysisResult.context_tags || [],
        auto_tags: ['auto-generated', 'ai-analyzed', `session-${session_id.slice(-8)}`]
      };

    } catch (error) {
      console.error('Failed to generate memory card with AI:', error);
      // フォールバック処理
      return this.generateFallbackMemoryCard(messages, content);
    }
  }

  /**
   * メッセージを分析用にフォーマット
   */
  private formatMessagesForAnalysis(messages: UnifiedMessage[]): string {
    return messages.map(msg => {
      const role = msg.role === 'user' ? 'ユーザー' : 'アシスタント';
      const timestamp = new Date(msg.created_at).toLocaleString('ja-JP');
      return `[${timestamp}] ${role}: ${msg.content}`;
    }).join('\n');
  }

  /**
   * AI分析結果をパース
   */
  private parseAnalysisResult(response: string): MemoryAnalysisResult | null {
    try {
      // JSONブロックを抽出
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // JSONブロックが見つからない場合、手動パース
      return this.manualParseResponse(response);
    } catch (error) {
      console.warn('[MemoryCard] JSON parse failed, using manual parse:', error);
      return this.manualParseResponse(response);
    }
  }

  /**
   * 手動レスポンスパース（JSONが失敗した場合）
   */
  private manualParseResponse(response: string): MemoryAnalysisResult {
    const result: MemoryAnalysisResult = {};
    
    // タイトル抽出
    const titleMatch = response.match(/title[\"']?\s*:\s*[\"']([^\"']+)["']/i);
    if (titleMatch) result.title = titleMatch[1];
    
    // 要約抽出
    const summaryMatch = response.match(/summary[\"']?\s*:\s*[\"']([^\"']+)["']/i);
    if (summaryMatch) result.summary = summaryMatch[1];
    
    // カテゴリー抽出
    const categoryMatch = response.match(/category[\"']?\s*:\s*[\"']([^\"']+)["']/i);
    if (categoryMatch) result.category = categoryMatch[1];
    
    // 重要度抽出
    const importanceMatch = response.match(/importance_score[\"']?\s*:\s*([0-9.]+)/i);
    if (importanceMatch) result.importance_score = parseFloat(importanceMatch[1]);
    
    return result;
  }

  /**
   * カテゴリーの検証
   */
  private validateCategory(category: string | undefined): MemoryCategory {
    const validCategories: MemoryCategory[] = [
      'personal_info', 'preference', 'event', 'relationship', 'promise',
      'important_date', 'emotion', 'decision', 'knowledge', 'other'
    ];
    
    return validCategories.includes(category as MemoryCategory) ? category as MemoryCategory : 'other';
  }

  /**
   * フォールバック用のメモリーカード生成
   */
  private generateFallbackMemoryCard(messages: UnifiedMessage[], content: string): Partial<MemoryCard> {
    return {
      title: this.generateFallbackTitle(messages),
      summary: this.generateFallbackSummary(messages),
      keywords: this.extractFallbackKeywords(content),
      category: 'other',
      original_content: content,
      importance: {
        score: 0.5,
        factors: {
          emotional_weight: this.calculateEmotionalWeight(content),
          repetition_count: this.calculateRepetitionCount(messages),
          user_emphasis: 0.5,
          ai_judgment: 0.5
        }
      },
      confidence: 0.6,
      emotion_tags: [],
      context_tags: ['fallback-generated'],
      auto_tags: ['auto-generated', 'fallback']
    };
  }

  /**
   * フォールバック用タイトル生成
   */
  private generateFallbackTitle(messages: UnifiedMessage[]): string {
    const date = new Date().toLocaleDateString('ja-JP');
    const messageCount = messages.length;
    
    // 最初のメッセージから推測
    const firstMessage = messages[0];
    if (firstMessage && firstMessage.content.length > 0) {
      const preview = firstMessage.content.substring(0, 15);
      return `${preview}... (${messageCount}件の会話)`;
    }
    
    return `会話の記録 ${date} (${messageCount}件)`;
  }

  /**
   * フォールバック用要約生成
   */
  private generateFallbackSummary(messages: UnifiedMessage[]): string {
    console.log('[MemoryCard] Using fallback summary generation');
    
    // 最新のメッセージから内容を抽出
    const recentMessages = messages.slice(-3); // 最新の3件
    const contentPreview = recentMessages
      .map(m => m.content.slice(0, 30))
      .join('、')
      .slice(0, 80);
    
    if (contentPreview.length > 10) {
      return `${contentPreview}...についての会話`;
    }
    
    return '最近の会話の記録';
  }

  /**
   * フォールバック用キーワード抽出
   */
  private extractFallbackKeywords(content: string): string[] {
    // 簡単な単語頻度分析
    const words = content
      .replace(/[。、！？\n\r]/g, ' ')
      .split(/\s+/) 
      .filter(w => w.length > 1)
      .map(w => w.trim());
    
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    // 頻度順でソートして上位5つを返す
    const sortedWords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
    
    return sortedWords.length > 0 ? sortedWords : ['会話', '対話', '記録'];
  }

  /**
   * 感情重み計算
   */
  private calculateEmotionalWeight(content: string): number {
    const emotionalWords = ['嬉しい', '悲しい', '怒り', '驚き', '恐れ', '好き', '嫌い', '愛', '心配', '安心'];
    const emotionalChars = ['！', '？', '♪', '♡', '💕', '😊', '😢', '😠'];
    
    let score = 0;
    emotionalWords.forEach(word => {
      score += (content.match(new RegExp(word, 'g')) || []).length * 0.1;
    });
    
    emotionalChars.forEach(char => {
      score += (content.match(new RegExp(char.replace(/[.*+?^${}()|[\\]/g, '\\$&'), 'g')) || []).length * 0.05;
    });
    
    return Math.min(1.0, score);
  }

  /**
   * 繰り返し回数計算
   */
  private calculateRepetitionCount(messages: UnifiedMessage[]): number {
    const contents = messages.map(m => m.content.toLowerCase());
    let repetitions = 0;
    
    for (let i = 0; i < contents.length - 1; i++) {
      for (let j = i + 1; j < contents.length; j++) {
        const similarity = this.calculateSimilarity(contents[i], contents[j]);
        if (similarity > 0.7) {
          repetitions++;
        }
      }
    }
    
    return Math.min(1.0, repetitions / Math.max(1, messages.length));
  }

  /**
   * ユーザー強調度計算
   */
  private calculateUserEmphasis(content: string): number {
    const emphasisMarkers = ['重要', '大切', '絶対', '必ず', '忘れないで', '覚えて'];
    const capsWords = content.match(/[A-Z]{2,}/g) || [];
    const exclamations = (content.match(/！+/g) || []).length;
    
    let score = 0;
    emphasisMarkers.forEach(marker => {
      score += (content.match(new RegExp(marker, 'g')) || []).length * 0.2;
    });
    
    score += capsWords.length * 0.1;
    score += exclamations * 0.05;
    
    return Math.min(1.0, score);
  }

  /**
   * 文字列類似度計算（簡易版）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * レーベンシュタイン距離計算
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

export const memoryCardGenerator = new MemoryCardGenerator();
