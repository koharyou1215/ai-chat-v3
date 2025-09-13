/**
 * Context Analysis Engine for Image Generation
 * チャットの文脈から画像生成に必要な情報を抽出
 */

import { UnifiedMessage } from '@/types/memory';
import { Character } from '@/types/core/character.types';

interface SceneContext {
  action: string[];      // 現在の動作
  emotion: string[];     // 感情表現
  environment: string[]; // 環境・場所
  interaction: string[]; // 相互作用
  objects: string[];     // 登場する物体
}

export class ContextAnalyzer {
  // アクションキーワードマッピング
  private static actionKeywords: Record<string, string[]> = {
    '戦う': ['fighting', 'combat pose', 'battle stance', 'attacking'],
    '攻撃': ['attacking', 'striking', 'aggressive pose'],
    '防御': ['defending', 'blocking', 'defensive stance'],
    '走る': ['running', 'sprinting', 'dynamic movement'],
    '座る': ['sitting', 'seated', 'sitting down'],
    '立つ': ['standing', 'standing up', 'upright pose'],
    '横になる': ['lying down', 'laying', 'reclined'],
    '縛る': ['tying', 'binding', 'restraining'],
    '縛られる': ['tied up', 'bound', 'restrained'],
    '抱きしめる': ['hugging', 'embracing', 'holding close'],
    'キス': ['kissing', 'kiss', 'lips touching'],
    '泣く': ['crying', 'tears', 'weeping'],
    '笑う': ['laughing', 'smiling', 'happy expression'],
    '怒る': ['angry', 'furious expression', 'rage'],
    '震える': ['trembling', 'shaking', 'shivering'],
    '倒れる': ['falling', 'collapsed', 'on the ground']
  };

  // 感情キーワードマッピング
  private static emotionKeywords: Record<string, string[]> = {
    '嬉しい': ['happy', 'joyful expression', 'smiling'],
    '悲しい': ['sad', 'sorrowful', 'melancholic'],
    '怒り': ['angry', 'furious', 'rage'],
    '恐怖': ['scared', 'frightened', 'fearful'],
    '恥ずかしい': ['embarrassed', 'blushing', 'shy'],
    '興奮': ['excited', 'aroused', 'flushed'],
    '困惑': ['confused', 'puzzled', 'bewildered'],
    '絶望': ['despair', 'hopeless', 'devastated'],
    '安心': ['relieved', 'calm', 'peaceful'],
    '驚き': ['surprised', 'shocked', 'wide eyes']
  };

  // 環境キーワードマッピング
  private static environmentKeywords: Record<string, string[]> = {
    '部屋': ['room', 'indoor', 'interior'],
    '寝室': ['bedroom', 'bed', 'private room'],
    '浴室': ['bathroom', 'bath', 'shower room'],
    '屋外': ['outdoor', 'outside', 'exterior'],
    '森': ['forest', 'woods', 'trees'],
    '街': ['city', 'urban', 'street'],
    '戦場': ['battlefield', 'combat zone', 'war zone'],
    '城': ['castle', 'palace', 'fortress'],
    'ダンジョン': ['dungeon', 'underground', 'dark chamber'],
    '牢屋': ['prison cell', 'jail', 'cage'],
    '夜': ['night', 'dark', 'nighttime'],
    '昼': ['daytime', 'daylight', 'bright'],
    '夕方': ['sunset', 'evening', 'dusk']
  };

  /**
   * 最新のメッセージから文脈を分析
   */
  static analyzeRecentMessages(
    messages: UnifiedMessage[],
    character: Character
  ): SceneContext {
    const context: SceneContext = {
      action: [],
      emotion: [],
      environment: [],
      interaction: [],
      objects: []
    };

    // 最新3メッセージを分析
    const recentMessages = messages.slice(-3);

    for (const message of recentMessages) {
      const content = message.content.toLowerCase();

      // アクション検出
      for (const [keyword, prompts] of Object.entries(this.actionKeywords)) {
        if (content.includes(keyword)) {
          context.action.push(...prompts);
        }
      }

      // 感情検出
      for (const [keyword, prompts] of Object.entries(this.emotionKeywords)) {
        if (content.includes(keyword)) {
          context.emotion.push(...prompts);
        }
      }

      // 環境検出
      for (const [keyword, prompts] of Object.entries(this.environmentKeywords)) {
        if (content.includes(keyword)) {
          context.environment.push(...prompts);
        }
      }

      // 特殊パターン検出
      this.detectSpecialPatterns(content, context);
    }

    // 重複を除去
    context.action = [...new Set(context.action)];
    context.emotion = [...new Set(context.emotion)];
    context.environment = [...new Set(context.environment)];
    context.interaction = [...new Set(context.interaction)];
    context.objects = [...new Set(context.objects)];

    return context;
  }

  /**
   * 特殊なパターンを検出
   */
  private static detectSpecialPatterns(content: string, context: SceneContext): void {
    // 戦闘シーン
    if (content.match(/戦闘|バトル|攻撃|防御|必殺技/)) {
      context.action.push('dynamic action', 'combat scene');
      context.environment.push('action scene', 'dramatic lighting');
    }

    // 拘束シーン
    if (content.match(/縛|拘束|捕まえ|動けな/)) {
      context.action.push('restrained', 'bound', 'captured');
      context.objects.push('rope', 'restraints');
    }

    // ロマンティックシーン
    if (content.match(/愛して|キス|抱きしめ|好き/)) {
      context.interaction.push('romantic', 'intimate', 'close up');
      context.emotion.push('love', 'affection');
    }

    // 緊張シーン
    if (content.match(/危険|逃げ|助け|急/)) {
      context.action.push('tense', 'urgent movement');
      context.emotion.push('worried', 'panicked');
    }
  }

  /**
   * キャラクター情報とコンテキストの矛盾を解決
   */
  static resolveContradictions(
    characterPrompts: string[],
    contextPrompts: string[],
    priority: 'character' | 'context'
  ): {
    resolved: string[];
    negative: string[];
  } {
    const contradictions: Record<string, string[]> = {
      'standing': ['sitting', 'lying down', 'kneeling'],
      'sitting': ['standing', 'running', 'jumping'],
      'happy': ['sad', 'angry', 'crying'],
      'sad': ['happy', 'laughing', 'smiling'],
      'fighting': ['peaceful', 'relaxed', 'sleeping'],
      'restrained': ['free movement', 'running', 'gesturing'],
      'indoor': ['outdoor', 'sky', 'forest'],
      'outdoor': ['indoor', 'room', 'ceiling']
    };

    const resolved: string[] = [];
    const negative: string[] = [];

    // 優先度の高い方を基準に矛盾を解決
    const primary = priority === 'context' ? contextPrompts : characterPrompts;
    const secondary = priority === 'context' ? characterPrompts : contextPrompts;

    // プライマリをすべて採用
    resolved.push(...primary);

    // セカンダリから矛盾しないものだけ採用
    for (const prompt of secondary) {
      let hasContradiction = false;

      for (const primaryPrompt of primary) {
        if (contradictions[primaryPrompt]?.includes(prompt)) {
          hasContradiction = true;
          negative.push(prompt);
          break;
        }
      }

      if (!hasContradiction) {
        resolved.push(prompt);
      }
    }

    return {
      resolved: [...new Set(resolved)],
      negative: [...new Set(negative)]
    };
  }
}