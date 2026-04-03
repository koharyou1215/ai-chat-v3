/**
 * Memory Section Builder
 *
 * メモリーカード情報のプロンプトセクションを構築
 * prompt-builder.service.ts と progressive-prompt-builder.service.ts で共用
 */

import { MemoryCard } from '@/types';
import { MemorySectionOptions, LightMemoryCard } from './types';

export class MemorySectionBuilder {
  /**
   * メモリーカードセクションを構築
   *
   * @param options 構築オプション
   * @returns フォーマットされたメモリーセクション文字列
   */
  build(options: MemorySectionOptions): string {
    const {
      memoryCards,
      character,
      maxPinnedCards = 3,
      maxRelevantCards = 5,
      maxCards,
      format = 'detailed',
    } = options;

    if (!memoryCards || memoryCards.length === 0) {
      return '';
    }

    // ピン留めメモリーカード
    let pinnedMemories = memoryCards
      .filter((m) => m.is_pinned)
      .slice(0, maxPinnedCards);

    // 関連メモリーカード（キャラクター固有または非ピン留め）
    let relevantMemories = memoryCards
      .filter((m) => !m.is_pinned && (!character || m.character_id === character.id))
      .slice(0, maxRelevantCards);

    // 総数制限がある場合（compact形式用）
    if (maxCards !== undefined) {
      const totalCards = [...pinnedMemories, ...relevantMemories].slice(0, maxCards);
      return this.buildCompactFormat(totalCards);
    }

    // メモリーカードが存在しない場合は空文字を返す
    if (pinnedMemories.length === 0 && relevantMemories.length === 0) {
      return '';
    }

    // フォーマット形式に応じて構築
    if (format === 'simple') {
      return this.buildSimpleFormat(pinnedMemories, relevantMemories);
    } else if (format === 'compact') {
      return this.buildCompactFormat([...pinnedMemories, ...relevantMemories]);
    }

    return this.buildDetailedFormat(pinnedMemories, relevantMemories);
  }

  /**
   * コンパクトフォーマット（prompt-builder用、タグなし）
   */
  private buildCompactFormat(
    memoryCards: (MemoryCard | LightMemoryCard)[]
  ): string {
    if (memoryCards.length === 0) {
      return '';
    }

    const lines: string[] = [];

    memoryCards.forEach((card) => {
      lines.push(`[${card.category || 'general'}] ${card.title}: ${card.summary}`);
      if (card.keywords && card.keywords.length > 0) {
        lines.push(`Keywords: ${card.keywords.join(', ')}`);
      }
    });

    return lines.join('\n');
  }

  /**
   * シンプルフォーマット（プログレッシブモード用）
   */
  private buildSimpleFormat(
    pinnedMemories: (MemoryCard | LightMemoryCard)[],
    relevantMemories: (MemoryCard | LightMemoryCard)[]
  ): string {
    const lines: string[] = [];

    lines.push('<memory_context>');

    if (pinnedMemories.length > 0) {
      pinnedMemories.forEach((m) => {
        lines.push(`[Pinned] ${m.title}: ${m.summary}`);
      });
    }

    if (relevantMemories.length > 0) {
      relevantMemories.forEach((m) => {
        lines.push(`[Related] ${m.title}: ${m.summary}`);
      });
    }

    lines.push('</memory_context>');

    return lines.join('\n');
  }

  /**
   * 詳細フォーマット（通常モード用）
   */
  private buildDetailedFormat(
    pinnedMemories: (MemoryCard | LightMemoryCard)[],
    relevantMemories: (MemoryCard | LightMemoryCard)[]
  ): string {
    const lines: string[] = [];

    lines.push('<memory_system>');

    if (pinnedMemories.length > 0) {
      lines.push('## Pinned Memories (Most Important)');
      pinnedMemories.forEach((m) => {
        lines.push('');
        lines.push(`[${m.category}] ${m.title}`);
        lines.push(`Summary: ${m.summary}`);
        if (m.keywords && m.keywords.length > 0) {
          lines.push(`Keywords: ${m.keywords.join(', ')}`);
        }
        // 型ガード: MemoryCardの場合のみimportanceを参照
        if ('importance' in m && m.importance) {
          lines.push(`Importance: ${m.importance.score}`);
        }
      });
      lines.push('');
    }

    if (relevantMemories.length > 0) {
      lines.push('## Relevant Memories');
      relevantMemories.forEach((m) => {
        lines.push('');
        lines.push(`[${m.category}] ${m.title}`);
        lines.push(`Summary: ${m.summary}`);
        if (m.keywords && m.keywords.length > 0) {
          lines.push(`Keywords: ${m.keywords.join(', ')}`);
        }
      });
      lines.push('');
    }

    lines.push('</memory_system>');

    return lines.join('\n');
  }

  /**
   * ヘルパー: フィルタリングと制限を適用したメモリーカードを取得
   *
   * @param memoryCards 全メモリーカード
   * @param character キャラクター（オプション）
   * @param maxCards 最大件数
   * @returns フィルタリングされたメモリーカード
   */
  static filterMemoryCards(
    memoryCards: MemoryCard[],
    character?: { id: string },
    maxCards: number = 5
  ): MemoryCard[] {
    return memoryCards
      .filter((card) => card.is_pinned || (character && card.character_id === character.id))
      .slice(0, maxCards);
  }
}

export const memorySectionBuilder = new MemorySectionBuilder();
