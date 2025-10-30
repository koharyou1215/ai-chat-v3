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
} from "@/types/core/settings.types";

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
      timezone: "Asia/Tokyo",
      dateFormat: "YYYY/MM/DD",
      timeFormat: initialSettings.ui.language === "ja" ? "24" : "12",
      currency: initialSettings.ui.language === "ja" ? "JPY" : "USD",
    },

    effectSettings: initialSettings.effects,

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
    },
    openRouterApiKey: initialSettings.api.openrouterApiKey,
    geminiApiKey: initialSettings.api.geminiApiKey,
    // 🔧 FIX: 初期化時に統一設定から読み込む（デフォルト値はtrue）
    useDirectGeminiAPI: initialSettings.api.useDirectGeminiAPI ?? true,

    // 🔧 FIX: systemPrompts設定を統一設定から読み込む
    systemPrompts: {
      system: initialSettings.prompts?.system || "",
      jailbreak: initialSettings.prompts?.jailbreak || "",
      replySuggestion: initialSettings.prompts?.replySuggestion || "",
      textEnhancement: initialSettings.prompts?.textEnhancement || "",
    },
    enableSystemPrompt: initialSettings.prompts?.enableSystemPrompt ?? false,
    enableJailbreakPrompt: initialSettings.prompts?.enableJailbreakPrompt ?? false,

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
        max_prompt_tokens: 32000,
        max_context_messages: 40,
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
      if (settings.language) {
        settingsManager.updateCategory("ui", { language: settings.language });
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
      // @ts-expect-error - Migration: complex nested background object type conversions
      if (settings.backgroundType !== undefined) {
        if (!uiUpdates.background) uiUpdates.background = {} as typeof uiUpdates.background;
        (uiUpdates.background as NonNullable<typeof uiUpdates.background>).type = settings.backgroundType;
      }
      // @ts-expect-error - Migration: complex nested background object type conversions
      if (settings.backgroundImage !== undefined) {
        if (!uiUpdates.background) uiUpdates.background = {} as typeof uiUpdates.background;
        if (!(uiUpdates.background as Record<string, unknown>).image) (uiUpdates.background as Record<string, unknown>).image = {} as typeof uiUpdates.background.image;
        (uiUpdates.background.image as NonNullable<typeof uiUpdates.background.image>).url = settings.backgroundImage;
      }
      // @ts-expect-error - Migration: complex nested background object type conversions
      if (settings.backgroundBlur !== undefined) {
        if (!uiUpdates.background) uiUpdates.background = {} as typeof uiUpdates.background;
        if (!(uiUpdates.background as Record<string, unknown>).image) (uiUpdates.background as Record<string, unknown>).image = {} as typeof uiUpdates.background.image;
        (uiUpdates.background.image as NonNullable<typeof uiUpdates.background.image>).blur = settings.backgroundBlur;
      }
      // @ts-expect-error - Migration: complex nested background object type conversions
      if (settings.backgroundBlurEnabled !== undefined) {
        if (!uiUpdates.background) uiUpdates.background = {} as typeof uiUpdates.background;
        if (!(uiUpdates.background as Record<string, unknown>).image) (uiUpdates.background as Record<string, unknown>).image = {} as typeof uiUpdates.background.image;
        (uiUpdates.background.image as NonNullable<typeof uiUpdates.background.image>).blurEnabled = settings.backgroundBlurEnabled;
      }
      // @ts-expect-error - Migration: complex nested background object type conversions
      if (settings.backgroundOpacity !== undefined) {
        if (!uiUpdates.background) uiUpdates.background = {} as typeof uiUpdates.background;
        if (!(uiUpdates.background as Record<string, unknown>).image) (uiUpdates.background as Record<string, unknown>).image = {} as typeof uiUpdates.background.image;
        (uiUpdates.background.image as NonNullable<typeof uiUpdates.background.image>).opacity = settings.backgroundOpacity;
      }
      // @ts-expect-error - Migration: complex nested background object type conversions
      if (settings.backgroundGradient !== undefined) {
        if (!uiUpdates.background) uiUpdates.background = {} as typeof uiUpdates.background;
        if (!(uiUpdates.background as Record<string, unknown>).gradient) (uiUpdates.background as Record<string, unknown>).gradient = {} as typeof uiUpdates.background.gradient;
        (uiUpdates.background.gradient as NonNullable<typeof uiUpdates.background.gradient>).value = settings.backgroundGradient;
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
      if (prompts.jailbreak !== undefined) promptUpdates.jailbreak = prompts.jailbreak;
      if (prompts.replySuggestion !== undefined) promptUpdates.replySuggestion = prompts.replySuggestion;
      if (prompts.textEnhancement !== undefined) promptUpdates.textEnhancement = prompts.textEnhancement;

      // 統一設定に保存
      if (Object.keys(promptUpdates).length > 0) {
        console.log("📝 [updateSystemPrompts] Updating prompts via unified settings:", promptUpdates);
        settingsManager.updateCategory("prompts", promptUpdates);
      }

      // ✅ FIX: subscribeコールバック → syncFromUnifiedSettings() → systemPrompts更新
      // 直接のZustandストア更新を削除（二重更新を排除）
    },

    setEnableSystemPrompt: (enable) => {
      console.log("📝 [setEnableSystemPrompt] Updating via unified settings:", enable);
      // ✅ FIX: 統一設定経由でのみ更新（二重更新を排除）
      settingsManager.updateCategory("prompts", { enableSystemPrompt: enable });
    },

    setEnableJailbreakPrompt: (enable) => {
      console.log("📝 [setEnableJailbreakPrompt] Updating via unified settings:", enable);
      // ✅ FIX: 統一設定経由でのみ更新（二重更新を排除）
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
        console.log("🔧 [updateChatSettings] Saving memoryLimits to settingsManager:", settings.memoryLimits);
      }
      if ("memory_limits" in settings && settings.memory_limits) {
        const ml = settings.memory_limits as Record<string, unknown>;
        // スネークケースをキャメルケースに変換
        chatUpdates.memoryLimits = {
          maxWorkingMemory: ml.max_working_memory as number,
          maxMemoryCards: ml.max_memory_cards as number,
          maxRelevantMemories: ml.max_relevant_memories as number,
          maxPromptTokens: ml.max_prompt_tokens as number,
          maxContextMessages: ml.max_context_messages as number,
        };
        console.log("🔧 [updateChatSettings] Converted memory_limits (snake_case) to memoryLimits (camelCase):", chatUpdates.memoryLimits);
      }

      // ✅ 追加: プログレッシブモード設定（最重要！）
      if ("progressiveMode" in settings && settings.progressiveMode) {
        const pm = settings.progressiveMode;
        chatUpdates.progressiveMode = {
          enabled: typeof pm.enabled === 'boolean' ? pm.enabled : false,
          showIndicators: typeof pm.showIndicators === 'boolean' ? pm.showIndicators : undefined,
          highlightChanges: typeof pm.highlightChanges === 'boolean' ? pm.highlightChanges : undefined,
          glowIntensity: pm.glowIntensity as typeof chatUpdates.progressiveMode.glowIntensity,
          stageDelays: pm.stageDelays as typeof chatUpdates.progressiveMode.stageDelays,
        };
        console.log("🔧 [updateChatSettings] Saving progressive mode to settingsManager:", {
          progressiveMode: settings.progressiveMode,
        });
      }

      // 統一設定に保存
      if (Object.keys(chatUpdates).length > 0) {
        console.log("💬 [updateChatSettings] Updating chat via unified settings:", chatUpdates);
        settingsManager.updateCategory("chat", chatUpdates);
      }

      // ✅ FIX: subscribeコールバック → syncFromUnifiedSettings() → chat更新
      // 直接のZustandストア更新を削除（二重更新を排除）
    },

    updateVoiceSettings: (settings) => {
      // 🔧 FIX: voice設定を統一設定に保存
      const voiceUpdates: Partial<UnifiedSettings["voice"]> = {};

      if (settings.enabled !== undefined) voiceUpdates.enabled = settings.enabled;
      if (settings.provider !== undefined) voiceUpdates.provider = settings.provider;
      if (settings.autoPlay !== undefined) voiceUpdates.autoPlay = settings.autoPlay;
      if (settings.voicevox !== undefined) voiceUpdates.voicevox = settings.voicevox;
      if (settings.elevenlabs !== undefined) voiceUpdates.elevenlabs = settings.elevenlabs;
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
      if (settings.runware !== undefined) imageGenUpdates.runware = settings.runware;
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

      console.log("🔄 [syncFromUnifiedSettings] Syncing settings from unified settings:", {
        effectSettings: unified.effects,
        chatSettings: unified.chat,
        progressiveMode: unified.chat?.progressiveMode,
        uiSettings: unified.ui,
        prompts: unified.prompts,
      });

      set({
        effectSettings: unified.effects,
        // 🔧 FIX: systemPromptsの同期を追加
        systemPrompts: {
          system: unified.prompts?.system || "",
          jailbreak: unified.prompts?.jailbreak || "",
          replySuggestion: unified.prompts?.replySuggestion || "",
          textEnhancement: unified.prompts?.textEnhancement || "",
        },
        enableSystemPrompt: unified.prompts?.enableSystemPrompt ?? false,
        enableJailbreakPrompt: unified.prompts?.enableJailbreakPrompt ?? false,
        languageSettings: {
          language: unified.ui.language,
          timezone: "Asia/Tokyo",
          dateFormat: "YYYY/MM/DD",
          timeFormat: unified.ui.language === "ja" ? "24" : "12",
          currency: unified.ui.language === "ja" ? "JPY" : "USD",
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
          unified.api.provider === "google" ||
          unified.api.provider === "groq"
            ? "openrouter"
            : unified.api.provider) as APIProvider,
          model: unified.api.model || get().apiConfig.model,
          temperature: unified.api.temperature || get().apiConfig.temperature,
          max_tokens: unified.api.maxTokens || get().apiConfig.max_tokens,
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
