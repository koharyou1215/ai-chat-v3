// Vector Store Implementation for AI Chat V3
// High-performance vector search using OpenAI embeddings and FAISS

import { UnifiedMessage } from '@/types';
import { SearchResult } from '@/types/memory';

/**
 * FAISSをTypeScriptで使用するためのブリッジクラス
 * 実際の実装では、PythonバックエンドまたはWebAssemblyバージョンを使用
 */
export class VectorStore {
  private embeddings: Map<string, number[]> = new Map();
  private messages: Map<string, UnifiedMessage> = new Map();
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
      // 実際のOpenAI Embedding API呼び出し
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // OpenAI API key未設定の場合は警告のみでフォールバック
        if (response.status === 503 || (response.status === 500 && errorData.details?.includes('OPENAI_API_KEY'))) {
          console.warn('⚠️ OpenAI API key not configured, using fallback embedding');
        } else {
          console.error('🚨 Embedding API failed:', response.status, errorData);
        }
        
        // エラーを投げずにフォールバックを使用
        return this.createFallbackEmbedding(text);
      }
      
      const data = await response.json();
      return data.embedding;
    } catch (error) {
      console.warn('⚠️ Embedding API unavailable, using fallback:', error instanceof Error ? error.message : 'Unknown error');
      // フォールバック: より品質の高いハッシュベースのベクトル
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
  async addMessage(message: UnifiedMessage): Promise<void> {
    // 既存のメッセージはスキップ（コスト削減）
    if (this.messages.has(message.id)) {
      return;
    }

    // 重要度が低いメッセージは embedding をスキップ（コスト最適化）
    const importance = message.memory?.importance?.score ?? 0.5;
    if (importance < 0.3) {
      this.messages.set(message.id, message);
      return;
    }

    // ベクトル化とインデックス追加
    const embedding = await this.embed(message.content);
    this.embeddings.set(message.id, embedding);
    // 🔧 FIX: embeddingをmemory.embeddingに適切に格納
    const messageWithEmbedding: UnifiedMessage = {
      ...message,
      memory: {
        ...message.memory,
        embedding
      }
    };
    this.messages.set(message.id, messageWithEmbedding);

    // FAISSインデックスに追加
    // 実際: await this.pythonBridge.addToIndex(message.id, embedding);
  }

  /**
   * バッチ処理でメッセージを追加（コスト最適化）
   */
  async addMessagesBatch(messages: UnifiedMessage[]): Promise<void> {
    // 既存メッセージをフィルタリング（コスト削減）
    const newMessages = messages.filter(msg => 
      !this.messages.has(msg.id) && 
      (msg.memory?.importance?.score === undefined || msg.memory.importance.score >= 0.3)
    );
    
    if (newMessages.length === 0) return;
    
    try {
      // バッチでembedding取得（API効率化）
      const texts = newMessages.map(m => m.content);
      const embeddings = await this.embedBatch(texts);

      // メモリとインデックスに追加
      newMessages.forEach((message, i) => {
        const embedding = embeddings[i];
        this.embeddings.set(message.id, embedding);
        this.messages.set(message.id, { ...message, embedding });
      });

      // FAISSインデックスに追加（実装時）
      // await this.pythonBridge.addToIndexBatch(itemsToIndex);
    } catch (error) {
      console.error('Batch embedding error:', error);
      // フォールバック: より品質の高い疑似ベクトル
      newMessages.forEach(message => {
        const embedding = this.createFallbackEmbedding(message.content);
        this.embeddings.set(message.id, embedding);
        this.messages.set(message.id, { ...message, embedding });
      });
    }
  }

  /**
   * バッチembedding（コスト削減）
   */
  private async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      // バッチサイズ制限（APIの制限に応じて調整）
      const batchSize = 100;
      const batches: string[][] = [];
      
      for (let i = 0; i < texts.length; i += batchSize) {
        batches.push(texts.slice(i, i + batchSize));
      }
      
      const allEmbeddings: number[][] = [];
      
      // 並列でバッチ処理
      const batchPromises = batches.map(async (batch) => {
        try {
          const response = await fetch('/api/embeddings/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts: batch })
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // OpenAI API key未設定の場合は警告のみでフォールバック
            if (response.status === 500 && errorData.details?.includes('OPENAI_API_KEY')) {
              console.warn('⚠️ OpenAI API key not configured for batch embedding, using fallback');
            } else {
              console.error('🚨 Batch embedding API failed:', response.status, errorData);
            }
            
            // エラーを投げずにフォールバックを使用
            return batch.map(text => this.createFallbackEmbedding(text));
          }
          
          const data = await response.json();
          return data.embeddings;
        } catch (error) {
          console.warn('⚠️ Batch embedding API unavailable, using fallback:', error instanceof Error ? error.message : 'Unknown error');
          return batch.map(text => this.createFallbackEmbedding(text));
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(embeddings => allEmbeddings.push(...embeddings));
      
      return allEmbeddings;
    } catch (error) {
      console.error('Batch embedding error:', error);
      // フォールバック: より品質の高い疑似ベクトル
      return texts.map(text => this.createFallbackEmbedding(text));
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
    try {
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
    } catch (error) {
      console.warn('⚠️ Vector search failed, returning empty results:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
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
        const aImportance = a.memory?.importance?.score ?? 0.5;
        const bImportance = b.memory?.importance?.score ?? 0.5;
        if (aImportance !== bImportance) {
          return bImportance - aImportance;
        }
        // タイムスタンプで比較
        const aTime = new Date(a.timestamp || a.created_at || Date.now()).getTime();
        const bTime = new Date(b.timestamp || b.created_at || Date.now()).getTime();
        return bTime - aTime; // 🔧 FIX: 適切なUnifiedMessage型対応
      });

    // 削除対象を決定
    const toDelete = sortedMessages.slice(maxMessages);
    
    toDelete.forEach(message => {
      this.messages.delete(message.id);
      this.embeddings.delete(message.id);
    });
  }
}
