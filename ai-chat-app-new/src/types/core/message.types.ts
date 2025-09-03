// src/types/core/message.types.ts

import { BaseEntity, SoftDeletable, WithMetadata, UUID, Timestamp } from './base.types';
import { EmotionState } from './expression.types';
import { MemoryImportance } from './memory.types';
import { Character } from './character.types';
import { Persona } from './persona.types';

// Voice data type definition
export interface VoiceData {
  provider: 'voicevox' | 'elevenlabs' | 'system';
  voice_id?: string;
  speaker_id?: number;
  settings?: {
    speed?: number;
    pitch?: number;
    volume?: number;
    intonation?: number;
    stability?: number;
    similarity?: number;
  };
}

/**
 * 統合メッセージ型
 * 対話・記憶・表現の全要素を包含
 */
export interface UnifiedMessage extends BaseEntity, SoftDeletable, WithMetadata<MessageMetadata> {
  // 基本情報
  session_id: UUID;
  role: MessageRole;
  content: string;
  image_url?: string;
  
  // 🔧 **後方互換性 - ChatInterface用の追加プロパティ**
  sender?: 'user' | 'ai' | 'assistant'; // ChatInterface互換
  type?: 'text' | 'image' | 'system'; // メッセージタイプ
  persona?: Persona; // ペルソナ情報
  character?: Character; // キャラクター情報
  
  // 感情分析用タイムスタンプ（後方互換性）
  timestamp?: number | string;
  
  // キャラクター関連
  character_id?: UUID;
  character_name?: string;
  character_avatar?: string;
  
  // 記憶システム関連
  memory: {
    importance: MemoryImportance;
    is_pinned: boolean;
    is_bookmarked: boolean;
    embedding?: number[];
    memory_card_id?: UUID;
    keywords: string[];
    summary?: string;
  };
  
  // 表現システム関連
  expression: {
    emotion: EmotionState;
    style: MessageStyle;
    effects: MessageEffect[];
    voice?: VoiceData;
  };
  
  // 🔧 **感情分析結果 - 拡張**
  emotion_analysis?: {
    primary_emotion: string;
    intensity: number;
    confidence: number;
    detected_patterns: string[];
    suggested_responses?: string[];
  };
  
  // 状態変更関連
  state_changes?: StateChange[];
  
  // 関係性
  parent_message_id?: UUID;
  branch_messages?: UUID[];
  references?: MessageReference[];
  
  // 編集履歴
  edit_history: EditEntry[];
  regeneration_count: number;
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'function';

export interface MessageMetadata {
  // AI処理情報
  model_used?: string;
  token_count?: number;
  generation_time_ms?: number;
  confidence_score?: number;
  
  // コンテキスト情報
  context_window_size?: number;
  memory_retrieved_count?: number;
  
  // インスピレーション
  inspiration_used?: boolean;
  inspiration_type?: 'suggestion' | 'enhancement';
  
  // カスタムデータ
  generated_by?: string;
  processing_time?: number;
  [key: string]: unknown; // For custom metadata
}

export interface MessageStyle {
  bubble_gradient?: string;
  text_color?: string;
  font_size?: 'small' | 'medium' | 'large' | 'extra-large';
  font_weight?: 'light' | 'normal' | 'bold';
  animation?: string;
  glow_color?: string;
  custom_css?: string;
}

export interface MessageEffect {
  type: 'particle' | 'highlight' | 'vibration';
  parameters: Record<string, unknown>;
}

export interface StateChange {
  tracker_id: string;
  old_value: unknown;
  new_value: unknown;
  reason?: string;
}

export interface MessageReference {
  message_id: UUID;
  reference_type: 'quote' | 'reply' | 'context' | 'continuation';
  excerpt?: string;
}

export interface EditEntry {
  edited_at: Timestamp;
  previous_content: string;
  edit_reason?: string;
}

export interface MessageEditEntry {
  id: string;
  timestamp: string;
  previous_content: string;
  edit_reason?: string;
}

// 🔧 **API Request Types - 追加**
export interface MessageRequest {
  sessionId: UUID;
  content: string;
  characterId: UUID;
  personaId: UUID;
  conversation: Array<{
    role: 'user' | 'assistant';
    content: string;
    message_id: string;
    timestamp: string;
    index: number;
  }>;
  systemPrompt?: string;
  enhancedMode?: boolean;
  continueGeneration?: boolean;
  regenerate?: boolean;
}