// Memory Layer Management for AI Chat V3
// Hierarchical memory system based on cognitive science memory models

// Removed unused import
import { MemoryLayer, Message } from '@/types/memory';
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
   * メッセージを追加（後方互換性のためのエイリアス）
   */
  addMessage(message: UnifiedMessage): void {
    this.addUnifiedMessage(message);
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
      m => {
        const timestamp = 'timestamp' in m ? m.timestamp : ('created_at' in m ? m.created_at : undefined);
        if (!timestamp) return false;
        return new Date(timestamp).getTime() > cutoffTime;
      }
    );

    // まだ容量超過の場合、関連性スコアで削除
    if (layer.messages.length > layer.capacity) {
      layer.messages.sort((a, b) => {
        const scoreA = this.calculateRelevanceScore(a as UnifiedMessage, now);
        const scoreB = this.calculateRelevanceScore(b as UnifiedMessage, now);
        return scoreB - scoreA;
      });
      layer.messages = layer.messages.slice(0, layer.capacity);
    }
  }

  /**
   * 関連性スコアの計算（時間減衰を含む）
   */
  private calculateRelevanceScore(message: UnifiedMessage, now: number): number {
    const timestamp = message.created_at || message.updated_at;
    const age = now - new Date(timestamp).getTime();
    const ageInHours = age / (1000 * 60 * 60);
    
    // 時間減衰関数（指数関数的減衰）
    const timeDecay = Math.exp(-ageInHours / 24); // 24時間で約37%に減衰
    
    // 基本スコア（重要度 + 時間減衰）
    const importanceScore = message.memory?.importance?.score || 0.5;
    const baseScore = importanceScore * timeDecay;
    
    return baseScore;
  }

  /**
   * Working Memoryに追加すべきか判定
   */
  private shouldAddToWorking(message: UnifiedMessage): boolean {
    const importanceScore = message.memory?.importance?.score || 0;
    return importanceScore >= 0.4 || 
           message.role === 'user'; // ユーザー入力は常に保持
  }

  /**
   * Episodic Memoryに追加すべきか判定
   */
  private shouldAddToEpisodic(message: UnifiedMessage): boolean {
    // 感情的な内容や特定のイベントを含む場合
    const hasEmotionalContent = message.expression?.emotion !== undefined;
    const importanceScore = message.memory?.importance?.score || 0;
    
    return hasEmotionalContent || 
           importanceScore >= 0.6;
  }

  /**
   * Semantic Memoryに追加すべきか判定
   */
  private shouldAddToSemantic(message: UnifiedMessage): boolean {
    // 事実や定義を含む場合（長いメッセージは知識的内容の可能性が高い）
    const hasFactualContent = message.content.length > 100;
    const importanceScore = message.memory?.importance?.score || 0;
    
    return hasFactualContent || 
           importanceScore >= 0.7;
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
    // MessageとUnifiedMessageの混在に対応
    const convertMessages = (messages: (Message | UnifiedMessage)[]): UnifiedMessage[] => {
      return messages.filter((msg): msg is UnifiedMessage => 'role' in msg);
    };

    return {
      immediate: convertMessages(this.layers.get('immediate')?.messages || []),
      working: convertMessages(this.layers.get('working')?.messages || []),
      episodic: convertMessages(this.layers.get('episodic')?.messages.slice(-5) || []),
      semantic: convertMessages(this.layers.get('semantic')?.messages.slice(-3) || [])
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
    const layer = this.layers.get(layerName);
    if (!layer) return [];
    // Filter to only return UnifiedMessage types
    return layer.messages.filter((m): m is UnifiedMessage => 'session_id' in m && 'role' in m);
  }

  /**
   * すべてのメッセージを取得（デバッグ用）
   */
  getAllUnifiedMessages(): UnifiedMessage[] {
    const allUnifiedMessages: UnifiedMessage[] = [];
    this.layers.forEach(layer => {
      const unifiedOnly = layer.messages.filter((m): m is UnifiedMessage => 'session_id' in m && 'role' in m);
      allUnifiedMessages.push(...unifiedOnly);
    });
    return Array.from(new Set(allUnifiedMessages)); // 重複除去
  }
}
