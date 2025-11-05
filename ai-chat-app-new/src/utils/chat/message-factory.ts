/**
 * Phase 2.1: Message Factory
 *
 * メッセージ作成ロジックを統一するファクトリーパターン実装
 *
 * 目的:
 * - ユーザーメッセージ、AIメッセージ、システムメッセージの作成ロジックを統合
 * - 3つのハンドラー（send, continuation, regeneration）での重複コード削減
 * - 型安全性と保守性の向上
 *
 * 削減見込み: 120-170行
 */

import { UnifiedMessage, EmotionState } from "@/types";
import { generateStableId } from "@/utils/uuid";

/**
 * 感情表現インターフェース（AIメッセージ用）
 */
export interface EmotionExpression {
  emotion: EmotionState;
  style: {
    font_weight: "light" | "normal" | "bold";
    text_color: string;
  };
  effects: Array<{
    type: "particle" | "highlight" | "vibration";
    parameters: Record<string, unknown>;
  }>;
}

/**
 * ユーザーメッセージを作成
 *
 * @param content - メッセージ内容
 * @param sessionId - セッションID
 * @param imageUrl - 画像URL（オプション）
 * @returns 完全に初期化されたUnifiedMessage
 */
export function createUserMessage(
  content: string,
  sessionId: string,
  imageUrl?: string
): UnifiedMessage {
  return {
    id: generateStableId('user'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    session_id: sessionId,
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
}

/**
 * AIメッセージを作成
 *
 * @param content - メッセージ内容
 * @param sessionId - セッションID
 * @param characterId - キャラクターID（オプション）
 * @param characterName - キャラクター名（オプション）
 * @param emotionExpression - 感情表現（オプション）
 * @returns 完全に初期化されたUnifiedMessage
 */
export function createAIMessage(
  content: string,
  sessionId: string,
  characterId?: string,
  characterName?: string,
  emotionExpression?: EmotionExpression
): UnifiedMessage {
  return {
    id: generateStableId('ai'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    session_id: sessionId,
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
}

/**
 * システムメッセージを作成
 *
 * @param content - メッセージ内容
 * @param sessionId - セッションID
 * @returns 完全に初期化されたUnifiedMessage
 */
export function createSystemMessage(
  content: string,
  sessionId: string
): UnifiedMessage {
  return {
    id: generateStableId('system'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    session_id: sessionId,
    is_deleted: false,
    role: "system",
    content,
    memory: {
      importance: {
        score: 0.5,
        factors: {
          emotional_weight: 0,
          repetition_count: 0,
          user_emphasis: 0,
          ai_judgment: 0.5,
        },
      },
      is_pinned: false,
      is_bookmarked: false,
      keywords: ["system"],
      summary: undefined,
    },
    expression: {
      emotion: { primary: "neutral", intensity: 0, emoji: "ℹ️" },
      style: { font_weight: "normal", text_color: "#888888" },
      effects: [],
    },
    edit_history: [],
    regeneration_count: 0,
    metadata: {},
  };
}
