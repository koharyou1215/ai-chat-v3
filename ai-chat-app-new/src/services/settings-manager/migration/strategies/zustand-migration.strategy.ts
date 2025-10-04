/**
 * Zustand Persist Migration Strategy
 *
 * Migrates settings from Zustand persist storage (ai-chat-v3-storage) to UnifiedSettings
 *
 * Migration Sources:
 * - apiConfig: API provider, model, and generation parameters
 * - API Keys: openRouterApiKey, geminiApiKey, useDirectGeminiAPI
 * - systemPrompts: System and jailbreak prompts
 * - effectSettings: Visual and interaction effects
 * - appearanceSettings: UI theme, colors, fonts, background
 * - languageSettings: UI language preference
 * - chat, voice, imageGeneration: Feature-specific settings
 * - emotionalIntelligenceFlags: Emotion analysis configuration
 *
 * Data Structure:
 * ```
 * localStorage['ai-chat-v3-storage'] = {
 *   state: {
 *     apiConfig: {...},
 *     systemPrompts: {...},
 *     ...
 *   }
 * }
 * ```
 *
 * @module services/settings-manager/migration/strategies
 */

import type { MigrationStrategy } from './base-migration.strategy';
import type { UnifiedSettings } from '../../../settings-manager';

/**
 * Zustand Persist Storage Migration Strategy
 *
 * Migrates all settings from Zustand's persist middleware to UnifiedSettings
 */
export class ZustandMigrationStrategy implements MigrationStrategy {
  readonly name = 'Zustand Persist Migration';

  /**
   * Checks if Zustand persist data exists
   *
   * Detection Logic:
   * - Checks for 'ai-chat-v3-storage' key in localStorage
   * - Validates JSON structure has 'state' property
   * - Returns false in non-browser environment
   */
  canMigrate(settings: UnifiedSettings): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const zustandData = localStorage.getItem('ai-chat-v3-storage');
      if (!zustandData) return false;

      const zustand = JSON.parse(zustandData);
      return zustand?.state !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Migrates all settings from Zustand persist storage
   *
   * Process:
   * 1. Parse ai-chat-v3-storage JSON
   * 2. Migrate API configuration
   * 3. Migrate prompts and feature settings
   * 4. Migrate UI/appearance settings
   * 5. Migrate emotional intelligence flags
   */
  migrate(settings: UnifiedSettings): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const zustandData = localStorage.getItem('ai-chat-v3-storage');
      if (!zustandData) return false;

      const zustand = JSON.parse(zustandData);
      const state = zustand?.state;
      if (!state) return false;

      let hasMigration = false;

      // Migrate each category
      hasMigration = this.migrateApiConfig(state, settings) || hasMigration;
      hasMigration = this.migrateApiKeys(state, settings) || hasMigration;
      hasMigration = this.migrateSystemPrompts(state, settings) || hasMigration;
      hasMigration = this.migrateEffectSettings(state, settings) || hasMigration;
      hasMigration = this.migrateAppearanceSettings(state, settings) || hasMigration;
      hasMigration = this.migrateLanguageSettings(state, settings) || hasMigration;
      hasMigration = this.migrateFeatureSettings(state, settings) || hasMigration;
      hasMigration = this.migrateEmotionalIntelligence(state, settings) || hasMigration;

      if (hasMigration) {
        console.log(`🔄 [${this.name}] Migrated settings from Zustand persist`);
      }

      return hasMigration;
    } catch (error) {
      console.error(`❌ [${this.name}] Failed to migrate from Zustand:`, error);
      return false;
    }
  }

  /**
   * Migrates API configuration (provider, model, parameters)
   * @private
   */
  private migrateApiConfig(state: any, settings: UnifiedSettings): boolean {
    if (!state.apiConfig) return false;

    const apiConfig = state.apiConfig;
    settings.api = {
      ...settings.api,
      provider: apiConfig.provider === 'gemini' ? 'gemini' : apiConfig.provider || settings.api.provider,
      model: apiConfig.model || settings.api.model,
      temperature: apiConfig.temperature ?? settings.api.temperature,
      maxTokens: apiConfig.max_tokens ?? settings.api.maxTokens,
      topP: apiConfig.top_p ?? settings.api.topP,
      frequencyPenalty: apiConfig.frequency_penalty ?? settings.api.frequencyPenalty,
      presencePenalty: apiConfig.presence_penalty ?? settings.api.presencePenalty,
      contextWindow: apiConfig.context_window ?? settings.api.contextWindow,
    };

    return true;
  }

  /**
   * Migrates API keys and provider flags
   * @private
   */
  private migrateApiKeys(state: any, settings: UnifiedSettings): boolean {
    let hasChanges = false;

    if (state.openRouterApiKey) {
      settings.api.openrouterApiKey = state.openRouterApiKey;
      hasChanges = true;
    }
    if (state.geminiApiKey) {
      settings.api.geminiApiKey = state.geminiApiKey;
      hasChanges = true;
    }
    if (state.useDirectGeminiAPI !== undefined) {
      settings.api.useDirectGeminiAPI = state.useDirectGeminiAPI;
      hasChanges = true;
    }

    return hasChanges;
  }

  /**
   * Migrates system prompts and prompt flags
   * @private
   */
  private migrateSystemPrompts(state: any, settings: UnifiedSettings): boolean {
    let hasChanges = false;

    if (state.systemPrompts) {
      settings.prompts = {
        ...settings.prompts,
        system: state.systemPrompts.system || '',
        jailbreak: state.systemPrompts.jailbreak || '',
        replySuggestion: state.systemPrompts.replySuggestion || '',
        textEnhancement: state.systemPrompts.textEnhancement || '',
      };
      hasChanges = true;
    }

    if (state.enableSystemPrompt !== undefined) {
      settings.prompts.enableSystemPrompt = state.enableSystemPrompt;
      hasChanges = true;
    }

    if (state.enableJailbreakPrompt !== undefined) {
      settings.prompts.enableJailbreakPrompt = state.enableJailbreakPrompt;
      hasChanges = true;
    }

    return hasChanges;
  }

  /**
   * Migrates effect settings
   * @private
   */
  private migrateEffectSettings(state: any, settings: UnifiedSettings): boolean {
    if (!state.effectSettings) return false;

    settings.effects = {
      ...settings.effects,
      ...state.effectSettings,
    };

    return true;
  }

  /**
   * Migrates UI appearance settings (theme, colors, fonts, background)
   * @private
   */
  private migrateAppearanceSettings(state: any, settings: UnifiedSettings): boolean {
    if (!state.appearanceSettings) return false;

    const appearance = state.appearanceSettings;

    // Map all appearance fields to settings.ui
    if (appearance.theme) settings.ui.theme = appearance.theme;
    if (appearance.fontSize) settings.ui.fontSize = appearance.fontSize;
    if (appearance.fontWeight) settings.ui.fontWeight = appearance.fontWeight;
    if (appearance.fontFamily) settings.ui.fontFamily = appearance.fontFamily;
    if (appearance.lineHeight) settings.ui.lineHeight = appearance.lineHeight;
    if (appearance.primaryColor) settings.ui.primaryColor = appearance.primaryColor;
    if (appearance.accentColor) settings.ui.accentColor = appearance.accentColor;
    if (appearance.backgroundColor) settings.ui.backgroundColor = appearance.backgroundColor;
    if (appearance.surfaceColor) settings.ui.surfaceColor = appearance.surfaceColor;
    if (appearance.textColor) settings.ui.textColor = appearance.textColor;
    if (appearance.backgroundType) settings.ui.backgroundType = appearance.backgroundType;
    if (appearance.backgroundImage !== undefined) settings.ui.backgroundImage = appearance.backgroundImage;
    if (appearance.backgroundGradient) settings.ui.backgroundGradient = appearance.backgroundGradient;
    if (appearance.backgroundBlur !== undefined) settings.ui.backgroundBlur = appearance.backgroundBlur;
    if (appearance.backgroundBlurEnabled !== undefined) settings.ui.backgroundBlurEnabled = appearance.backgroundBlurEnabled;
    if (appearance.backgroundOpacity !== undefined) settings.ui.backgroundOpacity = appearance.backgroundOpacity;
    if (appearance.faviconPath) settings.ui.faviconPath = appearance.faviconPath;
    if (appearance.faviconSvg) settings.ui.faviconSvg = appearance.faviconSvg;
    if (appearance.appleTouchIcon) settings.ui.appleTouchIcon = appearance.appleTouchIcon;
    if (appearance.customCSS !== undefined) settings.ui.customCSS = appearance.customCSS;
    if (appearance.enableAnimations !== undefined) settings.ui.enableAnimations = appearance.enableAnimations;
    if (appearance.transitionDuration) settings.ui.transitionDuration = appearance.transitionDuration;

    return true;
  }

  /**
   * Migrates language settings
   * @private
   */
  private migrateLanguageSettings(state: any, settings: UnifiedSettings): boolean {
    if (!state.languageSettings?.language) return false;

    settings.ui.language = state.languageSettings.language;
    return true;
  }

  /**
   * Migrates feature-specific settings (chat, voice, imageGeneration)
   * @private
   */
  private migrateFeatureSettings(state: any, settings: UnifiedSettings): boolean {
    let hasChanges = false;

    if (state.chat) {
      settings.chat = {
        ...settings.chat,
        ...state.chat,
      };
      hasChanges = true;
    }

    if (state.voice) {
      settings.voice = {
        ...settings.voice,
        ...state.voice,
      };
      hasChanges = true;
    }

    if (state.imageGeneration) {
      settings.imageGeneration = {
        ...settings.imageGeneration,
        ...state.imageGeneration,
      };
      hasChanges = true;
    }

    return hasChanges;
  }

  /**
   * Migrates emotional intelligence flags to new structure
   * @private
   */
  private migrateEmotionalIntelligence(state: any, settings: UnifiedSettings): boolean {
    if (!state.emotionalIntelligenceFlags) return false;

    const flags = state.emotionalIntelligenceFlags;
    settings.emotionalIntelligence = {
      ...settings.emotionalIntelligence,
      enabled: flags.emotion_analysis_enabled ?? settings.emotionalIntelligence.enabled,
      analysis: {
        basic: flags.emotion_analysis_enabled ?? settings.emotionalIntelligence.analysis.basic,
        contextual: flags.contextual_analysis_enabled ?? settings.emotionalIntelligence.analysis.contextual,
        predictive: flags.predictive_analysis_enabled ?? settings.emotionalIntelligence.analysis.predictive,
        multiLayer: flags.multi_layer_analysis_enabled ?? settings.emotionalIntelligence.analysis.multiLayer,
      },
      memoryEnabled: flags.emotional_memory_enabled ?? settings.emotionalIntelligence.memoryEnabled,
      adaptivePerformance: flags.adaptive_performance_enabled ?? settings.emotionalIntelligence.adaptivePerformance,
      safeMode: flags.safe_mode ?? settings.emotionalIntelligence.safeMode,
      performanceMonitoring: flags.performance_monitoring ?? settings.emotionalIntelligence.performanceMonitoring,
      debugMode: flags.debug_mode ?? settings.emotionalIntelligence.debugMode,
      fallbackToLegacy: flags.fallback_to_legacy ?? settings.emotionalIntelligence.fallbackToLegacy,
    };

    return true;
  }
}
