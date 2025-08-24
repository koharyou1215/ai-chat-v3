// Performance Tracking Utility for AI Chat V3
// Monitors response times and identifies bottlenecks

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceStats {
  operation: string;
  count: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  totalTime: number;
  slowOperations: number; // Operations over 1000ms
}

export class PerformanceTracker {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private readonly MAX_METRICS_PER_OPERATION = 100; // Keep last 100 measurements
  private readonly SLOW_THRESHOLD = 1000; // 1 second

  /**
   * Track an async operation and measure its performance
   */
  async track<T>(
    operation: string, 
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const start = performance.now();
    const timestamp = Date.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      this.recordMetric({
        operation,
        duration,
        timestamp,
        metadata
      });
      
      // Log slow operations
      if (duration > this.SLOW_THRESHOLD) {
        console.warn(
          `🐌 Slow operation detected: ${operation} took ${duration.toFixed(1)}ms`,
          metadata
        );
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.recordMetric({
        operation: `${operation}_ERROR`,
        duration,
        timestamp,
        metadata: { ...metadata, error: String(error) }
      });
      
      console.error(
        `❌ Operation failed: ${operation} (${duration.toFixed(1)}ms)`, 
        error
      );
      throw error;
    }
  }

  /**
   * Track a synchronous operation
   */
  trackSync<T>(
    operation: string, 
    fn: () => T,
    metadata?: Record<string, unknown>
  ): T {
    const start = performance.now();
    const timestamp = Date.now();
    
    try {
      const result = fn();
      const duration = performance.now() - start;
      
      this.recordMetric({
        operation,
        duration,
        timestamp,
        metadata
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.recordMetric({
        operation: `${operation}_ERROR`,
        duration,
        timestamp,
        metadata: { ...metadata, error: String(error) }
      });
      
      throw error;
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric): void {
    if (!this.metrics.has(metric.operation)) {
      this.metrics.set(metric.operation, []);
    }
    
    const metrics = this.metrics.get(metric.operation)!;
    metrics.push(metric);
    
    // Keep only the last N measurements to prevent memory growth
    if (metrics.length > this.MAX_METRICS_PER_OPERATION) {
      metrics.shift();
    }
  }

  /**
   * Get statistics for a specific operation
   */
  getStats(operation: string): PerformanceStats | null {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration);
    const totalTime = durations.reduce((sum, time) => sum + time, 0);
    const slowOperations = durations.filter(d => d > this.SLOW_THRESHOLD).length;

    return {
      operation,
      count: metrics.length,
      averageTime: totalTime / metrics.length,
      minTime: Math.min(...durations),
      maxTime: Math.max(...durations),
      totalTime,
      slowOperations
    };
  }

  /**
   * Get statistics for all operations
   */
  getAllStats(): PerformanceStats[] {
    const stats: PerformanceStats[] = [];
    
    for (const operation of this.metrics.keys()) {
      const stat = this.getStats(operation);
      if (stat) {
        stats.push(stat);
      }
    }
    
    // Sort by total time (most impactful operations first)
    return stats.sort((a, b) => b.totalTime - a.totalTime);
  }

  /**
   * Get recent performance data (last N minutes)
   */
  getRecentMetrics(minutesBack: number = 5): PerformanceMetric[] {
    const cutoff = Date.now() - (minutesBack * 60 * 1000);
    const recentMetrics: PerformanceMetric[] = [];
    
    for (const metrics of this.metrics.values()) {
      const recent = metrics.filter(m => m.timestamp > cutoff);
      recentMetrics.push(...recent);
    }
    
    return recentMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalOperations: number;
    slowOperations: number;
    averageResponseTime: number;
    bottlenecks: Array<{operation: string; averageTime: number; count: number}>;
  } {
    const allStats = this.getAllStats();
    
    const totalOperations = allStats.reduce((sum, stat) => sum + stat.count, 0);
    const totalSlowOps = allStats.reduce((sum, stat) => sum + stat.slowOperations, 0);
    const totalTime = allStats.reduce((sum, stat) => sum + stat.totalTime, 0);
    
    // Identify bottlenecks (operations with high average time and significant usage)
    const bottlenecks = allStats
      .filter(stat => stat.averageTime > 200 && stat.count > 5)
      .map(stat => ({
        operation: stat.operation,
        averageTime: stat.averageTime,
        count: stat.count
      }))
      .slice(0, 5); // Top 5 bottlenecks
    
    return {
      totalOperations,
      slowOperations: totalSlowOps,
      averageResponseTime: totalOperations > 0 ? totalTime / totalOperations : 0,
      bottlenecks
    };
  }

  /**
   * Clear old metrics to free memory
   */
  cleanup(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // Keep last 24 hours
    
    for (const [operation, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      
      if (filtered.length === 0) {
        this.metrics.delete(operation);
      } else {
        this.metrics.set(operation, filtered);
      }
    }
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): {
    timestamp: number;
    stats: PerformanceStats[];
    summary: ReturnType<typeof this.getSummary>;
  } {
    return {
      timestamp: Date.now(),
      stats: this.getAllStats(),
      summary: this.getSummary()
    };
  }
}

// Global performance tracker instance
export const performanceTracker = new PerformanceTracker();

// Auto-cleanup every hour
setInterval(() => {
  performanceTracker.cleanup();
}, 60 * 60 * 1000);