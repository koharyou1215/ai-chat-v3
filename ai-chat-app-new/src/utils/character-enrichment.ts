/**
 * Character Enrichment Utility
 * キャラクターデータ自動補完ユーティリティ
 *
 * JSONファイルに必須フィールドが無い場合、自動的に生成して追加する
 */

import { Character } from '@/types/core/character.types';
import { randomUUID } from 'crypto';

/**
 * キャラクターデータに必須フィールドを自動補完
 *
 * @param {Partial<Character>} characterData - 元のキャラクターデータ（一部フィールドが欠けている可能性あり）
 * @param {string} filename - ファイル名（idの生成に使用）
 * @returns {Character} 必須フィールドが補完されたキャラクターデータ
 */
export function enrichCharacterData(
  characterData: Partial<Character>,
  filename: string
): Character {
  const now = new Date().toISOString();

  // idの生成: 既存のidがあればそれを使用、無ければファイル名から生成
  const characterId = characterData.id || generateIdFromFilename(filename);

  // 必須フィールドの補完
  const enriched: Character = {
    // BaseEntity必須フィールド
    id: characterId,
    created_at: characterData.created_at || now,
    updated_at: characterData.updated_at || now,
    version: characterData.version || 1,

    // Character必須フィールド（デフォルト値を設定）
    name: characterData.name || 'Unnamed Character',
    age: characterData.age || '不明',
    occupation: characterData.occupation || '不明',
    catchphrase: characterData.catchphrase || '',
    personality: characterData.personality || characterData.description || '',
    external_personality: characterData.external_personality || characterData.personality || '',
    internal_personality: characterData.internal_personality || characterData.personality || '',
    strengths: characterData.strengths || [],
    weaknesses: characterData.weaknesses || [],
    hobbies: characterData.hobbies || [],
    likes: characterData.likes || [],
    dislikes: characterData.dislikes || [],
    appearance: characterData.appearance || '外見の説明がありません。',
    speaking_style: characterData.speaking_style || '標準的な話し方',
    first_person: characterData.first_person || '私',
    second_person: characterData.second_person || 'あなた',
    verbal_tics: characterData.verbal_tics || [],
    background: characterData.background || 'バックグラウンドの説明がありません。',
    scenario: characterData.scenario || 'シナリオの説明がありません。',
    system_prompt: characterData.system_prompt || '',
    first_message: characterData.first_message || 'こんにちは',
    tags: characterData.tags || [],
    trackers: characterData.trackers || [],

    // オプショナルフィールド（存在する場合のみ設定）
    ...(characterData.description && { description: characterData.description }),
    ...(characterData.identity && { identity: characterData.identity }),
    ...(characterData.preferences && { preferences: characterData.preferences }),
    ...(characterData.avatar_url && { avatar_url: characterData.avatar_url }),
    ...(characterData.background_url && { background_url: characterData.background_url }),
    ...(characterData.background_url_desktop && { background_url_desktop: characterData.background_url_desktop }),
    ...(characterData.background_url_mobile && { background_url_mobile: characterData.background_url_mobile }),
    ...(characterData.background_video_url && { background_video_url: characterData.background_video_url }),
    ...(characterData.background_video_url_desktop && { background_video_url_desktop: characterData.background_video_url_desktop }),
    ...(characterData.background_video_url_mobile && { background_video_url_mobile: characterData.background_video_url_mobile }),
    ...(characterData.image_prompt && { image_prompt: characterData.image_prompt }),
    ...(characterData.negative_prompt && { negative_prompt: characterData.negative_prompt }),
    ...(characterData.dialogue_style && { dialogue_style: characterData.dialogue_style }),
    ...(characterData.nsfw_profile && { nsfw_profile: characterData.nsfw_profile }),
    ...(characterData.statistics && { statistics: characterData.statistics }),
    ...(characterData.is_favorite !== undefined && { is_favorite: characterData.is_favorite }),
    ...(characterData.is_active !== undefined && { is_active: characterData.is_active }),
    ...(characterData.color_theme && { color_theme: characterData.color_theme }),
  };

  console.log(`✨ [Character Enrichment] Enriched character "${enriched.name}" (ID: ${enriched.id})`);

  return enriched;
}

/**
 * ファイル名からIDを生成
 *
 * @param {string} filename - ファイル名（例: "ニャイリス.json"）
 * @returns {string} 生成されたID
 */
function generateIdFromFilename(filename: string): string {
  // .json拡張子を削除
  const nameWithoutExtension = filename.replace(/\.json$/i, '');

  // ファイル名をサニタイズ（スペース、特殊文字を削除）
  const sanitized = nameWithoutExtension
    .replace(/[\s\-_]/g, '-')  // スペース、ハイフン、アンダースコアを統一
    .replace(/[^\w\-\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/g, '') // 英数字と日本語以外を削除
    .toLowerCase();

  // UUIDを生成（ユニーク性を保証）
  const uuid = randomUUID();

  // ファイル名ベースのID + UUID（短縮版）
  return `${sanitized}-${uuid.substring(0, 8)}`;
}

/**
 * キャラクターデータに必要な補完を行うかチェック
 *
 * @param {Partial<Character>} characterData - キャラクターデータ
 * @returns {boolean} 補完が必要な場合true
 */
export function needsEnrichment(characterData: Partial<Character>): boolean {
  return !characterData.id ||
         !characterData.created_at ||
         !characterData.updated_at ||
         !characterData.version;
}

/**
 * 🔧 デバッグ用: エンリッチメント情報をログ出力
 *
 * @param {Partial<Character>} original - 元のデータ
 * @param {Character} enriched - 補完後のデータ
 */
export function logEnrichmentDetails(original: Partial<Character>, enriched: Character): void {
  const addedFields: string[] = [];

  if (!original.id) addedFields.push('id');
  if (!original.created_at) addedFields.push('created_at');
  if (!original.updated_at) addedFields.push('updated_at');
  if (!original.version) addedFields.push('version');

  if (addedFields.length > 0) {
    console.log(`🔧 [Enrichment] Added fields to "${enriched.name}": ${addedFields.join(', ')}`);
  }
}
