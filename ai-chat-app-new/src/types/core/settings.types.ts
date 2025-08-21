// src/types/core/settings.types.ts

export type ChatResponseFormat = 'normal' | 'roleplay' | 'formal';

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
    max_working_memory: number;          // 作業記憶のメッセージ数上限
    max_memory_cards: number;            // メモリーカード数上限  
    max_relevant_memories: number;       // 関連記憶検索数上限
    max_prompt_tokens: number;           // プロンプト全体のトークン上限
    max_context_messages: number;        // 会話履歴のメッセージ数上限
  };
}

export interface ImageGenerationSettings {
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
}

export interface VoiceSettings {
  provider: 'voicevox' | 'elevenlabs';
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
}

export type APIProvider = 'gemini' | 'openrouter';

export interface APIConfig {
  provider: APIProvider;
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  context_window: number;
}

export interface AISettings {
  // API Configuration
  apiConfig: APIConfig;
  openRouterApiKey?: string;
  
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