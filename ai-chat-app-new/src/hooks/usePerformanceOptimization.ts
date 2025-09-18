/**
 * Performance optimization hook for React components
 * Provides intelligent memoization, performance monitoring, and optimization suggestions
 */

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// ===== PERFORMANCE METRICS =====

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  memoryUsage?: number;
  componentSize: number;
}

interface OptimizationSuggestions {
  memoizeProps: boolean;
  splitComponent: boolean;
  lazyLoad: boolean;
  reduceEffects: boolean;
  virtualizeList: boolean;
}

// ===== PERFORMANCE MONITOR CLASS =====

class ComponentPerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private renderTimings: Map<string, number[]> = new Map();

  startRender(componentName: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      this.recordRender(componentName, renderTime);
    };
  }

  private recordRender(componentName: string, renderTime: number) {
    const current = this.metrics.get(componentName) || {
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      componentSize: 0,
    };

    const timings = this.renderTimings.get(componentName) || [];
    timings.push(renderTime);

    // Keep only last 10 render timings
    if (timings.length > 10) {
      timings.shift();
    }

    this.renderTimings.set(componentName, timings);

    const updated: PerformanceMetrics = {
      ...current,
      renderCount: current.renderCount + 1,
      lastRenderTime: renderTime,
      averageRenderTime: timings.reduce((sum, time) => sum + time, 0) / timings.length,
      componentSize: this.estimateComponentSize(componentName),
    };

    this.metrics.set(componentName, updated);
  }

  private estimateComponentSize(componentName: string): number {
    // Rough estimation based on component complexity
    const complexity = {
      'MessageBubble': 50,
      'ChatInterface': 100,
      'SettingsModal': 150,
      'ProgressiveMessageBubble': 80,
      'TrackerDisplay': 60,
    };

    return complexity[componentName as keyof typeof complexity] || 30;
  }

  getMetrics(componentName: string): PerformanceMetrics | undefined {
    return this.metrics.get(componentName);
  }

  getAllMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  getSuggestions(componentName: string): OptimizationSuggestions {
    const metrics = this.metrics.get(componentName);

    if (!metrics) {
      return {
        memoizeProps: false,
        splitComponent: false,
        lazyLoad: false,
        reduceEffects: false,
        virtualizeList: false,
      };
    }

    return {
      memoizeProps: metrics.renderCount > 5 && metrics.averageRenderTime > 16,
      splitComponent: metrics.componentSize > 100,
      lazyLoad: metrics.componentSize > 80 && metrics.renderCount < 3,
      reduceEffects: metrics.averageRenderTime > 32,
      virtualizeList: metrics.componentSize > 120,
    };
  }

  clearMetrics(componentName?: string) {
    if (componentName) {
      this.metrics.delete(componentName);
      this.renderTimings.delete(componentName);
    } else {
      this.metrics.clear();
      this.renderTimings.clear();
    }
  }
}

// ===== GLOBAL MONITOR INSTANCE =====

const globalMonitor = new ComponentPerformanceMonitor();

// ===== PERFORMANCE OPTIMIZATION HOOK =====

export function usePerformanceOptimization(componentName: string) {
  const renderCountRef = useRef(0);
  const [isOptimizationEnabled, setIsOptimizationEnabled] = useState(true);

  // Performance monitoring
  useEffect(() => {
    if (!isOptimizationEnabled) return;

    const endRender = globalMonitor.startRender(componentName);
    renderCountRef.current += 1;

    return endRender;
  });

  // Optimized callback creator
  const createOptimizedCallback = useCallback(
    <T extends (...args: any[]) => any>(callback: T, deps: React.DependencyList): T => {
      if (!isOptimizationEnabled) return callback;

      // eslint-disable-next-line react-hooks/exhaustive-deps
      return useCallback(callback, deps) as T;
    },
    [isOptimizationEnabled]
  );

  // Optimized memo creator
  const createOptimizedMemo = useCallback(
    <T>(factory: () => T, deps: React.DependencyList): T => {
      if (!isOptimizationEnabled) return factory();

      // eslint-disable-next-line react-hooks/exhaustive-deps
      return useMemo(factory, deps);
    },
    [isOptimizationEnabled]
  );

  // Smart memoization based on render frequency
  const smartMemo = useCallback(
    <T>(factory: () => T, deps: React.DependencyList, threshold: number = 3): T => {
      const shouldMemoize = renderCountRef.current > threshold || !isOptimizationEnabled;

      if (shouldMemoize) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        return useMemo(factory, deps);
      }

      return factory();
    },
    [isOptimizationEnabled]
  );

  // Performance metrics
  const metrics = useMemo(() =>
    globalMonitor.getMetrics(componentName),
    [componentName]
  );

  // Optimization suggestions
  const suggestions = useMemo(() =>
    globalMonitor.getSuggestions(componentName),
    [componentName, metrics]
  );

  // Performance controls
  const controls = useMemo(() => ({
    enableOptimization: () => setIsOptimizationEnabled(true),
    disableOptimization: () => setIsOptimizationEnabled(false),
    clearMetrics: () => globalMonitor.clearMetrics(componentName),
    getAllMetrics: () => globalMonitor.getAllMetrics(),
  }), [componentName]);

  // Throttled function creator
  const createThrottledCallback = useCallback(
    <T extends (...args: any[]) => any>(
      callback: T,
      delay: number = 100
    ): T => {
      const lastCallRef = useRef<number>(0);

      return useCallback((...args: Parameters<T>) => {
        const now = Date.now();
        if (now - lastCallRef.current >= delay) {
          lastCallRef.current = now;
          return callback(...args);
        }
      }, [callback, delay]) as T;
    },
    []
  );

  // Debounced function creator
  const createDebouncedCallback = useCallback(
    <T extends (...args: any[]) => any>(
      callback: T,
      delay: number = 300
    ): T => {
      const timeoutRef = useRef<NodeJS.Timeout>();

      return useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          callback(...args);
        }, delay);
      }, [callback, delay]) as T;
    },
    []
  );

  // Effect cleanup helper
  const createCleanupEffect = useCallback(
    (effect: () => (() => void) | void, deps: React.DependencyList) => {
      useEffect(() => {
        const cleanup = effect();
        return cleanup;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, deps);
    },
    []
  );

  return {
    // Optimization utilities
    createOptimizedCallback,
    createOptimizedMemo,
    smartMemo,
    createThrottledCallback,
    createDebouncedCallback,
    createCleanupEffect,

    // Performance data
    metrics,
    suggestions,
    renderCount: renderCountRef.current,

    // Controls
    controls,
    isOptimizationEnabled,

    // Utilities
    shouldSplitComponent: suggestions?.splitComponent || false,
    shouldLazyLoad: suggestions?.lazyLoad || false,
    shouldMemoizeProps: suggestions?.memoizeProps || false,
    shouldReduceEffects: suggestions?.reduceEffects || false,
    shouldVirtualizeList: suggestions?.virtualizeList || false,
  };
}

// ===== PERFORMANCE HOC =====

export function withPerformanceOptimization<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  componentName: string,
  optimizationConfig?: {
    enableMetrics?: boolean;
    enableSuggestions?: boolean;
    enableAutoOptimization?: boolean;
  }
) {
  const config = {
    enableMetrics: true,
    enableSuggestions: true,
    enableAutoOptimization: false,
    ...optimizationConfig,
  };

  const OptimizedComponent = React.memo((props: T) => {
    const {
      metrics,
      suggestions,
      controls,
    } = usePerformanceOptimization(componentName);

    // Log performance suggestions in development
    useEffect(() => {
      if (process.env.NODE_ENV === 'development' && config.enableSuggestions && suggestions) {
        const activeSuggestions = Object.entries(suggestions)
          .filter(([, enabled]) => enabled)
          .map(([suggestion]) => suggestion);

        if (activeSuggestions.length > 0) {
          console.warn(
            `🎯 Performance suggestions for ${componentName}:`,
            activeSuggestions
          );
        }
      }
    }, [suggestions, metrics]);

    return React.createElement(WrappedComponent, props);
  });

  OptimizedComponent.displayName = `withPerformanceOptimization(${componentName})`;

  return OptimizedComponent;
}

// ===== PERFORMANCE ANALYTICS =====

export class PerformanceAnalytics {
  static logComponentMetrics(componentName?: string) {
    if (process.env.NODE_ENV !== 'development') return;

    const metrics = componentName
      ? globalMonitor.getMetrics(componentName)
      : globalMonitor.getAllMetrics();

    console.group('🚀 Component Performance Metrics');

    if (componentName) {
      if (metrics) {
        console.table(metrics);
        console.log('Suggestions:', globalMonitor.getSuggestions(componentName));
      } else {
        console.log(`No metrics found for ${componentName}`);
      }
    } else {
      (metrics as Map<string, PerformanceMetrics>).forEach((metric, name) => {
        console.log(`${name}:`, metric);
        console.log(`Suggestions:`, globalMonitor.getSuggestions(name));
      });
    }

    console.groupEnd();
  }

  static exportMetrics(): string {
    const allMetrics = Object.fromEntries(globalMonitor.getAllMetrics());
    return JSON.stringify(allMetrics, null, 2);
  }

  static clearAllMetrics() {
    globalMonitor.clearMetrics();
  }
}

// ===== DEVELOPMENT HELPERS =====

if (process.env.NODE_ENV === 'development') {
  // Expose performance tools to window for debugging
  (globalThis as any).performanceTools = {
    monitor: globalMonitor,
    analytics: PerformanceAnalytics,
    logMetrics: PerformanceAnalytics.logComponentMetrics,
    clearMetrics: PerformanceAnalytics.clearAllMetrics,
  };
}

export default usePerformanceOptimization;