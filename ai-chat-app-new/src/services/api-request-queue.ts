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
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

// 🔧 **API Request Type - 追加**
export interface APIRequest {
  id: string;
  type: string;
  priority: number;
  timestamp: number;
  request: () => Promise<unknown>;
}

export class APIRequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private maxConcurrent = 2; // 最大同時実行数
  private activeRequests = 0;
  private lastRequestTime = 0;
  private minDelay = 100; // 最小遅延（ms）
  private pendingRequests = new Set<string>(); // 重複防止用

  /**
   * リクエストをキューに追加
   */
  async addRequest(apiRequest: APIRequest): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: apiRequest.id,
        type: this.mapPriorityToType(apiRequest.priority),
        priority: this.mapNumberToPriority(apiRequest.priority),
        request: apiRequest.request,
        timestamp: apiRequest.timestamp,
        resolve,
        reject
      };

      this.queue.push(queuedRequest);
      this.processQueue();
    });
  }

  /**
   * 数値優先度を文字列に変換
   */
  private mapNumberToPriority(priority: number): RequestPriority {
    if (priority <= 1) return 'high';
    if (priority <= 2) return 'normal';
    return 'low';
  }

  /**
   * 数値優先度をリクエストタイプに変換
   */
  private mapPriorityToType(priority: number): RequestType {
    if (priority === 1) return 'chat';
    if (priority === 2) return 'inspiration';
    return 'other';
  }

  async enqueueRequest(
    request: () => Promise<unknown>,
    type: RequestType = 'other',
    priority: RequestPriority = 'normal'
  ): Promise<unknown> {
    const requestId = crypto.randomUUID();
    
    // 重複チェック
    if (this.pendingRequests.has(requestId)) {
      throw new Error('Duplicate request detected');
    }

    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: requestId,
        type,
        priority,
        request,
        timestamp: Date.now(),
        resolve,
        reject
      };

      this.queue.push(queuedRequest);
      this.pendingRequests.add(requestId);

      // 優先度でソート
      this.queue.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      this.processQueue();
    });
  }

  /**
   * チャット専用のリクエストエンキュー
   */
  async enqueueChatRequest(request: () => Promise<unknown>): Promise<unknown> {
    return this.enqueueRequest(request, 'chat', 'high');
  }

  /**
   * インスピレーション専用のリクエストエンキュー
   */
  async enqueueInspirationRequest(request: () => Promise<unknown>): Promise<unknown> {
    return this.enqueueRequest(request, 'inspiration', 'normal');
  }

  /**
   * キューの処理
   */
  private async processQueue() {
    if (this.processing || this.activeRequests >= this.maxConcurrent) {
      return;
    }

    const request = this.queue.shift();
    if (!request) {
      return;
    }

    this.processing = true;
    this.activeRequests++;

    try {
      // レート制限のための遅延
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.minDelay) {
        await new Promise(resolve => 
          setTimeout(resolve, this.minDelay - timeSinceLastRequest)
        );
      }

      this.lastRequestTime = Date.now();

      console.log(`🔄 Processing ${request.type} request (${request.id})`);
      const result = await request.request();
      request.resolve(result);

      console.log(`✅ Completed ${request.type} request (${request.id})`);
      
    } catch (error) {
      console.error(`❌ Failed ${request.type} request (${request.id}):`, error);
      request.reject(error);
    } finally {
      this.activeRequests--;
      this.processing = false;
      this.pendingRequests.delete(request.id);
      
      // 次のリクエストを処理
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 10);
      }
    }
  }

  /**
   * キューの状態を取得
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      processing: this.processing,
      pendingRequests: this.pendingRequests.size
    };
  }

  /**
   * キューをクリア
   */
  clearQueue() {
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    this.pendingRequests.clear();
  }

  /**
   * 実行リクエストをキャンセル（実装は複雑なため、現在はログのみ）
   */
  async cancelRequest(requestId: string): Promise<boolean> {
    const requestIndex = this.queue.findIndex(req => req.id === requestId);
    if (requestIndex > -1) {
      const cancelledRequest = this.queue.splice(requestIndex, 1)[0];
      this.pendingRequests.delete(requestId);
      cancelledRequest.reject(new Error('Request cancelled'));
      return true;
    }
    
    console.warn(`Request ${requestId} not found in queue`);
    return false;
  }
}

export const apiRequestQueue = new APIRequestQueue();