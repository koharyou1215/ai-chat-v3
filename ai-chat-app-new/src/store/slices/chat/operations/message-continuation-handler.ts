// src/store/slices/chat/operations/message-continuation-handler.ts

import { StateCreator } from "zustand";
import { AppStore } from "@/store";
import { UnifiedMessage } from "@/types";
import { MessageContinuationSlice } from "./types";
import { getSessionSafely, createMapSafely } from "@/utils/chat/map-helpers";
import { promptBuilderService } from "@/services/prompt-builder.service";
import { simpleAPIManagerV2 } from "@/services/simple-api-manager-v2";
import { generateStableId } from "@/utils/uuid";
import { getTrackerManagerSafely } from "@/utils/chat/tracker-helpers";
import { createAIMessage } from "@/utils/chat/message-factory";
import { buildConversationHistory } from "@/utils/chat/context-management";

export const createMessageContinuationHandler: StateCreator<
  AppStore,
  [],
  [],
  MessageContinuationSlice
> = (set, get) => ({
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
      // 🔧 修正: sessionIdでTrackerManagerを取得（セッションスコープ設計に統一）
      const characterId = session.participants.characters[0]?.id;
      const trackerManager = get().getTrackerManager
        ? get().getTrackerManager(session_id)
        : null;

      // 続きを生成するため、前のメッセージの内容を基にプロンプトを構築
      // 🚨 重要: キャラクターの発言のみを続けるように明確に指示
      const continuePrompt = `
🎯 **重要指示: 続き生成モード**

前回のあなた（{{char}}）の発言:
「${lastAiMessage.content}」

**あなた（{{char}}）の発言の続きを書いてください。**

⚠️ **厳守事項**:
1. あなた（{{char}}）の発言・行動・心理のみを書く
2. {{user}}の発言・行動・反応を絶対に書かない
3. {{user}}の代わりに応答しない
4. 会話を進めすぎず、あなたの発言の自然な続きだけを書く
5. 前回の発言の雰囲気・トーンを維持する

**良い例**: 「...それでね、昨日のことなんだけど。（少し考えて）実は私もちょっと驚いたんだ」
**悪い例**: 「...それでね、昨日のことなんだけど。」と彼女は言った。{{user}}は「そうなんだ」と答えた。

あなた（{{char}}）の発言の続き:`;

      const systemPrompt = await promptBuilderService.buildPrompt(
        session,
        continuePrompt,
        trackerManager || undefined
      );

      // 🔧 修正: 設定から会話履歴の上限を取得
      const stateWithChat = get() as ReturnType<typeof get> & {
        chat?: {
          memory_limits?: {
            max_context_messages?: number;
          };
        };
      };
      const maxContextMessages =
        stateWithChat.chat?.memory_limits?.max_context_messages || 40;

      // 続き生成でもMem0を使用（context-management統合）
      const conversationHistory = buildConversationHistory(
        session.messages,
        {
          sessionId: session.id,
          maxContextMessages,
        }
      );

      // 🔧 FIX: API設定にuseDirectGeminiAPIとAPIキーを含める（モバイルSafari対策）
      const apiConfig = {
        ...(get().apiConfig || {}),
        openRouterApiKey: get().openRouterApiKey,
        geminiApiKey: get().geminiApiKey,
        useDirectGeminiAPI: get().useDirectGeminiAPI,
      };
      const aiResponse = await simpleAPIManagerV2.generateMessage(
        systemPrompt,
        continuePrompt,
        conversationHistory,
        apiConfig
      );

      // 新しい続きメッセージを作成
      const newContinuationMessage: UnifiedMessage = createAIMessage(
        aiResponse,
        activeSessionId,
        session.participants.characters[0]?.id,
        session.participants.characters[0]?.name,
        {
          emotion: { primary: "neutral", intensity: 0.6, emoji: "💬" },
          style: { font_weight: "normal", text_color: "#ffffff" },
          effects: [],
        }
      );
      // 継続メッセージのメタデータを追加
      const messageMetadata = lastAiMessage.metadata as Record<string, unknown> | undefined;
      newContinuationMessage.metadata = {
        is_continuation: true,
        continuation_of: lastAiMessage.id,
        continuation_count:
          (typeof messageMetadata?.continuation_count === "number"
            ? messageMetadata.continuation_count
            : 0) + 1,
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
      } as Partial<ReturnType<typeof get>>);

      // エラートースト表示（実装されている場合）
      const windowWithToast = typeof window !== "undefined"
        ? (window as Window & { showToast?: (message: string, type: string) => void })
        : undefined;
      if (windowWithToast?.showToast) {
        windowWithToast.showToast(errorMessage, "error");
      }
    } finally {
      set({ is_generating: false });
    }
  },
});
