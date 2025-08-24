// Memory system type definitions for AI Chat V3
// DEPRECATED: この型は段階的にUnifiedMessageに移行中です

import { UnifiedMessage } from './core/message.types';

// UnifiedMessageを再エクスポート（互換性のため）
export type { UnifiedMessage } from './core/message.types';

// 下位互換性のため従来型を維持（段階的移行用）
export interface Message {
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
}

// 型変換ヘルパー関数
export const MessageConverter = {
  /**
   * 従来型からUnifiedMessageに変換
   */
  toUnified: (msg: Message): UnifiedMessage => {
    const now = new Date().toISOString();
    return {
      // BaseEntity fields
      id: msg.id,
      created_at: msg.timestamp.toISOString(),
      updated_at: now,
      version: 1,
      metadata: msg.metadata || {},

      // Core message fields  
      session_id: '', // セッションIDは呼び出し側で設定
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content,

      // Memory fields
      memory: {
        importance: {
          score: msg.importance || 0.5,
          factors: {
            emotional_weight: msg.emotion?.intensity || 0.5,
            repetition_count: 0,
            user_emphasis: 0.5,
            ai_judgment: 0.5
          }
        },
        is_pinned: false,
        is_bookmarked: false,
        keywords: [],
        summary: undefined
      },

      // Expression fields
      expression: {
        emotion: {
          primary: msg.emotion?.primary || 'neutral',
          intensity: msg.emotion?.intensity || 0.5,
          emoji: '😐'
        },
        style: {
          font_weight: 'normal',
          text_color: '#ffffff'
        },
        effects: []
      },

      // Other fields with defaults
      edit_history: [],
      regeneration_count: 0,
      is_deleted: false
    };
  },

  /**
   * UnifiedMessageから従来型に変換
   */
  fromUnified: (msg: UnifiedMessage): Message => {
    return {
      id: msg.id,
      content: msg.content,
      timestamp: new Date(msg.created_at),
      sender: msg.role === 'user' ? 'user' : 'assistant',
      importance: msg.memory.importance.score,
      embedding: undefined, // UnifiedMessageには含まれない
      emotion: {
        primary: msg.expression.emotion.primary,
        secondary: [],
        intensity: msg.expression.emotion.intensity
      },
      metadata: msg.metadata
    };
  }
};

export interface SearchResult {
  message: Message;
  similarity: number;
  relevance: number;
}

export interface MemoryLayer {
  id: string;
  name: string;
  capacity: number;
  retentionDays: number;
  compressionRatio: number;
  messages: Message[];
}

export interface MemoryConfig {
  shortTerm: {
    capacity: number;
    retentionHours: number;
  };
  mediumTerm: {
    capacity: number;
    retentionDays: number;
    compressionThreshold: number;
  };
  longTerm: {
    capacity: number;
    retentionDays: number;
    summaryLength: number;
  };
}

export interface ConversationSummary {
  id: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: string;
  keyTopics: string[];
  emotionalTone: string;
  participantCount: number;
  messageCount: number;
  importance: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  category: 'system' | 'conversation' | 'memory' | 'inspiration';
}

export interface InspirationSuggestion {
  id: string;
  type: 'continuation' | 'question' | 'topic' | 'creative';
  content: string;
  context: string;
  confidence: number;
  source: 'memory' | 'pattern' | 'random';
}

export interface ConversationContext {
  currentInput: string;
  recentConversation: Message[];
  relevantMemories: SearchResult[];
  pinnedMemories: Message[];
  emotionalState: {
    current: string;
    trend: 'rising' | 'falling' | 'stable';
    intensity: number;
  };
}