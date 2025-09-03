// src/types/index.ts
export * from './core/base.types';
export * from './core/character.types';
export * from './core/context.types';
export * from './core/expression.types';
export * from './core/memory.types';
export * from './core/persona.types';
export * from './core/session.types';
export * from './core/tracker.types';
export * from './core/settings.types';
export * from './core/emotional-intelligence.types';

// メッセージ型は重複エクスポートを避けて個別にエクスポート
export type { 
  UnifiedMessage, 
  MessageRole, 
  MessageEditEntry, 
  MessageMetadata,
  MessageRequest  // 🔧 **追加 - APIリクエスト型**
} from './core/message.types';

export * from './api';
export * from './ui';

// Store型のエクスポート
export type { HistoryStatistics } from '../store/slices/history.slice';

// 🔧 **後方互換性のため Message を再エクスポート**  
export type { Message } from './memory';