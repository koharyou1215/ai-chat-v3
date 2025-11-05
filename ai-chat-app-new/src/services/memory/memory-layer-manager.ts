// Memory Layer Management for AI Chat V3
// Hierarchical memory system based on cognitive science memory models

// Removed unused import
import { LegacyMemoryLayer as MemoryLayer } from '@/types/core/memory.types';
import { UnifiedMessage } from '@/types';

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
  addUnifiedMessage(message: UnifiedMessage): void {
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
  private addToLayer(layerName: string, message: UnifiedMessage): void {
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
      m => new Date(m.timestamp || m.created_at || Date.now()).getTime() > cutoffTime // 🔧 FIX: undefined対応
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
  private calculateRelevanceScore(message: UnifiedMessage, now: number): number {
    const messageTime = message.timestamp ? new Date(message.timestamp).getTime() : now;
    const age = now - messageTime;
    const ageInHours = age / (1000 * 60 * 60);
    
    // 時間減衰関数（指数関数的減衰）
    const timeDecay = Math.exp(-ageInHours / 24); // 24時間で約37%に減衰
    
    // 基本スコア（重要度 + 時間減衰）
    const baseScore = (message.memory?.importance?.score || 0.5) * timeDecay; // 🔧 FIX: UnifiedMessage型対応
    
    return baseScore;
  }

  /**
   * Working Memoryに追加すべきか判定
   */
  private shouldAddToWorking(message: UnifiedMessage): boolean {
    return (message.memory?.importance?.score || 0) >= 0.4 || 
           message.role === 'user'; // 🔧 FIX: UnifiedMessage型対応
  }

  /**
   * Episodic Memoryに追加すべきか判定
   */
  private shouldAddToEpisodic(message: UnifiedMessage): boolean {
    // 感情的な内容や特定のイベントを含む場合
    const hasEmotionalContent = message.expression?.emotion !== undefined; // 🔧 FIX: UnifiedMessage型対応
    
    return hasEmotionalContent || 
           (message.memory?.importance?.score || 0) >= 0.6; // 🔧 FIX: UnifiedMessage型対応
  }

  /**
   * Semantic Memoryに追加すべきか判定
   */
  private shouldAddToSemantic(message: UnifiedMessage): boolean {
    // 事実や定義を含む場合（長いメッセージは知識的内容の可能性が高い）
    const hasFactualContent = message.content.length > 100;
    
    return hasFactualContent || 
           (message.memory?.importance?.score || 0) >= 0.7; // 🔧 FIX: UnifiedMessage型対応
  }

  /**
   * 各レイヤーから関連メッセージを取得
   */
  getLayeredContext(_currentQuery: string): {
    immediate: UnifiedMessage[];
    working: UnifiedMessage[];
    episodic: UnifiedMessage[];
    semantic: UnifiedMessage[];
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
  getLayerUnifiedMessages(layerName: string): UnifiedMessage[] {
    return this.layers.get(layerName)?.messages || [];
  }

  /**
   * すべてのメッセージを取得（デバッグ用）
   */
  getAllUnifiedMessages(): UnifiedMessage[] {
    const allUnifiedMessages: UnifiedMessage[] = [];
    this.layers.forEach(layer => {
      allUnifiedMessages.push(...layer.messages);
    });
    return Array.from(new Set(allUnifiedMessages)); // 重複除去
  }
}
