/**
 * Prompt Cache Service
 * プロンプト構築のキャッシュ機構
 *
 * 効果: 50-80ms削減
 */

import { Character, Persona } from "@/types";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
}

export class PromptCacheService {
  private characterPromptCache = new Map<string, CacheEntry<string>>();
  private personaPromptCache = new Map<string, CacheEntry<string>>();
  private CACHE_TTL = 5 * 60 * 1000; // 5分間有効

  /**
   * キャラクタープロンプトのキャッシュ取得または生成
   */
  getCharacterPrompt(
    character: Character,
    builder: (char: Character) => string
  ): string {
    const cacheKey = this.getCharacterCacheKey(character);
    const cached = this.characterPromptCache.get(cacheKey);

    // キャッシュが有効な場合は返す
    if (cached && this.isCacheValid(cached)) {
      console.log(`✅ [PromptCache] Character prompt cache hit: ${character.name}`);
      return cached.data;
    }

    // キャッシュがない、または無効な場合は新規生成
    console.log(`🔄 [PromptCache] Building character prompt: ${character.name}`);
    const prompt = builder(character);

    this.characterPromptCache.set(cacheKey, {
      data: prompt,
      timestamp: Date.now(),
      version: character.updated_at || character.created_at,
    });

    return prompt;
  }

  /**
   * ペルソナプロンプトのキャッシュ取得または生成
   */
  getPersonaPrompt(
    persona: Persona,
    builder: (persona: Persona) => string
  ): string {
    const cacheKey = this.getPersonaCacheKey(persona);
    const cached = this.personaPromptCache.get(cacheKey);

    // キャッシュが有効な場合は返す
    if (cached && this.isCacheValid(cached)) {
      console.log(`✅ [PromptCache] Persona prompt cache hit: ${persona.name}`);
      return cached.data;
    }

    // キャッシュがない、または無効な場合は新規生成
    console.log(`🔄 [PromptCache] Building persona prompt: ${persona.name}`);
    const prompt = builder(persona);

    this.personaPromptCache.set(cacheKey, {
      data: prompt,
      timestamp: Date.now(),
      version: persona.updated_at || persona.created_at,
    });

    return prompt;
  }

  /**
   * キャッシュのクリア
   */
  clearCache() {
    this.characterPromptCache.clear();
    this.personaPromptCache.clear();
    console.log("🗑️ [PromptCache] All caches cleared");
  }

  /**
   * 特定のキャラクターのキャッシュをクリア
   */
  clearCharacterCache(characterId: string) {
    const keysToDelete: string[] = [];
    this.characterPromptCache.forEach((_, key) => {
      if (key.startsWith(characterId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.characterPromptCache.delete(key));
    console.log(`🗑️ [PromptCache] Cleared cache for character: ${characterId}`);
  }

  /**
   * キャラクターのキャッシュキーを生成
   */
  private getCharacterCacheKey(character: Character): string {
    return `${character.id}_${character.updated_at || character.created_at}`;
  }

  /**
   * ペルソナのキャッシュキーを生成
   */
  private getPersonaCacheKey(persona: Persona): string {
    return `${persona.id}_${persona.updated_at || persona.created_at}`;
  }

  /**
   * キャッシュが有効かチェック
   */
  private isCacheValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < this.CACHE_TTL;
  }

  /**
   * キャッシュ統計情報
   */
  getCacheStats() {
    return {
      characterCacheSize: this.characterPromptCache.size,
      personaCacheSize: this.personaPromptCache.size,
      totalCacheSize:
        this.characterPromptCache.size + this.personaPromptCache.size,
    };
  }
}

// シングルトンインスタンス
export const promptCacheService = new PromptCacheService();
