import { StateCreator } from 'zustand';
import { AISettings, SystemPrompts, ChatSettings, VoiceSettings, ImageGenerationSettings, APIConfig, APIProvider } from '@/types/core/settings.types';
import { apiManager } from '@/services/api-manager';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_JAILBREAK_PROMPT } from '@/constants/prompts';

// 言語設定の型定義
export interface LanguageSettings {
  language: 'ja' | 'en' | 'zh' | 'ko';
  timezone: string;
  dateFormat: string;
  timeFormat: '12' | '24';
  currency: string;
}

// エフェクト設定の型定義を追加
export interface EffectSettings {
  // メッセージエフェクト
  colorfulBubbles: boolean;
  fontEffects: boolean;
  particleEffects: boolean;
  typewriterEffect: boolean;
  
  // 外観設定
  bubbleOpacity: number;
  bubbleBlur: boolean;
  
  // 3D機能
  hologramMessages: boolean;
  particleText: boolean;
  rippleEffects: boolean;
  backgroundParticles: boolean;
  
  // 感情分析
  realtimeEmotion: boolean;
  emotionBasedStyling: boolean;
  autoReactions: boolean;
  
  // トラッカー
  autoTrackerUpdate: boolean;
  showTrackers: boolean;
  
  // パフォーマンス
  effectQuality: 'low' | 'medium' | 'high';
  animationSpeed: number;
  
  // テキスト整形
  textFormatting: 'compact' | 'readable' | 'detailed';
}

export interface SettingsSlice extends AISettings {
  // Language and localization
  languageSettings: LanguageSettings;
  // Effect settings
  effectSettings: EffectSettings;
  // Modal states
  showSettingsModal: boolean;
  showVoiceSettingsModal: boolean;
  // Actions
  updateLanguageSettings: (settings: Partial<LanguageSettings>) => void;
  updateEffectSettings: (settings: Partial<EffectSettings>) => void;
  updateSystemPrompts: (prompts: Partial<SystemPrompts>) => void;
  setEnableSystemPrompt: (enable: boolean) => void;
  setEnableJailbreakPrompt: (enable: boolean) => void;
  updateChatSettings: (settings: Partial<ChatSettings>) => void;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  updateImageGenerationSettings: (settings: Partial<ImageGenerationSettings>) => void;
  updateAPIConfig: (config: Partial<APIConfig>) => void;
  setAPIProvider: (provider: APIProvider) => void;
  setAPIModel: (model: string) => void;
  setOpenRouterApiKey: (key: string) => void;
  setTemperature: (temp: number) => void;
  resetSystemPrompts: () => void;
  setMaxTokens: (tokens: number) => void;
  setTopP: (topP: number) => void;
  setFrequencyPenalty: (penalty: number) => void;
  setPresencePenalty: (penalty: number) => void;
  setContextWindow: (window: number) => void;
  setShowSettingsModal: (show: boolean, initialTab?: string) => void;
  setShowVoiceSettingsModal: (show: boolean) => void;
  initialSettingsTab: string;
}

export const createSettingsSlice: StateCreator<
  SettingsSlice,
  [],
  [],
  SettingsSlice
> = (set, get) => ({
  // Language settings - 日本語をデフォルトに設定
  languageSettings: {
    language: 'ja',
    timezone: 'Asia/Tokyo',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: '24',
    currency: 'JPY',
  },

  // Effect settings - デフォルトはオフ（ユーザー要求通り）
  effectSettings: {
    // メッセージエフェクト
    colorfulBubbles: false,
    fontEffects: false,
    particleEffects: false,
    typewriterEffect: false,
    
    // 外観設定
    bubbleOpacity: 85,
    bubbleBlur: true,
    
    // 3D機能
    hologramMessages: false,
    particleText: false,
    rippleEffects: false,
    backgroundParticles: false,
    
    // 感情分析
    realtimeEmotion: false,
    emotionBasedStyling: false,
    autoReactions: false,
    
    // トラッカー
    autoTrackerUpdate: false,
    showTrackers: true,
    
    // パフォーマンス
    effectQuality: 'medium',
    animationSpeed: 1.0,
    
    // テキスト整形
    textFormatting: 'readable'
  },
  
  // Initial state
  // Modal states
  showSettingsModal: false,
  showVoiceSettingsModal: false,
  initialSettingsTab: 'effects',
  
  apiConfig: {
    provider: 'gemini',
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
    max_tokens: 2048,
    top_p: 1.0,
    frequency_penalty: 0,
    presence_penalty: 0,
    context_window: 20,
  },
  openRouterApiKey: undefined,

  systemPrompts: {
    system: '',
    jailbreak: '',
    replySuggestion: '',
    textEnhancement: ''
  },
  enableSystemPrompt: true,
  enableJailbreakPrompt: false,

  chat: {
    bubbleTransparency: 20,
    bubbleBlur: true,
    responseFormat: 'normal',
    memoryCapacity: 20,
    generationCandidates: 1,
    memory_limits: {
      max_working_memory: 6,        // 作業記憶: 最新6メッセージ
      max_memory_cards: 50,         // メモリーカード: 最大50枚
      max_relevant_memories: 5,     // 関連記憶検索: 最大5件
      max_prompt_tokens: 32000,     // プロンプト全体: 32k tokens
      max_context_messages: 20,     // 会話履歴: 最大20メッセージ
    },
  },

  voice: {
    enabled: true,
    autoPlay: false,
    provider: 'voicevox',
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
    }
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
      customQualityTags: ''
    },
    stableDiffusion: {
      modelId: 'stable-diffusion-v1-5',
      width: 512,
      height: 512,
      steps: 20,
      cfgScale: 7,
      sampler: 'DPM++ 2M Karras',
      seed: -1
    }
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
  
  updateSystemPrompts: (prompts) => {
    set((state) => {
      const updatedPrompts = { ...state.systemPrompts, ...prompts };
      console.log('🔄 Updating system prompts:', updatedPrompts);
      // Zustandの自動永続化に任せる（強制永続化を削除）
      console.log('✅ System prompts updated, auto-persistence will handle storage');
      return { systemPrompts: updatedPrompts };
    });
  },
  
  setEnableSystemPrompt: (enable) => set({ enableSystemPrompt: enable }),
  setEnableJailbreakPrompt: (enable) => set({ enableJailbreakPrompt: enable }),
  
  updateChatSettings: (settings) =>
    set((state) => ({ chat: { ...state.chat, ...settings } })),
  
  updateVoiceSettings: (settings) => {
    console.log('🔊 Updating voice settings:', settings);
    set((state) => {
      const newVoiceSettings = { ...state.voice, ...settings };
      console.log('✅ New voice settings:', newVoiceSettings);
      return { voice: newVoiceSettings };
    });
  },
  
  updateImageGenerationSettings: (settings) =>
    set((state) => ({
      imageGeneration: { ...state.imageGeneration, ...settings },
    })),
  
  updateAPIConfig: (config) => {
    set((state) => ({ apiConfig: { ...state.apiConfig, ...config } }));
    apiManager.setConfig(get().apiConfig);
  },
  
  setAPIProvider: (provider) => {
    set((state) => ({ apiConfig: { ...state.apiConfig, provider } }));
    apiManager.setConfig(get().apiConfig);
  },
  
  setAPIModel: (model) => {
    set((state) => ({ apiConfig: { ...state.apiConfig, model } }));
    apiManager.setConfig(get().apiConfig);
  },
  
  setOpenRouterApiKey: (key) => {
    set({ openRouterApiKey: key });
    apiManager.setOpenRouterApiKey(key);
  },
  
  setTemperature: (temp) => {
    set((state) => ({ apiConfig: { ...state.apiConfig, temperature: temp } }));
    apiManager.setConfig(get().apiConfig);
  },
  
  setMaxTokens: (tokens) => {
    console.log(`🔧 Setting max_tokens to: ${tokens}`);
    set((state) => ({ apiConfig: { ...state.apiConfig, max_tokens: tokens } }));
    const newConfig = get().apiConfig;
    console.log(`✅ Updated API config:`, newConfig);
    apiManager.setConfig(newConfig);
  },
  
  setTopP: (topP) => {
    set((state) => ({ apiConfig: { ...state.apiConfig, top_p: topP } }));
    apiManager.setConfig(get().apiConfig);
  },
  
  setFrequencyPenalty: (penalty) => {
    set((state) => ({
      apiConfig: { ...state.apiConfig, frequency_penalty: penalty },
    }));
    apiManager.setConfig(get().apiConfig);
  },
  
  setPresencePenalty: (penalty) => {
    set((state) => ({
      apiConfig: { ...state.apiConfig, presence_penalty: penalty },
    }));
    apiManager.setConfig(get().apiConfig);
  },
  
  setContextWindow: (window) => {
    set((state) => ({
      apiConfig: { ...state.apiConfig, context_window: window },
    }));
    apiManager.setConfig(get().apiConfig);
  },

  resetSystemPrompts: () => {
    console.log('🧹 Resetting system prompts to empty state');
    const emptyPrompts = {
      system: '',
      jailbreak: '',
      replySuggestion: '',
      textEnhancement: ''
    };
    set({ systemPrompts: emptyPrompts });
    console.log('✅ System prompts reset to empty state');
  },
  
  setShowSettingsModal: (show, initialTab = 'effects') =>
    set({ showSettingsModal: show, initialSettingsTab: initialTab }),
  setShowVoiceSettingsModal: (show) => set({ showVoiceSettingsModal: show }),
});