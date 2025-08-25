import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ChatSlice, createChatSlice } from './slices/chat.slice';
import { GroupChatSlice, createGroupChatSlice } from './slices/groupChat.slice';
import { CharacterSlice, createCharacterSlice } from './slices/character.slice';
import { PersonaSlice, createPersonaSlice } from './slices/persona.slice';
import { MemorySlice, createMemorySlice } from './slices/memory.slice';
import { TrackerSlice, createTrackerSlice } from './slices/tracker.slice';
import { apiManager, APIManager } from '@/services/api-manager';
import { promptBuilderService, PromptBuilderService } from '@/services/prompt-builder.service';
import { HistorySlice, createHistorySlice } from './slices/history.slice';
import { SettingsSlice, createSettingsSlice } from './slices/settings.slice';
import { SuggestionSlice, createSuggestionSlice } from './slices/suggestion.slice';
import { UISlice, createUISlice } from './slices/ui.slice';
import { TrackerManager } from '@/services/tracker/tracker-manager';
import { StateCreator } from 'zustand';

export type AppStore = ChatSlice & GroupChatSlice & CharacterSlice & PersonaSlice & MemorySlice & TrackerSlice & HistorySlice & SettingsSlice & SuggestionSlice & UISlice & {
  apiManager: APIManager;
  promptBuilderService: PromptBuilderService;
}; // 追加

const combinedSlices: StateCreator<AppStore, [], [], AppStore> = (...args) => ({
  ...createChatSlice(...args),
  ...createGroupChatSlice(...args),
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
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          try {
            // SSR環境ではlocalStorageを使用できないため、チェックを追加
            if (typeof window === 'undefined') return null;
            const item = localStorage.getItem(name);
            if (!item) return null;
            // JSONの基本的な検証
            if (!item.startsWith('{') && !item.startsWith('[')) {
              console.warn('Invalid JSON format in localStorage, clearing:', name);
              localStorage.removeItem(name);
              return null;
            }
            return item;
          } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
          }
        },
        setItem: (name: string, value: string) => {
          try {
            // SSR環境ではlocalStorageを使用できないため、チェックを追加
            if (typeof window === 'undefined') return;
            // JSON形式の検証
            JSON.parse(value);
            localStorage.setItem(name, value);
          } catch (error) {
            console.error('Error writing to localStorage:', error);
          }
        },
        removeItem: (name: string) => {
          if (typeof window === 'undefined') return;
          localStorage.removeItem(name);
        }
      }), {
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
      // UI状態はハイドレーション問題を避けるため永続化しない
      partialize: (state) => ({
        // Chat sessions
        sessions: state.sessions,
        active_session_id: state.active_session_id,
        trackerManagers: state.trackerManagers,
        
        // Group Chat sessions
        groupSessions: state.groupSessions,
        active_group_session_id: state.active_group_session_id,
        is_group_mode: state.is_group_mode,
        // Note: showCharacterReselectionModal is not persisted (UI state)

        // Characters and Personas
        characters: state.characters,
        selectedCharacterId: state.selectedCharacterId,
        personas: state.personas,
        activePersonaId: state.activePersonaId,
        
        // Settings - all settings for persistence
        apiConfig: state.apiConfig,
        openRouterApiKey: state.openRouterApiKey,
        systemPrompts: state.systemPrompts,
        enableSystemPrompt: state.enableSystemPrompt,
        enableJailbreakPrompt: state.enableJailbreakPrompt,
        chat: state.chat,
        voice: state.voice,
        imageGeneration: state.imageGeneration,
        
        // Memory System
        memories: state.memories,
        memoryCards: state.memory_cards,
        memoryLayers: state.memoryLayers,
        
        // Suggestion Data
        suggestions: state.suggestions,
        suggestionData: state.suggestionData,
        
        // UI状態は永続化しない（ハイドレーション問題回避のため）
        // isLeftSidebarOpen: false, // 常にfalseで初期化
        // isRightPanelOpen: false, // 常にfalseで初期化
      }),
    }
  )
);
