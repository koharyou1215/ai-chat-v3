// src/types/core/settings.types.ts

export type ChatResponseFormat = "normal" | "roleplay" | "formal";

export interface SystemPrompts {
  system: string;
  jailbreak: string;
  replySuggestion: string;
  textEnhancement: string;
}

export interface ChatSettings {
  bubbleTransparency: number;
  bubbleBlur: boolean;
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
