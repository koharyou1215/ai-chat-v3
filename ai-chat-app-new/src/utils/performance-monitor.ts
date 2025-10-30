/**
 * Performance monitoring utilities for bundle size and loading performance
 */

import React from 'react';

// Performance API型拡張
interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput?: boolean;
  value: number;
}

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// ===== BUNDLE SIZE MONITORING =====

export class BundlePerformanceMonitor {
  private static loadTimes = new Map<string, number>();
  private static chunkSizes = new Map<string, number>();

  /**
   * Record component load time
   */
  static recordLoadTime(componentName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      this.loadTimes.set(componentName, loadTime);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚡ ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
      }
    };
  }

  /**
   * Get performance metrics
   */
  static getMetrics(): {
    averageLoadTime: number;
    slowestComponents: Array<{ name: string; time: number }>;
    totalComponents: number;
  } {
    const times = Array.from(this.loadTimes.values());
    const averageLoadTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    
    const slowestComponents = Array.from(this.loadTimes.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, time]) => ({ name, time }));

    return {
      averageLoadTime,
      slowestComponents,
      totalComponents: this.loadTimes.size,
    };
  }

  /**
   * Log performance report
   */
  static logPerformanceReport(): void {
    if (process.env.NODE_ENV !== 'development') return;

    const metrics = this.getMetrics();
    console.group('📊 Bundle Performance Report');
    console.log(`Average load time: ${metrics.averageLoadTime.toFixed(2)}ms`);
    console.log(`Total components monitored: ${metrics.totalComponents}`);
    console.log('Slowest components:', metrics.slowestComponents);
    console.groupEnd();
  }

  /**
   * Clear metrics (for testing)
   */
  static clearMetrics(): void {
    this.loadTimes.clear();
    this.chunkSizes.clear();
  }
}

// ===== LAZY LOADING PERFORMANCE HELPERS =====

export class LazyLoadingMonitor {
  private static pendingLoads = new Set<string>();
  private static failedLoads = new Set<string>();

  /**
   * Track lazy component loading
   */
  static trackLazyLoad(componentName: string): {
    onStart: () => void;
    onSuccess: () => void;
    onError: (error: Error) => void;
  } {
    return {
      onStart: () => {
        this.pendingLoads.add(componentName);
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 Starting lazy load: ${componentName}`);
        }
      },
      onSuccess: () => {
        this.pendingLoads.delete(componentName);
        BundlePerformanceMonitor.recordLoadTime(componentName)();
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Lazy load success: ${componentName}`);
        }
      },
      onError: (error: Error) => {
        this.pendingLoads.delete(componentName);
        this.failedLoads.add(componentName);
        console.error(`❌ Lazy load failed: ${componentName}`, error);
      }
    };
  }

  /**
   * Get current loading status
   */
  static getStatus(): {
    pendingLoads: string[];
    failedLoads: string[];
    isPending: (componentName: string) => boolean;
    hasFailed: (componentName: string) => boolean;
  } {
    return {
      pendingLoads: Array.from(this.pendingLoads),
      failedLoads: Array.from(this.failedLoads),
      isPending: (componentName: string) => this.pendingLoads.has(componentName),
      hasFailed: (componentName: string) => this.failedLoads.has(componentName),
    };
  }
}

// ===== CORE WEB VITALS MONITORING =====

export class CoreWebVitalsMonitor {
  /**
   * Measure First Contentful Paint
   */
  static measureFCP(): Promise<number> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(0);
        return;
      }

      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          resolve(fcpEntry.startTime);
        }
      }).observe({ entryTypes: ['paint'] });

      // Fallback timeout
      setTimeout(() => resolve(0), 5000);
    });
  }

  /**
   * Measure Largest Contentful Paint
   */
  static measureLCP(): Promise<number> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(0);
        return;
      }

      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const latestEntry = entries[entries.length - 1];
        if (latestEntry) {
          resolve(latestEntry.startTime);
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // Fallback timeout
      setTimeout(() => resolve(0), 10000);
    });
  }

  /**
   * Measure Cumulative Layout Shift
   */
  static measureCLS(): Promise<number> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(0);
        return;
      }

      let clsValue = 0;

      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const layoutShiftEntry = entry as LayoutShiftEntry;
          if (layoutShiftEntry.hadRecentInput) continue;
          clsValue += layoutShiftEntry.value;
        }
        resolve(clsValue);
      }).observe({ entryTypes: ['layout-shift'] });

      // Resolve with current value after 5 seconds
      setTimeout(() => resolve(clsValue), 5000);
    });
  }

  /**
   * Get comprehensive Core Web Vitals report
   */
  static async getCoreWebVitals(): Promise<{
    fcp: number;
    lcp: number;
    cls: number;
    performanceScore: number;
  }> {
    const [fcp, lcp, cls] = await Promise.all([
      this.measureFCP(),
      this.measureLCP(),
      this.measureCLS(),
    ]);

    // Calculate performance score (0-100)
    const fcpScore = fcp < 1800 ? 100 : Math.max(0, 100 - (fcp - 1800) / 20);
    const lcpScore = lcp < 2500 ? 100 : Math.max(0, 100 - (lcp - 2500) / 30);
    const clsScore = cls < 0.1 ? 100 : Math.max(0, 100 - (cls - 0.1) * 1000);
    
    const performanceScore = Math.round((fcpScore + lcpScore + clsScore) / 3);

    return { fcp, lcp, cls, performanceScore };
  }
}

// ===== MEMORY MONITORING =====

export class MemoryMonitor {
  /**
   * Get current memory usage (if available)
   */
  static getMemoryUsage(): {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
    usagePercentage?: number;
  } {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return {};
    }

    const perfWithMemory = performance as Performance & { memory?: PerformanceMemory };
    const memory = perfWithMemory.memory;
    if (!memory) return {};

    const usagePercentage = memory.totalJSHeapSize > 0 
      ? (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100 
      : 0;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage,
    };
  }

  /**
   * Monitor for memory leaks
   */
  static startMemoryMonitoring(intervalMs: number = 30000): () => void {
    if (typeof window === 'undefined') return () => {};

    const intervalId = setInterval(() => {
      const usage = this.getMemoryUsage();
      if (usage.usagePercentage && usage.usagePercentage > 80) {
        console.warn('⚠️ High memory usage detected:', usage);
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }
}

// ===== PERFORMANCE HOOKS =====

/**
 * Hook to monitor component performance
 */
export const usePerformanceMonitor = (componentName: string) => {
  React.useEffect(() => {
    const endTimer = BundlePerformanceMonitor.recordLoadTime(componentName);
    return endTimer;
  }, [componentName]);
};

/**
 * Hook to monitor lazy loading
 */
export const useLazyLoadMonitor = (componentName: string) => {
  const tracker = LazyLoadingMonitor.trackLazyLoad(componentName);
  
  React.useEffect(() => {
    tracker.onStart();
    return () => {
      // Component unmounted, consider it successful if no error was reported
      if (!LazyLoadingMonitor.getStatus().hasFailed(componentName)) {
        tracker.onSuccess();
      }
    };
  }, [componentName, tracker]);

  return tracker;
};

// ===== PERFORMANCE REPORTING =====

export const PerformanceReporter = {
  /**
   * Generate comprehensive performance report
   */
  async generateReport(): Promise<{
    bundleMetrics: ReturnType<typeof BundlePerformanceMonitor.getMetrics>;
    coreWebVitals: Awaited<ReturnType<typeof CoreWebVitalsMonitor.getCoreWebVitals>>;
    memoryUsage: ReturnType<typeof MemoryMonitor.getMemoryUsage>;
    lazyLoadStatus: ReturnType<typeof LazyLoadingMonitor.getStatus>;
  }> {
    const [bundleMetrics, coreWebVitals, memoryUsage] = await Promise.all([
      Promise.resolve(BundlePerformanceMonitor.getMetrics()),
      CoreWebVitalsMonitor.getCoreWebVitals(),
      Promise.resolve(MemoryMonitor.getMemoryUsage()),
    ]);

    const lazyLoadStatus = LazyLoadingMonitor.getStatus();

    return {
      bundleMetrics,
      coreWebVitals,
      memoryUsage,
      lazyLoadStatus,
    };
  },

  /**
   * Log comprehensive performance report
   */
  async logReport(): Promise<void> {
    if (process.env.NODE_ENV !== 'development') return;

    const report = await this.generateReport();
    
    console.group('📊 Comprehensive Performance Report');
    console.log('Bundle Performance:', report.bundleMetrics);
    console.log('Core Web Vitals:', report.coreWebVitals);
    console.log('Memory Usage:', report.memoryUsage);
    console.log('Lazy Loading:', report.lazyLoadStatus);
    console.groupEnd();
  },
};