import { StateCreator } from 'zustand';

export interface SuggestionSlice {
  suggestions: string[];
  showSuggestionModal: boolean;
  isGeneratingSuggestions: boolean;
  setSuggestions: (suggestions: string[]) => void;
  setShowSuggestionModal: (show: boolean) => void;
  setIsGeneratingSuggestions: (isGenerating: boolean) => void;
}

export const createSuggestionSlice: StateCreator<SuggestionSlice, [], [], SuggestionSlice> = (set) => ({
  suggestions: [],
  showSuggestionModal: false,
  isGeneratingSuggestions: false,
  setSuggestions: (suggestions) => set({ suggestions }),
  setShowSuggestionModal: (show) => set({ showSuggestionModal: show }),
  setIsGeneratingSuggestions: (isGenerating) => set({ isGeneratingSuggestions: isGenerating }),
});