/**
 * 変数置換ユーティリティ
 * {{user}}と {{char}}をペルソナ名とキャラクター名に置換する
 */

import { Persona, Character } from "@/types";

export interface VariableContext {
  user?: Persona;
  character?: Character;
}

/**
 * テキスト内の変数を置換する
 * @param text 置換対象のテキスト
 * @param context 変数置換のコンテキスト
 * @returns 置換後のテキスト
 */
export function replaceVariables(
  text: string,
  context: VariableContext
): string {
  if (!text || typeof text !== "string") {
    return text || "";
  }

  let result = text;

  // {{user}}を置換
  if (context.user?.name) {
    result = result.replace(/\{\{user\}\}/gi, context.user.name);
  }

  //  {{char}}を置換
  if (context.character?.name) {
    result = result.replace(/\{\{char\}\}/gi, context.character.name);
  }

  return result;
}

/**
 * オブジェクト内の文字列プロパティを再帰的に置換する
 * @param obj 置換対象のオブジェクト
 * @param context 変数置換のコンテキスト
 * @returns 置換後のオブジェクト
 */
export function replaceVariablesInObject<T>(
  obj: T,
  context: VariableContext
): T {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  if (typeof obj === "string") {
    return replaceVariables(obj, context) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      replaceVariablesInObject(item, context)
    ) as unknown as T;
  }

  const result = { ...obj } as Record<string, unknown>;

  for (const key in result) {
    if (result.hasOwnProperty(key)) {
      const value = result[key];

      if (typeof value === "string") {
        result[key] = replaceVariables(value, context);
      } else if (typeof value === "object" && value !== null) {
        result[key] = replaceVariablesInObject(value, context);
      }
    }
  }

  return result as T;
}

/**
 * キャラクター情報内のテキストフィールドを置換する（完全版）
 * @param character キャラクター情報
 * @param context 変数置換のコンテキスト
 * @returns 置換後のキャラクター情報
 */
export function replaceVariablesInCharacter(
  character: Character,
  context: VariableContext
): Character {
  const replacableFields = [
    "description",
    "personality",
    "external_personality",
    "internal_personality",
    "appearance",
    "speaking_style",
    "background",
    "scenario",
    "system_prompt",
    "first_message",
    "catchphrase",
    "name", // 名前も置換対象に追加
    "age",
    "occupation",
    "first_person",
    "second_person",
    "image_prompt",
    "negative_prompt",
  ] as const;

  const result = { ...character };

  // 文字列フィールドの置換
  for (const field of replacableFields) {
    if (result[field] && typeof result[field] === "string") {
      (result as Record<string, unknown>)[field] = replaceVariables(
        result[field] as string,
        context
      );
    }
  }

  // 配列フィールドの置換
  if (result.strengths) {
    result.strengths = result.strengths.map((item) =>
      replaceVariables(item, context)
    );
  }

  if (result.weaknesses) {
    result.weaknesses = result.weaknesses.map((item) =>
      replaceVariables(item, context)
    );
  }

  if (result.hobbies) {
    result.hobbies = result.hobbies.map((item) =>
      replaceVariables(item, context)
    );
  }

  if (result.likes) {
    result.likes = result.likes.map((item) => replaceVariables(item, context));
  }

  if (result.dislikes) {
    result.dislikes = result.dislikes.map((item) =>
      replaceVariables(item, context)
    );
  }

  if (result.verbal_tics) {
    result.verbal_tics = result.verbal_tics.map((item) =>
      replaceVariables(item, context)
    );
  }

  if (result.tags) {
    result.tags = result.tags.map((item) => replaceVariables(item, context));
  }

  // NSFW プロファイルの置換
  if (result.nsfw_profile) {
    result.nsfw_profile = replaceVariablesInObject(
      result.nsfw_profile,
      context
    );
  }

  // トラッカー定義の置換
  if (result.trackers && Array.isArray(result.trackers)) {
    result.trackers = result.trackers.map((tracker) => ({
      ...tracker,
      name: replaceVariables(tracker.name, context),
      display_name: replaceVariables(tracker.display_name, context),
      description: tracker.description
        ? replaceVariables(tracker.description, context)
        : tracker.description,
      // トラッカー設定内の文字列も置換
      config: replaceVariablesInObject(tracker.config, context),
    }));
  }

  // カラーテーマの置換（必要に応じて）
  if (result.color_theme) {
    result.color_theme = replaceVariablesInObject(result.color_theme, context);
  }

  return result;
}

/**
 * メッセージテキストの置換（HTMLタグを考慮）
 * @param text メッセージテキスト
 * @param context 変数置換のコンテキスト
 * @returns 置換後のテキスト
 */
export function replaceVariablesInMessage(
  text: string,
  context: VariableContext
): string {
  if (!text || typeof text !== "string") {
    return text || "";
  }

  // HTMLタグ内の属性値も置換対象とする
  return replaceVariables(text, context);
}

/**
 * ストアから変数置換コンテキストを取得する
 * @param getStore ストア取得関数
 * @returns 変数置換コンテキスト
 */
export function getVariableContext(
  getStore: () => Record<string, unknown>
): VariableContext {
  const store = getStore();

  const user =
    (store.getSelectedPersona as (() => Persona | null) | undefined)?.() ||
    (store.getActivePersona as (() => Persona | null) | undefined)?.();
  const character =
    (store.getActiveCharacter as (() => Character | null) | undefined)?.() ||
    (store.getSelectedCharacter as (() => Character | null) | undefined)?.();

  return {
    user: user ?? undefined,
    character: character ?? undefined,
  };
}
