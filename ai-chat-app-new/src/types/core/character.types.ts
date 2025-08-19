// src/types/core/character.types.ts

import { BaseEntity, Timestamp } from './base.types';
import { TrackerDefinition } from './tracker.types';

/**
 * 統合キャラクター型（JSONファイルと一致するフラット構造）
 */
export interface Character extends BaseEntity {
  // 基本情報
  name: string;
  age: string;
  occupation: string;
  catchphrase: string;
  
  // 性格・特徴
  personality: string;
  external_personality: string;
  internal_personality: string;
  strengths: string[];
  weaknesses: string[];
  
  // 好み・趣味
  hobbies: string[];
  likes: string[];
  dislikes: string[];
  
  // 外見・スタイル
  appearance: string;
  avatar_url?: string;
  background_url?: string;
  image_prompt?: string;
  negative_prompt?: string;
  
  // 会話スタイル
  speaking_style: string;
  first_person: string;
  second_person: string;
  verbal_tics: string[];
  
  // 背景・シナリオ
  background: string;
  scenario: string;
  
  // AIシステム設定
  system_prompt: string;
  first_message: string;
  
  // メタデータ
  tags: string[];
  
  // トラッカー定義
  trackers: TrackerDefinition[];
  
  // NSFW設定（オプション）
  nsfw_profile?: NSFWProfile;
  
  // 統計情報 (ストア内部で管理)
  statistics?: CharacterStatistics;
  
  // UI状態
  is_favorite?: boolean;
  
  // 表示設定
  color_theme?: ColorTheme;
}

export interface NSFWProfile {
    persona: string;
    libido_level: string;
    situation: string;
    mental_state: string;
    kinks: string[];
}

export interface CharacterStatistics {
    usage_count: number;
    last_used: Timestamp;
    favorite_count: number;
    average_session_length: number;
}

export interface PersonalityTrait {
  trait: string;
  intensity: 'low' | 'medium' | 'high';
  situations?: string[];  // この特性が現れる状況
}

export interface CharacterRelationship {
  target: string;          // 対象（ユーザー、他キャラ等）
  relationship_type: string;
  description: string;
  dynamic: boolean;        // 変化する関係性か
}

export type VoiceStyle = Record<string, never>;
// export interface VoiceStyle {}

export interface ColorTheme {
  primary: string;
  secondary: string;
  accent: string;
  gradient?: string;
}

export interface VoiceConfig {
  provider: 'voicevox' | 'elevenlabs' | 'azure' | 'google';
  voice_id: string;
  speed: number;
  pitch: number;
  emotion_mapping?: Record<string, VoicePreset>;
}

export interface VoicePreset {
    volume?: number;
    speed?: number;
    pitch?: number;
}

export interface CharacterMetadata {
  creator_id?: string;
  tags: string[];
  version: string;
  is_public: boolean;
  language: string;
  content_rating: 'general' | 'teen' | 'mature';
}
