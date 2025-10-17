// src/types/core/settings.types.ts

export type ChatResponseFormat = "normal" | "roleplay" | "formal";

export interface SystemPrompts {
  system: string;
  jailbreak: string;
  replySuggestion: string;
  textEnhancement: string;
}

export interface ChatSettings {
  responseFormat: ChatResponseFormat;
  memoryCapacity: number;
  generationCandidates: number;
  memory_limits: {
    max_working_memory: number; // 作業記憶のメッセージ数上限
    max_memory_cards: number; // メモリーカード数上限
    max_relevant_memories: number; // 関連記憶検索数上限
    max_prompt_tokens: number; // プロンプト全体のトークン上限
    max_context_messages: number; // 会話履歴のメッセージ数上限
  };
  progressiveMode?: {
    enabled: boolean; // プログレッシブモードのON/OFF
    showIndicators?: boolean; // 🔧 FIX: オプショナルに変更
    highlightChanges?: boolean; // 🔧 FIX: オプショナルに変更
    glowIntensity?: "none" | "soft" | "medium" | "strong"; // 🔧 FIX: オプショナルに変更
    stageDelays?: {
      // 🔧 FIX: オプショナルに変更
      reflex: number; // 反射ステージの遅延(ms)
      context: number; // 文脈ステージの遅延(ms)
      intelligence: number; // 洞察ステージの遅延(ms)
    };
  };
}

export interface ImageGenerationSettings {
  provider: "runware" | "stable-diffusion";
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
}

export interface VoiceSettings {
  enabled: boolean;
  provider: "voicevox" | "elevenlabs" | "system";
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
}

export type APIProvider = "gemini" | "openrouter";

export interface ModelPricing {
  input: number; // 入力トークンあたりの価格（USD）
  output: number; // 出力トークンあたりの価格（USD）
  currency: "USD" | "JPY";
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: APIProvider;
  pricing: ModelPricing;
  contextWindow: number;
  description?: string;
}

export interface APIConfig {
  provider: APIProvider;
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  context_window: number;
  // 🔧 FIX: Gemini API追加設定
  geminiApiKey?: string;
  useDirectGeminiAPI?: boolean;
  // 🔧 FIX: OpenRouter API追加設定
  openRouterApiKey?: string;
  // 🔥 Prompt Caching: キャッシュ関連設定
  characterId?: string; // キャッシュキー生成用
  personaId?: string; // キャッシュキー生成用
  enableCache?: boolean; // キャッシュ有効化フラグ（デフォルトtrue）
}

export interface AISettings {
  // API Configuration
  apiConfig: APIConfig;
  openRouterApiKey?: string;
  geminiApiKey?: string;
  useDirectGeminiAPI?: boolean; // Gemini API直接使用のON/OFF

  // System Prompts
  systemPrompts: SystemPrompts;
  enableSystemPrompt: boolean;
  enableJailbreakPrompt: boolean;

  // Chat Settings
  chat: ChatSettings;

  // Voice Settings
  voice: VoiceSettings;

  // Image Generation Settings
  imageGeneration: ImageGenerationSettings;
}

// 🆕 ヘルパー型: デフォルト値付きProgressiveMode
export interface FullProgressiveMode {
  enabled: boolean;
  showIndicators: boolean;
  highlightChanges: boolean;
  glowIntensity: "none" | "soft" | "medium" | "strong";
  stageDelays: {
    reflex: number;
    context: number;
    intelligence: number;
  };
}

// 🆕 ヘルパー関数: ProgressiveModeのデフォルト値を取得
export const getProgressiveModeWithDefaults = (
  progressiveMode?: ChatSettings["progressiveMode"]
): FullProgressiveMode => ({
  enabled: progressiveMode?.enabled ?? true,
  showIndicators: progressiveMode?.showIndicators ?? true,
  highlightChanges: progressiveMode?.highlightChanges ?? true,
  glowIntensity: progressiveMode?.glowIntensity ?? "medium",
  stageDelays: progressiveMode?.stageDelays ?? {
    reflex: 0,
    context: 1000,
    intelligence: 2000,
  },
});

// Effect Settings for Settings Modal
export interface EffectSettings {
  colorfulBubbles: boolean;
  fontEffects: boolean;
  particleEffects: boolean;
  typewriterEffect: boolean;
  colorfulBubblesIntensity: number;
  fontEffectsIntensity: number;
  particleEffectsIntensity: number;
  typewriterIntensity: number;
  bubbleOpacity: number;
  bubbleBlur: boolean;

  // 🎯 Phase 2.1: New nested 3D structure
  threeDEffects?: {
    enabled: boolean;
    hologram: { enabled: boolean; intensity: number };
    particleText: { enabled: boolean; intensity: number };
    ripple: { enabled: boolean; intensity: number };
    backgroundParticles: { enabled: boolean; intensity: number };
    depth: { enabled: boolean };
    quality: 'low' | 'medium' | 'high';
  };

  // 🔄 Phase 2.1: Deprecated flat 3D fields (for backward compatibility)
  hologramMessages?: boolean;
  particleText?: boolean;
  rippleEffects?: boolean;
  backgroundParticles?: boolean;
  hologramIntensity?: number;
  particleTextIntensity?: number;
  rippleIntensity?: number;
  backgroundParticlesIntensity?: number;

  progressiveResponse?: boolean;
  progressiveResponseSpeed?: number;
  shadowEffects?: boolean;
  shadowEffectsIntensity?: number;
  glowEffects?: boolean;
  glowEffectsIntensity?: number;
  neonText?: boolean;
  neonTextIntensity?: number;
  enableEmotionDisplay?: boolean;
  enableEmotionParticles?: boolean;
  emotionDisplayIntensity?: number;
  emotionParticlesIntensity?: number;
  backgroundDim?: boolean;
  backgroundDimIntensity?: number;
  backgroundImage?: string | null;
  backgroundImageOpacity?: number;
  backgroundImageBlur?: number;

  // 🔧 Emotion system settings (used in EmotionPanel)
  // Note: These are simplified for backward compatibility
  // Full EmotionSettings type is in settings-manager/types/domains/effects.types.ts
  emotion: {
    displayMode: 'none' | 'minimal' | 'standard' | 'rich';
    display: {
      showIcon: boolean;
      showText: boolean;
      applyColors: boolean;
    };
    realtimeDetection: boolean;
    autoReactions: boolean;
    intensity: number;
  };

  // 🔧 Performance settings (used in PerformancePanel)
  effectQuality: 'low' | 'medium' | 'high';
  animationSpeed: number;

  // 🔧 Tracker settings (used in TrackerPanel)
  autoTrackerUpdate: boolean;
  showTrackers: boolean;
}

// 🔧 Type-safe dynamic effect properties
export type EffectSettingKey = keyof EffectSettings;
export type EffectSettingValue = EffectSettings[EffectSettingKey];

// 🔧 Appearance Settings Interface
export interface AppearanceSettings {
  theme: "dark" | "light" | string;
  // Colors
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  secondaryTextColor: string;
  borderColor: string;
  shadowColor: string;
  // Typography
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  // Layout
  messageSpacing: number;
  messageBorderRadius: number;
  chatMaxWidth: number;
  sidebarWidth: number;
  // Background
  backgroundType: "gradient" | "image" | "color";
  backgroundGradient: string;
  backgroundImage: string;
  backgroundBlur: number;
  backgroundBlurEnabled: boolean;
  backgroundOpacity: number;
  // Favicon
  faviconPath: string;
  faviconSvg: string;
  appleTouchIcon: string;
  // Effects
  enableAnimations: boolean;
  transitionDuration: "fast" | "normal" | "slow" | string;
  // Custom CSS
  customCSS: string;
}
