import { StateCreator } from "zustand";
import { MemoryCard, MemoryCategory, UUID, UnifiedMessage } from "@/types";
import { memoryCardGenerator } from "@/services/memory/memory-card-generator";
import { generateMemoryId } from "@/utils/uuid";

export interface MemorySlice {
  memory_cards: Map<UUID, MemoryCard>;
  pinned_memories: MemoryCard[];

  // メモリーカードの作成・管理
  createMemoryCard: (
    message_ids: UUID[],
    session_id: UUID,
    character_id?: UUID
  ) => Promise<MemoryCard>;
  updateMemoryCard: (id: UUID, updates: Partial<MemoryCard>) => void;
  deleteMemoryCard: (id: UUID) => void;

  // メモリーカードの取得・検索
  getMemoryCard: (id: UUID) => MemoryCard | undefined;
  getPinnedMemories: () => MemoryCard[];
  getMemoriesByCategory: (category: MemoryCategory) => MemoryCard[];
  getMemoriesBySession: (session_id: UUID) => MemoryCard[];
  searchMemories: (query: string) => MemoryCard[];

  // フィルタリング・ソート
  filterMemories: (filters: MemoryCardFilter) => MemoryCard[];
  sortMemoriesByImportance: (memories: MemoryCard[]) => MemoryCard[];
  sortMemoriesByDate: (memories: MemoryCard[]) => MemoryCard[];

  // レイヤー管理
  clearLayer: (layer: string) => void;
  addMessageToLayers: (message: UnifiedMessage) => void;

  // 統計情報
  getLayerStatistics: () => {
    total: number;
    pinned: number;
    hidden: number;
    categories: Record<string, number>;
  };
}

export interface MemoryCardFilter {
  categories?: MemoryCategory[];
  minImportance?: number;
  dateRange?: { start: Date; end: Date };
  keywords?: string[];
  isPinned?: boolean;
  session_id?: UUID;
  character_id?: UUID;
}

export const createMemorySlice: StateCreator<
  MemorySlice,
  [],
  [],
  MemorySlice
> = (set, get) => {
  // ローカルストレージからメモリーカードを読み込み
  const loadMemoryCards = () => {
    try {
      if (typeof window === 'undefined') return; // SSR対応
      const stored = localStorage.getItem("memory_cards");
      if (stored) {
        const memoryCardsArray = JSON.parse(stored);
        const memoryCardsMap = new Map();
        memoryCardsArray.forEach((card: MemoryCard) => {
          memoryCardsMap.set(card.id, card);
        });
        console.log(
          "💾 [MemorySlice] Loaded memory cards from localStorage:",
          memoryCardsMap.size
        );
        return memoryCardsMap;
      }
    } catch (error) {
      console.warn("Failed to load memory cards from localStorage:", error);
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
        return null; // エラーではなく警告として処理
      }

      // 指定されたメッセージIDのメッセージを取得
      const messages = session.messages.filter((msg: UnifiedMessage) =>
        message_ids.includes(msg.id)
      );

      if (messages.length === 0) {
        throw new Error("No messages found for the specified IDs");
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
          is_verified: false,

          // AI生成された内容
          title:
            generatedContent.title ||
            `会話の要約 ${new Date().toLocaleDateString("ja-JP")}`,
          summary:
            generatedContent.summary ||
            "複数のメッセージから自動生成された要約です。",
          keywords: generatedContent.keywords || ["会話", "要約", "自動生成"],
          category: generatedContent.category || "other",
          original_content:
            generatedContent.original_content ||
            `メッセージID: ${message_ids.join(", ")}`,

          // メタデータ
          importance: generatedContent.importance || {
            score: 0.5,
            factors: {
              emotional_weight: 0.3,
              repetition_count: 0,
              user_emphasis: 0.5,
              ai_judgment: 0.4,
            },
          },
          confidence: generatedContent.confidence || 0.7,

          // ユーザー操作
          is_edited: false,
          is_pinned: false,
          is_hidden: false,
          user_notes: undefined,

          // 自動タグ
          auto_tags: generatedContent.auto_tags || [
            "auto-generated",
            "conversation-summary",
          ],
          emotion_tags: generatedContent.emotion_tags || [],
        };

        set((state) => {
          const newMemoryCards = new Map(state.memory_cards);
          newMemoryCards.set(newMemoryCard.id, newMemoryCard);

          // ローカルストレージに保存
          try {
            const memoryCardsArray = Array.from(newMemoryCards.values());
            localStorage.setItem(
              "memory_cards",
              JSON.stringify(memoryCardsArray)
            );
            console.log("💾 [MemorySlice] Memory cards saved to localStorage");
          } catch (error) {
            console.warn("Failed to save memory cards to localStorage:", error);
          }

          return {
            memory_cards: newMemoryCards,
          };
        });

        return newMemoryCard;
      } catch (error) {
        console.error(
          "Failed to generate memory card with AI, using fallback:",
          error
        );

        // フォールバック処理
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
          is_verified: false,
          original_content: messages
            .map((m: UnifiedMessage) => `${m.role}: ${m.content}`)
            .join("\n"),

          // フォールバック内容
          title: `会話の記録 ${new Date().toLocaleDateString("ja-JP")}`,
          summary: `${messages.length}件のメッセージからなる会話の記録です。`,
          keywords: ["会話", "記録", "フォールバック"],
          category: "other",

          // メタデータ
          importance: {
            score: 0.5,
            factors: {
              emotional_weight: 0.3,
              repetition_count: 0,
              user_emphasis: 0.5,
              ai_judgment: 0.4,
            },
          },
          confidence: 0.6,

          // ユーザー操作
          is_edited: false,
          is_pinned: false,
          is_hidden: false,
          user_notes: undefined,

          // 自動タグ
          auto_tags: ["auto-generated", "fallback", "conversation-summary"],
          emotion_tags: [],
        };

        set((state) => {
          const newMemoryCards = new Map(state.memory_cards);
          newMemoryCards.set(newMemoryCard.id, newMemoryCard);

          return {
            memory_cards: newMemoryCards,
          };
        });

        return newMemoryCard;
      }
    },

    updateMemoryCard: (id, updates) => {
      set((state) => {
        const memoryCard = state.memory_cards.get(id);
        if (!memoryCard) return state;

        const updatedMemoryCard = {
          ...memoryCard,
          ...updates,
          updated_at: new Date().toISOString(),
          version: memoryCard.version + 1,
        };

        const newMemoryCards = new Map(state.memory_cards);
        newMemoryCards.set(id, updatedMemoryCard);

        // ピン留め状態も更新
        let newPinnedMemories = [...state.pinned_memories];
        if (updates.is_pinned !== undefined) {
          if (updates.is_pinned) {
            if (!newPinnedMemories.find((m) => m.id === id)) {
              newPinnedMemories.push(updatedMemoryCard);
            }
          } else {
            newPinnedMemories = newPinnedMemories.filter((m) => m.id !== id);
          }
        }

        // ローカルストレージに保存
        try {
          const memoryCardsArray = Array.from(newMemoryCards.values());
          localStorage.setItem(
            "memory_cards",
            JSON.stringify(memoryCardsArray)
          );
          console.log(
            "💾 [MemorySlice] Memory card updated and saved to localStorage"
          );
        } catch (error) {
          console.warn(
            "Failed to save updated memory card to localStorage:",
            error
          );
        }

        return {
          memory_cards: newMemoryCards,
          pinned_memories: newPinnedMemories,
        };
      });
    },

    deleteMemoryCard: (id) => {
      set((state) => {
        const newMemoryCards = new Map(state.memory_cards);
        newMemoryCards.delete(id);

        const newPinnedMemories = state.pinned_memories.filter(
          (m) => m.id !== id
        );

        // ローカルストレージに保存
        try {
          const memoryCardsArray = Array.from(newMemoryCards.values());
          localStorage.setItem(
            "memory_cards",
            JSON.stringify(memoryCardsArray)
          );
          console.log(
            "💾 [MemorySlice] Memory card deleted and saved to localStorage"
          );
        } catch (error) {
          console.warn(
            "Failed to save after memory card deletion to localStorage:",
            error
          );
        }

        return {
          memory_cards: newMemoryCards,
          pinned_memories: newPinnedMemories,
        };
      });
    },

    getMemoryCard: (id) => {
      return get().memory_cards.get(id);
    },

    getPinnedMemories: () => {
      return get().pinned_memories;
    },

    getMemoriesByCategory: (category) => {
      const memories = Array.from(get().memory_cards.values());
      return memories.filter((memory) => memory.category === category);
    },

    getMemoriesBySession: (session_id) => {
      const memories = Array.from(get().memory_cards.values());
      return memories.filter((memory) => memory.session_id === session_id);
    },

    searchMemories: (query) => {
      const memories = Array.from(get().memory_cards.values());
      const lowerQuery = query.toLowerCase();

      return memories.filter(
        (memory) =>
          memory.title.toLowerCase().includes(lowerQuery) ||
          memory.summary.toLowerCase().includes(lowerQuery) ||
          memory.keywords.some((keyword) =>
            keyword.toLowerCase().includes(lowerQuery)
          ) ||
          memory.auto_tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    },

    filterMemories: (filters) => {
      let memories = Array.from(get().memory_cards.values());

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
          const createdDate = new Date(memory.created_at);
          return (
            createdDate >= filters.dateRange!.start &&
            createdDate <= filters.dateRange!.end
          );
        });
      }

      if (filters.keywords && filters.keywords.length > 0) {
        memories = memories.filter((memory) =>
          filters.keywords!.some(
            (keyword) =>
              memory.keywords.some((k) =>
                k.toLowerCase().includes(keyword.toLowerCase())
              ) ||
              memory.auto_tags.some((tag) =>
                tag.toLowerCase().includes(keyword.toLowerCase())
              )
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

    getLayerStatistics: () => {
      const memories = Array.from(get().memory_cards.values());
      return {
        total: memories.length,
        pinned: memories.filter((m) => m.is_pinned).length,
        hidden: memories.filter((m) => m.is_hidden).length,
        categories: memories.reduce((acc, m) => {
          acc[m.category] = (acc[m.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
    },

    clearLayer: (layer) => {
      console.log(`Clearing memory layer: ${layer}`);
      // 実装: 指定されたレイヤーのメモリーカードをクリア
      // この実装は要件に応じて調整が必要
    },

    addMessageToLayers: (message) => {
      console.log(`Adding message to layers:`, message.id);
      // 実装: メッセージをメモリーレイヤーに追加
      // この実装は要件に応じて調整が必要
    },
  };
};
