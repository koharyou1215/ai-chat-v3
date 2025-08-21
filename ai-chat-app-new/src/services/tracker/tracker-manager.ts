import { TrackerDefinition, TrackerUpdate, TrackerValue, UnifiedMessage } from '@/types';

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
      
      if (!definition.config && (definition as any).type) {
        // 古い形式の場合、新しい形式に変換
        const oldFormat = definition as any;
        normalizedDefinition = {
          ...definition,
          config: {
            type: oldFormat.type,
            initial_value: oldFormat.initial_value !== undefined 
              ? oldFormat.initial_value 
              : oldFormat.initial_text !== undefined 
                ? oldFormat.initial_text
                : oldFormat.initial_boolean !== undefined 
                  ? oldFormat.initial_boolean 
                  : oldFormat.type === 'boolean' 
                    ? false 
                    : oldFormat.type === 'numeric'
                      ? (oldFormat.min_value || 0)
                      : undefined,
            initial_state: oldFormat.initial_state,
            possible_states: oldFormat.possible_states || [],
            min_value: oldFormat.min_value,
            max_value: oldFormat.max_value,
            step: oldFormat.step || 1
          }
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
      
      // 初期値を設定
      let currentValue: string | number | boolean;
      
      switch (normalizedDefinition.config.type) {
        case 'numeric':
          // 数値型の場合、初期値をチェック
          if (typeof normalizedDefinition.config.initial_value === 'number') {
            currentValue = normalizedDefinition.config.initial_value;
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
          currentValue = normalizedDefinition.config.initial_state;
          
          // possible_statesが空の場合、トラッカー名と説明から推測して設定
          if ((!normalizedDefinition.config.possible_states || normalizedDefinition.config.possible_states.length === 0)) {
            const trackerName = normalizedDefinition.name.toLowerCase();
            const description = normalizedDefinition.description?.toLowerCase() || '';
            
            if (trackerName.includes('relationship') || trackerName.includes('関係')) {
              if (description.includes('撮影')) {
                normalizedDefinition.config.possible_states = ['演技指導者と女優', '撮影監督と出演者', '信頼できるパートナー', '特別な存在'];
                currentValue = currentValue || '演技指導者と女優';
              } else {
                normalizedDefinition.config.possible_states = ['初対面', '知り合い', '友人', '信頼関係', '特別な存在'];
                currentValue = currentValue || '初対面';
              }
            } else if (trackerName.includes('mental') || trackerName.includes('勘違い')) {
              if (description.includes('撮影')) {
                normalizedDefinition.config.possible_states = ['完全に信じている', '少し疑問', '半信半疑', '現実を理解'];
                currentValue = currentValue || '完全に信じている';
              } else {
                normalizedDefinition.config.possible_states = ['通常', '混乱', '理解', '受容'];
                currentValue = currentValue || '通常';
              }
            } else {
              normalizedDefinition.config.possible_states = ['通常', '変化中', '発展'];
              currentValue = currentValue || '通常';
            }
          } else if (normalizedDefinition.config.possible_states.length > 0 && !currentValue) {
            // 最初の状態を初期値とする
            currentValue = normalizedDefinition.config.possible_states[0];
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
          // ブール型の場合、initial_valueまたはfalseをデフォルトとして設定
          currentValue = typeof normalizedDefinition.config.initial_value === 'boolean' 
            ? normalizedDefinition.config.initial_value 
            : false;
          break;
        case 'text':
          // テキスト型の場合、initial_valueまたは空文字をデフォルトとして設定
          currentValue = typeof normalizedDefinition.config.initial_value === 'string' 
            ? normalizedDefinition.config.initial_value 
            : '未設定';
          break;
        default:
          currentValue = 0;
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
  ): void {
    const trackerSet = this.trackerSets.get(characterId);
    if (!trackerSet) {
      console.error(`Tracker set for character ${characterId} not found.`);
      return;
    }

    const tracker = trackerSet.trackers.get(trackerName);
    if (!tracker) {
      console.error(`Tracker ${trackerName} not found for character ${characterId}.`);
      return;
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

    // Notify listeners about the update
    this.notifyUpdate(update);

    // Update the map to ensure state changes are picked up by Zustand
    this.trackerSets.set(characterId, { ...trackerSet });
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
      return [];
    }

    const updates: TrackerUpdate[] = [];
    const content = message.content.toLowerCase();
    const isUserMessage = message.role === 'user';

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
        // 実際に更新実行
        this.updateTracker(characterId, trackerName, newValue, `自動更新: ${reason}`);
        
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

    return updates;
  }

  /**
   * 数値トラッカーの分析
   */
  private analyzeNumericTracker(tracker: Tracker, content: string, isUserMessage: boolean): { value: number; reason: string } | null {
    const currentValue = tracker.current_value as number;
    const config = tracker.config as any;
    
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
  private analyzeAffectionTracker(currentValue: number, content: string, isUserMessage: boolean, config: any): { value: number; reason: string } | null {
    let change = 0;
    let reason = '';

    // ポジティブなキーワード
    const positiveKeywords = ['ありがとう', 'うれしい', '好き', '愛してる', '素敵', '優しい', '楽しい'];
    const negativeKeywords = ['嫌い', '最悪', 'むかつく', '怒り', 'ばか', 'うざい', '消えろ'];

    if (isUserMessage) {
      // ユーザーのメッセージによる変化
      for (const keyword of positiveKeywords) {
        if (content.includes(keyword)) {
          change += 2;
          reason = `ポジティブな発言: ${keyword}`;
          break;
        }
      }

      for (const keyword of negativeKeywords) {
        if (content.includes(keyword)) {
          change -= 3;
          reason = `ネガティブな発言: ${keyword}`;
          break;
        }
      }

      // 質問形式は微増
      if (content.includes('？') || content.includes('?')) {
        change += 1;
        reason = '質問による関心表示';
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
  private analyzeArousalTracker(currentValue: number, content: string, isUserMessage: boolean, config: any): { value: number; reason: string } | null {
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
  private analyzeTrustTracker(currentValue: number, content: string, isUserMessage: boolean, config: any): { value: number; reason: string } | null {
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
  private analyzeStressTracker(currentValue: number, content: string, isUserMessage: boolean, config: any): { value: number; reason: string } | null {
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
  private analyzeStateTracker(tracker: Tracker, content: string, isUserMessage: boolean): { value: string; reason: string } | null {
    const config = tracker.config as any;
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
  private analyzeBooleanTracker(tracker: Tracker, content: string, isUserMessage: boolean): { value: boolean; reason: string } | null {
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
    
    if (trackerName.includes('最後の話題') || trackerName.includes('topic')) {
      // 質問文から話題を抽出
      if (content.includes('？') || content.includes('?')) {
        const topic = content.slice(0, 30); // 最初の30文字を話題として記録
        return { value: topic, reason: '新しい話題の検出' };
      }
    }

    return null;
  }
}
