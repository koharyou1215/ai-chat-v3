/**
 * APIリクエストキューイングシステム
 * チャットとインスピレーション間のリソース競合を解決
 */

type RequestPriority = 'high' | 'normal' | 'low';
type RequestType = 'chat' | 'inspiration' | 'memory' | 'other';

interface QueuedRequest {
  id: string;
  type: RequestType;
  priority: RequestPriority;
  request: () => Promise<unknown>;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (error: unknown) => void;
}

export class APIRequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private maxConcurrent = 2; // 最大同時実行数
  private activeRequests = 0;
  private lastRequestTime = 0;
  private minDelay = 100; // 最小遅延（ms）
  private pendingRequests = new Set<string>(); // 重複防止用
  private modelLastUsedTime = new Map<string, number>(); // モデルごとの最終使用時刻
  private modelMinDelay = 1000; // 同一モデル連続使用時の最小遅延（1秒）

  /**
   * リクエストをキューに追加
   */
  async enqueue<T>(
    type: RequestType,
    request: () => Promise<T>,
    priority: RequestPriority = 'normal'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: `${type}-${Date.now()}-${Math.random()}`,
        type,
        priority,
        request,
        timestamp: Date.now(),
        resolve,
        reject
      };

      // 優先度に基づいて挿入位置を決定
      const insertIndex = this.findInsertPosition(queuedRequest);
      this.queue.splice(insertIndex, 0, queuedRequest);

      console.log(`📋 Queued ${type} request (priority: ${priority}, queue length: ${this.queue.length})`);

      // 処理開始
      this.processQueue();
    });
  }

  /**
   * チャット専用の高優先度リクエスト（重複防止機能付き）
   */
  async enqueueChatRequest<T>(request: () => Promise<T>, requestId?: string, modelName?: string): Promise<T> {
    // 重複チェック
    if (requestId && this.pendingRequests.has(requestId)) {
      console.log(`🚫 Duplicate chat request ignored: ${requestId}`);
      throw new Error('Duplicate request detected');
    }
    
    if (requestId) {
      this.pendingRequests.add(requestId);
    }

    // 同一モデルの連続使用をチェック
    if (modelName) {
      const lastUsed = this.modelLastUsedTime.get(modelName) || 0;
      const timeSinceLastUse = Date.now() - lastUsed;
      
      if (timeSinceLastUse < this.modelMinDelay) {
        const waitTime = this.modelMinDelay - timeSinceLastUse;
        console.log(`⏳ モデル ${modelName} のレート制限: ${waitTime}ms 待機`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      this.modelLastUsedTime.set(modelName, Date.now());
    }

    try {
      const result = await this.enqueue('chat', async () => {
        try {
          return await request();
        } finally {
          if (requestId) {
            this.pendingRequests.delete(requestId);
          }
        }
      }, 'high');
      
      return result as T;
    } catch (error) {
      if (requestId) {
        this.pendingRequests.delete(requestId);
      }
      throw error;
    }
  }

  /**
   * インスピレーション専用のリクエスト
   */
  async enqueueInspirationRequest<T>(request: () => Promise<T>): Promise<T> {
    return this.enqueue('inspiration', request, 'normal');
  }

  private findInsertPosition(newRequest: QueuedRequest): number {
    const priorityOrder = { 'high': 0, 'normal': 1, 'low': 2 };
    
    for (let i = 0; i < this.queue.length; i++) {
      const queuedPriority = priorityOrder[this.queue[i].priority];
      const newPriority = priorityOrder[newRequest.priority];
      
      if (newPriority < queuedPriority) {
        return i;
      }
    }
    
    return this.queue.length;
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const queuedRequest = this.queue.shift()!;
      this.activeRequests++;

      // レート制限を適用
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.minDelay) {
        await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLastRequest));
      }

      console.log(`⚡ Processing ${queuedRequest.type} request (${this.activeRequests}/${this.maxConcurrent} active)`);
      this.lastRequestTime = Date.now();

      // リクエストを非同期で実行
      this.executeRequest(queuedRequest);
    }

    this.processing = false;
  }

  private async executeRequest(queuedRequest: QueuedRequest): Promise<void> {
    const startTime = performance.now();
    
    try {
      const result = await queuedRequest.request();
      const duration = performance.now() - startTime;
      
      console.log(`✅ ${queuedRequest.type} request completed in ${duration.toFixed(1)}ms`);
      queuedRequest.resolve(result);
    } catch (error) {
      const duration = performance.now() - startTime;
      
      console.error(`❌ ${queuedRequest.type} request failed after ${duration.toFixed(1)}ms:`, error);
      queuedRequest.reject(error);
    } finally {
      this.activeRequests--;
      
      // キューに残りがあれば再開
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 0);
      }
    }
  }

  /**
   * キューの統計情報
   */
  getStats() {
    const typeCount = this.queue.reduce((acc, req) => {
      acc[req.type] = (acc[req.type] || 0) + 1;
      return acc;
    }, {} as Record<RequestType, number>);

    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      typeBreakdown: typeCount,
      oldestRequestAge: this.queue.length > 0 ? Date.now() - this.queue[0].timestamp : 0
    };
  }

  /**
   * 緊急時のキュークリア
   */
  clearQueue(): void {
    const clearedRequests = this.queue.length;
    this.queue.forEach(req => req.reject(new Error('Queue cleared')));
    this.queue = [];
    
    console.log(`🧹 Cleared ${clearedRequests} queued requests`);
  }
}

export const apiRequestQueue = new APIRequestQueue();

// デバッグ用: キュー統計を定期的にログ出力
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = apiRequestQueue.getStats();
    if (stats.queueLength > 0 || stats.activeRequests > 0) {
      console.log('📊 API Queue Stats:', stats);
    }
  }, 5000);
}