// Memory Layer Management for AI Chat V3
// Hierarchical memory system based on cognitive science memory models

import { Message, MemoryLayer } from '@/types/memory';

/**
 * 階層的メモリ管理
 * 認知科学のメモリモデルに基づく実装
 */
export class MemoryLayerManager {
  private layers: Map<string, MemoryLayer>;
  
  constructor() {
    this.layers = new Map([
      ['immediate', {
        id: 'immediate',
        name: 'Immediate Memory',
        capacity: 3,
        retentionDays: 0.01, // ~15 minutes
        compressionRatio: 1.0,
        messages: []
      }],
      ['working', {
        id: 'working',
        name: 'Working Memory', 
        capacity: 10,
        retentionDays: 0.5, // 12 hours
        compressionRatio: 1.0,
        messages: []
      }],
      ['episodic', {
        id: 'episodic',
        name: 'Episodic Memory',
        capacity: 50,
        retentionDays: 7,
        compressionRatio: 0.8,
        messages: []
      }],
      ['semantic', {
        id: 'semantic',
        name: 'Semantic Memory',
        capacity: 200,
        retentionDays: 30,
        compressionRatio: 0.5,
        messages: []
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
    if (layer.messages.length > layer.capacity) {
      this.enforceRetentionPolicy(layer);
    }
  }

  /**
   * 保持ポリシーを適用
   */
  private enforceRetentionPolicy(layer: MemoryLayer): void {
    const now = Date.now();
    
    // まず古すぎるメッセージを削除
    const cutoffTime = now - (layer.retentionDays * 24 * 60 * 60 * 1000);
    layer.messages = layer.messages.filter(
      m => new Date(m.timestamp).getTime() > cutoffTime
    );

    // まだ容量超過の場合、関連性スコアで削除
    if (layer.messages.length > layer.capacity) {
      layer.messages.sort((a, b) => {
        const scoreA = this.calculateRelevanceScore(a, now);
        const scoreB = this.calculateRelevanceScore(b, now);
        return scoreB - scoreA;
      });
      layer.messages = layer.messages.slice(0, layer.capacity);
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
    
    // 基本スコア（重要度 + 時間減衰）
    const baseScore = (message.importance || 0.5) * timeDecay;
    
    return baseScore;
  }

  /**
   * Working Memoryに追加すべきか判定
   */
  private shouldAddToWorking(message: Message): boolean {
    return (message.importance || 0) >= 0.4 || 
           message.sender === 'user'; // ユーザー入力は常に保持
  }

  /**
   * Episodic Memoryに追加すべきか判定
   */
  private shouldAddToEpisodic(message: Message): boolean {
    // 感情的な内容や特定のイベントを含む場合
    const hasEmotionalContent = message.emotion !== undefined;
    
    return hasEmotionalContent || 
           (message.importance || 0) >= 0.6;
  }

  /**
   * Semantic Memoryに追加すべきか判定
   */
  private shouldAddToSemantic(message: Message): boolean {
    // 事実や定義を含む場合（長いメッセージは知識的内容の可能性が高い）
    const hasFactualContent = message.content.length > 100;
    
    return hasFactualContent || 
           (message.importance || 0) >= 0.7;
  }

  /**
   * 各レイヤーから関連メッセージを取得
   */
  getLayeredContext(_currentQuery: string): {
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
  getStatistics(): Record<string, unknown> {
    const stats: Record<string, unknown> = {};
    
    this.layers.forEach((layer, name) => {
      stats[name] = {
        count: layer.messages.length,
        capacity: layer.capacity,
        utilization: (layer.messages.length / layer.capacity * 100).toFixed(1) + '%',
        retentionDays: layer.retentionDays
      };
    });
    
    return stats;
  }

  /**
   * 特定レイヤーのメッセージを取得
   */
  getLayerMessages(layerName: string): Message[] {
    return this.layers.get(layerName)?.messages || [];
  }

  /**
   * すべてのメッセージを取得（デバッグ用）
   */
  getAllMessages(): Message[] {
    const allMessages: Message[] = [];
    this.layers.forEach(layer => {
      allMessages.push(...layer.messages);
    });
    return Array.from(new Set(allMessages)); // 重複除去
  }
}
