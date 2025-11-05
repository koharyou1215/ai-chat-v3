import { StateCreator } from "zustand";
import { UnifiedMessage, UUID } from "@/types";
import type { MemoryCard } from "@/types/core/memory.types";
import {
  ProgressiveMessage,
  DEFAULT_PROGRESSIVE_SETTINGS,
} from "@/types/progressive-message.types";
import { AppStore } from "@/store";
import { simpleAPIManagerV2 } from "@/services/simple-api-manager-v2";
import { progressivePromptBuilder } from "@/services/progressive-prompt-builder.service";
import { messageTransitionService } from "@/services/message-transition.service";
import { autoMemoryManager } from "@/services/memory/auto-memory-manager";
import { getSessionSafely, createMapSafely } from "@/utils/chat/map-helpers";
import { generateStableId } from "@/utils/uuid";
import { getTrackerManagerSafely } from "./operations/message-send-handler";

export interface ProgressiveHandler {
  sendProgressiveMessage: (content: string, imageUrl?: string) => Promise<void>;
}

/**
 * プログレッシブメッセージハンドラー
 * 3段階の応答生成を管理：Reflex → Context → Intelligence
 */
export const createProgressiveHandler: StateCreator<
  AppStore,
  [],
  [],
  ProgressiveHandler
> = (set, get) => ({
  sendProgressiveMessage: async (content: string, imageUrl?: string) => {
    console.log("🚀 [sendProgressiveMessage] Method called", {
      content: content?.substring(0, 50) + "...",
      imageUrl: !!imageUrl,
      timestamp: new Date().toISOString(),
    });

    // グループモードの場合は通常送信にフォールバック
    const state = get();

    console.log("🚀 [sendProgressiveMessage] Starting progressive message generation", {
      is_group_mode: state.is_group_mode,
      active_group_session_id: !!state.active_group_session_id,
      progressiveMode: state.chat?.progressiveMode,
    });

    if (state.is_group_mode && state.active_group_session_id) {
      console.log("🚀 [sendProgressiveMessage] Falling back to group message");
      return await state.sendGroupMessage(content, imageUrl);
    }

    // ✅ FIX: 2重チェックを削除
    // MessageInput.tsxで既にチェック済みのため、ここでは実行のみ
    console.log("✅ [sendProgressiveMessage] Progressive mode enabled, proceeding with 3-stage generation");

    const activeSessionId = state.active_session_id;
    if (!activeSessionId) return;
    const activeSession = getSessionSafely(state.sessions, activeSessionId);
    if (!activeSession) return;

    if (state.is_generating) {
      return;
    }
    set({ is_generating: true });

    // 変数を関数スコープで宣言（後で初期化）
    let sessionWithUserMessage: typeof activeSession;
    let messageId: UUID;
    let startTime: number;
    let progressiveMessage: ProgressiveMessage;
    let memoryCards: MemoryCard[] = [];
    let trackerManager: ReturnType<typeof getTrackerManagerSafely>;
    let characterId: UUID | undefined;

    try {
      console.log(
        "🚀 [sendProgressiveMessage] Starting progressive generation process"
      );

      // 1. ユーザーメッセージを作成
      const userMessage: UnifiedMessage = {
        id: generateStableId('user'),
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
      sessionWithUserMessage = {
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

      // 3. プログレッシブメッセージの初期化
      messageId = generateStableId('ai');
      startTime = Date.now();
      characterId = activeSession.participants.characters[0]?.id;

      // 🔧 FIX: ProgressiveMessage型に合わせてmetadataを修正
      progressiveMessage = {
        id: messageId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        session_id: activeSessionId,
        is_deleted: false,
        role: "assistant",
        content: "",
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
          keywords: [],
          summary: undefined,
        },
        expression: {
          emotion: { primary: "neutral", intensity: 0.6, emoji: "🤔" },
          style: { font_weight: "normal", text_color: "#ffffff" },
          effects: [],
        },
        edit_history: [],
        regeneration_count: 0,
        // 🔧 FIX: ProgressiveMessage専用のmetadata
        metadata: {
          progressive: true, // ✅ FIX: MessageBubbleがプログレッシブメッセージと判定するために必須
          totalTokens: 0,
          totalTime: 0,
          stageTimings: {},
          progressiveData: {
            // ProgressiveMessageBubbleが必要とするデータ
            stages: {},
            currentStage: "reflex",
            transitions: {},
            ui: {
              isUpdating: true,
              glowIntensity: "soft",
              highlightChanges: true,
            },
            metadata: {
              totalTokens: 0,
              totalTime: 0,
              stageTimings: {},
            },
          },
        },
        // Progressive specific fields
        stages: {},
        currentStage: "reflex",
        transitions: {},
        ui: {
          isUpdating: true,
          showIndicator: true,
          glowIntensity: "soft",
          highlightChanges: true,
        },
      };

      // メッセージを即座に表示（空の状態で）
      const sessionWithProgressiveMessage = {
        ...sessionWithUserMessage,
        messages: [...sessionWithUserMessage.messages, progressiveMessage],
        message_count: sessionWithUserMessage.message_count + 1,
      };

      set((state) => ({
        sessions: createMapSafely(state.sessions).set(
          activeSessionId,
          sessionWithProgressiveMessage
        ),
      }));

      // 4. 並列実行の準備
      // 🔧 修正: sessionIdでTrackerManagerを取得（セッションスコープ設計に統一）
      trackerManager = get().getTrackerManager
        ? get().getTrackerManager(activeSessionId)
        : undefined;

      console.log("🔍 DEBUG: Tracker Manager Check", {
        characterId,
        trackerManager: !!trackerManager,
        trackerManagers: Object.keys(get().trackerManagers),
        hasGetDetailedTrackersForPrompt:
          !!trackerManager?.getDetailedTrackersForPrompt,
      });

      console.log("🧠 Starting memory retrieval...");
      try {
        memoryCards = await autoMemoryManager.getRelevantMemoriesForContext(
          sessionWithUserMessage.messages,
          content
        );
        console.log(
          `✅ Memory retrieval complete: ${memoryCards.length} cards found`
        );
      } catch (error) {
        console.error("❌ Memory retrieval failed:", error);
        memoryCards = []; // フォールバック
      }

      // 5. Stage 1: Reflex (即座に開始)
      console.log(
        "🚀 Starting Progressive Message Generation - Stage 1: Reflex"
      );
      (async () => {
        try {
          const reflexPrompt = progressivePromptBuilder.buildReflexPrompt(
            content,
            activeSession.participants.characters[0],
            activeSession.participants.user,
            memoryCards
          );

          console.log("📝 Stage 1 Prompt built, calling API...");

          // ⚡ Stage 1: 直感的な反応のプロンプト強化
          const reflexEnhancedPrompt =
            reflexPrompt.prompt +
            `\n\n【特別指示 - Stage 1: 直感的反応モード】
このレスポンスは第一印象の感情的反応として構成してください。

## 必須要素
- 1-2文の短い感情的反応
- 即座の感情や直感を表現
- 自然な会話体（「」や会話を含む）
- 相手への直接的な反応

## 表現スタイル
- 驚き、喜び、困惑などの感情を素直に表現
- 簡潔で力強い言葉遣い
- 表情や動作の描写を含める
- 親しみやすい口調

## 禁止事項
- 長い説明や分析
- 内面の独白
- 複雑な思考過程
- 過去の記憶への言及`;

          const reflexResult = await simpleAPIManagerV2.generateMessage(
            reflexEnhancedPrompt,
            content,
            [],
            {
              ...get().apiConfig,
              max_tokens: reflexPrompt.tokenLimit,
              temperature: reflexPrompt.temperature,
              openRouterApiKey: get().openRouterApiKey,
              geminiApiKey: get().geminiApiKey,
              useDirectGeminiAPI: get().useDirectGeminiAPI,
            }
          );

          const reflexResponse =
            typeof reflexResult === "string"
              ? reflexResult
              : (reflexResult as any).content || reflexResult;
          const reflexUsage =
            typeof reflexResult === "object"
              ? (reflexResult as any).usage
              : undefined;

          console.log(
            "✨ Stage 1 Response received:",
            reflexResponse.substring(0, 50) + "..."
          );

          // Progressive messageを更新
          progressiveMessage.stages.reflex = {
            content: reflexResponse,
            timestamp: Date.now() - startTime,
            tokens: reflexPrompt.tokenLimit,
            usage: reflexUsage,
          };
          progressiveMessage.currentStage = "reflex";

          // metadata.progressiveDataも更新（MessageBubbleが使用）
          progressiveMessage.metadata = {
            ...progressiveMessage.metadata,
            progressive: true, // ✅ FIX: MessageBubbleがプログレッシブメッセージと判定するために必須
            progressiveData: {
              ...progressiveMessage.metadata.progressiveData,
              stages: progressiveMessage.stages,
              currentStage: "reflex" as const,
              transitions:
                progressiveMessage.metadata.progressiveData?.transitions || {},
              ui: progressiveMessage.metadata.progressiveData?.ui || {
                isUpdating: true,
                glowIntensity: "soft",
                highlightChanges: true,
              },
              metadata: {
                totalTokens: reflexPrompt.tokenLimit,
                totalTime: Date.now() - startTime,
                stageTimings: { reflex: Date.now() - startTime },
              },
            },
            totalTokens: reflexPrompt.tokenLimit,
            totalTime: Date.now() - startTime,
            stageTimings: { reflex: Date.now() - startTime },
          };

          // UIを更新（ディープコピーでReactの再レンダリングを確実にトリガー）
          set((state) => {
            const session = getSessionSafely(state.sessions, activeSessionId);
            if (session) {
              const messageIndex = session.messages.findIndex(
                (m) => m.id === messageId
              );
              if (messageIndex !== -1) {
                const updatedMessages = [...session.messages];
                // ディープコピーを作成してReactが変更を検知できるようにする
                updatedMessages[messageIndex] = {
                  ...progressiveMessage,
                  stages: { ...progressiveMessage.stages },
                  metadata: {
                    ...progressiveMessage.metadata,
                    progressiveData: progressiveMessage.metadata.progressiveData
                      ? {
                          ...progressiveMessage.metadata.progressiveData,
                          stages: { ...progressiveMessage.stages },
                          currentStage: progressiveMessage.currentStage,
                        }
                      : undefined,
                  },
                };
                const updatedSession = {
                  ...session,
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

          console.log(
            "✅ Stage 1 (Reflex) complete:",
            reflexResponse.substring(0, 50) + "..."
          );
        } catch (error) {
          console.error("❌ Stage 1 (Reflex) failed:", error);
        }
      })();
    } catch (error) {
      console.error(
        "❌ Progressive Message Generation failed in main setup:",
        error
      );
      set({ is_generating: false });

      // Fallback to normal message sending if progressive fails
      console.log("🔄 Falling back to normal message generation due to error");
      try {
        await state.sendMessage(content, imageUrl);
      } catch (fallbackError) {
        console.error(
          "❌ Fallback message sending also failed:",
          fallbackError
        );
      }
      return;
    }

    // 6. Stage 2: Context (設定に基づく遅延後に開始)
    const chatSettings = get().chat;
    const stage2Delay =
      chatSettings?.progressiveMode?.stageDelays?.context || 1000;
    console.log(`⏱️ Stage 2 will start after ${stage2Delay}ms delay`);
    setTimeout(async () => {
      console.log(
        "🚀 Starting Progressive Message Generation - Stage 2: Context"
      );
      try {
        const contextPrompt = await progressivePromptBuilder.buildContextPrompt(
          content,
          sessionWithUserMessage,
          memoryCards,
          trackerManager || undefined
        );

        console.log("📝 Stage 2 Prompt built, calling API...");

        // 💭 心の声プロンプト強化: Stage 2では内面的な思考のみを表現
        // 🔥 Stage 1の応答を取得して重複回避
        const currentState2 = get();
        const currentSession2 = getSessionSafely(currentState2.sessions, activeSessionId);
        const currentMsg2 = currentSession2?.messages.find(m => m.id === messageId) as ProgressiveMessage | undefined;
        const reflexResponse = currentMsg2?.stages.reflex?.content || "";

        const heartVoicePrompt =
          contextPrompt.prompt +
          `\n\n【Stage 1の即座の反応】
以下はStage 1で生成された即座の反応です。Stage 2ではこれと異なる内容にしてください：
"""
${reflexResponse}
"""

【特別指示 - Stage 2: 心の声モード】
このレスポンスはキャラクターの内面的な声だけで構成してください。

## 🚨 重複回避の必須ルール
- Stage 1で使った単語や表現を避け、**新しい視点や異なる感情の側面**を掘り下げる
- Stage 1と同じ結論や感情を繰り返さない
- 少なくとも3つ以上の新しい要素（新しい感情、記憶、気づき、葛藤）を追加する

## 必須ルール
- 一人称のモノローグで、ユーザーに直接話しかけない
- 「本当は…」「でも…」「心の中では…」「実は…」「でも本当は…」などのフレーズを必ず含める
- 外に出す言葉や行動描写は禁止
- 感情の揺れや葛藤を強調する

## 表現スタイル
- 内面の独白のみ（「」や会話は使わない）
- 感情の動きを丁寧に描写
- 過去の記憶との関連性を示す
- 相手への想いや感情の変化を表現

## 禁止事項
- ユーザーへの直接的な返答
- 行動や表情の描写
- 会話体（「」）の使用
- 表面的な返事
- Stage 1と同じ内容の繰り返し`;

        const contextResult = await simpleAPIManagerV2.generateMessage(
          heartVoicePrompt,
          content,
          contextPrompt.conversationHistory || [],
          {
            ...get().apiConfig,
            max_tokens: contextPrompt.tokenLimit,
            temperature: 0.85, // 🔥 高めに設定して創発性向上
            top_p: 0.92, // 🔥 より多様な表現を生成
            frequency_penalty: 0.8, // 🔥 同じ単語の繰り返しを強く抑制
            presence_penalty: 0.8, // 🔥 同じトピックの繰り返しを強く抑制
            openRouterApiKey: get().openRouterApiKey,
            geminiApiKey: get().geminiApiKey,
            useDirectGeminiAPI: get().useDirectGeminiAPI,
          }
        );

        // contextResult is always a string (as per generateMessage return type)
        const contextResponse = contextResult;
        const contextUsage = undefined; // generateMessage doesn't return usage info

        console.log(
          "✨ Stage 2 Response received:",
          contextResponse.substring(0, 50) + "..."
        );

        // 現在の状態を取得して更新
        const currentState = get();
        const currentSession = currentState.sessions.get(activeSessionId);
        if (!currentSession) {
          console.error("❌ Session not found for Stage 2 update");
          return;
        }

        const updatedMessages = [...currentSession.messages];
        const messageIndex = updatedMessages.findIndex(
          (m) => m.id === messageId
        );

        if (messageIndex === -1) {
          console.error("❌ Progressive message not found for Stage 2 update");
          return;
        }

        const currentProgressiveMessage = updatedMessages[
          messageIndex
        ] as ProgressiveMessage;

        // Progressive messageを更新
        const updatedProgressiveMessage: ProgressiveMessage = {
          ...currentProgressiveMessage,
          stages: {
            ...currentProgressiveMessage.stages,
            context: {
              content: contextResponse,
              timestamp: Date.now() - startTime,
              tokens: contextPrompt.tokenLimit,
              diff: messageTransitionService.detectChanges(
                currentProgressiveMessage.stages.reflex?.content || "",
                contextResponse
              ),
              usage: contextUsage,
            },
          },
          currentStage: "context",
          metadata: {
            ...currentProgressiveMessage.metadata,
            progressiveData: currentProgressiveMessage.metadata.progressiveData
              ? {
                  ...currentProgressiveMessage.metadata.progressiveData,
                  stages: {
                    ...currentProgressiveMessage.stages,
                    context: {
                      content: contextResponse,
                      timestamp: Date.now() - startTime,
                      tokens: contextPrompt.tokenLimit,
                      diff: messageTransitionService.detectChanges(
                        currentProgressiveMessage.stages.reflex?.content || "",
                        contextResponse
                      ),
                      usage: contextUsage,
                    },
                  },
                  currentStage: "context",
                  metadata: {
                    totalTokens:
                      (currentProgressiveMessage.metadata.totalTokens || 0) +
                      contextPrompt.tokenLimit,
                    totalTime: Date.now() - startTime,
                    stageTimings: {
                      ...currentProgressiveMessage.metadata.stageTimings,
                      context: Date.now() - startTime,
                    },
                  },
                }
              : undefined,
            totalTokens:
              (currentProgressiveMessage.metadata.totalTokens || 0) +
              contextPrompt.tokenLimit,
            stageTimings: {
              ...currentProgressiveMessage.metadata.stageTimings,
              context: Date.now() - startTime,
            },
          },
        };

        // 状態を更新
        set((state) => ({
          sessions: createMapSafely(state.sessions).set(activeSessionId, {
            ...currentSession,
            messages: updatedMessages.map((msg, index) =>
              index === messageIndex ? updatedProgressiveMessage : msg
            ),
          }),
        }));

        console.log(
          "✅ Stage 2 (Context) complete:",
          contextResponse.substring(0, 50) + "..."
        );
      } catch (error) {
        console.error("❌ Stage 2 (Context) failed:", error);
        // Stage 2が失敗してもStage 3は実行する
      }
    }, stage2Delay);

    // 7. Stage 3: Intelligence (設定に基づく遅延後に開始)
    const stage3Delay =
      chatSettings?.progressiveMode?.stageDelays?.intelligence || 2000;
    console.log(`⏱️ Stage 3 will start after ${stage3Delay}ms delay`);
    setTimeout(async () => {
      console.log(
        "🚀 Starting Progressive Message Generation - Stage 3: Intelligence"
      );
      try {
        const systemInstructions = get().systemPrompts.system;

        // 🔧 FIX: activeSessionを再取得して最新の状態を使用
        const currentState = get();
        const currentActiveSession = getSessionSafely(
          currentState.sessions,
          activeSessionId
        );

        if (!currentActiveSession) {
          console.error("❌ Active session not found");
          return;
        }

        // 🔧 FIX: sessionWithUserMessageを再構築
        const currentSessionWithUserMessage = {
          ...currentActiveSession,
          messages: currentActiveSession.messages.filter(
            (m) => m.id !== messageId
          ),
        };

        // 🔧 FIX: memoryCardsを再度取得
        let currentMemoryCards: MemoryCard[] = [];
        try {
          currentMemoryCards =
            await autoMemoryManager.getRelevantMemoriesForContext(
              currentSessionWithUserMessage.messages,
              content
            );
          console.log(
            `✅ Memory cards retrieved: ${currentMemoryCards.length}`
          );
        } catch (error) {
          console.error("❌ Memory retrieval failed:", error);
          currentMemoryCards = [];
        }

        console.log("🔍 DEBUG: buildIntelligencePrompt called with", {
          content: content.substring(0, 50) + "...",
          memoryCardsCount: currentMemoryCards.length,
          trackerManager: !!trackerManager,
          systemInstructionsLength: systemInstructions?.length || 0,
        });

        const intelligencePrompt =
          await progressivePromptBuilder.buildIntelligencePrompt(
            content,
            currentSessionWithUserMessage,
            currentMemoryCards,
            trackerManager || undefined,
            systemInstructions
          );

        console.log("📝 Stage 3 Prompt built, calling API...");

        // 🔥 Stage 2の内心の声を取得
        const currentMsg3 = currentActiveSession?.messages.find(
          (m) => m.id === messageId
        ) as ProgressiveMessage | undefined;
        const contextResponse = currentMsg3?.stages.context?.content || "";

        // 🎭 Stage 3: ロールプレイモードのプロンプト強化
        const intelligenceEnhancedPrompt =
          intelligencePrompt.prompt +
          `\n\n【Stage 2の内心の声】
以下はStage 2で生成されたキャラクターの内面的な思考です。Stage 3ではこれを踏まえつつ、表に出す言動として表現してください：
"""
${contextResponse}
"""

【特別指示 - Stage 3: ロールプレイモード】
このレスポンスではキャラクターとして完全になりきってください。

## 🚨 差別化の必須ルール
- Stage 2の内心を**実際の言動や行動**として自然に表現する
- Stage 2で述べられた「未解決の感情」や「葛藤」に応答する
- 新しいアクション提案や具体的な行動を最低2つ追加する
- Stage 2と同じ言い回しや表現を避け、より具体的・行動的な表現にする
- 内心の声を「実際にユーザーに伝わる形」に変換する

## 必須要素
- 出力はユーザーに向けた会話や行動描写を中心にする
- 一人称やキャラ特有の口調を徹底する
- 物語的な演出や仕草を加えてもよい
- 内心の声やシステム的説明は禁止
- 「RP感を強く出した完成版の返答」にする

## 表現スタイル
- キャラクターの個性を最大限に活かした会話
- 自然な動作や表情の描写
- キャラクターの背景や設定を反映した反応
- ユーザーとの関係性を意識した応答

## 禁止事項
- 内面の独白や心の声（Stage 2と同じ形式）
- システム的な説明や分析
- キャラクターを離れた客観的な視点
- メタ的な発言
- Stage 2の内容をそのまま繰り返す`;

        const intelligenceResult = await simpleAPIManagerV2.generateMessage(
          intelligenceEnhancedPrompt,
          content,
          intelligencePrompt.conversationHistory || [],
          {
            ...get().apiConfig,
            max_tokens: intelligencePrompt.tokenLimit,
            temperature: 0.9, // 🔥 最も高く設定して多様性最大化
            top_p: 0.95, // 🔥 最大限の表現多様性
            frequency_penalty: 1.0, // 🔥 同じ単語の繰り返しを最大限抑制
            presence_penalty: 1.0, // 🔥 同じトピックの繰り返しを最大限抑制
            openRouterApiKey: get().openRouterApiKey,
            geminiApiKey: get().geminiApiKey,
            useDirectGeminiAPI: get().useDirectGeminiAPI,
          }
        );

        // intelligenceResult is always a string (as per generateMessage return type)
        const intelligenceResponse = intelligenceResult;
        const intelligenceUsage = undefined; // generateMessage doesn't return usage info

        console.log(
          "✨ Stage 3 Response received:",
          intelligenceResponse.substring(0, 50) + "..."
        );

        // 現在のメッセージを取得してStage 2のデータを確実に保持
        const latestState = get();
        const currentSession = getSessionSafely(
          latestState.sessions,
          activeSessionId
        );
        const currentMessageIndex = currentSession?.messages.findIndex(
          (m) => m.id === messageId
        );
        const currentMessage = currentSession?.messages[
          currentMessageIndex!
        ] as ProgressiveMessage;

        // Progressive messageを更新（既存のstagesを保持しながら更新）
        progressiveMessage = {
          ...progressiveMessage,
          stages: {
            reflex:
              currentMessage?.stages.reflex || progressiveMessage.stages.reflex,
            context:
              currentMessage?.stages.context ||
              progressiveMessage.stages.context,
            intelligence: {
              content: intelligenceResponse,
              timestamp: Date.now() - startTime,
              tokens: intelligencePrompt.tokenLimit,
              diff: messageTransitionService.detectChanges(
                progressiveMessage.stages.context?.content || "",
                intelligenceResponse
              ),
              usage: intelligenceUsage,
            },
          },
          content: intelligenceResponse,
          currentStage: "intelligence",
          ui: {
            ...progressiveMessage.ui,
            isUpdating: false,
            glowIntensity: "none",
          },
        };

        // metadata.progressiveDataも更新（MessageBubbleが使用）
        progressiveMessage.metadata = {
          ...progressiveMessage.metadata,
          progressive: true, // ✅ FIX: MessageBubbleがプログレッシブメッセージと判定するために必須
          progressiveData: {
            ...progressiveMessage.metadata.progressiveData,
            stages: { ...progressiveMessage.stages },
            currentStage: "intelligence" as const,
            transitions: {
              reflexToContext: progressiveMessage.transitions?.reflexToContext,
              contextToIntelligence: progressiveMessage.transitions?.contextToIntelligence,
            },
            ui: { ...progressiveMessage.ui },
            metadata: {
              totalTokens:
                (progressiveMessage.metadata.totalTokens || 0) +
                intelligencePrompt.tokenLimit,
              totalTime: Date.now() - startTime,
              stageTimings: {
                ...progressiveMessage.metadata.stageTimings,
                intelligence: Date.now() - startTime,
              },
            },
          },
          totalTokens:
            (progressiveMessage.metadata.totalTokens || 0) +
            intelligencePrompt.tokenLimit,
          totalTime: Date.now() - startTime,
          stageTimings: {
            ...progressiveMessage.metadata.stageTimings,
            intelligence: Date.now() - startTime,
          },
        };

        // UIを最終更新（ディープコピーでReactの再レンダリングを確実にトリガー）
        set((state) => {
          const session = getSessionSafely(state.sessions, activeSessionId);
          if (session) {
            const messageIndex = session.messages.findIndex(
              (m) => m.id === messageId
            );
            if (messageIndex !== -1) {
              const updatedMessages = [...session.messages];
              const currentMessage = updatedMessages[
                messageIndex
              ] as ProgressiveMessage;

              // Stage 2のデータを確実に保持しながらStage 3を追加
              const finalStages = {
                reflex: currentMessage.stages.reflex,
                context: currentMessage.stages.context, // Stage 2を保持
                intelligence: progressiveMessage.stages.intelligence, // Stage 3を追加
              };

              // ディープコピーを作成してReactが変更を検知できるようにする
              updatedMessages[messageIndex] = {
                ...progressiveMessage,
                stages: finalStages,
                metadata: {
                  ...progressiveMessage.metadata,
                  progressiveData: progressiveMessage.metadata.progressiveData
                    ? {
                        ...progressiveMessage.metadata.progressiveData,
                        stages: finalStages,
                        currentStage: progressiveMessage.currentStage,
                      }
                    : undefined,
                },
              };
              const updatedSession = {
                ...session,
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

        console.log(
          `✅ Progressive message complete: ${progressiveMessage.metadata.totalTokens} tokens in ${progressiveMessage.metadata.totalTime}ms`
        );

        // トラッカー更新（バックグラウンド）
        if (trackerManager && characterId) {
          // 🔧 FIX: updateFromMessage method doesn't exist, use alternative
          // trackerManager.updateFromMessage(characterId, intelligenceResponse, 'assistant');
        }

        // メモリー処理（バックグラウンド）
        setTimeout(() => {
          (async () => {
            const { FEATURE_FLAGS } = await import('@/config/feature-flags');
            const { memoryDebugLog } = await import('@/utils/memory-debug');
            const { Mem0 } = await import('@/services/mem0/core');
            // Get the last user message from the session
            const currentState = get();
            const currentSession = getSessionSafely(currentState.sessions, activeSessionId);
            const userMessage = currentSession?.messages.filter(m => m.role === 'user').pop();

            if (FEATURE_FLAGS.USE_MEM0_MEMORY_GENERATION && userMessage) {
              const messages = [userMessage, progressiveMessage];
              const result = await Mem0.shouldPromoteToMemoryCard(messages);
              memoryDebugLog.mem0('shouldPromote', result);
              if (result.shouldPromote) {
                await Mem0.promoteToMemoryCard(
                  `Conversation: ${messages.map(m => m.content.slice(0, 30)).join(' → ')}`,
                  {
                    importance: {
                      score: result.importance,
                      factors: {
                        emotional_weight: 0.5,
                        repetition_count: 0,
                        user_emphasis: 0.5,
                        ai_judgment: 0.5,
                      },
                    },
                    session_id: activeSessionId,
                    character_id: characterId,
                  }
                );
              }
            } else {
              await autoMemoryManager.processNewMessage(
                progressiveMessage,
                activeSessionId,
                characterId,
                undefined, // TODO: 感情分析結果を統合
                get().createMemoryCard
              );
            }
          })();
        }, 100);
      } catch (error) {
        console.error("❌ Stage 3 (Intelligence) failed:", error);
        console.error("Stage 3 Error Details:", error);
      } finally {
        console.log(
          "🏁 Progressive Generation Complete - Setting is_generating to false"
        );
        set({ is_generating: false });
      }
    }, stage3Delay);
  },
});
