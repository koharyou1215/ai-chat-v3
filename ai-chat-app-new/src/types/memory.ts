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