// src/types/core/context.types.ts
import { UnifiedMessage } from './message.types';
import { VectorSearchResult, MemoryCard } from './memory.types';
import { EmotionState } from './expression.types';
import { UUID } from "./base.types";

export type Mood = Record<string, never>;
// export interface Mood {}

/**
 * リアルタイムコンテキスト
 */
export interface ConversationContext {
  session_id: UUID;
  // 現在の状態
  current_emotion: EmotionState;
  current_topic: string;
  current_mood: MoodState;
  
  // 直近のコンテキスト
  recent_messages: UnifiedMessage[];
  recent_topics: string[];
  recent_emotions: EmotionState[];
  
  // 関連記憶
  relevant_memories: VectorSearchResult[];
  pinned_memories: MemoryCard[];
  
  // 予測・提案
  next_likely_topics: string[];
  suggested_responses: string[];
  
  // メタ情報
  context_quality: number;
  coherence_score: number;
}
