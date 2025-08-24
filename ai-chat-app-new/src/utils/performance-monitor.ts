/**
 * リアルタイムパフォーマンス監視システム
 * 最適化効果の測定と検証用
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private completedMetrics: PerformanceMetric[] = [];
  private slowThreshold = 1000; // 1秒以上で警告

  /**
   * パフォーマンス測定開始
   */
  startMeasure(name: string, metadata?: Record<string, unknown>): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    };
    
    this.metrics.set(name, metric);
    console.log(`⏱️ Started measuring: ${name}`);
  }

  /**
   * パフォーマンス測定終了
   */
  endMeasure(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`⚠️ No measurement found for: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;
    
    // 完了メトリクスに移動
    this.completedMetrics.push(metric);
    this.metrics.delete(name);
    
    // パフォーマンスログ
    const logLevel = duration > this.slowThreshold ? 'warn' : 'log';
    console[logLevel](`⚡ ${name}: ${duration.toFixed(1)}ms`);
    
    if (duration > this.slowThreshold) {
      console.warn(`🐌 Slow operation detected: ${name} took ${duration.toFixed(1)}ms`);
    }
    
    return duration;
  }

  /**
   * 自動測定ラッパー
   */
  async measureAsync<T>(name: string, asyncFunction: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    this.startMeasure(name, metadata);
    try {
      const result = await asyncFunction();
      this.endMeasure(name);
      return result;
    } catch (error) {
      this.endMeasure(name);
      throw error;
    }
  }

  /**
   * パフォーマンス統計を取得
   */
  getStats(): {
    averageTime: Record<string, number>;
    slowOperations: PerformanceMetric[];
    totalMeasurements: number;
    activeMetrics: string[];
  } {
    // 平均時間を計算
    const operationTimes: Record<string, number[]> = {};
    
    this.completedMetrics.forEach(metric => {
      if (metric.duration) {
        if (!operationTimes[metric.name]) {
          operationTimes[metric.name] = [];
        }
        operationTimes[metric.name].push(metric.duration);
      }
    });
    
    const averageTime: Record<string, number> = {};
    Object.keys(operationTimes).forEach(name => {
      const times = operationTimes[name];
      averageTime[name] = times.reduce((sum, time) => sum + time, 0) / times.length;
    });
    
    // 遅い操作を特定
    const slowOperations = this.completedMetrics.filter(
      metric => metric.duration && metric.duration > this.slowThreshold
    );
    
    return {
      averageTime,
      slowOperations,
      totalMeasurements: this.completedMetrics.length,
      activeMetrics: Array.from(this.metrics.keys())
    };
  }

  /**
   * パフォーマンスレポート生成
   */
  generateReport(): string {
    const stats = this.getStats();
    
    let report = '📊 Performance Report\n';
    report += '========================\n\n';
    
    // 平均時間
    report += '⏱️ Average Response Times:\n';
    Object.entries(stats.averageTime).forEach(([name, time]) => {
      const status = time < 500 ? '✅' : time < 1000 ? '⚠️' : '❌';
      report += `${status} ${name}: ${time.toFixed(1)}ms\n`;
    });
    
    // 遅い操作
    if (stats.slowOperations.length > 0) {
      report += '\n🐌 Slow Operations:\n';
      stats.slowOperations.forEach(op => {
        report += `- ${op.name}: ${op.duration!.toFixed(1)}ms\n`;
      });
    }
    
    // 総括
    report += `\n📈 Total measurements: ${stats.totalMeasurements}\n`;
    report += `🔄 Active measurements: ${stats.activeMetrics.length}\n`;
    
    return report;
  }

  /**
   * パフォーマンス改善提案
   */
  getOptimizationSuggestions(): string[] {
    const stats = this.getStats();
    const suggestions: string[] = [];
    
    Object.entries(stats.averageTime).forEach(([name, time]) => {
      if (time > 2000) {
        suggestions.push(`🚨 ${name}: Extremely slow (${time.toFixed(1)}ms). Consider major refactoring.`);
      } else if (time > 1000) {
        suggestions.push(`⚠️ ${name}: Slow (${time.toFixed(1)}ms). Consider caching or optimization.`);
      } else if (time > 500) {
        suggestions.push(`💡 ${name}: Could be faster (${time.toFixed(1)}ms). Minor optimizations possible.`);
      }
    });
    
    return suggestions;
  }

  /**
   * メトリクスクリア
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.completedMetrics = [];
    console.log('🧹 Performance metrics cleared');
  }
}

export const performanceMonitor = new PerformanceMonitor();

// デベロッパー用のグローバル関数
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as Record<string, unknown>).performanceReport = () => {
    console.log(performanceMonitor.generateReport());
    return performanceMonitor.getStats();
  };
  
  (window as Record<string, unknown>).performanceSuggestions = () => {
    const suggestions = performanceMonitor.getOptimizationSuggestions();
    suggestions.forEach(suggestion => console.log(suggestion));
    return suggestions;
  };
}