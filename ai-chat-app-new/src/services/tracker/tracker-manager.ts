import { TrackerDefinition, UnifiedMessage, TrackerType } from '@/types';
import type { NumericTrackerConfig, StateTrackerConfig, BooleanTrackerConfig, TextTrackerConfig } from '@/types/core/tracker.types';
import { logger } from '@/utils/logger';

// 内部使用のための TrackerUpdate 型
interface InternalTrackerUpdate {
  tracker_name: string;
  character_id?: string;
  old_value: string | number | boolean;
  new_value: string | number | boolean;
  timestamp: string;
  reason?: string;
  auto_update?: boolean;
}

// This is a placeholder for the full TrackerSet from the specs
// We will expand on this later.
type Tracker = TrackerDefinition & {
  current_value: string | number | boolean;
};

interface TrackerSet {
  character_id: string;
  trackers: Map<string, Tracker>;
  history: InternalTrackerUpdate[];
  last_updated: string;
}

export class TrackerManager {
  private trackerSets: Map<string, TrackerSet> = new Map();
  private updateCallbacks: Set<(update: InternalTrackerUpdate) => void> = new Set();

  /**
   * トラッカーセットの初期化
   *
   * ✨ Simplified: 全キャラクターファイルが新フォーマット(config オブジェクト使用)に統一済みのため、
   * レガシー変換ロジックと推測ロジックを削除し、シンプルな実装に簡素化
   */
  initializeTrackerSet(characterId: string, trackers: TrackerDefinition[]): TrackerSet {
    const trackerMap = new Map<string, Tracker>();

    trackers.forEach(definition => {
      // 新フォーマット検証
      if (!definition.config) {
        logger.error('Tracker definition is missing config:', definition);
        return;
      }

      // config から初期値を取得（型安全）
      const currentValue = this.getInitialValue(definition.config);

      const initializedTracker: Tracker = {
        ...definition,
        current_value: currentValue
      };

      logger.debug(`Initialized tracker ${definition.name}:`, {
        type: definition.config.type,
        current_value: currentValue
      });

      trackerMap.set(definition.name, initializedTracker);
    });

    const trackerSet: TrackerSet = {
      character_id: characterId,
      trackers: trackerMap,
      history: [],
      last_updated: new Date().toISOString()
    };

    this.trackerSets.set(characterId, trackerSet);
    logger.info(`Initialized tracker set for character ${characterId}: ${trackerMap.size} trackers`);

    return trackerSet;
  }

  /**
   * config から型安全に初期値を取得
   */
  private getInitialValue(config: TrackerDefinition['config']): string | number | boolean {
    switch (config.type) {
      case 'numeric':
        return (config as NumericTrackerConfig).initial_value;
      case 'state':
        return (config as StateTrackerConfig).initial_state;
      case 'boolean':
        return (config as BooleanTrackerConfig).initial_value;
      case 'text':
        return (config as TextTrackerConfig).initial_value;
      default:
        logger.warn(`Unknown tracker type: ${config.type}, defaulting to 0`);
        return 0;
    }
  }

  /**
   * プロンプト用に整形されたトラッカー情報を取得（日本語版）
   */
  getTrackersForPrompt(characterId: string): string {
    const trackerSet = this.trackerSets.get(characterId);
    if (!trackerSet || trackerSet.trackers.size === 0) {
      return '';
    }

    let promptText = '<トラッカー情報>\n';
    for (const tracker of trackerSet.trackers.values()) {
      // current_value が undefined や null の場合は初期値を表示
      const trackerConfigRecord = tracker.config as unknown as Record<string, unknown>;
      const value = tracker.current_value ??
        (tracker.config.type === 'numeric' ? (tracker.config as NumericTrackerConfig).initial_value :
         tracker.config.type === 'state' ? (tracker.config as StateTrackerConfig).initial_state :
         tracker.config.type === 'boolean' ? (trackerConfigRecord.initial_value ?? false) :
         tracker.config.type === 'text' ? (trackerConfigRecord.initial_value ?? '') :
         'N/A');
      promptText += `【${tracker.display_name}】: ${value}\n`;
    }
    promptText += '</トラッカー情報>';

    return promptText;
  }

  /**
   * 詳細なトラッカー情報をプロンプト用に取得（日本語版・キャラクター設定強化版）
   */
  getDetailedTrackersForPrompt(characterId: string): string {
    const trackerSet = this.trackerSets.get(characterId);
    if (!trackerSet || trackerSet.trackers.size === 0) {
      return '';
    }

    let promptText = '';

    for (const tracker of trackerSet.trackers.values()) {
      const value = tracker.current_value ?? 'N/A';

      // トラッカー情報を詳細に記述（日本語）
      promptText += `## 【${tracker.display_name}】\n`;
      promptText += `現在の値: ${value}`;

      // 数値型の場合は範囲情報も含める
      if (tracker.config.type === 'numeric' && tracker.config.min_value !== undefined && tracker.config.max_value !== undefined) {
        promptText += ` (範囲: ${tracker.config.min_value}～${tracker.config.max_value})`;
      }

      // 状態型の場合は可能な状態を含める
      if (tracker.config.type === 'state' && tracker.config.possible_states && tracker.config.possible_states.length > 0) {
        const possibleStatesText = tracker.config.possible_states
          .map(s => typeof s === 'string' ? s : s.label || s.id)
          .join('、');
        promptText += ` (選択肢: ${possibleStatesText})`;
      }

      promptText += '\n';

      // 説明があれば含める
      if (tracker.description) {
        promptText += `説明: ${tracker.description}\n`;
      }

      // 最近の変更履歴があれば含める（最新3件）
      const recentUpdates = trackerSet.history
        .filter(update => update.tracker_name === tracker.name)
        .slice(-3);

      if (recentUpdates.length > 0) {
        promptText += `最近の変化:\n`;
        recentUpdates.forEach(update => {
          promptText += `- ${update.old_value} → ${update.new_value} (${update.reason || '理由なし'})\n`;
        });
      }

      promptText += '\n';
    }

    return promptText;
  }

  /**
   * トラッカーセットを取得
   */
  getTrackerSet(characterId: string): TrackerSet | undefined {
    return this.trackerSets.get(characterId);
  }

  /**
   * トラッカーの値を更新
   */
  updateTracker(
    characterId: string,
    trackerName: string,
    newValue: string | number | boolean,
    reason?: string
  ): boolean {
    const trackerSet = this.trackerSets.get(characterId);
    if (!trackerSet) {
      logger.error(`Tracker set for character ${characterId} not found.`);
      return false;
    }

    const tracker = trackerSet.trackers.get(trackerName);
    if (!tracker) {
      logger.error(`Tracker ${trackerName} not found for character ${characterId}.`);
      return false;
    }

    const oldValue = tracker.current_value;
    
    // TODO: Add value validation based on tracker type and config

    tracker.current_value = newValue;
    trackerSet.last_updated = new Date().toISOString();

    const update: InternalTrackerUpdate = {
      tracker_name: trackerName,
      old_value: oldValue,
      new_value: newValue,
      timestamp: trackerSet.last_updated,
      reason: reason || 'UI interaction',
      auto_update: false
    };

    trackerSet.history.push(update);

    logger.debug(`[TrackerManager] Updated tracker '${trackerName}': ${oldValue} → ${newValue}`);

    // Notify listeners about the update
    this.notifyUpdate(update);

    // Update the map to ensure state changes are picked up by Zustand
    this.trackerSets.set(characterId, { ...trackerSet });
    
    return true;
  }

  /**
   * 更新を通知
   */
  private notifyUpdate(update: InternalTrackerUpdate): void {
    this.updateCallbacks.forEach(callback => callback(update));
  }

  onUpdate(callback: (update: InternalTrackerUpdate) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  /**
   * 状態をプレーンオブジェクトとしてエクスポート
   */
  getTrackerSetsAsObject(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const [key, value] of this.trackerSets.entries()) {
      obj[key] = {
        ...value,
        trackers: Array.from(value.trackers.entries())
      };
    }
    return obj;
  }

  /**
   * プレーンオブジェクトから状態を復元
   * 🔧 修正: 防御的な実装で復元の信頼性を向上
   */
  loadFromObject(data: { trackerSets: Record<string, Record<string, unknown>> }): void {
    if (!data || !data.trackerSets) {
      logger.warn('[TrackerManager] loadFromObject: Invalid data, skipping restoration');
      return;
    }

    const restoredTrackerSets = new Map<string, TrackerSet>();

    for (const key in data.trackerSets) {
      const value = data.trackerSets[key];

      if (!value || typeof value !== 'object') {
        logger.warn(`[TrackerManager] Invalid trackerSet for key: ${key}`);
        continue;
      }

      // trackersが配列形式かチェック
      if (!value.trackers || !Array.isArray(value.trackers)) {
        logger.warn(`[TrackerManager] Invalid trackers format for key: ${key}`, {
          hasTrackers: !!value.trackers,
          trackersType: typeof value.trackers,
          isArray: Array.isArray(value.trackers)
        });
        continue;
      }

      try {
        restoredTrackerSets.set(key, {
          ...(value as Omit<TrackerSet, 'trackers'>),
          trackers: new Map(value.trackers as [string, Tracker][])
        });

        logger.debug(`[TrackerManager] Restored ${(value.trackers as unknown[]).length} trackers for character: ${key}`);
      } catch (error) {
        logger.error(`[TrackerManager] Failed to restore trackers for key: ${key}`, error);
      }
    }

    this.trackerSets = restoredTrackerSets;
    logger.info(`[TrackerManager] Restored ${restoredTrackerSets.size} tracker sets from storage`);
  }

  /**
   * メッセージからトラッカー更新を自動分析
   */
  analyzeMessageForTrackerUpdates(message: UnifiedMessage, characterId: string): InternalTrackerUpdate[] {
    const trackerSet = this.trackerSets.get(characterId);
    if (!trackerSet) {
      logger.debug('[TrackerManager] No tracker set found for character:', characterId);
      return [];
    }

    logger.debug(`🎯 [TrackerManager] Analyzing message for tracker updates:`, {
      characterId: characterId.substring(0, 8) + '...',
      trackerCount: trackerSet.trackers.size,
      messageContent: message.content.substring(0, 50) + '...',
      messageRole: message.role
    });

    const updates: InternalTrackerUpdate[] = [];
    const content = message.content.toLowerCase();
    const isUserMessage = message.role === 'user';
    
    // より積極的な更新のためのフラグ
    let hasAnyUpdate = false;

    for (const [trackerName, tracker] of trackerSet.trackers) {
      const oldValue = tracker.current_value;
      let newValue = oldValue;
      let shouldUpdate = false;
      let reason = '';

      // トラッカーの種類に応じた分析
      switch (tracker.config.type) {
        case 'numeric':
          const numericResult = this.analyzeNumericTracker(tracker, content, isUserMessage);
          if (numericResult) {
            newValue = numericResult.value;
            shouldUpdate = true;
            reason = numericResult.reason;
          }
          break;

        case 'state':
          const stateResult = this.analyzeStateTracker(tracker, content, isUserMessage);
          if (stateResult) {
            newValue = stateResult.value;
            shouldUpdate = true;
            reason = stateResult.reason;
          }
          break;

        case 'boolean':
          const booleanResult = this.analyzeBooleanTracker(tracker, content, isUserMessage);
          if (booleanResult) {
            newValue = booleanResult.value;
            shouldUpdate = true;
            reason = booleanResult.reason;
          }
          break;

        case 'text':
          const textResult = this.analyzeTextTracker(tracker, content, isUserMessage);
          if (textResult) {
            newValue = textResult.value;
            shouldUpdate = true;
            reason = textResult.reason;
          }
          break;
      }

      if (shouldUpdate && newValue !== oldValue) {
        logger.debug(`🎯 [TrackerManager] Updating tracker '${trackerName}':`, {
          oldValue,
          newValue,
          reason
        });

        // 実際に更新実行
        this.updateTracker(characterId, trackerName, newValue, `自動更新: ${reason}`);
        hasAnyUpdate = true;
        
        updates.push({
          character_id: characterId,
          tracker_name: trackerName,
          old_value: oldValue,
          new_value: newValue,
          timestamp: new Date().toISOString(),
          reason: `自動更新: ${reason}`,
          auto_update: true
        });
      }
    }

    if (hasAnyUpdate) {
      logger.debug(`✅ [TrackerManager] Analysis complete - ${updates.length} tracker(s) updated:`, {
        characterId: characterId.substring(0, 8) + '...',
        updates: updates.map(u => `${u.tracker_name}: ${u.old_value}→${u.new_value}`)
      });
    } else {
      logger.debug(`📊 [TrackerManager] Analysis complete - No tracker updates needed`, {
        characterId: characterId.substring(0, 8) + '...',
        analyzedTrackers: trackerSet.trackers.size,
        messageContent: message.content.substring(0, 30) + '...'
      });
    }

    return updates;
  }

  /**
   * 数値トラッカーの分析
   */
  private analyzeNumericTracker(tracker: Tracker, content: string, isUserMessage: boolean): { value: number; reason: string } | null {
    const currentValue = tracker.current_value as number;
    const config = tracker.config as NumericTrackerConfig;
    
    // トラッカー名に基づく分析パターン
    const trackerName = tracker.name.toLowerCase();
    
    if (trackerName.includes('好感度') || trackerName.includes('affection')) {
      return this.analyzeAffectionTracker(currentValue, content, isUserMessage, config);
    }
    
    if (trackerName.includes('興奮') || trackerName.includes('arousal')) {
      return this.analyzeArousalTracker(currentValue, content, isUserMessage, config);
    }
    
    if (trackerName.includes('信頼') || trackerName.includes('trust')) {
      return this.analyzeTrustTracker(currentValue, content, isUserMessage, config);
    }

    if (trackerName.includes('ストレス') || trackerName.includes('stress')) {
      return this.analyzeStressTracker(currentValue, content, isUserMessage, config);
    }

    return null;
  }

  /**
   * 好感度トラッカーの分析
   */
  private analyzeAffectionTracker(currentValue: number, content: string, isUserMessage: boolean, config: NumericTrackerConfig): { value: number; reason: string } | null {
    let change = 0;
    let reason = '';

    // ポジティブなキーワード
    const positiveKeywords = ['ありがとう', 'うれしい', '好き', '愛してる', '素敵', '優しい', '楽しい'];
    const negativeKeywords = ['嫌い', '最悪', 'むかつく', '怒り', 'ばか', 'うざい', '消えろ'];

    if (isUserMessage) {
      // ユーザーのメッセージによる変化
      for (const keyword of positiveKeywords) {
        if (content.includes(keyword)) {
          change += 3; // より大きな変化で反応しやすく
          reason = `ポジティブな発言: ${keyword}`;
          break;
        }
      }

      for (const keyword of negativeKeywords) {
        if (content.includes(keyword)) {
          change -= 4; // より大きな変化で反応しやすく
          reason = `ネガティブな発言: ${keyword}`;
          break;
        }
      }

      // 質問形式は微増
      if (content.includes('？') || content.includes('?')) {
        change += 2;
        reason = '質問による関心表示';
      }
      
      // 日常的な会話でも小さな変化を追加
      if (content.length > 10 && change === 0) {
        change += 1;
        reason = '一般的な会話参加';
      }
    } else {
      // AIの応答による微調整（通常は変化なし）
      if (content.includes('困った') || content.includes('悲しい')) {
        change -= 1;
        reason = 'AIの困惑・悲しみ';
      }
    }

    if (change !== 0) {
      const newValue = Math.max(config.min_value || 0, Math.min(config.max_value || 100, currentValue + change));
      return { value: newValue, reason };
    }

    return null;
  }

  /**
   * 興奮度トラッカーの分析
   */
  private analyzeArousalTracker(currentValue: number, content: string, isUserMessage: boolean, config: NumericTrackerConfig): { value: number; reason: string } | null {
    let change = 0;
    let reason = '';

    const excitingKeywords = ['すごい', '興奮', 'わくわく', '楽しみ', '驚き', '最高'];
    const calmingKeywords = ['落ち着く', '平静', '静か', '穏やか', 'リラックス'];

    for (const keyword of excitingKeywords) {
      if (content.includes(keyword)) {
        change += 3;
        reason = `興奮要素: ${keyword}`;
        break;
      }
    }

    for (const keyword of calmingKeywords) {
      if (content.includes(keyword)) {
        change -= 2;
        reason = `落ち着き要素: ${keyword}`;
        break;
      }
    }

    // 感嘆符の数に応じて興奮度上昇
    const exclamationCount = (content.match(/！|!/g) || []).length;
    if (exclamationCount > 0) {
      change += exclamationCount;
      reason = `感嘆符による興奮: ${exclamationCount}個`;
    }

    if (change !== 0) {
      const newValue = Math.max(config.min_value || 0, Math.min(config.max_value || 100, currentValue + change));
      return { value: newValue, reason };
    }

    return null;
  }

  /**
   * 信頼度トラッカーの分析
   */
  private analyzeTrustTracker(currentValue: number, content: string, isUserMessage: boolean, config: NumericTrackerConfig): { value: number; reason: string } | null {
    let change = 0;
    let reason = '';

    const trustKeywords = ['信じる', '頼りにする', '安心', '約束', '正直', '誠実'];
    const distrustKeywords = ['嘘', '騙す', '疑う', '信用できない', '裏切り'];

    for (const keyword of trustKeywords) {
      if (content.includes(keyword)) {
        change += 2;
        reason = `信頼向上: ${keyword}`;
        break;
      }
    }

    for (const keyword of distrustKeywords) {
      if (content.includes(keyword)) {
        change -= 4;
        reason = `信頼低下: ${keyword}`;
        break;
      }
    }

    if (change !== 0) {
      const newValue = Math.max(config.min_value || 0, Math.min(config.max_value || 100, currentValue + change));
      return { value: newValue, reason };
    }

    return null;
  }

  /**
   * ストレストラッカーの分析
   */
  private analyzeStressTracker(currentValue: number, content: string, isUserMessage: boolean, config: NumericTrackerConfig): { value: number; reason: string } | null {
    let change = 0;
    let reason = '';

    const stressKeywords = ['忙しい', '疲れた', '大変', 'ストレス', '辛い', '困った'];
    const relaxKeywords = ['楽', '休憩', '癒し', 'のんびり', '平和'];

    for (const keyword of stressKeywords) {
      if (content.includes(keyword)) {
        change += 3;
        reason = `ストレス要因: ${keyword}`;
        break;
      }
    }

    for (const keyword of relaxKeywords) {
      if (content.includes(keyword)) {
        change -= 2;
        reason = `リラックス要因: ${keyword}`;
        break;
      }
    }

    if (change !== 0) {
      const newValue = Math.max(config.min_value || 0, Math.min(config.max_value || 100, currentValue + change));
      return { value: newValue, reason };
    }

    return null;
  }

  /**
   * 状態トラッカーの分析
   */
  private analyzeStateTracker(tracker: Tracker, content: string, _isUserMessage: boolean): { value: string; reason: string } | null {
    const config = tracker.config as StateTrackerConfig;
    const possibleStates = config.possible_states || [];
    
    // キーワードマッピング
    const stateKeywords: Record<string, string[]> = {
      '幸せ': ['嬉しい', '幸せ', '喜び', '楽しい'],
      '普通': ['普通', '平常', '通常'],
      '悲しい': ['悲しい', '辛い', '落ち込む'],
      '怒り': ['怒り', '腹立つ', 'むかつく'],
      '驚き': ['驚き', 'びっくり', '驚いた'],
      '恐れ': ['怖い', '不安', '心配'],
      '興奮': ['興奮', 'わくわく', '盛り上がり']
    };

    for (const state of possibleStates) {
      const stateId = typeof state === 'string' ? state : state.id;
      if (!stateId || typeof stateId !== 'string') {
        logger.warn(`Tracker "${tracker.name}" has an invalid state:`, state);
        continue;
      }
      const keywords = stateKeywords[stateId] || [stateId.toLowerCase()];
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          return { value: stateId, reason: `状態変化: ${keyword}` };
        }
      }
    }

    return null;
  }

  /**
   * ブール値トラッカーの分析
   */
  private analyzeBooleanTracker(tracker: Tracker, content: string, _isUserMessage: boolean): { value: boolean; reason: string } | null {
    const trackerName = tracker.name.toLowerCase();
    
    if (trackerName.includes('デート') || trackerName.includes('date')) {
      if (content.includes('デート') || content.includes('出かけ') || content.includes('一緒に')) {
        return { value: true, reason: 'デート関連の発言' };
      }
    }
    
    if (trackerName.includes('秘密') || trackerName.includes('secret')) {
      if (content.includes('秘密') || content.includes('内緒') || content.includes('誰にも言わない')) {
        return { value: true, reason: '秘密に関する発言' };
      }
    }

    return null;
  }

  /**
   * テキストトラッカーの分析
   */
  private analyzeTextTracker(tracker: Tracker, content: string, isUserMessage: boolean): { value: string; reason: string } | null {
    const trackerName = tracker.name.toLowerCase();
    const currentValue = tracker.current_value as string;
    
    // 最後の話題・現在の話題系
    if (trackerName.includes('話題') || trackerName.includes('topic') || 
        trackerName.includes('会話') || trackerName.includes('conversation')) {
      // 質問文や新しい話題の検出
      if (content.includes('？') || content.includes('?') || 
          content.includes('について') || content.includes('のこと')) {
        const topic = content.slice(0, 50).replace(/[\n\r]/g, ' '); // 最初の50文字を話題として記録
        if (topic !== currentValue) {
          return { value: topic + '...', reason: '新しい話題の検出' };
        }
      }
    }
    
    // 場所・ロケーション系
    if (trackerName.includes('場所') || trackerName.includes('location') || 
        trackerName.includes('現在地')) {
      const locationKeywords = ['公園', '家', '学校', '職場', 'オフィス', 'カフェ', 'レストラン', '駅'];
      for (const keyword of locationKeywords) {
        if (content.includes(keyword)) {
          return { value: keyword, reason: `場所の変更: ${keyword}` };
        }
      }
    }
    
    // 状況・シチュエーション系
    if (trackerName.includes('状況') || trackerName.includes('situation') || 
        trackerName.includes('シチュエーション')) {
      // ユーザーのメッセージから状況を推測
      if (isUserMessage) {
        if (content.length > 20) {
          const situation = content.slice(0, 40).replace(/[\n\r]/g, ' ');
          if (situation !== currentValue) {
            return { value: situation + '...', reason: '状況の更新' };
          }
        }
      }
    }
    
    // 気持ち・感情系のテキスト
    if (trackerName.includes('気持ち') || trackerName.includes('feeling') || 
        trackerName.includes('感情')) {
      const emotionPhrases = [
        '嬉しい', '楽しい', '悲しい', '寂しい', '怒って', '不安', 
        '期待', 'わくわく', 'どきどき', '緊張'
      ];
      for (const phrase of emotionPhrases) {
        if (content.includes(phrase)) {
          return { value: phrase, reason: `感情の変化: ${phrase}` };
        }
      }
    }
    
    // メモ・記録系（常に最新のメッセージ内容を保存）
    if (trackerName.includes('メモ') || trackerName.includes('memo') || 
        trackerName.includes('記録') || trackerName.includes('note')) {
      // 最新のメッセージの要約を記録
      const memo = content.slice(0, 60).replace(/[\n\r]/g, ' ');
      if (memo !== currentValue && memo.length > 5) {
        return { value: memo + '...', reason: '新しいメモの記録' };
      }
    }

    // デフォルト：長いメッセージがあれば要約として記録
    if (content.length > 30 && Math.random() > 0.7) {
      const summary = content.slice(0, 40).replace(/[\n\r]/g, ' ') + '...';
      if (summary !== currentValue) {
        return { value: summary, reason: 'メッセージの要約' };
      }
    }

    return null;
  }
}
