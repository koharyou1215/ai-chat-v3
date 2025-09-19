// src/types/core/session.types.ts

import { BaseEntity, WithMetadata, UUID, Timestamp } from './base.types';
import { Character } from './character.types';
import { Persona } from './persona.types';
import { UnifiedMessage } from './message.types';
import { MemoryLayerInstance } from './memory.types';
import { TrackerInstance } from './tracker.types';
import { ConversationContext } from './context.types';

/**
 * 統合チャットセッション
 */
export interface UnifiedChatSession extends BaseEntity, WithMetadata<SessionMetadata> {
  // 参加者
  participants: {
    user: Persona;
    characters: Character[];
    active_character_ids: Set<UUID>;
  };

  // メッセージ
  messages: UnifiedMessage[];
  message_count: number;

  // 記憶システム
  memory_system: MemoryLayerInstance;

  // 状態管理
  state_management: {
    trackers: Map<UUID, TrackerInstance>;
    mood_state: {
        current: string;
        intensity: number;
    };
  };

  // コンテキスト
  context: ConversationContext;

  // セッション情報
  session_info: {
    title: string;
    description: string;
    tags: string[];
  };

  // 統計
  statistics: SessionStatistics;

  // 履歴管理
  isPinned?: boolean;
  isArchived?: boolean;
  lastAccessedAt?: Timestamp;
}

export interface MemoryIndex {
  vector_store_id: string;
  indexed_message_count: number;
  last_indexing: Timestamp;
  index_version: string;
}

export interface SessionMetadata {
  mode: 'single' | 'group' | 'assistant';
  ai_model: string;
  temperature: number;
  max_tokens: number;
  language: string;
  timezone: string;
  custom_settings?: Record<string, unknown>;
}

export interface SessionStatistics {
  message_count: number;
  start_time: Timestamp;
  end_time: Timestamp;
  duration_seconds: number;
  user_message_count: number;
  assistant_message_count: number;
  average_response_time_ms: number;
  metadata?: Record<string, unknown>;
}
