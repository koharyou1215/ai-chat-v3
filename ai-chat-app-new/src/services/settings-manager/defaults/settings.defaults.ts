/**
 * Default Settings Configuration
 *
 * This file contains all default values for the unified settings system.
 * These defaults are used when initializing settings or resetting to defaults.
 *
 * @module settings.defaults
 */

import type { UnifiedSettings } from '../../settings-manager';

/**
 * Default settings for the entire application
 *
 * Structure:
 * - api: API provider and model configuration
 * - prompts: System prompts and jailbreak settings
 * - ui: User interface appearance and theming
 * - effects: Visual effects and animations
 * - chat: Chat behavior and message settings
 * - voice: Voice synthesis configuration
 * - imageGeneration: Image generation service settings
 * - privacy: Privacy and data retention settings
 * - emotionalIntelligence: Emotion analysis and adaptive behavior
 */
export const DEFAULT_SETTINGS: UnifiedSettings = {
  // ═══════════════════════════════════════
  // API Configuration
  // ═══════════════════════════════════════
  api: {
    provider: 'openrouter',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1.0,
    frequencyPenalty: 0.6,
    presencePenalty: 0.3,
    contextWindow: 20,
    useDirectGeminiAPI: false,
  },

  // ═══════════════════════════════════════
  // System Prompts Configuration
  // ═══════════════════════════════════════
  prompts: {
    system: '',
    jailbreak: '',
    replySuggestion: '',
    textEnhancement: '',
    enableSystemPrompt: false,
    enableJailbreakPrompt: false,
  },

  // ═══════════════════════════════════════
  // UI & Appearance Configuration
  // ═══════════════════════════════════════
  ui: {
    // Theme & Language
    theme: 'dark',
    language: 'ja',

    // Typography
    fontSize: 'medium',
    fontWeight: 'normal',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: 'normal',

    // Layout
    layoutDensity: 'comfortable',
    messageSpacing: 'normal',
    messageBorderRadius: 'medium',
    chatMaxWidth: 'normal',
    sidebarWidth: 'normal',

    // Colors
    primaryColor: '#8b5cf6',
    accentColor: '#ec4899',
    backgroundColor: '#0f0f23',
    surfaceColor: '#1e1e2e',
    textColor: '#ffffff',
    secondaryTextColor: '#9ca3af',
    borderColor: '#374151',
    shadowColor: '#000000',

    // Background
    backgroundType: 'gradient',
    backgroundGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundImage: '',
    backgroundBlur: 10,
    backgroundBlurEnabled: true,
    backgroundOpacity: 100,
    backgroundPattern: '',
    backgroundPatternOpacity: 0,

    // Effects
    enableAnimations: true,
    transitionDuration: 'normal',
    animationSpeed: 1.0,
    glassmorphism: false,
    glassmorphismIntensity: 50,

    // Regional Settings
    timezone: 'Asia/Tokyo',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: '24',
    currency: 'JPY',

    // Favicon
    faviconPath: '/favicon.ico',
    faviconSvg: '/favicon.svg',
    appleTouchIcon: '/apple-touch-icon.png',

    // Custom CSS
    customCSS: '',
  },

  // ═══════════════════════════════════════
  // Visual Effects Configuration
  // ═══════════════════════════════════════
  effects: {
    // Basic Effects
    colorfulBubbles: true,
    fontEffects: true,
    particleEffects: false,
    typewriterEffect: true,

    // Effect Intensities
    colorfulBubblesIntensity: 50,
    fontEffectsIntensity: 50,
    particleEffectsIntensity: 30,
    typewriterIntensity: 70,

    // Bubble Settings
    bubbleOpacity: 85,
    bubbleBlur: true,

    // 🎯 Phase 2.1: 3D Effects Structure
    threeDEffects: {
      enabled: true,
      hologram: {
        enabled: false,
        intensity: 40,
      },
      particleText: {
        enabled: false,
        intensity: 35,
      },
      ripple: {
        enabled: false,
        intensity: 60,
      },
      backgroundParticles: {
        enabled: false,
        intensity: 25,
      },
      depth: {
        enabled: true,
      },
      quality: 'medium' as const,
    },

    // 🔄 Phase 2.1: Backwards Compatibility (Deprecated)
    enable3DEffects: undefined,
    hologramMessages: undefined,
    particleText: undefined,
    rippleEffects: undefined,
    backgroundParticles: undefined,
    depthEffects: undefined,
    hologramIntensity: undefined,
    particleTextIntensity: undefined,
    rippleIntensity: undefined,
    backgroundParticlesIntensity: undefined,

    // 🎯 Phase 2.2: Emotion Display Structure
    emotion: {
      displayMode: 'none' as const,
      display: {
        showText: false,
        applyColors: false,
        showIcon: false,
      },
      realtimeDetection: true,
      autoReactions: false,
      intensity: 50,
    },

    // 🔄 Phase 2.2: Backwards Compatibility (Deprecated)
    realtimeEmotion: undefined,
    emotionBasedStyling: undefined,
    autoReactions: undefined,
    emotionStylingIntensity: undefined,
    enableEmotionDisplay: undefined,
    emotionDisplayIntensity: undefined,

    // Performance & Behavior
    autoTrackerUpdate: true,
    showTrackers: true,
    effectQuality: 'medium',
    animationSpeed: 0.5,
    webglEnabled: true,
    adaptivePerformance: true,
    maxParticles: 2000,

    // Text & Background
    textFormatting: 'readable',
    backgroundDim: false,
    backgroundDimIntensity: 50,
    backgroundImageEffect: null,
    backgroundImageOpacity: 100,
    backgroundImageBlur: 0,

    // Progressive Response
    progressiveResponse: false,
    progressiveResponseSpeed: 1.0,
  },

  // ═══════════════════════════════════════
  // Chat Behavior Configuration
  // ═══════════════════════════════════════
  chat: {
    enterToSend: true,
    showTypingIndicator: true,
    messageGrouping: true,
    autoScroll: true,
    soundEnabled: false,
    notificationsEnabled: false,
    responseFormat: 'normal',
    memoryCapacity: 20,
    generationCandidates: 1,

    // Memory Limits
    memoryLimits: {
      maxWorkingMemory: 6,
      maxMemoryCards: 50,
      maxRelevantMemories: 5,
      maxPromptTokens: 32000,
      maxContextMessages: 40,
    },

    // Progressive Mode
    progressiveMode: {
      enabled: true,
      showIndicators: true,
      highlightChanges: true,
      glowIntensity: 'medium',
      stageDelays: {
        reflex: 0,
        context: 1000,
        intelligence: 2000,
      },
    },
  },

  // ═══════════════════════════════════════
  // Voice Synthesis Configuration
  // ═══════════════════════════════════════
  voice: {
    enabled: true,
    provider: 'voicevox',
    autoPlay: false,

    // VOICEVOX Settings
    voicevox: {
      speaker: 0,
      speed: 1.0,
      pitch: 0.0,
      intonation: 1.0,
      volume: 1.0,
    },

    // ElevenLabs Settings
    elevenlabs: {
      voiceId: '',
      stability: 0.5,
      similarity: 0.5,
    },

    // System TTS Settings
    system: {
      voice: '',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
    },

    // Advanced Voice Settings
    advanced: {
      bufferSize: 4096,
      crossfade: true,
      normalization: true,
      noiseReduction: false,
      echoCancellation: false,
    },
  },

  // ═══════════════════════════════════════
  // Image Generation Configuration
  // ═══════════════════════════════════════
  imageGeneration: {
    provider: 'runware',

    // Runware Settings
    runware: {
      modelId: 'runware:100@1',
      lora: '',
      width: 512,
      height: 512,
      steps: 20,
      cfgScale: 7,
      sampler: 'DPM++ 2M Karras',
      seed: -1,
      customQualityTags: '',
    },

    // Stable Diffusion Settings
    stableDiffusion: {
      modelId: 'stable-diffusion-v1-5',
      width: 512,
      height: 512,
      steps: 20,
      cfgScale: 7,
      sampler: 'DPM++ 2M Karras',
      seed: -1,
    },
  },

  // ═══════════════════════════════════════
  // Privacy & Data Configuration
  // ═══════════════════════════════════════
  privacy: {
    saveHistory: true,
    shareAnalytics: false,
    allowCookies: true,
  },

  // ═══════════════════════════════════════
  // Emotional Intelligence Configuration
  // ═══════════════════════════════════════
  emotionalIntelligence: {
    enabled: false,

    // Analysis Capabilities
    analysis: {
      basic: false,
      contextual: true,
      predictive: true,
      multiLayer: true,
    },

    // Features
    memoryEnabled: true,
    adaptivePerformance: true,
    safeMode: false,
    performanceMonitoring: false,
    debugMode: false,
    fallbackToLegacy: true,

    // 🔄 Phase 2.2: Backwards Compatibility (Deprecated)
    emotionAnalysisEnabled: undefined,
    emotionalMemoryEnabled: undefined,
    basicEffectsEnabled: undefined,
    contextualAnalysisEnabled: undefined,
    adaptivePerformanceEnabled: undefined,
    visualEffectsEnabled: undefined,
    predictiveAnalysisEnabled: undefined,
    advancedEffectsEnabled: undefined,
    multiLayerAnalysisEnabled: undefined,
  },
};
