// DEPRECATED: この型定義は段階的に統合型に移行中です
// 新しい型定義は src/types/core/character.types.ts と src/types/core/tracker.types.ts を使用してください

import { Character as UnifiedCharacter } from './core/character.types';
import { TrackerDefinition, TrackerCategory, TrackerType } from './core/tracker.types';

// 下位互換性のため従来型を維持（段階的移行用）
export type TrackerType = 'state' | 'numeric' | 'boolean';

export interface Tracker {
  name: string;
  display_name: string;
  type: TrackerType;
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

