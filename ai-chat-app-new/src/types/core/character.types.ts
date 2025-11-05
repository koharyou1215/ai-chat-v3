// src/types/core/character.types.ts

import { BaseEntity, Timestamp } from './base.types';
import { TrackerDefinition } from './tracker.types';

/**
 * キャラクターの好み・嫌いを表す型（感情分析用）
 */
export interface CharacterPreferences {
  likes: string[];
  dislikes: string[];
}

/**
 * 統合キャラクター型（JSONファイルと一致するフラット構造）
 */
export interface Character extends BaseEntity {
  // 基本情報
  name: string;
  age: string;
  occupation: string;
  catchphrase: string;
  description?: string; // 下位互換性のため（personalityの要約）
  
  // 性格・特徴
  personality: string;  // 性格の総合的な説明
  external_personality: string;  // 外面的性格
  internal_personality: string;  // 内面的性格
  strengths: string[];  // 長所
  weaknesses: string[];  // 短所
  
  // アイデンティティ（感情分析用）
  identity?: string;
  
  // 好み・趣味
  hobbies: string[];
  likes: string[];
  dislikes: string[];
  preferences?: CharacterPreferences; // 感情分析用
  
  // 外見・スタイル
  appearance: string;
  avatar_url?: string;           // キャラクターアイコン画像
  background_url?: string;        // チャット背景画像（後方互換性・フォールバック用）
  background_url_desktop?: string; // 🆕 デスクトップ用背景画像（横長推奨）
  background_url_mobile?: string;  // 🆕 モバイル用背景画像（縦長推奨）
  // 🎬 動画背景URL（MP4/WEBM対応）
  background_video_url?: string;        // 動画背景（共通・フォールバック用）
  background_video_url_desktop?: string; // デスクトップ用動画背景
  background_video_url_mobile?: string;  // モバイル用動画背景
  image_prompt?: string;
  negative_prompt?: string;
  
  // 会話スタイル
  speaking_style: string;
  dialogue_style?: string; // 感情分析用
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
  is_active?: boolean;
  
  // 表示設定
  color_theme?: ColorTheme;
}

export interface NSFWProfile {
    persona?: string;  // NSFW時の性格（定義フォーマットに準拠）
    libido_level?: string;
    situation?: string;
    mental_state?: string;
    kinks?: string[];
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