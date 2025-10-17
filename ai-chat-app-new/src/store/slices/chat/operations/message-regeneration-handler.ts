// src/store/slices/chat/operations/message-regeneration-handler.ts

import { StateCreator } from "zustand";
import { AppStore } from "@/store";
import { UnifiedMessage } from "@/types";
import { MessageRegenerationSlice } from "./types";
import { getSessionSafely, createMapSafely } from "@/utils/chat/map-helpers";
import { promptBuilderService } from "@/services/prompt-builder.service";
import { simpleAPIManagerV2 } from "@/services/simple-api-manager-v2";
import { generateAIMessageId } from "@/utils/uuid";

// Helper function to safely get tracker manager from Map or Object
const getTrackerManagerSafely = (
  trackerManagers: any,
  key: string
): any | undefined => {
  if (!trackerManagers || !key) return undefined;
  if (trackerManagers instanceof Map) {
    return trackerManagers.get(key);
  } else if (typeof trackerManagers === "object") {
    return trackerManagers[key];
  }
  return undefined;
};

export const createMessageRegenerationHandler: StateCreator<
  AppStore,
  [],
  [],
  MessageRegenerationSlice
> = (set, get) => ({
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

      // 🔧 修正: sessionIdでTrackerManagerを取得
      const trackerManager = activeSessionId
        ? getTrackerManagerSafely(get().trackerManagers, activeSessionId)
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
      const maxContextMessages =
        (get() as any).chat?.memory_limits?.max_context_messages || 40;
      // 再生成でもMem0を使用
      let conversationHistory;
      try {
        const { Mem0 } = require("@/services/mem0/core");
        conversationHistory = Mem0.getCandidateHistory(
          messagesForPrompt,
          {
            sessionId: session.id,
            maxContextMessages,
            minRecentMessages: Math.max(5, Math.floor(maxContextMessages / 4)),
          }
        );
      } catch (e) {
        // フォールバック
        conversationHistory = messagesForPrompt
          .filter((msg) => msg.role === "user" || msg.role === "assistant")
          .slice(-maxContextMessages)
          .map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          }));
      }

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
      } as any);

      // エラートースト表示（実装されている場合）
      if (typeof window !== "undefined" && (window as any).showToast) {
        (window as any).showToast(errorMessage, "error");
      }
    } finally {
      set({ is_generating: false });
    }
  },
});
