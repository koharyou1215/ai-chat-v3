import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ChatSlice, createChatSlice } from './slices/chat.slice';
import { CharacterSlice, createCharacterSlice } from './slices/character.slice';
import { PersonaSlice, createPersonaSlice } from './slices/persona.slice';
import { MemorySlice, createMemorySlice } from './slices/memory.slice';
import { TrackerSlice, createTrackerSlice } from './slices/tracker.slice';
import { apiManager, APIManager } from '@/services/api-manager';
import { promptBuilderService, PromptBuilderService } from '@/services/prompt-builder.service';
import { HistorySlice, createHistorySlice } from './slices/history.slice';
import { SettingsSlice, createSettingsSlice } from './slices/settings.slice';
import { SuggestionSlice, createSuggestionSlice } from './slices/suggestion.slice';
import { UISlice, createUISlice } from './slices/ui.slice'; // インポート
import { TrackerManager } from '@/services/tracker/tracker-manager';

export type AppStore = ChatSlice & CharacterSlice & PersonaSlice & MemorySlice & TrackerSlice & HistorySlice & SettingsSlice & SuggestionSlice & UISlice & {
  apiManager: APIManager;
  promptBuilderService: PromptBuilderService;
}; // 追加

const combinedSlices: StateCreator<AppStore, [], [], AppStore> = (...args) => ({
  ...createChatSlice(...args),
  ...createCharacterSlice(...args),
  ...createPersonaSlice(...args),
  ...createMemorySlice(...args),
  ...createTrackerSlice(...args),
  ...createHistorySlice(...args),
  ...createSettingsSlice(...args),
  ...createSuggestionSlice(...args),
  ...createUISlice(...args), // 追加
  apiManager: apiManager,
  promptBuilderService: promptBuilderService,
});

export const useAppStore = create<AppStore>()(
  persist(
    combinedSlices,
    {
      name: 'ai-chat-v3-storage',
      storage: createJSONStorage(() => localStorage, {
        replacer: (key, value) => {
          if (value instanceof Map) {
            return { _type: 'map', value: Array.from(value.entries()) };
          }
          if (value instanceof Set) {
            return { _type: 'set', value: Array.from(value.values()) };
          }
          if (value instanceof TrackerManager) {
            return { _type: 'TrackerManager', value: { trackerSets: value.getTrackerSetsAsObject() } };
          }
          return value;
        },
        reviver: (key, value) => {
            if (value && value._type === 'map') {
                // Restore TrackerManager instances correctly
                if (key === 'trackerManagers') {
                    const restoredMap = new Map();
                    for (const [k, v] of value.value) {
                        const manager = new TrackerManager();
                        if (v && v.value) { // Check if v.value exists
                            manager.loadFromObject(v.value);
                        }
                        restoredMap.set(k, manager);
                    }
                    return restoredMap;
                }
                return new Map(value.value);
            }
            if (value && value._type === 'set') {
                return new Set(value.value);
            }
            return value;
        },
      }),
      version: 1, // 新しいバージョン番号
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          // version 0から1へのマイグレーション
          // 今回は単純にcharactersのキャッシュをクリアする
          const state = persistedState as Record<string, unknown>;
          state.characters = new Map();
          state.isCharactersLoaded = false;
          return state;
        }
        return persistedState;
      },
      // Only persist state, not actions (functions)
      partialize: (state) => ({
        // sessions
        sessions: state.sessions,
        active_session_id: state.active_session_id,
        // personas
        personas: state.personas,
        activePersonaId: state.activePersonaId,
        // settings
        apiConfig: state.apiConfig,
        openRouterApiKey: state.openRouterApiKey,
        systemPrompts: state.systemPrompts, // ★ 永続化の対象に追加
        enableSystemPrompt: state.enableSystemPrompt,
        enableJailbreakPrompt: state.enableJailbreakPrompt,
        chat: state.chat,
        voice: state.voice,
        imageGeneration: state.imageGeneration,
      }),
    }
  )
);
