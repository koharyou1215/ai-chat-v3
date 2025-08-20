import { TrackerDefinition, TrackerUpdate, TrackerValue } from '@/types';

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
            initial_value: oldFormat.initial_value,
            initial_state: oldFormat.initial_state,
            possible_states: oldFormat.possible_states || [],
            min_value: oldFormat.min_value,
            max_value: oldFormat.max_value,
            step: oldFormat.step || 1
          }
        };
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
          currentValue = normalizedDefinition.config.initial_value ?? 0;
          break;
        case 'state':
          currentValue = normalizedDefinition.config.initial_state ?? '';
          break;
        case 'boolean':
          currentValue = normalizedDefinition.config.initial_value ?? false;
          break;
        case 'text':
          currentValue = normalizedDefinition.config.initial_value ?? '';
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
}
