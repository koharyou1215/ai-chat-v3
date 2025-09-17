import { StateCreator } from "zustand";
import {
  InspirationService,
  InspirationSuggestion,
} from "@/services/inspiration-service";
import { UnifiedMessage } from "@/types/memory";
import { AppStore } from "..";
import { Character, Persona } from "@/types";

export interface SuggestionData {
  id: string;
  content: string;
  type: "empathy" | "question" | "topic";
  confidence: number;
}

export interface SuggestionSlice {
  suggestions: string[];
  suggestionData: SuggestionData[];
  showSuggestionModal: boolean;
  isGeneratingSuggestions: boolean;

  // Text enhancement modal states
  enhancedText: string;
  showEnhancementModal: boolean;
  isEnhancingText: boolean;

  inspirationService: InspirationService;

  setSuggestions: (suggestions: string[]) => void;
  setSuggestionData: (data: SuggestionData[]) => void;
  setShowSuggestionModal: (show: boolean) => void;
  setIsGeneratingSuggestions: (isGenerating: boolean) => void;

  // Text enhancement modal methods
  setEnhancedText: (text: string) => void;
  setShowEnhancementModal: (show: boolean) => void;
  setIsEnhancingText: (isEnhancing: boolean) => void;

  // Enhanced methods
  generateSuggestions: (
    messages: UnifiedMessage[],
    character: Character,
    user: Persona,
    customPrompt?: string,
    isGroupMode?: boolean
  ) => Promise<void>;
  enhanceText: (
    text: string,
    messages: UnifiedMessage[],
    user: Persona,
    enhancePrompt?: string
  ) => Promise<string>;
  enhanceTextForModal: (
    text: string,
    messages: UnifiedMessage[],
    user: Persona,
    enhancePrompt?: string
  ) => Promise<void>;
  // Continue enhancement for modal: append continuation to enhancedText
  continueEnhancementForModal: () => Promise<void>;
}

export const createSuggestionSlice: StateCreator<
  AppStore,
  [],
  [],
  SuggestionSlice
> = (set, get) => ({
  suggestions: [],
  suggestionData: [],
  showSuggestionModal: false,
  isGeneratingSuggestions: false,

  // Text enhancement modal states
  enhancedText: "",
  showEnhancementModal: false,
  isEnhancingText: false,

  inspirationService: new InspirationService(),

  setSuggestions: (suggestions) => set({ suggestions }),
  setSuggestionData: (data) => set({ suggestionData: data }),
  setShowSuggestionModal: (show) => set({ showSuggestionModal: show }),
  setIsGeneratingSuggestions: (isGenerating) =>
    set({ isGeneratingSuggestions: isGenerating }),

  // Text enhancement modal methods
  setEnhancedText: (text) => set({ enhancedText: text }),
  setShowEnhancementModal: (show) => set({ showEnhancementModal: show }),
  setIsEnhancingText: (isEnhancing) => set({ isEnhancingText: isEnhancing }),

  generateSuggestions: async (
    messages,
    character,
    user,
    customPrompt,
    isGroupMode = false
  ) => {
    const {
      isGeneratingSuggestions,
      inspirationService,
      apiConfig,
      openRouterApiKey,
      geminiApiKey,
      useDirectGeminiAPI,
    } = get();
    if (isGeneratingSuggestions) return;

    set({ isGeneratingSuggestions: true, suggestions: [], suggestionData: [] });

    try {
      const suggestions = await inspirationService.generateReplySuggestions(
        messages,
        character,
        user,
        customPrompt,
        isGroupMode,
        { ...apiConfig, openRouterApiKey, geminiApiKey, useDirectGeminiAPI }
      );

      const suggestionData: SuggestionData[] = suggestions.map(
        (suggestion) => ({
          id: suggestion.id,
          content: suggestion.content,
          type: suggestion.type,
          confidence: suggestion.confidence,
        })
      );

      set({
        suggestions: suggestions.map((s) => s.content),
        suggestionData,
      });
    } catch (error) {
      console.error("Failed to generate suggestions:", error);
      set({ suggestions: [], suggestionData: [] });
    } finally {
      set({ isGeneratingSuggestions: false });
    }
  },

  continueEnhancementForModal: async () => {
    const { inspirationService, isEnhancingText, apiConfig } = get();
    if (isEnhancingText) return;

    set({ isEnhancingText: true });

    try {
      // Determine previous content: prefer enhancedText, fallback to current input
      const previousContent =
        get().enhancedText || get().currentInputText || "";

      if (!previousContent || !previousContent.trim()) {
        console.warn("No previous content available for continuation");
        set({ isEnhancingText: false });
        return;
      }

      // Lazy import continuation prompt util to avoid circular deps
      const { generateInspirationContinuationPrompt } = await import(
        "@/utils/prompt/continuation-prompts"
      );

      const continuationPrompt =
        generateInspirationContinuationPrompt(previousContent);

      const user = (get().getActivePersona && get().getActivePersona()) || undefined;

      const continuation = await inspirationService.enhanceText(
        previousContent,
        [],
        user as any,
        continuationPrompt,
        {
          ...apiConfig,
          openRouterApiKey: get().openRouterApiKey,
          geminiApiKey: get().geminiApiKey,
          useDirectGeminiAPI: get().useDirectGeminiAPI,
        }
      );

      // Append continuation to existing enhancedText
      const existing = get().enhancedText || get().currentInputText || "";
      const joined = existing.trim() + "\n\n" + continuation.trim();
      set({ enhancedText: joined });
    } catch (error) {
      console.error("Failed to continue enhancement:", error);
    } finally {
      set({ isEnhancingText: false });
    }
  },

  enhanceText: async (text, messages, user, enhancePrompt) => {
    const {
      inspirationService,
      apiConfig,
      openRouterApiKey,
      geminiApiKey,
      useDirectGeminiAPI,
    } = get();

    // デバッグ: 現在のAPIConfig設定を確認
    console.log("🔧 Current API Config for text enhancement:", {
      provider: apiConfig.provider,
      model: apiConfig.model,
      max_tokens: apiConfig.max_tokens,
      temperature: apiConfig.temperature,
      hasOpenRouterKey: !!openRouterApiKey,
      hasGeminiKey: !!geminiApiKey,
      useDirectGeminiAPI: useDirectGeminiAPI,
    });

    try {
      return await inspirationService.enhanceText(
        text,
        messages,
        user,
        enhancePrompt,
        { ...apiConfig, openRouterApiKey, geminiApiKey, useDirectGeminiAPI }
      );
    } catch (error) {
      console.error("Failed to enhance text:", error);
      return text;
    }
  },

  enhanceTextForModal: async (text, messages, user, enhancePrompt) => {
    const {
      isEnhancingText,
      inspirationService,
      apiConfig,
      openRouterApiKey,
      geminiApiKey,
      useDirectGeminiAPI,
    } = get();
    if (isEnhancingText) return;

    set({ isEnhancingText: true, enhancedText: "" });

    try {
      const enhanced = await inspirationService.enhanceText(
        text,
        messages,
        user,
        enhancePrompt,
        { ...apiConfig, openRouterApiKey, geminiApiKey, useDirectGeminiAPI }
      );
      set({ enhancedText: enhanced });
    } catch (error) {
      console.error("Failed to enhance text for modal:", error);
      set({ enhancedText: text }); // Fall back to original text
    } finally {
      set({ isEnhancingText: false });
    }
  },
});
