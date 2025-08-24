import { StateCreator } from 'zustand';
import { MemoryCard, MemoryCategory, UUID, UnifiedMessage } from '@/types';
import { memoryCardGenerator } from '@/services/memory/memory-card-generator';

export interface MemorySlice {
  memory_cards: Map<UUID, MemoryCard>;
  pinned_memories: MemoryCard[];
  
  // メモリーカードの作成・管理
  createMemoryCard: (message_ids: UUID[], session_id: UUID, character_id?: UUID) => Promise<MemoryCard>;
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

export const createMemorySlice: StateCreator<MemorySlice, [], [], MemorySlice> = (set, get) => ({
  memory_cards: new Map(),
  pinned_memories: [],
  
  createMemoryCard: async (message_ids, session_id, character_id) => {
    // セッションからメッセージを取得
    const state = get();
    const sessions = state.sessions || new Map();
    const session = sessions.get(session_id);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    // 指定されたメッセージIDのメッセージを取得
    const messages = session.messages.filter((msg: UnifiedMessage) => message_ids.includes(msg.id));
    
    if (messages.length === 0) {
      throw new Error('No messages found for the specified IDs');
    }
    
    try {
      // AI自動生成でメモリーカード内容を作成
      const generatedContent = await memoryCardGenerator.generateMemoryCard(
        messages,
        session_id,
        character_id
      );
      
      const newMemoryCard: MemoryCard = {
        id: `memory-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        metadata: {},
        session_id,
        character_id,
        original_message_ids: message_ids,
        
        // AI生成された内容
        title: generatedContent.title || `会話の要約 ${new Date().toLocaleDateString('ja-JP')}`,
        summary: generatedContent.summary || '複数のメッセージから自動生成された要約です。',
        keywords: generatedContent.keywords || ['会話', '要約', '自動生成'],
        category: generatedContent.category || 'other',
        original_content: generatedContent.original_content || `メッセージID: ${message_ids.join(', ')}`,
        
        // メタデータ
        importance: generatedContent.importance || { 
          score: 0.5, 
          factors: { emotional_weight: 0.3, repetition_count: 0, user_emphasis: 0.5, ai_judgment: 0.4 } 
        },
        confidence: generatedContent.confidence || 0.7,
        
        // ユーザー操作
        is_edited: false,
        is_pinned: false,
        is_hidden: false,
        user_notes: undefined,
        
        // 自動タグ
        auto_tags: generatedContent.auto_tags || ['auto-generated', 'conversation-summary'],
        emotion_tags: generatedContent.emotion_tags || [],
        context_tags: generatedContent.context_tags || ['session-summary']
      };
      
      set(state => {
        const newMemoryCards = new Map(state.memory_cards);
        newMemoryCards.set(newMemoryCard.id, newMemoryCard);
        
        return {
          memory_cards: newMemoryCards
        };
      });
      
      return newMemoryCard;
      
    } catch (error) {
      console.error('Failed to generate memory card with AI, using fallback:', error);
      
      // フォールバック処理
      const newMemoryCard: MemoryCard = {
        id: `memory-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        metadata: {},
        session_id,
        character_id,
        original_message_ids: message_ids,
        original_content: messages.map((m: UnifiedMessage) => `${m.role}: ${m.content}`).join('\n'),
        
        // フォールバック内容
        title: `会話の記録 ${new Date().toLocaleDateString('ja-JP')}`,
        summary: `${messages.length}件のメッセージからなる会話の記録です。`,
        keywords: ['会話', '記録', 'フォールバック'],
        category: 'other',
        
        // メタデータ
        importance: { score: 0.5, factors: { emotional_weight: 0.3, repetition_count: 0, user_emphasis: 0.5, ai_judgment: 0.4 } },
        confidence: 0.6,
        
        // ユーザー操作
        is_edited: false,
        is_pinned: false,
        is_hidden: false,
        user_notes: undefined,
        
        // 自動タグ
        auto_tags: ['auto-generated', 'fallback', 'conversation-summary'],
        emotion_tags: [],
        context_tags: ['session-summary']
      };
      
      set(state => {
        const newMemoryCards = new Map(state.memory_cards);
        newMemoryCards.set(newMemoryCard.id, newMemoryCard);
        
        return {
          memory_cards: newMemoryCards
        };
      });
      
      return newMemoryCard;
    }
  },
  
  updateMemoryCard: (id, updates) => {
    set(state => {
      const memoryCard = state.memory_cards.get(id);
      if (!memoryCard) return state;
      
      const updatedMemoryCard = {
        ...memoryCard,
        ...updates,
        updated_at: new Date().toISOString(),
        version: memoryCard.version + 1
      };
      
      const newMemoryCards = new Map(state.memory_cards);
      newMemoryCards.set(id, updatedMemoryCard);
      
      // ピン留め状態も更新
      let newPinnedMemories = [...state.pinned_memories];
      if (updates.is_pinned !== undefined) {
        if (updates.is_pinned) {
          if (!newPinnedMemories.find(m => m.id === id)) {
            newPinnedMemories.push(updatedMemoryCard);
          }
        } else {
          newPinnedMemories = newPinnedMemories.filter(m => m.id !== id);
        }
      }
      
      return {
        memory_cards: newMemoryCards,
        pinned_memories: newPinnedMemories
      };
    });
  },
  
  deleteMemoryCard: (id) => {
    set(state => {
      const newMemoryCards = new Map(state.memory_cards);
      newMemoryCards.delete(id);
      
      const newPinnedMemories = state.pinned_memories.filter(m => m.id !== id);
      
      return {
        memory_cards: newMemoryCards,
        pinned_memories: newPinnedMemories
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
    return memories.filter(memory => memory.category === category);
  },
  
  getMemoriesBySession: (session_id) => {
    const memories = Array.from(get().memory_cards.values());
    return memories.filter(memory => memory.session_id === session_id);
  },
  
  searchMemories: (query) => {
    const memories = Array.from(get().memory_cards.values());
    const lowerQuery = query.toLowerCase();
    
    return memories.filter(memory => 
      memory.title.toLowerCase().includes(lowerQuery) ||
      memory.summary.toLowerCase().includes(lowerQuery) ||
      memory.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery)) ||
      memory.auto_tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  },
  
  filterMemories: (filters) => {
    let memories = Array.from(get().memory_cards.values());
    
    if (filters.categories && filters.categories.length > 0) {
      memories = memories.filter(memory => 
        filters.categories!.includes(memory.category)
      );
    }
    
    if (filters.minImportance !== undefined) {
      memories = memories.filter(memory => 
        memory.importance.score >= filters.minImportance!
      );
    }
    
    if (filters.dateRange) {
      memories = memories.filter(memory => {
        const createdDate = new Date(memory.created_at);
        return createdDate >= filters.dateRange!.start && createdDate <= filters.dateRange!.end;
      });
    }
    
    if (filters.keywords && filters.keywords.length > 0) {
      memories = memories.filter(memory =>
        filters.keywords!.some(keyword =>
          memory.keywords.some(k => k.toLowerCase().includes(keyword.toLowerCase())) ||
          memory.auto_tags.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))
        )
      );
    }
    
    if (filters.isPinned !== undefined) {
      memories = memories.filter(memory => memory.is_pinned === filters.isPinned);
    }
    
    if (filters.session_id) {
      memories = memories.filter(memory => memory.session_id === filters.session_id);
    }
    
    if (filters.character_id) {
      memories = memories.filter(memory => memory.character_id === filters.character_id);
    }
    
    return memories;
  },
  
  sortMemoriesByImportance: (memories) => {
    return [...memories].sort((a, b) => b.importance.score - a.importance.score);
  },
  
  sortMemoriesByDate: (memories) => {
    return [...memories].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  getLayerStatistics: () => {
    const memories = Array.from(get().memory_cards.values());
    return {
      total: memories.length,
      pinned: memories.filter(m => m.is_pinned).length,
      hidden: memories.filter(m => m.is_hidden).length,
      categories: memories.reduce((acc, m) => {
        acc[m.category] = (acc[m.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
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
  }
});


