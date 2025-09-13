/**
 * Tracker to Prompt Mapping System
 * トラッカーの状態を画像生成プロンプトに変換
 */

// TrackerValueSimple is just the actual value, not the full TrackerValue interface
type TrackerValueSimple = string | number | boolean;

interface PromptMapping {
  positive: string[];
  negative: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export class TrackerPromptMapper {
  private static mappings: Record<string, Record<string | number, PromptMapping>> = {
    // 拘束状態マッピング
    'restraint_status': {
      '自由': {
        positive: ['standing', 'free movement', 'relaxed pose'],
        negative: ['tied', 'bound', 'restrained', 'rope', 'chains'],
        priority: 'medium'
      },
      '手首拘束': {
        positive: ['hands tied', 'wrists bound', 'arms restrained', 'rope on wrists'],
        negative: ['free hands', 'gesturing', 'holding items'],
        priority: 'critical'
      },
      '全身拘束': {
        positive: ['fully tied up', 'bound completely', 'restrained body', 'rope bondage', 'immobilized'],
        negative: ['standing', 'walking', 'free movement', 'gesturing'],
        priority: 'critical'
      },
      '完全拘束': {
        positive: ['completely restrained', 'heavy bondage', 'unable to move', 'blindfolded', 'gagged'],
        negative: ['free', 'moving', 'smiling', 'talking', 'standing'],
        priority: 'critical'
      }
    },

    // 戦闘状態マッピング
    'combat_state': {
      '非戦闘': {
        positive: ['peaceful', 'calm', 'relaxed'],
        negative: ['fighting', 'battle', 'combat', 'attacking'],
        priority: 'low'
      },
      '戦闘中': {
        positive: ['fighting pose', 'battle stance', 'dynamic action', 'combat ready', 'intense expression'],
        negative: ['peaceful', 'relaxed', 'sitting', 'smiling gently'],
        priority: 'critical'
      },
      '勝利': {
        positive: ['victorious pose', 'triumphant', 'confident smile', 'standing over defeated enemy'],
        negative: ['losing', 'injured', 'scared', 'running away'],
        priority: 'high'
      },
      '敗北': {
        positive: ['defeated', 'on the ground', 'exhausted', 'injured'],
        negative: ['winning', 'standing tall', 'confident', 'smiling'],
        priority: 'critical'
      }
    },

    // 感情状態マッピング
    'emotion_state': {
      '通常': {
        positive: ['neutral expression', 'calm face'],
        negative: [],
        priority: 'low'
      },
      '興奮': {
        positive: ['excited expression', 'flushed face', 'heavy breathing', 'aroused'],
        negative: ['calm', 'neutral', 'bored'],
        priority: 'high'
      },
      '恐怖': {
        positive: ['scared expression', 'fearful eyes', 'trembling', 'pale face'],
        negative: ['confident', 'smiling', 'relaxed'],
        priority: 'high'
      },
      '怒り': {
        positive: ['angry expression', 'fierce eyes', 'gritted teeth', 'aggressive pose'],
        negative: ['happy', 'smiling', 'peaceful', 'calm'],
        priority: 'high'
      }
    },

    // 数値型トラッカーの範囲マッピング
    'arousal_level': {
      'low': { // 0-30
        positive: ['calm', 'composed', 'neutral expression'],
        negative: ['aroused', 'excited', 'flushed'],
        priority: 'medium'
      },
      'medium': { // 31-70
        positive: ['slightly flushed', 'breathing heavily', 'excited'],
        negative: ['calm', 'neutral'],
        priority: 'medium'
      },
      'high': { // 71-100
        positive: ['highly aroused', 'flushed face', 'heavy breathing', 'sweating', 'intense expression'],
        negative: ['calm', 'neutral', 'composed'],
        priority: 'high'
      }
    }
  };

  /**
   * トラッカー値をプロンプト要素に変換
   */
  static getPromptFromTracker(
    trackerName: string,
    value: TrackerValueSimple,
    type: 'numeric' | 'state' | 'boolean' | 'text'
  ): PromptMapping | null {
    const mapping = this.mappings[trackerName];
    if (!mapping) return null;

    // 数値型の場合は範囲で判定
    if (type === 'numeric' && typeof value === 'number') {
      if (value <= 30) return mapping['low'] || null;
      if (value <= 70) return mapping['medium'] || null;
      return mapping['high'] || null;
    }

    // その他の型は直接マッピング
    return mapping[String(value)] || null;
  }

  /**
   * 複数のトラッカーから統合プロンプトを生成
   */
  static generateIntegratedPrompt(trackers: Array<{
    name: string;
    value: TrackerValueSimple;
    type: 'numeric' | 'state' | 'boolean' | 'text';
  }>): {
    critical: string[];
    high: string[];
    medium: string[];
    low: string[];
    negative: string[];
  } {
    const result = {
      critical: [] as string[],
      high: [] as string[],
      medium: [] as string[],
      low: [] as string[],
      negative: [] as string[]
    };

    for (const tracker of trackers) {
      const mapping = this.getPromptFromTracker(tracker.name, tracker.value, tracker.type);
      if (!mapping) continue;

      // 優先度別に分類
      switch (mapping.priority) {
        case 'critical':
          result.critical.push(...mapping.positive);
          break;
        case 'high':
          result.high.push(...mapping.positive);
          break;
        case 'medium':
          result.medium.push(...mapping.positive);
          break;
        case 'low':
          result.low.push(...mapping.positive);
          break;
      }

      // ネガティブプロンプトは統合
      result.negative.push(...mapping.negative);
    }

    return result;
  }
}