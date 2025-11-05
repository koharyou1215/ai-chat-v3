import { StateCreator } from "zustand";
import {
  UnifiedChatSession,
  UUID,
  Character,
  Persona,
  UnifiedMessage,
  RetentionPolicy,
} from "@/types";
import { AppStore } from "@/store";
// Import will be done dynamically to avoid circular dependencies
import { getSessionSafely, createMapSafely } from "@/utils/chat/map-helpers";
import { generateStableId } from "@/utils/uuid";

export interface SessionManagement {
  createSession: (character: Character, persona: Persona) => Promise<UUID>;
  setActiveSessionId: (sessionId: UUID | null) => void;
  deleteSession: (sessionId: UUID) => void;
  clearAllSessions: () => void;
  updateSession: (session: Partial<UnifiedChatSession> & { id: UUID }) => void;
  clearActiveConversation: () => void;
  exportActiveConversation: () => void;
  exportSession: (session_id: UUID) => void;
  exportAllSessions: () => void;
  getActiveSession: () => UnifiedChatSession | null;
  getSessionMessages: (session_id: UUID) => UnifiedMessage[];

  // 履歴管理
  saveSessionToHistory: (session_id: UUID) => Promise<void>;
  loadSessionFromHistory: (session_id: UUID) => Promise<void>;
  pinSession: (session_id: UUID, isPinned: boolean) => void;

  // ヘルパー関数
  ensureTrackerManagerExists: (character: Character) => void;
}

export const createSessionManagement: StateCreator<
  AppStore,
  [],
  [],
  SessionManagement
> = (set, get) => ({
  createSession: async (character, persona) => {
    const sessionId = generateStableId('session');

    // 🔧 修正: セッションIDでトラッカーマネージャーを管理
    // 同じキャラクターでも新しいセッションなら必ず新規作成
    const { TrackerManager } = await import(
      "@/services/tracker/tracker-manager"
    );
    const trackerManager = new TrackerManager();
    trackerManager.initializeTrackerSet(character.id, character.trackers);

    const trackerManagers = get().trackerManagers;
    trackerManagers.set(sessionId, trackerManager);  // ← sessionIdで保存

    console.log(
      `🎯 Created new TrackerManager for session: ${sessionId} (character: ${character.name})`
    );

    const newSession: UnifiedChatSession = {
      id: sessionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      metadata: {
        mode: 'single' as const,
        ai_model: 'default',
        temperature: 0.7,
        max_tokens: 2000,
        language: 'ja',
        timezone: 'Asia/Tokyo',
      },
      participants: {
        user: persona,
        characters: [character],
        active_character_ids: new Set([character.id]),
      },
      messages: [
        {
          id: generateStableId('welcome'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
          session_id: sessionId,
          role: "assistant",
          content:
            character.first_message ||
            `こんにちは！${character.name}です。何かお手伝いできることはありますか？`,
          character_id: character.id,
          character_name: character.name,
          memory: {
            importance: {
              score: 0.5,
              factors: {
                emotional_weight: 0.3,
                repetition_count: 0,
                user_emphasis: 0,
                ai_judgment: 0.5,
              },
            },
            is_pinned: false,
            is_bookmarked: false,
            keywords: ["greeting", "introduction"],
            summary: "挨拶メッセージ",
          },
          expression: {
            emotion: { primary: "happy", intensity: 0.8, emoji: "😊" },
            style: { font_weight: "normal", text_color: "#ffffff" },
            effects: [],
          },
          edit_history: [],
          regeneration_count: 0,
          metadata: {},
          is_deleted: false,
        },
      ],
      message_count: 1,
      memory_system: {
        immediate_memory: {
          messages: [],
          max_size: 3,
          retention_policy: "fifo",
          last_accessed: "",
          access_count: 0,
        },
        working_memory: {
          messages: [],
          max_size: 10,
          retention_policy: "importance",
          last_accessed: "",
          access_count: 0,
        },
        episodic_memory: {
          messages: [],
          max_size: 50,
          retention_policy: "hybrid" as RetentionPolicy,
          last_accessed: "",
          access_count: 0,
        },
        semantic_memory: {
          messages: [],
          max_size: 200,
          retention_policy: "importance",
          last_accessed: "",
          access_count: 0,
        },
        permanent_memory: {
          pinned_messages: [],
          memory_cards: [],
          summaries: [],
        },
      },
      state_management: {
        trackers: new Map(),
        mood_state: { current: "neutral", intensity: 0.5 },
      },
      context: {
        session_id: sessionId,
        current_topic: "greeting",
        current_emotion: {
          primary: "neutral",
          intensity: 0.5,
        },
        current_mood: { type: "neutral", intensity: 0.5, stability: 0.8 },
        recent_messages: [],
        recent_topics: [],
        recent_emotions: [],
        relevant_memories: [],
        pinned_memories: [],
        next_likely_topics: [],
        suggested_responses: [],
        context_quality: 1.0,
        coherence_score: 1.0,
      },
      session_info: {
        title: `${character.name}との会話`,
        description: "新しい会話セッション",
        tags: ["new-conversation", character.name.toLowerCase()],
      },
      statistics: {
        message_count: 0,
        start_time: Date.now().toString(),
        end_time: Date.now().toString(),
        duration_seconds: 0,
        user_message_count: 0,
        assistant_message_count: 0,
        average_response_time_ms: 0,
      },
      isPinned: false,
      isArchived: false,
      lastAccessedAt: new Date().toISOString(),
    };

    set((state) => {
      const newSessions = createMapSafely(state.sessions).set(
        newSession.id,
        newSession
      );
      // 🔧 修正: sessionIdでTrackerManagerを保存
      const newTrackerManagers = createMapSafely(state.trackerManagers).set(
        sessionId,  // ← character.id から sessionId に変更
        trackerManager
      );

      // 記憶システムのセッションIDも設定
      const stateWithMemory = state as typeof state & {
        setCurrentSessionId?: (sessionId: UUID) => void;
      };
      if (stateWithMemory.setCurrentSessionId) {
        stateWithMemory.setCurrentSessionId(newSession.id);
      }

      return {
        sessions: newSessions,
        trackerManagers: newTrackerManagers,
        active_session_id: newSession.id,
      };
    });

    return newSession.id;
  },

  setActiveSessionId: (sessionId) => {
    // 記憶システムのセッションIDも同時に設定
    const state = get();
    const stateWithMemory = state as typeof state & {
      setCurrentSessionId?: (sessionId: UUID | null) => void;
    };
    if (stateWithMemory.setCurrentSessionId) {
      stateWithMemory.setCurrentSessionId(sessionId);
    }

    if (sessionId) {
      const session = getSessionSafely(get().sessions, sessionId);
      if (session) {
        // 🔧 修正: キャラクターごとのトラッカーマネージャー確認
        const trackerManagers = get().trackerManagers;
        const character = session.participants.characters[0];

        if (character && !trackerManagers.has(character.id)) {
          // Async import in a sync function - defer initialization
          import("@/services/tracker/tracker-manager").then(
            ({ TrackerManager }) => {
              const trackerManager = new TrackerManager();
              trackerManager.initializeTrackerSet(
                character.id,
                character.trackers
              );
              trackerManagers.set(character.id, trackerManager);

              // TrackerManagersを更新
              set((_state) => ({
                trackerManagers: new Map(trackerManagers),
              }));
            }
          );
        }

        set({ active_session_id: sessionId });

        // 🆕 セッション切り替え時にプロンプトキャッシュをクリア
        // 新しいセッションのトラッカー状態を反映するため
        try {
          const currentState = get();
          if (currentState.clearConversationCache) {
            currentState.clearConversationCache(sessionId);
            console.log(`✅ [setActiveSessionId] Cleared conversation cache for session switch: ${sessionId}`);
          }
        } catch (error) {
          console.warn('Failed to clear conversation cache during session switch:', error);
        }
      } else {
        set({ active_session_id: sessionId });
      }
    } else {
      set({ active_session_id: sessionId });
    }
  },

  deleteSession: (sessionId) => {
    set((state) => {
      const newSessions = createMapSafely(state.sessions);
      newSessions.delete(sessionId);

      let newActiveSessionId = state.active_session_id;
      // If the deleted session was the active one, switch to another session
      if (state.active_session_id === sessionId) {
        // Prioritize switching to a pinned session, then most recent
        const sessionArray = Array.from(newSessions.values());
        if (sessionArray.length > 0) {
          // First try to find a pinned session
          const pinnedSession = sessionArray.find(session => session.isPinned);
          if (pinnedSession) {
            newActiveSessionId = pinnedSession.id;
          } else {
            // Otherwise, get the most recently updated session
            const sortedSessions = sessionArray.sort((a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
            newActiveSessionId = sortedSessions[0].id;
          }
        } else {
          newActiveSessionId = null;
        }
      }

      console.log(`Session ${sessionId} deleted. New active session: ${newActiveSessionId}`);
      return {
        sessions: newSessions,
        active_session_id: newActiveSessionId,
      };
    });
  },

  clearAllSessions: () => {
    set(() => ({
      sessions: new Map(),
      active_session_id: null,
      trackerManagers: new Map(),
    }));
  },

  updateSession: (session) => {
    set((_state) => {
      const targetSession = getSessionSafely(_state.sessions, session.id);
      if (targetSession) {
        const updatedSession = { ...targetSession, ...session };
        const newSessions = createMapSafely(_state.sessions).set(
          session.id,
          updatedSession
        );
        return { sessions: newSessions };
      }
      return _state;
    });
  },

  clearActiveConversation: () => {
    const activeSessionId = get().active_session_id;
    if (!activeSessionId) return;

    const activeSession = getSessionSafely(get().sessions, activeSessionId);
    if (activeSession) {
      // 挨拶メッセージのみ残して他のメッセージをクリア
      const greetingMessage = activeSession.messages[0];
      const clearedSession = {
        ...activeSession,
        messages: [greetingMessage],
        message_count: 1,
        updated_at: new Date().toISOString(),
      };

      set((_state) => ({
        sessions: createMapSafely(_state.sessions).set(
          activeSessionId,
          clearedSession
        ),
      }));
    }
  },

  exportActiveConversation: () => {
    const activeSession = get().getActiveSession();
    if (!activeSession) return;
    get().exportSession(activeSession.id);
  },

  exportSession: (session_id) => {
    const session = getSessionSafely(get().sessions, session_id);
    if (!session) {
      console.error(`Session ${session_id} not found for export`);
      return;
    }

    const exportData = {
      session_id: session.id,
      title: session.session_info.title,
      created_at: session.created_at,
      updated_at: session.updated_at,
      character: session.participants.characters[0]?.name,
      persona: session.participants.user?.name,
      isPinned: session.isPinned,
      isArchived: session.isArchived,
      messageCount: session.messages.length,
      messages: session.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
        character: msg.character_name,
        emotion: msg.expression?.emotion,
      })),
      statistics: session.statistics,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = session.session_info.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `conversation-${safeTitle}-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`Session "${session.session_info.title}" exported successfully`);
  },

  exportAllSessions: () => {
    const sessions = get().sessions;
    if (!sessions || sessions.size === 0) {
      console.log('No sessions to export');
      return;
    }

    const allSessionsData = {
      exportedAt: new Date().toISOString(),
      totalSessions: sessions.size,
      sessions: Array.from(sessions.values()).map(session => ({
        session_id: session.id,
        title: session.session_info.title,
        created_at: session.created_at,
        updated_at: session.updated_at,
        character: session.participants.characters[0]?.name,
        persona: session.participants.user?.name,
        isPinned: session.isPinned,
        isArchived: session.isArchived,
        messageCount: session.messages.length,
        messages: session.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at,
          character: msg.character_name,
          emotion: msg.expression?.emotion,
        })),
        statistics: session.statistics,
      }))
    };

    const blob = new Blob([JSON.stringify(allSessionsData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all-conversations-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`All ${sessions.size} sessions exported successfully`);
  },

  getActiveSession: () => {
    const activeSessionId = get().active_session_id;
    if (!activeSessionId) return null;
    return getSessionSafely(get().sessions, activeSessionId) || null;
  },

  getSessionMessages: (session_id) => {
    const session = getSessionSafely(get().sessions, session_id);
    return session?.messages || [];
  },

  // 履歴管理: セッションを履歴として保存
  saveSessionToHistory: async (session_id) => {
    const session = getSessionSafely(get().sessions, session_id);
    if (!session) return;

    try {
      // Local storage based history management
      const historyKey = `ai-chat-history-${session_id}`;
      const historyData = {
        ...session,
        savedAt: new Date().toISOString(),
        type: 'saved_session'
      };

      localStorage.setItem(historyKey, JSON.stringify(historyData));

      // Update session list in history index
      interface HistoryIndexItem {
        session_id: UUID;
        title: string;
        savedAt: string;
        character_name: string;
        message_count: number;
      }

      const historyIndexKey = 'ai-chat-history-index';
      const existingIndex = localStorage.getItem(historyIndexKey);
      const historyIndex: HistoryIndexItem[] = existingIndex ? JSON.parse(existingIndex) : [];

      // Add session to index if not already present
      if (!historyIndex.find((item) => item.session_id === session_id)) {
        historyIndex.push({
          session_id,
          title: session.session_info.title,
          savedAt: new Date().toISOString(),
          character_name: session.participants.characters[0]?.name || 'Unknown',
          message_count: session.messages.length
        });

        // Keep only the latest 100 history entries
        if (historyIndex.length > 100) {
          historyIndex.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
          historyIndex.splice(100);
        }

        localStorage.setItem(historyIndexKey, JSON.stringify(historyIndex));
      }

      console.log(`Session ${session_id} saved to history successfully`);
    } catch (error) {
      console.error("Error saving session to history:", error);
    }
  },

  // 履歴管理: 履歴からセッションを読み込み
  loadSessionFromHistory: async (session_id) => {
    try {
      const response = await fetch(`/data/history/${session_id}.json`);
      if (!response.ok) throw new Error("History not found");

      const sessionData = await response.json();

      set((state) => ({
        sessions: createMapSafely(state.sessions).set(session_id, sessionData),
        active_session_id: session_id,
      }));
    } catch (error) {
      console.error("Error loading session from history:", error);
    }
  },

  // 履歴管理: セッションのピン留め
  pinSession: (session_id, isPinned) => {
    set((state) => {
      const session = getSessionSafely(state.sessions, session_id);
      if (!session) return state;

      const updatedSession = {
        ...session,
        isPinned,
        updated_at: new Date().toISOString()
      };
      const newSessions = createMapSafely(state.sessions).set(
        session_id,
        updatedSession
      );

      // Update history if session is saved
      try {
        const historyKey = `ai-chat-history-${session_id}`;
        const existingHistory = localStorage.getItem(historyKey);
        if (existingHistory) {
          const historyData = JSON.parse(existingHistory);
          historyData.isPinned = isPinned;
          historyData.updated_at = new Date().toISOString();
          localStorage.setItem(historyKey, JSON.stringify(historyData));
        }
      } catch (error) {
        console.error("Error updating pin status in history:", error);
      }

      console.log(`Session ${session_id} ${isPinned ? 'pinned' : 'unpinned'} successfully`);
      return { sessions: newSessions };
    });
  },

  // ヘルパー関数: トラッカーマネージャーの存在を確保
  ensureTrackerManagerExists: async (character) => {
    const activeSessionId = get().active_session_id;
    if (!activeSessionId) return;

    const trackerManagers = get().trackerManagers;
    // 🔧 修正: キャラクターIDで管理
    const hasTrackerManager = trackerManagers.has(character.id);

    if (!hasTrackerManager) {
      const { TrackerManager } = await import(
        "@/services/tracker/tracker-manager"
      );
      const trackerManager = new TrackerManager();
      trackerManager.initializeTrackerSet(character.id, character.trackers);
      trackerManagers.set(character.id, trackerManager);

      set((_state) => ({
        trackerManagers: new Map(trackerManagers),
      }));
    }
  },
});
