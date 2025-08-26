// DEPRECATED: この型定義は段階的に統合型に移行中です
// 新しい型定義は src/types/core/character.types.ts と src/types/core/tracker.types.ts を使用してください

import { Character as UnifiedCharacter } from './core/character.types';
import { TrackerDefinition, TrackerCategory, TrackerType } from './core/tracker.types';

// 下位互換性のため従来型を維持（段階的移行用）
export type LegacyTrackerType = 'state' | 'numeric' | 'boolean';

export interface Tracker {
  name: string;
  display_name: string;
  type: LegacyTrackerType;
  // state型用
  initial_state?: string;
  possible_states?: string[];
  // numeric型用
  initial_value?: number;
  max_value?: number;
  min_value?: number;
  // boolean型用
  initial_boolean?: boolean;
  category: string;
  persistent: boolean;
  description: string;
}

export interface Character {
  name: string;
  age: string;
  occupation: string;
  catchphrase: string;
  personality: string;
  external_personality: string;
  internal_personality: string;
  strengths: string[];
  weaknesses: string[];
  hobbies: string[];
  likes: string[];
  dislikes: string[];
  appearance: string;
  speaking_style: string;
  first_person: string;
  second_person: string;
  verbal_tics: string[];
  background: string;
  scenario: string;
  system_prompt: string;
  first_message: string;
  tags: string[];
  trackers: Tracker[];
  is_favorite?: boolean;
}

// 型変換ヘルパー関数
export const CharacterConverter = {
  /**
   * 従来型からUnifiedCharacterに変換
   */
  toUnified: (char: Character): UnifiedCharacter => {
    const now = new Date().toISOString();
    
    // TrackerをTrackerDefinitionに変換
    const convertedTrackers: TrackerDefinition[] = char.trackers.map(tracker => ({
      id: `tracker-${tracker.name}`,
      created_at: now,
      updated_at: now,
      version: 1,
      metadata: {},
      name: tracker.name,
      display_name: tracker.display_name,
      description: tracker.description,
      category: tracker.category as TrackerCategory,
      type: tracker.type as TrackerType,
      config: {
        type: tracker.type as TrackerType,
        initial_value: tracker.initial_value,
        initial_state: tracker.initial_state,
        possible_states: tracker.possible_states?.map(state => ({ 
          value: state, 
          label: state,
          description: state 
        })) || [],
        min_value: tracker.min_value || 0,
        max_value: tracker.max_value || 100,
        step: 1
      }
    }));

    return {
      id: `char-${char.name.replace(/\s+/g, '-').toLowerCase()}`,
      created_at: now,
      updated_at: now,
      version: 1,
      
      // 基本情報
      name: char.name,
      age: char.age,
      occupation: char.occupation,
      catchphrase: char.catchphrase,
      
      // 性格・特徴
      personality: char.personality,
      external_personality: char.external_personality,
      internal_personality: char.internal_personality,
      strengths: char.strengths,
      weaknesses: char.weaknesses,
      
      // 好み・趣味
      hobbies: char.hobbies,
      likes: char.likes,
      dislikes: char.dislikes,
      
      // 外見・スタイル
      appearance: char.appearance,
      avatar_url: undefined,
      background_url: undefined,
      image_prompt: undefined,
      negative_prompt: undefined,
      
      // 会話スタイル
      speaking_style: char.speaking_style,
      first_person: char.first_person,
      second_person: char.second_person,
      verbal_tics: char.verbal_tics,
      
      // 背景・シナリオ
      background: char.background,
      scenario: char.scenario,
      
      // AIシステム設定
      system_prompt: char.system_prompt,
      first_message: char.first_message,
      
      // メタデータ
      tags: char.tags,
      
      // トラッカー定義
      trackers: convertedTrackers,
      
      // UI状態
      is_favorite: char.is_favorite || false
    };
  },

  /**
   * UnifiedCharacterから従来型に変換
   */
  fromUnified: (char: UnifiedCharacter): Character => {
    // TrackerDefinitionをTrackerに変換
    const convertedTrackers: Tracker[] = char.trackers.map(tracker => ({
      name: tracker.name,
      display_name: tracker.display_name,
      type: tracker.type as TrackerType,
      initial_state: tracker.config.initial_state,
      possible_states: tracker.config.possible_states?.map((s: string | { value: string }) => 
        typeof s === 'string' ? s : s.value
      ),
      initial_value: tracker.config.initial_value,
      max_value: tracker.config.max_value,
      min_value: tracker.config.min_value,
      initial_boolean: tracker.config.initial_value ? Boolean(tracker.config.initial_value) : undefined,
      category: tracker.category,
      persistent: true, // デフォルト値
      description: tracker.description
    }));

    return {
      name: char.name,
      age: char.age,
      occupation: char.occupation,
      catchphrase: char.catchphrase,
      personality: char.personality,
      external_personality: char.external_personality,
      internal_personality: char.internal_personality,
      strengths: char.strengths,
      weaknesses: char.weaknesses,
      hobbies: char.hobbies,
      likes: char.likes,
      dislikes: char.dislikes,
      appearance: char.appearance,
      speaking_style: char.speaking_style,
      first_person: char.first_person,
      second_person: char.second_person,
      verbal_tics: char.verbal_tics,
      background: char.background,
      scenario: char.scenario,
      system_prompt: char.system_prompt,
      first_message: char.first_message,
      tags: char.tags,
      trackers: convertedTrackers,
      is_favorite: char.is_favorite
    };
  }
};