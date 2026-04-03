/**
 * Prompt Section Builders - Common Types
 *
 * プロンプトセクションビルダーの共通型定義
 */

import { Character, Persona, MemoryCard } from '@/types';
import { TrackerManager } from '../tracker/tracker-manager';

/**
 * 軽量メモリーカード型（Mem0検索結果など）
 */
export interface LightMemoryCard {
  id: string;
  title: string;
  summary: string;
  category?: string;
  keywords?: string[];
  is_pinned?: boolean;
  character_id?: string;
}

/**
 * メモリーセクション構築オプション
 */
export interface MemorySectionOptions {
  memoryCards: MemoryCard[] | LightMemoryCard[];
  character?: Character;
  maxPinnedCards?: number;
  maxRelevantCards?: number;
  maxCards?: number; // 総数制限（prompt-builder用）
  format?: 'detailed' | 'simple' | 'compact';
}

/**
 * キャラクターセクション構築オプション
 */
export interface CharacterSectionOptions {
  character: Character;
  user?: Persona;
  format?: 'full' | 'minimal';
}

/**
 * トラッカーセクション構築オプション
 */
export interface TrackerSectionOptions {
  trackerManager: TrackerManager;
  characterId: string;
  detailed?: boolean;
}
