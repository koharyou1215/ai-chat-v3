import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ChatSlice, createChatSlice } from "./slices/chat.slice";
import { GroupChatSlice, createGroupChatSlice } from "./slices/groupChat.slice";
import { CharacterSlice, createCharacterSlice } from "./slices/character.slice";
import { PersonaSlice, createPersonaSlice } from "./slices/persona.slice";
import { MemorySlice, createMemorySlice } from "./slices/memory.slice";
import { TrackerSlice, createTrackerSlice } from "./slices/tracker.slice";
import {
  simpleAPIManagerV2,
  SimpleAPIManagerV2,
} from "@/services/simple-api-manager-v2";
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
import { TrackerManager } from "@/services/tracker/tracker-manager";
import { StateCreator } from "zustand";
import { StorageCleaner } from "@/utils/storage-cleaner";
import { initializeModelMigration, migrateModelName } from "@/utils/model-migration";

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
    apiManager: SimpleAPIManagerV2;
    promptBuilderService: PromptBuilderService;
    [key: string]: unknown; // Add index signature for generic operations
  };

const combinedSlices: StateCreator<AppStore, [], [], AppStore> = (
  set,
  get,
  api
) => {
  // 安全なget関数を作成
  const safeGet = () => {
    try {
      return get();
    } catch (error) {
      console.error("Error in safeGet:", error);
      return {} as AppStore;
    }
  };

  return {
    ...createChatSlice(set, safeGet, api),
    ...createGroupChatSlice(set, safeGet, api),
    ...createCharacterSlice(set, safeGet, api),
    ...createPersonaSlice(set, safeGet, api),
    ...createMemorySlice(set, safeGet, api),
    ...createTrackerSlice(set, safeGet, api),
    ...createHistorySlice(set, safeGet, api),
    ...createSettingsSlice(set, safeGet, api),
    ...createSuggestionSlice(set, safeGet, api),
    ...createUISlice(set, safeGet, api),
    apiManager: simpleAPIManagerV2,
    promptBuilderService: promptBuilderService,
  };
};

// Safari互換性のため、persist なしでも動作するようにフォールバック
const createStore = () => {
  try {
    return create<AppStore>()(
      persist(combinedSlices, {
        name: "ai-chat-v3-storage",
        storage: createJSONStorage(
          () => ({
            getItem: (name: string) => {
              try {
                // Safari互換性チェック
                if (
                  typeof window === "undefined" ||
                  typeof localStorage === "undefined"
                )
                  return null;

                // Safari でlocalStorageが無効な場合をハンドル
                if (!window.localStorage) return null;

                const item = window.localStorage.getItem(name);
                if (!item) {
                  return null;
                }

                // JSONの基本的な検証
                if (!item.startsWith("{") && !item.startsWith("[")) {
                  console.warn("Invalid JSON format in localStorage, clearing");
                  localStorage.removeItem(name);
                  return null;
                }

                // 設定関連のデバッグ情報と追加検証
                if (name === "ai-chat-v3-storage") {
                  try {
                    const parsed = JSON.parse(item);
                    if (!parsed || typeof parsed !== "object") {
                      console.warn("Invalid storage data structure, clearing");
                      localStorage.removeItem(name);
                      return null;
                    }

                    // 🔧 モデル移行処理：読み込み時に古いモデル名を自動修正
                    if (parsed.state?.apiConfig?.model) {
                      const currentModel = parsed.state.apiConfig.model;
                      const migratedModel = migrateModelName(currentModel);
                      
                      if (currentModel !== migratedModel) {
                        console.log(`🔄 Auto-migrating model: ${currentModel} → ${migratedModel}`);
                        parsed.state.apiConfig.model = migratedModel;
                        
                        // 修正された設定を即座に保存
                        try {
                          localStorage.setItem(name, JSON.stringify(parsed));
                          console.log("✅ Auto-migration saved to localStorage");
                        } catch (saveError) {
                          console.error("Failed to save auto-migrated settings:", saveError);
                        }
                      }
                    }

                    // 設定が確実に保存されるよう、stateが存在することを確認
                    if (!parsed.state) {
                      console.warn("Missing state in stored data");
                      return null;
                    }
                  } catch (parseErr) {
                    console.error(
                      "Failed to parse stored settings, clearing corrupted data:",
                      parseErr
                    );
                    localStorage.removeItem(name);
                    return null;
                  }
                }

                return item;
              } catch (error) {
                console.error("Error reading from localStorage:", error);
                return null;
              }
            },
            setItem: (name: string, value: string) => {
              try {
                // Safari互換性チェック
                if (
                  typeof window === "undefined" ||
                  typeof localStorage === "undefined"
                )
                  return;
                if (!window.localStorage) return;

                // 🔧 保存前のモデル名チェック：古いモデル名の保存を防止
                if (name === "ai-chat-v3-storage") {
                  try {
                    const parsed = JSON.parse(value);
                    if (parsed.state?.apiConfig?.model) {
                      const currentModel = parsed.state.apiConfig.model;
                      const migratedModel = migrateModelName(currentModel);
                      
                      if (currentModel !== migratedModel) {
                        console.log(`🔄 Preventing save of old model: ${currentModel} → ${migratedModel}`);
                        parsed.state.apiConfig.model = migratedModel;
                        value = JSON.stringify(parsed);
                      }
                    }
                  } catch (modelCheckError) {
                    console.error("Model check error during save:", modelCheckError);
                  }
                }

                // サイズチェック - 5MB制限 (localStorage limit is typically 5-10MB)
                const sizeInBytes = new Blob([value]).size;
                const sizeInMB = sizeInBytes / (1024 * 1024);

                if (sizeInMB > 2) {
                  // 2MB制限でより安全に

                  // 古いセッションデータをクリーンアップ
                  try {
                    const parsed = JSON.parse(value);
                    if (parsed?.state?.sessions) {
                      const sessions = parsed.state.sessions;
                      if (
                        sessions instanceof Map ||
                        (sessions._type === "map" && sessions.value)
                      ) {
                        const sessionEntries =
                          sessions instanceof Map
                            ? Array.from(sessions.entries())
                            : sessions.value;

                        // セッション数を制限（最新の5セッションのみ保持）
                        if (sessionEntries.length > 5) {
                          const sortedSessions = sessionEntries
                            .sort((a, b) => {
                              const aTime =
                                a[1]?.updatedAt || a[1]?.createdAt || 0;
                              const bTime =
                                b[1]?.updatedAt || b[1]?.createdAt || 0;
                              return bTime - aTime;
                            })
                            .slice(0, 5);

                          if (sessions instanceof Map) {
                            parsed.state.sessions = new Map(sortedSessions);
                          } else {
                            parsed.state.sessions = {
                              _type: "map",
                              value: sortedSessions,
                            };
                          }
                        }
                      }
                    }

                    // メモリカードもクリーンアップ（最新の50件のみ保持）
                    if (
                      parsed?.state?.memoryCards &&
                      Array.isArray(parsed.state.memoryCards)
                    ) {
                      if (parsed.state.memoryCards.length > 50) {
                        parsed.state.memoryCards = parsed.state.memoryCards
                          .sort(
                            (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
                          )
                          .slice(0, 50);
                      }
                    }

                    // グループセッションもクリーンアップ
                    if (parsed?.state?.groupSessions) {
                      const groupSessions = parsed.state.groupSessions;
                      if (
                        groupSessions instanceof Map ||
                        (groupSessions._type === "map" && groupSessions.value)
                      ) {
                        const groupEntries =
                          groupSessions instanceof Map
                            ? Array.from(groupSessions.entries())
                            : groupSessions.value;
                        if (groupEntries.length > 3) {
                          const sortedGroups = groupEntries
                            .sort((a, b) => {
                              const aTime =
                                a[1]?.updated_at || a[1]?.created_at || 0;
                              const bTime =
                                b[1]?.updated_at || b[1]?.created_at || 0;
                              return bTime - aTime;
                            })
                            .slice(0, 3);

                          if (groupSessions instanceof Map) {
                            parsed.state.groupSessions = new Map(sortedGroups);
                          } else {
                            parsed.state.groupSessions = {
                              _type: "map",
                              value: sortedGroups,
                            };
                          }
                        }
                      }
                    }

                    value = JSON.stringify(parsed);
                    const newSizeInMB = new Blob([value]).size / (1024 * 1024);
                  } catch (cleanupError) {
                    console.error(
                      "Failed to cleanup storage data:",
                      cleanupError
                    );
                  }
                }

                // JSON形式の検証と保存前検証
                try {
                  const parsed = JSON.parse(value);
                  if (!parsed || typeof parsed !== "object") {
                    console.error(
                      "Invalid data structure, refusing to save:",
                      name
                    );
                    return;
                  }

                  // 設定関連のデバッグ情報
                  if (name === "ai-chat-v3-storage") {
                    console.log("🔧 Settings saved successfully", {
                      size: `${(sizeInBytes / 1024).toFixed(2)}KB`,
                      hasSystemPrompts:
                        parsed.state?.systemPrompts !== undefined,
                      hasAPIConfig: parsed.state?.apiConfig !== undefined,
                      model: parsed.state?.apiConfig?.model || 'unknown',
                      hasEnableFlags:
                        parsed.state?.enableSystemPrompt !== undefined,
                    });
                  }
                } catch (parseErr) {
                  console.error(
                    "Invalid JSON value, refusing to save:",
                    parseErr
                  );
                  return;
                }

                window.localStorage.setItem(name, value);

                // デバッグ: 保存直後に確認
                const verification = window.localStorage.getItem(name);
                if (!verification) {
                  console.error(
                    "❌ Data was not saved to localStorage despite no error!"
                  );
                } else {
                  const verifySize =
                    new Blob([verification]).size / (1024 * 1024);
                  if (Math.abs(verifySize - sizeInMB) > 0.01) {
                  }
                }
              } catch (error) {
                if (
                  error instanceof DOMException &&
                  error.name === "QuotaExceededError"
                ) {
                  console.error(
                    "🚨 LocalStorage quota exceeded! Attempting emergency cleanup..."
                  );

                  // StorageCleanerを使用して効率的なクリーンアップ
                  try {
                    StorageCleaner.cleanupLocalStorage();

                    // 再試行
                    window.localStorage.setItem(name, value);
                  } catch (retryError) {
                    console.error(
                      "❌ Emergency cleanup failed, trying more aggressive cleanup:",
                      retryError
                    );

                    // より激しいクリーンアップ
                    try {
                      StorageCleaner.emergencyReset();
                      window.localStorage.setItem(name, value);
                    } catch (finalError) {
                      console.error(
                        "❌ All cleanup attempts failed:",
                        finalError
                      );
                    }
                  }
                } else {
                  console.error("Error writing to localStorage:", error);
                }
              }
            },
            removeItem: (name: string) => {
              try {
                if (
                  typeof window === "undefined" ||
                  typeof localStorage === "undefined"
                )
                  return;
                if (!window.localStorage) return;
                window.localStorage.removeItem(name);
              } catch (error) {
                console.error("Error removing from localStorage:", error);
              }
            },
          }),
          {
            replacer: (key, value) => {
              if (value instanceof Map) {
                return { _type: "map", value: Array.from(value.entries()) };
              }
              if (value instanceof Set) {
                return { _type: "set", value: Array.from(value.values()) };
              }
              if (value instanceof TrackerManager) {
                return {
                  _type: "TrackerManager",
                  value: { trackerSets: value.getTrackerSetsAsObject() },
                };
              }
              return value;
            },
            reviver: (key, value) => {
              if (value && value._type === "map") {
                // Restore TrackerManager instances correctly
                if (key === "trackerManagers") {
                  const restoredMap = new Map();
                  for (const [k, v] of value.value) {
                    const manager = new TrackerManager();
                    if (v && v.value) {
                      // Check if v.value exists
                      manager.loadFromObject(v.value);
                    }
                    restoredMap.set(k, manager);
                  }
                  return restoredMap;
                }
                return new Map(value.value);
              }
              if (value && value._type === "set") {
                return new Set(value.value);
              }
              return value;
            },
          }
        ),
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
      })
    );
  } catch (error) {
    console.error(
      "Failed to create persisted store, falling back to non-persistent store:",
      error
    );
    // persistが失敗した場合は永続化なしで作成
    return create<AppStore>()(combinedSlices);
  }
};

// ストアの初期化を安全に行う
let useAppStore: ReturnType<typeof createStore>;

// 🔧 モデル移行処理を初期化時に実行
if (typeof window !== 'undefined') {
  try {
    console.log('🔄 Initializing model migration system...');
    const migrationResult = initializeModelMigration();
    
    if (migrationResult.migrated) {
      console.log('✅ Model migration completed during store initialization');
      
      if (migrationResult.oldModel && migrationResult.newModel) {
        console.log(`   Migrated: ${migrationResult.oldModel} → ${migrationResult.newModel}`);
      }
    }
    
    if (migrationResult.errors.length > 0) {
      console.error('⚠️ Migration errors during initialization:', migrationResult.errors);
    }
  } catch (migrationError) {
    console.error('❌ Failed to initialize model migration:', migrationError);
  }
}

// 永続化付きストアを作成（失敗時はフォールバック）
try {
  useAppStore = createStore();

  // ストアが正しく動作するかテスト
  if (typeof useAppStore.getState !== "function") {
    throw new Error("Store getState method is not available");
  }

  const testState = useAppStore.getState();
  if (!testState || typeof testState !== "object") {
    throw new Error("Store state is invalid");
  }

  console.log("✅ Persisted store initialized successfully");
} catch (error) {
  console.error("⚠️ Failed to create persisted store, falling back to basic store:", error);
  // フォールバック: 永続化なしのストアを作成
  try {
    useAppStore = create<AppStore>()(combinedSlices);
    console.log("⚠️ Using non-persisted store as fallback");
  } catch (fallbackError) {
    console.error("❌ Critical error: Could not create any store", fallbackError);
    // 最後の手段：最小限のストア
    useAppStore = create<AppStore>()((set, get) => ({
      // Provide minimal implementations of all AppStore methods
      ...combinedSlices(set, get, { name: 'fallback', persist: () => {}, getOptions: () => ({}) }),
      // Override critical properties with safe defaults
      sessions: new Map(),
      active_session_id: null,
      characters: new Map(),
      personas: new Map(),
      selectedCharacterId: null,
      isCharactersLoaded: false,
      isPersonasLoaded: false,
      apiManager: simpleAPIManagerV2,
      promptBuilderService: promptBuilderService,
    }));
  }
}

export { useAppStore };