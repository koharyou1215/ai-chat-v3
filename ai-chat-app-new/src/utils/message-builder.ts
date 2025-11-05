import { UnifiedMessage } from '@/types/core/message.types';

/**
 * UnifiedMessage構築ヘルパー関数
 * 必須プロパティを保証し、型安全なメッセージ作成を支援
 */
export const createUnifiedMessage = (
  partial: Partial<UnifiedMessage> & {
    id: string;
    content: string;
    role: UnifiedMessage['role'];
    session_id: string;
  }
): UnifiedMessage => ({
  ...partial,
  id: partial.id,
  content: partial.content,
  role: partial.role,
  session_id: partial.session_id,
  timestamp: partial.timestamp ?? Date.now(),
  version: partial.version ?? 1,
  memory: {
    importance: {
      score: 0.5,
      factors: {
        emotional_weight: 0.5,
        repetition_count: 0,
        user_emphasis: 0.5,
        ai_judgment: 0.5,
      }
    },
    is_pinned: false,
    is_bookmarked: false,
    keywords: [],
    ...partial.memory
  },
  expression: {
    emotion: { primary: 'neutral', intensity: 0.5 },
    style: {},
    effects: [],
    ...partial.expression
  },
  edit_history: partial.edit_history ?? [],
  regeneration_count: partial.regeneration_count ?? 0,
  metadata: partial.metadata ?? {},
  created_at: partial.created_at ?? Date.now().toString(),
  updated_at: partial.updated_at ?? Date.now().toString(),
  is_deleted: partial.is_deleted ?? false,
  character_id: partial.character_id,
  character_name: partial.character_name,
});
