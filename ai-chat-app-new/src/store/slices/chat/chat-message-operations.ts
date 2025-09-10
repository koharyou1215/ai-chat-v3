import { StateCreator } from "zustand";
import {
  UnifiedMessage,
  UUID,
  UnifiedChatSession,
} from "@/types";
import { AppStore } from "@/store";
import { apiRequestQueue } from "@/services/api-request-queue";
import { simpleAPIManagerV2 } from "@/services/simple-api-manager-v2";
import { promptBuilderService } from "@/services/prompt-builder.service";
import { autoMemoryManager } from "@/services/memory/auto-memory-manager";
import { SoloEmotionAnalyzer } from "@/services/emotion/SoloEmotionAnalyzer";
import { TrackerManager } from "@/services/tracker/tracker-manager";
import { ChatErrorHandler } from "@/services/chat/error-handler.service";
import { getSessionSafely, createMapSafely } from "@/utils/chat/map-helpers";
import {
  generateUserMessageId,
  generateAIMessageId,
} from "@/utils/uuid";

// 🧠 感情から絵文字への変換ヘルパー
export const getEmotionEmoji = (emotion: string): string => {
  const emotionEmojiMap: Record<string, string> = {
    joy: "😊",
    sadness: "😢",
    anger: "😠",
    fear: "😨",
    surprise: "😲",
    disgust: "😖",
    neutral: "😐",
    love: "💕",
    excitement: "🤩",
    anxiety: "😰",
  };
  return emotionEmojiMap[emotion] || "😐";
};

// Helper function to safely get tracker manager from Map or Object
export const getTrackerManagerSafely = (
  trackerManagers: any,
  key: string
): TrackerManager | undefined => {
  if (!trackerManagers || !key) return undefined;
  if (trackerManagers instanceof Map) {
    return trackerManagers.get(key);
  } else if (typeof trackerManagers === "object") {
    return trackerManagers[key];
  }
  return undefined;
};

export interface MessageOperations {
  sendMessage: (content: string, imageUrl?: string) => Promise<void>;
  regenerateLastMessage: () => Promise<void>;
  continueLastMessage: () => Promise<void>;
  deleteMessage: (message_id: UUID) => void;
  rollbackSession: (message_id: UUID) => void;
  resetGeneratingState: () => void;
}

export const createMessageOperations: StateCreator<
  AppStore,
  [],
  [],
  MessageOperations
> = (set, get) => ({
  sendMessage: async (content, imageUrl) => {
    // 🔄 グループモード判定: グループチャットの場合は専用処理を呼び出し
    const state = get();
    if (state.is_group_mode && state.active_group_session_id) {
      return await state.sendGroupMessage(content, imageUrl);
    }

    const activeSessionId = state.active_session_id;
    if (!activeSessionId) return;
    const activeSession = getSessionSafely(state.sessions, activeSessionId);
    if (!activeSession) return;

    if (state.is_generating) {
      return;
    }
    set({ is_generating: true });

    // 1. ユーザーメッセージを作成
    const userMessage: UnifiedMessage = {
      id: generateUserMessageId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      session_id: activeSessionId,
      is_deleted: false,
      role: "user",
      content,
      image_url: imageUrl,
      memory: {
        importance: {
          score: 0.7,
          factors: {
            emotional_weight: 0.5,
            repetition_count: 0,
            user_emphasis: 0.8,
            ai_judgment: 0.6,
          },
        },
        is_pinned: false,
        is_bookmarked: false,
        keywords: [],
        summary: undefined,
      },
      expression: {
        emotion: { primary: "neutral", intensity: 0.5, emoji: "😐" },
        style: { font_weight: "normal", text_color: "#ffffff" },
        effects: [],
      },
      edit_history: [],
      regeneration_count: 0,
      metadata: {},
    };

    // 2. ユーザーメッセージを即座にUIに反映
    const sessionWithUserMessage = {
      ...activeSession,
      messages: [...activeSession.messages, userMessage],
      message_count: activeSession.message_count + 1,
      updated_at: new Date().toISOString(),
    };
    set((state) => ({
      sessions: createMapSafely(state.sessions).set(
        activeSessionId,
        sessionWithUserMessage
      ),
    }));

    // 🧠 感情分析: ユーザーメッセージ (バックグラウンド処理)
    const emotionalIntelligenceFlags = get().emotionalIntelligenceFlags;
    if (emotionalIntelligenceFlags?.emotion_analysis_enabled) {
      setTimeout(async () => {
        try {
          const soloAnalyzer = new SoloEmotionAnalyzer();
          const conversationalContext = {
            recentMessages: sessionWithUserMessage.messages.slice(-5),
            messageCount: sessionWithUserMessage.message_count,
            activeCharacters: activeSession.participants.characters,
            sessionType: "solo" as const,
            sessionId: activeSessionId,
            sessionDuration: Math.floor(
              (new Date().getTime() -
                new Date(activeSession.created_at).getTime()) /
                60000
            ),
            conversationPhase: "development" as const,
          };

          const emotionResult = await soloAnalyzer.analyzeSoloEmotion(
            userMessage,
            conversationalContext,
            activeSession.participants.characters[0]?.id || "",
            "default_user"
          );

          // 感情分析結果をメッセージに反映
          const updatedUserMessage = {
            ...userMessage,
            expression: {
              emotion: {
                primary: emotionResult.emotion.primaryEmotion,
                intensity: emotionResult.emotion.intensity,
                emoji: getEmotionEmoji(emotionResult.emotion.primaryEmotion),
              },
              style: {
                font_weight: "normal" as const,
                text_color: "#ffffff",
              },
              effects: [],
            },
          };

          // セッションを更新（非同期）
          set((state) => {
            const currentSession = getSessionSafely(
              state.sessions,
              activeSessionId
            );
            if (currentSession) {
              const messageIndex = currentSession.messages.findIndex(
                (m) => m.id === userMessage.id
              );
              if (messageIndex !== -1) {
                const updatedMessages = [...currentSession.messages];
                updatedMessages[messageIndex] = updatedUserMessage;
                const updatedSession = {
                  ...currentSession,
                  messages: updatedMessages,
                };
                return {
                  sessions: createMapSafely(state.sessions).set(
                    activeSessionId,
                    updatedSession
                  ),
                };
              }
            }
            return state;
          });
        } catch (error) {
          console.warn("User emotion analysis failed:", error);
        }
      }, 0);
    }

    // 3. AI応答生成などの重い処理を非同期で実行
    (async () => {
      try {
        const characterId = activeSession.participants.characters[0]?.id;
        const trackerManager = characterId
          ? getTrackerManagerSafely(get().trackerManagers, characterId)
          : null;

        // ⚡ プログレッシブプロンプト構築でUIフリーズを防止 (50-100ms)
        const { basePrompt, enhancePrompt } =
          await promptBuilderService.buildPromptProgressive(
            sessionWithUserMessage,
            content,
            trackerManager || undefined
          );

        const apiConfig = get().apiConfig;
        // ⚡ 高優先度チャットリクエストをキューに追加（競合を防止）
        const requestId = `${activeSessionId}-${Date.now()}`;
        const modelName = apiConfig.model || "gemini-2.5-flash";
        const response = await apiRequestQueue.enqueueChatRequest(
          async () => {
            // 完全版プロンプトを非同期で準備
            const fullPromptPromise = enhancePrompt();

            // 完全版のプロンプトを待つ（ベースとエンハンスを統合）
            let finalPrompt = basePrompt;
            try {
              finalPrompt = await fullPromptPromise;
            } catch (error) {
              console.warn(
                "⚠️ Enhanced prompt failed, using base prompt",
                error
              );
            }

            // 🔧 修正: 設定から会話履歴の上限を取得
            const maxContextMessages = get().chat?.memoryLimits?.max_context_messages || 20;
            
            // 完全版プロンプトでAPIリクエストを開始
            const initialResponse = await fetch("/api/chat/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemPrompt: finalPrompt, // 完全版プロンプトを使用
                userMessage: content,
                conversationHistory: (() => {
                  // 重複除去と履歴クリーンアップ - 設定値を使用
                  const recentMessages = activeSession.messages.slice(-maxContextMessages); // 設定値を使用
                  const deduplicatedHistory: Array<{
                    role: "user" | "assistant";
                    content: string;
                  }> = [];

                  for (const msg of recentMessages) {
                    if (msg.role === "user" || msg.role === "assistant") {
                      const historyEntry = {
                        role: msg.role as "user" | "assistant",
                        content: msg.content,
                      };

                      // 同一内容の重複チェック（連続する場合と全体での重複両方をチェック）
                      const isDuplicate = deduplicatedHistory.some(
                        (existing) =>
                          existing.role === historyEntry.role &&
                          existing.content === historyEntry.content
                      );

                      if (!isDuplicate && historyEntry.content.trim()) {
                        deduplicatedHistory.push(historyEntry);
                      }
                    }
                  }

                  // 最終的に設定値の半分の件数のみ返す（例: 20設定なら10件）
                  return deduplicatedHistory.slice(-(Math.floor(maxContextMessages / 2)));
                })(),
                textFormatting: state.effectSettings.textFormatting,
                apiConfig: {
                  ...apiConfig,
                  openRouterApiKey: get().openRouterApiKey,
                  geminiApiKey: get().geminiApiKey,
                },
                useEnhancedPrompt: false, // フラグで制御
              }),
            });

            // エラーチェック
            if (!initialResponse.ok) {
              const errorData = await initialResponse.json();
              throw new Error(errorData.error || "API request failed");
            }
            
            return initialResponse;
          },
          requestId,
          modelName
        );

        // バックグラウンドで拡張プロンプトを処理（将来の最適化用）
        enhancePrompt()
          .then((enhancedPrompt) => {
            // 将来のリクエストで使用するためにキャッシュ可能
          })
          .catch((err) => {
            console.warn("Enhanced prompt failed:", err);
          });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "API request failed");
        }

        const data = await response.json();
        const aiResponseContent = data.response;

        // 🧠 感情分析: AI応答 (同期処理 - UI表示前)
        let aiEmotionExpression = {
          emotion: { primary: "neutral", intensity: 0.6, emoji: "🤔" },
          style: { font_weight: "normal" as const, text_color: "#ffffff" },
          effects: [],
        };

        if (emotionalIntelligenceFlags?.emotion_analysis_enabled) {
          try {
            const soloAnalyzer = new SoloEmotionAnalyzer();
            const currentSession = getSessionSafely(
              get().sessions,
              activeSessionId
            );
            if (currentSession) {
              const conversationalContext = {
                recentMessages: currentSession.messages.slice(-5),
                messageCount: currentSession.message_count + 1,
                activeCharacters: activeSession.participants.characters,
                sessionType: "solo" as const,
                sessionId: activeSessionId,
                sessionDuration: Math.floor(
                  (new Date().getTime() -
                    new Date(activeSession.created_at).getTime()) /
                    60000
                ),
                conversationPhase: "development" as const,
              };

              // 一時的なAI応答メッセージを作成して分析
              const tempAiMessage: UnifiedMessage = {
                id: generateAIMessageId(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1,
                session_id: activeSessionId,
                is_deleted: false,
                role: "assistant",
                content: aiResponseContent,
                character_id: activeSession.participants.characters[0]?.id,
                memory: {
                  importance: {
                    score: 0.6,
                    factors: {
                      emotional_weight: 0.4,
                      repetition_count: 0,
                      user_emphasis: 0.3,
                      ai_judgment: 0.7,
                    },
                  },
                  is_pinned: false,
                  is_bookmarked: false,
                  keywords: [],
                  summary: undefined,
                },
                expression: {
                  emotion: {
                    primary: "neutral",
                    intensity: 0.6,
                    emoji: "🤔",
                  },
                  style: { font_weight: "normal", text_color: "#ffffff" },
                  effects: [],
                },
                edit_history: [],
                regeneration_count: 0,
                metadata: {},
              };

              const aiEmotionResult = await soloAnalyzer.analyzeSoloEmotion(
                tempAiMessage,
                conversationalContext,
                activeSession.participants.characters[0]?.id || "",
                "default_user"
              );

              aiEmotionExpression = {
                emotion: {
                  primary: aiEmotionResult.emotion.primaryEmotion,
                  intensity: aiEmotionResult.emotion.intensity,
                  emoji: getEmotionEmoji(
                    aiEmotionResult.emotion.primaryEmotion
                  ),
                },
                style: {
                  font_weight: "normal" as const,
                  text_color: "#ffffff",
                },
                effects: [],
              };
            }
          } catch (error) {
            console.warn("AI emotion analysis failed:", error);
          }
        }

        const aiResponse: UnifiedMessage = {
          id: generateAIMessageId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
          session_id: activeSessionId,
          is_deleted: false,
          role: "assistant",
          content: aiResponseContent,
          character_id: activeSession.participants.characters[0]?.id,
          character_name: activeSession.participants.characters[0]?.name,
          memory: {
            importance: {
              score: 0.6,
              factors: {
                emotional_weight: 0.4,
                repetition_count: 0,
                user_emphasis: 0.3,
                ai_judgment: 0.7,
              },
            },
            is_pinned: false,
            is_bookmarked: false,
            keywords: ["response"],
            summary: "ユーザーの質問への回答",
          },
          expression: aiEmotionExpression,
          edit_history: [],
          regeneration_count: 0,
          metadata: {},
        };

        const finalSession = getSessionSafely(
          get().sessions,
          activeSessionId
        )!;
        const sessionWithAiResponse = {
          ...finalSession,
          messages: [...finalSession.messages, aiResponse],
          message_count: finalSession.message_count + 1,
          updated_at: new Date().toISOString(),
        };
        set((state) => ({
          sessions: createMapSafely(state.sessions).set(
            activeSessionId,
            sessionWithAiResponse
          ),
        }));

        // パフォーマンス最適化: 後処理作業を完全にバックグラウンド化
        setTimeout(() => {
          Promise.allSettled([
            // 🧠 emotional_memory_enabled設定チェックを追加
            get().emotionalIntelligenceFlags.emotional_memory_enabled
              ? autoMemoryManager.processNewMessage(
                  aiResponse,
                  activeSessionId,
                  activeSession.participants.characters[0]?.id,
                  get().createMemoryCard
                )
              : Promise.resolve(null),
            // 🎯 autoTrackerUpdate設定チェックを追加
            trackerManager &&
            characterId &&
            get().effectSettings.autoTrackerUpdate
              ? Promise.all([
                  trackerManager.analyzeMessageForTrackerUpdates(
                    userMessage,
                    characterId
                  ),
                  trackerManager.analyzeMessageForTrackerUpdates(
                    aiResponse,
                    characterId
                  ),
                ])
              : Promise.resolve([]),
          ])
            .then((results) => {
              const memoryResult = results[0];
              const trackerResult = results[1];

              if (memoryResult.status === "rejected") {
                console.error(
                  "🧠 Auto-memory processing failed:",
                  memoryResult.reason
                );
              }

              if (trackerResult.status === "rejected") {
                console.error(
                  "🎯 Tracker analysis failed:",
                  trackerResult.reason
                );
              }
            })
            .catch((error) => {
              console.error("⚠️ Background processing error:", error);
            });
        }, 0); // 次のEvent Loopで実行しUIをブロックしない
      } catch (error) {
        // より詳細なエラーログを追加
        console.error("🚨 sendMessage error details:");
        console.error("  - Error object:", error);
        console.error("  - Error type:", typeof error);
        console.error("  - Error constructor:", error?.constructor?.name);
        console.error(
          "  - Error message:",
          error instanceof Error ? error.message : String(error)
        );
        if (error instanceof Error) {
          console.error("  - Error stack:", error.stack);
        }

        // 新しいエラーハンドラーを使用
        const chatError = ChatErrorHandler.createChatError(error, "send");
        ChatErrorHandler.logError(error, "sendMessage");
        ChatErrorHandler.showUserFriendlyError(chatError.message);

        // ストアにエラー情報を保存
        set({
          lastError: {
            type: "send",
            message: chatError.message,
            timestamp: chatError.timestamp,
            details: chatError.details as string,
          },
        });
      } finally {
        set({ is_generating: false });
      }
    })();
  },

  regenerateLastMessage: async () => {
    set({ is_generating: true });
    try {
      const activeSessionId = get().active_session_id;
      if (!activeSessionId) {
        return;
      }

      const session = getSessionSafely(get().sessions, activeSessionId);
      // C案：より堅牢なチェック
      if (!session || session.messages.length < 2) {
        return;
      }

      // 最後のAIメッセージとその直前のユーザーメッセージを見つける
      const lastAiMessageIndex = session.messages.findLastIndex(
        (m) => m.role === "assistant" && !m.is_deleted
      );
      if (lastAiMessageIndex <= 0) {
        // Should be at least the second message
        return;
      }

      const lastUserMessage = session.messages[lastAiMessageIndex - 1];
      if (
        !lastUserMessage ||
        lastUserMessage.role !== "user" ||
        lastUserMessage.is_deleted
      ) {
        return;
      }

      const messagesForPrompt = session.messages.slice(0, lastAiMessageIndex);

      const characterId = session.participants.characters[0]?.id;
      const trackerManager = characterId
        ? getTrackerManagerSafely(get().trackerManagers, characterId)
        : null;

      // 再生成時は新鮮なプロンプトを作成（繰り返しを避ける）
      const regeneratePrompt = `以下のメッセージに対して、キャラクターとして応答してください。前回とは異なる角度や表現で、新鮮で創造的な応答を生成してください。

ユーザーメッセージ: "${lastUserMessage.content}"`;

      let systemPrompt = await promptBuilderService.buildPrompt(
        { ...session, messages: messagesForPrompt },
        regeneratePrompt,
        trackerManager || undefined
      );

      // 再生成専用の指示を追加
      const regenerateInstruction = `
<regenerate_instruction>
**重要**: これは再生成リクエストです。
- 前回の応答とは全く異なるアプローチで応答してください
- 新しい視点、感情、表現を使用してください  
- 同じパターンや言い回しを避けてください
- キャラクターの別の面を表現してください
- 創造性と多様性を重視してください
</regenerate_instruction>
`;
      systemPrompt += regenerateInstruction;

      // 🔧 修正: 設定から会話履歴の上限を取得
      const maxContextMessages = get().chat?.memoryLimits?.max_context_messages || 20;
      const conversationHistory = messagesForPrompt
        .filter((msg) => msg.role === "user" || msg.role === "assistant")
        .slice(-maxContextMessages) // 設定値を使用
        .map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));

      const apiConfig = get().apiConfig;
      // C案：temperatureをより大きく上げ、seedを追加して多様性を確保
      const regenerationApiConfig = {
        ...apiConfig,
        temperature: Math.min(1.8, (apiConfig.temperature || 0.7) + 0.3), // 上昇幅を0.3に増加
        seed: Math.floor(Math.random() * 1000000), // B案：ランダムなseedを追加
        openRouterApiKey: get().openRouterApiKey,
        geminiApiKey: get().geminiApiKey,
        useDirectGeminiAPI: get().useDirectGeminiAPI,
      };

      // simpleAPIManagerV2を使用して再生成
      const { simpleAPIManagerV2 } = await import(
        "@/services/simple-api-manager-v2"
      );

      const aiResponseContent = await simpleAPIManagerV2.generateMessage(
        systemPrompt,
        lastUserMessage.content,
        conversationHistory,
        regenerationApiConfig
      );

      const newAiMessage: UnifiedMessage = {
        ...session.messages[lastAiMessageIndex],
        id: generateAIMessageId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: aiResponseContent,
        regeneration_count:
          (session.messages[lastAiMessageIndex].regeneration_count || 0) + 1,
      };

      const newMessages = [...session.messages];
      newMessages[lastAiMessageIndex] = newAiMessage;

      set((_state) => {
        const updatedSession = {
          ...session,
          messages: newMessages,
          updated_at: new Date().toISOString(),
        };
        return {
          sessions: createMapSafely(_state.sessions).set(
            session.id,
            updatedSession
          ),
        };
      });
    } catch (error) {
      console.error("🚨 Regeneration failed:", error);

      // 詳細なエラーハンドリングとユーザーフィードバック
      let errorMessage = "メッセージの再生成に失敗しました。";

      if (error instanceof Error) {
        if (error.message.includes("API request failed")) {
          errorMessage =
            "API接続エラー: サーバーとの通信に失敗しました。しばらく待ってから再試行してください。";
        } else if (error.message.includes("memory")) {
          errorMessage =
            "メモリ処理エラー: 一時的な問題が発生しました。ページをリロードして再試行してください。";
        } else if (error.message.includes("timeout")) {
          errorMessage =
            "タイムアウト: 処理時間が長すぎます。しばらく待ってから再試行してください。";
        } else if (error.message.includes("rate limit")) {
          errorMessage =
            "レート制限: APIの使用制限に達しました。しばらく待ってから再試行してください。";
        }
      }

      // エラー状態をストアに保存（UI表示用）
      set({
        lastError: {
          type: "regeneration",
          message: errorMessage,
          timestamp: new Date().toISOString(),
          details: error instanceof Error ? error.message : String(error),
        },
      });

      // エラートースト表示（実装されている場合）
      if (typeof window !== "undefined" && (window as any).showToast) {
        (window as any).showToast(errorMessage, "error");
      }
    } finally {
      set({ is_generating: false });
    }
  },

  // 🆕 ソロチャット続きを生成機能
  continueLastMessage: async () => {
    set({ is_generating: true });
    try {
      const activeSessionId = get().active_session_id;
      if (!activeSessionId) {
        return;
      }

      const session = getSessionSafely(get().sessions, activeSessionId);
      if (!session || session.messages.length === 0) {
        return;
      }

      // 最後のAIメッセージを見つける
      const lastAiMessageIndex = session.messages.findLastIndex(
        (m) => m.role === "assistant" && !m.is_deleted
      );
      if (lastAiMessageIndex === -1) {
        return;
      }

      const lastAiMessage = session.messages[lastAiMessageIndex];
      const characterId = session.participants.characters[0]?.id;
      const trackerManager = characterId
        ? getTrackerManagerSafely(get().trackerManagers, characterId)
        : null;

      // 続きを生成するため、前のメッセージの内容を基にプロンプトを構築
      // 続き生成の指示をユーザープロンプトに含める（システムプロンプトには追加しない）
      const continuePrompt = `前のメッセージの続きを書いてください。前のメッセージ内容:\n「${lastAiMessage.content}」\n\nこの続きとして自然に繋がる内容を生成してください。`;

      let systemPrompt = await promptBuilderService.buildPrompt(
        session,
        continuePrompt,
        trackerManager || undefined
      );

      const { simpleAPIManagerV2: apiManager } = await import(
        "@/services/simple-api-manager-v2"
      );

      // 🔧 修正: 設定から会話履歴の上限を取得
      const maxContextMessages = get().chat?.memoryLimits?.max_context_messages || 20;
      const conversationHistory = session.messages
        .filter((m) => !m.is_deleted)
        .slice(-maxContextMessages) // 設定値を使用
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      const apiConfig = get().apiConfig || {};
      const aiResponse = await simpleAPIManagerV2.generateMessage(
        systemPrompt,
        continuePrompt,
        conversationHistory,
        apiConfig
      );

      // 新しい続きメッセージを作成
      const newContinuationMessage: UnifiedMessage = {
        id: generateAIMessageId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        session_id: activeSessionId,
        role: "assistant",
        content: aiResponse,
        character_id: session.participants.characters[0]?.id,
        memory: {
          importance: {
            score: 0.6,
            factors: {
              emotional_weight: 0.5,
              repetition_count: 0,
              user_emphasis: 0.5,
              ai_judgment: 0.7,
            },
          },
          is_pinned: false,
          is_bookmarked: false,
          keywords: [],
        },
        expression: {
          emotion: { primary: "neutral", intensity: 0.6, emoji: "💬" },
          style: { font_weight: "normal", text_color: "#ffffff" },
          effects: [],
        },
        edit_history: [],
        regeneration_count: 0,
        is_deleted: false,
        metadata: {
          is_continuation: true,
          continuation_of: lastAiMessage.id,
          continuation_count:
            (typeof (lastAiMessage.metadata as any)?.continuation_count ===
            "number"
              ? (lastAiMessage.metadata as any).continuation_count
              : 0) + 1,
        },
      };

      // セッションにメッセージを追加
      set((state) => {
        const currentSession = getSessionSafely(
          state.sessions,
          activeSessionId
        );
        if (!currentSession) return state;

        const updatedMessages = [
          ...currentSession.messages,
          newContinuationMessage,
        ];
        const updatedSession = {
          ...currentSession,
          messages: updatedMessages,
          message_count: updatedMessages.length,
          updated_at: new Date().toISOString(),
        };

        return {
          sessions: createMapSafely(state.sessions).set(
            activeSessionId,
            updatedSession
          ),
        };
      });
    } catch (error) {
      console.error("🚨 Continue generation failed:", error);

      // 詳細なエラーハンドリングとユーザーフィードバック
      let errorMessage = "メッセージの続き生成に失敗しました。";

      if (error instanceof Error) {
        if (
          error.message.includes("API request failed") ||
          error.message.includes("generateMessage")
        ) {
          errorMessage =
            "API接続エラー: サーバーとの通信に失敗しました。しばらく待ってから再試行してください。";
        } else if (
          error.message.includes("memory") ||
          error.message.includes("embedding")
        ) {
          errorMessage =
            "メモリ処理エラー: 一時的な問題が発生しました。ページをリロードして再試行してください。";
        } else if (error.message.includes("timeout")) {
          errorMessage =
            "タイムアウト: 処理時間が長すぎます。しばらく待ってから再試行してください。";
        } else if (
          error.message.includes("rate limit") ||
          error.message.includes("quota")
        ) {
          errorMessage =
            "レート制限: APIの使用制限に達しました。しばらく待ってから再試行してください。";
        } else if (
          error.message.includes("invalid model") ||
          error.message.includes("model")
        ) {
          errorMessage = "モデル設定エラー: AI設定を確認してください。";
        }
      }

      // エラー状態をストアに保存（UI表示用）
      set({
        lastError: {
          type: "continue",
          message: errorMessage,
          timestamp: new Date().toISOString(),
          details: error instanceof Error ? error.message : String(error),
        },
      });

      // エラートースト表示（実装されている場合）
      if (typeof window !== "undefined" && (window as any).showToast) {
        (window as any).showToast(errorMessage, "error");
      }
    } finally {
      set({ is_generating: false });
    }
  },

  deleteMessage: (message_id) => {
    const activeSessionId = get().active_session_id;
    if (!activeSessionId) return;

    const activeSession = getSessionSafely(get().sessions, activeSessionId);
    if (activeSession) {
      const updatedMessages = activeSession.messages.filter(
        (msg) => msg.id !== message_id
      );
      const updatedSession = {
        ...activeSession,
        messages: updatedMessages,
        message_count: updatedMessages.length,
        updated_at: new Date().toISOString(),
      };
      set((_state) => ({
        sessions: createMapSafely(_state.sessions).set(
          activeSessionId,
          updatedSession
        ),
      }));
    }
  },

  rollbackSession: (message_id) => {
    const activeSessionId = get().active_session_id;
    if (!activeSessionId) return;

    const session = getSessionSafely(get().sessions, activeSessionId);
    if (!session) return;

    const messageIndex = session.messages.findIndex(
      (m) => m.id === message_id
    );
    if (messageIndex === -1) {
      console.error("Rollback failed: message not found");
      return;
    }

    // 1. チャット履歴を切り詰める
    const rollbackMessages = session.messages.slice(0, messageIndex + 1);

    const updatedSession = {
      ...session,
      messages: rollbackMessages,
      message_count: rollbackMessages.length,
      updated_at: new Date().toISOString(),
    };

    set((state) => ({
      sessions: createMapSafely(state.sessions).set(
        activeSessionId,
        updatedSession
      ),
    }));

    // 2. ConversationManagerのキャッシュをクリア
    promptBuilderService.clearManagerCache(activeSessionId);

    // 3. トラッカーをリセット
    const characterId = session.participants.characters[0]?.id;
    if (characterId) {
      const trackerManager = getTrackerManagerSafely(
        get().trackerManagers,
        characterId
      );
      if (trackerManager) {
        // 全てのトラッカーを初期値にリセット
        trackerManager.initializeTrackerSet(
          characterId,
          session.participants.characters[0]?.trackers || []
        );
      }
    }
  },

  // 🚨 緊急修復機能: 生成状態を強制リセット
  resetGeneratingState: () => {
    set({ is_generating: false });
  },
});