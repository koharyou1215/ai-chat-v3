// ⚡ 適応的性能管理システム - デバイス性能に応じた動的品質調整
// 設計文書の「性能最適化システム」に基づく実装

import { 
  EmotionalPerformanceConfig, 
  PerformanceMetrics,
  EmotionalIntelligenceError
} from '@/types/core/emotional-intelligence.types';

/**
 * 適応的性能管理システム
 * - デバイス性能を自動検出
 * - 感情分析品質を動的調整
 * - リソース使用量の最適化
 */
export class AdaptivePerformanceManager {
  private performanceProfile: 'low' | 'medium' | 'high' = 'medium';
  private currentMetrics: PerformanceMetrics;
  private performanceObserver?: PerformanceObserver;
  private isMonitoring = false;

  // 性能判定閾値
  private readonly PERFORMANCE_THRESHOLDS = {
    low: {
      memory: 2048,      // 2GB以下
      cpu: 0.8,         // CPU使用率80%以上
      responseTime: 500  // 500ms以上
    },
    medium: {
      memory: 4096,      // 4GB以下
      cpu: 0.6,         // CPU使用率60%以上
      responseTime: 300  // 300ms以上
    },
    high: {
      memory: 8192,      // 8GB以上
      cpu: 0.4,         // CPU使用率40%以下
      responseTime: 150  // 150ms以下
    }
  };

  constructor() {
    this.currentMetrics = this.initializeMetrics();
    this.performanceProfile = this.detectDeviceCapabilities();
    this.initializeMonitoring();
  }

  /**
   * デバイス性能を自動検出
   */
  private detectDeviceCapabilities(): 'low' | 'medium' | 'high' {
    try {
      // Navigator API による基本判定
      const navigatorExtended = window.navigator as Navigator & {
        deviceMemory?: number;
        connection?: {
          effectiveType?: string;
        };
        mozConnection?: {
          effectiveType?: string;
        };
        webkitConnection?: {
          effectiveType?: string;
        };
      };

      // メモリ情報
      const deviceMemory = navigatorExtended.deviceMemory || 4; // GB単位

      // CPU コア数
      const hardwareConcurrency = navigatorExtended.hardwareConcurrency || 4;

      // 接続速度（利用可能な場合）
      const connection = navigatorExtended.connection || navigatorExtended.mozConnection || navigatorExtended.webkitConnection;
      const effectiveType = connection?.effectiveType || 'unknown';

      // 総合判定
      let score = 0;

      // メモリスコア
      if (deviceMemory >= 8) score += 3;
      else if (deviceMemory >= 4) score += 2;
      else score += 1;

      // CPUスコア
      if (hardwareConcurrency >= 8) score += 3;
      else if (hardwareConcurrency >= 4) score += 2;
      else score += 1;

      // ネットワークスコア
      if (effectiveType === '4g' || effectiveType === '5g') score += 2;
      else if (effectiveType === '3g') score += 1;

      // 最終判定
      if (score >= 7) return 'high';
      if (score >= 5) return 'medium';
      return 'low';

    } catch (error) {
      console.warn('⚡ Device capability detection failed, using medium profile:', error);
      return 'medium';
    }
  }

  /**
   * 現在の性能に基づく最適設定を取得
   */
  getOptimalEmotionalSettings(): EmotionalPerformanceConfig {
    const profile = this.performanceProfile;
    
    switch (profile) {
      case 'low':
        return {
          emotionAnalysisFrequency: 'reduced',    // 3メッセージに1回
          contextDepth: 'shallow',                // 直近3メッセージのみ
          cacheSize: 'minimal',                   // 50エントリ
          workerThreads: 1,                       // 単一スレッド
          realTimeEffects: false                  // リアルタイム効果無効
        };

      case 'medium':
        return {
          emotionAnalysisFrequency: 'standard',   // 毎メッセージ
          contextDepth: 'medium',                 // 直近10メッセージ
          cacheSize: 'standard',                  // 200エントリ
          workerThreads: 2,                       // デュアルスレッド
          realTimeEffects: true                   // リアルタイム効果有効
        };

      case 'high':
        return {
          emotionAnalysisFrequency: 'enhanced',   // リアルタイム分析
          contextDepth: 'deep',                   // 全履歴考慮
          cacheSize: 'extensive',                 // 1000エントリ
          workerThreads: 4,                       // マルチスレッド
          realTimeEffects: true,                  // 全効果有効
          predictiveProcessing: true              // 予測処理
        };

      default:
        return this.getOptimalEmotionalSettings(); // 再帰的にmedium設定取得
    }
  }

  /**
   * 動的品質調整 - 負荷に応じてリアルタイム調整
   */
  adjustQualityBasedOnLoad(): EmotionalPerformanceConfig {
    const currentLoad = this.getCurrentSystemLoad();
    let adjustedConfig = this.getOptimalEmotionalSettings();

    if (currentLoad > 0.8) {
      // 🔴 高負荷時：品質を下げて安定性確保
      console.warn('⚡ High system load detected, reducing quality');
      adjustedConfig = {
        ...adjustedConfig,
        emotionAnalysisFrequency: 'reduced',
        contextDepth: 'shallow',
        realTimeEffects: false,
        workerThreads: Math.max(adjustedConfig.workerThreads - 1, 1)
      };
    } else if (currentLoad < 0.4) {
      // 🟢 低負荷時：品質を上げて体験向上
      console.log('⚡ Low system load detected, enhancing quality');
      adjustedConfig = {
        ...adjustedConfig,
        emotionAnalysisFrequency: 'enhanced',
        contextDepth: 'deep',
        realTimeEffects: true,
        predictiveProcessing: true
      };
    }

    return adjustedConfig;
  }

  /**
   * 性能監視を開始
   */
  startPerformanceMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('⚡ Performance monitoring started');

    // 定期的なメトリクス収集
    setInterval(() => {
      this.updateMetrics();
    }, 5000); // 5秒間隔

    // Performance Observer（利用可能な場合）
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            this.processPerformanceEntry(entry);
          }
        });

        this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        console.warn('⚡ Performance Observer initialization failed:', error);
      }
    }
  }

  /**
   * 性能監視を停止
   */
  stopPerformanceMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    console.log('⚡ Performance monitoring stopped');

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = undefined;
    }
  }

  /**
   * 現在のシステム負荷を取得
   */
  private getCurrentSystemLoad(): number {
    try {
      // メモリ使用量チェック
      const performanceExtended = performance as Performance & {
        memory?: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        };
      };
      const memoryInfo = performanceExtended.memory;
      let memoryLoad = 0;

      if (memoryInfo) {
        const usedMemory = memoryInfo.usedJSHeapSize;
        const totalMemory = memoryInfo.totalJSHeapSize;
        memoryLoad = totalMemory > 0 ? usedMemory / totalMemory : 0;
      }

      // 応答時間チェック
      let responseLoad = 0;
      if (this.currentMetrics.averageResponseTime > 0) {
        responseLoad = Math.min(this.currentMetrics.averageResponseTime / 1000, 1.0);
      }

      // エラー率チェック
      const errorLoad = this.currentMetrics.errorRate;

      // 総合負荷計算
      return Math.max(memoryLoad, responseLoad, errorLoad);

    } catch (error) {
      console.warn('⚡ System load calculation failed:', error);
      return 0.5; // デフォルト値
    }
  }

  /**
   * メトリクスを更新
   */
  private updateMetrics(): void {
    try {
      const performanceExtended = performance as Performance & {
        memory?: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        };
      };
      const memoryInfo = performanceExtended.memory;

      this.currentMetrics = {
        ...this.currentMetrics,
        memoryUsage: memoryInfo?.usedJSHeapSize ?
          Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) :
          this.currentMetrics.memoryUsage,
        cpuUsage: this.estimateCPUUsage(),
        cacheHitRate: this.calculateCacheHitRate()
      };

      // 性能プロファイルの動的調整
      const newProfile = this.determineProfileFromMetrics();
      if (newProfile !== this.performanceProfile) {
        console.log(`⚡ Performance profile changed: ${this.performanceProfile} → ${newProfile}`);
        this.performanceProfile = newProfile;
      }

    } catch (error) {
      console.warn('⚡ Metrics update failed:', error);
    }
  }

  /**
   * CPU使用率推定
   */
  private estimateCPUUsage(): number {
    try {
      // 簡易的なCPU負荷推定
      const start = performance.now();
      
      // 軽い計算タスクで負荷測定
      let sum = 0;
      for (let i = 0; i < 100000; i++) {
        sum += Math.random();
      }
      
      const duration = performance.now() - start;
      
      // 基準値（1ms）と比較してCPU負荷を推定
      return Math.min(duration / 10, 1.0);

    } catch (error) {
      return 0.5; // デフォルト値
    }
  }

  /**
   * キャッシュヒット率計算（モック実装）
   */
  private calculateCacheHitRate(): number {
    // 実際の実装では感情分析キャッシュの統計を使用
    return Math.random() * 0.3 + 0.7; // 70-100%の範囲
  }

  /**
   * メトリクスから性能プロファイルを判定
   */
  private determineProfileFromMetrics(): 'low' | 'medium' | 'high' {
    const metrics = this.currentMetrics;
    const thresholds = this.PERFORMANCE_THRESHOLDS;

    // 低性能判定
    if (
      metrics.memoryUsage > thresholds.low.memory ||
      metrics.cpuUsage > thresholds.low.cpu ||
      metrics.averageResponseTime > thresholds.low.responseTime
    ) {
      return 'low';
    }

    // 高性能判定
    if (
      metrics.memoryUsage < thresholds.high.memory &&
      metrics.cpuUsage < thresholds.high.cpu &&
      metrics.averageResponseTime < thresholds.high.responseTime
    ) {
      return 'high';
    }

    // 中性能（デフォルト）
    return 'medium';
  }

  /**
   * Performance Entryを処理
   */
  private processPerformanceEntry(entry: PerformanceEntry): void {
    if (entry.entryType === 'measure' && entry.name.includes('emotion')) {
      // 感情分析関連の計測結果を処理
      this.currentMetrics.averageResponseTime = 
        (this.currentMetrics.averageResponseTime + entry.duration) / 2;
    }
  }

  /**
   * 初期メトリクスを作成
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      averageResponseTime: 100,
      memoryUsage: 50,     // MB
      cpuUsage: 0.3,       // 30%
      cacheHitRate: 0.8,   // 80%
      errorRate: 0.01      // 1%
    };
  }

  /**
   * 監視を初期化
   */
  private initializeMonitoring(): void {
    // 自動監視開始
    this.startPerformanceMonitoring();

    // ページ終了時にクリーンアップ
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.stopPerformanceMonitoring();
      });
    }
  }

  /**
   * 現在の性能状態を取得
   */
  getPerformanceStatus() {
    return {
      profile: this.performanceProfile,
      metrics: this.currentMetrics,
      isMonitoring: this.isMonitoring,
      optimalSettings: this.getOptimalEmotionalSettings(),
      systemLoad: this.getCurrentSystemLoad()
    };
  }

  /**
   * 性能プロファイルを手動設定
   */
  setPerformanceProfile(profile: 'low' | 'medium' | 'high'): void {
    console.log(`⚡ Manual performance profile set: ${profile}`);
    this.performanceProfile = profile;
  }

  /**
   * 緊急時の性能降格
   */
  emergencyPerformanceDegradation(): EmotionalPerformanceConfig {
    console.warn('⚡ Emergency performance degradation activated');
    return {
      emotionAnalysisFrequency: 'reduced',
      contextDepth: 'shallow',
      cacheSize: 'minimal',
      workerThreads: 1,
      realTimeEffects: false
    };
  }
}