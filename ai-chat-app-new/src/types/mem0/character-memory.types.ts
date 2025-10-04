// Mem0 Character Memory Type Definitions
// 2025-09-20: Advanced character memory management system

import { Character, TrackerDefinition, UnifiedMessage, UUID } from "@/types";
import { MemoryCard } from "@/types/core/memory.types";

// ===== Core Character Types (不変の芯) =====

/**
 * キャラクターの不変コア定義
 * これは毎回APIに送信される基本情報
 */
export interface CharacterCore {
  // Identity (絶対不変)
  identity: {
    id: UUID;
    name: string;
    role: string;
    age: string;
    occupation: string;
  };

  // Personality Baseline (基準値)
  personality: {
    external: string;     // 外面的性格
    internal: string;     // 内面的性格
    traits: string[];     // 性格特性リスト
    baseline_values: {    // 性格パラメーター基準値
      [key: string]: number;  // e.g., tsundere_level: 70
    };
  };

  // Communication Style (不変)
  communication: {
    speaking_style: string;
    first_person: string;
    second_person: string;
    verbal_tics: string[];
  };

  // Behavioral Principles (行動原則)
  principles: string[];
}

// ===== Dynamic Memory Types (Mem0管理) =====

/**
 * 関係性の動的状態
 * Mem0が管理・更新する
 */
export interface RelationshipState {
  character_id: UUID;
  user_id: string;

  // Relationship Metrics
  metrics: {
    trust_level: number;        // 0-100
    familiarity: number;        // 0-100
    emotional_bond: number;     // 0-100
    interaction_count: number;  // 総インタラクション数
  };

  // Relationship Stage
  stage: "stranger" | "acquaintance" | "friend" | "close_friend" | "intimate" | "special";

  // Milestones
  milestones: RelationshipMilestone[];

  // Last Updated
  updated_at: string;
}

/**
 * 関係性のマイルストーン
 */
export interface RelationshipMilestone {
  id: string;
  type: "first_meeting" | "trust_gained" | "special_event" | "promise" | "conflict" | "resolution";
  description: string;
  timestamp: string;
  importance: number; // 0-1
}

/**
 * キャラクター固有の学習済み情報
 */
export interface CharacterMemory {
  character_id: UUID;

  // User Preferences (学習した好み)
  learned_preferences: {
    likes: string[];
    dislikes: string[];
    habits: string[];
    patterns: string[];
  };

  // Shared Experiences (共有体験)
  shared_experiences: {
    events: MemoryEvent[];
    conversations: ConversationSummary[];
    promises: CharacterPromise[];
  };

  // Context Understanding
  context_knowledge: {
    user_background: string[];
    important_dates: { date: string; event: string }[];
    special_topics: string[];
  };
}

/**
 * 記憶イベント
 */
export interface MemoryEvent {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  emotional_impact: number; // 0-1
  participants: string[];
}

/**
 * 会話要約
 */
export interface ConversationSummary {
  session_id: UUID;
  summary: string;
  key_points: string[];
  emotional_tone: string;
  timestamp: string;
}

/**
 * キャラクターの約束・予定
 */
export interface CharacterPromise {
  id: string;
  content: string;
  made_at: string;
  due_date?: string;
  fulfilled: boolean;
  importance: number; // 0-1
}

// ===== Mem0 Integration Types =====

/**
 * Mem0キャラクターコンテキスト
 * プロンプト構築時に使用
 */
export interface Mem0CharacterContext {
  // Core (always included)
  core: CharacterCore;

  // Dynamic (from Mem0)
  relationship: RelationshipState;
  memories: CharacterMemory;
  relevant_cards: MemoryCard[];

  // Current State
  current_mood?: string;
  recent_topics?: string[];
  active_flags?: string[];

  // Token Counts
  token_usage: {
    core: number;
    relationship: number;
    memories: number;
    total: number;
  };
}

/**
 * Mem0検索オプション
 */
export interface Mem0CharacterSearchOptions {
  character_id: UUID;
  query: string;
  include_relationship?: boolean;
  include_memories?: boolean;
  include_cards?: boolean;
  max_tokens?: number;
  relevance_threshold?: number;
}

/**
 * キャラクター進化設定
 */
export interface CharacterEvolutionConfig {
  character_id: UUID;

  // Evolution Rules
  rules: {
    trust_growth_rate: number;      // 信頼度成長率
    familiarity_decay: number;      // 親密度減衰率
    memory_retention_days: number;  // 記憶保持日数
    importance_threshold: number;   // 重要度閾値
  };

  // Personality Modifiers
  modifiers: {
    condition: string;              // e.g., "trust > 80"
    adjustment: {
      trait: string;
      modifier: number;             // -1 to 1
    };
  }[];
}

// ===== Memory Card Extension =====

/**
 * 拡張メモリーカード（Mem0統合版）
 */
export interface EnhancedMemoryCard {
  // Original fields
  id: UUID;
  character_id?: UUID;
  session_id: UUID;
  title: string;
  summary: string;
  keywords: string[];

  // Enhanced fields for Mem0
  embedding?: Float32Array;        // Vector embedding
  character_relevance?: number;    // Character-specific relevance
  relationship_impact?: number;    // Impact on relationship
  auto_generated?: boolean;        // AI auto-generated flag
  source_type: "conversation" | "event" | "manual" | "system";

  // Metadata
  created_at: string;
  updated_at: string;
  accessed_count: number;
  last_accessed?: string;

  // Importance scoring
  importance: {
    score: number;
    factors: {
      emotional: number;
      informational: number;
      relational: number;
      temporal: number;
    };
  };
}

// ===== Service Interfaces =====

/**
 * Mem0キャラクターサービスインターフェース
 */
export interface IMem0CharacterService {
  // Core Management
  loadCharacterCore(characterId: UUID): Promise<CharacterCore>;

  // Relationship Management
  getRelationship(characterId: UUID, userId: string): Promise<RelationshipState>;
  updateRelationship(characterId: UUID, userId: string, updates: Partial<RelationshipState>): Promise<void>;

  // Memory Management
  getCharacterMemory(characterId: UUID): Promise<CharacterMemory>;
  learnFromConversation(characterId: UUID, messages: UnifiedMessage[]): Promise<void>;

  // Context Building
  buildCharacterContext(characterId: UUID, userInput: string, options?: Mem0CharacterSearchOptions): Promise<Mem0CharacterContext>;

  // Memory Card Operations
  createCharacterMemoryCard(characterId: UUID, content: any, metadata?: Partial<EnhancedMemoryCard>): Promise<EnhancedMemoryCard>;
  searchCharacterMemories(characterId: UUID, query: string, limit?: number): Promise<EnhancedMemoryCard[]>;

  // Evolution
  evolveCharacter(characterId: UUID, interaction: UnifiedMessage[]): Promise<void>;
}

// ===== Helper Types =====

/**
 * キャラクター性格調整パラメーター
 */
export interface PersonalityAdjustment {
  base_value: number;           // 基準値
  relationship_modifier: number; // 関係性による修正
  context_modifier: number;      // 文脈による修正
  final_value: number;          // 最終値
}

/**
 * トークン最適化設定
 */
export interface TokenOptimizationConfig {
  max_core_tokens: number;       // コア情報の最大トークン
  max_memory_tokens: number;     // 記憶情報の最大トークン
  max_total_tokens: number;      // 総トークン数上限
  priority_order: ("core" | "relationship" | "memories" | "cards")[];
}

export type CharacterMemoryUpdateType =
  | "preference_learned"
  | "experience_added"
  | "relationship_changed"
  | "milestone_reached"
  | "context_updated";

/**
 * キャラクターメモリー更新イベント
 */
export interface CharacterMemoryUpdate {
  type: CharacterMemoryUpdateType;
  character_id: UUID;
  data: any;
  timestamp: string;
  importance: number;
}