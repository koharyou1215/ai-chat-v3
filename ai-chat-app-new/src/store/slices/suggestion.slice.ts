import { StateCreator } from 'zustand';
import { InspirationService } from '@/services/inspiration-service';
import { UnifiedMessage } from '@/types/memory';
import { AppStore } from '..';
import { Character, Persona } from '@/types';

export interface SuggestionData {
  id: string;
  content: string;
  type: 'continuation' | 'question' | 'topic' | 'creative';
  confidence: number;
}

export interface SuggestionSlice {
  suggestions: string[];
  suggestionData: SuggestionData[];
  showSuggestionModal: boolean;
  isGeneratingSuggestions: boolean;
  inspirationService: InspirationService;
  
  setSuggestions: (suggestions: string[]) => void;
  setSuggestionData: (data: SuggestionData[]) => void;
  setShowSuggestionModal: (show: boolean) => void;
  setIsGeneratingSuggestions: (isGenerating: boolean) => void;
  
  // Enhanced methods
  generateSuggestions: (
    messages: UnifiedMessage[], 
    character: Character, 
    user: Persona, 
    customPrompt?: string
  ) => Promise<void>;
  enhanceText: (
    text: string, 
    messages: UnifiedMessage[], 
    user: Persona, 
    enhancePrompt?: string
  ) => Promise<string>;
}

export const createSuggestionSlice: StateCreator<AppStore, [], [], SuggestionSlice> = (set, get) => ({
  suggestions: [],
  suggestionData: [],
  showSuggestionModal: false,
  isGeneratingSuggestions: false,
  inspirationService: new InspirationService(),
  
  setSuggestions: (suggestions) => set({ suggestions }),
  setSuggestionData: (data) => set({ suggestionData: data }),
  setShowSuggestionModal: (show) => set({ showSuggestionModal: show }),
  setIsGeneratingSuggestions: (isGenerating) => set({ isGeneratingSuggestions: isGenerating }),
  
  generateSuggestions: async (messages, character, user, customPrompt) => {
    const { isGeneratingSuggestions, inspirationService, apiConfig, openRouterApiKey } = get();
    if (isGeneratingSuggestions) return;
    
    set({ isGeneratingSuggestions: true, suggestions: [], suggestionData: [] });
    
    try {
      const suggestions = await inspirationService.generateReplySuggestions(
        messages,
        character,
        user,
        customPrompt,
        4,
        { ...apiConfig, openRouterApiKey }
      );
      
      const suggestionData: SuggestionData[] = suggestions.map((suggestion) => ({
        id: suggestion.id,
        content: suggestion.content,
        type: suggestion.type,
        confidence: suggestion.confidence
      }));
      
      set({ 
        suggestions: suggestions.map(s => s.content),
        suggestionData
      });
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      set({ suggestions: [], suggestionData: [] });
    } finally {
      set({ isGeneratingSuggestions: false });
    }
  },
  
  enhanceText: async (text, messages, user, enhancePrompt) => {
    const { inspirationService, apiConfig, openRouterApiKey } = get();
    
    // デバッグ: 現在のAPIConfig設定を確認
    console.log('🔧 Current API Config for text enhancement:', {
      provider: apiConfig.provider,
      model: apiConfig.model,
      max_tokens: apiConfig.max_tokens,
      temperature: apiConfig.temperature,
      hasOpenRouterKey: !!openRouterApiKey
    });
    
    try {
      return await inspirationService.enhanceText(text, messages, user, enhancePrompt, { ...apiConfig, openRouterApiKey });
    } catch (error) {
      console.error('Failed to enhance text:', error);
      return text;
    }
  }
});