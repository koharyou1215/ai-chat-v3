/**
 * Mem0 Integration Helper
 * Mem0統合処理の共通化（重複コード削減）
 *
 * 使用箇所:
 * - sendMessage (ユーザーメッセージ取り込み)
 * - sendMessage (AIレスポンス取り込み + キャラクター進化)
 * - addMessage (メッセージ取り込み)
 */

import { UnifiedMessage } from "@/types";

/**
 * Mem0にメッセージを取り込む（エラーハンドリング込み）
 *
 * @param message - 取り込むメッセージ
 * @param context - ログ用コンテキスト（"sendMessage", "addMessage"等）
 * @returns 成功したかどうか
 *
 * @example
 * ```ts
 * await ingestMessageToMem0Safely(userMessage, "sendMessage");
 * ```
 */
export async function ingestMessageToMem0Safely(
  message: UnifiedMessage,
  context: string = "unknown"
): Promise<boolean> {
  try {
    const { Mem0 } = require("@/services/mem0/core");
    await Mem0.ingestMessage(message);
    console.log(
      `✅ [${context}] Message ingested to Mem0:`,
      message.id
    );
    return true;
  } catch (error) {
    console.warn(
      `⚠️ [${context}] Failed to ingest message to Mem0:`,
      error
    );
    return false;
  }
}

/**
 * キャラクター進化処理を実行（エラーハンドリング込み）
 *
 * @param characterId - キャラクターID
 * @param messages - 進化に使用するメッセージ（通常はユーザーメッセージとAIレスポンスのペア）
 * @param context - ログ用コンテキスト
 * @returns 成功したかどうか
 *
 * @example
 * ```ts
 * await evolveCharacterSafely(characterId, [userMessage, aiResponse], "sendMessage");
 * ```
 */
export async function evolveCharacterSafely(
  characterId: string,
  messages: UnifiedMessage[],
  context: string = "unknown"
): Promise<boolean> {
  try {
    const { Mem0Character } = require("@/services/mem0/character-service");
    await Mem0Character.evolveCharacter(characterId, messages);
    console.log(
      `✅ [${context}] Character evolution completed for:`,
      characterId
    );
    return true;
  } catch (error) {
    console.warn(
      `⚠️ [${context}] Failed to evolve character:`,
      error
    );
    return false;
  }
}

/**
 * メッセージ取り込みとキャラクター進化を一度に実行
 *
 * @param userMessage - ユーザーメッセージ
 * @param aiResponse - AIレスポンス
 * @param characterId - キャラクターID（オプション、指定時のみ進化実行）
 * @param context - ログ用コンテキスト
 *
 * @example
 * ```ts
 * await ingestConversationPairToMem0(
 *   userMessage,
 *   aiResponse,
 *   characterId,
 *   "sendMessage"
 * );
 * ```
 */
export async function ingestConversationPairToMem0(
  userMessage: UnifiedMessage,
  aiResponse: UnifiedMessage,
  characterId: string | undefined,
  context: string = "unknown"
): Promise<void> {
  // ユーザーメッセージ取り込み
  await ingestMessageToMem0Safely(userMessage, context);

  // AIレスポンス取り込み
  await ingestMessageToMem0Safely(aiResponse, context);

  // キャラクター進化（characterIdが指定されている場合のみ）
  if (characterId) {
    await evolveCharacterSafely(
      characterId,
      [userMessage, aiResponse],
      context
    );
  }
}
