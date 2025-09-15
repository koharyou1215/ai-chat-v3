import { TrackerDefinition, TrackerUpdate, TrackerValue, UnifiedMessage, TrackerType, LegacyTrackerDefinition } from '@/types';
import type { NumericTrackerConfig, StateTrackerConfig } from '@/types/core/tracker.types';

// This is a placeholder for the full TrackerSet from the specs
// We will expand on this later.
type Tracker = TrackerDefinition & {
  current_value: string | number | boolean;
};

interface TrackerSet {
  character_id: string;
  trackers: Map<string, Tracker>;
  history: TrackerUpdate[];
  last_updated: string;
}

export class TrackerManager {
  private trackerSets: Map<string, TrackerSet> = new Map();
  private updateCallbacks: Set<(update: TrackerUpdate) => void> = new Set();

  /**
   * トラッカーセットの初期化
   */
  initializeTrackerSet(characterId: string, trackers: TrackerDefinition[]): TrackerSet {
    const trackerMap = new Map<string, Tracker>();
    
    trackers.forEach(definition => {
      // 古い形式から新しい形式への変換
      let normalizedDefinition: TrackerDefinition;
      
      if (!definition.config && (definition as LegacyTrackerDefinition).type) {
        // 古い形式の場合、新しい形式に変換
        const oldFormat = definition as LegacyTrackerDefinition;
        // 型安全な変換処理
        const trackerType = oldFormat.type as TrackerType || 'text';
        const configBase = {
          type: trackerType,
        };
        
        let config: TrackerDefinition['config'];
        
        switch (trackerType) {
          case 'numeric':
            config = {
              ...configBase,
              type: 'numeric',
              initial_value: oldFormat.initial_value ?? (oldFormat.min_value ?? 0),
              min_value: oldFormat.min_value ?? 0,
              max_value: oldFormat.max_value ?? 100,
              step: oldFormat.step ?? 1
            } as NumericTrackerConfig;
            break;
          case 'state':
            config = {
              ...configBase,
              type: 'state',
              initial_state: oldFormat.initial_state ?? '',
              possible_states: oldFormat.possible_states?.map(s => ({
                id: s.id,
                label: s.label
              })) ?? []
            } as StateTrackerConfig;
            break;
          case 'boolean':
            config = {
              ...configBase,
              type: 'boolean',
              initial_value: oldFormat.initial_boolean ?? false
            };
            break;
          case 'text':
            config = {
              ...configBase,
              type: 'text',
              initial_value: oldFormat.initial_text ?? ''
            };
            break;
          default:
            config = {
              ...configBase,
              type: 'composite'
            };
        }
        
        normalizedDefinition = {
          ...definition,
          config
        };
        
        console.log(`[TrackerManager] Converted old format tracker '${definition.name}':`, {
          oldFormat: { 
            type: oldFormat.type, 
            initial_value: oldFormat.initial_value,
            initial_text: oldFormat.initial_text,
            initial_boolean: oldFormat.initial_boolean
          },
          newFormat: normalizedDefinition.config
        });
      } else {
        normalizedDefinition = definition;
      }
      
      if (!normalizedDefinition.config) {
        console.error('Tracker definition is missing config:', normalizedDefinition);
        return;
      }
      
      // 初期値を設定 - JSONのcurrent_valueを優先
      let currentValue: string | number | boolean;
      
      // JSONファイルにcurrent_valueが存在する場合はそれを使用
      if ('current_value' in normalizedDefinition && normalizedDefinition.current_value !== undefined) {
        currentValue = normalizedDefinition.current_value;
        console.log(`Using JSON current_value for ${normalizedDefinition.name}:`, currentValue);
      } else {
        // current_valueが無い場合のみデフォルト値を設定
        switch (normalizedDefinition.config.type) {
        case 'numeric':
          // 数値型の場合、初期値をチェック（古いフォーマットも考慮）
          const numericConfig = normalizedDefinition.config as any;
          const oldFormatValue = (normalizedDefinition as any).initial_value;
          
          if (typeof numericConfig.initial_value === 'number') {
            currentValue = numericConfig.initial_value;
          } else if (typeof oldFormatValue === 'number') {
            currentValue = oldFormatValue;
          } else {
            // min_value/max_valueが設定されていない場合のデフォルト値設定
            if (normalizedDefinition.config.min_value === undefined) {
              normalizedDefinition.config.min_value = 0;
            }
            if (normalizedDefinition.config.max_value === undefined) {
              normalizedDefinition.config.max_value = 100;
            }
            
            // トラッカー名から適切な初期値を推測
            const trackerName = normalizedDefinition.name.toLowerCase();
            const description = normalizedDefinition.description?.toLowerCase() || '';
            
            if (trackerName.includes('arousal') || trackerName.includes('興奮')) {
              currentValue = 20; // 興奮度系は20から開始
            } else if (trackerName.includes('delusion') || trackerName.includes('妄想')) {
              currentValue = 50; // 妄想系は中間値から開始
            } else if (trackerName.includes('level') || trackerName.includes('レベル')) {
              currentValue = 1;  // レベル系は1から開始
            } else if (description.includes('興奮') || description.includes('媚薬')) {
              currentValue = 15; // 薬物系は低めから開始
            } else {
              currentValue = normalizedDefinition.config.min_value || 0;
            }
          }
          break;
        case 'state':
          // 状態型の場合、initial_stateまたは最初の可能な状態を使用
          const stateConfig = normalizedDefinition.config as any;
          currentValue = stateConfig.initial_state || 
                       stateConfig.initial_value ||
                       (stateConfig.possible_states && stateConfig.possible_states.length > 0 
                         ? stateConfig.possible_states[0].id || stateConfig.possible_states[0]
                         : '');
          
          // possible_statesが空の場合、トラッカー名と説明から推測して設定
          if ((!normalizedDefinition.config.possible_states || normalizedDefinition.config.possible_states.length === 0)) {
            const trackerName = normalizedDefinition.name.toLowerCase();
            const description = normalizedDefinition.description?.toLowerCase() || '';
            
            if (trackerName.includes('relationship') || trackerName.includes('関係')) {
              if (description.includes('撮影')) {
                normalizedDefinition.config.possible_states = [
                  { id: '演技指導者と女優', label: '演技指導者と女優' },
                  { id: '撮影監督と出演者', label: '撮影監督と出演者' },
                  { id: '信頼できるパートナー', label: '信頼できるパートナー' },
                  { id: '特別な存在', label: '特別な存在' }
                ];
                currentValue = currentValue || '演技指導者と女優';
              } else {
                normalizedDefinition.config.possible_states = [
                  { id: '初対面', label: '初対面' },
                  { id: '知り合い', label: '知り合い' },
                  { id: '友人', label: '友人' },
                  { id: '信頼関係', label: '信頼関係' },
                  { id: '特別な存在', label: '特別な存在' }
                ];
                currentValue = currentValue || '初対面';
              }
            } else if (trackerName.includes('mental') || trackerName.includes('勘違い')) {
              if (description.includes('撮影')) {
                normalizedDefinition.config.possible_states = [
                  { id: '完全に信じている', label: '完全に信じている' },
                  { id: '少し疑問', label: '少し疑問' },
                  { id: '半信半疑', label: '半信半疑' },
                  { id: '現実を理解', label: '現実を理解' }
                ];
                currentValue = currentValue || '完全に信じている';
              } else {
                normalizedDefinition.config.possible_states = [
                  { id: '通常', label: '通常' },
                  { id: '混乱', label: '混乱' },
                  { id: '理解', label: '理解' },
                  { id: '受容', label: '受容' }
                ];
                currentValue = currentValue || '通常';
              }
            } else {
              normalizedDefinition.config.possible_states = [
                { id: '通常', label: '通常' },
                { id: '変化中', label: '変化中' },
                { id: '発展', label: '発展' }
              ];
              currentValue = currentValue || '通常';
            }
          } else if (normalizedDefinition.config.possible_states.length > 0 && !currentValue) {
            // 最初の状態を初期値とする - オブジェクトの場合はidを取得
            const firstState = normalizedDefinition.config.possible_states[0];
            currentValue = typeof firstState === 'string' ? firstState : firstState.id;
          }
          
          if (!currentValue) {
            // トラッカー名から適切な初期状態を推測
            const trackerName = normalizedDefinition.name.toLowerCase();
            if (trackerName.includes('relationship') || trackerName.includes('関係')) {
              currentValue = '初対面';
            } else if (trackerName.includes('mental') || trackerName.includes('勘違い')) {
              currentValue = '完全に信じている';
            } else {
              currentValue = '通常';
            }
          }
          break;
        case 'boolean':
          // ブール型の場合、initial_valueまたは変換時のinitial_booleanまたはfalseをデフォルトとして設定
          const booleanConfig = normalizedDefinition.config as any;
          currentValue = typeof booleanConfig.initial_value === 'boolean' 
            ? booleanConfig.initial_value 
            : typeof booleanConfig.initial_boolean === 'boolean'
            ? booleanConfig.initial_boolean
            : false;
          break;
        case 'text':
          // テキスト型の場合、initial_valueまたは変換時のinitial_textまたは空文字をデフォルトとして設定
          const textConfig = normalizedDefinition.config as any;
          currentValue = typeof textConfig.initial_value === 'string' 
            ? textConfig.initial_value 
            : typeof textConfig.initial_text === 'string'
            ? textConfig.initial_text
            : '未設定';
          break;
        default:
          currentValue = 0;
        }
      }
      
      const initializedTracker: Tracker = { 
        ...normalizedDefinition, 
        current_value: currentValue 
      };
      
      console.log(`Initialized tracker ${normalizedDefinition.name}:`, {
        type: normalizedDefinition.config.type,
        initial_value: normalizedDefinition.config.initial_value,
        initial_state: normalizedDefinition.config.initial_state,
        current_value: currentValue
      });
      trackerMap.set(normalizedDefinition.name, initializedTracker);
    });

    const trackerSet: TrackerSet = {
      character_id: characterId,
      trackers: trackerMap,
      history: [],
      last_updated: new Date().toISOString()
    };

    this.trackerSets.set(characterId, trackerSet);
    return trackerSet;
  }

  /**
   * プロンプト用に整形されたトラッカー情報を取得
   */
  getTrackersForPrompt(characterId: string): string {
    const trackerSet = this.trackerSets.get(characterId);
    if (!trackerSet || trackerSet.trackers.size === 0) {
      return '';
    }

    let promptText = '<trackers>\n';
    for (const tracker of trackerSet.trackers.values()) {
      // current_value が undefined や null の場合は初期値を表示
      const value = tracker.current_value ?? (tracker as Record<string, unknown>).initial_value ?? (tracker as Record<string, unknown>).initial_state ?? (tracker as Record<string, unknown>).initial_boolean ?? 'N/A';
      promptText += `${tracker.display_name}: ${value}\n`;
    }
    promptText += '</trackers>';
    
    return promptText;
  }

  /**
   * 詳細なトラッカー情報をプロンプト用に取得（キャラクター設定強化版）
   */
  getDetailedTrackersForPrompt(characterId: string): string {
    const trackerSet = this.trackerSets.get(characterId);
    if (!trackerSet || trackerSet.trackers.size === 0) {
      return '';
    }

    let promptText = '';
    
    for (const tracker of trackerSet.trackers.values()) {
      const value = tracker.current_value ?? 'N/A';
      
      // トラッカー情報を詳細に記述
      promptText += `## ${tracker.display_name}\n`;
      promptText += `Current Value: ${value}`;
      
      // 数値型の場合は範囲情報も含める
      if (tracker.config.type === 'numeric' && tracker.config.min_value !== undefined && tracker.config.max_value !== undefined) {
        promptText += ` (Range: ${tracker.config.min_value}-${tracker.config.max_value})`;
      }
      
      // 状態型の場合は可能な状態を含める
      if (tracker.config.type === 'state' && tracker.config.possible_states && tracker.config.possible_states.length > 0) {
        promptText += ` (Possible: ${tracker.config.possible_states.join(', ')})`;
      }
      
      promptText += '\n';
      
      // 説明があれば含める
      if (tracker.description) {
        promptText += `Description: ${tracker.description}\n`;
      }
      
      // 最近の変更履歴があれば含める（最新3件）
      const recentUpdates = trackerSet.history
        .filter(update => update.tracker_name === tracker.name)
        .slice(-3);
      
      if (recentUpdates.length > 0) {
        promptText += `Recent Changes:\n`;
        recentUpdates.forEach(update => {
          promptText += `- ${update.old_value} → ${update.new_value} (${update.reason || 'No reason'})\n`;
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
    newValue: TrackerValue,
    reason?: string
  ): boolean {
    const trackerSet = this.trackerSets.get(characterId);
    if (!trackerSet) {
      console.error(`Tracker set for character ${characterId} not found.`);
      return false;
    }

    const tracker = trackerSet.trackers.get(trackerName);
    if (!tracker) {
      console.error(`Tracker ${trackerName} not found for character ${characterId}.`);
      return false;
    }

    const oldValue = tracker.current_value;
    
    // TODO: Add value validation based on tracker type and config

    tracker.current_value = newValue;
    trackerSet.last_updated = new Date().toISOString();

    const update: TrackerUpdate = {
      tracker_name: trackerName,
      old_value: oldValue,
      new_value: newValue,
      timestamp: trackerSet.last_updated,
      reason: reason || 'UI interaction',
      auto_update: false
    };

    trackerSet.history.push(update);

    console.log(`✅ [TrackerManager] Updated tracker '${trackerName}': ${oldValue} → ${newValue}${reason ? ` (${reason})` : ''}`);

    // Notify listeners about the update
    this.notifyUpdate(update);

    // Update the map to ensure state changes are picked up by Zustand
    this.trackerSets.set(characterId, { ...trackerSet });
    
    return true;
  }

  /**
   * 更新を通知
   */
  private notifyUpdate(update: TrackerUpdate): void {
    this.updateCallbacks.forEach(callback => callback(update));
  }

  onUpdate(callback: (update: TrackerUpdate) => void): () => void {
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
   */
  loadFromObject(data: { trackerSets: Record<string, Record<string, unknown>> }): void {
    const restoredTrackerSets = new Map<string, TrackerSet>();
    for (const key in data.trackerSets) {
      const value = data.trackerSets[key];
      restoredTrackerSets.set(key, {
        ...(value as Omit<TrackerSet, 'trackers'>),
        trackers: new Map(value.trackers as [string, Tracker][])
      });
    }
    this.trackerSets = restoredTrackerSets;
  }

  /**
   * メッセージからトラッカー更新を自動分析
   */
  analyzeMessageForTrackerUpdates(message: UnifiedMessage, characterId: string): TrackerUpdate[] {
    const trackerSet = this.trackerSets.get(characterId);
    if (!trackerSet) {
      console.log('[TrackerManager] No tracker set found for character:', characterId);
      return [];
    }
    
    console.log(`🎯 [TrackerManager] Analyzing message for tracker updates:`, {
      characterId: characterId.substring(0, 8) + '...',
      trackerCount: trackerSet.trackers.size,
      messageContent: message.content.substring(0, 50) + '...',
      messageRole: message.role
    });

    const updates: TrackerUpdate[] = [];
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
        console.log(`🎯 [TrackerManager] Updating tracker '${trackerName}':`, {
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
      console.log(`✅ [TrackerManager] Analysis complete - ${updates.length} tracker(s) updated:`, {
        characterId: characterId.substring(0, 8) + '...',
        updates: updates.map(u => `${u.tracker_name}: ${u.old_value}→${u.new_value}`)
      });
    } else {
      console.log(`📊 [TrackerManager] Analysis complete - No tracker updates needed`, {
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

    // デフォルトの数値トラッカー分析（どのパターンにも該当しない場合）
    // 会話が続いている限り、少しずつ変化させる
    if (isUserMessage) {
      const step = config.step || 1;
      let change = 0;

      // メッセージの長さに応じた変化
      if (content.length > 100) {
        change = step * 2;
      } else if (content.length > 50) {
        change = step;
      } else if (content.length > 10) {
        change = Math.max(1, Math.floor(step / 2));
      }

      // ランダム性を加える（時々減少も）
      if (Math.random() < 0.2) {
        change = -change;
      }

      if (change !== 0) {
        const newValue = Math.max(config.min_value || 0, Math.min(config.max_value || 100, currentValue + change));
        if (newValue !== currentValue) {
          return { value: newValue, reason: '会話による自然な変動' };
        }
      }
    }

    return null;
  }

  /**
   * 好感度トラッカーの分析
   */
  private analyzeAffectionTracker(currentValue: number, content: string, isUserMessage: boolean, config: NumericTrackerConfig): { value: number; reason: string } | null {
    let change = 0;
    let reason = '';

    // より包括的なポジティブキーワード
    const positiveKeywords = ['ありがとう', 'うれしい', '好き', '愛してる', '素敵', '優しい', '楽しい',
                              'かわいい', '最高', 'いいね', '面白い', '興味深い', '素晴らしい',
                              'すごい', 'よかった', '感謝', '大好き', 'ステキ', 'やった'];
    const negativeKeywords = ['嫌い', '最悪', 'むかつく', '怒り', 'ばか', 'うざい', '消えろ',
                              'やめて', '無理', 'ダメ', '違う', 'つまらない', '退屈'];

    if (isUserMessage) {
      // ユーザーのメッセージによる変化
      for (const keyword of positiveKeywords) {
        if (content.includes(keyword)) {
          change += 5; // さらに大きな変化で反応しやすく
          reason = `ポジティブな発言: ${keyword}`;
          break;
        }
      }

      if (change === 0) {
        for (const keyword of negativeKeywords) {
          if (content.includes(keyword)) {
            change -= 4;
            reason = `ネガティブな発言: ${keyword}`;
            break;
          }
        }
      }

      // 絵文字による感情表現
      if (content.match(/[😊😄😍🥰❤️💕♥️]/)) {
        change += 3;
        reason = reason || 'ポジティブな絵文字';
      } else if (content.match(/[😢😭😡😠💔]/)) {
        change -= 2;
        reason = reason || 'ネガティブな絵文字';
      }

      // 質問形式は関心の表れ
      if ((content.includes('？') || content.includes('?')) && change === 0) {
        change += 2;
        reason = '質問による関心表示';
      }

      // 長いメッセージは関心の表れ
      if (content.length > 100 && change === 0) {
        change += 2;
        reason = '丁寧な長いメッセージ';
      }

      // 日常的な会話でも必ず小さな変化を追加（常に変化を起こす）
      if (change === 0) {
        change += 1;
        reason = '会話の継続';
      }
    } else {
      // AIの応答でも微増（会話が成立している証）
      if (content.length > 50) {
        change += 1;
        reason = 'AI応答による会話の継続';
      }
    }

    // 必ず何らかの変化を返す
    const newValue = Math.max(config.min_value || 0, Math.min(config.max_value || 100, currentValue + change));
    if (newValue !== currentValue) {
      return { value: newValue, reason };
    }

    // 変化がない場合でも、ランダムに小さな変化を追加（10%の確率）
    if (Math.random() < 0.1) {
      const randomChange = isUserMessage ? 1 : 0;
      const randomValue = Math.max(config.min_value || 0, Math.min(config.max_value || 100, currentValue + randomChange));
      if (randomValue !== currentValue) {
        return { value: randomValue, reason: 'ランダムな変動' };
      }
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
      if (typeof state !== 'string') {
        console.warn(`Tracker "${tracker.name}" has a non-string state:`, state);
        continue;
      }
      const keywords = stateKeywords[state] || [state.toLowerCase()];
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          return { value: state, reason: `状態変化: ${keyword}` };
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
