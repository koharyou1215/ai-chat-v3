import {
  TrackerDefinition,
  SimpleTrackerDefinition,
  TrackerUpdate,
  TrackerValue,
  UnifiedMessage,
  TrackerType,
  LegacyTrackerDefinition,
} from "@/types";
import type {
  NumericTrackerConfig,
  StateTrackerConfig,
} from "@/types/core/tracker.types";
import { translateTrackerToEnglish } from "@/utils/conversation-translator";

// This is a placeholder for the full TrackerSet from the specs
// We will expand on this later.
type Tracker = TrackerDefinition & {
  current_value: string | number | boolean;
};

// Extended TrackerUpdate with additional fields used internally
interface ExtendedTrackerUpdate extends TrackerUpdate {
  tracker_name?: string;
  old_value?: unknown;
  new_value?: unknown;
  character_id?: string;
}

interface TrackerSet {
  character_id: string;
  trackers: Map<string, Tracker>;
  history: ExtendedTrackerUpdate[];
  last_updated: string;
}

export class TrackerManager {
  private trackerSets: Map<string, TrackerSet> = new Map();
  private updateCallbacks: Set<(update: TrackerUpdate) => void> = new Set();

  /**
   * トラッカーセットの初期化
   */
  initializeTrackerSet(
    characterId: string,
    trackers: SimpleTrackerDefinition[]
  ): TrackerSet {
    const trackerMap = new Map<string, Tracker>();

    trackers.forEach((definition) => {
      // SimpleTrackerDefinitionの処理
      const simpleTracker = definition as SimpleTrackerDefinition;
      
      // 初期値を取得
      let initialValue: string | number | boolean;
      switch (simpleTracker.type) {
        case 'numeric':
          initialValue = simpleTracker.initial_value ?? 0;
          break;
        case 'state':
          initialValue = simpleTracker.initial_state ?? '';
          break;
        case 'boolean':
          initialValue = simpleTracker.initial_boolean ?? false;
          break;
        default:
          initialValue = 0;
      }
      
      // TrackerDefinition互換の構造を作成
      const normalizedDefinition: TrackerDefinition = {
        ...simpleTracker,
        id: simpleTracker.name, // SimpleTrackerDefinition にはidがないためnameを使用
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(), 
        version: 1,
        config: {
          type: simpleTracker.type,
          ...(simpleTracker.type === 'numeric' && {
            initial_value: simpleTracker.initial_value ?? 0,
            min_value: simpleTracker.min_value ?? 0,
            max_value: simpleTracker.max_value ?? 100,
            step: 1,
          }),
          ...(simpleTracker.type === 'state' && {
            initial_state: simpleTracker.initial_state ?? '',
            possible_states: simpleTracker.possible_states?.map(s => ({ id: s, label: s })) ?? [],
          }),
          ...(simpleTracker.type === 'boolean' && {
            initial_value: simpleTracker.initial_boolean ?? false,
          }),
        } as any,
      };

      if (!normalizedDefinition.config) {
        console.error(
          "Tracker definition is missing config:",
          normalizedDefinition
        );
        return;
      }

      // 初期値を設定 - JSONのcurrent_valueを優先
      let currentValue: string | number | boolean;

      // JSONファイルにcurrent_valueが存在する場合はそれを使用
      if (
        "current_value" in normalizedDefinition &&
        normalizedDefinition.current_value !== undefined
      ) {
        currentValue = normalizedDefinition.current_value as string | number | boolean;
        console.log(
          `Using JSON current_value for ${normalizedDefinition.name}:`,
          currentValue
        );
      } else {
        // current_valueが無い場合のみデフォルト値を設定
        switch (normalizedDefinition.config.type) {
          case "numeric":
            // 数値型の場合、初期値をチェック
            const numConfig = normalizedDefinition.config as any;
            if (typeof numConfig.initial_value === "number") {
              currentValue = numConfig.initial_value;
            } else {
              // min_value/max_valueが設定されていない場合のデフォルト値設定
              if (numConfig.min_value === undefined) {
                numConfig.min_value = 0;
              }
              if (numConfig.max_value === undefined) {
                numConfig.max_value = 100;
              }

              // トラッカー名から適切な初期値を推測
              const trackerName = normalizedDefinition.name.toLowerCase();
              const description =
                normalizedDefinition.description?.toLowerCase() || "";

              if (
                trackerName.includes("arousal") ||
                trackerName.includes("興奮")
              ) {
                currentValue = 20; // 興奮度系は20から開始
              } else if (
                trackerName.includes("delusion") ||
                trackerName.includes("妄想")
              ) {
                currentValue = 50; // 妄想系は中間値から開始
              } else if (
                trackerName.includes("level") ||
                trackerName.includes("レベル")
              ) {
                currentValue = 1; // レベル系は1から開始
              } else if (
                description.includes("興奮") ||
                description.includes("媚薬")
              ) {
                currentValue = 15; // 薬物系は低めから開始
              } else {
                currentValue = numConfig.min_value || 0;
              }
            }
            break;
          case "state":
            // 状態型の場合、initial_stateまたは最初の可能な状態を使用
            currentValue = normalizedDefinition.config.initial_state;

            // possible_statesが空の場合、トラッカー名と説明から推測して設定
            if (
              !normalizedDefinition.config.possible_states ||
              normalizedDefinition.config.possible_states.length === 0
            ) {
              const trackerName = normalizedDefinition.name.toLowerCase();
              const description =
                normalizedDefinition.description?.toLowerCase() || "";

              if (
                trackerName.includes("relationship") ||
                trackerName.includes("関係")
              ) {
                if (description.includes("撮影")) {
                  normalizedDefinition.config.possible_states = [
                    { id: "演技指導者と女優", label: "演技指導者と女優" },
                    { id: "撮影監督と出演者", label: "撮影監督と出演者" },
                    {
                      id: "信頼できるパートナー",
                      label: "信頼できるパートナー",
                    },
                    { id: "特別な存在", label: "特別な存在" },
                  ];
                  currentValue = currentValue || "演技指導者と女優";
                } else {
                  normalizedDefinition.config.possible_states = [
                    { id: "初対面", label: "初対面" },
                    { id: "知り合い", label: "知り合い" },
                    { id: "友人", label: "友人" },
                    { id: "信頼関係", label: "信頼関係" },
                    { id: "特別な存在", label: "特別な存在" },
                  ];
                  currentValue = currentValue || "初対面";
                }
              } else if (
                trackerName.includes("mental") ||
                trackerName.includes("勘違い")
              ) {
                if (description.includes("撮影")) {
                  normalizedDefinition.config.possible_states = [
                    { id: "完全に信じている", label: "完全に信じている" },
                    { id: "少し疑問", label: "少し疑問" },
                    { id: "半信半疑", label: "半信半疑" },
                    { id: "現実を理解", label: "現実を理解" },
                  ];
                  currentValue = currentValue || "完全に信じている";
                } else {
                  normalizedDefinition.config.possible_states = [
                    { id: "通常", label: "通常" },
                    { id: "混乱", label: "混乱" },
                    { id: "理解", label: "理解" },
                    { id: "受容", label: "受容" },
                  ];
                  currentValue = currentValue || "通常";
                }
              } else {
                normalizedDefinition.config.possible_states = [
                  { id: "通常", label: "通常" },
                  { id: "変化中", label: "変化中" },
                  { id: "発展", label: "発展" },
                ];
                currentValue = currentValue || "通常";
              }
            } else if (
              normalizedDefinition.config.possible_states.length > 0 &&
              !currentValue
            ) {
              // 最初の状態を初期値とする - オブジェクトの場合はidを取得
              const firstState = normalizedDefinition.config.possible_states[0];
              currentValue =
                typeof firstState === "string" ? firstState : firstState.id;
            }

            if (!currentValue) {
              // トラッカー名から適切な初期状態を推測
              const trackerName = normalizedDefinition.name.toLowerCase();
              if (
                trackerName.includes("relationship") ||
                trackerName.includes("関係")
              ) {
                currentValue = "初対面";
              } else if (
                trackerName.includes("mental") ||
                trackerName.includes("勘違い")
              ) {
                currentValue = "完全に信じている";
              } else {
                currentValue = "通常";
              }
            }
            break;
          case "boolean":
            // ブール型の場合、initial_valueまたはfalseをデフォルトとして設定
            currentValue =
              typeof normalizedDefinition.config.initial_value === "boolean"
                ? normalizedDefinition.config.initial_value
                : false;
            break;
          case "text":
            // テキスト型の場合、initial_valueまたは空文字をデフォルトとして設定
            currentValue =
              typeof normalizedDefinition.config.initial_value === "string"
                ? normalizedDefinition.config.initial_value
                : "未設定";
            break;
          default:
            currentValue = 0;
        }
      }

      const initializedTracker: Tracker = {
        ...normalizedDefinition,
        current_value: currentValue,
      };

      console.log(`Initialized tracker ${normalizedDefinition.name}:`, {
        type: normalizedDefinition.config.type,
        initial_value: (normalizedDefinition.config as any).initial_value,
        initial_state: (normalizedDefinition.config as any).initial_state,
        current_value: currentValue,
      });
      trackerMap.set(normalizedDefinition.name, initializedTracker);
    });

    const trackerSet: TrackerSet = {
      character_id: characterId,
      trackers: trackerMap,
      history: [],
      last_updated: new Date().toISOString(),
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
      return "";
    }

    let promptText = "<trackers>\n";
    for (const tracker of trackerSet.trackers.values()) {
      // current_value が undefined や null の場合は初期値を表示
      const value =
        tracker.current_value ??
        (tracker as unknown as Record<string, unknown>).initial_value ??
        (tracker as unknown as Record<string, unknown>).initial_state ??
        (tracker as unknown as Record<string, unknown>).initial_boolean ??
        "N/A";
      promptText += `${tracker.display_name}: ${value}\n`;
    }
    promptText += "</trackers>";

    // トラッカー情報を英文化
    return translateTrackerToEnglish(promptText);
  }

  /**
   * 詳細なトラッカー情報をプロンプト用に取得（キャラクター設定強化版）
   */
  getDetailedTrackersForPrompt(characterId: string): string {
    const trackerSet = this.trackerSets.get(characterId);
    if (!trackerSet || trackerSet.trackers.size === 0) {
      return "";
    }

    let promptText = "<character_trackers>\n";

    for (const tracker of trackerSet.trackers.values()) {
      const value = tracker.current_value ?? "N/A";

      // トラッカー情報を詳細に記述
      promptText += `## ${tracker.display_name}\n`;
      promptText += `Current Value: ${value}`;

      // 数値型の場合は範囲情報も含める
      if (
        tracker.config.type === "numeric" &&
        tracker.config.min_value !== undefined &&
        tracker.config.max_value !== undefined
      ) {
        promptText += ` (Range: ${tracker.config.min_value}-${tracker.config.max_value})`;
      }

      // 状態型の場合は可能な状態を含める
      if (
        tracker.config.type === "state" &&
        tracker.config.possible_states &&
        tracker.config.possible_states.length > 0
      ) {
        promptText += ` (Possible: ${tracker.config.possible_states.join(
          ", "
        )})`;
      }

      promptText += "\n";

      // 説明があれば含める
      if (tracker.description) {
        promptText += `Description: ${tracker.description}\n`;
      }

      // 最近の変更履歴があれば含める（最新3件）
      const recentUpdates = trackerSet.history
        .filter((update) => update.tracker_name === tracker.name)
        .slice(-3);

      if (recentUpdates.length > 0) {
        promptText += `Recent Changes:\n`;
        recentUpdates.forEach((update) => {
          promptText += `- ${update.old_value} → ${update.new_value} (${
            update.reason || "No reason"
          })\n`;
        });
      }

      promptText += "\n";
    }

    promptText += "</character_trackers>";

    // 詳細トラッカー情報を英文化
    return translateTrackerToEnglish(promptText);
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
  ): void {
    const trackerSet = this.trackerSets.get(characterId);
    if (!trackerSet) {
      console.error(`Tracker set for character ${characterId} not found.`);
      return;
    }

    const tracker = trackerSet.trackers.get(trackerName);
    if (!tracker) {
      console.error(
        `Tracker ${trackerName} not found for character ${characterId}.`
      );
      return;
    }

    const oldValue = tracker.current_value;

    // Value validation based on tracker type and config
    if (tracker.config) {
      if (tracker.type === 'numeric' && typeof newValue === 'object' && newValue !== null) {
        const numericValue = (newValue as any).numeric;
        if (typeof numericValue === 'number') {
          const config = tracker.config as any;
          if (config.min !== undefined && numericValue < config.min) {
            console.warn(`Tracker ${trackerName}: value ${numericValue} is below minimum ${config.min}`);
          }
          if (config.max !== undefined && numericValue > config.max) {
            console.warn(`Tracker ${trackerName}: value ${numericValue} is above maximum ${config.max}`);
          }
        }
      } else if (tracker.type === 'state' && typeof newValue === 'object' && newValue !== null) {
        const stateValue = (newValue as any).state;
        const config = tracker.config as any;
        if (config.states && Array.isArray(config.states) && !config.states.includes(stateValue)) {
          console.warn(`Tracker ${trackerName}: invalid state "${stateValue}", valid states: ${config.states.join(', ')}`);
        }
      }
    }
    
    // Extract actual value from TrackerValue based on type
    let actualValue: string | number | boolean;
    if (typeof newValue === 'object' && newValue !== null) {
      const tv = newValue as any;
      if ('numeric' in tv) actualValue = tv.numeric;
      else if ('state' in tv) actualValue = tv.state;
      else if ('boolean' in tv) actualValue = tv.boolean;
      else if ('text' in tv) actualValue = tv.text;
      else if ('value' in tv) actualValue = tv.value;
      else actualValue = newValue as any;
    } else {
      actualValue = newValue as any;
    }

    tracker.current_value = actualValue;
    trackerSet.last_updated = new Date().toISOString();

    const update: ExtendedTrackerUpdate = {
      tracker_id: tracker.id,
      value: newValue,
      tracker_name: trackerName,
      old_value: oldValue,
      new_value: newValue,
      timestamp: trackerSet.last_updated,
      changed_by: 'user',
      reason: reason || "UI interaction",
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
    this.updateCallbacks.forEach((callback) => callback(update));
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
        trackers: Array.from(value.trackers.entries()),
      };
    }
    return obj;
  }

  /**
   * プレーンオブジェクトから状態を復元
   */
  loadFromObject(data: {
    trackerSets: Record<string, Record<string, unknown>>;
  }): void {
    const restoredTrackerSets = new Map<string, TrackerSet>();
    for (const key in data.trackerSets) {
      const value = data.trackerSets[key];
      restoredTrackerSets.set(key, {
        ...(value as Omit<TrackerSet, "trackers">),
        trackers: new Map(value.trackers as [string, Tracker][]),
      });
    }
    this.trackerSets = restoredTrackerSets;
  }

  /**
   * メッセージからトラッカー更新を自動分析
   */
  analyzeMessageForTrackerUpdates(
    message: UnifiedMessage,
    characterId: string
  ): TrackerUpdate[] {
    const trackerSet = this.trackerSets.get(characterId);
    if (!trackerSet) {
      console.log(
        "[TrackerManager] No tracker set found for character:",
        characterId
      );
      return [];
    }

    console.log(`🎯 [TrackerManager] Analyzing message for tracker updates:`, {
      characterId: characterId.substring(0, 8) + "...",
      trackerCount: trackerSet.trackers.size,
      messageContent: message.content.substring(0, 50) + "...",
      messageRole: message.role,
    });

    const updates: TrackerUpdate[] = [];
    const content = message.content.toLowerCase();
    const isUserMessage = message.role === "user";

    // より積極的な更新のためのフラグ
    let hasAnyUpdate = false;

    for (const [trackerName, tracker] of trackerSet.trackers) {
      const oldValue = tracker.current_value;
      let newValue = oldValue;
      let shouldUpdate = false;
      let reason = "";

      // トラッカーの種類に応じた分析
      switch (tracker.config.type) {
        case "numeric":
          const numericResult = this.analyzeNumericTracker(
            tracker,
            content,
            isUserMessage
          );
          if (numericResult) {
            newValue = numericResult.value;
            shouldUpdate = true;
            reason = numericResult.reason;
          }
          break;

        case "state":
          const stateResult = this.analyzeStateTracker(
            tracker,
            content,
            isUserMessage
          );
          if (stateResult) {
            newValue = stateResult.value;
            shouldUpdate = true;
            reason = stateResult.reason;
          }
          break;

        case "boolean":
          const booleanResult = this.analyzeBooleanTracker(
            tracker,
            content,
            isUserMessage
          );
          if (booleanResult) {
            newValue = booleanResult.value;
            shouldUpdate = true;
            reason = booleanResult.reason;
          }
          break;

        case "text":
          const textResult = this.analyzeTextTracker(
            tracker,
            content,
            isUserMessage
          );
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
          reason,
        });

        // 実際に更新実行
        // Convert simple value to TrackerValue format
        const trackerValue = { value: newValue } as any;
        this.updateTracker(
          characterId,
          trackerName,
          trackerValue,
          `自動更新: ${reason}`
        );
        hasAnyUpdate = true;

        updates.push({
          tracker_id: tracker.id,
          value: newValue,
          timestamp: new Date().toISOString(),
          changed_by: 'system',
          reason: `自動更新: ${reason}`,
        });
      }
    }

    if (hasAnyUpdate) {
      console.log(
        `✅ [TrackerManager] Analysis complete - ${updates.length} tracker(s) updated:`,
        {
          characterId: characterId.substring(0, 8) + "...",
          updates: updates.map(
            (u: ExtendedTrackerUpdate) => `${u.tracker_name}: ${u.old_value}→${u.new_value}`
          ),
        }
      );
    } else {
      console.log(
        `📊 [TrackerManager] Analysis complete - No tracker updates needed`,
        {
          characterId: characterId.substring(0, 8) + "...",
          analyzedTrackers: trackerSet.trackers.size,
          messageContent: message.content.substring(0, 30) + "...",
        }
      );
    }

    return updates;
  }

  /**
   * 数値トラッカーの分析
   */
  private analyzeNumericTracker(
    tracker: Tracker,
    content: string,
    isUserMessage: boolean
  ): { value: number; reason: string } | null {
    const currentValue = tracker.current_value as number;
    const config = tracker.config as NumericTrackerConfig;

    // トラッカー名に基づく分析パターン
    const trackerName = tracker.name.toLowerCase();

    if (trackerName.includes("好感度") || trackerName.includes("affection")) {
      return this.analyzeAffectionTracker(
        currentValue,
        content,
        isUserMessage,
        config
      );
    }

    if (trackerName.includes("興奮") || trackerName.includes("arousal")) {
      return this.analyzeArousalTracker(
        currentValue,
        content,
        isUserMessage,
        config
      );
    }

    if (trackerName.includes("信頼") || trackerName.includes("trust")) {
      return this.analyzeTrustTracker(
        currentValue,
        content,
        isUserMessage,
        config
      );
    }

    if (trackerName.includes("ストレス") || trackerName.includes("stress")) {
      return this.analyzeStressTracker(
        currentValue,
        content,
        isUserMessage,
        config
      );
    }

    return null;
  }

  /**
   * 好感度トラッカーの分析
   */
  private analyzeAffectionTracker(
    currentValue: number,
    content: string,
    isUserMessage: boolean,
    config: NumericTrackerConfig
  ): { value: number; reason: string } | null {
    let change = 0;
    let reason = "";

    // ポジティブなキーワード
    const positiveKeywords = [
      "ありがとう",
      "うれしい",
      "好き",
      "愛してる",
      "素敵",
      "優しい",
      "楽しい",
    ];
    const negativeKeywords = [
      "嫌い",
      "最悪",
      "むかつく",
      "怒り",
      "ばか",
      "うざい",
      "消えろ",
    ];

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
      if (content.includes("？") || content.includes("?")) {
        change += 2;
        reason = "質問による関心表示";
      }

      // 日常的な会話でも小さな変化を追加
      if (content.length > 10 && change === 0) {
        change += 1;
        reason = "一般的な会話参加";
      }
    } else {
      // AIの応答による微調整（通常は変化なし）
      if (content.includes("困った") || content.includes("悲しい")) {
        change -= 1;
        reason = "AIの困惑・悲しみ";
      }
    }

    if (change !== 0) {
      const newValue = Math.max(
        config.min_value || 0,
        Math.min(config.max_value || 100, currentValue + change)
      );
      return { value: newValue, reason };
    }

    return null;
  }

  /**
   * 興奮度トラッカーの分析
   */
  private analyzeArousalTracker(
    currentValue: number,
    content: string,
    isUserMessage: boolean,
    config: NumericTrackerConfig
  ): { value: number; reason: string } | null {
    let change = 0;
    let reason = "";

    const excitingKeywords = [
      "すごい",
      "興奮",
      "わくわく",
      "楽しみ",
      "驚き",
      "最高",
    ];
    const calmingKeywords = [
      "落ち着く",
      "平静",
      "静か",
      "穏やか",
      "リラックス",
    ];

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
      const newValue = Math.max(
        config.min_value || 0,
        Math.min(config.max_value || 100, currentValue + change)
      );
      return { value: newValue, reason };
    }

    return null;
  }

  /**
   * 信頼度トラッカーの分析
   */
  private analyzeTrustTracker(
    currentValue: number,
    content: string,
    isUserMessage: boolean,
    config: NumericTrackerConfig
  ): { value: number; reason: string } | null {
    let change = 0;
    let reason = "";

    const trustKeywords = [
      "信じる",
      "頼りにする",
      "安心",
      "約束",
      "正直",
      "誠実",
    ];
    const distrustKeywords = ["嘘", "騙す", "疑う", "信用できない", "裏切り"];

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
      const newValue = Math.max(
        config.min_value || 0,
        Math.min(config.max_value || 100, currentValue + change)
      );
      return { value: newValue, reason };
    }

    return null;
  }

  /**
   * ストレストラッカーの分析
   */
  private analyzeStressTracker(
    currentValue: number,
    content: string,
    isUserMessage: boolean,
    config: NumericTrackerConfig
  ): { value: number; reason: string } | null {
    let change = 0;
    let reason = "";

    const stressKeywords = [
      "忙しい",
      "疲れた",
      "大変",
      "ストレス",
      "辛い",
      "困った",
    ];
    const relaxKeywords = ["楽", "休憩", "癒し", "のんびり", "平和"];

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
      const newValue = Math.max(
        config.min_value || 0,
        Math.min(config.max_value || 100, currentValue + change)
      );
      return { value: newValue, reason };
    }

    return null;
  }

  /**
   * 状態トラッカーの分析
   */
  private analyzeStateTracker(
    tracker: Tracker,
    content: string,
    _isUserMessage: boolean
  ): { value: string; reason: string } | null {
    const config = tracker.config as StateTrackerConfig;
    const possibleStates = config.possible_states || [];

    // キーワードマッピング
    const stateKeywords: Record<string, string[]> = {
      幸せ: ["嬉しい", "幸せ", "喜び", "楽しい"],
      普通: ["普通", "平常", "通常"],
      悲しい: ["悲しい", "辛い", "落ち込む"],
      怒り: ["怒り", "腹立つ", "むかつく"],
      驚き: ["驚き", "びっくり", "驚いた"],
      恐れ: ["怖い", "不安", "心配"],
      興奮: ["興奮", "わくわく", "盛り上がり"],
    };

    for (const stateObj of possibleStates) {
      // StateDefinitionオブジェクトの場合はidを使用
      const state = typeof stateObj === 'string' ? stateObj : (stateObj as any).id || (stateObj as any).label;
      if (typeof state !== "string") {
        console.warn(
          `Tracker "${tracker.name}" has a non-string state:`,
          stateObj
        );
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
  private analyzeBooleanTracker(
    tracker: Tracker,
    content: string,
    _isUserMessage: boolean
  ): { value: boolean; reason: string } | null {
    const trackerName = tracker.name.toLowerCase();

    if (trackerName.includes("デート") || trackerName.includes("date")) {
      if (
        content.includes("デート") ||
        content.includes("出かけ") ||
        content.includes("一緒に")
      ) {
        return { value: true, reason: "デート関連の発言" };
      }
    }

    if (trackerName.includes("秘密") || trackerName.includes("secret")) {
      if (
        content.includes("秘密") ||
        content.includes("内緒") ||
        content.includes("誰にも言わない")
      ) {
        return { value: true, reason: "秘密に関する発言" };
      }
    }

    return null;
  }

  /**
   * テキストトラッカーの分析
   */
  private analyzeTextTracker(
    tracker: Tracker,
    content: string,
    _isUserMessage: boolean
  ): { value: string; reason: string } | null {
    const trackerName = tracker.name.toLowerCase();

    if (trackerName.includes("最後の話題") || trackerName.includes("topic")) {
      // 質問文から話題を抽出
      if (content.includes("？") || content.includes("?")) {
        const topic = content.slice(0, 30); // 最初の30文字を話題として記録
        return { value: topic, reason: "新しい話題の検出" };
      }
    }

    return null;
  }
}
