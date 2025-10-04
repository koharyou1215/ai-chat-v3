/**
 * Emotion Settings Migration Strategy
 *
 * Phase 2.2: Migrates legacy emotion settings to hierarchical structure
 *
 * Old Structure → New Structure:
 * - effects.realtimeEmotion → effects.emotion.realtimeDetection
 * - effects.emotionBasedStyling → effects.emotion.display.applyColors
 * - effects.autoReactions → effects.emotion.autoReactions
 * - effects.enableEmotionDisplay → effects.emotion.display.showText
 * - effects.emotionStylingIntensity → effects.emotion.intensity
 * - effects.emotionDisplayIntensity → effects.emotion.intensity
 *
 * Emotional Intelligence Engine:
 * - emotionalIntelligence.emotionAnalysisEnabled → enabled
 * - emotionalIntelligence.basicEffectsEnabled → REMOVED (displayMode)
 * - emotionalIntelligence.visualEffectsEnabled → REMOVED (displayMode)
 * - emotionalIntelligence.advancedEffectsEnabled → REMOVED (displayMode)
 *
 * @module services/settings-manager/migration/strategies
 */

import type { MigrationStrategy } from './base-migration.strategy';
import type { UnifiedSettings } from '../../../settings-manager';

/**
 * Emotion Settings Migration Strategy
 *
 * Handles Phase 2.2 migration from flat emotion settings to hierarchical structure
 */
export class EmotionMigrationStrategy implements MigrationStrategy {
  readonly name = 'Phase 2.2: Emotion Settings Migration';

  /**
   * Checks if emotion settings need migration
   *
   * Detection Logic:
   * - Checks for deprecated effects fields (realtimeEmotion, emotionBasedStyling, etc.)
   * - Checks for deprecated emotionalIntelligence fields (emotionAnalysisEnabled, etc.)
   * - Returns false if new structure already exists
   */
  canMigrate(settings: UnifiedSettings): boolean {
    const effects = settings.effects;
    const emotionalIntelligence = settings.emotionalIntelligence;

    // Check for old effects fields
    const hasOldEffectsFields =
      effects.realtimeEmotion !== undefined ||
      effects.emotionBasedStyling !== undefined ||
      effects.autoReactions !== undefined ||
      effects.enableEmotionDisplay !== undefined;

    // Check for old emotional intelligence fields
    const hasOldEIFields =
      emotionalIntelligence.emotionAnalysisEnabled !== undefined ||
      emotionalIntelligence.basicEffectsEnabled !== undefined ||
      emotionalIntelligence.visualEffectsEnabled !== undefined ||
      emotionalIntelligence.advancedEffectsEnabled !== undefined;

    // Already migrated if new structure exists and no old fields
    if (!hasOldEffectsFields && !hasOldEIFields && effects.emotion && emotionalIntelligence.analysis) {
      return false;
    }

    return hasOldEffectsFields || hasOldEIFields;
  }

  /**
   * Migrates emotion settings to new hierarchical structure
   *
   * Process:
   * 1. Determine display mode from legacy flags
   * 2. Migrate effects.emotion settings
   * 3. Migrate emotionalIntelligence settings
   * 4. Delete deprecated fields
   */
  migrate(settings: UnifiedSettings): boolean {
    if (!this.canMigrate(settings)) {
      return false;
    }

    console.log(`🔄 [${this.name}] Migrating emotion settings to new structure...`);

    const effects = settings.effects;
    const emotionalIntelligence = settings.emotionalIntelligence;

    // Determine display mode from legacy flags
    let displayMode: 'none' | 'minimal' | 'standard' | 'rich' = 'none';
    if (emotionalIntelligence.advancedEffectsEnabled) {
      displayMode = 'rich';
    } else if (emotionalIntelligence.visualEffectsEnabled || effects.emotionBasedStyling) {
      displayMode = 'standard';
    } else if (emotionalIntelligence.basicEffectsEnabled || effects.enableEmotionDisplay) {
      displayMode = 'minimal';
    }

    // Migrate emotion display settings
    settings.effects.emotion = {
      displayMode,
      display: {
        showText: effects.enableEmotionDisplay ?? settings.effects.emotion.display.showText,
        applyColors: effects.emotionBasedStyling ?? settings.effects.emotion.display.applyColors,
        showIcon: false, // New feature (default off)
      },
      realtimeDetection: effects.realtimeEmotion ?? settings.effects.emotion.realtimeDetection,
      autoReactions: effects.autoReactions ?? settings.effects.emotion.autoReactions,
      intensity: Math.max(
        effects.emotionStylingIntensity ?? 45,
        effects.emotionDisplayIntensity ?? 50
      ),
    };

    // Migrate emotional intelligence engine settings
    settings.emotionalIntelligence = {
      enabled: emotionalIntelligence.emotionAnalysisEnabled ?? settings.emotionalIntelligence.enabled,
      analysis: {
        basic: emotionalIntelligence.emotionAnalysisEnabled ?? settings.emotionalIntelligence.analysis.basic,
        contextual: emotionalIntelligence.contextualAnalysisEnabled ?? settings.emotionalIntelligence.analysis.contextual,
        predictive: emotionalIntelligence.predictiveAnalysisEnabled ?? settings.emotionalIntelligence.analysis.predictive,
        multiLayer: emotionalIntelligence.multiLayerAnalysisEnabled ?? settings.emotionalIntelligence.analysis.multiLayer,
      },
      memoryEnabled: emotionalIntelligence.emotionalMemoryEnabled ?? settings.emotionalIntelligence.memoryEnabled,
      adaptivePerformance: emotionalIntelligence.adaptivePerformanceEnabled ?? settings.emotionalIntelligence.adaptivePerformance,
      safeMode: emotionalIntelligence.safeMode ?? settings.emotionalIntelligence.safeMode,
      performanceMonitoring: emotionalIntelligence.performanceMonitoring ?? settings.emotionalIntelligence.performanceMonitoring,
      debugMode: emotionalIntelligence.debugMode ?? settings.emotionalIntelligence.debugMode,
      fallbackToLegacy: emotionalIntelligence.fallbackToLegacy ?? settings.emotionalIntelligence.fallbackToLegacy,
    };

    // Delete deprecated fields
    this.cleanupDeprecatedFields(settings);

    console.log(`✅ [${this.name}] Emotion settings migration complete`);
    return true;
  }

  /**
   * Removes deprecated fields from settings object
   * @private
   */
  private cleanupDeprecatedFields(settings: UnifiedSettings): void {
    // Delete deprecated effects fields
    delete settings.effects.realtimeEmotion;
    delete settings.effects.emotionBasedStyling;
    delete settings.effects.autoReactions;
    delete settings.effects.emotionStylingIntensity;
    delete settings.effects.enableEmotionDisplay;
    delete settings.effects.emotionDisplayIntensity;

    // Delete deprecated emotional intelligence fields
    delete settings.emotionalIntelligence.emotionAnalysisEnabled;
    delete settings.emotionalIntelligence.emotionalMemoryEnabled;
    delete settings.emotionalIntelligence.basicEffectsEnabled;
    delete settings.emotionalIntelligence.contextualAnalysisEnabled;
    delete settings.emotionalIntelligence.adaptivePerformanceEnabled;
    delete settings.emotionalIntelligence.visualEffectsEnabled;
    delete settings.emotionalIntelligence.predictiveAnalysisEnabled;
    delete settings.emotionalIntelligence.advancedEffectsEnabled;
    delete settings.emotionalIntelligence.multiLayerAnalysisEnabled;
  }
}
