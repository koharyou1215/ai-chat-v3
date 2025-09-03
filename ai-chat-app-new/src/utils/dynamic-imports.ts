/**
 * Dynamic import utilities for performance optimization
 * Provides conditional loading of heavy components based on user settings and context
 */

import { ComponentType } from 'react';

// ===== CONDITIONAL IMPORT SYSTEM =====

export interface DynamicImportOptions {
  fallback?: ComponentType<any>;
  preload?: boolean;
  timeout?: number;
}

export class DynamicImportManager {
  private static cache = new Map<string, Promise<any>>();
  private static loadedModules = new Set<string>();

  /**
   * Conditionally import a component based on settings
   */
  static async conditionalImport<T>(
    condition: boolean,
    importFn: () => Promise<T>,
    cacheKey: string,
    options: DynamicImportOptions = {}
  ): Promise<T | null> {
    if (!condition) {
      return null;
    }

    // Return from cache if already loaded
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Create new import promise
    const importPromise = importFn();
    this.cache.set(cacheKey, importPromise);

    try {
      const module = await importPromise;
      this.loadedModules.add(cacheKey);
      return module;
    } catch (error) {
      // Remove failed import from cache
      this.cache.delete(cacheKey);
      console.error(`Failed to load module ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * Preload components that are likely to be used
   */
  static preloadComponent(importFn: () => Promise<any>, cacheKey: string): void {
    if (!this.cache.has(cacheKey)) {
      // Use requestIdleCallback if available, otherwise setTimeout
      const schedulePreload = () => {
        this.conditionalImport(true, importFn, cacheKey, { preload: true });
      };

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(schedulePreload);
      } else {
        setTimeout(schedulePreload, 100);
      }
    }
  }

  /**
   * Get loading status of a module
   */
  static isLoaded(cacheKey: string): boolean {
    return this.loadedModules.has(cacheKey);
  }

  /**
   * Clear cache for development
   */
  static clearCache(): void {
    this.cache.clear();
    this.loadedModules.clear();
  }
}

// ===== EFFECT-SPECIFIC IMPORTS =====

export const EffectImports = {
  // Advanced effects with heavy canvas/WebGL dependencies
  hologramMessage: () => 
    DynamicImportManager.conditionalImport(
      true,
      () => import('@/components/chat/AdvancedEffects').then(m => m.HologramMessage),
      'hologram-message'
    ),

  particleText: () =>
    DynamicImportManager.conditionalImport(
      true,
      () => import('@/components/chat/AdvancedEffects').then(m => m.ParticleText),
      'particle-text'
    ),

  backgroundParticles: () =>
    DynamicImportManager.conditionalImport(
      true,
      () => import('@/components/chat/AdvancedEffects').then(m => m.BackgroundParticles),
      'background-particles'
    ),

  // Emotion effects
  emotionDisplay: () =>
    DynamicImportManager.conditionalImport(
      true,
      () => import('@/components/emotion/EmotionDisplay').then(m => m.EmotionDisplay),
      'emotion-display'
    ),

  soloEmotionalEffects: () =>
    DynamicImportManager.conditionalImport(
      true,
      () => import('@/components/emotion/SoloEmotionalEffects'),
      'solo-emotional-effects'
    ),
};

// ===== MODAL-SPECIFIC IMPORTS =====

export const ModalImports = {
  settings: () =>
    DynamicImportManager.conditionalImport(
      true,
      () => import('@/components/settings/SettingsModal'),
      'settings-modal'
    ),

  characterForm: () =>
    DynamicImportManager.conditionalImport(
      true,
      () => import('@/components/character/CharacterForm'),
      'character-form'
    ),

  voiceSettings: () =>
    DynamicImportManager.conditionalImport(
      true,
      () => import('@/components/voice/VoiceSettingsModal'),
      'voice-settings-modal'
    ),
};

// ===== GALLERY-SPECIFIC IMPORTS =====

export const GalleryImports = {
  characterGallery: () =>
    DynamicImportManager.conditionalImport(
      true,
      () => import('@/components/character/CharacterGallery').then(m => ({ default: m.CharacterGallery })),
      'character-gallery'
    ),

  personaGallery: () =>
    DynamicImportManager.conditionalImport(
      true,
      () => import('@/components/persona/PersonaGallery').then(m => ({ default: m.PersonaGallery })),
      'persona-gallery'
    ),

  memoryGallery: () =>
    DynamicImportManager.conditionalImport(
      true,
      () => import('@/components/memory/MemoryGallery').then(m => ({ default: m.MemoryGallery })),
      'memory-gallery'
    ),
};

// ===== PRELOADING STRATEGIES =====

export const PreloadStrategies = {
  /**
   * Preload components that are likely to be used soon
   */
  preloadCriticalComponents(): void {
    if (typeof window === 'undefined') return;

    // Preload modal components after initial render
    setTimeout(() => {
      DynamicImportManager.preloadComponent(
        () => import('@/components/settings/SettingsModal'),
        'settings-modal'
      );
      
      DynamicImportManager.preloadComponent(
        () => import('@/components/character/CharacterForm'),
        'character-form'
      );
    }, 2000); // Wait 2 seconds after initial load
  },

  /**
   * Preload effects based on user settings
   */
  preloadEffects(effectSettings: any): void {
    if (typeof window === 'undefined') return;

    if (effectSettings.hologramMessages) {
      DynamicImportManager.preloadComponent(
        () => import('@/components/chat/AdvancedEffects'),
        'advanced-effects'
      );
    }

    if (effectSettings.emotionDisplay) {
      DynamicImportManager.preloadComponent(
        () => import('@/components/emotion/EmotionDisplay'),
        'emotion-display'
      );
    }
  },

  /**
   * Preload on user interaction hints
   */
  preloadOnHover(componentKey: string, importFn: () => Promise<any>): void {
    if (typeof window === 'undefined') return;
    
    DynamicImportManager.preloadComponent(importFn, componentKey);
  },
};

// ===== BUNDLE ANALYSIS HELPERS =====

export const BundleAnalysis = {
  /**
   * Log current loading status for development
   */
  logLoadingStatus(): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('📦 Dynamic Import Status:', {
        cached: DynamicImportManager['cache'].size,
        loaded: DynamicImportManager['loadedModules'].size,
        modules: Array.from(DynamicImportManager['loadedModules'])
      });
    }
  },

  /**
   * Get performance metrics
   */
  getMetrics(): {
    totalCached: number;
    totalLoaded: number;
    loadedModules: string[];
  } {
    return {
      totalCached: DynamicImportManager['cache'].size,
      totalLoaded: DynamicImportManager['loadedModules'].size,
      loadedModules: Array.from(DynamicImportManager['loadedModules'])
    };
  },
};