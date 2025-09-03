import { StateCreator } from "zustand";
import {
  BaseMessage,
  Character,
  Persona,
  Session,
  UUID,
  UnifiedMessage,
  EmotionalIntelligenceFlags,
  MessageRequest,
  MemoryCard,
} from "@/types";
import { promptBuilderService } from "@/services/prompt-builder.service";
import { generateSessionName } from "@/utils";
import { APIManager, APIRequest, apiManager } from "@/services/api-manager";
import { apiRequestQueue } from "@/services/api-request-queue";
import { memoryLayerManager } from "@/services/memory/memory-layer-manager";
import { soloEmotionAnalyzer } from "@/services/emotion/SoloEmotionAnalyzer";
import { TrackerManager } from "@/services/tracker/tracker-manager";
import { AppStore } from "..";

export interface ChatSlice {
  session: Session | null;
  sessions: Map<UUID, Session>;
  active_session_id: UUID | null;
  is_generating: boolean;
  last_message_id: UUID | null;
  trackerManagers: Map<UUID, any>;
  createSession: (character: Character, persona: Persona) => Promise<UUID>;
  setActiveSession: (sessionId: UUID) => void;
  getActiveSession: () => Session | null; // 追加: アクティブセッションを取得
  addMessage: (message: UnifiedMessage) => void;
  updateMessage: (messageId: UUID, updates: Partial<UnifiedMessage>) => void;
  generateMessage: (content: string, sessionId?: UUID) => Promise<void>;
  continueGeneration: (sessionId?: UUID) => Promise<void>;
  updateSessionCharacters: (sessionId: UUID, characters: Character[]) => void;
  clearSession: (sessionId?: UUID) => void;
  loadSessions: () => Promise<void>;
  deleteSession: (sessionId: UUID) => void;
  exportChatHistory: () => void;
  importChatHistory: (file: File) => Promise<void>;
  regenerateMessage: (messageId: UUID) => Promise<void>;
  editMessage: (messageId: UUID, newContent: string) => Promise<void>;
  saveSession: (sessionId: UUID) => Promise<void>;
  toggleSessionPin: (sessionId: UUID) => Promise<void>;
  duplicateSession: (sessionId: UUID) => Promise<UUID>;
  getSuggestedResponses: (sessionId?: UUID) => Promise<string[]>;
  // 今日のセッション機能
  getTodaySessionsIds: () => UUID[];
  getTodaySessionsCount: () => number;
  getThisWeekSessionsCount: () => number;
  getThisMonthSessionsCount: () => number;
}

/**
 * セッション名の生成
 */
function generateUniqueSessionName(existingSessions: Session[]): string {
  const today = new Date();
  const dateString = today.toLocaleDateString("ja-JP");
  const timeString = today.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const baseName = `チャット ${dateString} ${timeString}`;

  // 重複チェック
  let counter = 1;
  let finalName = baseName;
  while (existingSessions.some((session) => session.name === finalName)) {
    finalName = `${baseName} (${counter})`;
    counter++;
  }

  return finalName;
}

export const createChatSlice: StateCreator<AppStore, [], [], ChatSlice> = (
  set,
  get
) => {
  // セッション統計計算のヘルパー関数
  const getSessionsByDateRange = (days: number): Session[] => {
    const now = new Date();
    const targetDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return Array.from(get().sessions.values()).filter((session) => {
      const sessionDate = new Date(session.created_at);
      return sessionDate >= targetDate;
    });
  };

  return {
    session: null,
    sessions: new Map(),
    active_session_id: null,
    is_generating: false,
    last_message_id: null,
    trackerManagers: new Map(),

    createSession: async (character, persona) => {
      console.log("🔍 createSession called with:", {
        characterId: character.id,
        characterName: character.name,
        personaId: persona.id,
        personaName: persona.name,
      });

      const sessionId = crypto.randomUUID();
      const existingSessions = Array.from(get().sessions.values());

      const newSession: Session = {
        id: sessionId,
        name: generateUniqueSessionName(existingSessions),
        character,
        persona,
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        memory_layer: {
          immediate_memory: [],
          working_memory: [],
          episodic_memory: [],
          semantic_memory: [],
          permanent_memory: [],
        },
        is_pinned: false,
      };

      console.log("🆕 新しいセッション作成:", {
        id: newSession.id,
        name: newSession.name,
        characterId: newSession.character.id,
        personaId: newSession.persona.id,
      });

      // 🎯 キャラクターのトラッカーマネージャーを初期化
      const trackerManager = new TrackerManager();
      if (character.trackers && character.trackers.length > 0) {
        console.log(
          "🎯 トラッカーマネージャー初期化開始:",
          character.trackers.length,
          "個のトラッカー"
        );
        trackerManager.initializeTrackerSet(character.id, character.trackers);
      }

      set((state) => {
        const newSessions = new Map(state.sessions);
        newSessions.set(sessionId, newSession);

        const newTrackerManagers = new Map(state.trackerManagers);
        newTrackerManagers.set(sessionId, trackerManager);

        return {
          sessions: newSessions,
          session: newSession,
          active_session_id: sessionId,
          last_message_id: null,
          trackerManagers: newTrackerManagers,
        };
      });

      console.log("✅ セッション作成完了:", sessionId);
      return sessionId;
    },

    setActiveSession: (sessionId) => {
      console.log("🔍 setActiveSession called with sessionId:", sessionId);
      const session = get().sessions.get(sessionId);
      if (session) {
        console.log("✅ セッションが見つかりました:", {
          sessionId,
          sessionName: session.name,
          messageCount: session.messages.length,
        });
        set({
          session,
          active_session_id: sessionId,
          last_message_id:
            session.messages.length > 0
              ? session.messages[session.messages.length - 1].id
              : null,
        });
      } else {
        console.error("❌ セッションが見つかりません:", sessionId);
        set({
          session: null,
          active_session_id: null,
          last_message_id: null,
        });
      }
    },

    getActiveSession: () => {
      const { active_session_id, sessions } = get();
      if (!active_session_id) return null;
      return sessions.get(active_session_id) || null;
    },

    addMessage: (message) => {
      const { session, sessions, active_session_id } = get();

      if (!session || !active_session_id) {
        console.error("❌ アクティブなセッションがありません");
        return;
      }

      const updatedSession = {
        ...session,
        messages: [...session.messages, message],
        updated_at: new Date().toISOString(),
      };

      const newSessions = new Map(sessions);
      newSessions.set(active_session_id, updatedSession);

      set({
        session: updatedSession,
        sessions: newSessions,
        last_message_id: message.id,
      });

      console.log(`✅ メッセージ追加: ${message.content.slice(0, 50)}...`);
    },

    updateMessage: (messageId, updates) => {
      const { session, sessions, active_session_id } = get();

      if (!session || !active_session_id) {
        console.error("❌ アクティブなセッションがありません");
        return;
      }

      const updatedMessages = session.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );

      const updatedSession = {
        ...session,
        messages: updatedMessages,
        updated_at: new Date().toISOString(),
      };

      const newSessions = new Map(sessions);
      newSessions.set(active_session_id, updatedSession);

      set({
        session: updatedSession,
        sessions: newSessions,
      });

      console.log(`✅ メッセージ更新: ${messageId}`);
    },

    generateMessage: async (content, sessionId) => {
      console.log("🤖 メッセージ生成開始:", {
        content: content.slice(0, 50),
        sessionId,
      });

      const currentSession = sessionId
        ? get().sessions.get(sessionId)
        : get().session;
      const currentSessionId = sessionId || get().active_session_id;

      if (!currentSession || !currentSessionId) {
        console.error("❌ セッションが見つかりません");
        return;
      }

      try {
        // 生成状態を設定
        set({ is_generating: true });

        // ユーザーメッセージの重複追加を防止（直前にUI側で追加された場合）
        const lastMsg =
          currentSession.messages[currentSession.messages.length - 1];
        let userMessageId = crypto.randomUUID();
        if (
          !(lastMsg && lastMsg.sender === "user" && lastMsg.content === content)
        ) {
          const userMessage: UnifiedMessage = {
            id: userMessageId,
            content,
            sender: "user",
            timestamp: new Date().toISOString(),
            type: "text",
            persona: currentSession.persona,
          };
          // 💾 ストア更新（UI側で先に追加していない時のみ）
          get().addMessage(userMessage);
        } else {
          // 直前のユーザーメッセージを使う
          userMessageId = lastMsg.id;
        }

        // 💾 感情分析を無効化して即座に保存
        const emotionalIntelligenceFlags = get().emotionalIntelligenceFlags;
        if (!emotionalIntelligenceFlags?.emotion_analysis_enabled) {
          // 感情分析が無効の場合のみ即座に保存
          console.log("💾 感情分析無効時の即座保存");
        }

        // 💾 ユーザーメッセージ保存のためのジョブを後で実行
        setTimeout(async () => {
          try {
            console.log("💾 ユーザーメッセージの保存処理開始");

            // 💾 手動保存でMap型を適切に処理
            const currentState = get();
            const serializedState = {
              state: {
                sessions:
                  currentState.sessions instanceof Map
                    ? {
                        _type: "map",
                        value: Array.from(currentState.sessions.entries()),
                      }
                    : currentState.sessions,
                active_session_id: currentState.active_session_id,
                trackerManagers:
                  currentState.trackerManagers instanceof Map
                    ? {
                        _type: "map",
                        value: Array.from(
                          currentState.trackerManagers.entries()
                        ),
                      }
                    : currentState.trackerManagers,
                groupSessions: currentState.groupSessions,
                active_group_session_id: currentState.active_group_session_id,
                is_group_mode: currentState.is_group_mode,
                characters: currentState.characters,
                selectedCharacterId: currentState.selectedCharacterId,
                personas:
                  currentState.personas instanceof Map
                    ? {
                        _type: "map",
                        value: Array.from(currentState.personas.entries()),
                      }
                    : currentState.personas,
                activePersonaId: currentState.activePersonaId,
                apiConfig: currentState.apiConfig,
                memory_cards: currentState.memory_cards,
                effectSettings: currentState.effectSettings,
                emotionalIntelligenceFlags:
                  currentState.emotionalIntelligenceFlags,
              },
              version: 1,
            };

            localStorage.setItem(
              "ai-chat-v3-storage",
              JSON.stringify(serializedState)
            );
            console.log(
              "💾 ユーザーメッセージがローカルストレージに保存されました"
            );
          } catch (error) {
            console.error("❗ ユーザーメッセージの保存に失敗:", error);
          }
        }, 50); // 50ms後に実行

        // 🧠 感情分析: ユーザーメッセージ (バックグラウンド処理)
        if (get().emotionalIntelligenceFlags?.emotion_analysis_enabled) {
          setTimeout(async () => {
            try {
              console.log("🧠 感情分析開始...");
              const currentSession = get().session;
              if (currentSession) {
                const emotionData = await soloEmotionAnalyzer.analyzeMessage(
                  content,
                  currentSession.character,
                  currentSession.persona
                );

                if (emotionData) {
                  console.log("🧠 感情分析完了:", emotionData);

                  // 感情分析結果をメッセージに追加
                  get().updateMessage(userMessageId, {
                    emotion_analysis: emotionData,
                  });
                }
              }
            } catch (error) {
              console.warn("🧠 感情分析でエラーが発生:", error);
            }
          }, 100);
        }

        // API生成リクエスト作成
        const requestId = crypto.randomUUID();
        // プロンプト用メッセージ（UI側で直前に追加済みなら重複させない）
        const lastForPrompt =
          currentSession.messages[currentSession.messages.length - 1];
        const appendUser = !(
          lastForPrompt &&
          lastForPrompt.sender === "user" &&
          lastForPrompt.content === content
        );
        const messages = appendUser
          ? [
              ...currentSession.messages,
              {
                id: userMessageId,
                content,
                sender: "user",
                timestamp: new Date().toISOString(),
                type: "text",
                persona: currentSession.persona,
              } as any,
            ]
          : [...currentSession.messages];

        // プロンプトを構築
        const systemPrompt = await promptBuilderService.buildPrompt(
          currentSession.character,
          currentSession.persona,
          messages
        );

        console.log("🤖 プロンプト構築完了");

        // ベースプロンプトでの最初の生成リクエスト（一部機能を制限）
        const basePrompt = await promptBuilderService.buildSimplePrompt(
          currentSession.character,
          currentSession.persona
        );

        console.log("🤖 API生成リクエスト開始...");

        // API生成リクエスト
        const request: APIRequest = {
          id: requestId,
          type: "chat",
          priority: 1,
          timestamp: Date.now(),
          request: async () => {
            console.log("🤖 API実際のリクエスト処理開始");
            const response = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemPrompt: basePrompt, // 最初はベースプロンプトで開始
                userMessage: content,
                sessionId: currentSessionId,
                characterId: currentSession.character.id,
                personaId: currentSession.persona.id,
                conversation: messages.map((msg, index) => ({
                  role: msg.sender === "user" ? "user" : "assistant",
                  content: msg.content,
                  message_id: msg.id,
                  timestamp: msg.timestamp,
                  index,
                })),
              }),
            });

            console.log("🤖 APIレスポンス受信");

            if (!response.ok) {
              throw new Error(`チャット API エラー: ${response.status}`);
            }

            const data = await response.json();
            console.log("🤖 AIレスポンス:", data.message?.slice(0, 100));

            // AIメッセージを追加
            const aiMessage: UnifiedMessage = {
              id: crypto.randomUUID(),
              content:
                data.message ||
                "申し訳ございませんが、応答を生成できませんでした。",
              sender: "ai",
              timestamp: new Date().toISOString(),
              type: "text",
              character: currentSession.character,
            };

            get().addMessage(aiMessage);

            // 🤖 パフォーマンス最適化: フル機能での再生成をバックグラウンドで実行
            setTimeout(async () => {
              try {
                console.log("🤖 フル機能での再生成開始...");
                const fullResponse = await fetch("/api/chat", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    systemPrompt: systemPrompt, // 完全版を使用
                    userMessage: content,
                    sessionId: currentSessionId,
                    characterId: currentSession.character.id,
                    personaId: currentSession.persona.id,
                    conversation: [...messages, aiMessage].map(
                      (msg, index) => ({
                        role: msg.sender === "user" ? "user" : "assistant",
                        content: msg.content,
                        message_id: msg.id,
                        timestamp: msg.timestamp,
                        index,
                      })
                    ),
                    enhancedMode: true, // フル機能モードを示すフラグ
                  }),
                });

                if (fullResponse.ok) {
                  const fullData = await fullResponse.json();
                  console.log(
                    "🤖 フル機能レスポンス受信:",
                    fullData.message?.slice(0, 100)
                  );

                  // メッセージ内容を更新（より豊富な内容に置き換え）
                  if (
                    fullData.message &&
                    fullData.message !== aiMessage.content
                  ) {
                    get().updateMessage(aiMessage.id, {
                      content: fullData.message,
                    });
                    console.log("🤖 フル機能でのメッセージ更新完了");
                  }
                }
              } catch (fullError) {
                console.warn(
                  "🤖 フル機能での再生成はスキップされました:",
                  fullError
                );
              }
            }, 2000); // 2秒後に実行

            // セッション更新通知
            console.log("✅ メッセージ生成完了");
          },
        };

        await apiRequestQueue.addRequest(request);
      } catch (error) {
        console.error("❌ メッセージ生成エラー:", error);
        set({ is_generating: false });
      } finally {
        set({ is_generating: false });
      }
    },

    continueGeneration: async (sessionId) => {
      console.log("🔄 生成続行開始...", sessionId);

      const currentSession = sessionId
        ? get().sessions.get(sessionId)
        : get().session;
      const currentSessionId = sessionId || get().active_session_id;

      if (!currentSession || !currentSessionId) {
        console.error("❌ セッションが見つかりません");
        return;
      }

      try {
        set({ is_generating: true });

        const lastUserMessage = [...currentSession.messages]
          .reverse()
          .find((msg) => msg.sender === "user");
        if (!lastUserMessage) {
          console.error("❌ ユーザーメッセージが見つかりません");
          return;
        }

        // プロンプトを構築
        const systemPrompt = await promptBuilderService.buildPrompt(
          currentSession.character,
          currentSession.persona,
          currentSession.messages
        );

        console.log("🔄 続行リクエスト開始...");

        const continuePrompt = "先ほどの回答を引き続きお願いします。";

        const requestId = crypto.randomUUID();
        const request: APIRequest = {
          id: requestId,
          type: "continue",
          priority: 1,
          timestamp: Date.now(),
          request: async () => {
            const response = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemPrompt,
                userMessage: continuePrompt,
                sessionId: currentSessionId,
                characterId: currentSession.character.id,
                personaId: currentSession.persona.id,
                conversation: currentSession.messages.map((msg, index) => ({
                  role: msg.sender === "user" ? "user" : "assistant",
                  content: msg.content,
                  message_id: msg.id,
                  timestamp: msg.timestamp,
                  index,
                })),
                continueGeneration: true,
              }),
            });

            if (!response.ok) {
              throw new Error(`続行生成 API エラー: ${response.status}`);
            }

            const data = await response.json();

            // 新しいAIメッセージを追加
            const aiMessage: UnifiedMessage = {
              id: crypto.randomUUID(),
              content: data.message || "続行に失敗しました。",
              sender: "ai",
              timestamp: new Date().toISOString(),
              type: "text",
              character: currentSession.character,
            };

            get().addMessage(aiMessage);
            console.log("✅ 生成続行完了");
          },
        };

        await apiRequestQueue.addRequest(request);
      } catch (error) {
        console.error("❌ 生成続行エラー:", error);
      } finally {
        set({ is_generating: false });
      }
    },

    updateSessionCharacters: (sessionId, characters) => {
      const sessions = get().sessions;
      const targetSession = sessions.get(sessionId);

      if (!targetSession) {
        console.error("❌ セッションが見つかりません:", sessionId);
        return;
      }

      // 最初のキャラクターをメインキャラクターとして設定
      const mainCharacter = characters[0];
      if (!mainCharacter) {
        console.error("❌ キャラクターが指定されていません");
        return;
      }

      const updatedSession = {
        ...targetSession,
        character: mainCharacter,
        updated_at: new Date().toISOString(),
      };

      const newSessions = new Map(sessions);
      newSessions.set(sessionId, updatedSession);

      set({
        sessions: newSessions,
        session:
          get().active_session_id === sessionId
            ? updatedSession
            : get().session,
      });

      console.log("✅ セッションキャラクター更新:", mainCharacter.name);
    },

    clearSession: (sessionId) => {
      const targetSessionId = sessionId || get().active_session_id;
      const sessions = get().sessions;
      const targetSession = sessions.get(targetSessionId!);

      if (!targetSession) {
        console.error("❌ セッションが見つかりません:", targetSessionId);
        return;
      }

      const clearedSession = {
        ...targetSession,
        messages: [],
        updated_at: new Date().toISOString(),
      };

      const newSessions = new Map(sessions);
      newSessions.set(targetSessionId!, clearedSession);

      set({
        sessions: newSessions,
        session:
          get().active_session_id === targetSessionId
            ? clearedSession
            : get().session,
      });

      console.log("🗑️ セッションクリア完了:", targetSessionId);
    },

    loadSessions: async () => {
      console.log("📁 セッション読み込み開始...");

      try {
        const response = await fetch("/api/sessions");
        if (!response.ok) {
          console.error("❌ セッション一覧取得失敗:", response.status);
          return;
        }

        const sessionsData = await response.json();
        console.log("📁 セッションデータ受信:", sessionsData.length);

        const sessionsMap = new Map<UUID, Session>();

        for (const sessionData of sessionsData) {
          const session: Session = {
            id: sessionData.id,
            name: sessionData.name || "無名セッション",
            character: sessionData.character,
            persona: sessionData.persona,
            messages: sessionData.messages || [],
            created_at: sessionData.created_at,
            updated_at: sessionData.updated_at || sessionData.created_at,
            version: sessionData.version || 1,
            memory_layer: sessionData.memory_layer || {
              immediate_memory: [],
              working_memory: [],
              episodic_memory: [],
              semantic_memory: [],
              permanent_memory: [],
            },
            is_pinned: sessionData.is_pinned || false,
          };

          sessionsMap.set(session.id, session);
        }

        set({ sessions: sessionsMap });
        console.log("✅ セッション読み込み完了:", sessionsMap.size);
      } catch (error) {
        console.error("❌ セッション読み込みエラー:", error);
      }
    },

    deleteSession: async (sessionId) => {
      console.log("🗑️ セッション削除開始:", sessionId);

      const sessions = get().sessions;
      const targetSession = sessions.get(sessionId);

      if (!targetSession) {
        console.error("❌ 削除対象セッションが見つかりません:", sessionId);
        return;
      }

      try {
        // サーバーから削除
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          console.error("❌ サーバーセッション削除失敗:", response.status);
          // ローカルからは削除を続行
        }

        // ローカルストアから削除
        const newSessions = new Map(sessions);
        newSessions.delete(sessionId);

        const isActive = get().active_session_id === sessionId;

        set({
          sessions: newSessions,
          session: isActive ? null : get().session,
          active_session_id: isActive ? null : get().active_session_id,
        });

        console.log("✅ セッション削除完了:", sessionId);
      } catch (error) {
        console.error("❌ セッション削除エラー:", error);
      }
    },

    exportChatHistory: () => {
      console.log("📤 チャット履歴エクスポート開始...");

      try {
        const sessions = get().sessions;
        const sessionsArray = Array.from(sessions.values());

        const exportData = {
          version: 1,
          exported_at: new Date().toISOString(),
          sessions: sessionsArray,
          total_sessions: sessionsArray.length,
          total_messages: sessionsArray.reduce(
            (sum, session) => sum + session.messages.length,
            0
          ),
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: "application/json",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `chat-history-${
          new Date().toISOString().split("T")[0]
        }.json`;
        link.click();

        URL.revokeObjectURL(url);
        console.log("✅ エクスポート完了");
      } catch (error) {
        console.error("❌ エクスポートエラー:", error);
      }
    },

    importChatHistory: async (file: File) => {
      console.log("📥 チャット履歴インポート開始...", file.name);

      try {
        const text = await file.text();
        const importData = JSON.parse(text);

        if (!importData.sessions || !Array.isArray(importData.sessions)) {
          throw new Error("無効なファイル形式です");
        }

        const sessionsMap = new Map<UUID, Session>();

        for (const sessionData of importData.sessions) {
          const session: Session = {
            id: sessionData.id || crypto.randomUUID(),
            name: sessionData.name || "インポートされたセッション",
            character: sessionData.character,
            persona: sessionData.persona,
            messages: sessionData.messages || [],
            created_at: sessionData.created_at || new Date().toISOString(),
            updated_at: sessionData.updated_at || new Date().toISOString(),
            version: sessionData.version || 1,
            memory_layer: sessionData.memory_layer || {
              immediate_memory: [],
              working_memory: [],
              episodic_memory: [],
              semantic_memory: [],
              permanent_memory: [],
            },
            is_pinned: sessionData.is_pinned || false,
          };

          sessionsMap.set(session.id, session);
        }

        // 既存セッションに追加
        const existingSessions = get().sessions;
        const mergedSessions = new Map([...existingSessions, ...sessionsMap]);

        set({ sessions: mergedSessions });
        console.log("✅ インポート完了:", sessionsMap.size, "個のセッション");
      } catch (error) {
        console.error("❌ インポートエラー:", error);
        throw error;
      }
    },

    regenerateMessage: async (messageId) => {
      console.log("🔄 メッセージ再生成開始:", messageId);

      const currentSession = get().session;
      const currentSessionId = get().active_session_id;

      if (!currentSession || !currentSessionId) {
        console.error("❌ アクティブなセッションがありません");
        return;
      }

      const targetMessageIndex = currentSession.messages.findIndex(
        (msg) => msg.id === messageId
      );
      if (targetMessageIndex === -1) {
        console.error("❌ 対象メッセージが見つかりません:", messageId);
        return;
      }

      const targetMessage = currentSession.messages[targetMessageIndex];
      if (targetMessage.sender !== "ai") {
        console.error("❌ AIメッセージではありません");
        return;
      }

      try {
        set({ is_generating: true });

        // 対象メッセージより前のメッセージのみを使用
        const previousMessages = currentSession.messages.slice(
          0,
          targetMessageIndex
        );

        // 直前のユーザーメッセージを取得
        const lastUserMessage = [...previousMessages]
          .reverse()
          .find((msg) => msg.sender === "user");
        if (!lastUserMessage) {
          console.error("❌ ユーザーメッセージが見つかりません");
          return;
        }

        // プロンプトを構築
        const systemPrompt = await promptBuilderService.buildPrompt(
          currentSession.character,
          currentSession.persona,
          previousMessages
        );

        const requestId = crypto.randomUUID();
        const request: APIRequest = {
          id: requestId,
          type: "regenerate",
          priority: 1,
          timestamp: Date.now(),
          request: async () => {
            const response = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemPrompt,
                userMessage: lastUserMessage.content,
                sessionId: currentSessionId,
                characterId: currentSession.character.id,
                personaId: currentSession.persona.id,
                conversation: previousMessages.map((msg, index) => ({
                  role: msg.sender === "user" ? "user" : "assistant",
                  content: msg.content,
                  message_id: msg.id,
                  timestamp: msg.timestamp,
                  index,
                })),
                regenerate: true,
              }),
            });

            if (!response.ok) {
              throw new Error(`再生成 API エラー: ${response.status}`);
            }

            const data = await response.json();

            // メッセージ内容を更新
            get().updateMessage(messageId, {
              content: data.message || "再生成に失敗しました。",
              timestamp: new Date().toISOString(),
            });

            console.log("✅ メッセージ再生成完了");
          },
        };

        await apiRequestQueue.addRequest(request);
      } catch (error) {
        console.error("❌ メッセージ再生成エラー:", error);
      } finally {
        set({ is_generating: false });
      }
    },

    editMessage: async (messageId, newContent) => {
      console.log("✏️ メッセージ編集開始:", messageId, newContent.slice(0, 50));

      const currentSession = get().session;
      const currentSessionId = get().active_session_id;

      if (!currentSession || !currentSessionId) {
        console.error("❌ アクティブなセッションがありません");
        return;
      }

      const targetMessageIndex = currentSession.messages.findIndex(
        (msg) => msg.id === messageId
      );
      if (targetMessageIndex === -1) {
        console.error("❌ 対象メッセージが見つかりません:", messageId);
        return;
      }

      try {
        set({ is_generating: true });

        // メッセージ内容を更新
        get().updateMessage(messageId, {
          content: newContent,
          timestamp: new Date().toISOString(),
        });

        // 編集されたメッセージ以降のAIメッセージを削除
        const updatedSession = get().session!;
        const messagesToKeep = updatedSession.messages.slice(
          0,
          targetMessageIndex + 1
        );

        const newSession = {
          ...updatedSession,
          messages: messagesToKeep,
          updated_at: new Date().toISOString(),
        };

        const newSessions = new Map(get().sessions);
        newSessions.set(currentSessionId, newSession);

        set({
          session: newSession,
          sessions: newSessions,
        });

        // 編集後のメッセージがユーザーメッセージの場合、新しいAI応答を生成
        const editedMessage = messagesToKeep[targetMessageIndex];
        if (editedMessage.sender === "user") {
          console.log("🤖 編集後のAI応答生成開始...");

          // プロンプトを構築
          const systemPrompt = await promptBuilderService.buildPrompt(
            newSession.character,
            newSession.persona,
            messagesToKeep.slice(0, targetMessageIndex) // 編集されたメッセージより前のもの
          );

          const requestId = crypto.randomUUID();
          const request: APIRequest = {
            id: requestId,
            type: "edit_response",
            priority: 1,
            timestamp: Date.now(),
            request: async () => {
              const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  message: newContent,
                  systemPrompt,
                  sessionId: currentSessionId,
                  characterId: newSession.character.id,
                  personaId: newSession.persona.id,
                  conversation: messagesToKeep.map((msg, index) => ({
                    role: msg.sender === "user" ? "user" : "assistant",
                    content: msg.content,
                    message_id: msg.id,
                    timestamp: msg.timestamp,
                    index,
                  })),
                }),
              });

              if (!response.ok) {
                throw new Error(`編集応答 API エラー: ${response.status}`);
              }

              const data = await response.json();

              // 新しいAIメッセージを追加
              const aiMessage: UnifiedMessage = {
                id: crypto.randomUUID(),
                content: data.message || "応答の生成に失敗しました。",
                sender: "ai",
                timestamp: new Date().toISOString(),
                type: "text",
                character: newSession.character,
              };

              get().addMessage(aiMessage);
              console.log("✅ 編集後の応答生成完了");
            },
          };

          await apiRequestQueue.addRequest(request);
        }
      } catch (error) {
        console.error("❌ メッセージ編集エラー:", error);
      } finally {
        set({ is_generating: false });
      }
    },

    saveSession: async (sessionId) => {
      console.log("💾 セッション保存開始:", sessionId);

      const session = get().sessions.get(sessionId);
      if (!session) {
        console.error("❌ 保存対象セッションが見つかりません:", sessionId);
        return;
      }

      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(session),
        });

        if (!response.ok) {
          console.error("❌ セッション保存失敗:", response.status);
          return;
        }

        console.log("✅ セッション保存完了:", sessionId);
      } catch (error) {
        console.error("❌ セッション保存エラー:", error);
      }
    },

    toggleSessionPin: async (sessionId) => {
      console.log("📌 セッションピン状態切替:", sessionId);

      const sessions = get().sessions;
      const targetSession = sessions.get(sessionId);

      if (!targetSession) {
        console.error("❌ 対象セッションが見つかりません:", sessionId);
        return;
      }

      const isPinned = !targetSession.is_pinned;

      try {
        // サーバー更新
        await fetch("/api/sessions/pin", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sessionId, updates: { isPinned } }),
        }).catch((error) => {
          // Storage initialization failed, not critical
          console.warn("❌ サーバーピン状態更新失敗:", error);
        });

        // ローカル更新
        const updatedSession = {
          ...targetSession,
          is_pinned: isPinned,
          updated_at: new Date().toISOString(),
        };

        const newSessions = new Map(sessions);
        newSessions.set(sessionId, updatedSession);

        set({
          sessions: newSessions,
          session:
            get().active_session_id === sessionId
              ? updatedSession
              : get().session,
        });

        console.log("✅ ピン状態切替完了:", sessionId, isPinned);
      } catch (error) {
        console.error("❌ ピン状態切替エラー:", error);
      }
    },

    duplicateSession: async (sessionId) => {
      console.log("📋 セッション複製開始:", sessionId);

      const sessions = get().sessions;
      const sourceSession = sessions.get(sessionId);

      if (!sourceSession) {
        console.error("❌ 複製元セッションが見つかりません:", sessionId);
        return sessionId; // 元のIDを返す
      }

      try {
        const newSessionId = crypto.randomUUID();
        const duplicatedSession: Session = {
          ...sourceSession,
          id: newSessionId,
          name: `${sourceSession.name} (複製)`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_pinned: false, // 複製時はピン解除
        };

        const newSessions = new Map(sessions);
        newSessions.set(newSessionId, duplicatedSession);

        set({
          sessions: newSessions,
          session: duplicatedSession,
          active_session_id: newSessionId,
        });

        console.log("✅ セッション複製完了:", newSessionId);
        return newSessionId;
      } catch (error) {
        console.error("❌ セッション複製エラー:", error);
        return sessionId; // エラー時は元のIDを返す
      }
    },

    getSuggestedResponses: async (sessionId) => {
      console.log("💡 提案応答取得開始:", sessionId);

      const currentSession = sessionId
        ? get().sessions.get(sessionId)
        : get().session;

      if (!currentSession || currentSession.messages.length === 0) {
        console.log("💡 セッションまたはメッセージがありません");
        return [];
      }

      try {
        const lastMessage =
          currentSession.messages[currentSession.messages.length - 1];

        if (lastMessage.sender !== "ai") {
          console.log("💡 最後のメッセージがAIメッセージではありません");
          return [];
        }

        // メッセージ履歴から文脈を作成
        const context = currentSession.messages
          .slice(-5) // 最後の5メッセージ
          .map(
            (msg) =>
              `${
                msg.sender === "user"
                  ? "ユーザー"
                  : currentSession.character.name
              }: ${msg.content}`
          )
          .join("\n");

        const requestId = crypto.randomUUID();
        const request: APIRequest = {
          id: requestId,
          type: "suggestions",
          priority: 2,
          timestamp: Date.now(),
          request: async () => {
            const response = await fetch("/api/suggestions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                context,
                character: currentSession.character,
                persona: currentSession.persona,
                lastMessage: lastMessage.content,
              }),
            });

            if (!response.ok) {
              throw new Error(`提案応答 API エラー: ${response.status}`);
            }

            const data = await response.json();
            console.log("💡 提案応答取得完了:", data.suggestions?.length);

            return data.suggestions || [];
          },
        };

        return await apiRequestQueue.addRequest(request);
      } catch (error) {
        console.error("❌ 提案応答取得エラー:", error);
        return [];
      }
    },

    // 今日のセッション統計
    getTodaySessionsIds: () => {
      return getSessionsByDateRange(1).map((session) => session.id);
    },

    getTodaySessionsCount: () => {
      return getSessionsByDateRange(1).length;
    },

    getThisWeekSessionsCount: () => {
      return getSessionsByDateRange(7).length;
    },

    getThisMonthSessionsCount: () => {
      return getSessionsByDateRange(30).length;
    },
  };
};
