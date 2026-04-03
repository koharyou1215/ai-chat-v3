/**
 * Settings Slice V2 - Unified Settings Integration
 * Zustandストアと統一設定管理の橋渡し役
 */

import { StateCreator } from "zustand";
import { settingsManager, UnifiedSettings, DEFAULT_SETTINGS } from "@/services/settings-manager";
import { simpleAPIManagerV2 } from "@/services/simple-api-manager-v2";
import {
  AISettings,
  SystemPrompts,
  ChatSettings,
  VoiceSettings,
  ImageGenerationSettings,
  APIConfig,
  APIProvider,
  ChatSystemPromptMode,
} from "@/types/core/settings.types";
import { EmotionalIntelligenceFlags } from "@/types/core/emotional-intelligence.types";

// Zustand用の設定スライス型
export interface SettingsSliceV2 extends AISettings {
  // Modal states
  showSettingsModal: boolean;
  showVoiceSettingsModal: boolean;

  // Anchor Prompt Depth
  anchorDepth: number;
  initialSettingsTab: string;

  // 統一設定（読み取り専用）
  unifiedSettings: UnifiedSettings;

  // 🧠 感情知能システムフラグ（読み取り専用、統一設定から計算）
  emotionalIntelligenceFlags: EmotionalIntelligenceFlags;

  // 互換性のための既存設定（統一設定から導出）
  languageSettings: {
    language: "ja" | "en" | "zh" | "ko";
    timezone: string;
    dateFormat: string;
    timeFormat: "12" | "24";
    currency: string;
  };
  effectSettings: UnifiedSettings["effects"];
  appearanceSettings: Partial<UnifiedSettings["ui"]>; // UI設定を使用

  // Actions - 統一設定マネージャーへの委譲
  updateUnifiedSettings: (updates: Partial<UnifiedSettings>) => void;
  updateCategory: <K extends keyof UnifiedSettings>(
    category: K,
    updates: Partial<UnifiedSettings[K]>
  ) => void;
  updateLanguageSettings: (settings: Partial<UnifiedSettings["ui"]>) => void;
  updateEffectSettings: (settings: Partial<UnifiedSettings["effects"]>) => void;
  updateAppearanceSettings: (settings: Partial<UnifiedSettings["ui"]>) => void;
  updateSystemPrompts: (prompts: Partial<SystemPrompts>) => void;
  setEnableSystemPrompt: (enable: boolean) => void;
  setChatSystemPromptMode: (mode: ChatSystemPromptMode) => void;
  setEnableAnchorPrompt: (enable: boolean) => void;
  setEnableJailbreakPrompt: (enable: boolean) => void;
  setAnchorDepth: (depth: number) => void;
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
  setGoogleCloudApiKey: (key: string) => void;
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
  // 💡 インスピレーション機能専用モデル設定
  setInspirationUseFixedModel: (enabled: boolean) => void;
  setInspirationFixedModel: (model: string, provider?: APIProvider) => void;
  setInspirationFixedUseDirectGeminiAPI: (enabled: boolean) => void;

  // 内部用：統一設定同期
  syncFromUnifiedSettings: () => void;
}

export const createSettingsSliceV2: StateCreator<
  SettingsSliceV2,
  [],
  [],
  SettingsSliceV2
> = (set, get) => {
  // 統一設定から初期値を取得
  const initialSettings = settingsManager.getSettings();

  // 同期ガード: 無限ループを防ぐ
  let isSyncing = false;

  // 統一設定の変更を監視
  settingsManager.subscribe((newSettings) => {
    if (isSyncing) {
      console.log("🔒 [settingsManager.subscribe] Sync in progress, skipping...");
      return;
    }

    console.log("📢 [settingsManager.subscribe] Settings changed, syncing to Zustand store");
    isSyncing = true;

    try {
      // unifiedSettingsの更新とsyncFromUnifiedSettingsを1回のset()にまとめる
      set({ unifiedSettings: newSettings });
      get().syncFromUnifiedSettings();
    } finally {
      // 同期完了後、次のフレームで解除
      setTimeout(() => {
        isSyncing = false;
      }, 0);
    }
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
      timezone: initialSettings.ui.timezone || "Asia/Tokyo",
      dateFormat: initialSettings.ui.dateFormat || "YYYY/MM/DD",
      timeFormat:
        initialSettings.ui.timeFormat ||
        (initialSettings.ui.language === "ja" ? "24" : "12"),
      currency:
        initialSettings.ui.currency ||
        (initialSettings.ui.language === "ja" ? "JPY" : "USD"),
    },

    effectSettings: initialSettings.effects,

    // 🧠 感情知能システムフラグ（統一設定から計算）
    emotionalIntelligenceFlags: {
      emotion_analysis_enabled: (initialSettings.emotionalIntelligence.enabled ?? false) && (initialSettings.emotionalIntelligence.analysis.basic ?? false),
      emotional_memory_enabled: initialSettings.emotionalIntelligence.memoryEnabled ?? true,
      basic_effects_enabled: initialSettings.effects.emotion.displayMode !== 'none',
      contextual_analysis_enabled: initialSettings.emotionalIntelligence.analysis.contextual ?? false,
      adaptive_performance_enabled: initialSettings.emotionalIntelligence.adaptivePerformance ?? false,
      visual_effects_enabled: initialSettings.effects.emotion.displayMode === 'rich' || initialSettings.effects.emotion.displayMode === 'standard',
      predictive_analysis_enabled: initialSettings.emotionalIntelligence.analysis.predictive ?? false,
      advanced_effects_enabled: initialSettings.effects.emotion.displayMode === 'rich',
      multi_layer_analysis_enabled: initialSettings.emotionalIntelligence.analysis.multiLayer ?? false,
      safe_mode: initialSettings.emotionalIntelligence.safeMode ?? false,
      fallback_to_legacy: initialSettings.emotionalIntelligence.fallbackToLegacy ?? false,
      performance_monitoring: initialSettings.emotionalIntelligence.performanceMonitoring ?? false,
      debug_mode: initialSettings.emotionalIntelligence.debugMode ?? false,
    },

    // 🔧 FIX: すべての外観設定を統一設定から読み込む
    appearanceSettings: {
      theme:
        initialSettings.ui.theme === "auto" ? "dark" : initialSettings.ui.theme,
      // Colors
      primaryColor: initialSettings.ui.primaryColor,
      accentColor: initialSettings.ui.accentColor,
      backgroundColor: initialSettings.ui.backgroundColor,
      surfaceColor: initialSettings.ui.surfaceColor,
      textColor: initialSettings.ui.textColor,
      secondaryTextColor: initialSettings.ui.secondaryTextColor,
      borderColor: initialSettings.ui.borderColor,
      shadowColor: initialSettings.ui.shadowColor,
      // Typography
      fontFamily: initialSettings.ui.fontFamily,
      fontSize: initialSettings.ui.fontSize,
      fontWeight: initialSettings.ui.fontWeight,
      lineHeight: initialSettings.ui.lineHeight,
      // Layout
      messageSpacing: initialSettings.ui.messageSpacing,
      messageBorderRadius: initialSettings.ui.messageBorderRadius,
      chatMaxWidth: initialSettings.ui.chatMaxWidth,
      sidebarWidth: initialSettings.ui.sidebarWidth,
      // 🆕 Phase 3: 階層構造からフラット構造への変換
      backgroundType: initialSettings.ui.background?.type || "gradient",
      backgroundImage: initialSettings.ui.background?.image?.url || "",
      backgroundBlur: initialSettings.ui.background?.image?.blur || 10,
      backgroundBlurEnabled: initialSettings.ui.background?.image?.blurEnabled ?? false,
      backgroundOpacity: initialSettings.ui.background?.image?.opacity || 100,
      backgroundGradient: initialSettings.ui.background?.gradient?.value || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      background: initialSettings.ui.background,
      // Favicon
      faviconPath: initialSettings.ui.faviconPath || "/favicon.ico",
      faviconSvg: initialSettings.ui.faviconSvg || "/favicon.svg",
      appleTouchIcon: initialSettings.ui.appleTouchIcon || "/apple-touch-icon.png",
      // Effects
      enableAnimations: initialSettings.ui.enableAnimations ?? true,
      transitionDuration: initialSettings.ui.transitionDuration || "normal",
      // Custom CSS
      customCSS: initialSettings.ui.customCSS || "",
    },

    // AI Settings (既存の型を維持)
    apiConfig: {
      // 🔧 CRITICAL FIX: "gemini"と"google"を許可（OpenRouterに強制変換しない）
      provider: (initialSettings.api.provider === "openai" ||
        initialSettings.api.provider === "anthropic" ||
        initialSettings.api.provider === "groq"
        ? "openrouter"
        : initialSettings.api.provider === "google"
          ? "gemini"  // 🔧 "google"を"gemini"に正規化（OpenRouterではなく）
          : initialSettings.api.provider) as APIProvider,
      model: initialSettings.api.model || DEFAULT_SETTINGS.api.model!,
      temperature: initialSettings.api.temperature || 0.7,
      max_tokens: initialSettings.api.maxTokens || 2048,
      top_p: 1.0,
      frequency_penalty: 0.6,
      presence_penalty: 0.3,
      context_window: 20,
      inspiration: initialSettings.api.inspiration,
    },
    openRouterApiKey: initialSettings.api.openrouterApiKey,
    geminiApiKey: initialSettings.api.geminiApiKey,
    googleCloudApiKey: initialSettings.api.googleCloudApiKey,
    // 🔧 FIX: 初期化時に統一設定から読み込む（デフォルト値はtrue）
    useDirectGeminiAPI: initialSettings.api.useDirectGeminiAPI ?? true,

    // 🔧 FIX: systemPrompts設定を統一設定から読み込む
    // Anchor Depth
    anchorDepth: initialSettings.prompts?.anchorDepth ?? 0,

    systemPrompts: {
      system: initialSettings.prompts?.system || "",
      anchor: initialSettings.prompts?.anchor || "",
      replySuggestion: initialSettings.prompts?.replySuggestion || "",
      replySuggestionStyle: initialSettings.prompts?.replySuggestionStyle || {
        personality: "",
        tone: "",
        behavior: "",
        firstPerson: ""
      },
      textEnhancement: initialSettings.prompts?.textEnhancement || "",
      jailbreak: initialSettings.prompts?.jailbreak || "",
      selectedPresetId: initialSettings.prompts?.selectedPresetId,
    },
    enableSystemPrompt: initialSettings.prompts?.enableSystemPrompt ?? false,
    chatSystemPromptMode: initialSettings.prompts?.chatSystemPromptMode ?? "legacy",
    enableAnchorPrompt: initialSettings.prompts?.enableAnchorPrompt ?? false,

    chat: {
      responseFormat: initialSettings.chat?.responseFormat ?? "normal",
      memoryCapacity: initialSettings.chat?.memoryCapacity ?? 20,
      generationCandidates: initialSettings.chat?.generationCandidates ?? 1,
      memory_limits: initialSettings.chat?.memoryLimits ? {
        max_working_memory: initialSettings.chat.memoryLimits.maxWorkingMemory,
        max_memory_cards: initialSettings.chat.memoryLimits.maxMemoryCards,
        max_relevant_memories: initialSettings.chat.memoryLimits.maxRelevantMemories,
        max_prompt_tokens: initialSettings.chat.memoryLimits.maxPromptTokens,
        max_context_messages: initialSettings.chat.memoryLimits.maxContextMessages,
      } : {
        max_working_memory: 6,
        max_memory_cards: 50,
        max_relevant_memories: 5,
        max_prompt_tokens: 80000,
        max_context_messages: 100,
      },
      progressiveMode: initialSettings.chat?.progressiveMode ?? {
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

    // 🔧 FIX: voice設定を統一設定から読み込む
    voice: initialSettings.voice || {
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

    // 🔧 FIX: imageGeneration設定を統一設定から読み込む
    imageGeneration: initialSettings.imageGeneration || {
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
        modelId: "miaomiaoHarem_v195.safetensors",
        width: 1024,
        height: 1024,
        steps: 20,
        cfgScale: 5.0,
        distilledCfgScale: 3.5,
        sampler: "DPM++ 2M",
        scheduler: "karras",
        seed: -1,
        customQualityTags: "",
        clipSkip: 1,
        batchCount: 1,
        batchSize: 1,
      },
    },

    // Actions
    updateUnifiedSettings: (updates) => {
      settingsManager.updateSettings(updates);
    },

    updateCategory: (category, updates) => {
      settingsManager.updateCategory(category, updates);

      // サイドエフェクト: API設定が更新された場合はsimpleAPIManagerV2に通知
      if (category === 'api') {
        const currentAPI = get().apiConfig;
        const updatedAPI = { ...currentAPI, ...updates };
        simpleAPIManagerV2.setAPIConfig(updatedAPI);
      }
    },

    updateLanguageSettings: (settings) => {
      // 言語設定を統一設定に変換
      const uiUpdates: Partial<UnifiedSettings["ui"]> = {};

      if (settings.language !== undefined) uiUpdates.language = settings.language;
      if (settings.timezone !== undefined) uiUpdates.timezone = settings.timezone;
      if (settings.dateFormat !== undefined) uiUpdates.dateFormat = settings.dateFormat;
      if (settings.timeFormat !== undefined) uiUpdates.timeFormat = settings.timeFormat;
      if (settings.currency !== undefined) uiUpdates.currency = settings.currency;

      if (Object.keys(uiUpdates).length > 0) {
        settingsManager.updateCategory("ui", uiUpdates);
      }

      set((state) => ({
        languageSettings: { ...state.languageSettings, ...settings },
      }));
    },

    updateEffectSettings: (settings) => {
      console.log("🎨 [updateEffectSettings] Updating effects via unified settings:", settings);
      // ✅ FIX: 統一設定経由でのみ更新（二重更新を排除）
      // subscribeコールバック → syncFromUnifiedSettings() → effectSettings更新
      settingsManager.updateCategory("effects", settings);
    },

    updateAppearanceSettings: (settings) => {
      // 🔧 FIX: すべての外観設定を統一設定に反映
      const uiUpdates: Partial<UnifiedSettings["ui"]> = {};

      // Typography
      if (settings.fontSize !== undefined) uiUpdates.fontSize = settings.fontSize;
      if (settings.fontWeight !== undefined) uiUpdates.fontWeight = settings.fontWeight;
      if (settings.fontFamily !== undefined) uiUpdates.fontFamily = settings.fontFamily;
      if (settings.lineHeight !== undefined) uiUpdates.lineHeight = settings.lineHeight;

      // Theme
      if (settings.theme !== undefined) {
        uiUpdates.theme =
          settings.theme === "dark" || settings.theme === "light"
            ? settings.theme
            : "auto";
      }

      // Layout
      if (settings.messageSpacing !== undefined) uiUpdates.messageSpacing = settings.messageSpacing;
      if (settings.messageBorderRadius !== undefined) uiUpdates.messageBorderRadius = settings.messageBorderRadius;
      if (settings.chatMaxWidth !== undefined) uiUpdates.chatMaxWidth = settings.chatMaxWidth;
      if (settings.sidebarWidth !== undefined) uiUpdates.sidebarWidth = settings.sidebarWidth;

      // Colors
      if (settings.primaryColor !== undefined) uiUpdates.primaryColor = settings.primaryColor;
      if (settings.accentColor !== undefined) uiUpdates.accentColor = settings.accentColor;
      if (settings.backgroundColor !== undefined) uiUpdates.backgroundColor = settings.backgroundColor;
      if (settings.surfaceColor !== undefined) uiUpdates.surfaceColor = settings.surfaceColor;
      if (settings.textColor !== undefined) uiUpdates.textColor = settings.textColor;
      if (settings.secondaryTextColor !== undefined) uiUpdates.secondaryTextColor = settings.secondaryTextColor;
      if (settings.borderColor !== undefined) uiUpdates.borderColor = settings.borderColor;
      if (settings.shadowColor !== undefined) uiUpdates.shadowColor = settings.shadowColor;

      // 🆕 Phase 3: Background（階層構造への変換）
      // ヘルパー: 既存設定をベースにbackgroundオブジェクトを安全に構築
      const ensureBackground = () => {
        if (!uiUpdates.background) {
          const current = get().unifiedSettings.ui.background;
          uiUpdates.background = { ...current };
        }
        return uiUpdates.background;
      };
      const ensureBackgroundImage = () => {
        const bg = ensureBackground();
        if (!bg.image) {
          const current = get().unifiedSettings.ui.background.image;
          bg.image = { ...current };
        }
        return bg.image;
      };

      if (settings.backgroundType !== undefined) {
        ensureBackground().type = settings.backgroundType;
      }
      if (settings.backgroundImage !== undefined) {
        const currentState = get().appearanceSettings;
        ensureBackground().type = 'image';
        const img = ensureBackgroundImage();
        img.url = settings.backgroundImage;
        if (img.blur === undefined) img.blur = currentState.backgroundBlur ?? 10;
        if (img.blurEnabled === undefined) img.blurEnabled = currentState.backgroundBlurEnabled ?? false;
        if (img.opacity === undefined) img.opacity = currentState.backgroundOpacity ?? 100;
      }
      if (settings.backgroundBlur !== undefined) {
        ensureBackgroundImage().blur = settings.backgroundBlur;
      }
      if (settings.backgroundBlurEnabled !== undefined) {
        ensureBackgroundImage().blurEnabled = settings.backgroundBlurEnabled;
      }
      if (settings.backgroundOpacity !== undefined) {
        ensureBackgroundImage().opacity = settings.backgroundOpacity;
      }
      if (settings.backgroundGradient !== undefined) {
        const bg = ensureBackground();
        if (!bg.gradient) {
          const current = get().unifiedSettings.ui.background.gradient;
          bg.gradient = { ...current };
        }
        bg.gradient.value = settings.backgroundGradient;
      }


      // 🆕 Fix: Explicitly handle the full background object from AppearancePanel
      if (settings.background !== undefined) {
        // If we have a comprehensive background object, override/merge it
        // Note: settingsManager.updateCategory handles deep merging, so we can pass partially populated objects safely
        uiUpdates.background = settings.background;
      }

      // Effects
      if (settings.enableAnimations !== undefined) uiUpdates.enableAnimations = settings.enableAnimations;
      if (settings.transitionDuration !== undefined) uiUpdates.transitionDuration = settings.transitionDuration;

      // Favicon
      if (settings.faviconPath !== undefined) uiUpdates.faviconPath = settings.faviconPath;
      if (settings.faviconSvg !== undefined) uiUpdates.faviconSvg = settings.faviconSvg;
      if (settings.appleTouchIcon !== undefined) uiUpdates.appleTouchIcon = settings.appleTouchIcon;

      // Custom CSS
      if (settings.customCSS !== undefined) uiUpdates.customCSS = settings.customCSS;

      // 統一設定に保存
      if (Object.keys(uiUpdates).length > 0) {
        console.log("🎨 [updateAppearanceSettings] Updating UI via unified settings:", uiUpdates);
        settingsManager.updateCategory("ui", uiUpdates);
      }

      // ✅ FIX: subscribeコールバック → syncFromUnifiedSettings() → appearanceSettings更新
      // 直接のZustandストア更新を削除（二重更新を排除）
    },

    updateSystemPrompts: (prompts) => {
      // 🔧 FIX: systemPrompts設定を統一設定に保存
      const promptUpdates: Partial<UnifiedSettings["prompts"]> = {};

      if (prompts.system !== undefined) promptUpdates.system = prompts.system;
      if (prompts.anchor !== undefined) promptUpdates.anchor = prompts.anchor;
      if (prompts.replySuggestion !== undefined) promptUpdates.replySuggestion = prompts.replySuggestion;
      if (prompts.replySuggestionStyle !== undefined) promptUpdates.replySuggestionStyle = prompts.replySuggestionStyle;
      if (prompts.textEnhancement !== undefined) promptUpdates.textEnhancement = prompts.textEnhancement;
      if (prompts.jailbreak !== undefined) promptUpdates.jailbreak = prompts.jailbreak;
      if (prompts.selectedPresetId !== undefined) promptUpdates.selectedPresetId = prompts.selectedPresetId;

      // 統一設定に保存
      if (Object.keys(promptUpdates).length > 0) {
        console.log("📝 [updateSystemPrompts] Updating prompts via unified settings:", promptUpdates);
        settingsManager.updateCategory("prompts", promptUpdates);
      }
    },

    setEnableSystemPrompt: (enable) => {
      console.log("📝 [setEnableSystemPrompt] Updating via unified settings:", enable);
      // ✅ FIX: 統一設定経由でのみ更新（二重更新を排除）
      settingsManager.updateCategory("prompts", { enableSystemPrompt: enable });
    },

    setChatSystemPromptMode: (mode) => {
      console.log("統 [setChatSystemPromptMode] Updating via unified settings:", mode);
      settingsManager.updateCategory("prompts", { chatSystemPromptMode: mode });
    },

    setEnableAnchorPrompt: (enable: boolean) => {
      console.log("📝 [setEnableAnchorPrompt] Updating via unified settings:", enable);
      // ✅ FIX: 統一設定経由でのみ更新（二重更新を排除）
      settingsManager.updateCategory("prompts", { enableAnchorPrompt: enable });
    },

    setAnchorDepth: (depth: number) => {
      console.log("📝 [setAnchorDepth] Updating via unified settings:", depth);
      settingsManager.updateCategory("prompts", { anchorDepth: depth });
    },

    setEnableJailbreakPrompt: (enable: boolean) => {
      // Jailbreak prompt settings might not be in UnifiedSettings yet, or part of prompts
      console.log("📝 [setEnableJailbreakPrompt] Updating via unified settings:", enable);
      settingsManager.updateCategory("prompts", { enableJailbreakPrompt: enable });
    },

    updateChatSettings: (settings) => {
      console.log("🔧 [updateChatSettings] Called with:", settings);

      // ✅ FIX: すべてのチャット設定を統一設定に反映
      const chatUpdates: Partial<UnifiedSettings["chat"]> = {};

      // 既存の設定
      if ("enterToSend" in settings && typeof settings.enterToSend === 'boolean')
        chatUpdates.enterToSend = settings.enterToSend;
      if ("autoScroll" in settings && typeof settings.autoScroll === 'boolean')
        chatUpdates.autoScroll = settings.autoScroll;
      if ("showTypingIndicator" in settings && typeof settings.showTypingIndicator === 'boolean')
        chatUpdates.showTypingIndicator = settings.showTypingIndicator;
      if ("messageGrouping" in settings && typeof settings.messageGrouping === 'boolean')
        chatUpdates.messageGrouping = settings.messageGrouping;
      if ("soundEnabled" in settings && typeof settings.soundEnabled === 'boolean')
        chatUpdates.soundEnabled = settings.soundEnabled;
      if ("notificationsEnabled" in settings && typeof settings.notificationsEnabled === 'boolean')
        chatUpdates.notificationsEnabled = settings.notificationsEnabled;
      if ("responseFormat" in settings)
        chatUpdates.responseFormat = settings.responseFormat as typeof chatUpdates.responseFormat;
      if ("memoryCapacity" in settings && typeof settings.memoryCapacity === 'number')
        chatUpdates.memoryCapacity = settings.memoryCapacity;
      if ("generationCandidates" in settings && typeof settings.generationCandidates === 'number')
        chatUpdates.generationCandidates = settings.generationCandidates;

      // ✅ 追加: メモリー制限設定（スネークケース → キャメルケース変換）
      if ("memoryLimits" in settings && settings.memoryLimits) {
        chatUpdates.memoryLimits = settings.memoryLimits as typeof chatUpdates.memoryLimits;
      }
      if ("memory_limits" in settings && settings.memory_limits) {
        const ml = settings.memory_limits as Record<string, unknown>;
        chatUpdates.memoryLimits = {
          maxWorkingMemory: ml.max_working_memory as number,
          maxMemoryCards: ml.max_memory_cards as number,
          maxRelevantMemories: ml.max_relevant_memories as number,
          maxPromptTokens: ml.max_prompt_tokens as number,
          maxContextMessages: ml.max_context_messages as number,
        };
      }

      // ✅ 追加: プログレッシブモード設定
      if ("progressiveMode" in settings && settings.progressiveMode) {
        const pm = settings.progressiveMode;
        chatUpdates.progressiveMode = {
          enabled: !!pm.enabled,
          showIndicators: pm.showIndicators ?? true,
          highlightChanges: pm.highlightChanges ?? true,
          glowIntensity: pm.glowIntensity ?? "medium",
          stageDelays: pm.stageDelays ?? {
            reflex: 0,
            context: 1000,
            intelligence: 2000,
          },
        };
      }

      // 統一設定に保存
      if (Object.keys(chatUpdates).length > 0) {
        console.log("💬 [updateChatSettings] Updating chat via unified settings:", chatUpdates);
        settingsManager.updateCategory("chat", chatUpdates);
      }
    },

    updateVoiceSettings: (settings) => {
      // 🔧 FIX: voice設定を統一設定に保存
      const voiceUpdates: Partial<UnifiedSettings["voice"]> = {};

      if (settings.enabled !== undefined) voiceUpdates.enabled = settings.enabled;
      if (settings.provider !== undefined) voiceUpdates.provider = settings.provider;
      if (settings.autoPlay !== undefined) voiceUpdates.autoPlay = settings.autoPlay;
      if (settings.voicevox !== undefined) voiceUpdates.voicevox = settings.voicevox;
      if (settings.elevenlabs !== undefined) voiceUpdates.elevenlabs = settings.elevenlabs;
      if (settings.vertexHyper !== undefined) voiceUpdates.vertexHyper = settings.vertexHyper; // 🔧 FIX: Vertex Hyper設定を追加
      if (settings.system !== undefined) voiceUpdates.system = settings.system;
      if (settings.advanced !== undefined) voiceUpdates.advanced = settings.advanced;

      // 統一設定に保存
      if (Object.keys(voiceUpdates).length > 0) {
        console.log("🔊 [updateVoiceSettings] Updating voice via unified settings:", voiceUpdates);
        settingsManager.updateCategory("voice", voiceUpdates);
      }

      // ✅ FIX: subscribeコールバック → syncFromUnifiedSettings() → voice更新
      // 直接のZustandストア更新を削除（二重更新を排除）
    },

    updateImageGenerationSettings: (settings) => {
      // 🔧 FIX: imageGeneration設定を統一設定に保存
      const imageGenUpdates: Partial<UnifiedSettings["imageGeneration"]> = {};

      if (settings.provider !== undefined) imageGenUpdates.provider = settings.provider;
      if (settings.runware !== undefined) {
        imageGenUpdates.runware = {
          ...settings.runware,
          apiKey: settings.runware.apiKey || "" // 🔧 FIX: Ensure apiKey is present
        };
      }
      if (settings.stableDiffusion !== undefined) imageGenUpdates.stableDiffusion = settings.stableDiffusion;

      // 統一設定に保存
      if (Object.keys(imageGenUpdates).length > 0) {
        console.log("🖼️ [updateImageGenerationSettings] Updating imageGen via unified settings:", imageGenUpdates);
        settingsManager.updateCategory("imageGeneration", imageGenUpdates);
      }

      // ✅ FIX: subscribeコールバック → syncFromUnifiedSettings() → imageGeneration更新
      // 直接のZustandストア更新を削除（二重更新を排除）
    },

    updateAPIConfig: (config) => {
      // API設定を統一設定に反映
      const apiUpdates: Partial<UnifiedSettings["api"]> = {};
      if (config.provider) apiUpdates.provider = config.provider;
      if (config.model) apiUpdates.model = config.model;
      if (config.temperature !== undefined)
        apiUpdates.temperature = config.temperature;
      if (config.max_tokens !== undefined)
        apiUpdates.maxTokens = config.max_tokens;

      if (Object.keys(apiUpdates).length > 0) {
        settingsManager.updateCategory("api", apiUpdates);
      }

      set((state) => ({ apiConfig: { ...state.apiConfig, ...config } }));
      simpleAPIManagerV2.setAPIConfig(get().apiConfig);
    },

    setAPIProvider: (provider) => {
      settingsManager.updateCategory("api", { provider });
      set((state) => ({ apiConfig: { ...state.apiConfig, provider } }));
      simpleAPIManagerV2.setAPIConfig(get().apiConfig);
    },

    setAPIModel: (model) => {
      settingsManager.updateCategory("api", { model });
      set((state) => ({ apiConfig: { ...state.apiConfig, model } }));
      simpleAPIManagerV2.setAPIConfig(get().apiConfig);
    },

    setOpenRouterApiKey: (key) => {
      settingsManager.updateCategory("api", { openrouterApiKey: key });
      set({ openRouterApiKey: key });
      simpleAPIManagerV2.setOpenRouterApiKey(key);
    },

    setGeminiApiKey: (key) => {
      settingsManager.updateCategory("api", { geminiApiKey: key });
      set({ geminiApiKey: key });
      simpleAPIManagerV2.setGeminiApiKey(key);
    },

    setGoogleCloudApiKey: (key) => {
      settingsManager.updateCategory("api", { googleCloudApiKey: key });
      set({ googleCloudApiKey: key });
    },

    setUseDirectGeminiAPI: (enabled) => {
      // 🔧 FIX: 統一設定に保存を追加（画面切り替え時の設定保持）
      settingsManager.updateCategory("api", { useDirectGeminiAPI: enabled });
      set({ useDirectGeminiAPI: enabled });
      simpleAPIManagerV2.setUseDirectGeminiAPI(enabled);
      console.log(`Gemini API Direct Mode: ${enabled ? "ON" : "OFF"}`);
    },

    setTemperature: (temp) => {
      settingsManager.updateCategory("api", { temperature: temp });
      set((state) => ({
        apiConfig: { ...state.apiConfig, temperature: temp },
      }));
      simpleAPIManagerV2.setAPIConfig(get().apiConfig);
    },

    setMaxTokens: (tokens) => {
      settingsManager.updateCategory("api", { maxTokens: tokens });
      set((state) => ({
        apiConfig: { ...state.apiConfig, max_tokens: tokens },
      }));
      const newConfig = get().apiConfig;
      simpleAPIManagerV2.setAPIConfig(newConfig);
    },

    setTopP: (topP) => {
      settingsManager.updateCategory("api", { topP });
      set((state) => ({ apiConfig: { ...state.apiConfig, top_p: topP } }));
      simpleAPIManagerV2.setAPIConfig(get().apiConfig);
    },

    setFrequencyPenalty: (penalty) => {
      settingsManager.updateCategory("api", { frequencyPenalty: penalty });
      set((state) => ({
        apiConfig: { ...state.apiConfig, frequency_penalty: penalty },
      }));
      simpleAPIManagerV2.setAPIConfig(get().apiConfig);
    },

    setPresencePenalty: (penalty) => {
      settingsManager.updateCategory("api", { presencePenalty: penalty });
      set((state) => ({
        apiConfig: { ...state.apiConfig, presence_penalty: penalty },
      }));
      simpleAPIManagerV2.setAPIConfig(get().apiConfig);
    },

    setContextWindow: (window) => {
      settingsManager.updateCategory("api", { contextWindow: window });
      set((state) => ({
        apiConfig: { ...state.apiConfig, context_window: window },
      }));
      simpleAPIManagerV2.setAPIConfig(get().apiConfig);
    },

    resetSystemPrompts: () => {
      const emptyPrompts = {
        system: "",
        anchor: "",
        replySuggestion: "",
        replySuggestionStyle: {
          personality: "",
          tone: "",
          behavior: "",
          firstPerson: ""
        },
        textEnhancement: "",
        jailbreak: "",
      };
      set({ systemPrompts: emptyPrompts });
    },

    setShowSettingsModal: (show, initialTab = "effects") => {
      set({ showSettingsModal: show, initialSettingsTab: initialTab });
    },

    setShowVoiceSettingsModal: (show) => {
      set({ showVoiceSettingsModal: show });
    },

    // 💡 インスピレーション機能専用モデル設定
    setInspirationUseFixedModel: (enabled) => {
      console.log(`💡 [setInspirationUseFixedModel] ${enabled ? 'ON' : 'OFF'}`);
      const currentInspiration = get().apiConfig.inspiration || { useFixedModel: false };
      const newConfig = {
        ...get().apiConfig,
        inspiration: { ...currentInspiration, useFixedModel: enabled }
      };
      set({ apiConfig: newConfig });
      settingsManager.updateCategory("api", { inspiration: newConfig.inspiration });
    },

    setInspirationFixedModel: (model, provider) => {
      console.log(`💡 [setInspirationFixedModel] Model: ${model}, Provider: ${provider || 'auto'}`);
      const currentInspiration = get().apiConfig.inspiration || { useFixedModel: false };
      const newInspiration = {
        ...currentInspiration,
        fixedModel: model,
        fixedProvider: provider || (model.startsWith('gemini-') ? 'gemini' as APIProvider : 'openrouter' as APIProvider),
      };
      const newConfig = { ...get().apiConfig, inspiration: newInspiration };
      set({ apiConfig: newConfig });
      settingsManager.updateCategory("api", { inspiration: newInspiration });
    },

    setInspirationFixedUseDirectGeminiAPI: (enabled) => {
      console.log(`💡 [setInspirationFixedUseDirectGeminiAPI] ${enabled ? 'ON' : 'OFF'}`);
      const currentInspiration = get().apiConfig.inspiration || { useFixedModel: false };
      const newInspiration = { ...currentInspiration, fixedUseDirectGeminiAPI: enabled };
      const newConfig = { ...get().apiConfig, inspiration: newInspiration };
      set({ apiConfig: newConfig });
      settingsManager.updateCategory("api", { inspiration: newInspiration });
    },

    // 内部用：統一設定から同期
    syncFromUnifiedSettings: () => {
      const unified = get().unifiedSettings;

      console.log("🔄 [syncFromUnifiedSettings] Syncing settings from unified settings:", {
        effectSettings: unified.effects,
        chatSettings: unified.chat,
        progressiveMode: unified.chat?.progressiveMode,
        uiSettings: unified.ui,
        prompts: unified.prompts,
      });

      set({
        effectSettings: unified.effects,
        // 🧠 感情知能システムフラグの同期
        emotionalIntelligenceFlags: {
          emotion_analysis_enabled: unified.emotionalIntelligence.enabled && unified.emotionalIntelligence.analysis.basic,
          emotional_memory_enabled: unified.emotionalIntelligence.memoryEnabled,
          basic_effects_enabled: unified.effects.emotion.displayMode !== 'none',
          contextual_analysis_enabled: unified.emotionalIntelligence.analysis.contextual,
          adaptive_performance_enabled: unified.emotionalIntelligence.adaptivePerformance,
          visual_effects_enabled: unified.effects.emotion.displayMode === 'rich' || unified.effects.emotion.displayMode === 'standard',
          predictive_analysis_enabled: unified.emotionalIntelligence.analysis.predictive,
          advanced_effects_enabled: unified.effects.emotion.displayMode === 'rich',
          multi_layer_analysis_enabled: unified.emotionalIntelligence.analysis.multiLayer,
          safe_mode: unified.emotionalIntelligence.safeMode,
          fallback_to_legacy: unified.emotionalIntelligence.fallbackToLegacy,
          performance_monitoring: unified.emotionalIntelligence.performanceMonitoring,
          debug_mode: unified.emotionalIntelligence.debugMode,
        },
        // 🔧 FIX: systemPromptsの同期を追加
        systemPrompts: {
          system: unified.prompts.system,
          anchor: unified.prompts.anchor,
          replySuggestion: unified.prompts.replySuggestion,
          replySuggestionStyle: unified.prompts.replySuggestionStyle || get().systemPrompts.replySuggestionStyle,
          textEnhancement: unified.prompts.textEnhancement,
          jailbreak: unified.prompts.jailbreak || "",
          selectedPresetId: unified.prompts.selectedPresetId,
        },
        enableSystemPrompt: unified.prompts?.enableSystemPrompt ?? false,
        chatSystemPromptMode: unified.prompts?.chatSystemPromptMode ?? "legacy",
        enableAnchorPrompt: unified.prompts?.enableAnchorPrompt ?? false,
        anchorDepth: unified.prompts?.anchorDepth ?? 0,
        languageSettings: {
          language: unified.ui.language,
          timezone: unified.ui.timezone || "Asia/Tokyo",
          dateFormat: unified.ui.dateFormat || "YYYY/MM/DD",
          timeFormat:
            unified.ui.timeFormat ||
            (unified.ui.language === "ja" ? "24" : "12"),
          currency:
            unified.ui.currency ||
            (unified.ui.language === "ja" ? "JPY" : "USD"),
        },
        // 🔧 FIX: 外観設定の同期を追加
        appearanceSettings: {
          theme: unified.ui.theme === "auto" ? "dark" : unified.ui.theme,
          primaryColor: unified.ui.primaryColor,
          accentColor: unified.ui.accentColor,
          backgroundColor: unified.ui.backgroundColor,
          surfaceColor: unified.ui.surfaceColor,
          textColor: unified.ui.textColor,
          secondaryTextColor: unified.ui.secondaryTextColor,
          borderColor: unified.ui.borderColor,
          shadowColor: unified.ui.shadowColor,
          fontFamily: unified.ui.fontFamily,
          fontSize: unified.ui.fontSize,
          fontWeight: unified.ui.fontWeight,
          lineHeight: unified.ui.lineHeight,
          messageSpacing: unified.ui.messageSpacing,
          messageBorderRadius: unified.ui.messageBorderRadius,
          chatMaxWidth: unified.ui.chatMaxWidth,
          sidebarWidth: unified.ui.sidebarWidth,
          // 🆕 Phase 3: 階層構造からフラット構造への変換（後方互換性）
          backgroundType: unified.ui.background?.type || 'gradient',
          backgroundImage: unified.ui.background?.image?.url || '',
          backgroundBlur: unified.ui.background?.image?.blur || 10,
          backgroundBlurEnabled: unified.ui.background?.image?.blurEnabled ?? false,
          backgroundOpacity: unified.ui.background?.image?.opacity || 100,
          backgroundGradient: unified.ui.background?.gradient?.value || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          background: unified.ui.background,
          faviconPath: unified.ui.faviconPath || "/favicon.ico",
          faviconSvg: unified.ui.faviconSvg || "/favicon.svg",
          appleTouchIcon: unified.ui.appleTouchIcon || "/apple-touch-icon.png",
          enableAnimations: unified.ui.enableAnimations ?? true,
          transitionDuration: unified.ui.transitionDuration || "normal",
          customCSS: unified.ui.customCSS || "",
        },
        apiConfig: {
          ...get().apiConfig,
          provider: (unified.api.provider === "openai" ||
            unified.api.provider === "anthropic" ||
            unified.api.provider === "groq"
            ? "openrouter"
            : unified.api.provider === "google"
            ? "gemini"
            : unified.api.provider) as APIProvider,
          model: unified.api.model || get().apiConfig.model,
          temperature: unified.api.temperature || get().apiConfig.temperature,
          max_tokens: unified.api.maxTokens || get().apiConfig.max_tokens,
          inspiration: unified.api.inspiration,
        },
        openRouterApiKey: unified.api.openrouterApiKey,
        geminiApiKey: unified.api.geminiApiKey,
        // 🔧 FIX: useDirectGeminiAPIの同期を追加（デフォルト値はtrue）
        useDirectGeminiAPI: unified.api.useDirectGeminiAPI ?? true,
        // 🔧 FIX: voice設定の同期を追加
        voice: unified.voice || get().voice,
        // 🔧 FIX: imageGeneration設定の同期を追加
        imageGeneration: unified.imageGeneration || get().imageGeneration,
        // ✅ FIX: チャット設定の同期を追加
        chat: {
          ...get().chat,
          responseFormat: unified.chat?.responseFormat ?? get().chat.responseFormat,
          memoryCapacity: unified.chat?.memoryCapacity ?? get().chat.memoryCapacity,
          generationCandidates: unified.chat?.generationCandidates ?? get().chat.generationCandidates,
          memory_limits: unified.chat?.memoryLimits ? {
            max_working_memory: unified.chat.memoryLimits.maxWorkingMemory,
            max_memory_cards: unified.chat.memoryLimits.maxMemoryCards,
            max_relevant_memories: unified.chat.memoryLimits.maxRelevantMemories,
            max_prompt_tokens: unified.chat.memoryLimits.maxPromptTokens,
            max_context_messages: unified.chat.memoryLimits.maxContextMessages,
          } : get().chat.memory_limits,
          progressiveMode: unified.chat?.progressiveMode ?? get().chat.progressiveMode,
        },
      });

      console.log("✅ [syncFromUnifiedSettings] Settings synced:", {
        newChatSettings: get().chat,
        progressiveMode: get().chat.progressiveMode,
        newAppearanceSettings: get().appearanceSettings,
      });
    },
  };
};
