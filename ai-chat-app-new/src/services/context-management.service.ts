import { ConversationManager } from './memory/conversation-manager';
import { PromptBuilderService } from './prompt-builder.service';
import { useAppStore } from '@/store';
import { UUID } from '@/types';

/**
 * コンテキスト管理サービス
 * ConversationManagerのコンテキストをクリアする機能を提供
 */
export class ContextManagementService {
  private promptBuilderService: PromptBuilderService;

  constructor() {
    this.promptBuilderService = new PromptBuilderService();
  }

  /**
   * 特定のセッションのコンテキストをクリア
   */
  clearSessionContext(sessionId: UUID): void {
    // PromptBuilderServiceのキャッシュをクリア
    this.promptBuilderService.clearManagerCache(sessionId);

    console.log(`🧹 Cleared context for session: ${sessionId}`);
  }

  /**
   * すべてのセッションのコンテキストをクリア
   */
  clearAllContexts(): void {
    // すべてのキャッシュをクリア
    (PromptBuilderService as any).managerCache?.clear();
    (PromptBuilderService as any).lastProcessedCount?.clear();

    console.log('🧹 Cleared all session contexts');
  }

  /**
   * メモリーカードをクリア
   */
  clearMemoryCards(sessionId?: UUID): void {
    const store = useAppStore.getState();

    if (sessionId) {
      // 特定のセッションのメモリーカードのみクリア
      const memoryCards = Array.from(store.memory_cards.values());
      memoryCards
        .filter(card => card.session_id === sessionId)
        .forEach(card => store.deleteMemoryCard(card.id));

      console.log(`🧹 Cleared memory cards for session: ${sessionId}`);
    } else {
      // すべてのメモリーカードをクリア
      store.clearMemoryCards();
      console.log('🧹 Cleared all memory cards');
    }
  }

  /**
   * 選択的なコンテキストクリア
   */
  clearPartialContext(sessionId: UUID, options: {
    clearCache?: boolean;
    clearMemoryCards?: boolean;
    clearPinnedCards?: boolean;
  }): void {
    if (options.clearCache) {
      this.clearSessionContext(sessionId);
    }

    if (options.clearMemoryCards || options.clearPinnedCards) {
      const store = useAppStore.getState();
      const memoryCards = Array.from(store.memory_cards.values());

      memoryCards
        .filter(card => {
          const isSessionCard = card.session_id === sessionId;
          if (options.clearMemoryCards && options.clearPinnedCards) {
            return isSessionCard;
          }
          if (options.clearMemoryCards && !options.clearPinnedCards) {
            return isSessionCard && !card.is_pinned;
          }
          if (!options.clearMemoryCards && options.clearPinnedCards) {
            return isSessionCard && card.is_pinned;
          }
          return false;
        })
        .forEach(card => store.deleteMemoryCard(card.id));

      console.log(`🧹 Cleared selected context for session: ${sessionId}`);
    }
  }

  /**
   * コンテキスト統計情報を取得
   */
  getContextStatistics(sessionId?: UUID): {
    totalMemoryCards: number;
    sessionMemoryCards: number;
    pinnedCards: number;
    cacheSize: number;
  } {
    const store = useAppStore.getState();
    const memoryCards = Array.from(store.memory_cards.values());

    const sessionCards = sessionId
      ? memoryCards.filter(card => card.session_id === sessionId)
      : [];

    const cacheSize = (PromptBuilderService as any).managerCache?.size || 0;

    return {
      totalMemoryCards: memoryCards.length,
      sessionMemoryCards: sessionCards.length,
      pinnedCards: memoryCards.filter(card => card.is_pinned).length,
      cacheSize,
    };
  }
}

// シングルトンインスタンス
export const contextManagementService = new ContextManagementService();