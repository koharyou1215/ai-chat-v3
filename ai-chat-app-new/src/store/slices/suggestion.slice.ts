import { StateCreator } from 'zustand';
import { InspirationService } from '@/services/inspiration-service';
import { UnifiedMessage } from '@/types';

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
  generateSuggestions: (messages: UnifiedMessage[], customPrompt?: string) => Promise<void>;
  enhanceText: (text: string, messages: UnifiedMessage[], enhancePrompt?: string) => Promise<string>;
}

export const createSuggestionSlice: StateCreator<SuggestionSlice, [], [], SuggestionSlice> = (set, get) => ({
  suggestions: [],
  suggestionData: [],
  showSuggestionModal: false,
  isGeneratingSuggestions: false,
  inspirationService: new InspirationService(),
  
  setSuggestions: (suggestions) => set({ suggestions }),
  setSuggestionData: (data) => set({ suggestionData: data }),
  setShowSuggestionModal: (show) => set({ showSuggestionModal: show }),
  setIsGeneratingSuggestions: (isGenerating) => set({ isGeneratingSuggestions: isGenerating }),
  
  generateSuggestions: async (messages, customPrompt) => {
    const state = get();
    if (state.isGeneratingSuggestions) return;
    
    set({ isGeneratingSuggestions: true });
    
    try {
      const suggestions = await state.inspirationService.generateReplySuggestions(
        messages,
        customPrompt,
        4
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
  
  enhanceText: async (text, messages, enhancePrompt) => {
    const state = get();
    try {
      return await state.inspirationService.enhanceText(text, messages, enhancePrompt);
    } catch (error) {
      console.error('Failed to enhance text:', error);
      return text;
    }
  }
});