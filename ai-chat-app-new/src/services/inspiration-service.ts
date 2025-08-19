// Inspiration Service for AI Chat V3
// Generates reply suggestions and text enhancements

import { Message, InspirationSuggestion } from '@/types/memory';
import { apiManager } from '@/services/api-manager';

export class InspirationService {
  /**
   * 会話履歴から返信候補を生成
   * @param recentMessages 直近の会話（3ラウンド）
   * @param customPrompt カスタムプロンプト（ユーザー設定）
   * @param suggestionCount 生成する候補数
   */
  async generateReplySuggestions(
    recentMessages: Message[],
    customPrompt?: string,
    suggestionCount: number = 4
  ): Promise<InspirationSuggestion[]> {
    const context = this.buildConversationContext(recentMessages);
    let prompt: string;
    let approaches: string[] = [];

    if (customPrompt) {
      // ユーザーのカスタムプロンプトからアプローチを抽出
      approaches = this.extractApproachesFromPrompt(customPrompt) || [];
      // プレースホルダーを実際の会話コンテキストで置換
      prompt = customPrompt.replace(/{{conversation}}/g, context);
    } else {
      // デフォルトのアプローチをユーザー指定のものに書き換える
      approaches = [
        '共感・受容型',
        '探求・開発型（分析・調教師型）',
        '挑発・逸脱型な返信文',
        '甘え・依存型（ヤンデレ・年下彼氏型）',
      ].slice(0, suggestionCount);
      prompt = this.buildDefaultSuggestionPrompt(context, approaches);
    }

    try {
      const responseContent = await apiManager.generateMessage(prompt, '', [], { max_tokens: 4096 });
      const suggestions = this.parseSuggestions(responseContent, approaches);
      
      // アプローチが見つからない場合でも、レスポンスをそのまま提案として返す
      if (suggestions.length === 0 && responseContent) {
        return responseContent.split('\n').filter(s => s.trim()).map((s, i) => ({
          id: `suggestion_${Date.now()}_${i}`,
          type: 'continuation',
          content: s,
          context,
          confidence: 0.7,
          source: 'pattern'
        }));
      }

      return suggestions.map((content, index) => ({
        id: `suggestion_${Date.now()}_${index}`,
        type: this.getApproachType(approaches[index] || 'continuation'),
        content,
        context,
        confidence: 0.8,
        source: 'pattern'
      }));
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      return this.generateFallbackSuggestions(recentMessages);
    }
  }

  /**
   * テキストを強化・拡張
   * @param inputText 入力されたテキスト
   * @param recentMessages 直近の会話
   * @param enhancePrompt カスタムプロンプト
   */
  async enhanceText(
    inputText: string,
    recentMessages: Message[],
    enhancePrompt?: string
  ): Promise<string> {
    const context = this.formatRecentMessages(recentMessages);
    let prompt: string;
    
    if (enhancePrompt) {
        // プレースホルダーを置換
        prompt = enhancePrompt
            .replace(/{{conversation}}/g, context)
            .replace(/{{user}}/g, inputText)
            .replace(/{{text}}/g, inputText); // {{text}} もエイリアスとして対応
    } else {
        // デフォルトの強化プロンプト
        prompt = `
以下のテキストを、会話の文脈を考慮して自然で丁寧な文章に拡張してください。
元の意図は保ちつつ、より詳細で表現豊かにしてください。

会話の文脈:
${context}

元のテキスト:
${inputText}

強化されたテキスト:
`;
    }

    try {
      const enhancedText = await apiManager.generateMessage(prompt, '', [], { max_tokens: 1024 });
      return enhancedText || inputText;
    } catch (error) {
      console.error('Failed to enhance text:', error);
      return this.fallbackEnhance(inputText);
    }
  }

  /**
   * 会話の続きを提案
   */
  async suggestContinuation(recentMessages: Message[]): Promise<InspirationSuggestion[]> {
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
        source: 'pattern'
      });
    }

    return suggestions;
  }

  /**
   * 会話コンテキストの構築
   */
  private buildConversationContext(messages: Message[]): string {
    return messages.map(msg => {
      const role = msg.sender === 'user' ? 'ユーザー' : 'アシスタント';
      return `${role}: ${msg.content}`;
    }).join('\n');
  }

  /**
   * 返信提案用プロンプトの構築（デフォルト）
   */
  private buildDefaultSuggestionPrompt(context: string, approaches: string[]): string {
    return `
以下の会話の文脈を考慮して、指定された4つの形式で返信を作成してください。

###**会話の文脈**
${context}

###**出力形式**
${approaches.map(approach => `[${approach}]`).join('\n')}

それぞれの形式に従って、具体的な返信文を生成してください。
各返信の前には、必ず対応する[テーマ]を入れてください。例: [共感・受容型]テキスト...
`;
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
    // アプローチ名をエスケープして正規表現を作成
    const escapedApproaches = approaches.map(app => 
        app.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    
    // 例: `[スマート・エスコート型]` や `[1. 共感的で温かい返信]` のようなヘッダーにマッチ
    const regex = new RegExp(`\\[(?:\\d+\\.\\s*)?(${escapedApproaches.join('|')})\\]\\s*([\\s\\S]*?)(?=\\s*\\[|$)`, 'g');
    
    let match;
    while ((match = regex.exec(content)) !== null) {
      suggestions.push(match[2].trim());
    }

    // パースに失敗した場合、単なる改行や番号付きリストで分割を試みる
    if (suggestions.length === 0) {
      return content.split(/\n\d*\.?\s*|\n\n/)
        .map(s => s.replace(/\[.*?\]/, '').trim())
        .filter(s => s.length > 5);
    }

    return suggestions;
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
  private analyzeContinuationNeeds(lastMessage: Message): InspirationSuggestion['type'][] {
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
    _messages: Message[]
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
  private generateFallbackSuggestions(messages: Message[]): InspirationSuggestion[] {
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
  private formatRecentMessages(messages: Message[]): string {
    return messages.slice(-6).map(msg => {
      const role = msg.sender === 'user' ? 'ユーザー' : 'アシスタント';
      return `${role}: ${msg.content}`;
    }).join('\n');
  }

  /**
   * 提案の品質評価
   */
  evaluateSuggestion(suggestion: InspirationSuggestion, context: Message[]): number {
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
}