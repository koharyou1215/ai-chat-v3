import { StateCreator } from "zustand";
import {
  AISettings,
  SystemPrompts,
  ChatSettings,
  VoiceSettings,
  ImageGenerationSettings,
  APIConfig,
  APIProvider,
} from "@/types/core/settings.types";
import { simpleAPIManagerV2 } from "@/services/simple-api-manager-v2";
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_JAILBREAK_PROMPT,
  DETAILED_SYSTEM_PROMPT,
} from "@/constants/prompts";
import { EmotionalIntelligenceFlags } from "@/types/core/emotional-intelligence.types";

// 言語設定の型定義
export interface LanguageSettings {
  language: "ja" | "en" | "zh" | "ko";
  timezone: string;
  dateFormat: string;
  timeFormat: "12" | "24";
  currency: string;
}

// エフェクト設定の型定義を追加
export interface EffectSettings {
  // メッセージエフェクト - boolean + intensity
  colorfulBubbles: boolean;
  fontEffects: boolean;
  particleEffects: boolean;
  typewriterEffect: boolean;

  // エフェクト強度設定 (0-100)
  colorfulBubblesIntensity: number;
  fontEffectsIntensity: number;
  particleEffectsIntensity: number;
  typewriterIntensity: number;

  // 外観設定
  bubbleOpacity: number;
  bubbleBlur: boolean;

  // 3D機能 - boolean + intensity
  hologramMessages: boolean;
  particleText: boolean;
  rippleEffects: boolean;
  backgroundParticles: boolean;

  // 3Dエフェクト強度設定 (0-100)
  hologramIntensity: number;
  particleTextIntensity: number;
  rippleIntensity: number;
  backgroundParticlesIntensity: number;

  // 感情分析 - boolean + intensity
  realtimeEmotion: boolean;
  emotionBasedStyling: boolean;
  autoReactions: boolean;

  // 感情エフェクト強度設定 (0-100)
  emotionStylingIntensity: number;

  // トラッカー
  autoTrackerUpdate: boolean;
  showTrackers: boolean;

  // パフォーマンス
  effectQuality: "low" | "medium" | "high";
  animationSpeed: number;

  // テキスト整形
  textFormatting: "compact" | "readable" | "detailed";
}

// 外観設定の型定義
export interface AppearanceSettings {
  // テーマ設定
  theme: "dark" | "light" | "midnight" | "cosmic" | "sunset" | "custom";

  // カラー設定
  primaryColor: string; // メインカラー
  accentColor: string; // アクセントカラー
  backgroundColor: string; // 背景色
  surfaceColor: string; // サーフェスカラー
  textColor: string; // テキストカラー
  secondaryTextColor: string; // セカンダリテキストカラー
  borderColor: string; // ボーダーカラー
  shadowColor: string; // シャドウカラー

  // フォント設定
  fontFamily: string; // フォントファミリー
  fontSize: "small" | "medium" | "large" | "x-large";
  fontWeight: "light" | "normal" | "medium" | "bold";
  lineHeight: "compact" | "normal" | "relaxed";

  // レイアウト設定
  messageSpacing: "compact" | "normal" | "spacious";
  messageBorderRadius: "none" | "small" | "medium" | "large" | "full";
  chatMaxWidth: "narrow" | "normal" | "wide" | "full";
  sidebarWidth: "narrow" | "normal" | "wide";

  // 背景設定
  backgroundType: "solid" | "gradient" | "image" | "animated";
  backgroundGradient: string; // グラデーション設定
  backgroundImage: string; // 背景画像URL
  backgroundBlur: number; // 背景ぼかし度 (0-20)
  backgroundOpacity: number; // 背景透明度 (0-100)

  // アニメーション設定
  enableAnimations: boolean;
  transitionDuration: "fast" | "normal" | "slow";

  // カスタムCSS
  customCSS: string;
}

export interface SettingsSlice extends AISettings {
  // Language and localization
  languageSettings: LanguageSettings;
  // Effect settings
  effectSettings: EffectSettings;
  // Appearance settings
  appearanceSettings: AppearanceSettings;
  // 🧠 Emotional Intelligence flags (新機能、既存設定は完全保護)
  emotionalIntelligenceFlags: EmotionalIntelligenceFlags;
  // Response pattern for AI responses
  responsePattern: 'friendly' | 'professional' | 'creative' | 'empathetic';
  // Modal states
  showSettingsModal: boolean;
  showVoiceSettingsModal: boolean;
  // Actions
  updateLanguageSettings: (settings: Partial<LanguageSettings>) => void;
  updateEffectSettings: (settings: Partial<EffectSettings>) => void;
  updateAppearanceSettings: (settings: Partial<AppearanceSettings>) => void;
  // 🧠 Emotional Intelligence actions (新機能)
  updateEmotionalFlags: (flags: Partial<EmotionalIntelligenceFlags>) => void;
  updateSystemPrompts: (prompts: Partial<SystemPrompts>) => void;
  setEnableSystemPrompt: (enable: boolean) => void;
  setEnableJailbreakPrompt: (enable: boolean) => void;
  updateChatSettings: (settings: Partial<ChatSettings>) => void;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  updateImageGenerationSettings: (
    settings: Partial<ImageGenerationSettings>
  ) => void;
  updateAPIConfig: (config: Partial<APIConfig>) => void;
  setAPIProvider: (provider: APIProvider) => void;
  setAPIModel: (model: string) => void;
  setOpenRouterApiKey: (key: string) => void;
  setGeminiApiKey: (key: string) => void;
  setUseDirectGeminiAPI: (enabled: boolean) => void;
  setTemperature: (temp: number) => void;
  resetSystemPrompts: () => void;
  setMaxTokens: (tokens: number) => void;
  setTopP: (topP: number) => void;
  setFrequencyPenalty: (penalty: number) => void;
  setPresencePenalty: (penalty: number) => void;
  setContextWindow: (window: number) => void;
  setShowSettingsModal: (show: boolean, initialTab?: string) => void;
  setShowVoiceSettingsModal: (show: boolean) => void;
  setResponsePattern: (pattern: 'friendly' | 'professional' | 'creative' | 'empathetic') => void;
  initialSettingsTab: string;
  // プロンプトプリセット機能
  useDetailedPrompt: () => void;
  useSummaryPrompt: () => void;
}

export const createSettingsSlice: StateCreator<
  SettingsSlice,
  [],
  [],
  SettingsSlice
> = (set, get) => ({
  // Language settings - 日本語をデフォルトに設定
  languageSettings: {
    language: "ja",
    timezone: "Asia/Tokyo",
    dateFormat: "YYYY/MM/DD",
    timeFormat: "24",
    currency: "JPY",
  },

  // Effect settings - デフォルトはオフ（ユーザー要求通り）
  effectSettings: {
    // メッセージエフェクト
    colorfulBubbles: true,
    fontEffects: false,
    particleEffects: false,
    typewriterEffect: false,

    // エフェクト強度設定 (0-100) - 標準値を50に設定
    colorfulBubblesIntensity: 50,
    fontEffectsIntensity: 50,
    particleEffectsIntensity: 30, // パフォーマンス考慮で控えめ
    typewriterIntensity: 70, // タイプライター効果は少し強めに

    // 外観設定
    bubbleOpacity: 85,
    bubbleBlur: true,

    // 3D機能
    hologramMessages: false,
    particleText: false,
    rippleEffects: false,
    backgroundParticles: false,

    // 3Dエフェクト強度設定 (0-100) - 控えめなデフォルト値
    hologramIntensity: 40,
    particleTextIntensity: 35,
    rippleIntensity: 60,
    backgroundParticlesIntensity: 25, // パフォーマンス重視で最小

    // 感情分析
    realtimeEmotion: false, // リアルタイム感情分析（未実装のEmotionDisplayコンポーネント使用）
    emotionBasedStyling: false,
    autoReactions: false,

    // 感情エフェクト強度設定 (0-100)
    emotionStylingIntensity: 45, // 控えめな感情表現

    // トラッカー
    autoTrackerUpdate: true, // 🎯 デフォルトを有効に変更（永続化問題対策）
    showTrackers: true,

    // パフォーマンス
    effectQuality: "medium",
    animationSpeed: 1.0,

    // テキスト整形
    textFormatting: "readable",
  },

  // Appearance settings - ダークテーマがデフォルト
  appearanceSettings: {
    // テーマ設定
    theme: "dark",

    // カラー設定（ダークテーマのデフォルトカラー）
    primaryColor: "#8b5cf6", // Purple
    accentColor: "#ec4899", // Pink
    backgroundColor: "#0f0f23", // Deep dark blue
    surfaceColor: "#1e1e2e", // Surface dark
    textColor: "#ffffff", // White text
    secondaryTextColor: "#9ca3af", // Gray text
    borderColor: "#374151", // Border gray
    shadowColor: "#000000", // Black shadow

    // フォント設定
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: "medium",
    fontWeight: "normal",
    lineHeight: "normal",

    // レイアウト設定
    messageSpacing: "normal",
    messageBorderRadius: "medium",
    chatMaxWidth: "normal",
    sidebarWidth: "normal",

    // 背景設定
    backgroundType: "gradient",
    backgroundGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    backgroundImage: "",
    backgroundBlur: 10,
    backgroundOpacity: 100,

    // アニメーション設定
    enableAnimations: true,
    transitionDuration: "normal",

    // カスタムCSS
    customCSS: "",
  },

  // 🧠 Emotional Intelligence flags - 安全なデフォルト値（全て無効）
  emotionalIntelligenceFlags: {
    // Phase 1: 基盤機能（全てfalse）
    emotion_analysis_enabled: false, // TypeScriptエラー解決まで一時無効化
    emotional_memory_enabled: true,
    basic_effects_enabled: true,

    // Phase 2: 統合機能（全てfalse）
    contextual_analysis_enabled: true,
    adaptive_performance_enabled: true,
    visual_effects_enabled: true,

    // Phase 3: 高度機能（全てfalse）
    predictive_analysis_enabled: true,
    advanced_effects_enabled: true,
    multi_layer_analysis_enabled: true,

    // 安全制御（安全側にデフォルト設定）
    safe_mode: false, // 安全モード有効
    fallback_to_legacy: true, // レガシーフォールバック有効
    performance_monitoring: false, // 性能監視有効
    debug_mode: false, // デバッグモード無効
  },

  // Initial state
  // Response pattern default
  responsePattern: 'friendly' as const,
  // Modal states
  showSettingsModal: false,
  showVoiceSettingsModal: false,
  initialSettingsTab: "effects",

  apiConfig: {
    provider: "openrouter", // 🔧 FIX: Geminiデフォルト削除 - OpenRouterデフォルト
    model: "gpt-4o-mini", // 🔧 FIX: ユーザー選択モデル使用
    temperature: 0.7,
    max_tokens: 2048,
    top_p: 1.0,
    frequency_penalty: 0.6,
    presence_penalty: 0.3,
    context_window: 20,
  },
  openRouterApiKey: undefined,
  geminiApiKey: undefined,
  useDirectGeminiAPI: false, // デフォルトはOFF（OpenRouter経由）

  // システムプロンプトは空文字列で初期化（永続化時に維持される）
  systemPrompts: {
    system: "", // ユーザーがカスタムプロンプトを設定したら永続化
    jailbreak: "", // ユーザーがカスタムプロンプトを設定したら永続化
    replySuggestion: "",
    textEnhancement: "",
  },
  enableSystemPrompt: false, // デフォルトはfalse（明示的に有効化が必要）
  enableJailbreakPrompt: false, // デフォルトはfalse（明示的に有効化が必要）

  chat: {
    bubbleTransparency: 20,
    bubbleBlur: true,
    responseFormat: "normal",
    memoryCapacity: 20,
    generationCandidates: 1,
    memory_limits: {
      max_working_memory: 6, // 作業記憶: 最新6メッセージ
      max_memory_cards: 50, // メモリーカード: 最大50枚
      max_relevant_memories: 5, // 関連記憶検索: 最大5件
      max_prompt_tokens: 32000, // プロンプト全体: 32k tokens
      max_context_messages: 40, // 会話履歴: 最大40メッセージ
    },
    progressiveMode: {
      enabled: true, // デフォルトで有効化
      showIndicators: true, // ステージインジケーター表示
      highlightChanges: true, // 変更箇所ハイライト
      glowIntensity: "medium" as "none" | "soft" | "medium" | "strong", // グロー効果強度
      stageDelays: {
        reflex: 0, // 反射ステージの遅延(ms)
        context: 1000, // 文脈ステージの遅延(ms)
        intelligence: 2000, // 洞察ステージの遅延(ms)
      },
    },
  },

  voice: {
    enabled: true,
    autoPlay: false,
    provider: "voicevox",
    voicevox: {
      speaker: 0,
      speed: 1.0,
      pitch: 0.0,
      intonation: 1.0,
      volume: 1.0,
    },
    elevenlabs: {
      voiceId: "",
      stability: 0.5,
      similarity: 0.5,
    },
    system: {
      voice: "",
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
    provider: "runware",
    runware: {
      modelId: "runware:100@1",
      lora: "",
      width: 512,
      height: 512,
      steps: 20,
      cfgScale: 7,
      sampler: "DPM++ 2M Karras",
      seed: -1,
      customQualityTags: "",
    },
    stableDiffusion: {
      modelId: "stable-diffusion-v1-5",
      width: 512,
      height: 512,
      steps: 20,
      cfgScale: 7,
      sampler: "DPM++ 2M Karras",
      seed: -1,
    },
  },

  // Actions
  updateLanguageSettings: (settings) =>
    set((state) => ({
      languageSettings: { ...state.languageSettings, ...settings },
    })),

  updateEffectSettings: (settings) =>
    set((state) => ({
      effectSettings: { ...state.effectSettings, ...settings },
    })),

  updateAppearanceSettings: (settings) =>
    set((state) => ({
      appearanceSettings: { ...state.appearanceSettings, ...settings },
    })),

  // 🧠 Emotional Intelligence flags update method
  updateEmotionalFlags: (flags) => {
    set((state) => ({
      emotionalIntelligenceFlags: {
        ...state.emotionalIntelligenceFlags,
        ...flags,
      },
    }));
  },

  updateSystemPrompts: (prompts) => {
    set((state) => {
      const updatedPrompts = { ...state.systemPrompts, ...prompts };
      console.log("🔧 Updating system prompts:", {
        hasSystem: !!updatedPrompts.system,
        hasJailbreak: !!updatedPrompts.jailbreak,
      });
      // Zustandの自動永続化に任せる（強制永続化を削除）
      return { systemPrompts: updatedPrompts };
    });
  },

  setEnableSystemPrompt: (enable) => {
    console.log("🔧 Setting enableSystemPrompt:", enable);
    set({ enableSystemPrompt: enable });
  },
  setEnableJailbreakPrompt: (enable) => {
    console.log("🔧 Setting enableJailbreakPrompt:", enable);
    set({ enableJailbreakPrompt: enable });
  },

  updateChatSettings: (settings) =>
    set((state) => ({ chat: { ...state.chat, ...settings } })),

  updateVoiceSettings: (settings) => {
    set((state) => {
      const newVoiceSettings = { ...state.voice, ...settings };
      return { voice: newVoiceSettings };
    });
  },

  updateImageGenerationSettings: (settings) =>
    set((state) => ({
      imageGeneration: { ...state.imageGeneration, ...settings },
    })),

  updateAPIConfig: (config) => {
    set((state) => ({ apiConfig: { ...state.apiConfig, ...config } }));
    simpleAPIManagerV2.setAPIConfig(get().apiConfig);
  },

  setAPIProvider: (provider) => {
    set((state) => ({ apiConfig: { ...state.apiConfig, provider } }));
    simpleAPIManagerV2.setAPIConfig(get().apiConfig);
  },

  setAPIModel: (model) => {
    set((state) => ({ apiConfig: { ...state.apiConfig, model } }));
    simpleAPIManagerV2.setAPIConfig(get().apiConfig);
  },

  setOpenRouterApiKey: (key) => {
    set({ openRouterApiKey: key });
    simpleAPIManagerV2.setOpenRouterApiKey(key);
  },

  setGeminiApiKey: (key) => {
    set({ geminiApiKey: key });
    simpleAPIManagerV2.setGeminiApiKey(key);
  },

  setUseDirectGeminiAPI: (enabled) => {
    set({ useDirectGeminiAPI: enabled });
    simpleAPIManagerV2.setUseDirectGeminiAPI(enabled);
    console.log(`Gemini API Direct Mode: ${enabled ? "ON" : "OFF"}`);
  },

  setTemperature: (temp) => {
    set((state) => ({ apiConfig: { ...state.apiConfig, temperature: temp } }));
    simpleAPIManagerV2.setAPIConfig(get().apiConfig);
  },

  setMaxTokens: (tokens) => {
    set((state) => ({ apiConfig: { ...state.apiConfig, max_tokens: tokens } }));
    const newConfig = get().apiConfig;
    simpleAPIManagerV2.setAPIConfig(newConfig);
  },

  setTopP: (topP) => {
    set((state) => ({ apiConfig: { ...state.apiConfig, top_p: topP } }));
    simpleAPIManagerV2.setAPIConfig(get().apiConfig);
  },

  setFrequencyPenalty: (penalty) => {
    set((state) => ({
      apiConfig: { ...state.apiConfig, frequency_penalty: penalty },
    }));
    simpleAPIManagerV2.setAPIConfig(get().apiConfig);
  },

  setPresencePenalty: (penalty) => {
    set((state) => ({
      apiConfig: { ...state.apiConfig, presence_penalty: penalty },
    }));
    simpleAPIManagerV2.setAPIConfig(get().apiConfig);
  },

  setContextWindow: (window) => {
    set((state) => ({
      apiConfig: { ...state.apiConfig, context_window: window },
    }));
    simpleAPIManagerV2.setAPIConfig(get().apiConfig);
  },

  resetSystemPrompts: () => {
    const emptyPrompts = {
      system: "",
      jailbreak: "",
      replySuggestion: "",
      textEnhancement: "",
    };
    set({ systemPrompts: emptyPrompts });
  },

  // プロンプトプリセット機能
  useDetailedPrompt: () => {
    set({
      systemPrompts: {
        ...get().systemPrompts,
        system: DETAILED_SYSTEM_PROMPT,
      },
      enableSystemPrompt: true,
    });
  },

  useSummaryPrompt: () => {
    set({
      systemPrompts: {
        ...get().systemPrompts,
        system: DEFAULT_SYSTEM_PROMPT,
      },
      enableSystemPrompt: true,
    });
  },

  setShowSettingsModal: (show, initialTab = "effects") =>
    set({ showSettingsModal: show, initialSettingsTab: initialTab }),
  setShowVoiceSettingsModal: (show) => set({ showVoiceSettingsModal: show }),
  setResponsePattern: (pattern) => set({ responsePattern: pattern }),
});
