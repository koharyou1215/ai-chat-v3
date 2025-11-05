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
    provider: 'openrouter',  // ✅ デフォルトはOpenRouter（CLAUDE.md絶対ルール準拠）
    model: 'google/gemini-2.5-flash-preview-09-2025',  // ✅ OpenRouter経由のGemini 2.5プレビュー版
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1.0,
    frequencyPenalty: 0.6,
    presencePenalty: 0.3,
    contextWindow: 20,
    useDirectGeminiAPI: false,  // ✅ デフォルトはOpenRouter使用（Gemini直接APIは使用しない）
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

    // Background (Phase 3: 階層構造)
    background: {
      type: 'gradient',
      image: {
        url: '',            // 後方互換性フィールド
        desktop: '',        // 🆕 デスクトップ用URL（横長画像推奨）
        mobile: '',         // 🆕 モバイル用URL（縦長画像推奨）
        blur: 10,
        blurEnabled: false,
        opacity: 100,
      },
      gradient: {
        value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
    },

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
    typewriterSound: true,

    // Effect Intensities
    colorfulBubblesIntensity: 50,
    fontEffectsIntensity: 50,
    particleEffectsIntensity: 30,
    typewriterIntensity: 70,
    typewriterSoundVolume: 30,

    // Bubble Settings
    bubbleOpacity: 85,
    bubbleBlur: true,
    bubbleBlurIntensity: 8,  // 🆕 Phase 2: デフォルト8px

    // 🎨 Phase 1: Emotion Color Settings
    emotionColors: {
      positive: '#ff99c2',   // ポジティブ: ピンク
      negative: '#70b8ff',   // ネガティブ: ライトブルー
      surprise: '#ffd93d',   // 驚き: イエロー
      question: '#00d9ff',   // 質問: シアン
      general: '#ff9999',    // 一般強調: ライトレッド
      default: '#ffffff',    // デフォルト: 白
    },

    // 🎯 Phase 2.1: 3D Effects Structure
    threeDEffects: {
      enabled: true,
      hologram: {
        enabled: false,
        intensity: 40,
      },
      particleText: {
        enabled: true,
        intensity: 35,
      },
      ripple: {
        enabled: true,
        intensity: 60,
      },
      backgroundParticles: {
        enabled: true,
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
      displayMode: 'standard' as const,
      display: {
        showText: false,
        applyColors: true,
        showIcon: true,
      },
      realtimeDetection: true,
      autoReactions: true,
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
      enabled: false,  // 🔧 CRITICAL FIX: デフォルト無効化（Gemini APIレート制限対策）
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
    enabled: true,

    // Analysis Capabilities
    analysis: {
      basic: true,
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
