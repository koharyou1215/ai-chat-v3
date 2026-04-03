/**
 * Zod Validation Schema for Unified Settings
 * Extracted from settings-manager.ts for better separation of concerns
 */

import { z } from 'zod';
import type { UnifiedSettings } from '../../settings-manager';

// ═══════════════════════════════════════════════════
// Zod Schema Definition
// ═══════════════════════════════════════════════════

export const settingsSchema = z.object({
  api: z.object({
    provider: z.enum(['openrouter', 'openai', 'anthropic', 'google', 'groq', 'gemini']),
    openaiApiKey: z.string().optional(),
    anthropicApiKey: z.string().optional(),
    groqApiKey: z.string().optional(),
    geminiApiKey: z.string().optional(),
    googleCloudApiKey: z.string().optional(),
    openrouterApiKey: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
    topP: z.number().min(0).max(1).optional(),
    frequencyPenalty: z.number().min(0).max(2).optional(),
    presencePenalty: z.number().min(0).max(2).optional(),
    contextWindow: z.number().positive().optional(),
    useDirectGeminiAPI: z.boolean().optional(),
    inspiration: z.object({
      useFixedModel: z.boolean(),
      fixedModel: z.string().optional(),
      provider: z.enum(['openrouter', 'openai', 'anthropic', 'google', 'groq', 'gemini']).optional(),
      fixedProvider: z.enum(['openrouter', 'openai', 'anthropic', 'google', 'groq', 'gemini']).optional(),
      fixedUseDirectGeminiAPI: z.boolean().optional(),
    }).optional(),
  }),
  prompts: z.object({
    system: z.string(),
    anchor: z.string(),
    replySuggestion: z.string(),
    replySuggestionStyle: z.object({
      personality: z.string(),
      tone: z.string(),
      behavior: z.string(),
      firstPerson: z.string(),
    }),
    textEnhancement: z.string(),
    jailbreak: z.string().optional(),
    enableSystemPrompt: z.boolean(),
    chatSystemPromptMode: z.enum(['legacy', 'minimal']).default('legacy'),
    enableAnchorPrompt: z.boolean(),
    enableJailbreakPrompt: z.boolean().optional(),
    anchorDepth: z.number().min(0).max(20).optional(),
    selectedPresetId: z.string().optional(),
  }),
  ui: z.object({
    theme: z.enum(['light', 'dark', 'auto', 'midnight', 'cosmic', 'sunset', 'custom']),
    language: z.enum(['ja', 'en', 'zh', 'ko']),
    fontSize: z.enum(['small', 'medium', 'large', 'x-large']),
    fontWeight: z.enum(['light', 'normal', 'medium', 'bold']),
    fontFamily: z.string(),
    lineHeight: z.enum(['tiny', 'compact', 'normal', 'relaxed']),
    layoutDensity: z.enum(['compact', 'comfortable', 'spacious']),
    messageSpacing: z.enum(['tiny', 'compact', 'normal', 'relaxed']),
    messageBorderRadius: z.enum(['none', 'small', 'medium', 'large', 'x-large', 'full']),
    chatMaxWidth: z.enum(['narrow', 'normal', 'wide', 'full']),
    sidebarWidth: z.enum(['compact', 'normal', 'wide', 'narrow']),
    primaryColor: z.string(),
    accentColor: z.string(),
    backgroundColor: z.string(),
    surfaceColor: z.string(),
    textColor: z.string(),
    secondaryTextColor: z.string(),
    borderColor: z.string(),
    shadowColor: z.string(),
    // 🆕 Phase 3: 階層構造
    background: z.object({
      type: z.enum(['color', 'gradient', 'image', 'animated', 'video', 'slideshow']),
      image: z.object({
        url: z.string(),
        desktop: z.string(),  // 🆕 デスクトップ用URL
        mobile: z.string(),   // 🆕 モバイル用URL
        blur: z.number().min(0).max(50),
        blurEnabled: z.boolean(),
        opacity: z.number().min(0).max(100),
      }).optional(),
      gradient: z.object({
        value: z.string(),
      }).optional(),
      video: z.object({
        url: z.string(),
        desktop: z.string().optional(),
        mobile: z.string().optional(),
        opacity: z.number().min(0).max(100).optional(),
        loop: z.boolean().optional(),
        muted: z.boolean().optional(),
        autoplay: z.boolean().optional(),
        playbackRate: z.number().min(0.5).max(2).optional(),
      }).optional(),
      pattern: z.string().optional(),
      patternOpacity: z.number().min(0).max(100).optional(),
      slideshow: z.object({
        enabled: z.boolean(),
        interval: z.number().min(5).max(3600),
        transition: z.enum(['fade', 'slide', 'zoom', 'none']),
        keywords: z.array(z.string()).optional(),
        customUrls: z.array(z.string()).optional(),
        useCharacterMetadata: z.boolean(),
      }).optional(),
    }).optional(),
    // 🔄 Phase 3: 後方互換性（optional）
    backgroundType: z.enum(['color', 'gradient', 'image', 'animated', 'video', 'slideshow']).optional(),
    backgroundGradient: z.string().optional(),
    backgroundImage: z.string().optional(),
    backgroundBlur: z.number().min(0).max(50).optional(),
    backgroundBlurEnabled: z.boolean().optional(),
    backgroundOpacity: z.number().min(0).max(100).optional(),
    backgroundPattern: z.string().optional(),
    backgroundPatternOpacity: z.number().min(0).max(100).optional(),
    enableAnimations: z.boolean(),
    transitionDuration: z.enum(['instant', 'fast', 'normal', 'slow']),
    animationSpeed: z.number().min(0).max(2),
    glassmorphism: z.boolean(),
    glassmorphismIntensity: z.number().min(0).max(100),
    timezone: z.string(),
    dateFormat: z.string(),
    timeFormat: z.enum(['12', '24']),
    currency: z.string(),
    faviconPath: z.string().optional(),
    faviconSvg: z.string().optional(),
    appleTouchIcon: z.string().optional(),
    customCSS: z.string().optional(),
  }),
  effects: z.object({
    colorfulBubbles: z.boolean(),
    fontEffects: z.boolean(),
    particleEffects: z.boolean(),
    typewriterEffect: z.boolean(),
    colorfulBubblesIntensity: z.number().min(0).max(100),
    fontEffectsIntensity: z.number().min(0).max(100),
    particleEffectsIntensity: z.number().min(0).max(100),
    typewriterIntensity: z.number().min(0).max(100),
    bubbleOpacity: z.number().min(0).max(100),
    bubbleBlur: z.boolean(),
    bubbleBlurIntensity: z.number().min(0).max(20),  // 🆕 Phase 2: 0-20px
    // 🎨 Phase 1: Emotion color settings validation
    emotionColors: z.object({
      positive: z.string(),
      negative: z.string(),
      surprise: z.string(),
      question: z.string(),
      general: z.string(),
      default: z.string(),
    }),
    // 🎯 Phase 2.1: 3D設定の統合構造
    threeDEffects: z.object({
      enabled: z.boolean(),
      hologram: z.object({
        enabled: z.boolean(),
        intensity: z.number().min(0).max(100),
      }),
      particleText: z.object({
        enabled: z.boolean(),
        intensity: z.number().min(0).max(100),
      }),
      ripple: z.object({
        enabled: z.boolean(),
        intensity: z.number().min(0).max(100),
      }),
      backgroundParticles: z.object({
        enabled: z.boolean(),
        intensity: z.number().min(0).max(100),
      }),
      depth: z.object({
        enabled: z.boolean(),
      }),
      quality: z.enum(['low', 'medium', 'high']),
    }),
    // 🔄 Phase 2.1: 後方互換性（非推奨）
    enable3DEffects: z.boolean().optional(),
    hologramMessages: z.boolean().optional(),
    particleText: z.boolean().optional(),
    rippleEffects: z.boolean().optional(),
    backgroundParticles: z.boolean().optional(),
    depthEffects: z.boolean().optional(),
    hologramIntensity: z.number().min(0).max(100).optional(),
    particleTextIntensity: z.number().min(0).max(100).optional(),
    rippleIntensity: z.number().min(0).max(100).optional(),
    backgroundParticlesIntensity: z.number().min(0).max(100).optional(),
    // 🎯 Phase 2.2: 感情表示設定の統合構造
    emotion: z.object({
      displayMode: z.enum(['none', 'minimal', 'standard', 'rich']),
      display: z.object({
        showText: z.boolean(),
        applyColors: z.boolean(),
        showIcon: z.boolean(),
      }),
      realtimeDetection: z.boolean(),
      autoReactions: z.boolean(),
      intensity: z.number().min(0).max(100),
    }),
    // 🔄 Phase 2.2: 後方互換性（非推奨）
    realtimeEmotion: z.boolean().optional(),
    emotionBasedStyling: z.boolean().optional(),
    autoReactions: z.boolean().optional(),
    emotionStylingIntensity: z.number().min(0).max(100).optional(),
    enableEmotionDisplay: z.boolean().optional(),
    emotionDisplayIntensity: z.number().min(0).max(100).optional(),
    autoTrackerUpdate: z.boolean(),
    showTrackers: z.boolean(),
    effectQuality: z.enum(['low', 'medium', 'high']),
    animationSpeed: z.number().min(0).max(2),
    webglEnabled: z.boolean(),
    adaptivePerformance: z.boolean(),
    maxParticles: z.number().min(100).max(10000),
    textFormatting: z.enum(['readable', 'compact', 'expanded']),
    backgroundDim: z.boolean(),
    backgroundDimIntensity: z.number().min(0).max(100),
    backgroundImageEffect: z.string().nullable().optional(),
    backgroundImageOpacity: z.number().min(0).max(100),
    backgroundImageBlur: z.number().min(0).max(100),
    progressiveResponse: z.boolean(),
    progressiveResponseSpeed: z.number().min(0).max(2),
  }),
  chat: z.object({
    enterToSend: z.boolean(),
    showTypingIndicator: z.boolean(),
    messageGrouping: z.boolean(),
    autoScroll: z.boolean(),
    soundEnabled: z.boolean(),
    notificationsEnabled: z.boolean(),
    responseFormat: z.enum(['normal', 'roleplay', 'formal']),
    memoryCapacity: z.number().positive(),
    generationCandidates: z.number().positive(),
    activePersonaId: z.string().optional(),
    memoryLimits: z.object({
      maxWorkingMemory: z.number().positive(),
      maxMemoryCards: z.number().positive(),
      maxRelevantMemories: z.number().positive(),
      maxPromptTokens: z.number().positive(),
      maxContextMessages: z.number().positive(),
    }),
    progressiveMode: z.object({
      enabled: z.boolean(),
      showIndicators: z.boolean(),
      highlightChanges: z.boolean(),
      glowIntensity: z.enum(['none', 'soft', 'medium', 'strong']),
      stageDelays: z.object({
        reflex: z.number().min(0),
        context: z.number().min(0),
        intelligence: z.number().min(0),
      }),
    }),
  }),
  voice: z.object({
    enabled: z.boolean(),
    provider: z.enum(['voicevox', 'elevenlabs', 'system']),
    autoPlay: z.boolean(),
    voicevox: z.object({
      speaker: z.number(),
      speed: z.number().min(0).max(2),
      pitch: z.number().min(-1).max(1),
      intonation: z.number().min(0).max(2),
      volume: z.number().min(0).max(2),
    }),
    elevenlabs: z.object({
      voiceId: z.string(),
      stability: z.number().min(0).max(1),
      similarity: z.number().min(0).max(1),
    }),
    system: z.object({
      voice: z.string(),
      rate: z.number().min(0).max(2),
      pitch: z.number().min(0).max(2),
      volume: z.number().min(0).max(2),
    }),
    advanced: z.object({
      bufferSize: z.number().positive(),
      crossfade: z.boolean(),
      normalization: z.boolean(),
      noiseReduction: z.boolean(),
      echoCancellation: z.boolean(),
    }),
  }),
  imageGeneration: z.object({
    provider: z.enum(['runware', 'stable-diffusion']),
    runware: z.object({
      modelId: z.string(),
      apiKey: z.string(),
      lora: z.string(),
      width: z.number().positive(),
      height: z.number().positive(),
      steps: z.number().positive(),
      cfgScale: z.number().positive(),
      sampler: z.string(),
      seed: z.number(),
      customQualityTags: z.string(),
    }),
    stableDiffusion: z.object({
      modelId: z.string(),
      width: z.number().positive(),
      height: z.number().positive(),
      steps: z.number().positive(),
      cfgScale: z.number().positive(),
      sampler: z.string(),
      seed: z.number(),
    }),
  }),
  privacy: z.object({
    saveHistory: z.boolean(),
    shareAnalytics: z.boolean(),
    allowCookies: z.boolean(),
  }),
  // 🎯 Phase 2.2: 感情知能エンジン設定
  emotionalIntelligence: z.object({
    enabled: z.boolean(),
    analysis: z.object({
      basic: z.boolean(),
      contextual: z.boolean(),
      predictive: z.boolean(),
      multiLayer: z.boolean(),
    }),
    memoryEnabled: z.boolean(),
    adaptivePerformance: z.boolean(),
    safeMode: z.boolean(),
    performanceMonitoring: z.boolean(),
    debugMode: z.boolean(),
    fallbackToLegacy: z.boolean(),
    // 🔄 Phase 2.2: 後方互換性（非推奨）
    emotionAnalysisEnabled: z.boolean().optional(),
    emotionalMemoryEnabled: z.boolean().optional(),
    basicEffectsEnabled: z.boolean().optional(),
    contextualAnalysisEnabled: z.boolean().optional(),
    adaptivePerformanceEnabled: z.boolean().optional(),
    visualEffectsEnabled: z.boolean().optional(),
    predictiveAnalysisEnabled: z.boolean().optional(),
    advancedEffectsEnabled: z.boolean().optional(),
    multiLayerAnalysisEnabled: z.boolean().optional(),
  }),
});

// ═══════════════════════════════════════════════════
// Type Inference
// ═══════════════════════════════════════════════════

export type ValidatedSettings = z.infer<typeof settingsSchema>;

// ═══════════════════════════════════════════════════
// Validation Utilities
// ═══════════════════════════════════════════════════

/**
 * Validate settings object against schema
 * @param settings - Settings object to validate
 * @returns Validation result with parsed data or errors
 */
export function validateSettings(settings: unknown): {
  success: boolean;
  data?: UnifiedSettings;
  errors?: z.ZodError;
} {
  const result = settingsSchema.safeParse(settings);

  if (result.success) {
    return {
      success: true,
      data: result.data as UnifiedSettings,
    };
  }

  return {
    success: false,
    errors: result.error,
  };
}

/**
 * Validate partial settings (useful for updates)
 * @param settings - Partial settings object to validate
 * @returns Validation result
 */
export function validatePartialSettings(settings: unknown): {
  success: boolean;
  data?: Partial<UnifiedSettings>;
  errors?: z.ZodError;
} {
  const partialSchema = settingsSchema.partial();
  const result = partialSchema.safeParse(settings);

  if (result.success) {
    return {
      success: true,
      data: result.data as Partial<UnifiedSettings>,
    };
  }

  return {
    success: false,
    errors: result.error,
  };
}

/**
 * Strict validation - throws on invalid settings
 * @param settings - Settings object to validate
 * @returns Validated settings
 * @throws ZodError if validation fails
 */
export function validateSettingsStrict(settings: unknown): UnifiedSettings {
  return settingsSchema.parse(settings) as UnifiedSettings;
}

/**
 * Get formatted validation errors
 * @param errors - Zod validation errors
 * @returns Formatted error messages
 */
export function formatValidationErrors(errors: z.ZodError): string[] {
  return errors.errors.map((error) => {
    const path = error.path.join('.');
    return `${path}: ${error.message}`;
  });
}
