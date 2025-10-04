/**
 * Settings Manager Module Barrel Export
 *
 * This file provides a central point for importing all settings-related
 * functionality. It re-exports types, schemas, defaults, and utilities
 * from their respective modules.
 *
 * @module settings-manager
 */

// ═══════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════

export type {
  // Main Settings Interface
  UnifiedSettings,

  // API Settings
  APIProvider,
  APISettings,

  // Prompt Settings
  PromptSettings,

  // UI Settings
  Theme,
  Language,
  FontSize,
  FontWeight,
  LineHeight,
  LayoutDensity,
  MessageSpacing,
  MessageBorderRadius,
  ChatMaxWidth,
  SidebarWidth,
  BackgroundType,
  TransitionDuration,
  TimeFormat,
  UISettings,

  // Effect Settings
  EffectQuality,
  TextFormatting,
  GlowIntensity,
  ThreeDEffectsSettings,
  EmotionDisplayMode,
  EmotionSettings,
  EffectSettings,

  // Chat Settings
  ResponseFormat,
  MemoryLimits,
  ProgressiveMode,
  ChatSettings,

  // Voice Settings
  VoiceProvider,
  VoicevoxSettings,
  ElevenLabsSettings,
  SystemVoiceSettings,
  VoiceAdvancedSettings,
  VoiceSettings,

  // Image Generation Settings
  ImageGenerationProvider,
  RunwareSettings,
  StableDiffusionSettings,
  ImageGenerationSettings,

  // Privacy Settings
  PrivacySettings,

  // Emotional Intelligence Settings
  EmotionalAnalysisSettings,
  EmotionalIntelligenceSettings,
} from './types/unified-settings.types';

// ═══════════════════════════════════════════════════
// Validation Schema
// ═══════════════════════════════════════════════════

export {
  settingsSchema,
  validateSettings,
  validatePartialSettings,
  validateSettingsStrict,
  formatValidationErrors,
} from './validation/settings.schema';

export type { ValidatedSettings } from './validation/settings.schema';

// ═══════════════════════════════════════════════════
// Default Settings
// ═══════════════════════════════════════════════════

export { DEFAULT_SETTINGS } from './defaults/settings.defaults';

// ═══════════════════════════════════════════════════
// Storage Handler
// ═══════════════════════════════════════════════════

export { SettingsStorage, settingsStorage } from './storage/settings-storage';

// ═══════════════════════════════════════════════════
// Migration Handler
// ═══════════════════════════════════════════════════

export { SettingsMigrator } from './migration/settings-migrator';
