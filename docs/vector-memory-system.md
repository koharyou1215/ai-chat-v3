# 🧠 ベクトルストア・メモリ管理システム

高度なメモリ管理とベクトル検索機能の設計仕様書

## 📋 システム概要

### 主要コンポーネント
1. **VectorStore** - FAISSベースのベクトル検索
2. **MemoryLayerManager** - 階層的メモリ管理
3. **DynamicSummarizer** - 動的要約システム
4. **ConversationManager** - 統合会話管理

---

## 2️⃣ ベクトルストア実装

```typescript
// src/services/memory/vector-store.ts

import { Message, SearchResult } from './types';

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
      // 実際のOpenAI API呼び出し
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      const data = await response.json();
      return data.embedding;
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
    
    words.forEach((word, i) => {
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
    // 重要なメッセージのみフィルタリング
    const importantMessages = messages.filter(
      m => !this.messages.has(m.id) && 
           (m.importance === undefined || m.importance >= 0.3)
    );

    if (importantMessages.length === 0) return;

    // バッチでembedding取得（API呼び出し削減）
    const texts = importantMessages.map(m => m.content);
    const embeddings = await this.embedBatch(texts);

    // インデックスに追加
    importantMessages.forEach((message, i) => {
      const embedding = embeddings[i];
      this.embeddings.set(message.id, embedding);
      this.messages.set(message.id, { ...message, embedding });
    });
  }

  /**
   * バッチembedding（コスト削減）
   */
  private async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch('/api/embeddings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts })
      });
      
      const data = await response.json();
      return data.embeddings;
    } catch (error) {
      // フォールバック
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
    const queryEmbedding = await this.embed(query);
    
    // コサイン類似度計算
    const results: SearchResult[] = [];
    
    for (const [id, messageEmbedding] of this.embeddings) {
      const similarity = this.cosineSimilarity(queryEmbedding, messageEmbedding);
      
      if (similarity >= threshold) {
        const message = this.messages.get(id)!;
        results.push({
          message,
          score: similarity,
          relevance: similarity > 0.9 ? 'high' : 
                    similarity > 0.8 ? 'medium' : 'low'
        });
      }
    }

    // スコアでソートしてトップk件を返す
    return results
      .sort((a, b) => b.score - a.score)
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
      const boostedScore = result.score + (keywordMatches * 0.1);
      
      return {
        ...result,
        score: Math.min(boostedScore, 1.0)
      };
    });

    return boostedResults
      .sort((a, b) => b.score - a.score)
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
      .filter(m => !m.pinned)
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
```

---

## 3️⃣ メモリレイヤー管理

```typescript
// src/services/memory/memory-layers.ts

import { Message, MemoryLayer } from './types';

/**
 * 階層的メモリ管理
 * 認知科学のメモリモデルに基づく実装
 */
export class MemoryLayerManager {
  private layers: Map<string, MemoryLayer>;
  
  constructor() {
    this.layers = new Map([
      ['immediate', {
        type: 'immediate',
        messages: [],
        maxSize: 3,
        retentionPolicy: 'fifo'
      }],
      ['working', {
        type: 'working', 
        messages: [],
        maxSize: 10,
        retentionPolicy: 'importance'
      }],
      ['episodic', {
        type: 'episodic',
        messages: [],
        maxSize: 50,
        retentionPolicy: 'relevance'
      }],
      ['semantic', {
        type: 'semantic',
        messages: [],
        maxSize: 200,
        retentionPolicy: 'importance'
      }]
    ]);
  }

  /**
   * メッセージを適切なレイヤーに追加
   */
  addMessage(message: Message): void {
    // 即時記憶に追加
    this.addToLayer('immediate', message);
    
    // 重要度に基づいて他のレイヤーにも追加
    if (this.shouldAddToWorking(message)) {
      this.addToLayer('working', message);
    }
    
    if (this.shouldAddToEpisodic(message)) {
      this.addToLayer('episodic', message);
    }
    
    if (this.shouldAddToSemantic(message)) {
      this.addToLayer('semantic', message);
    }
  }

  /**
   * レイヤーにメッセージを追加（保持ポリシーに従う）
   */
  private addToLayer(layerName: string, message: Message): void {
    const layer = this.layers.get(layerName);
    if (!layer) return;

    // 重複チェック
    if (layer.messages.some(m => m.id === message.id)) {
      return;
    }

    layer.messages.push(message);
    
    // サイズ制限を超えた場合の処理
    if (layer.messages.length > layer.maxSize) {
      this.enforceRetentionPolicy(layer);
    }
  }

  /**
   * 保持ポリシーを適用
   */
  private enforceRetentionPolicy(layer: MemoryLayer): void {
    switch (layer.retentionPolicy) {
      case 'fifo':
        // 最も古いものを削除
        layer.messages.shift();
        break;
        
      case 'importance':
        // 重要度が最も低いものを削除
        layer.messages.sort((a, b) => 
          (b.importance || 0) - (a.importance || 0)
        );
        layer.messages = layer.messages.slice(0, layer.maxSize);
        break;
        
      case 'relevance':
        // 最も関連性の低いものを削除（時間減衰を考慮）
        const now = Date.now();
        layer.messages.sort((a, b) => {
          const scoreA = this.calculateRelevanceScore(a, now);
          const scoreB = this.calculateRelevanceScore(b, now);
          return scoreB - scoreA;
        });
        layer.messages = layer.messages.slice(0, layer.maxSize);
        break;
    }
  }

  /**
   * 関連性スコアの計算（時間減衰を含む）
   */
  private calculateRelevanceScore(message: Message, now: number): number {
    const age = now - new Date(message.timestamp).getTime();
    const ageInHours = age / (1000 * 60 * 60);
    
    // 時間減衰関数（指数関数的減衰）
    const timeDecay = Math.exp(-ageInHours / 24); // 24時間で約37%に減衰
    
    // 基本スコア（重要度 + ピン留め + 時間減衰）
    const baseScore = (message.importance || 0.5) * timeDecay;
    const pinnedBonus = message.pinned ? 1.0 : 0;
    
    return baseScore + pinnedBonus;
  }

  /**
   * Working Memoryに追加すべきか判定
   */
  private shouldAddToWorking(message: Message): boolean {
    return (message.importance || 0) >= 0.4 || 
           message.pinned === true ||
           message.role === 'user'; // ユーザー入力は常に保持
  }

  /**
   * Episodic Memoryに追加すべきか判定
   */
  private shouldAddToEpisodic(message: Message): boolean {
    // 感情的な内容や特定のイベントを含む場合
    const hasEmotionalContent = message.metadata?.emotion_state !== undefined;
    const hasTrackerUpdate = message.metadata?.tracker_updates !== undefined;
    
    return hasEmotionalContent || 
           hasTrackerUpdate || 
           (message.importance || 0) >= 0.6;
  }

  /**
   * Semantic Memoryに追加すべきか判定
   */
  private shouldAddToSemantic(message: Message): boolean {
    // 事実や定義を含む場合
    const keywords = message.metadata?.keywords || [];
    const hasFactualContent = keywords.some(k => 
      ['定義', '説明', '理由', '方法', '手順'].includes(k)
    );
    
    return hasFactualContent || 
           (message.importance || 0) >= 0.7;
  }

  /**
   * 各レイヤーから関連メッセージを取得
   */
  getLayeredContext(currentQuery: string): {
    immediate: Message[];
    working: Message[];
    episodic: Message[];
    semantic: Message[];
  } {
    return {
      immediate: this.layers.get('immediate')?.messages || [],
      working: this.layers.get('working')?.messages || [],
      episodic: this.layers.get('episodic')?.messages.slice(-5) || [],
      semantic: this.layers.get('semantic')?.messages.slice(-3) || []
    };
  }

  /**
   * メモリの統計情報を取得
   */
  getStatistics(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    this.layers.forEach((layer, name) => {
      stats[name] = {
        count: layer.messages.length,
        maxSize: layer.maxSize,
        utilization: (layer.messages.length / layer.maxSize * 100).toFixed(1) + '%'
      };
    });
    
    return stats;
  }
}
```

---

## 4️⃣ 動的要約システム

```typescript
// src/services/memory/summarizer.ts

import { Message } from './types';

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
  async summarizeChunk(messages: Message[]): Promise<string> {
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
    messages: Message[],
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
    newMessages: Message[]
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
    } catch (error) {
      // フォールバック: 既存要約 + 新規要約の結合
      const newSummary = await this.summarizeChunk(newMessages);
      return this.combineSummaries(existingSummary, newSummary);
    }
  }

  /**
   * 要約プロンプトの構築
   */
  private buildSummaryPrompt(messages: Message[]): string {
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
  private formatMessages(messages: Message[]): string {
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

  // ... 他のヘルパーメソッド
}
```

---

## 💡 実装のポイント

### コスト最適化
- バッチ処理でEmbedding API呼び出しを削減
- キャッシュシステムで重複処理を回避
- 重要度フィルタリングで不要な処理を削減

### 階層的記憶モデル
- **Immediate Memory**: 最新3メッセージ (FIFO)
- **Working Memory**: 重要な10メッセージ (重要度順)
- **Episodic Memory**: 感情・イベント関連50メッセージ (関連度順)
- **Semantic Memory**: 事実・定義関連200メッセージ (重要度順)

### ベクトル検索
- コサイン類似度による意味的検索
- ハイブリッド検索（ベクトル + キーワード）
- 閾値による品質管理

---

## 🔄 次の実装フェーズ

1. **型定義の追加**
2. **API エンドポイントの実装**
3. **フロントエンド統合**
4. **パフォーマンステスト**