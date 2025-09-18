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
import {
  generateSessionId,
  generateWelcomeMessageId,
} from "@/utils/uuid";

export interface SessionManagement {
  createSession: (character: Character, persona: Persona) => Promise<UUID>;
  setActiveSessionId: (sessionId: UUID | null) => void;
  deleteSession: (sessionId: UUID) => void;
  clearAllSessions: () => void;
  updateSession: (session: Partial<UnifiedChatSession> & { id: UUID }) => void;
  clearActiveConversation: () => void;
  exportActiveConversation: () => void;
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
    const sessionId = generateSessionId();

    // 🔧 修正: トラッカーマネージャーをキャラクターIDで管理
    const trackerManagers = get().trackerManagers;
    let trackerManager: any;
    
    // キャラクターごとにトラッカーマネージャーを管理
    if (!trackerManagers.has(character.id)) {
      const { TrackerManager } = await import(
        "@/services/tracker/tracker-manager"
      );
      trackerManager = new TrackerManager();
      trackerManager.initializeTrackerSet(character.id, character.trackers);
      trackerManagers.set(character.id, trackerManager);
    } else {
      trackerManager = trackerManagers.get(character.id)!;
    }

    const newSession: UnifiedChatSession = {
      id: sessionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      participants: {
        user: persona,
        characters: [character],
        active_character_ids: new Set([character.id]),
      },
      messages: [
        {
          id: generateWelcomeMessageId(),
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
        current_emotion: { emotion: "neutral", intensity: 0.5, confidence: 0.8 },
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
    };

    set((state) => {
      const newSessions = createMapSafely(state.sessions).set(
        newSession.id,
        newSession
      );
      const newTrackerManagers = createMapSafely(state.trackerManagers).set(
        character.id,
        trackerManager
      );

      return {
        sessions: newSessions,
        trackerManagers: newTrackerManagers,
        active_session_id: newSession.id,
      };
    });

    return newSession.id;
  },

  setActiveSessionId: (sessionId) => {
    if (sessionId) {
      const session = getSessionSafely(get().sessions, sessionId);
      if (session) {
        // 🔧 修正: キャラクターごとのトラッカーマネージャー確認
        const trackerManagers = get().trackerManagers;
        const character = session.participants.characters[0];
        
        if (character && !trackerManagers.has(character.id)) {
          // Async import in a sync function - defer initialization
          import("@/services/tracker/tracker-manager").then(({ TrackerManager }) => {
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
          });
        }
        
        set({ active_session_id: sessionId });
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
        newActiveSessionId = newSessions.keys().next().value || null;
      }

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

    const exportData = {
      session_id: activeSession.id,
      title: activeSession.session_info.title,
      created_at: activeSession.created_at,
      character: activeSession.participants.characters[0]?.name,
      messages: activeSession.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
        character: msg.character_name,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${activeSession.session_info.title}-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      const response = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      });

      if (!response.ok) throw new Error("Failed to save history");
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
        sessions: createMapSafely(state.sessions).set(
          session_id,
          sessionData
        ),
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

      const updatedSession = { ...session, isPinned };
      const newSessions = createMapSafely(state.sessions).set(
        session_id,
        updatedSession
      );

      // APIに更新を送信
      fetch("/api/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: session_id, updates: { isPinned } }),
      }).catch((error) => {
        console.error("Error updating pin status:", error);
      });

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