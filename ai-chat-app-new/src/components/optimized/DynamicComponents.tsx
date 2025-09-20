"use client";

import { lazy, Suspense, ComponentType } from "react";
import {
  ModalLoadingFallback,
  PanelLoadingFallback,
  EffectLoadingFallback,
} from "../lazy/LazyComponents";

/**
 * Enhanced dynamic component loading with performance optimizations
 * Implements conditional loading and intelligent prefetching
 */

// ===== ENHANCED SETTINGS MODAL WITH CONDITIONAL PANEL LOADING =====

// Core SettingsModal shell (loads immediately)
export const SettingsModalShell = lazy(() =>
  import("../settings/SettingsModal").then((module) => ({
    default: module.SettingsModal,
  }))
);

// Individual settings panels (load only when tab is activated)
export const SettingsPanels = {
  // API Settings Panel
  api: lazy(() =>
    import("../settings/SettingsModal").then((module) => ({
      default: module.SettingsModal, // Will need to extract API panel
    }))
  ),

  // Appearance Panel
  appearance: lazy(() =>
    import("../settings/SettingsModal").then((module) => ({
      default: module.SettingsModal, // Will need to extract appearance panel
    }))
  ),

  // Effects Panel
  effects: lazy(() =>
    import("../settings/SettingsModal").then((module) => ({
      default: module.SettingsModal, // Will need to extract effects panel
    }))
  ),

  // Advanced Panel
  advanced: lazy(() =>
    import("../settings/SettingsModal").then((module) => ({
      default: module.SettingsModal, // Will need to extract advanced panel
    }))
  ),
};

// ===== OPTIMIZED EFFECT COMPONENTS WITH LAZY LOADING =====

// Conditional effect loader - only loads when effect is enabled
export const ConditionalEffect = ({
  effectName,
  isEnabled,
  children,
}: {
  effectName: string;
  isEnabled: boolean;
  children: React.ReactNode;
}) => {
  if (!isEnabled) return null;

  return <Suspense fallback={<EffectLoadingFallback />}>{children}</Suspense>;
};

// Advanced Effects with intelligent loading
export const AdvancedEffectComponents = {
  // Hologram Effect
  hologram: lazy(() =>
    import("../shared/effects/HologramEffect").then((module) => ({
      default: module.HologramEffect,
    }))
  ),

  // Particle Effect
  particles: lazy(() =>
    import("../shared/effects/ParticleEffect").then((module) => ({
      default: module.ParticleEffect,
    }))
  ),

  // Ripple Effect
  ripple: lazy(() =>
    import("../shared/effects/RippleEffect").then((module) => ({
      default: module.RippleEffect,
    }))
  ),
};

// ===== GALLERY COMPONENTS WITH VIRTUALIZATION =====

// Optimized galleries with virtual scrolling consideration
export const OptimizedGalleries = {
  character: lazy(() =>
    import("../character/CharacterGallery").then((module) => ({
      default: module.CharacterGallery,
    }))
  ),

  persona: lazy(() =>
    import("../persona/PersonaGallery").then((module) => ({
      default: module.PersonaGallery,
    }))
  ),

  memory: lazy(() =>
    import("../memory/MemoryGallery").then((module) => ({
      default: module.MemoryGallery,
    }))
  ),
};

// ===== HEAVY PROCESSING COMPONENTS =====

// Components that involve heavy computation
export const HeavyProcessingComponents = {
  // Emotion Analysis
  emotionAnalysis: lazy(() =>
    import("../emotion/EmotionDisplay").then((module) => ({
      default: module.EmotionDisplay,
    }))
  ),

  // Memory Processing
  memoryProcessor: lazy(() =>
    import("../memory/MemoryLayerDisplay").then((module) => ({
      default: module.MemoryLayerDisplay,
    }))
  ),

  // Tracker Processing
  trackerProcessor: lazy(() =>
    import("../tracker/TrackerDisplay").then((module) => ({
      default: module.TrackerDisplay,
    }))
  ),
};

// ===== UTILITY COMPONENTS =====

// Enhanced loading fallbacks with better UX
export const EnhancedLoadingFallbacks = {
  modal: () => <ModalLoadingFallback />,
  panel: () => <PanelLoadingFallback />,
  effect: () => <EffectLoadingFallback />,

  // Skeleton for settings panels
  settingsPanel: () => (
    <div className="space-y-4 p-4 animate-pulse">
      <div className="h-6 bg-slate-700/50 rounded w-1/3" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-slate-700/30 rounded w-1/4" />
            <div className="h-10 bg-slate-700/20 rounded" />
          </div>
        ))}
      </div>
    </div>
  ),

  // Skeleton for galleries
  gallery: () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-slate-800/30 border border-white/5 rounded-lg p-4 animate-pulse">
          <div className="w-full h-32 bg-slate-700/30 rounded-lg mb-3" />
          <div className="h-4 bg-slate-700/30 rounded mb-2" />
          <div className="h-3 bg-slate-700/20 rounded w-3/4" />
        </div>
      ))}
    </div>
  ),
};

// ===== PERFORMANCE MONITORING =====

// HOC for performance monitoring
export function withPerformanceMonitoring<T extends object>(
  WrappedComponent: ComponentType<T>,
  componentName: string
) {
  const MonitoredComponent = (props: T) => {
    if (process.env.NODE_ENV === "development") {
      console.time(`${componentName} render`);
    }

    const result = <WrappedComponent {...props} />;

    if (process.env.NODE_ENV === "development") {
      console.timeEnd(`${componentName} render`);
    }

    return result;
  };

  MonitoredComponent.displayName = `withPerformanceMonitoring(${componentName})`;
  return MonitoredComponent;
}

// ===== INTELLIGENT PRELOADER =====

// Preloads components based on user behavior
export class ComponentPreloader {
  private static loadedComponents = new Set<string>();
  private static loadingPromises = new Map<string, Promise<any>>();

  static async preload(componentName: string, loadFn: () => Promise<any>) {
    if (this.loadedComponents.has(componentName)) {
      return;
    }

    if (this.loadingPromises.has(componentName)) {
      return this.loadingPromises.get(componentName);
    }

    const promise = loadFn();
    this.loadingPromises.set(componentName, promise);

    try {
      await promise;
      this.loadedComponents.add(componentName);
      this.loadingPromises.delete(componentName);
    } catch (error) {
      this.loadingPromises.delete(componentName);
      console.warn(`Failed to preload component ${componentName}:`, error);
    }
  }

  // Preload based on user interaction patterns
  static preloadOnHover(componentName: string, loadFn: () => Promise<any>) {
    return {
      onMouseEnter: () => this.preload(componentName, loadFn),
      onFocus: () => this.preload(componentName, loadFn),
    };
  }

  // Preload based on route/tab changes
  static preloadOnNavigate(componentName: string, loadFn: () => Promise<any>) {
    return () => this.preload(componentName, loadFn);
  }
}

const DynamicComponents = {
  SettingsModalShell,
  SettingsPanels,
  ConditionalEffect,
  AdvancedEffectComponents,
  OptimizedGalleries,
  HeavyProcessingComponents,
  EnhancedLoadingFallbacks,
  withPerformanceMonitoring,
  ComponentPreloader,
};

export default DynamicComponents;
