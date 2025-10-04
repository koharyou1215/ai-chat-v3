import { StateCreator } from "zustand";
import { UnifiedMessage, UUID, UnifiedChatSession } from "@/types";
import { AppStore } from "@/store";
import { apiRequestQueue } from "@/services/api-request-queue";
import { simpleAPIManagerV2 } from "@/services/simple-api-manager-v2";
import { promptBuilderService } from "@/services/prompt-builder.service";
import { autoMemoryManager } from "@/services/memory/auto-memory-manager";
import { SoloEmotionAnalyzer } from "@/services/emotion/SoloEmotionAnalyzer";
import { TrackerManager } from "@/services/tracker/tracker-manager";
import { ChatErrorHandler } from "@/services/chat/error-handler.service";
import { getSessionSafely, createMapSafely } from "@/utils/chat/map-helpers";
import { updateSessionSafely } from "@/utils/chat/session-update-helper";
import {
  ingestMessageToMem0Safely,
  ingestConversationPairToMem0,
} from "@/utils/chat/mem0-integration-helper";
import { debugLog } from "@/utils/debug-logger"; // debugLogをインポート
import { generateUserMessageId, generateAIMessageId } from "@/utils/uuid";
import { createMessageLifecycleOperations } from "./operations/message-lifecycle-operations";
import { createMessageContinuationHandler } from "./operations/message-continuation-handler";
import { createMessageRegenerationHandler } from "./operations/message-regeneration-handler";
import { createMessageSendHandler } from "./operations/message-send-handler";
import { PHASE3_FEATURE_FLAGS } from "@/config/phase3-feature-flags";

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
  addMessage: (message: UnifiedMessage) => Promise<void>;
}

export const createMessageOperations: StateCreator<
  AppStore,
  [],
  [],
  MessageOperations
> = (set, get, api) => {
  // 🆕 Phase 3.4: New send handler
  const newSendHandler = createMessageSendHandler(set, get, api);

  // 既存の sendMessage 実装（レガシー）
  const legacySendMessage = async (content: string, imageUrl?: string) => {
    debugLog("🚀 [sendMessage] Method called (to file)", {
      content: content?.substring(0, 50) + "...",
      imageUrl: !!imageUrl,
    });
    console.log("🚀 [sendMessage] Method called (to console)", {
      content: content?.substring(0, 50) + "...",
      imageUrl: !!imageUrl,
    });

    // 🔄 グループモード判定: グループチャットの場合は専用処理を呼び出し
    const state = get() as any; // Type assertion for cross-slice access
    console.log(
      "📊 [sendMessage] State check - is_group_mode:",
      state.is_group_mode,
      "active_session_id:",
      state.active_session_id
    );

    if (
      state.is_group_mode &&
      state.active_group_session_id &&
      state.sendGroupMessage
    ) {
      console.log("🔄 [sendMessage] Redirecting to group chat");
      return await state.sendGroupMessage(content, imageUrl);
    }

    const activeSessionId = state.active_session_id;
    if (!activeSessionId) {
      console.error("❌ [sendMessage] No active session ID");
      return;
    }

    const activeSession = getSessionSafely(state.sessions, activeSessionId);
    if (!activeSession) {
      console.error(
        "❌ [sendMessage] No active session found for ID:",
        activeSessionId
      );
      return;
    }

    if (state.is_generating) {
      console.warn("⚠️ [sendMessage] Already generating, skipping");
      return;
    }

    console.log("✅ [sendMessage] Starting message generation");
    console.log("🔍 [sendMessage] About to call buildPromptProgressive...");
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

    // 🧠 Mem0にメッセージを取り込む（共通ヘルパー使用）
    await ingestMessageToMem0Safely(userMessage, "sendMessage");

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

        console.log("🔍 [sendMessage] TrackerManager check:", {
          characterId,
          hasTrackerManagers: !!get().trackerManagers,
          trackerManagersSize: get().trackerManagers?.size || 0,
          hasTrackerManager: !!trackerManager,
          trackerManagerType: trackerManager
            ? trackerManager.constructor.name
            : "null",
        });

        // ⚡ プログレッシブプロンプト構築でUIフリーズを防止 (50-100ms)
        console.log("🎯 [sendMessage] About to call buildPromptProgressive...");
        const { basePrompt, enhancePrompt } =
          await promptBuilderService.buildPromptProgressive(
            sessionWithUserMessage,
            content,
            trackerManager || undefined
          );
        console.log(
          "✅ [sendMessage] buildPromptProgressive completed, basePrompt length:",
          basePrompt.length
        );

        const apiConfig = get().apiConfig;
        // ⚡ 高優先度チャットリクエストをキューに追加（競合を防止）
        const requestId = `${activeSessionId}-${Date.now()}`;
        const modelName = apiConfig.model || "gemini-2.5-flash";
        console.log(
          "🌐 [sendMessage] Enqueuing API request - model:",
          modelName,
          "requestId:",
          requestId
        );

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
            const maxContextMessages =
              get().chat?.memory_limits?.max_context_messages || 40;

            console.log(
              "📝 [sendMessage] Sending API request to /api/chat/generate"
            );
            console.log("📝 [sendMessage] Prompt length:", finalPrompt.length);
            // 🚨 強制ログ: finalPrompt の内容を全て出力
            debugLog(
              "📝📝📝 [sendMessage] Final Prompt Content (full):",
              finalPrompt
            );
            console.log(
              "📝📝📝 [sendMessage] Final Prompt Content (full) (to console):"
            );
            console.log(finalPrompt);
            console.log("📝📝📝 [sendMessage] End of Final Prompt Content.");

            // 完全版プロンプトでAPIリクエストを開始
            const initialResponse = await fetch("/api/chat/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemPrompt: finalPrompt, // 完全版プロンプトを使用
                userMessage: content,
                conversationHistory: (() => {
                  // Use Mem0 centralized history helper (preserve existing semantics)
                  try {
                    const { Mem0 } = require("@/services/mem0/core");
                    const history = Mem0.getCandidateHistory(
                      activeSession.messages,
                      {
                        sessionId: activeSession.id,
                        maxContextMessages,
                        minRecentMessages: Math.max(5, Math.floor(maxContextMessages / 4)), // 最低5ラウンド、または最大メッセージ数の1/4
                      }
                    );

                    return history;
                  } catch (e) {
                    // Fallback to original logic if Mem0 not available
                    const recentMessages = activeSession.messages.slice(
                      -maxContextMessages
                    );
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
                        const isDuplicate = deduplicatedHistory.some(
                          (existing) =>
                            existing.role === historyEntry.role &&
                            existing.content === historyEntry.content
                        );
                        if (!isDuplicate && historyEntry.content.trim())
                          deduplicatedHistory.push(historyEntry);
                      }
                    }
                    return deduplicatedHistory.slice(
                      -Math.floor(maxContextMessages / 2)
                    );
                  }
                })(),
                textFormatting: state.effectSettings.textFormatting,
                apiConfig: {
                  ...apiConfig,
                  openRouterApiKey: get().openRouterApiKey,
                  geminiApiKey: get().geminiApiKey,
                  useDirectGeminiAPI: get().useDirectGeminiAPI,
                },
                useEnhancedPrompt: false, // フラグで制御
              }),
            });

            // エラーチェック
            if (!initialResponse.ok) {
              const errorData = await initialResponse.json();
              console.error("❌ [sendMessage] API request failed:", errorData);
              throw new Error(errorData.error || "API request failed");
            }

            console.log("✅ [sendMessage] API request successful");
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

        const finalSession = getSessionSafely(get().sessions, activeSessionId)!;
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

        // 🧠 Mem0にAIレスポンスを取り込む + キャラクター進化（共通ヘルパー使用）
        await ingestConversationPairToMem0(
          userMessage,
          aiResponse,
          characterId,
          "sendMessage"
        );

        // トラッカーの自動更新を実行
        if (trackerManager && characterId) {
          console.log(
            "🎯 [sendMessage] Analyzing messages for tracker updates..."
          );
          try {
            // ユーザーメッセージとAIレスポンスの両方を分析
            const userUpdates = trackerManager.analyzeMessageForTrackerUpdates(
              userMessage,
              characterId
            );
            const aiUpdates = trackerManager.analyzeMessageForTrackerUpdates(
              aiResponse,
              characterId
            );
            const updatedTrackers = [...userUpdates, ...aiUpdates];
            if (updatedTrackers && updatedTrackers.length > 0) {
              console.log(
                `✅ [sendMessage] Updated ${updatedTrackers.length} tracker(s)`
              );
              // Zustandの状態を更新してUIに反映
              set((state) => ({
                trackerManagers: new Map(state.trackerManagers),
              }));

              // 🆕 トラッカー更新時にプロンプトキャッシュをクリア
              try {
                const currentState = get();
                if (currentState.clearConversationCache) {
                  currentState.clearConversationCache(activeSessionId);
                  console.log(
                    `✅ [sendMessage] Cleared conversation cache due to tracker updates`
                  );
                }
              } catch (error) {
                console.warn(
                  "Failed to clear conversation cache after tracker update:",
                  error
                );
              }
            }
          } catch (error) {
            console.error("❌ [sendMessage] Failed to update trackers:", error);
          }
        }

        // パフォーマンス最適化: 後処理作業を完全にバックグラウンド化
        setTimeout(() => {
          Promise.allSettled([
            // 🧠 emotional_memory_enabled設定チェックを追加
            get().emotionalIntelligenceFlags.emotional_memory_enabled
              ? autoMemoryManager.processNewMessage(
                  aiResponse,
                  activeSessionId,
                  activeSession.participants.characters[0]?.id,
                  undefined, // TODO: 感情分析結果を統合
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
              } else if (
                trackerResult.status === "fulfilled" &&
                trackerResult.value
              ) {
                // 🆕 バックグラウンドトラッカー分析結果の処理
                const [userUpdates, aiUpdates] = trackerResult.value;
                const allUpdates = [
                  ...(userUpdates || []),
                  ...(aiUpdates || []),
                ];
                if (allUpdates.length > 0) {
                  console.log(
                    `✅ [sendMessage] Background tracker analysis updated ${allUpdates.length} tracker(s)`
                  );

                  // UI状態を更新
                  set((state) => ({
                    trackerManagers: new Map(state.trackerManagers),
                  }));

                  // プロンプトキャッシュをクリア
                  try {
                    const currentState = get();
                    if (currentState.clearConversationCache) {
                      currentState.clearConversationCache(activeSessionId);
                      console.log(
                        `✅ [sendMessage] Cleared conversation cache due to background tracker updates`
                      );
                    }
                  } catch (error) {
                    console.warn(
                      "Failed to clear conversation cache after background tracker update:",
                      error
                    );
                  }
                }
              }
            })
            .catch((error) => {
              console.error("⚠️ Background processing error:", error);
            });
        }, 0); // 次のEvent Loopで実行しUIをブロックしない
      } catch (error) {
        // より詳細なエラーログを追加
        console.error("🚨 [sendMessage] Critical error occurred:");
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
        console.error("  - Active session ID:", activeSessionId);
        console.error("  - Was generating:", state.is_generating);

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
  };

  return {
    // 🆕 Phase 3.1: Lifecycle operations
    ...createMessageLifecycleOperations(set, get, api),

    // 🆕 Phase 3.2: Continuation handler
    ...createMessageContinuationHandler(set, get, api),

    // 🆕 Phase 3.3: Regeneration handler
    ...createMessageRegenerationHandler(set, get, api),

    // 🆕 Phase 3.4: Send message with Feature Flag
    sendMessage: async (content, imageUrl) => {
      if (PHASE3_FEATURE_FLAGS.USE_NEW_SEND_HANDLER) {
        // 新実装を使用
        console.log("✨ [Phase 3.4] Using NEW send handler");
        const result = await newSendHandler.sendMessage(content, imageUrl);
        if (!result.success) {
          console.error("❌ [Phase 3.4] New handler failed:", result.error);
        }
        return;
      } else {
        // 既存実装を使用
        console.log("📦 [Phase 3.4] Using LEGACY send handler");
        return await legacySendMessage(content, imageUrl);
      }
    },
  };
};
