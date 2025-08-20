// src/types/core/group-chat.types.ts
import { BaseEntity, SoftDeletable, WithMetadata, UUID, Timestamp } from './base.types';
import { UnifiedMessage } from './message.types';
import { UnifiedCharacter } from './character.types';
import { Persona } from './persona.types';

/**
 * グループチャットセッション
 */
export interface GroupChatSession extends BaseEntity, SoftDeletable, WithMetadata {
  name: string;
  character_ids: string[];
  characters: UnifiedCharacter[];
  active_character_ids: Set<string>;
  persona: Persona;
  messages: UnifiedMessage[];
  
  // チャット設定
  chat_mode: GroupChatMode;
  max_active_characters: number;
  speaking_order: string[];
  
  // 音声設定
  voice_settings: Map<string, VoicePreset>;
  
  // タイミング設定
  response_delay: number; // ミリ秒
  simultaneous_responses: boolean;
  
  // 統計情報
  message_count: number;
  last_message_at: Timestamp;
}

/**
 * グループチャットモード
 */
export type GroupChatMode = 
  | 'sequential'    // 順番に応答
  | 'simultaneous'  // 同時応答
  | 'random'        // ランダム応答
  | 'smart';        // AI判断応答

/**
 * 音声プリセット
 */
export interface VoicePreset {
  provider: 'voicevox' | 'elevenlabs' | 'system';
  speaker?: number;
  voice_id?: string;
  speed: number;
  pitch: number;
  volume: number;
  enabled: boolean;
}

/**
 * グループチャット参加者情報
 */
export interface GroupChatParticipant {
  character_id: string;
  character: UnifiedCharacter;
  is_active: boolean;
  voice_preset?: VoicePreset;
  response_priority: number;
  last_response_at?: Timestamp;
}

/**
 * グループチャット統計
 */
export interface GroupChatStats {
  total_messages: number;
  messages_per_character: Map<string, number>;
  average_response_time: number;
  most_active_character: string;
  session_duration: number;
}

/**
 * グループメッセージメタデータ
 */
export interface GroupMessageMetadata {
  response_order?: number;
  is_group_response?: boolean;
  referenced_character_ids?: string[];
  response_type?: 'initial' | 'reactive' | 'follow_up';
}