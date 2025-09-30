// Mem0: Centralized Memory Service (stub implementation)
// Responsibilities:
// - ingestMessage: accept messages and update internal layers
// - getCandidateHistory: return deduplicated + trimmed history for API send
// - search: wrapper for vector search / memory cards
// - createEphemeralSummary / promoteToMemoryCard: hooks to summarizer / memory card store

import { UnifiedMessage, MemoryCard } from "@/types";
import { DynamicSummarizer } from "../memory/dynamic-summarizer";
import { VectorStore } from "../memory/vector-store";
import { useAppStore } from "@/store";

export interface GetHistoryOptions {
  sessionId: string;
  maxContextMessages: number;
  minRecentMessages?: number; // guarantee latest N messages
}

export class Mem0Service {
  private summarizer: DynamicSummarizer;
  private vectorStore: VectorStore;

  constructor() {
    this.summarizer = new DynamicSummarizer();
    this.vectorStore = new VectorStore();
  }

  async ingestMessage(message: UnifiedMessage): Promise<void> {
    try {
      // update vector store asynchronously (cost-optimized inside VectorStore)
      await this.vectorStore.addMessage(message);
    } catch (error) {
      console.warn("[Mem0] ingestMessage failed:", error);
    }
  }

  /**
   * Return candidate history for API send.
   * - perform deduplication
   * - ensure minRecentMessages (if provided)
   * - trim to maxContextMessages/2 by default to keep parity with existing logic
   */
  getCandidateHistory(messages: UnifiedMessage[], opts: GetHistoryOptions) {
    const { maxContextMessages, minRecentMessages = 5 } = opts; // デフォルト5ラウンド保証

    // 1. take latest maxContextMessages
    const recent = messages.slice(-maxContextMessages);

    // 2. deduplicate
    const dedup: Array<{ role: "user" | "assistant"; content: string }> = [];
    for (const msg of recent) {
      if (msg.role !== "user" && msg.role !== "assistant") continue;
      const entry = {
        role: msg.role as "user" | "assistant",
        content: msg.content,
      };
      const isDup = dedup.some(
        (d) => d.role === entry.role && d.content === entry.content
      );
      if (!isDup && entry.content.trim()) dedup.push(entry);
    }

    // 3. apply half-rule (mirror existing behavior) but respect minRecentMessages
    const halfLimit = Math.floor(maxContextMessages / 2);
    const finalLimit = Math.max(minRecentMessages, halfLimit);

    return dedup.slice(-finalLimit);
  }

  async createEphemeralSummary(messages: UnifiedMessage[]) {
    return this.summarizer.summarize(messages);
  }

  async promoteToMemoryCard(summary: string, meta: Partial<MemoryCard>) {
    // Complete implementation: persist memory card to store
    const store = useAppStore.getState();

    // Create the memory card with all required fields
    const card: MemoryCard = {
      id: meta.id || `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      session_id: meta.session_id || store.active_session_id || "",
      character_id: meta.character_id,
      title: meta.title || "Auto-generated Memory",
      summary,
      created_at: meta.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      importance: meta.importance || {
        score: 0.5,
        factors: {
          emotional_weight: 0.5,
          repetition_count: 0,
          user_emphasis: 0.5,
          ai_judgment: 0.5,
        }
      },
      keywords: meta.keywords || [],
      is_pinned: meta.is_pinned || false,
      is_hidden: meta.is_hidden || false,
      original_content: meta.original_content || summary,

      // Required fields
      source_message_ids: [],
      original_message_ids: [],
      category: 'other' as const,
      auto_tags: [],
      confidence: 0.8,
      is_edited: false,
      is_verified: false,

      // Optional Mem0 fields
      memory_type: meta.memory_type || "episodic",
      embedding: meta.embedding,
      accessed_count: meta.accessed_count || 0,
      last_accessed: meta.last_accessed,
      context: meta.context || {},

      // Required BaseEntity fields
      version: meta.version || 1,
      metadata: meta.metadata || {},
    };

    // Add to store
    const memoryCards = store.memory_cards instanceof Map
      ? new Map(store.memory_cards)
      : new Map();
    memoryCards.set(card.id, card);

    // Update store
    useAppStore.setState({
      memory_cards: memoryCards,
    });

    // Also add to vector store for searchability
    try {
      await this.vectorStore.addMessage({
        id: card.id,
        role: "system",
        content: `[MEMORY CARD] ${card.title}: ${card.summary}`,
        created_at: card.created_at,
        updated_at: card.updated_at,
        session_id: card.session_id,
        is_deleted: false,
        memory: {
          importance: card.importance,
          is_pinned: card.is_pinned,
          is_bookmarked: false,
          keywords: card.keywords,
          summary: card.summary,
        },
        expression: {
          emotion: { primary: "neutral", intensity: 0.5, emoji: "📝" },
          style: { font_weight: "normal", text_color: "#ffffff" },
          effects: [],
        },
        edit_history: [],
        regeneration_count: 0,
        metadata: { type: "memory_card", card_id: card.id },
        version: 1,
      } as UnifiedMessage);
    } catch (error) {
      console.warn("[Mem0] Failed to add memory card to vector store:", error);
    }

    console.log("✅ [Mem0] Memory card promoted and persisted:", card.id);
    return card;
  }

  async search(query: string, k = 5) {
    try {
      // Primary: vector search
      const vectorResults = await this.vectorStore.search(query, k);

      // Optionally supplement with memory_cards from store (simple merge)
      try {
        const store = useAppStore.getState();
        const memoryCards = store.memory_cards
          ? Array.from(store.memory_cards.values())
          : [];
        // naive keyword match boost
        const keywordMatches = memoryCards
          .map((card) => ({
            card,
            score: card.summary?.toLowerCase().includes(query.toLowerCase())
              ? 0.1
              : 0,
          }))
          .filter((c) => c.score > 0);

        // Map vectorResults to a unified format and append lightweight card entries
        const mapped = vectorResults.slice();
        for (const m of keywordMatches) {
          mapped.push({
            message: {
              id: `card_${m.card.id}`,
              content: m.card.summary || m.card.title,
              timestamp: new Date(m.card.created_at),
              sender: "assistant",
            },
            similarity: 0.5 + m.score,
            relevance: 0.5,
          });
        }

        return mapped.sort((a, b) => b.similarity - a.similarity).slice(0, k);
      } catch (err) {
        return vectorResults;
      }
    } catch (error) {
      console.warn("[Mem0] search failed, returning empty results:", error);
      return [] as any[];
    }
  }
}

export const Mem0 = new Mem0Service();
