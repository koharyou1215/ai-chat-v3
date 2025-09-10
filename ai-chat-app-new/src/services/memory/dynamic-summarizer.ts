// Dynamic Summarization System for AI Chat V3
// Chunk-based and hierarchical summarization with cost optimization

import { UnifiedMessage } from '@/types';
// Removed unused import

/**
 * 動的要約生成システム
 * チャンク単位での要約と階層的要約を実装
 */
export class DynamicSummarizer {
  private summaryCache: Map<string, string> = new Map();
  private chunkSize: number = 10; // 10メッセージごとに要約
  private maxSummaryLength: number = 300; // 要約の最大文字数
  
  /**
   * メッセージチャンクの要約を生成
   * コスト最適化: キャッシュを活用してAPI呼び出しを削減
   */
  async summarizeChunk(messages: UnifiedMessage[]): Promise<string> {
    // キャッシュキーの生成
    const cacheKey = this.generateCacheKey(messages);
    
    // キャッシュチェック
    if (this.summaryCache.has(cacheKey)) {
      return this.summaryCache.get(cacheKey)!;
    }

    // 要約プロンプトの構築
    const prompt = this.buildSummaryPrompt(messages);
    
    try {
      // LLMによる要約生成
      const summary = await this.callSummaryAPI(prompt);
      
      // キャッシュに保存
      this.summaryCache.set(cacheKey, summary);
      
      // キャッシュサイズ管理
      this.manageCacheSize();
      
      return summary;
    } catch (error) {
      console.error('Summarization error:', error);
      // フォールバック: 簡易要約
      return this.fallbackSummarize(messages);
    }
  }

  /**
   * 階層的要約の生成
   * 複数のチャンク要約をさらに要約
   */
  async createHierarchicalSummary(
    messages: UnifiedMessage[],
    level: number = 2
  ): Promise<string> {
    if (messages.length <= this.chunkSize) {
      return this.summarizeChunk(messages);
    }

    // メッセージをチャンクに分割
    const chunks = this.splitIntoChunks(messages, this.chunkSize);
    const chunkSummaries: string[] = [];

    // 各チャンクを要約
    for (const chunk of chunks) {
      const summary = await this.summarizeChunk(chunk);
      chunkSummaries.push(summary);
    }

    // レベル2の要約（チャンク要約の要約）
    if (level >= 2 && chunkSummaries.length > 1) {
      const metaSummaryPrompt = `
以下の要約をさらに${this.maxSummaryLength}文字以内で要約してください：

${chunkSummaries.join('\n---\n')}

重要な事実と文脈のみを保持し、詳細は省略してください。
`;
      
      return this.callSummaryAPI(metaSummaryPrompt);
    }

    return chunkSummaries.join(' ');
  }

  /**
   * インクリメンタル要約更新
   * 既存の要約に新しいメッセージを追加
   */
  async updateSummary(
    existingSummary: string,
    newMessages: UnifiedMessage[]
  ): Promise<string> {
    if (newMessages.length === 0) {
      return existingSummary;
    }

    const updatePrompt = `
既存の要約:
${existingSummary}

新しいメッセージ:
${this.formatMessages(newMessages)}

上記の既存要約に新しいメッセージの内容を統合し、
${this.maxSummaryLength}文字以内で更新された要約を作成してください。
古い詳細は削除し、重要な情報のみを保持してください。
`;

    try {
      return await this.callSummaryAPI(updatePrompt);
    } catch (_error) {
      // フォールバック: 既存要約 + 新規要約の結合
      const newSummary = await this.summarizeChunk(newMessages);
      return this.combineSummaries(existingSummary, newSummary);
    }
  }

  /**
   * 要約プロンプトの構築
   */
  private buildSummaryPrompt(messages: UnifiedMessage[]): string {
    const formattedMessages = this.formatMessages(messages);
    
    return `
以下の会話を${this.maxSummaryLength}文字以内で要約してください。

要約のガイドライン:
- 重要な事実と決定事項を優先
- 感情的な詳細は省略
- 時系列の流れを保持
- キャラクターの関係性の変化を記録

会話:
${formattedMessages}

要約:
`;
  }

  /**
   * メッセージのフォーマット
   */
  private formatMessages(messages: UnifiedMessage[]): string {
    return messages.map(m => {
      const role = m.role === 'user' ? 'ユーザー' : 'アシスタント';
      return `${role}: ${m.content}`;
    }).join('\n');
  }

  /**
   * API呼び出し（実際の実装）
   */
  private async callSummaryAPI(prompt: string): Promise<string> {
    const response = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        max_tokens: 150,
        temperature: 0.3 // 要約は低温度で安定性重視
      })
    });

    const data = await response.json();
    return data.summary;
  }

  /**
   * フォールバック要約（API失敗時）
   */
  private fallbackSummarize(messages: UnifiedMessage[]): string {
    // 最初と最後のメッセージを抽出
    const first = messages[0];
    const last = messages[messages.length - 1];
    
    // キーワード抽出
    const keywords = this.extractKeywords(messages);
    
    return `会話開始: ${first.content.slice(0, 50)}... ` +
           `キーワード: ${keywords.join(', ')}. ` +
           `最新: ${last.content.slice(0, 50)}...`;
  }

  /**
   * キーワード抽出（簡易版）
   */
  private extractKeywords(messages: UnifiedMessage[]): string[] {
    const text = messages.map(m => m.content).join(' ');
    const words = text.split(/\s+/);
    
    // 単語頻度計算
    const frequency: Record<string, number> = {};
    words.forEach(word => {
      if (word.length > 3) { // 3文字以上の単語
        frequency[word] = (frequency[word] || 0) + 1;
      }
    });

    // 頻度順にソートして上位を返す
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * チャンク分割
   */
  private splitIntoChunks(messages: UnifiedMessage[], size: number): UnifiedMessage[][] {
    const chunks: UnifiedMessage[][] = [];
    for (let i = 0; i < messages.length; i += size) {
      chunks.push(messages.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * キャッシュキー生成
   */
  private generateCacheKey(messages: UnifiedMessage[]): string {
    const ids = messages.map(m => m.id).join('-');
    return `summary-${ids}`;
  }

  /**
   * キャッシュサイズ管理
   */
  private manageCacheSize(): void {
    const maxCacheSize = 100;
    if (this.summaryCache.size > maxCacheSize) {
      // 最も古いエントリを削除
      const firstKey = this.summaryCache.keys().next().value;
      if (firstKey) { // 🔧 FIX: undefined対応
        this.summaryCache.delete(firstKey);
      }
    }
  }

  /**
   * 要約の結合
   */
  private combineSummaries(summary1: string, summary2: string): string {
    const combined = `${summary1} ${summary2}`;
    if (combined.length <= this.maxSummaryLength) {
      return combined;
    }
    
    // 文字数制限を超える場合は新しい方を優先
    return summary2.slice(0, this.maxSummaryLength);
  }

  /**
   * 公開API: 簡単な要約インターフェース
   */
  async summarize(messages: UnifiedMessage[]): Promise<string> {
    if (messages.length <= this.chunkSize) {
      return this.summarizeChunk(messages);
    }
    return this.createHierarchicalSummary(messages);
  }
}
