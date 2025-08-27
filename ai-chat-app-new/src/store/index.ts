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

// Safari互換性のため、persist なしでも動作するようにフォールバック
const createStore = () => {
  try {
    return create<AppStore>()(
      persist(
        combinedSlices,
        {
          name: 'ai-chat-v3-storage',
          storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          try {
            // Safari互換性チェック
            if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
            
            // Safari でlocalStorageが無効な場合をハンドル
            if (!window.localStorage) return null;
            
            const item = window.localStorage.getItem(name);
            if (!item) {
              console.log(`📦 No stored data found for key: ${name}`);
              return null;
            }
            
            // JSONの基本的な検証
            if (!item.startsWith('{') && !item.startsWith('[')) {
              console.warn('Invalid JSON format in localStorage, clearing:', name);
              localStorage.removeItem(name);
              return null;
            }
            
            // 設定関連のデバッグ情報と追加検証
            if (name === 'ai-chat-v3-storage') {
              try {
                const parsed = JSON.parse(item);
                if (!parsed || typeof parsed !== 'object') {
                  console.warn('Invalid storage data structure, clearing:', name);
                  localStorage.removeItem(name);
                  return null;
                }
                console.log('🔄 Loading persisted settings:', {
                  hasApiConfig: !!parsed.state?.apiConfig,
                  hasVoice: !!parsed.state?.voice,
                  maxTokens: parsed.state?.apiConfig?.max_tokens,
                  voiceProvider: parsed.state?.voice?.provider
                });
              } catch (parseErr) {
                console.warn('Failed to parse stored settings, clearing corrupted data:', parseErr);
                localStorage.removeItem(name);
                return null;
              }
            }
            
            return item;
          } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
          }
        },
        setItem: (name: string, value: string) => {
          try {
            // Safari互換性チェック
            if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
            if (!window.localStorage) return;
            
            // サイズチェック - 5MB制限 (localStorage limit is typically 5-10MB)
            const sizeInBytes = new Blob([value]).size;
            const sizeInMB = sizeInBytes / (1024 * 1024);
            
            if (sizeInMB > 4) { // 4MB制限で安全マージンを確保
              console.warn(`🚨 Storage size too large: ${sizeInMB.toFixed(2)}MB. Attempting cleanup...`);
              
              // 古いセッションデータをクリーンアップ
              try {
                const parsed = JSON.parse(value);
                if (parsed?.state?.sessions) {
                  const sessions = parsed.state.sessions;
                  if (sessions instanceof Map || (sessions._type === 'map' && sessions.value)) {
                    const sessionEntries = sessions instanceof Map ? Array.from(sessions.entries()) : sessions.value;
                    
                    // セッション数を制限（最新の10セッションのみ保持）
                    if (sessionEntries.length > 10) {
                      const sortedSessions = sessionEntries
                        .sort((a, b) => {
                          const aTime = a[1]?.updatedAt || a[1]?.createdAt || 0;
                          const bTime = b[1]?.updatedAt || b[1]?.createdAt || 0;
                          return bTime - aTime;
                        })
                        .slice(0, 10);
                      
                      if (sessions instanceof Map) {
                        parsed.state.sessions = new Map(sortedSessions);
                      } else {
                        parsed.state.sessions = { _type: 'map', value: sortedSessions };
                      }
                    }
                  }
                }
                
                // メモリカードもクリーンアップ（最新の100件のみ保持）
                if (parsed?.state?.memoryCards && Array.isArray(parsed.state.memoryCards)) {
                  if (parsed.state.memoryCards.length > 100) {
                    parsed.state.memoryCards = parsed.state.memoryCards
                      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                      .slice(0, 100);
                  }
                }
                
                value = JSON.stringify(parsed);
                const newSizeInMB = new Blob([value]).size / (1024 * 1024);
                console.log(`🧹 Cleaned up storage: ${sizeInMB.toFixed(2)}MB → ${newSizeInMB.toFixed(2)}MB`);
              } catch (cleanupError) {
                console.error('Failed to cleanup storage data:', cleanupError);
              }
            }
            
            // JSON形式の検証と保存前検証
            try {
              const parsed = JSON.parse(value);
              if (!parsed || typeof parsed !== 'object') {
                console.error('Invalid data structure, refusing to save:', name);
                return;
              }
              
              // 設定関連のデバッグ情報
              if (name === 'ai-chat-v3-storage') {
                console.log('💾 Saving settings to localStorage:', {
                  hasApiConfig: !!parsed.state?.apiConfig,
                  hasVoice: !!parsed.state?.voice,
                  maxTokens: parsed.state?.apiConfig?.max_tokens,
                  voiceProvider: parsed.state?.voice?.provider,
                  sizeInMB: sizeInMB.toFixed(2)
                });
              }
            } catch (parseErr) {
              console.error('Invalid JSON value, refusing to save:', parseErr);
              return;
            }
            
            window.localStorage.setItem(name, value);
            console.log(`✅ Successfully saved to localStorage: ${name} (${sizeInMB.toFixed(2)}MB)`);
          } catch (error) {
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
              console.error('🚨 LocalStorage quota exceeded! Attempting emergency cleanup...');
              
              // 緊急クリーンアップ: 古いデータを削除
              try {
                // 他のlocalStorageキーもチェックして古いものを削除
                for (let i = localStorage.length - 1; i >= 0; i--) {
                  const key = localStorage.key(i);
                  if (key && key.startsWith('ai-chat-v3-') && key !== name) {
                    localStorage.removeItem(key);
                    console.log(`🗑️ Removed old storage key: ${key}`);
                  }
                }
                
                // 再試行
                window.localStorage.setItem(name, value);
                console.log('✅ Emergency cleanup successful, data saved');
              } catch (retryError) {
                console.error('❌ Emergency cleanup failed, data not saved:', retryError);
                // ユーザーに通知
                if (typeof window !== 'undefined' && window.alert) {
                  window.alert('ストレージ容量が不足しています。ブラウザのキャッシュをクリアしてください。');
                }
              }
            } else {
              console.error('Error writing to localStorage:', error);
            }
          }
        },
        removeItem: (name: string) => {
          try {
            if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
            if (!window.localStorage) return;
            window.localStorage.removeItem(name);
          } catch (error) {
            console.error('Error removing from localStorage:', error);
          }
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
        languageSettings: state.languageSettings,
        effectSettings: state.effectSettings,
        
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
  } catch (error) {
    console.error('Failed to create persisted store, falling back to non-persistent store:', error);
    // persistが失敗した場合は永続化なしで作成
    return create<AppStore>()(combinedSlices);
  }
};

export const useAppStore = createStore();
