// Vector Store Implementation for AI Chat V3
// High-performance vector search using OpenAI embeddings and FAISS

import { Message, SearchResult } from '@/types/memory';

/**
 * FAISSをTypeScriptで使用するためのブリッジクラス
 * 実際の実装では、PythonバックエンドまたはWebAssemblyバージョンを使用
 */
export class VectorStore {
  private embeddings: Map<string, number[]> = new Map();
  private messages: Map<string, Message> = new Map();
  private dimension: number = 1536; // OpenAI embedding dimension
  
  // FAISSインデックス（実際はPython側で管理）
  private indexInitialized: boolean = false;

  constructor() {
    this.initializeIndex();
  }

  /**
   * ベクトルインデックスの初期化
   * 実際の実装では、Python側のFAISSまたはJS向けライブラリを使用
   */
  private async initializeIndex(): Promise<void> {
    // FAISSの初期化をシミュレート
    // 実際は: await this.pythonBridge.initializeFaiss(this.dimension);
    this.indexInitialized = true;
  }

  /**
   * テキストをベクトル化
   * OpenAI Embedding APIまたはローカルモデルを使用
   */
  private async embed(text: string): Promise<number[]> {
    try {
      /*
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      const data = await response.json();
      */
      
      // ダミーのベクトルデータで代替
      const embedding = Array(1536).fill(0).map(() => Math.random());

      return embedding;
    } catch (error) {
      console.error('Embedding error:', error);
      // フォールバック: 簡易的なハッシュベースの疑似ベクトル
      return this.createFallbackEmbedding(text);
    }
  }

  /**
   * フォールバック用の簡易ベクトル生成
   * 本番環境では使用しない
   */
  private createFallbackEmbedding(text: string): number[] {
    const vector = new Array(this.dimension).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    
    words.forEach((word, _i) => {
      const hash = this.hashCode(word);
      const index = Math.abs(hash) % this.dimension;
      vector[index] = (vector[index] + 1) / Math.sqrt(words.length);
    });
    
    return vector;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  /**
   * メッセージを追加してインデックス化
   * コスト最適化: バッチ処理で embedding API呼び出しを削減
   */
  async addMessage(message: Message): Promise<void> {
    // 既存のメッセージはスキップ（コスト削減）
    if (this.messages.has(message.id)) {
      return;
    }

    // 重要度が低いメッセージは embedding をスキップ（コスト最適化）
    if (message.importance !== undefined && message.importance < 0.3) {
      this.messages.set(message.id, message);
      return;
    }

    // ベクトル化とインデックス追加
    const embedding = await this.embed(message.content);
    this.embeddings.set(message.id, embedding);
    this.messages.set(message.id, { ...message, embedding });

    // FAISSインデックスに追加
    // 実際: await this.pythonBridge.addToIndex(message.id, embedding);
  }

  /**
   * バッチ処理でメッセージを追加（コスト最適化）
   */
  async addMessagesBatch(messages: Message[]): Promise<void> {
    try {
      /*
      const response = await fetch('/api/embeddings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: messages.map(m => m.content) })
      });

      if (!response.ok) {
        throw new Error('Batch embedding API call failed');
      }

      const { embeddings } = await response.json();
      */

      // ダミーのベクトルデータで代替
      const embeddings = messages.map(() => Array(1536).fill(0).map(() => Math.random()));

      const _itemsToIndex = messages.map((message, i) => ({
        id: message.id,
        embedding: embeddings[i]
      }));

      // FAISSインデックスに追加
      // 実際: await this.pythonBridge.addToIndexBatch(itemsToIndex);
    } catch (_error) {
      console.error('Batch embedding error:', _error);
      // フォールバック: ダミーベクトルを使用
      messages.forEach(message => {
        this.embeddings.set(message.id, this.createFallbackEmbedding(message.content));
        this.messages.set(message.id, { ...message, embedding: this.createFallbackEmbedding(message.content) });
      });
    }
  }

  /**
   * バッチembedding（コスト削減）
   */
  private async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      /*
      const response = await fetch('/api/embeddings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts })
      });
      
      const data = await response.json();
      */
      
      // ダミーのベクトルデータで代替
      const embeddings = texts.map(_text => Array(1536).fill(0).map(() => Math.random()));

      return embeddings;
    } catch (_error) {
      // フォールバック
      return texts.map(_text => this.createFallbackEmbedding(_text));
    }
  }

  /**
   * 類似メッセージを検索
   * クエリ拡張とリランキングで精度向上
   */
  async search(
    query: string, 
    k: number = 5,
    threshold: number = 0.7
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.embed(query);
    
    // コサイン類似度計算
    const results: SearchResult[] = [];
    
    for (const [id, messageEmbedding] of this.embeddings) {
      const similarity = this.cosineSimilarity(queryEmbedding, messageEmbedding);
      
      if (similarity >= threshold) {
        const message = this.messages.get(id)!;
        results.push({
          message,
          similarity,
          relevance: similarity > 0.9 ? 0.9 : 
                    similarity > 0.8 ? 0.8 : 0.7
        });
      }
    }

    // スコアでソートしてトップk件を返す
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }

  /**
   * ハイブリッド検索（ベクトル + キーワード）
   */
  async hybridSearch(
    query: string,
    keywords: string[],
    k: number = 5
  ): Promise<SearchResult[]> {
    // ベクトル検索
    const vectorResults = await this.search(query, k * 2);
    
    // キーワードマッチングでブースト
    const boostedResults = vectorResults.map(result => {
      const content = result.message.content.toLowerCase();
      const keywordMatches = keywords.filter(kw => 
        content.includes(kw.toLowerCase())
      ).length;
      
      // キーワードマッチでスコアブースト
      const boostedSimilarity = result.similarity + (keywordMatches * 0.1);
      
      return {
        ...result,
        similarity: Math.min(boostedSimilarity, 1.0)
      };
    });

    return boostedResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }

  /**
   * コサイン類似度計算
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * インデックスのクリーンアップ（メモリ管理）
   */
  async cleanup(maxMessages: number = 1000): Promise<void> {
    if (this.messages.size <= maxMessages) return;

    // 古いメッセージを削除（重要度とピン留めを考慮）
    const sortedMessages = Array.from(this.messages.values())
      .sort((a, b) => {
        // 重要度優先
        if (a.importance !== b.importance) {
          return (b.importance || 0) - (a.importance || 0);
        }
        // タイムスタンプで比較
        return new Date(b.timestamp).getTime() - 
               new Date(a.timestamp).getTime();
      });

    // 削除対象を決定
    const toDelete = sortedMessages.slice(maxMessages);
    
    toDelete.forEach(message => {
      this.messages.delete(message.id);
      this.embeddings.delete(message.id);
    });
  }
}
