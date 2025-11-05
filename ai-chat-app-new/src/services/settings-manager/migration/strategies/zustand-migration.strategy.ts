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
  private migrateApiConfig(state: Record<string, unknown>, settings: UnifiedSettings): boolean {
    if (!state.apiConfig) return false;

    const apiConfig = state.apiConfig as Record<string, unknown>;
    settings.api = {
      ...settings.api,
      provider: (apiConfig.provider === 'gemini' ? 'gemini' : apiConfig.provider || settings.api.provider) as typeof settings.api.provider,
      model: (apiConfig.model || settings.api.model) as string,
      temperature: (apiConfig.temperature ?? settings.api.temperature) as number,
      maxTokens: (apiConfig.max_tokens ?? settings.api.maxTokens) as number,
      topP: (apiConfig.top_p ?? settings.api.topP) as number,
      frequencyPenalty: (apiConfig.frequency_penalty ?? settings.api.frequencyPenalty) as number,
      presencePenalty: (apiConfig.presence_penalty ?? settings.api.presencePenalty) as number,
      contextWindow: (apiConfig.context_window ?? settings.api.contextWindow) as number,
    };

    return true;
  }

  /**
   * Migrates API keys and provider flags
   *
   * 🔧 CRITICAL FIX: Only migrate if UnifiedSettings doesn't have a value yet
   * This prevents overwriting user's new settings with old Zustand data
   *
   * @private
   */
  private migrateApiKeys(state: Record<string, unknown>, settings: UnifiedSettings): boolean {
    let hasChanges = false;

    // Only migrate if UnifiedSettings doesn't have the key yet
    if (typeof state.openRouterApiKey === 'string' && !settings.api.openrouterApiKey) {
      settings.api.openrouterApiKey = state.openRouterApiKey;
      hasChanges = true;
      console.log('🔄 [ZustandMigration] Migrated openRouterApiKey');
    }

    if (typeof state.geminiApiKey === 'string' && !settings.api.geminiApiKey) {
      settings.api.geminiApiKey = state.geminiApiKey;
      hasChanges = true;
      console.log('🔄 [ZustandMigration] Migrated geminiApiKey');
    }

    if (typeof state.useDirectGeminiAPI === 'boolean' && settings.api.useDirectGeminiAPI === undefined) {
      settings.api.useDirectGeminiAPI = state.useDirectGeminiAPI;
      hasChanges = true;
      console.log('🔄 [ZustandMigration] Migrated useDirectGeminiAPI');
    }

    return hasChanges;
  }

  /**
   * Migrates system prompts and prompt flags
   * @private
   */
  private migrateSystemPrompts(state: Record<string, unknown>, settings: UnifiedSettings): boolean {
    let hasChanges = false;

    if (state.systemPrompts && typeof state.systemPrompts === 'object') {
      const prompts = state.systemPrompts as Record<string, unknown>;
      settings.prompts = {
        ...settings.prompts,
        system: (typeof prompts.system === 'string' ? prompts.system : '') as string,
        jailbreak: (typeof prompts.jailbreak === 'string' ? prompts.jailbreak : '') as string,
        replySuggestion: (typeof prompts.replySuggestion === 'string' ? prompts.replySuggestion : '') as string,
        textEnhancement: (typeof prompts.textEnhancement === 'string' ? prompts.textEnhancement : '') as string,
      };
      hasChanges = true;
    }

    if (typeof state.enableSystemPrompt === 'boolean') {
      settings.prompts.enableSystemPrompt = state.enableSystemPrompt;
      hasChanges = true;
    }

    if (typeof state.enableJailbreakPrompt === 'boolean') {
      settings.prompts.enableJailbreakPrompt = state.enableJailbreakPrompt;
      hasChanges = true;
    }

    return hasChanges;
  }

  /**
   * Migrates effect settings
   * @private
   */
  private migrateEffectSettings(state: Record<string, unknown>, settings: UnifiedSettings): boolean {
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
  private migrateAppearanceSettings(state: Record<string, unknown>, settings: UnifiedSettings): boolean {
    if (!state.appearanceSettings || typeof state.appearanceSettings !== 'object') return false;

    const appearance = state.appearanceSettings as Record<string, unknown>;

    // Map all appearance fields to settings.ui (with type guards)
    if (appearance.theme) settings.ui.theme = appearance.theme as typeof settings.ui.theme;
    if (appearance.fontSize) settings.ui.fontSize = appearance.fontSize as typeof settings.ui.fontSize;
    if (appearance.fontWeight) settings.ui.fontWeight = appearance.fontWeight as typeof settings.ui.fontWeight;
    if (typeof appearance.fontFamily === 'string') settings.ui.fontFamily = appearance.fontFamily;
    if (appearance.lineHeight) settings.ui.lineHeight = appearance.lineHeight as typeof settings.ui.lineHeight;
    if (typeof appearance.primaryColor === 'string') settings.ui.primaryColor = appearance.primaryColor;
    if (typeof appearance.accentColor === 'string') settings.ui.accentColor = appearance.accentColor;
    if (typeof appearance.backgroundColor === 'string') settings.ui.backgroundColor = appearance.backgroundColor;
    if (typeof appearance.surfaceColor === 'string') settings.ui.surfaceColor = appearance.surfaceColor;
    if (typeof appearance.textColor === 'string') settings.ui.textColor = appearance.textColor;
    if (appearance.backgroundType) settings.ui.background.type = appearance.backgroundType as typeof settings.ui.background.type;
    if (typeof appearance.backgroundImage === 'string') settings.ui.background.image.url = appearance.backgroundImage;
    if (typeof appearance.backgroundGradient === 'string') settings.ui.background.gradient.value = appearance.backgroundGradient;
    if (typeof appearance.backgroundBlur === 'number') settings.ui.background.image.blur = appearance.backgroundBlur;
    if (typeof appearance.backgroundBlurEnabled === 'boolean') settings.ui.background.image.blurEnabled = appearance.backgroundBlurEnabled;
    if (typeof appearance.backgroundOpacity === 'number') settings.ui.background.image.opacity = appearance.backgroundOpacity;
    if (typeof appearance.faviconPath === 'string') settings.ui.faviconPath = appearance.faviconPath;
    if (typeof appearance.faviconSvg === 'string') settings.ui.faviconSvg = appearance.faviconSvg;
    if (typeof appearance.appleTouchIcon === 'string') settings.ui.appleTouchIcon = appearance.appleTouchIcon;
    if (typeof appearance.customCSS === 'string') settings.ui.customCSS = appearance.customCSS;
    if (typeof appearance.enableAnimations === 'boolean') settings.ui.enableAnimations = appearance.enableAnimations;
    // @ts-expect-error - Migration: transitionDuration type conversion
    if (typeof appearance.transitionDuration === 'number') settings.ui.transitionDuration = appearance.transitionDuration;

    return true;
  }

  /**
   * Migrates language settings
   * @private
   */
  private migrateLanguageSettings(state: Record<string, unknown>, settings: UnifiedSettings): boolean {
    // @ts-expect-error - Migration: dynamic property access
    if (!state.languageSettings?.language) return false;

    // @ts-expect-error - Migration: dynamic property access
    settings.ui.language = state.languageSettings.language;
    return true;
  }

  /**
   * Migrates feature-specific settings (chat, voice, imageGeneration)
   * @private
   */
  private migrateFeatureSettings(state: Record<string, unknown>, settings: UnifiedSettings): boolean {
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
  private migrateEmotionalIntelligence(state: Record<string, unknown>, settings: UnifiedSettings): boolean {
    if (!state.emotionalIntelligenceFlags) return false;

    const flags = state.emotionalIntelligenceFlags as Record<string, unknown>;
    // @ts-expect-error - Migration: emotional intelligence flags with complex dynamic typing
    settings.emotionalIntelligence = {
      ...settings.emotionalIntelligence,
      enabled: (typeof flags.emotion_analysis_enabled === 'boolean' ? flags.emotion_analysis_enabled : settings.emotionalIntelligence.enabled),
      analysis: {
        basic: (typeof flags.emotion_analysis_enabled === 'boolean' ? flags.emotion_analysis_enabled : settings.emotionalIntelligence.analysis.basic),
        contextual: (typeof flags.contextual_analysis_enabled === 'boolean' ? flags.contextual_analysis_enabled : settings.emotionalIntelligence.analysis.contextual),
        predictive: (typeof flags.predictive_analysis_enabled === 'boolean' ? flags.predictive_analysis_enabled : settings.emotionalIntelligence.analysis.predictive),
        multiLayer: (typeof flags.multi_layer_analysis_enabled === 'boolean' ? flags.multi_layer_analysis_enabled : settings.emotionalIntelligence.analysis.multiLayer),
      },
      memoryEnabled: (typeof flags.emotional_memory_enabled === 'boolean' ? flags.emotional_memory_enabled : settings.emotionalIntelligence.memoryEnabled),
      adaptivePerformance: (typeof flags.adaptive_performance_enabled === 'boolean' ? flags.adaptive_performance_enabled : settings.emotionalIntelligence.adaptivePerformance),
      safeMode: (typeof flags.safe_mode === 'boolean' ? flags.safe_mode : settings.emotionalIntelligence.safeMode),
      performanceMonitoring: (typeof flags.performance_monitoring === 'boolean' ? flags.performance_monitoring : settings.emotionalIntelligence.performanceMonitoring),
      debugMode: (typeof flags.debug_mode === 'boolean' ? flags.debug_mode : settings.emotionalIntelligence.debugMode),
      fallbackToLegacy: (typeof flags.fallback_to_legacy === 'boolean' ? flags.fallback_to_legacy : settings.emotionalIntelligence.fallbackToLegacy),
    };

    return true;
  }
}
