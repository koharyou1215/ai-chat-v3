'use client';

/**
 * Optimized Framer Motion loader with intelligent caching and performance controls
 * Reduces bundle size by loading motion components only when needed
 */

import { lazy } from 'react';
import type { HTMLMotionProps, MotionProps, Variant } from 'framer-motion';
import type { PropsWithChildren, ReactNode } from 'react';

// ===== PERFORMANCE CONTROL FLAGS =====

const PERFORMANCE_CONFIG = {
  // Disable animations on low-end devices
  DISABLE_ON_LOW_END: true,
  // Reduce animations for battery saving
  REDUCE_MOTION_THRESHOLD: 0.5,
  // Cache motion components
  ENABLE_CACHING: true,
  // Preload core components
  PRELOAD_CORE: true,
};

// ===== DEVICE PERFORMANCE DETECTION =====

class DevicePerformanceDetector {
  private static instance: DevicePerformanceDetector;
  private performanceScore: number = 1.0;
  private isLowEndDevice: boolean = false;

  private constructor() {
    this.detectPerformance();
  }

  static getInstance(): DevicePerformanceDetector {
    if (!DevicePerformanceDetector.instance) {
      DevicePerformanceDetector.instance = new DevicePerformanceDetector();
    }
    return DevicePerformanceDetector.instance;
  }

  private detectPerformance() {
    if (typeof window === 'undefined') {
      this.performanceScore = 1.0;
      return;
    }

    let score = 1.0;

    // Check hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 4;
    if (cores <= 2) score *= 0.7;
    if (cores >= 8) score *= 1.3;

    // Check memory (if available)
    const memory = (navigator as any).deviceMemory;
    if (memory) {
      if (memory <= 2) score *= 0.6;
      if (memory >= 8) score *= 1.2;
    }

    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) score *= 0.5;

    // Check connection speed
    const connection = (navigator as any).connection;
    if (connection) {
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        score *= 0.5;
      }
      if (connection.saveData) {
        score *= 0.6;
      }
    }

    this.performanceScore = Math.max(0.3, Math.min(2.0, score));
    this.isLowEndDevice = score < PERFORMANCE_CONFIG.REDUCE_MOTION_THRESHOLD;

    console.log(`🚀 Device Performance Score: ${this.performanceScore.toFixed(2)}`);
  }

  getPerformanceScore(): number {
    return this.performanceScore;
  }

  isLowEnd(): boolean {
    return this.isLowEndDevice;
  }

  shouldUseAnimations(): boolean {
    return !this.isLowEndDevice || !PERFORMANCE_CONFIG.DISABLE_ON_LOW_END;
  }

  getOptimalAnimationDuration(baseDuration: number): number {
    return baseDuration / this.performanceScore;
  }
}

// ===== MOTION COMPONENT CACHE =====

class MotionComponentCache {
  private static cache = new Map<string, any>();
  private static loadingPromises = new Map<string, Promise<any>>();

  static async get(componentName: string, loader: () => Promise<any>): Promise<any> {
    // Return cached component if available
    if (this.cache.has(componentName)) {
      return this.cache.get(componentName);
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(componentName)) {
      return this.loadingPromises.get(componentName);
    }

    // Start loading and cache the promise
    const loadingPromise = loader().then((module) => {
      this.cache.set(componentName, module);
      this.loadingPromises.delete(componentName);
      return module;
    }).catch((error) => {
      this.loadingPromises.delete(componentName);
      throw error;
    });

    this.loadingPromises.set(componentName, loadingPromise);
    return loadingPromise;
  }

  static clear() {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  static preloadCore() {
    // Preload core motion components
    this.get('core', () => import('framer-motion'));
  }
}

// ===== OPTIMIZED MOTION LOADERS =====

export class MotionLoaders {
  private static detector = DevicePerformanceDetector.getInstance();

  // Core motion components
  static async core() {
    if (!this.detector.shouldUseAnimations()) {
      // Return no-op components for low-end devices
      return this.getNoOpComponents();
    }

    return MotionComponentCache.get('core', async () => {
      const { motion, AnimatePresence, LayoutGroup, Reorder } = await import('framer-motion');
      return { motion, AnimatePresence, LayoutGroup, Reorder };
    });
  }

  // Advanced animation features
  static async advanced() {
    if (!this.detector.shouldUseAnimations()) {
      return this.getNoOpComponents();
    }

    return MotionComponentCache.get('advanced', async () => {
      const {
        useAnimation,
        useMotionValue,
        useTransform,
        useSpring,
        useMotionTemplate,
        useScroll,
        useVelocity,
        useDragControls,
        PanInfo,
      } = await import('framer-motion');

      return {
        useAnimation,
        useMotionValue,
        useTransform,
        useSpring,
        useMotionTemplate,
        useScroll,
        useVelocity,
        useDragControls,
        PanInfo,
      };
    });
  }

  // 3D and complex animations
  static async threeDAnimation() {
    if (!this.detector.shouldUseAnimations() || this.detector.isLowEnd()) {
      return this.getNoOpComponents();
    }

    return MotionComponentCache.get('3d', async () => {
      const { motion } = await import('framer-motion');
      // Return motion with 3D optimizations
      return { motion };
    });
  }

  // Gestures and interactions
  static async gestures() {
    return MotionComponentCache.get('gestures', async () => {
      const { useDragControls, PanInfo } = await import('framer-motion');
      return { useDragControls, PanInfo };
    });
  }

  // Performance-optimized variants
  static async optimized() {
    const performanceScore = this.detector.getPerformanceScore();

    return MotionComponentCache.get('optimized', async () => {
      const { motion, AnimatePresence } = await import('framer-motion');

      // Create performance-aware wrapper
      const OptimizedMotion = {
        div: (props: HTMLMotionProps<"div">) => {
          const optimizedProps = this.optimizeAnimationProps(props, performanceScore);
          return motion.div(optimizedProps);
        },
        span: (props: HTMLMotionProps<"span">) => {
          const optimizedProps = this.optimizeAnimationProps(props, performanceScore);
          return motion.span(optimizedProps);
        },
        // Add more elements as needed
      };

      return { motion: OptimizedMotion, AnimatePresence };
    });
  }

  // No-op components for low-end devices
  private static getNoOpComponents() {
    return {
      motion: {
        div: ({ children, ...props }: PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => <div {...props}>{children}</div>,
        span: ({ children, ...props }: PropsWithChildren<React.HTMLAttributes<HTMLSpanElement>>) => <span {...props}>{children}</span>,
        // Add more no-op elements as needed
      },
      AnimatePresence: ({ children }: PropsWithChildren) => children,
      LayoutGroup: ({ children }: PropsWithChildren) => children,
      Reorder: { Group: ({ children }: PropsWithChildren) => children, Item: ({ children }: PropsWithChildren) => children },
    };
  }

  // Optimize animation properties based on performance
  private static optimizeAnimationProps<T extends MotionProps>(props: T, performanceScore: number): T {
    if (!props) return props;

    const optimized = { ...props };

    // Adjust animation duration
    if (optimized.transition && typeof optimized.transition === 'object' && 'duration' in optimized.transition) {
      const transition = optimized.transition as Record<string, unknown>;
      if (typeof transition.duration === 'number') {
        transition.duration = this.detector.getOptimalAnimationDuration(transition.duration);
      }
    }

    // Reduce complexity for low-end devices
    if (performanceScore < 0.7) {
      // Simplify animations
      if (optimized.animate) {
        const simplified = this.simplifyAnimation(optimized.animate);
        optimized.animate = simplified as typeof optimized.animate;
      }

      // Reduce spring physics complexity
      if (optimized.transition && typeof optimized.transition === 'object' && 'type' in optimized.transition) {
        const transition = optimized.transition as Record<string, unknown>;
        if (transition.type === 'spring') {
          optimized.transition = {
            ...transition,
            type: 'tween',
            ease: 'easeOut',
          } as typeof optimized.transition;
        }
      }
    }

    return optimized;
  }

  private static simplifyAnimation(animate: Variant | Variant[] | unknown): Variant | unknown {
    if (typeof animate !== 'object' || animate === null) return animate;

    // Keep only essential properties for low-end devices
    const essentialProps = ['x', 'y', 'opacity', 'scale'];
    const simplified: Record<string, unknown> = {};
    const animateObj = animate as Record<string, unknown>;

    for (const prop of essentialProps) {
      if (animateObj[prop] !== undefined) {
        simplified[prop] = animateObj[prop];
      }
    }

    return Object.keys(simplified).length > 0 ? simplified : animate;
  }

  // Preload strategy
  static preloadCore() {
    if (PERFORMANCE_CONFIG.PRELOAD_CORE && this.detector.shouldUseAnimations()) {
      MotionComponentCache.preloadCore();
    }
  }

  // Performance monitoring
  static getPerformanceMetrics() {
    return {
      score: this.detector.getPerformanceScore(),
      isLowEnd: this.detector.isLowEnd(),
      shouldUseAnimations: this.detector.shouldUseAnimations(),
      cacheSize: MotionComponentCache['cache'].size,
    };
  }
}

// ===== OPTIMIZED MOTION VARIANTS =====

export const OptimizedVariants = {
  // Entrance animations
  fadeIn: (performanceScore: number) => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      duration: DevicePerformanceDetector.getInstance().getOptimalAnimationDuration(0.3),
      ease: performanceScore > 0.8 ? "easeOut" : "linear",
    },
  }),

  // Slide animations
  slideUp: (performanceScore: number) => ({
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
    transition: {
      duration: DevicePerformanceDetector.getInstance().getOptimalAnimationDuration(0.4),
      type: performanceScore > 0.7 ? "spring" : "tween",
      stiffness: performanceScore > 0.7 ? 300 : undefined,
      damping: performanceScore > 0.7 ? 30 : undefined,
    },
  }),

  // Scale animations
  scaleIn: (performanceScore: number) => ({
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
    transition: {
      duration: DevicePerformanceDetector.getInstance().getOptimalAnimationDuration(0.2),
      ease: "easeOut",
    },
  }),

  // List animations
  staggerChildren: (performanceScore: number) => ({
    animate: {
      transition: {
        staggerChildren: performanceScore > 0.8 ? 0.1 : 0.2,
      },
    },
  }),
};

// ===== LAZY MOTION COMPONENTS =====

// Lazy-loaded motion components for specific use cases
export const LazyMotionComponents = {
  // Complex animations - Commented out until implementation
  // ComplexMotion: lazy(() =>
  //   import('./ComplexMotionComponents').then(module => ({
  //     default: module.ComplexMotionComponents
  //   }))
  // ),

  // Drag and drop - Commented out until implementation
  // DragMotion: lazy(() =>
  //   import('./DragMotionComponents').then(module => ({
  //     default: module.DragMotionComponents
  //   }))
  // ),

  // 3D animations - Commented out until implementation
  // ThreeDMotion: lazy(() =>
  //   import('./ThreeDMotionComponents').then(module => ({
  //     default: module.ThreeDMotionComponents
  //   }))
  // ),
};

// ===== INITIALIZATION =====

// Initialize performance detection and preloading
if (typeof window !== 'undefined') {
  // Preload core components after a short delay
  setTimeout(() => {
    MotionLoaders.preloadCore();
  }, 100);

  // Log performance metrics in development
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      console.log('🎯 Motion Performance Metrics:', MotionLoaders.getPerformanceMetrics());
    }, 1000);
  }
}

export default MotionLoaders;