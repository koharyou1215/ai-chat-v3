/**
 * Settings Slice V2 - Unified Settings Integration
 * Zustandストアと統一設定管理の橋渡し役
 */

import { StateCreator } from "zustand";
import { settingsManager, UnifiedSettings } from "@/services/settings-manager";
import { simpleAPIManagerV2 } from "@/services/simple-api-manager-v2";
import {
  AISettings,
  SystemPrompts,
  ChatSettings,
  VoiceSettings,
  ImageGenerationSettings,
  APIConfig,
  APIProvider,
} from "@/types/core/settings.types";
import { EmotionalIntelligenceFlags } from "@/types/core/emotional-intelligence.types";

// Zustand用の設定スライス型
export interface SettingsSliceV2 extends AISettings {
  // Modal states
  showSettingsModal: boolean;
  showVoiceSettingsModal: boolean;
  initialSettingsTab: string;

  // 統一設定（読み取り専用）
  unifiedSettings: UnifiedSettings;

  // 互換性のための既存設定（統一設定から導出）
  languageSettings: {
    language: "ja" | "en" | "zh" | "ko";
    timezone: string;
    dateFormat: string;
    timeFormat: "12" | "24";
    currency: string;
  };
  effectSettings: UnifiedSettings['effects'];
  appearanceSettings: any; // 既存の外観設定型を維持
  emotionalIntelligenceFlags: EmotionalIntelligenceFlags;

  // Actions - 統一設定マネージャーへの委譲
  updateUnifiedSettings: (updates: Partial<UnifiedSettings>) => void;
  updateLanguageSettings: (settings: any) => void;
  updateEffectSettings: (settings: Partial<UnifiedSettings['effects']>) => void;
  updateAppearanceSettings: (settings: any) => void;
  updateEmotionalFlags: (flags: Partial<EmotionalIntelligenceFlags>) => void;
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

  // 内部用：統一設定同期
  syncFromUnifiedSettings: () => void;
}

export const createSettingsSliceV2: StateCreator<SettingsSliceV2, [], [], SettingsSliceV2> = (set, get) => {
  // 統一設定から初期値を取得
  const initialSettings = settingsManager.getSettings();

  // 統一設定の変更を監視
  settingsManager.subscribe((newSettings) => {
    set({ unifiedSettings: newSettings });
    get().syncFromUnifiedSettings();
  });

  return {
    // Modal states
    showSettingsModal: false,
    showVoiceSettingsModal: false,
    initialSettingsTab: "effects",

    // 統一設定
    unifiedSettings: initialSettings,

    // 互換性のための既存設定（統一設定から導出）
    languageSettings: {
      language: initialSettings.ui.language,
      timezone: "Asia/Tokyo",
      dateFormat: "YYYY/MM/DD",
      timeFormat: initialSettings.ui.language === 'ja' ? "24" : "12",
      currency: initialSettings.ui.language === 'ja' ? "JPY" : "USD",
    },

    effectSettings: initialSettings.effects,

    appearanceSettings: {
      theme: initialSettings.ui.theme === 'auto' ? 'dark' : initialSettings.ui.theme,
      primaryColor: "#8b5cf6",
      accentColor: "#ec4899",
      backgroundColor: "#0f0f23",
      surfaceColor: "#1e1e2e",
      textColor: "#ffffff",
      secondaryTextColor: "#9ca3af",
      borderColor: "#374151",
      shadowColor: "#000000",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: initialSettings.ui.fontSize,
      fontWeight: "normal",
      lineHeight: "normal",
      messageSpacing: "normal",
      messageBorderRadius: "medium",
      chatMaxWidth: "normal",
      sidebarWidth: "normal",
      backgroundType: initialSettings.ui.background?.type || "gradient",
      backgroundGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      backgroundImage: initialSettings.ui.background?.type === 'image' ? initialSettings.ui.background.value : "",
      backgroundBlur: 10,
      backgroundOpacity: 100,
      enableAnimations: true,
      transitionDuration: "normal",
      customCSS: "",
    },

    emotionalIntelligenceFlags: {
      emotion_analysis_enabled: false,
      emotional_memory_enabled: true,
      basic_effects_enabled: true,
      contextual_analysis_enabled: true,
      adaptive_performance_enabled: true,
      visual_effects_enabled: true,
      predictive_analysis_enabled: true,
      advanced_effects_enabled: true,
      multi_layer_analysis_enabled: true,
      safe_mode: false,
      fallback_to_legacy: true,
      performance_monitoring: false,
      debug_mode: false,
    },

    // AI Settings (既存の型を維持)
    apiConfig: {
      provider: (initialSettings.api.provider === "openai" || initialSettings.api.provider === "anthropic" || initialSettings.api.provider === "google" || initialSettings.api.provider === "groq" ? "openrouter" : initialSettings.api.provider) as APIProvider,
      model: initialSettings.api.model || "gpt-4o-mini",
      temperature: initialSettings.api.temperature || 0.7,
      max_tokens: initialSettings.api.maxTokens || 2048,
      top_p: 1.0,
      frequency_penalty: 0.6,
      presence_penalty: 0.3,
      context_window: 20,
    },
    openRouterApiKey: initialSettings.api.openrouterApiKey,
    geminiApiKey: initialSettings.api.geminiApiKey,
    useDirectGeminiAPI: false,

    systemPrompts: {
      system: "",
      jailbreak: "",
      replySuggestion: "",
      textEnhancement: "",
    },
    enableSystemPrompt: false,
    enableJailbreakPrompt: false,

    chat: {
      bubbleTransparency: 20,
      bubbleBlur: true,
      responseFormat: "normal",
      memoryCapacity: 20,
      generationCandidates: 1,
      memory_limits: {
        max_working_memory: 6,
        max_memory_cards: 50,
        max_relevant_memories: 5,
        max_prompt_tokens: 32000,
        max_context_messages: 40,
      },
      progressiveMode: {
        enabled: true,
        showIndicators: true,
        highlightChanges: true,
        glowIntensity: "medium" as "none" | "soft" | "medium" | "strong",
        stageDelays: {
          reflex: 0,
          context: 1000,
          intelligence: 2000,
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
    updateUnifiedSettings: (updates) => {
      settingsManager.updateSettings(updates);
    },

    updateLanguageSettings: (settings) => {
      // 言語設定を統一設定に変換
      if (settings.language) {
        settingsManager.updateCategory('ui', { language: settings.language });
      }
      set((state) => ({
        languageSettings: { ...state.languageSettings, ...settings },
      }));
    },

    updateEffectSettings: (settings) => {
      settingsManager.updateCategory('effects', settings);
      set((state) => ({
        effectSettings: { ...state.effectSettings, ...settings },
      }));
    },

    updateAppearanceSettings: (settings) => {
      // 外観設定の一部を統一設定に反映
      if (settings.fontSize) {
        settingsManager.updateCategory('ui', { fontSize: settings.fontSize });
      }
      if (settings.theme) {
        settingsManager.updateCategory('ui', {
          theme: settings.theme === 'dark' || settings.theme === 'light' ? settings.theme : 'auto'
        });
      }
      set((state) => ({
        appearanceSettings: { ...state.appearanceSettings, ...settings },
      }));
    },

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

    updateChatSettings: (settings) => {
      // チャット設定を統一設定に反映
      const chatUpdates: any = {};
      if ('enterToSend' in settings) chatUpdates.enterToSend = settings.enterToSend;
      if ('autoScroll' in settings) chatUpdates.autoScroll = settings.autoScroll;

      if (Object.keys(chatUpdates).length > 0) {
        settingsManager.updateCategory('chat', chatUpdates);
      }

      set((state) => ({ chat: { ...state.chat, ...settings } }));
    },

    updateVoiceSettings: (settings) => {
      set((state) => {
        const newVoiceSettings = { ...state.voice, ...settings };
        return { voice: newVoiceSettings };
      });
    },

    updateImageGenerationSettings: (settings) => {
      set((state) => ({
        imageGeneration: { ...state.imageGeneration, ...settings },
      }));
    },

    updateAPIConfig: (config) => {
      // API設定を統一設定に反映
      const apiUpdates: any = {};
      if (config.provider) apiUpdates.provider = config.provider;
      if (config.model) apiUpdates.model = config.model;
      if (config.temperature !== undefined) apiUpdates.temperature = config.temperature;
      if (config.max_tokens !== undefined) apiUpdates.maxTokens = config.max_tokens;

      if (Object.keys(apiUpdates).length > 0) {
        settingsManager.updateCategory('api', apiUpdates);
      }

      set((state) => ({ apiConfig: { ...state.apiConfig, ...config } }));
      simpleAPIManagerV2.setAPIConfig(get().apiConfig);
    },

    setAPIProvider: (provider) => {
      settingsManager.updateCategory('api', { provider });
      set((state) => ({ apiConfig: { ...state.apiConfig, provider } }));
      simpleAPIManagerV2.setAPIConfig(get().apiConfig);
    },

    setAPIModel: (model) => {
      settingsManager.updateCategory('api', { model });
      set((state) => ({ apiConfig: { ...state.apiConfig, model } }));
      simpleAPIManagerV2.setAPIConfig(get().apiConfig);
    },

    setOpenRouterApiKey: (key) => {
      settingsManager.updateCategory('api', { openrouterApiKey: key });
      set({ openRouterApiKey: key });
      simpleAPIManagerV2.setOpenRouterApiKey(key);
    },

    setGeminiApiKey: (key) => {
      settingsManager.updateCategory('api', { geminiApiKey: key });
      set({ geminiApiKey: key });
      simpleAPIManagerV2.setGeminiApiKey(key);
    },

    setUseDirectGeminiAPI: (enabled) => {
      set({ useDirectGeminiAPI: enabled });
      simpleAPIManagerV2.setUseDirectGeminiAPI(enabled);
      console.log(`Gemini API Direct Mode: ${enabled ? "ON" : "OFF"}`);
    },

    setTemperature: (temp) => {
      settingsManager.updateCategory('api', { temperature: temp });
      set((state) => ({ apiConfig: { ...state.apiConfig, temperature: temp } }));
      simpleAPIManagerV2.setAPIConfig(get().apiConfig);
    },

    setMaxTokens: (tokens) => {
      settingsManager.updateCategory('api', { maxTokens: tokens });
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

    setShowSettingsModal: (show, initialTab = "effects") => {
      set({ showSettingsModal: show, initialSettingsTab: initialTab });
    },

    setShowVoiceSettingsModal: (show) => {
      set({ showVoiceSettingsModal: show });
    },

    // 内部用：統一設定から同期
    syncFromUnifiedSettings: () => {
      const unified = get().unifiedSettings;

      set({
        effectSettings: unified.effects,
        languageSettings: {
          language: unified.ui.language,
          timezone: "Asia/Tokyo",
          dateFormat: "YYYY/MM/DD",
          timeFormat: unified.ui.language === 'ja' ? "24" : "12",
          currency: unified.ui.language === 'ja' ? "JPY" : "USD",
        },
        apiConfig: {
          ...get().apiConfig,
          provider: (unified.api.provider === "openai" || unified.api.provider === "anthropic" || unified.api.provider === "google" || unified.api.provider === "groq" ? "openrouter" : unified.api.provider) as APIProvider,
          model: unified.api.model || get().apiConfig.model,
          temperature: unified.api.temperature || get().apiConfig.temperature,
          max_tokens: unified.api.maxTokens || get().apiConfig.max_tokens,
        },
        openRouterApiKey: unified.api.openrouterApiKey,
        geminiApiKey: unified.api.geminiApiKey,
      });
    },
  };
};