import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ChatSlice, createChatSlice } from "./slices/chat.slice";
import { GroupChatSlice, createGroupChatSlice } from "./slices/groupChat.slice";
import { CharacterSlice, createCharacterSlice } from "./slices/character.slice";
import { PersonaSlice, createPersonaSlice } from "./slices/persona.slice";
import { MemorySlice, createMemorySlice } from "./slices/memory.slice";
import { TrackerSlice, createTrackerSlice } from "./slices/tracker.slice";
import { apiManager, APIManager } from "@/services/api-manager";
import {
  promptBuilderService,
  PromptBuilderService,
} from "@/services/prompt-builder.service";
import { HistorySlice, createHistorySlice } from "./slices/history.slice";
import { SettingsSlice, createSettingsSlice } from "./slices/settings.slice";
import {
  SuggestionSlice,
  createSuggestionSlice,
} from "./slices/suggestion.slice";
import { UISlice, createUISlice } from "./slices/ui.slice";
import { StateCreator } from "zustand";

export type AppStore = ChatSlice &
  GroupChatSlice &
  CharacterSlice &
  PersonaSlice &
  MemorySlice &
  TrackerSlice &
  HistorySlice &
  SettingsSlice &
  SuggestionSlice &
  UISlice & {
    apiManager: APIManager;
    promptBuilderService: PromptBuilderService;
  };

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
  ...createUISlice(...args),
  apiManager: apiManager,
  promptBuilderService: promptBuilderService,
});

/**
 * 🔧 **Map型安全デシリアライザー**
 * Zustand persistenceからのMap復元処理
 */
const deserializeMapField = (value: any): Map<any, any> | any => {
  if (!value) return new Map();
  
  // 既にMapインスタンスの場合
  if (value instanceof Map) {
    return value;
  }
  
  // 手動シリアライゼーション形式 { _type: 'map', value: [...] }
  if (value && typeof value === 'object' && value._type === 'map' && Array.isArray(value.value)) {
    try {
      return new Map(value.value);
    } catch (error) {
      console.warn('Map deserialization failed:', error);
      return new Map();
    }
  }
  
  // 平坦オブジェクト形式からMap復元
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    try {
      return new Map(Object.entries(value));
    } catch (error) {
      console.warn('Object to Map conversion failed:', error);
      return new Map();
    }
  }
  
  // その他の場合は空Map
  return new Map();
};

const createStore = () => {
  try {
    const options: any = {
      name: "ai-chat-v3-storage",
      storage: typeof window === 'undefined' ? undefined : createJSONStorage(() => window.localStorage),
      version: 1,
      partialize: (state: AppStore) => ({
        sessions: state.sessions,
        active_session_id: state.active_session_id,
        trackerManagers: state.trackerManagers,
        groupSessions: state.groupSessions,
        active_group_session_id: state.active_group_session_id,
        is_group_mode: state.is_group_mode,
        characters: state.characters,
        selectedCharacterId: state.selectedCharacterId,
        personas: state.personas,
        activePersonaId: state.activePersonaId,
        apiConfig: state.apiConfig,
        openRouterApiKey: state.openRouterApiKey,
        geminiApiKey: state.geminiApiKey,
        systemPrompts: state.systemPrompts,
        enableSystemPrompt: state.enableSystemPrompt,
        enableJailbreakPrompt: state.enableJailbreakPrompt,
        chat: state.chat,
        voice: state.voice,
        imageGeneration: state.imageGeneration,
        languageSettings: state.languageSettings,
        effectSettings: state.effectSettings,
        appearanceSettings: state.appearanceSettings,
        emotionalIntelligenceFlags: state.emotionalIntelligenceFlags,
        memory_cards: state.memory_cards,
        suggestions: state.suggestions,
        suggestionData: state.suggestionData,
      }),
      // 🔧 **カスタムデシリアライザー追加 - Map型復元**
      onRehydrateStorage: (name: string) => {
        return (state, error) => {
          if (error) {
            console.error('Store rehydration error:', error);
            return;
          }
          
          if (state) {
            console.log('🔧 Store rehydration - Map型復元処理開始');
            
            // Map型フィールドの復元
            if (state.sessions) {
              state.sessions = deserializeMapField(state.sessions);
              console.log('✅ sessions Map復元完了:', state.sessions instanceof Map ? state.sessions.size : 'failed');
            }
            
            if (state.personas) {
              state.personas = deserializeMapField(state.personas);
              console.log('✅ personas Map復元完了:', state.personas instanceof Map ? state.personas.size : 'failed');
            }
            
            if (state.characters) {
              state.characters = deserializeMapField(state.characters);
              console.log('✅ characters Map復元完了:', state.characters instanceof Map ? state.characters.size : 'failed');
            }
            
            if (state.trackerManagers) {
              state.trackerManagers = deserializeMapField(state.trackerManagers);
              console.log('✅ trackerManagers Map復元完了:', state.trackerManagers instanceof Map ? state.trackerManagers.size : 'failed');
            }
            
            if (state.groupSessions) {
              state.groupSessions = deserializeMapField(state.groupSessions);
              console.log('✅ groupSessions Map復元完了:', state.groupSessions instanceof Map ? state.groupSessions.size : 'failed');
            }
            
            console.log('🔧 Store rehydration - Map型復元処理完了');
          }
        };
      }
    };

    const useStore = create<AppStore>()(persist(combinedSlices, options as any));

    return useStore;
  } catch (error) {
    console.error('Store creation failed, falling back to non-persistent store:', error);
    return create<AppStore>()(combinedSlices);
  }
};

export const useAppStore = createStore();