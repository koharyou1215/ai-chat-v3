/**
 * 統一設定管理サービス
 * すべての設定の単一の真実の源として機能
 */

import * as React from 'react';
import { z } from 'zod';

// 型定義
export interface UnifiedSettings {
  // ═══════════════════════════════════════
  // API設定
  // ═══════════════════════════════════════
  api: {
    provider: 'openrouter' | 'openai' | 'anthropic' | 'google' | 'groq' | 'gemini';
    openaiApiKey?: string;
    anthropicApiKey?: string;
    groqApiKey?: string;
    geminiApiKey?: string;
    openrouterApiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    contextWindow?: number;
    useDirectGeminiAPI?: boolean;
  };

  // ═══════════════════════════════════════
  // システムプロンプト設定
  // ═══════════════════════════════════════
  prompts: {
    system: string;
    jailbreak: string;
    replySuggestion: string;
    textEnhancement: string;
    enableSystemPrompt: boolean;
    enableJailbreakPrompt: boolean;
  };

  // ═══════════════════════════════════════
  // UI & 外観設定
  // ═══════════════════════════════════════
  ui: {
    // テーマ
    theme: 'light' | 'dark' | 'auto' | 'midnight' | 'cosmic' | 'sunset' | 'custom';
    language: 'ja' | 'en' | 'zh' | 'ko';

    // タイポグラフィ
    fontSize: 'small' | 'medium' | 'large' | 'x-large';
    fontWeight: 'light' | 'normal' | 'medium' | 'bold';
    fontFamily: string;
    lineHeight: 'compact' | 'normal' | 'relaxed';

    // レイアウト
    layoutDensity: 'compact' | 'comfortable' | 'spacious';
    messageSpacing: 'compact' | 'normal' | 'relaxed';
    messageBorderRadius: 'none' | 'small' | 'medium' | 'large' | 'x-large';
    chatMaxWidth: 'narrow' | 'normal' | 'wide' | 'full';
    sidebarWidth: 'compact' | 'normal' | 'wide';

    // カラー
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    secondaryTextColor: string;
    borderColor: string;
    shadowColor: string;

    // 背景設定
    backgroundType: 'color' | 'gradient' | 'image' | 'animated';
    backgroundGradient?: string;
    backgroundImage?: string;
    backgroundBlur: number;
    backgroundBlurEnabled: boolean;
    backgroundOpacity: number;
    backgroundPattern?: string;
    backgroundPatternOpacity?: number;

    // エフェクト
    enableAnimations: boolean;
    transitionDuration: 'instant' | 'fast' | 'normal' | 'slow';
    animationSpeed: number;
    glassmorphism: boolean;
    glassmorphismIntensity: number;

    // 地域設定
    timezone: string;
    dateFormat: string;
    timeFormat: '12' | '24';
    currency: string;

    // Favicon設定（既存コードとの互換性）
    faviconPath?: string;
    faviconSvg?: string;
    appleTouchIcon?: string;
    customCSS?: string;
  };

  // ═══════════════════════════════════════
  // エフェクト設定
  // ═══════════════════════════════════════
  effects: {
    // メッセージエフェクト
    colorfulBubbles: boolean;
    fontEffects: boolean;
    particleEffects: boolean;
    typewriterEffect: boolean;

    // エフェクト強度
    colorfulBubblesIntensity: number;
    fontEffectsIntensity: number;
    particleEffectsIntensity: number;
    typewriterIntensity: number;

    // バブル外観
    bubbleOpacity: number;
    bubbleBlur: boolean;
    bubbleTransparency: number;

    // 3D機能
    enable3DEffects: boolean;
    hologramMessages: boolean;
    particleText: boolean;
    rippleEffects: boolean;
    backgroundParticles: boolean;
    depthEffects: boolean;

    // 3Dエフェクト強度
    hologramIntensity: number;
    particleTextIntensity: number;
    rippleIntensity: number;
    backgroundParticlesIntensity: number;

    // 追加エフェクト
    shadowEffects: boolean;
    shadowEffectsIntensity: number;
    glowEffects: boolean;
    glowEffectsIntensity: number;
    neonText: boolean;
    neonTextIntensity: number;

    // 感情分析
    realtimeEmotion: boolean;
    emotionBasedStyling: boolean;
    autoReactions: boolean;
    emotionStylingIntensity: number;
    enableEmotionDisplay: boolean;
    enableEmotionParticles: boolean;
    emotionDisplayIntensity: number;
    emotionParticlesIntensity: number;

    // トラッカー
    autoTrackerUpdate: boolean;
    showTrackers: boolean;

    // パフォーマンス
    effectQuality: 'low' | 'medium' | 'high';
    animationSpeed: number;
    webglEnabled: boolean;
    adaptivePerformance: boolean;
    maxParticles: number;

    // テキスト整形
    textFormatting: 'readable' | 'compact' | 'expanded';

    // 背景エフェクト
    backgroundDim: boolean;
    backgroundDimIntensity: number;
    backgroundImageEffect?: string | null;
    backgroundImageOpacity: number;
    backgroundImageBlur: number;

    // プログレッシブレスポンス
    progressiveResponse: boolean;
    progressiveResponseSpeed: number;
  };

  // ═══════════════════════════════════════
  // チャット設定
  // ═══════════════════════════════════════
  chat: {
    enterToSend: boolean;
    showTypingIndicator: boolean;
    messageGrouping: boolean;
    autoScroll: boolean;
    soundEnabled: boolean;
    notificationsEnabled: boolean;

    // レスポンス形式
    responseFormat: 'normal' | 'roleplay' | 'formal';
    memoryCapacity: number;
    generationCandidates: number;

    // メモリー制限
    memoryLimits: {
      maxWorkingMemory: number;
      maxMemoryCards: number;
      maxRelevantMemories: number;
      maxPromptTokens: number;
      maxContextMessages: number;
    };

    // プログレッシブモード
    progressiveMode: {
      enabled: boolean;
      showIndicators: boolean;
      highlightChanges: boolean;
      glowIntensity: 'none' | 'soft' | 'medium' | 'strong';
      stageDelays: {
        reflex: number;
        context: number;
        intelligence: number;
      };
    };
  };

  // ═══════════════════════════════════════
  // 音声設定
  // ═══════════════════════════════════════
  voice: {
    enabled: boolean;
    provider: 'voicevox' | 'elevenlabs' | 'system';
    autoPlay: boolean;

    voicevox: {
      speaker: number;
      speed: number;
      pitch: number;
      intonation: number;
      volume: number;
    };

    elevenlabs: {
      voiceId: string;
      stability: number;
      similarity: number;
    };

    system: {
      voice: string;
      rate: number;
      pitch: number;
      volume: number;
    };

    advanced: {
      bufferSize: number;
      crossfade: boolean;
      normalization: boolean;
      noiseReduction: boolean;
      echoCancellation: boolean;
    };
  };

  // ═══════════════════════════════════════
  // 画像生成設定
  // ═══════════════════════════════════════
  imageGeneration: {
    provider: 'runware' | 'stable-diffusion';

    runware: {
      modelId: string;
      lora: string;
      width: number;
      height: number;
      steps: number;
      cfgScale: number;
      sampler: string;
      seed: number;
      customQualityTags: string;
    };

    stableDiffusion: {
      modelId: string;
      width: number;
      height: number;
      steps: number;
      cfgScale: number;
      sampler: string;
      seed: number;
    };
  };

  // ═══════════════════════════════════════
  // プライバシー設定
  // ═══════════════════════════════════════
  privacy: {
    saveHistory: boolean;
    shareAnalytics: boolean;
    allowCookies: boolean;
  };

  // ═══════════════════════════════════════
  // 感情知能フラグ
  // ═══════════════════════════════════════
  emotionalIntelligence: {
    emotionAnalysisEnabled: boolean;
    emotionalMemoryEnabled: boolean;
    basicEffectsEnabled: boolean;
    contextualAnalysisEnabled: boolean;
    adaptivePerformanceEnabled: boolean;
    visualEffectsEnabled: boolean;
    predictiveAnalysisEnabled: boolean;
    advancedEffectsEnabled: boolean;
    multiLayerAnalysisEnabled: boolean;
    safeMode: boolean;
    fallbackToLegacy: boolean;
    performanceMonitoring: boolean;
    debugMode: boolean;
  };
}

// バリデーションスキーマ
const settingsSchema = z.object({
  api: z.object({
    provider: z.enum(['openrouter', 'openai', 'anthropic', 'google', 'groq', 'gemini']),
    openaiApiKey: z.string().optional(),
    anthropicApiKey: z.string().optional(),
    groqApiKey: z.string().optional(),
    geminiApiKey: z.string().optional(),
    openrouterApiKey: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
    topP: z.number().min(0).max(1).optional(),
    frequencyPenalty: z.number().min(0).max(2).optional(),
    presencePenalty: z.number().min(0).max(2).optional(),
    contextWindow: z.number().positive().optional(),
    useDirectGeminiAPI: z.boolean().optional(),
  }),
  prompts: z.object({
    system: z.string(),
    jailbreak: z.string(),
    replySuggestion: z.string(),
    textEnhancement: z.string(),
    enableSystemPrompt: z.boolean(),
    enableJailbreakPrompt: z.boolean(),
  }),
  ui: z.object({
    theme: z.enum(['light', 'dark', 'auto', 'midnight', 'cosmic', 'sunset', 'custom']),
    language: z.enum(['ja', 'en', 'zh', 'ko']),
    fontSize: z.enum(['small', 'medium', 'large', 'x-large']),
    fontWeight: z.enum(['light', 'normal', 'medium', 'bold']),
    fontFamily: z.string(),
    lineHeight: z.enum(['compact', 'normal', 'relaxed']),
    layoutDensity: z.enum(['compact', 'comfortable', 'spacious']),
    messageSpacing: z.enum(['compact', 'normal', 'relaxed']),
    messageBorderRadius: z.enum(['none', 'small', 'medium', 'large', 'x-large']),
    chatMaxWidth: z.enum(['narrow', 'normal', 'wide', 'full']),
    sidebarWidth: z.enum(['compact', 'normal', 'wide']),
    primaryColor: z.string(),
    accentColor: z.string(),
    backgroundColor: z.string(),
    surfaceColor: z.string(),
    textColor: z.string(),
    secondaryTextColor: z.string(),
    borderColor: z.string(),
    shadowColor: z.string(),
    backgroundType: z.enum(['color', 'gradient', 'image', 'animated']),
    backgroundGradient: z.string().optional(),
    backgroundImage: z.string().optional(),
    backgroundBlur: z.number().min(0).max(100),
    backgroundBlurEnabled: z.boolean(),
    backgroundOpacity: z.number().min(0).max(100),
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
    bubbleTransparency: z.number().min(0).max(100),
    enable3DEffects: z.boolean(),
    hologramMessages: z.boolean(),
    particleText: z.boolean(),
    rippleEffects: z.boolean(),
    backgroundParticles: z.boolean(),
    depthEffects: z.boolean(),
    hologramIntensity: z.number().min(0).max(100),
    particleTextIntensity: z.number().min(0).max(100),
    rippleIntensity: z.number().min(0).max(100),
    backgroundParticlesIntensity: z.number().min(0).max(100),
    shadowEffects: z.boolean(),
    shadowEffectsIntensity: z.number().min(0).max(100),
    glowEffects: z.boolean(),
    glowEffectsIntensity: z.number().min(0).max(100),
    neonText: z.boolean(),
    neonTextIntensity: z.number().min(0).max(100),
    realtimeEmotion: z.boolean(),
    emotionBasedStyling: z.boolean(),
    autoReactions: z.boolean(),
    emotionStylingIntensity: z.number().min(0).max(100),
    enableEmotionDisplay: z.boolean(),
    enableEmotionParticles: z.boolean(),
    emotionDisplayIntensity: z.number().min(0).max(100),
    emotionParticlesIntensity: z.number().min(0).max(100),
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
  emotionalIntelligence: z.object({
    emotionAnalysisEnabled: z.boolean(),
    emotionalMemoryEnabled: z.boolean(),
    basicEffectsEnabled: z.boolean(),
    contextualAnalysisEnabled: z.boolean(),
    adaptivePerformanceEnabled: z.boolean(),
    visualEffectsEnabled: z.boolean(),
    predictiveAnalysisEnabled: z.boolean(),
    advancedEffectsEnabled: z.boolean(),
    multiLayerAnalysisEnabled: z.boolean(),
    safeMode: z.boolean(),
    fallbackToLegacy: z.boolean(),
    performanceMonitoring: z.boolean(),
    debugMode: z.boolean(),
  }),
});

// デフォルト設定
const DEFAULT_SETTINGS: UnifiedSettings = {
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
  prompts: {
    system: '',
    jailbreak: '',
    replySuggestion: '',
    textEnhancement: '',
    enableSystemPrompt: false,
    enableJailbreakPrompt: false,
  },
  ui: {
    theme: 'dark',
    language: 'ja',
    fontSize: 'medium',
    fontWeight: 'normal',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: 'normal',
    layoutDensity: 'comfortable',
    messageSpacing: 'normal',
    messageBorderRadius: 'medium',
    chatMaxWidth: 'normal',
    sidebarWidth: 'normal',
    primaryColor: '#8b5cf6',
    accentColor: '#ec4899',
    backgroundColor: '#0f0f23',
    surfaceColor: '#1e1e2e',
    textColor: '#ffffff',
    secondaryTextColor: '#9ca3af',
    borderColor: '#374151',
    shadowColor: '#000000',
    backgroundType: 'gradient',
    backgroundGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundImage: '',
    backgroundBlur: 10,
    backgroundBlurEnabled: true,
    backgroundOpacity: 100,
    backgroundPattern: '',
    backgroundPatternOpacity: 0,
    enableAnimations: true,
    transitionDuration: 'normal',
    animationSpeed: 1.0,
    glassmorphism: false,
    glassmorphismIntensity: 50,
    timezone: 'Asia/Tokyo',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: '24',
    currency: 'JPY',
    faviconPath: '/favicon.ico',
    faviconSvg: '/favicon.svg',
    appleTouchIcon: '/apple-touch-icon.png',
    customCSS: '',
  },
  effects: {
    colorfulBubbles: true,
    fontEffects: true,
    particleEffects: false,
    typewriterEffect: true,
    colorfulBubblesIntensity: 50,
    fontEffectsIntensity: 50,
    particleEffectsIntensity: 30,
    typewriterIntensity: 70,
    bubbleOpacity: 85,
    bubbleBlur: true,
    bubbleTransparency: 20,
    enable3DEffects: true,
    hologramMessages: false,
    particleText: false,
    rippleEffects: false,
    backgroundParticles: false,
    depthEffects: true,
    hologramIntensity: 40,
    particleTextIntensity: 35,
    rippleIntensity: 60,
    backgroundParticlesIntensity: 25,
    shadowEffects: false,
    shadowEffectsIntensity: 50,
    glowEffects: false,
    glowEffectsIntensity: 50,
    neonText: false,
    neonTextIntensity: 50,
    realtimeEmotion: true,
    emotionBasedStyling: false,
    autoReactions: false,
    emotionStylingIntensity: 45,
    enableEmotionDisplay: false,
    enableEmotionParticles: false,
    emotionDisplayIntensity: 50,
    emotionParticlesIntensity: 50,
    autoTrackerUpdate: true,
    showTrackers: true,
    effectQuality: 'medium',
    animationSpeed: 0.5,
    webglEnabled: true,
    adaptivePerformance: true,
    maxParticles: 2000,
    textFormatting: 'readable',
    backgroundDim: false,
    backgroundDimIntensity: 50,
    backgroundImageEffect: null,
    backgroundImageOpacity: 100,
    backgroundImageBlur: 0,
    progressiveResponse: false,
    progressiveResponseSpeed: 1.0,
  },
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
    memoryLimits: {
      maxWorkingMemory: 6,
      maxMemoryCards: 50,
      maxRelevantMemories: 5,
      maxPromptTokens: 32000,
      maxContextMessages: 40,
    },
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
  voice: {
    enabled: true,
    provider: 'voicevox',
    autoPlay: false,
    voicevox: {
      speaker: 0,
      speed: 1.0,
      pitch: 0.0,
      intonation: 1.0,
      volume: 1.0,
    },
    elevenlabs: {
      voiceId: '',
      stability: 0.5,
      similarity: 0.5,
    },
    system: {
      voice: '',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
    },
    advanced: {
      bufferSize: 4096,
      crossfade: true,
      normalization: true,
      noiseReduction: false,
      echoCancellation: false,
    },
  },
  imageGeneration: {
    provider: 'runware',
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
  privacy: {
    saveHistory: true,
    shareAnalytics: false,
    allowCookies: true,
  },
  emotionalIntelligence: {
    emotionAnalysisEnabled: false,
    emotionalMemoryEnabled: true,
    basicEffectsEnabled: true,
    contextualAnalysisEnabled: true,
    adaptivePerformanceEnabled: true,
    visualEffectsEnabled: true,
    predictiveAnalysisEnabled: true,
    advancedEffectsEnabled: true,
    multiLayerAnalysisEnabled: true,
    safeMode: false,
    fallbackToLegacy: true,
    performanceMonitoring: false,
    debugMode: false,
  },
};

class SettingsManager {
  private static instance: SettingsManager;
  private settings: UnifiedSettings;
  private listeners: Set<(settings: UnifiedSettings) => void> = new Set();
  private storageKey = 'unified-settings';

  private constructor() {
    this.settings = this.loadSettings();
    this.migrateOldSettings();
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * 設定を取得
   */
  getSettings(): UnifiedSettings {
    return { ...this.settings };
  }

  /**
   * 部分的な設定を取得
   */
  getSetting<K extends keyof UnifiedSettings>(key: K): UnifiedSettings[K] {
    return { ...this.settings[key] };
  }

  /**
   * 設定を更新
   */
  updateSettings(updates: Partial<UnifiedSettings>): void {
    const newSettings = { ...this.settings, ...updates };

    // 🔧 FIX: 無効なbackgroundTypeを自動修正
    if (newSettings.ui?.backgroundType &&
        !['color', 'gradient', 'image', 'animated'].includes(newSettings.ui.backgroundType)) {
      console.warn(`Invalid background type '${newSettings.ui.backgroundType}', falling back to 'gradient'`);
      newSettings.ui.backgroundType = 'gradient';
    }

    // バリデーション
    try {
      settingsSchema.parse(newSettings);
    } catch (error) {
      console.error('Settings validation failed:', error);
      return;
    }

    this.settings = newSettings;
    this.saveSettings();
    this.notifyListeners();
  }

  /**
   * カテゴリ単位で設定を更新
   */
  updateCategory<K extends keyof UnifiedSettings>(
    category: K,
    updates: Partial<UnifiedSettings[K]>
  ): void {
    this.updateSettings({
      [category]: { ...this.settings[category], ...updates },
    } as Partial<UnifiedSettings>);

    // サイドエフェクト: API設定が更新された場合は関連サービスに通知
    if (category === 'api') {
      this.notifyAPIChange();
    }
  }

  /**
   * API設定変更時のサイドエフェクト処理
   */
  private notifyAPIChange(): void {
    // simpleAPIManagerV2への通知は settings.slice.ts で行う
    // ここでは設定の永続化のみを担当
    // Note: simpleAPIManagerV2への通知は、settings.sliceのupdateCategory経由で行われる
  }

  /**
   * 設定をリセット
   */
  resetSettings(category?: keyof UnifiedSettings): void {
    if (category) {
      this.updateSettings({
        [category]: DEFAULT_SETTINGS[category],
      } as Partial<UnifiedSettings>);
    } else {
      this.settings = { ...DEFAULT_SETTINGS };
      this.saveSettings();
      this.notifyListeners();
    }
  }

  /**
   * リスナーを登録
   */
  subscribe(listener: (settings: UnifiedSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 設定を読み込む
   */
  private loadSettings(): UnifiedSettings {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_SETTINGS };
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);

        // 🔧 FIX: 無効なbackgroundTypeを自動修正
        if (parsed.ui?.backgroundType &&
            !['color', 'gradient', 'image', 'animated'].includes(parsed.ui.backgroundType)) {
          console.warn(`Invalid background type '${parsed.ui.backgroundType}' detected, falling back to 'gradient'`);
          parsed.ui.backgroundType = 'gradient';
        }

        const validated = settingsSchema.parse(parsed);
        return validated as UnifiedSettings;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }

    return { ...DEFAULT_SETTINGS };
  }

  /**
   * 設定を保存
   */
  private saveSettings(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  /**
   * リスナーに通知
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.settings }));
  }

  /**
   * 古い設定を移行
   */
  private migrateOldSettings(): void {
    if (typeof window === 'undefined') return;

    let hasChanges = false;

    // エフェクト設定の移行
    const effectSettings = localStorage.getItem('effect-settings');
    if (effectSettings) {
      try {
        const parsed = JSON.parse(effectSettings);
        this.settings.effects = { ...this.settings.effects, ...parsed };
        hasChanges = true;
        localStorage.removeItem('effect-settings');
      } catch (error) {
        console.error('Failed to migrate effect settings:', error);
      }
    }

    // simple-api-manager-v2から移行
    const apiKeys = {
      'OPENAI_API_KEY': 'openaiApiKey',
      'ANTHROPIC_API_KEY': 'anthropicApiKey',
      'GROQ_API_KEY': 'groqApiKey',
      'GEMINI_API_KEY': 'geminiApiKey',
      'OPENROUTER_API_KEY': 'openrouterApiKey',
    };

    Object.entries(apiKeys).forEach(([storageKey, settingKey]) => {
      const value = localStorage.getItem(storageKey);
      if (value) {
        (this.settings.api as any)[settingKey] = value;
        hasChanges = true;
        localStorage.removeItem(storageKey);
      }
    });

    // Zustand persistから移行
    const zustandMigrated = this.migrateFromZustand();
    if (zustandMigrated) {
      hasChanges = true;
    }

    // 変更があれば保存
    if (hasChanges) {
      this.saveSettings();
      console.log('✅ Migrated old settings to unified settings');
    }
  }

  /**
   * Zustand persistから設定を移行
   */
  private migrateFromZustand(): boolean {
    try {
      const zustandData = localStorage.getItem('ai-chat-v3-storage');
      if (!zustandData) return false;

      const zustand = JSON.parse(zustandData);
      const state = zustand?.state;
      if (!state) return false;

      let hasMigration = false;

      // API設定の移行
      if (state.apiConfig) {
        const apiConfig = state.apiConfig;
        this.settings.api = {
          ...this.settings.api,
          provider: apiConfig.provider === 'gemini' ? 'gemini' : apiConfig.provider || this.settings.api.provider,
          model: apiConfig.model || this.settings.api.model,
          temperature: apiConfig.temperature ?? this.settings.api.temperature,
          maxTokens: apiConfig.max_tokens ?? this.settings.api.maxTokens,
          topP: apiConfig.top_p ?? this.settings.api.topP,
          frequencyPenalty: apiConfig.frequency_penalty ?? this.settings.api.frequencyPenalty,
          presencePenalty: apiConfig.presence_penalty ?? this.settings.api.presencePenalty,
          contextWindow: apiConfig.context_window ?? this.settings.api.contextWindow,
        };
        hasMigration = true;
      }

      // APIキーの移行
      if (state.openRouterApiKey) {
        this.settings.api.openrouterApiKey = state.openRouterApiKey;
        hasMigration = true;
      }
      if (state.geminiApiKey) {
        this.settings.api.geminiApiKey = state.geminiApiKey;
        hasMigration = true;
      }
      if (state.useDirectGeminiAPI !== undefined) {
        this.settings.api.useDirectGeminiAPI = state.useDirectGeminiAPI;
        hasMigration = true;
      }

      // システムプロンプトの移行
      if (state.systemPrompts) {
        this.settings.prompts = {
          ...this.settings.prompts,
          system: state.systemPrompts.system || '',
          jailbreak: state.systemPrompts.jailbreak || '',
          replySuggestion: state.systemPrompts.replySuggestion || '',
          textEnhancement: state.systemPrompts.textEnhancement || '',
        };
        hasMigration = true;
      }
      if (state.enableSystemPrompt !== undefined) {
        this.settings.prompts.enableSystemPrompt = state.enableSystemPrompt;
        hasMigration = true;
      }
      if (state.enableJailbreakPrompt !== undefined) {
        this.settings.prompts.enableJailbreakPrompt = state.enableJailbreakPrompt;
        hasMigration = true;
      }

      // エフェクト設定の移行
      if (state.effectSettings) {
        this.settings.effects = {
          ...this.settings.effects,
          ...state.effectSettings,
        };
        hasMigration = true;
      }

      // UI/外観設定の移行
      if (state.appearanceSettings) {
        const appearance = state.appearanceSettings;
        if (appearance.theme) {
          this.settings.ui.theme = appearance.theme;
        }
        if (appearance.fontSize) {
          this.settings.ui.fontSize = appearance.fontSize;
        }
        if (appearance.fontWeight) {
          this.settings.ui.fontWeight = appearance.fontWeight;
        }
        if (appearance.fontFamily) {
          this.settings.ui.fontFamily = appearance.fontFamily;
        }
        if (appearance.lineHeight) {
          this.settings.ui.lineHeight = appearance.lineHeight;
        }
        if (appearance.primaryColor) {
          this.settings.ui.primaryColor = appearance.primaryColor;
        }
        if (appearance.accentColor) {
          this.settings.ui.accentColor = appearance.accentColor;
        }
        if (appearance.backgroundColor) {
          this.settings.ui.backgroundColor = appearance.backgroundColor;
        }
        if (appearance.surfaceColor) {
          this.settings.ui.surfaceColor = appearance.surfaceColor;
        }
        if (appearance.textColor) {
          this.settings.ui.textColor = appearance.textColor;
        }
        if (appearance.backgroundType) {
          this.settings.ui.backgroundType = appearance.backgroundType;
        }
        if (appearance.backgroundImage !== undefined) {
          this.settings.ui.backgroundImage = appearance.backgroundImage;
        }
        if (appearance.backgroundGradient) {
          this.settings.ui.backgroundGradient = appearance.backgroundGradient;
        }
        if (appearance.backgroundBlur !== undefined) {
          this.settings.ui.backgroundBlur = appearance.backgroundBlur;
        }
        if (appearance.backgroundBlurEnabled !== undefined) {
          this.settings.ui.backgroundBlurEnabled = appearance.backgroundBlurEnabled;
        }
        if (appearance.backgroundOpacity !== undefined) {
          this.settings.ui.backgroundOpacity = appearance.backgroundOpacity;
        }
        if (appearance.faviconPath) {
          this.settings.ui.faviconPath = appearance.faviconPath;
        }
        if (appearance.faviconSvg) {
          this.settings.ui.faviconSvg = appearance.faviconSvg;
        }
        if (appearance.appleTouchIcon) {
          this.settings.ui.appleTouchIcon = appearance.appleTouchIcon;
        }
        if (appearance.customCSS !== undefined) {
          this.settings.ui.customCSS = appearance.customCSS;
        }
        if (appearance.enableAnimations !== undefined) {
          this.settings.ui.enableAnimations = appearance.enableAnimations;
        }
        if (appearance.transitionDuration) {
          this.settings.ui.transitionDuration = appearance.transitionDuration;
        }
        hasMigration = true;
      }

      // 言語設定の移行
      if (state.languageSettings?.language) {
        this.settings.ui.language = state.languageSettings.language;
        hasMigration = true;
      }

      // チャット設定の移行
      if (state.chat) {
        this.settings.chat = {
          ...this.settings.chat,
          ...state.chat,
        };
        hasMigration = true;
      }

      // 音声設定の移行
      if (state.voice) {
        this.settings.voice = {
          ...this.settings.voice,
          ...state.voice,
        };
        hasMigration = true;
      }

      // 画像生成設定の移行
      if (state.imageGeneration) {
        this.settings.imageGeneration = {
          ...this.settings.imageGeneration,
          ...state.imageGeneration,
        };
        hasMigration = true;
      }

      // 感情知能フラグの移行
      if (state.emotionalIntelligenceFlags) {
        const flags = state.emotionalIntelligenceFlags;
        this.settings.emotionalIntelligence = {
          emotionAnalysisEnabled: flags.emotion_analysis_enabled ?? this.settings.emotionalIntelligence.emotionAnalysisEnabled,
          emotionalMemoryEnabled: flags.emotional_memory_enabled ?? this.settings.emotionalIntelligence.emotionalMemoryEnabled,
          basicEffectsEnabled: flags.basic_effects_enabled ?? this.settings.emotionalIntelligence.basicEffectsEnabled,
          contextualAnalysisEnabled: flags.contextual_analysis_enabled ?? this.settings.emotionalIntelligence.contextualAnalysisEnabled,
          adaptivePerformanceEnabled: flags.adaptive_performance_enabled ?? this.settings.emotionalIntelligence.adaptivePerformanceEnabled,
          visualEffectsEnabled: flags.visual_effects_enabled ?? this.settings.emotionalIntelligence.visualEffectsEnabled,
          predictiveAnalysisEnabled: flags.predictive_analysis_enabled ?? this.settings.emotionalIntelligence.predictiveAnalysisEnabled,
          advancedEffectsEnabled: flags.advanced_effects_enabled ?? this.settings.emotionalIntelligence.advancedEffectsEnabled,
          multiLayerAnalysisEnabled: flags.multi_layer_analysis_enabled ?? this.settings.emotionalIntelligence.multiLayerAnalysisEnabled,
          safeMode: flags.safe_mode ?? this.settings.emotionalIntelligence.safeMode,
          fallbackToLegacy: flags.fallback_to_legacy ?? this.settings.emotionalIntelligence.fallbackToLegacy,
          performanceMonitoring: flags.performance_monitoring ?? this.settings.emotionalIntelligence.performanceMonitoring,
          debugMode: flags.debug_mode ?? this.settings.emotionalIntelligence.debugMode,
        };
        hasMigration = true;
      }

      if (hasMigration) {
        console.log('🔄 [SettingsManager] Migrated settings from Zustand persist');
      }

      return hasMigration;
    } catch (error) {
      console.error('❌ [SettingsManager] Failed to migrate from Zustand:', error);
      return false;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const settingsManager = SettingsManager.getInstance();

// React Hook
export function useUnifiedSettings() {
  const [settings, setSettings] = React.useState<UnifiedSettings>(
    settingsManager.getSettings()
  );

  React.useEffect(() => {
    const unsubscribe = settingsManager.subscribe(setSettings);
    return unsubscribe;
  }, []);

  return {
    settings,
    updateSettings: (updates: Partial<UnifiedSettings>) =>
      settingsManager.updateSettings(updates),
    updateCategory: <K extends keyof UnifiedSettings>(
      category: K,
      updates: Partial<UnifiedSettings[K]>
    ) => settingsManager.updateCategory(category, updates),
    resetSettings: (category?: keyof UnifiedSettings) =>
      settingsManager.resetSettings(category),
  };
}

// For compatibility with existing code
export default settingsManager;