// src/types/core/memory.types.ts
import { BaseEntity, UUID, Timestamp, WithMetadata } from './base.types';
import { UnifiedMessage } from './message.types';

/**
 * 階層的メモリシステム
 */
export interface HierarchicalMemory {
  immediate: MemoryLayer<3>;     // 即時記憶（最大3件）
  working: MemoryLayer<10>;      // 作業記憶（最大10件）
  episodic: MemoryLayer<50>;     // エピソード記憶（最大50件）
  semantic: MemoryLayer<200>;    // 意味記憶（最大200件）
  permanent: PermanentMemory;    // 永続記憶（無制限）
}

/**
 * レガシーMemoryLayer（memory-layer-manager.ts で使用）
 * 下位互換性のため保持
 */
export interface LegacyMemoryLayer {
  id: string;
  name: string;
  capacity: number;
  retentionDays: number;
  compressionRatio: number;
  messages: UnifiedMessage[];
}

export interface MemoryLayer<MaxSize extends number = number> {
  messages: UnifiedMessage[];
  max_size: MaxSize;
  retention_policy: RetentionPolicy;
  last_accessed: Timestamp;
  access_count: number;
}

export interface MemoryLayerInstance {
  immediate_memory: MemoryLayer<3>;
  working_memory: MemoryLayer<10>;
  episodic_memory: MemoryLayer<50>;
  semantic_memory: MemoryLayer<200>;
  permanent_memory: PermanentMemory;
}

export type RetentionPolicy = 'fifo' | 'lru' | 'importance' | 'hybrid';

export type MemoryLayerType = 'immediate_memory' | 'working_memory' | 'episodic_memory' | 'semantic_memory' | 'permanent_memory';

export interface PermanentMemory {
  pinned_messages: UnifiedMessage[];
  memory_cards: MemoryCard[];
  summaries: MemorySummary[];
}

/**
 * メモリーカード型（自動生成される記憶の要約）
 */
export interface MemoryCard extends BaseEntity, WithMetadata {
  // 元メッセージ情報
  source_message_ids: UUID[];
  original_message_ids: UUID[]; // legacy support
  session_id: UUID;
  character_id?: UUID;
  
  // カード内容
  title: string;                  // 10-15文字の自動生成タイトル
  summary: string;                // 50文字程度の要約
  full_content?: string;          // 詳細内容（オプション）
  original_content?: string;      // 元の内容（legacy support）
  
  // 分類・タグ
  category: MemoryCategory;
  auto_tags: string[];
  user_tags?: string[];
  emotion_tags?: EmotionTag[];
  context_tags?: string[];
  keywords: string[];             // キーワードリスト
  
  // 重要度・信頼度
  importance: MemoryImportance;
  confidence: number;             // 0-1のAI確信度
  
  // ユーザー操作
  is_edited: boolean;
  is_verified: boolean;           // ユーザー確認済み
  is_pinned: boolean;            // ピン留め
  is_hidden: boolean;            // 非表示
  user_notes?: string;
  
  // ベクトル検索用
  embedding?: number[];

  // Mem0統合用追加フィールド
  memory_type?: 'episodic' | 'semantic' | 'procedural';
  accessed_count?: number;
  last_accessed?: string;
  context?: Record<string, unknown>;
}

export type MemoryCategory = 
  | 'personal_info'      // 個人情報
  | 'preference'         // 好み・嗜好
  | 'event'             // 出来事
  | 'relationship'      // 関係性
  | 'promise'          // 約束
  | 'important_date'   // 重要な日付
  | 'emotion'          // 感情的な内容
  | 'decision'         // 決定事項
  | 'knowledge'        // 知識・情報
  | 'other';

export interface EmotionTag {
    emotion: string;
    intensity: number;
}

export interface MemoryImportance {
  score: number;        // 0-1のスコア
  factors: {
    emotional_weight: number;
    repetition_count: number;
    user_emphasis: number;
    ai_judgment: number;
  };
}

export interface MemorySummary extends BaseEntity {
  session_id: UUID;
  message_range: {
    start_id: UUID;
    end_id: UUID;
    message_count: number;
  };
  summary_text: string;
  key_points: string[];
  summary_level: 1 | 2 | 3;  // 階層レベル
}

/**
 * ベクトル検索結果
 */
export interface VectorSearchResult {
  memory_item: UnifiedMessage | MemoryCard;
  similarity_score: number;
  relevance: 'high' | 'medium' | 'low';
  match_type: 'exact' | 'semantic' | 'contextual';
}

/**
 * 検索結果（レガシーサポート）
 * vector-store.ts と conversation-manager.ts で使用
 */
export interface SearchResult {
  message: {
    id: string;
    content: string;
    timestamp: Date;
    sender: 'user' | 'assistant';
    importance?: number;
    embedding?: number[];
    emotion?: {
      primary: string;
      secondary?: string[];
      intensity: number;
    };
    metadata?: {
      tokens?: number;
      model?: string;
      temperature?: number;
    };
  };
  similarity: number;
  relevance: number;
}

/**
 * プロンプトテンプレート
 * prompt-templates.ts で使用
 */
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  category: 'system' | 'conversation' | 'memory' | 'inspiration';
}
