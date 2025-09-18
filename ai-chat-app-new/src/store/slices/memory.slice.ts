import { StateCreator } from 'zustand';
import { MemoryCard, UUID, UnifiedMessage, MemoryCategory as MemoryCategoryType } from '@/types';
import { memoryCardGenerator } from '@/services/memory/memory-card-generator';
import { generateMemoryId } from '@/utils/uuid';
import { sessionStorageService } from '@/services/session-storage.service';

export interface MemorySlice {
  memory_cards: Map<UUID, MemoryCard>;
  pinned_memories: MemoryCard[];

  // メモリーカードの作成・管理 - null返却を許可
  createMemoryCard: (
    message_ids: UUID[],
    session_id: UUID,
    character_id?: UUID
  ) => Promise<MemoryCard | null>;
  updateMemoryCard: (id: UUID, updates: Partial<MemoryCard>) => void;
  deleteMemoryCard: (id: UUID) => void;

  // メモリーカードの取得・検索
  getMemoryCard: (id: UUID) => MemoryCard | undefined;
  getPinnedMemories: () => MemoryCard[];
  getMemoriesByCategory: (category: MemoryCategoryType) => MemoryCard[];
  getMemoriesBySession: (session_id: UUID) => MemoryCard[];
  searchMemories: (query: string) => MemoryCard[];

  // フィルタリング・ソート
  filterMemories: (filters: MemoryCardFilter) => MemoryCard[];
  sortMemoriesByImportance: (memories: MemoryCard[]) => MemoryCard[];
  sortMemoriesByDate: (memories: MemoryCard[]) => MemoryCard[];

  // その他
  togglePinMemory: (id: UUID) => void;
  getMemoryStatistics: () => MemoryStatistics;
  clearMemoryCards: () => void;

  // Lazy initialization
  initializeMemoryCards: () => void;

  // 新機能：メモリーレイヤー管理 (Memory Manager V2)
  memoryLayers: Map<UUID, MemoryLayer>;
  addMessageToLayers: (message: UnifiedMessage) => void;
}

export interface MemoryStatistics {
  totalCards: number;
  pinnedCards: number;
  categories: Record<string, number>;
}

export interface MemoryCardFilter {
  categories?: MemoryCategoryType[];
  minImportance?: number;
  dateRange?: { start: Date; end: Date };
  keywords?: string[];
  isPinned?: boolean;
  session_id?: UUID;
  character_id?: UUID;
}

export interface MemoryLayer {
  id: UUID;
  created_at: string;
  updated_at: string;
  version: number;
  session_id: UUID;
  character_id?: UUID;
  layer_type: 'working' | 'episodic' | 'semantic' | 'emotional';
  priority: number;
  content: {
    facts: string[];
    emotions: { type: string; intensity: number }[];
    relationships: { entity: string; relation: string; strength: number }[];
    context: Record<string, any>;
  };
  metadata: {
    message_count: number;
    last_accessed: string;
    importance_score: number;
    decay_rate: number;
  };
}

export const createMemorySlice: StateCreator<
  MemorySlice,
  [],
  [],
  MemorySlice
> = (set, get) => {
  // ローカルストレージからメモリーカードを読み込み
  const loadMemoryCards = (): Map<UUID, MemoryCard> => {
    try {
      if (typeof window === 'undefined') return new Map(); // SSR対応
      const stored = localStorage.getItem("memory_cards");
      if (stored) {
        const memoryCardsArray = JSON.parse(stored);
        const memoryCardsMap = new Map();
        memoryCardsArray.forEach((card: MemoryCard) => {
          memoryCardsMap.set(card.id, card);
        });
        console.log(`✅ Loaded ${memoryCardsMap.size} memory cards from localStorage`);
        return memoryCardsMap;
      }
    } catch (error) {
      console.error("Error loading memory cards:", error);
    }
    return new Map();
  };

  return {
    memory_cards: new Map(), // Lazy load on first access
    pinned_memories: [],

    // Lazy initialization method for memory cards
    initializeMemoryCards: () => {
      const currentState = get() as { memory_cards: Map<string, any> };
      if (currentState.memory_cards.size === 0) {
        const loadedCards = loadMemoryCards();
        set((state) => ({ ...state, memory_cards: loadedCards }));
      }
    },

    createMemoryCard: async (message_ids, session_id, character_id) => {
      // セッションからメッセージを取得
      const state = get();

      // ソロチャットとグループチャットの両方をチェック
      const soloSessions = (state as any).sessions || new Map();
      const groupSessions = (state as any).group_sessions || new Map();

      const session =
        soloSessions.get(session_id) || groupSessions.get(session_id);

      if (!session) {
        console.warn(
          `🔍 [MemorySlice] Session ${session_id} not found in solo (${soloSessions.size}) or group (${groupSessions.size}) sessions`
        );
        console.warn(
          "🔍 Available solo sessions:",
          Array.from(soloSessions.keys()).slice(0, 3)
        );
        console.warn(
          "🔍 Available group sessions:",
          Array.from(groupSessions.keys()).slice(0, 3)
        );
        return null; // 型に合わせてnull返却を許可
      }

      // 指定されたメッセージIDのメッセージを取得
      const messages = session.messages.filter((msg: UnifiedMessage) =>
        message_ids.includes(msg.id)
      );

      if (messages.length === 0) {
        console.warn("No messages found for the specified IDs");
        return null; // エラーの代わりにnull返却
      }

      try {
        // AI自動生成でメモリーカード内容を作成
        const generatedContent = await memoryCardGenerator.generateMemoryCard(
          messages,
          session_id,
          character_id
        );

        const newMemoryCard: MemoryCard = {
          id: generateMemoryId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
          metadata: {},
          session_id,
          character_id,
          source_message_ids: message_ids,
          original_message_ids: message_ids,

          // AI生成された内容
          title:
            generatedContent.title ||
            `会話の要約 ${new Date().toLocaleDateString("ja-JP")}`,
          summary:
            generatedContent.summary ||
            "複数のメッセージから自動生成された要約です。",
          keywords: generatedContent.keywords || ["会話", "要約", "自動生成"],
          category: (generatedContent.category || "other") as MemoryCategoryType,
          original_content:
            generatedContent.original_content ||
            `メッセージID: ${message_ids.join(", ")}`,

          auto_tags: [],

          // メタデータ
          importance: {
            score: (generatedContent as { importance_score?: number }).importance_score || 5.0,
            factors: {
              emotional_weight: 5.0,
              repetition_count: 1,
              user_emphasis: 5.0,
              ai_judgment: 5.0,
            },
          },
          confidence: 0.8,
          is_edited: false,
          is_verified: false,
          is_pinned: false,
          is_hidden: false,
        };

        // セッションストレージに保存
        sessionStorageService.saveMemoryCard(session_id, newMemoryCard);

        // ストアに追加
        set((state) => {
          const newMemoryCards = new Map(state.memory_cards);
          newMemoryCards.set(newMemoryCard.id, newMemoryCard);

          // セッション固有データとして管理（キャラクター定義には保存しない）
          // LocalStorageへの保存は削除（セッションストレージで管理）

          return {
            ...state,
            memory_cards: newMemoryCards,
          };
        });

        console.log(`✅ Created memory card: ${newMemoryCard.title} for session: ${session_id}`);
        return newMemoryCard;

      } catch (error) {
        console.error("Failed to create memory card:", error);
        return null; // エラー時もnull返却
      }
    },

    updateMemoryCard: (id, updates) => {
      set((state) => {
        const memoryCard = state.memory_cards.get(id);
        if (!memoryCard) {
          console.warn(`Memory card with id ${id} not found`);
          return state;
        }

        const updatedCard: MemoryCard = {
          ...memoryCard,
          ...updates,
          updated_at: new Date().toISOString(),
        };

        const newMemoryCards = new Map(state.memory_cards);
        newMemoryCards.set(id, updatedCard);

        // ローカルストレージにも保存
        try {
          const memoryCardsArray = Array.from(newMemoryCards.values());
          localStorage.setItem("memory_cards", JSON.stringify(memoryCardsArray));
        } catch (error) {
          console.error("Failed to save memory cards to localStorage:", error);
        }

        return {
          ...state,
          memory_cards: newMemoryCards,
        };
      });
    },

    deleteMemoryCard: (id) => {
      set((state) => {
        const newMemoryCards = new Map(state.memory_cards);
        const deleted = newMemoryCards.delete(id);

        if (!deleted) {
          console.warn(`Memory card with id ${id} not found for deletion`);
          return state;
        }

        // ローカルストレージからも削除
        try {
          const memoryCardsArray = Array.from(newMemoryCards.values());
          localStorage.setItem("memory_cards", JSON.stringify(memoryCardsArray));
        } catch (error) {
          console.error("Failed to save memory cards to localStorage:", error);
        }

        // pinned_memoriesからも削除
        const newPinnedMemories = state.pinned_memories.filter(
          (memory) => memory.id !== id
        );

        return {
          ...state,
          memory_cards: newMemoryCards,
          pinned_memories: newPinnedMemories,
        };
      });
    },

    getMemoryCard: (id) => {
      const state = get();
      return state.memory_cards.get(id);
    },

    getPinnedMemories: () => {
      const state = get();
      return Array.from(state.memory_cards.values()).filter(
        (memory) => memory.is_pinned
      );
    },

    getMemoriesByCategory: (category: MemoryCategoryType) => {
      const state = get();
      return Array.from(state.memory_cards.values()).filter(
        (memory) => memory.category === category
      );
    },

    getMemoriesBySession: (session_id) => {
      const state = get();
      return Array.from(state.memory_cards.values()).filter(
        (memory) => memory.session_id === session_id
      );
    },

    searchMemories: (query) => {
      const state = get();
      const lowerQuery = query.toLowerCase();

      return Array.from(state.memory_cards.values()).filter((memory) => {
        return (
          memory.title?.toLowerCase().includes(lowerQuery) ||
          memory.summary?.toLowerCase().includes(lowerQuery) ||
          memory.keywords?.some((keyword) =>
            keyword.toLowerCase().includes(lowerQuery)
          ) ||
          memory.original_content?.toLowerCase().includes(lowerQuery)
        );
      });
    },

    filterMemories: (filters) => {
      const state = get();
      let memories = Array.from(state.memory_cards.values());

      if (filters.categories && filters.categories.length > 0) {
        memories = memories.filter((memory) =>
          filters.categories!.includes(memory.category)
        );
      }

      if (filters.minImportance !== undefined) {
        memories = memories.filter(
          (memory) => memory.importance.score >= filters.minImportance!
        );
      }

      if (filters.dateRange) {
        memories = memories.filter((memory) => {
          const memoryDate = new Date(memory.created_at);
          return (
            memoryDate >= filters.dateRange!.start &&
            memoryDate <= filters.dateRange!.end
          );
        });
      }

      if (filters.keywords && filters.keywords.length > 0) {
        memories = memories.filter((memory) =>
          filters.keywords!.some((keyword) =>
            memory.keywords?.includes(keyword)
          )
        );
      }

      if (filters.isPinned !== undefined) {
        memories = memories.filter(
          (memory) => memory.is_pinned === filters.isPinned
        );
      }

      if (filters.session_id) {
        memories = memories.filter(
          (memory) => memory.session_id === filters.session_id
        );
      }

      if (filters.character_id) {
        memories = memories.filter(
          (memory) => memory.character_id === filters.character_id
        );
      }

      return memories;
    },

    sortMemoriesByImportance: (memories) => {
      return [...memories].sort(
        (a, b) => b.importance.score - a.importance.score
      );
    },

    sortMemoriesByDate: (memories) => {
      return [...memories].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },

    togglePinMemory: (id) => {
      set((state) => {
        const memory = state.memory_cards.get(id);
        if (!memory) {
          console.warn(`Memory card with id ${id} not found for pin toggle`);
          return state;
        }

        const updatedMemory: MemoryCard = {
          ...memory,
          is_pinned: !memory.is_pinned,
          updated_at: new Date().toISOString(),
        };

        const newMemoryCards = new Map(state.memory_cards);
        newMemoryCards.set(id, updatedMemory);

        // pinned_memoriesも更新
        let newPinnedMemories = [...state.pinned_memories];
        if (updatedMemory.is_pinned) {
          newPinnedMemories.push(updatedMemory);
        } else {
          newPinnedMemories = newPinnedMemories.filter(
            (memory) => memory.id !== id
          );
        }

        return {
          ...state,
          memory_cards: newMemoryCards,
          pinned_memories: newPinnedMemories,
        };
      });
    },

    getMemoryStatistics: () => {
      const state = get();
      const memories = Array.from(state.memory_cards.values());

      const categories: Record<string, number> = {};
      memories.forEach((memory) => {
        categories[memory.category] = (categories[memory.category] || 0) + 1;
      });

      return {
        totalCards: memories.length,
        pinnedCards: memories.filter((memory) => memory.is_pinned).length,
        categories,
      };
    },

    clearMemoryCards: () => {
      set((state) => {
        try {
          localStorage.removeItem("memory_cards");
        } catch (error) {
          console.error("Failed to clear memory cards from localStorage:", error);
        }

        return {
          ...state,
          memory_cards: new Map(),
          pinned_memories: [],
        };
      });
    },

    // メモリーレイヤー管理 (Memory Manager V2)
    memoryLayers: new Map(),

    addMessageToLayers: (message) => {
      // この機能は必要に応じて実装
      console.log('addMessageToLayers called with:', message.id);
    },
  };
};