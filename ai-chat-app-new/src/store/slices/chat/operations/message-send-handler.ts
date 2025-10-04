import { StateCreator } from "zustand";
import { UnifiedMessage, UnifiedChatSession } from "@/types";
import { AppStore } from "@/store";
import { SendMessageOptions, SendMessageResult } from "./types";
import { apiRequestQueue } from "@/services/api-request-queue";
import { promptBuilderService } from "@/services/prompt-builder.service";
import { SoloEmotionAnalyzer } from "@/services/emotion/SoloEmotionAnalyzer";
import { TrackerManager } from "@/services/tracker/tracker-manager";
import { autoMemoryManager } from "@/services/memory/auto-memory-manager";
import { ChatErrorHandler } from "@/services/chat/error-handler.service";
import { getSessionSafely, createMapSafely } from "@/utils/chat/map-helpers";
import {
  ingestMessageToMem0Safely,
  ingestConversationPairToMem0,
} from "@/utils/chat/mem0-integration-helper";
import { generateUserMessageId, generateAIMessageId } from "@/utils/uuid";
import { debugLog } from "@/utils/debug-logger";

/**
 * Phase 3.4: Send Handler
 *
 * メッセージ送信処理を担当する独立ハンドラー
 *
 * 主要機能:
 * - ユーザーメッセージ作成・送信
 * - AI応答生成
 * - 感情分析統合
 * - トラッカー更新
 * - Mem0統合
 * - エラーハンドリング
 */

// =============================================================================
// ヘルパー関数
// =============================================================================

/**
 * 感情から絵文字への変換
 */
const getEmotionEmoji = (emotion: string): string => {
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

/**
 * TrackerManager を安全に取得
 * Exported for use by other handlers (e.g., chat-progressive-handler)
 */
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

/**
 * ユーザーメッセージを作成
 */
const createUserMessage = (
  content: string,
  activeSessionId: string,
  imageUrl?: string
): UnifiedMessage => {
  return {
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
};

/**
 * AIメッセージを作成
 */
const createAIMessage = (
  content: string,
  activeSessionId: string,
  characterId?: string,
  characterName?: string,
  emotionExpression?: any
): UnifiedMessage => {
  return {
    id: generateAIMessageId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    session_id: activeSessionId,
    is_deleted: false,
    role: "assistant",
    content,
    character_id: characterId,
    character_name: characterName,
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
    expression: emotionExpression || {
      emotion: { primary: "neutral", intensity: 0.6, emoji: "🤔" },
      style: { font_weight: "normal", text_color: "#ffffff" },
      effects: [],
    },
    edit_history: [],
    regeneration_count: 0,
    metadata: {},
  };
};

// =============================================================================
// メインハンドラー
// =============================================================================

export interface MessageSendHandlerState {
  sendMessage: (
    content: string,
    imageUrl?: string,
    options?: SendMessageOptions
  ) => Promise<SendMessageResult>;
}

export const createMessageSendHandler = (
  set: any,
  get: any,
  api: any
): MessageSendHandlerState => {
  return {
    sendMessage: async (
      content: string,
      imageUrl?: string,
      options?: SendMessageOptions
    ): Promise<SendMessageResult> => {
      debugLog("🚀 [NEW sendMessage] Method called", {
        content: content?.substring(0, 50) + "...",
        imageUrl: !!imageUrl,
        options,
      });
      console.log("✨ [Phase 3.4] Using NEW send handler");

      // デフォルトオプション
      const opts: SendMessageOptions = {
        enableEmotionAnalysis: options?.enableEmotionAnalysis ?? true,
        enableTrackerUpdate: options?.enableTrackerUpdate ?? true,
        enableMem0Integration: options?.enableMem0Integration ?? true,
        enableBackgroundProcessing: options?.enableBackgroundProcessing ?? true,
      };

      // 🔄 グループモード判定: グループチャットの場合は専用処理を呼び出し
      const state = get() as any;
      console.log(
        "📊 [NEW sendMessage] State check - is_group_mode:",
        state.is_group_mode,
        "active_session_id:",
        state.active_session_id
      );

      if (
        state.is_group_mode &&
        state.active_group_session_id &&
        state.sendGroupMessage
      ) {
        console.log("🔄 [NEW sendMessage] Redirecting to group chat");
        await state.sendGroupMessage(content, imageUrl);
        return { success: true };
      }

      const activeSessionId = state.active_session_id;
      if (!activeSessionId) {
        console.error("❌ [NEW sendMessage] No active session ID");
        return { success: false, error: "No active session ID" };
      }

      const activeSession = getSessionSafely(state.sessions, activeSessionId);
      if (!activeSession) {
        console.error(
          "❌ [NEW sendMessage] No active session found for ID:",
          activeSessionId
        );
        return { success: false, error: "No active session found" };
      }

      if (state.is_generating) {
        console.warn("⚠️ [NEW sendMessage] Already generating, skipping");
        return { success: false, error: "Already generating" };
      }

      console.log("✅ [NEW sendMessage] Starting message generation");
      set({ is_generating: true });

      try {
        // 1. ユーザーメッセージを作成
        const userMessage = createUserMessage(content, activeSessionId, imageUrl);

        // 2. ユーザーメッセージを即座にUIに反映
        const sessionWithUserMessage = {
          ...activeSession,
          messages: [...activeSession.messages, userMessage],
          message_count: activeSession.message_count + 1,
          updated_at: new Date().toISOString(),
        };
        set((state: any) => ({
          sessions: createMapSafely(state.sessions).set(
            activeSessionId,
            sessionWithUserMessage
          ),
        }));

        // 🧠 Mem0にメッセージを取り込む
        if (opts.enableMem0Integration) {
          await ingestMessageToMem0Safely(userMessage, "NEW sendMessage");
        }

        // 🧠 感情分析: ユーザーメッセージ (バックグラウンド処理)
        const emotionalIntelligenceFlags = get().emotionalIntelligenceFlags;
        if (opts.enableEmotionAnalysis && emotionalIntelligenceFlags?.emotion_analysis_enabled) {
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
              set((state: any) => {
                const currentSession = getSessionSafely(
                  state.sessions,
                  activeSessionId
                );
                if (currentSession) {
                  const messageIndex = currentSession.messages.findIndex(
                    (m: UnifiedMessage) => m.id === userMessage.id
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

        // 3. AI応答生成
        const characterId = activeSession.participants.characters[0]?.id;
        const trackerManager = characterId
          ? getTrackerManagerSafely(get().trackerManagers, characterId)
          : null;

        console.log("🔍 [NEW sendMessage] TrackerManager check:", {
          characterId,
          hasTrackerManager: !!trackerManager,
        });

        // ⚡ プログレッシブプロンプト構築
        console.log("🎯 [NEW sendMessage] Building progressive prompt...");
        const { basePrompt, enhancePrompt } =
          await promptBuilderService.buildPromptProgressive(
            sessionWithUserMessage,
            content,
            trackerManager || undefined
          );
        console.log(
          "✅ [NEW sendMessage] Progressive prompt built, length:",
          basePrompt.length
        );

        const apiConfig = get().apiConfig;
        const requestId = `${activeSessionId}-${Date.now()}`;
        const modelName = apiConfig.model || "gemini-2.5-flash";

        console.log(
          "🌐 [NEW sendMessage] Enqueuing API request - model:",
          modelName
        );

        const response = await apiRequestQueue.enqueueChatRequest(
          async () => {
            // 完全版プロンプトを非同期で準備
            const fullPromptPromise = enhancePrompt();

            // 完全版のプロンプトを待つ
            let finalPrompt = basePrompt;
            try {
              finalPrompt = await fullPromptPromise;
            } catch (error) {
              console.warn(
                "⚠️ Enhanced prompt failed, using base prompt",
                error
              );
            }

            const maxContextMessages =
              get().chat?.memory_limits?.max_context_messages || 40;

            console.log("📝 [NEW sendMessage] Prompt length:", finalPrompt.length);
            debugLog("📝 [NEW sendMessage] Final Prompt:", finalPrompt);

            // APIリクエスト
            const initialResponse = await fetch("/api/chat/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemPrompt: finalPrompt,
                userMessage: content,
                conversationHistory: (() => {
                  try {
                    const { Mem0 } = require("@/services/mem0/core");
                    const history = Mem0.getCandidateHistory(
                      activeSession.messages,
                      {
                        sessionId: activeSession.id,
                        maxContextMessages,
                        minRecentMessages: Math.max(5, Math.floor(maxContextMessages / 4)),
                      }
                    );
                    return history;
                  } catch (e) {
                    // Fallback
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
                useEnhancedPrompt: false,
              }),
            });

            if (!initialResponse.ok) {
              const errorData = await initialResponse.json();
              console.error("❌ [NEW sendMessage] API request failed:", errorData);
              throw new Error(errorData.error || "API request failed");
            }

            console.log("✅ [NEW sendMessage] API request successful");
            return initialResponse;
          },
          requestId,
          modelName
        );

        // バックグラウンドで拡張プロンプトを処理
        enhancePrompt()
          .then(() => {
            // キャッシュ可能
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

        // 🧠 感情分析: AI応答 (同期処理)
        let aiEmotionExpression = {
          emotion: { primary: "neutral", intensity: 0.6, emoji: "🤔" },
          style: { font_weight: "normal" as const, text_color: "#ffffff" },
          effects: [],
        };

        if (opts.enableEmotionAnalysis && emotionalIntelligenceFlags?.emotion_analysis_enabled) {
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

        const aiResponse = createAIMessage(
          aiResponseContent,
          activeSessionId,
          characterId,
          activeSession.participants.characters[0]?.name,
          aiEmotionExpression
        );

        const finalSession = getSessionSafely(get().sessions, activeSessionId)!;
        const sessionWithAiResponse = {
          ...finalSession,
          messages: [...finalSession.messages, aiResponse],
          message_count: finalSession.message_count + 1,
          updated_at: new Date().toISOString(),
        };
        set((state: any) => ({
          sessions: createMapSafely(state.sessions).set(
            activeSessionId,
            sessionWithAiResponse
          ),
        }));

        // 🧠 Mem0にAIレスポンスを取り込む
        if (opts.enableMem0Integration) {
          await ingestConversationPairToMem0(
            userMessage,
            aiResponse,
            characterId,
            "NEW sendMessage"
          );
        }

        // トラッカーの自動更新
        if (opts.enableTrackerUpdate && trackerManager && characterId) {
          console.log("🎯 [NEW sendMessage] Updating trackers...");
          try {
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
                `✅ [NEW sendMessage] Updated ${updatedTrackers.length} tracker(s)`
              );
              set((state: any) => ({
                trackerManagers: new Map(state.trackerManagers),
              }));

              try {
                const currentState = get();
                if (currentState.clearConversationCache) {
                  currentState.clearConversationCache(activeSessionId);
                  console.log(
                    `✅ [NEW sendMessage] Cleared conversation cache`
                  );
                }
              } catch (error) {
                console.warn(
                  "Failed to clear conversation cache:",
                  error
                );
              }
            }
          } catch (error) {
            console.error("❌ [NEW sendMessage] Failed to update trackers:", error);
          }
        }

        // バックグラウンド後処理
        if (opts.enableBackgroundProcessing) {
          setTimeout(() => {
            Promise.allSettled([
              get().emotionalIntelligenceFlags.emotional_memory_enabled
                ? autoMemoryManager.processNewMessage(
                    aiResponse,
                    activeSessionId,
                    activeSession.participants.characters[0]?.id,
                    undefined,
                    get().createMemoryCard
                  )
                : Promise.resolve(null),
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
                  const [userUpdates, aiUpdates] = trackerResult.value;
                  const allUpdates = [
                    ...(userUpdates || []),
                    ...(aiUpdates || []),
                  ];
                  if (allUpdates.length > 0) {
                    console.log(
                      `✅ [NEW sendMessage] Background tracker analysis updated ${allUpdates.length} tracker(s)`
                    );

                    set((state: any) => ({
                      trackerManagers: new Map(state.trackerManagers),
                    }));

                    try {
                      const currentState = get();
                      if (currentState.clearConversationCache) {
                        currentState.clearConversationCache(activeSessionId);
                      }
                    } catch (error) {
                      console.warn(
                        "Failed to clear conversation cache:",
                        error
                      );
                    }
                  }
                }
              })
              .catch((error) => {
                console.error("⚠️ Background processing error:", error);
              });
          }, 0);
        }

        return { success: true, userMessage, aiMessage: aiResponse };
      } catch (error) {
        console.error("🚨 [NEW sendMessage] Critical error:", error);

        const chatError = ChatErrorHandler.createChatError(error, "send");
        ChatErrorHandler.logError(error, "NEW sendMessage");
        ChatErrorHandler.showUserFriendlyError(chatError.message);

        set({
          lastError: {
            type: "send",
            message: chatError.message,
            timestamp: chatError.timestamp,
            details: chatError.details as string,
          },
        });

        return {
          success: false,
          error: chatError.message,
        };
      } finally {
        set({ is_generating: false });
      }
    },
  };
};
