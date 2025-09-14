/**
 * MediaOrchestrator
 * 統合メディアサービスオーケストレーター
 * 音声と画像の生成・再生を統合管理
 */

import { AudioService } from './AudioService';
import { ImageService } from './ImageService';
import { MediaQueue } from './MediaQueue';
import { MediaCache } from './MediaCache';
import { Character } from '@/types/core/character.types';
import { UnifiedMessage } from '@/types/memory';

export interface MediaRequest {
  id: string;
  type: 'audio' | 'image';
  priority: 'high' | 'normal' | 'low';
  data: any;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface MediaOrchestratorOptions {
  maxConcurrentAudio?: number;
  maxConcurrentImage?: number;
  cacheEnabled?: boolean;
  cacheMaxSize?: number;
  queueMaxSize?: number;
}

export class MediaOrchestrator {
  private static instance: MediaOrchestrator | null = null;

  private audioService: AudioService;
  private imageService: ImageService;
  private mediaQueue: MediaQueue;
  private mediaCache: MediaCache;

  private options: Required<MediaOrchestratorOptions>;
  private isInitialized = false;

  private constructor(options: MediaOrchestratorOptions = {}) {
    this.options = {
      maxConcurrentAudio: options.maxConcurrentAudio ?? 1,
      maxConcurrentImage: options.maxConcurrentImage ?? 2,
      cacheEnabled: options.cacheEnabled ?? true,
      cacheMaxSize: options.cacheMaxSize ?? 50 * 1024 * 1024, // 50MB
      queueMaxSize: options.queueMaxSize ?? 100,
    };

    // サービスの初期化
    this.audioService = new AudioService();
    this.imageService = new ImageService();
    this.mediaQueue = new MediaQueue(this.options.queueMaxSize);
    this.mediaCache = new MediaCache(this.options.cacheMaxSize);
  }

  /**
   * シングルトンインスタンスの取得
   */
  public static getInstance(options?: MediaOrchestratorOptions): MediaOrchestrator {
    if (!MediaOrchestrator.instance) {
      MediaOrchestrator.instance = new MediaOrchestrator(options);
    }
    return MediaOrchestrator.instance;
  }

  /**
   * オーケストレーターの初期化
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🎬 MediaOrchestrator: Initializing...');

    try {
      // 各サービスの初期化
      await Promise.all([
        this.audioService.initialize(),
        this.imageService.initialize(),
      ]);

      this.isInitialized = true;
      console.log('✅ MediaOrchestrator: Initialized successfully');
    } catch (error) {
      console.error('❌ MediaOrchestrator: Initialization failed', error);
      throw error;
    }
  }

  /**
   * 音声再生リクエスト
   */
  public async playAudio(
    text: string,
    character?: Character,
    options?: {
      voiceType?: 'voicevox' | 'browser';
      speakerId?: number;
      speed?: number;
      pitch?: number;
    }
  ): Promise<string> {
    const requestId = this.generateRequestId();

    // キャッシュチェック
    const cacheKey = this.generateCacheKey('audio', { text, character, options });
    if (this.options.cacheEnabled) {
      const cached = await this.mediaCache.get(cacheKey);
      if (cached) {
        console.log('🎵 MediaOrchestrator: Audio found in cache');
        return cached;
      }
    }

    // キューに追加
    const request: MediaRequest = {
      id: requestId,
      type: 'audio',
      priority: 'normal',
      data: { text, character, options },
      timestamp: Date.now(),
      status: 'pending',
    };

    await this.mediaQueue.enqueue(request);

    try {
      // 音声サービスで処理
      request.status = 'processing';
      const audioUrl = await this.audioService.playText(text, character, options);

      // キャッシュに保存
      if (this.options.cacheEnabled) {
        await this.mediaCache.set(cacheKey, audioUrl);
      }

      request.status = 'completed';
      request.result = audioUrl;

      return audioUrl;
    } catch (error) {
      request.status = 'failed';
      request.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      this.mediaQueue.dequeue(requestId);
    }
  }

  /**
   * 画像生成リクエスト
   */
  public async generateImage(
    character: Character,
    messages: UnifiedMessage[],
    trackers: any[],
    customPrompt?: string
  ): Promise<string> {
    const requestId = this.generateRequestId();

    // キャッシュチェック
    const cacheKey = this.generateCacheKey('image', { character, customPrompt });
    if (this.options.cacheEnabled) {
      const cached = await this.mediaCache.get(cacheKey);
      if (cached) {
        console.log('🖼️ MediaOrchestrator: Image found in cache');
        return cached;
      }
    }

    // キューに追加
    const request: MediaRequest = {
      id: requestId,
      type: 'image',
      priority: 'normal',
      data: { character, messages, trackers, customPrompt },
      timestamp: Date.now(),
      status: 'pending',
    };

    await this.mediaQueue.enqueue(request);

    try {
      // 画像サービスで処理
      request.status = 'processing';
      const imageUrl = await this.imageService.generate(
        character,
        messages,
        trackers,
        customPrompt
      );

      // キャッシュに保存
      if (this.options.cacheEnabled) {
        await this.mediaCache.set(cacheKey, imageUrl);
      }

      request.status = 'completed';
      request.result = imageUrl;

      return imageUrl;
    } catch (error) {
      request.status = 'failed';
      request.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      this.mediaQueue.dequeue(requestId);
    }
  }

  /**
   * 音声再生の停止
   */
  public stopAudio(): void {
    this.audioService.stop();
  }

  /**
   * キューの状態取得
   */
  public getQueueStatus(): {
    size: number;
    pending: number;
    processing: number;
    requests: MediaRequest[];
  } {
    return this.mediaQueue.getStatus();
  }

  /**
   * キャッシュのクリア
   */
  public async clearCache(): Promise<void> {
    await this.mediaCache.clear();
  }

  /**
   * キャッシュ統計の取得
   */
  public getCacheStats(): {
    size: number;
    count: number;
    hits: number;
    misses: number;
  } {
    return this.mediaCache.getStats();
  }

  /**
   * リクエストIDの生成
   */
  private generateRequestId(): string {
    return `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * キャッシュキーの生成
   */
  private generateCacheKey(type: 'audio' | 'image', data: any): string {
    const str = JSON.stringify(data);
    // 簡易ハッシュ
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `${type}-${hash}`;
  }

  /**
   * クリーンアップ
   */
  public async cleanup(): Promise<void> {
    console.log('🧹 MediaOrchestrator: Cleaning up...');

    // 音声を停止
    this.stopAudio();

    // キューをクリア
    this.mediaQueue.clear();

    // 各サービスのクリーンアップ
    await Promise.all([
      this.audioService.cleanup(),
      this.imageService.cleanup(),
    ]);

    console.log('✅ MediaOrchestrator: Cleanup completed');
  }
}