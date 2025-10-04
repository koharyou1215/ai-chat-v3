// Mem0 Character Service
// Advanced character memory management with Mem0 integration
// Created: 2025-09-20

import {
  CharacterCore,
  RelationshipState,
  CharacterMemory,
  Mem0CharacterContext,
  Mem0CharacterSearchOptions,
  EnhancedMemoryCard,
  IMem0CharacterService,
  UnifiedMessage,
  UUID,
  Character,
  CharacterMemoryUpdate,
  RelationshipMilestone,
  MemoryCard,
} from "@/types";
import { useAppStore } from "@/store";
import { Mem0 } from "./core";
import { VectorStore } from "../memory/vector-store";

/**
 * Mem0 Character Service Implementation
 * Manages character cores, relationships, and dynamic memories
 */
export class Mem0CharacterService implements IMem0CharacterService {
  private vectorStore: VectorStore;
  private characterCores: Map<UUID, CharacterCore> = new Map();
  private relationships: Map<string, RelationshipState> = new Map();
  private characterMemories: Map<UUID, CharacterMemory> = new Map();

  constructor() {
    this.vectorStore = new VectorStore();
  }

  /**
   * Load character core from original Character definition
   */
  async loadCharacterCore(characterId: UUID): Promise<CharacterCore> {
    // Check cache first
    if (this.characterCores.has(characterId)) {
      return this.characterCores.get(characterId)!;
    }

    // Load from store
    const store = useAppStore.getState();
    const character = store.characters?.get(characterId);

    if (!character) {
      throw new Error(`Character ${characterId} not found`);
    }

    // Convert to CharacterCore
    const core = this.convertToCore(character);
    this.characterCores.set(characterId, core);

    return core;
  }

  /**
   * Convert Character to CharacterCore (immutable essence)
   */
  private convertToCore(character: Character): CharacterCore {
    return {
      identity: {
        id: character.id,
        name: character.name,
        role: character.occupation || "AI Assistant",
        age: character.age || "Unknown",
        occupation: character.occupation || "",
      },

      personality: {
        external: character.external_personality || character.personality || "",
        internal: character.internal_personality || "",
        traits: this.extractTraits(character),
        baseline_values: this.extractBaselineValues(character),
      },

      communication: {
        speaking_style: character.speaking_style || "",
        first_person: character.first_person || "私",
        second_person: character.second_person || "あなた",
        verbal_tics: character.verbal_tics || [],
      },

      principles: this.extractPrinciples(character),
    };
  }

  /**
   * Extract personality traits from character
   */
  private extractTraits(character: Character): string[] {
    const traits: string[] = [];

    // Extract from personality descriptions
    if (character.personality) {
      // Simple keyword extraction (can be enhanced with NLP)
      const keywords = character.personality
        .split(/[、。,.\s]+/)
        .filter((word) => word.length > 2);
      traits.push(...keywords.slice(0, 5));
    }

    return traits;
  }

  /**
   * Extract baseline personality values
   */
  private extractBaselineValues(character: Character): Record<string, number> {
    const values: Record<string, number> = {};

    // Example baseline values based on personality
    if (character.personality?.includes("ツンデレ")) {
      values.tsundere_level = 70;
    }
    if (character.personality?.includes("優しい")) {
      values.kindness = 80;
    }
    if (character.personality?.includes("真面目")) {
      values.seriousness = 75;
    }

    // Default values
    values.formality = values.formality || 50;
    values.openness = values.openness || 50;

    return values;
  }

  /**
   * Extract behavioral principles
   */
  private extractPrinciples(character: Character): string[] {
    const principles: string[] = [];

    // Extract from various character fields (behavior patterns)
    // Note: behavior_guidelines doesn't exist in Character type

    // Add default principles based on personality
    if (character.personality?.includes("ツンデレ")) {
      principles.push("素直になれない");
      principles.push("本当は優しい");
    }

    return principles;
  }

  /**
   * Get relationship state for character-user pair
   */
  async getRelationship(
    characterId: UUID,
    userId: string
  ): Promise<RelationshipState> {
    const key = `${characterId}:${userId}`;

    // Check cache
    if (this.relationships.has(key)) {
      return this.relationships.get(key)!;
    }

    // Try to load from store or create new
    const relationship = await this.loadOrCreateRelationship(characterId, userId);
    this.relationships.set(key, relationship);

    return relationship;
  }

  /**
   * Load existing relationship or create new one
   */
  private async loadOrCreateRelationship(
    characterId: UUID,
    userId: string
  ): Promise<RelationshipState> {
    // Try to load from Mem0 memory cards
    const searchResult = await Mem0.search(`relationship ${characterId} ${userId}`, 1);

    if (searchResult.length > 0) {
      // Parse from memory card
      // TODO: Implement proper deserialization
    }

    // Create new relationship
    return {
      character_id: characterId,
      user_id: userId,
      metrics: {
        trust_level: 0,
        familiarity: 0,
        emotional_bond: 0,
        interaction_count: 0,
      },
      stage: "stranger",
      milestones: [],
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Update relationship state
   */
  async updateRelationship(
    characterId: UUID,
    userId: string,
    updates: Partial<RelationshipState>
  ): Promise<void> {
    const key = `${characterId}:${userId}`;
    const current = await this.getRelationship(characterId, userId);

    const updated: RelationshipState = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.relationships.set(key, updated);

    // Persist to Mem0
    await this.persistRelationship(updated);
  }

  /**
   * Persist relationship to Mem0 as memory card
   */
  private async persistRelationship(relationship: RelationshipState): Promise<void> {
    const summary = `Relationship: ${relationship.stage}, Trust: ${relationship.metrics.trust_level}, Familiarity: ${relationship.metrics.familiarity}`;

    await Mem0.promoteToMemoryCard(summary, {
      title: `Relationship State`,
      keywords: ["relationship", relationship.character_id, relationship.user_id],
      importance: { score: 0.9, factors: { relational: 1.0 } as any },
    } as any);
  }

  /**
   * Get character memory
   */
  async getCharacterMemory(characterId: UUID): Promise<CharacterMemory> {
    if (this.characterMemories.has(characterId)) {
      return this.characterMemories.get(characterId)!;
    }

    // Load or create
    const memory = await this.loadOrCreateCharacterMemory(characterId);
    this.characterMemories.set(characterId, memory);

    return memory;
  }

  /**
   * Load or create character memory
   */
  private async loadOrCreateCharacterMemory(
    characterId: UUID
  ): Promise<CharacterMemory> {
    // Try to load from Mem0
    const searchResult = await Mem0.search(`character memory ${characterId}`, 5);

    // TODO: Deserialize from memory cards

    // Create new
    return {
      character_id: characterId,
      learned_preferences: {
        likes: [],
        dislikes: [],
        habits: [],
        patterns: [],
      },
      shared_experiences: {
        events: [],
        conversations: [],
        promises: [],
      },
      context_knowledge: {
        user_background: [],
        important_dates: [],
        special_topics: [],
      },
    };
  }

  /**
   * Learn from conversation
   */
  async learnFromConversation(
    characterId: UUID,
    messages: UnifiedMessage[]
  ): Promise<void> {
    if (messages.length === 0) return;

    // Analyze conversation for learning
    const insights = await this.analyzeConversation(messages);

    // Update character memory
    const memory = await this.getCharacterMemory(characterId);

    // Add learned preferences
    if (insights.preferences) {
      memory.learned_preferences.likes.push(...insights.preferences.likes);
      memory.learned_preferences.dislikes.push(...insights.preferences.dislikes);
    }

    // Add conversation summary
    if (insights.summary) {
      memory.shared_experiences.conversations.push({
        session_id: messages[0].session_id || "",
        summary: insights.summary,
        key_points: insights.keyPoints || [],
        emotional_tone: insights.emotionalTone || "neutral",
        timestamp: new Date().toISOString(),
      });
    }

    // Update cache
    this.characterMemories.set(characterId, memory);

    // Persist to Mem0
    await this.persistCharacterMemory(memory);
  }

  /**
   * Analyze conversation for insights
   */
  private async analyzeConversation(messages: UnifiedMessage[]): Promise<any> {
    // TODO: Implement conversation analysis
    // This could use AI to extract preferences, emotions, key points, etc.
    return {
      preferences: {
        likes: [],
        dislikes: [],
      },
      summary: "",
      keyPoints: [],
      emotionalTone: "neutral",
    };
  }

  /**
   * Persist character memory
   */
  private async persistCharacterMemory(memory: CharacterMemory): Promise<void> {
    const summary = JSON.stringify(memory);

    await Mem0.promoteToMemoryCard(summary, {
      title: `Character Memory ${memory.character_id}`,
      keywords: ["character", "memory", memory.character_id],
      importance: { score: 0.8, factors: { informational: 0.9 } as any },
    } as any);
  }

  /**
   * Build character context for prompt generation
   */
  async buildCharacterContext(
    characterId: UUID,
    userInput: string,
    options?: Mem0CharacterSearchOptions
  ): Promise<Mem0CharacterContext> {
    // Load core (immutable)
    const core = await this.loadCharacterCore(characterId);

    // Load relationship (dynamic)
    const relationship = await this.getRelationship(
      characterId,
      options?.query || "default-user"
    );

    // Load memories (dynamic)
    const memories = await this.getCharacterMemory(characterId);

    // Search relevant memory cards
    const relevantCards = await this.searchCharacterMemories(
      characterId,
      userInput,
      5
    );

    // Calculate token usage
    const tokenUsage = {
      core: this.estimateTokens(core),
      relationship: this.estimateTokens(relationship),
      memories: this.estimateTokens(memories),
      total: 0,
    };
    tokenUsage.total = tokenUsage.core + tokenUsage.relationship + tokenUsage.memories;

    // Convert EnhancedMemoryCard[] to MemoryCard[] by adding required fields
    const memoryCards: MemoryCard[] = relevantCards.map(card => ({
      ...card,
      embedding: card.embedding ? Array.from(card.embedding) : undefined,
      source_message_ids: [],
      original_message_ids: [],
      category: 'other' as const,
      auto_tags: [],
      original_content: card.summary,
      emotion_tags: [],
      importance: {
        score: card.character_relevance || 5.0,
        factors: {
          emotional_weight: card.relationship_impact || 5.0,
          repetition_count: 0,
          user_emphasis: 5.0,
          ai_judgment: 5.0,
        },
      },
      confidence: 0.8,
      is_edited: false,
      is_verified: card.auto_generated === false,
      is_pinned: false,
      is_hidden: false,
      version: 1,
      metadata: {},
    }));

    return {
      core,
      relationship,
      memories,
      relevant_cards: memoryCards,
      token_usage: tokenUsage,
    };
  }

  /**
   * Create character memory card
   */
  async createCharacterMemoryCard(
    characterId: UUID,
    content: any,
    metadata?: Partial<EnhancedMemoryCard>
  ): Promise<EnhancedMemoryCard> {
    const card: EnhancedMemoryCard = {
      id: `card_${Date.now()}`,
      character_id: characterId,
      session_id: metadata?.session_id || "",
      title: metadata?.title || "Character Memory",
      summary: typeof content === "string" ? content : JSON.stringify(content),
      keywords: metadata?.keywords || [],
      source_type: metadata?.source_type || "conversation",
      auto_generated: metadata?.auto_generated || true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      accessed_count: 0,
      importance: metadata?.importance || {
        score: 0.5,
        factors: {
          emotional: 0.5,
          informational: 0.5,
          relational: 0.5,
          temporal: 0.5,
        },
      },
    };

    // Store in Mem0
    await Mem0.promoteToMemoryCard(card.summary, card as any);

    return card;
  }

  /**
   * Search character memories
   */
  async searchCharacterMemories(
    characterId: UUID,
    query: string,
    limit: number = 10
  ): Promise<EnhancedMemoryCard[]> {
    // Search through Mem0
    const searchResults = await Mem0.search(`${characterId} ${query}`, limit);

    // Convert to EnhancedMemoryCard format
    return searchResults.map((result: any) => ({
      id: result.message?.id || "",
      character_id: characterId,
      session_id: "",
      title: "",
      summary: result.message?.content || "",
      keywords: [],
      source_type: "conversation" as const,
      auto_generated: true,
      created_at: result.message?.timestamp?.toISOString() || "",
      updated_at: new Date().toISOString(),
      accessed_count: 0,
      character_relevance: result.similarity,
      importance: {
        score: result.relevance || 0.5,
        factors: {
          emotional: 0.5,
          informational: 0.5,
          relational: 0.5,
          temporal: 0.5,
        },
      },
    }));
  }

  /**
   * Evolve character based on interactions
   */
  async evolveCharacter(
    characterId: UUID,
    interaction: UnifiedMessage[]
  ): Promise<void> {
    const userId = "default-user"; // TODO: Extract from session

    // Update relationship metrics
    const relationship = await this.getRelationship(characterId, userId);

    // Calculate interaction impact
    const impact = this.calculateInteractionImpact(interaction);

    // Update metrics
    relationship.metrics.interaction_count++;
    relationship.metrics.trust_level = Math.min(
      100,
      relationship.metrics.trust_level + impact.trust
    );
    relationship.metrics.familiarity = Math.min(
      100,
      relationship.metrics.familiarity + impact.familiarity
    );
    relationship.metrics.emotional_bond = Math.min(
      100,
      relationship.metrics.emotional_bond + impact.emotional
    );

    // Check for stage progression
    const newStage = this.determineRelationshipStage(relationship.metrics);
    if (newStage !== relationship.stage) {
      // Add milestone
      relationship.milestones.push({
        id: `milestone_${Date.now()}`,
        type: "trust_gained",
        description: `Relationship progressed to ${newStage}`,
        timestamp: new Date().toISOString(),
        importance: 0.8,
      });
      relationship.stage = newStage;
    }

    // Save updated relationship
    await this.updateRelationship(characterId, userId, relationship);

    // Learn from conversation
    await this.learnFromConversation(characterId, interaction);
  }

  /**
   * Calculate interaction impact on relationship
   */
  private calculateInteractionImpact(interaction: UnifiedMessage[]): {
    trust: number;
    familiarity: number;
    emotional: number;
  } {
    // Simple calculation based on message count and content
    // TODO: Implement proper sentiment analysis
    const messageCount = interaction.length;

    return {
      trust: Math.min(5, messageCount * 0.5),
      familiarity: Math.min(3, messageCount * 0.3),
      emotional: Math.min(2, messageCount * 0.2),
    };
  }

  /**
   * Determine relationship stage based on metrics
   */
  private determineRelationshipStage(metrics: {
    trust_level: number;
    familiarity: number;
    emotional_bond: number;
  }): RelationshipState["stage"] {
    const average = (metrics.trust_level + metrics.familiarity + metrics.emotional_bond) / 3;

    if (average >= 80) return "special";
    if (average >= 60) return "intimate";
    if (average >= 40) return "close_friend";
    if (average >= 20) return "friend";
    if (average >= 10) return "acquaintance";
    return "stranger";
  }

  /**
   * Estimate token count for data
   */
  private estimateTokens(data: any): number {
    // Simple estimation: ~4 characters per token
    const json = JSON.stringify(data);
    return Math.ceil(json.length / 4);
  }
}

// Export singleton instance
export const Mem0Character = new Mem0CharacterService();