/**
 * MediaQueue
 * メディアリクエストのキュー管理
 * 優先度付きキューでリクエストを管理
 */

export interface QueuedRequest {
  id: string;
  type: 'audio' | 'image';
  priority: 'high' | 'normal' | 'low';
  data: any;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

interface PriorityQueue {
  high: QueuedRequest[];
  normal: QueuedRequest[];
  low: QueuedRequest[];
}

export class MediaQueue {
  private queue: PriorityQueue = {
    high: [],
    normal: [],
    low: [],
  };

  private processingRequests = new Map<string, QueuedRequest>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * リクエストをキューに追加
   */
  public async enqueue(request: QueuedRequest): Promise<void> {
    const currentSize = this.getSize();

    if (currentSize >= this.maxSize) {
      throw new Error(`Queue is full (max: ${this.maxSize})`);
    }

    // 優先度に応じてキューに追加
    this.queue[request.priority].push(request);

    console.log(
      `📥 MediaQueue: Enqueued ${request.type} request (${request.priority} priority)`
    );
  }

  /**
   * 次のリクエストを取得（優先度順）
   */
  public getNext(): QueuedRequest | null {
    // 高優先度から順に確認
    for (const priority of ['high', 'normal', 'low'] as const) {
      const queue = this.queue[priority];
      if (queue.length > 0) {
        const request = queue.shift()!;
        request.status = 'processing';
        this.processingRequests.set(request.id, request);

        console.log(
          `📤 MediaQueue: Processing ${request.type} request (${priority} priority)`
        );

        return request;
      }
    }

    return null;
  }

  /**
   * 特定のリクエストを取得
   */
  public get(requestId: string): QueuedRequest | undefined {
    // 処理中のリクエストを確認
    if (this.processingRequests.has(requestId)) {
      return this.processingRequests.get(requestId);
    }

    // キュー内を検索
    for (const priority of ['high', 'normal', 'low'] as const) {
      const request = this.queue[priority].find((r) => r.id === requestId);
      if (request) {
        return request;
      }
    }

    return undefined;
  }

  /**
   * リクエストを完了として記録
   */
  public complete(requestId: string, result?: any): void {
    const request = this.processingRequests.get(requestId);
    if (request) {
      request.status = 'completed';
      request.result = result;

      // 処理中リストから削除（メモリ節約のため）
      setTimeout(() => {
        this.processingRequests.delete(requestId);
      }, 5000);

      console.log(`✅ MediaQueue: Completed ${request.type} request`);
    }
  }

  /**
   * リクエストを失敗として記録
   */
  public fail(requestId: string, error: string): void {
    const request = this.processingRequests.get(requestId);
    if (request) {
      request.status = 'failed';
      request.error = error;

      // 処理中リストから削除（メモリ節約のため）
      setTimeout(() => {
        this.processingRequests.delete(requestId);
      }, 5000);

      console.log(`❌ MediaQueue: Failed ${request.type} request: ${error}`);
    }
  }

  /**
   * リクエストをキューから削除
   */
  public dequeue(requestId: string): boolean {
    // 処理中のリクエストから削除
    if (this.processingRequests.delete(requestId)) {
      return true;
    }

    // キューから削除
    for (const priority of ['high', 'normal', 'low'] as const) {
      const index = this.queue[priority].findIndex((r) => r.id === requestId);
      if (index !== -1) {
        this.queue[priority].splice(index, 1);
        return true;
      }
    }

    return false;
  }

  /**
   * 特定タイプのリクエストをすべて取得
   */
  public getByType(type: 'audio' | 'image'): QueuedRequest[] {
    const requests: QueuedRequest[] = [];

    // キュー内のリクエスト
    for (const priority of ['high', 'normal', 'low'] as const) {
      requests.push(...this.queue[priority].filter((r) => r.type === type));
    }

    // 処理中のリクエスト
    for (const request of this.processingRequests.values()) {
      if (request.type === type) {
        requests.push(request);
      }
    }

    return requests;
  }

  /**
   * キューの状態を取得
   */
  public getStatus(): {
    size: number;
    pending: number;
    processing: number;
    requests: QueuedRequest[];
  } {
    const pending = this.queue.high.length + this.queue.normal.length + this.queue.low.length;
    const processing = this.processingRequests.size;

    const requests: QueuedRequest[] = [
      ...this.queue.high,
      ...this.queue.normal,
      ...this.queue.low,
      ...Array.from(this.processingRequests.values()),
    ];

    return {
      size: pending + processing,
      pending,
      processing,
      requests,
    };
  }

  /**
   * キューのサイズを取得
   */
  public getSize(): number {
    return (
      this.queue.high.length +
      this.queue.normal.length +
      this.queue.low.length +
      this.processingRequests.size
    );
  }

  /**
   * キューが空かどうかを確認
   */
  public isEmpty(): boolean {
    return this.getSize() === 0;
  }

  /**
   * キューがフルかどうかを確認
   */
  public isFull(): boolean {
    return this.getSize() >= this.maxSize;
  }

  /**
   * 優先度別の統計を取得
   */
  public getStatsByPriority(): {
    high: number;
    normal: number;
    low: number;
  } {
    return {
      high: this.queue.high.length,
      normal: this.queue.normal.length,
      low: this.queue.low.length,
    };
  }

  /**
   * キューをクリア
   */
  public clear(): void {
    this.queue = {
      high: [],
      normal: [],
      low: [],
    };
    this.processingRequests.clear();

    console.log('🧹 MediaQueue: Cleared all requests');
  }

  /**
   * 特定の優先度のキューをクリア
   */
  public clearByPriority(priority: 'high' | 'normal' | 'low'): void {
    this.queue[priority] = [];
    console.log(`🧹 MediaQueue: Cleared ${priority} priority queue`);
  }

  /**
   * 特定タイプのリクエストをクリア
   */
  public clearByType(type: 'audio' | 'image'): void {
    for (const priority of ['high', 'normal', 'low'] as const) {
      this.queue[priority] = this.queue[priority].filter((r) => r.type !== type);
    }

    // 処理中のリクエストも確認
    for (const [id, request] of this.processingRequests.entries()) {
      if (request.type === type) {
        this.processingRequests.delete(id);
      }
    }

    console.log(`🧹 MediaQueue: Cleared all ${type} requests`);
  }
}