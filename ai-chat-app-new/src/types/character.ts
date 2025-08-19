// キャラクターのトラッカー型定義
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
