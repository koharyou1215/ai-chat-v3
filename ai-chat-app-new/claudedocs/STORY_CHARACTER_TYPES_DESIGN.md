# ストーリージェネレーター キャラクター型定義

## 📋 概要

既存の`Character`型（`src/types/core/character.types.ts`）を拡張し、ストーリージェネレーター用のステートフルなキャラクター管理を実現。

---

## 🎭 ストーリーキャラクター

```typescript
import { Character } from '@/types/core/character.types';
import { Timestamp } from '@/types/core/base.types';

/**
 * ストーリーキャラクター（Character型の拡張）
 * 既存Character + 動的状態管理
 */
export interface StoryCharacter extends Character {
  // === 追加フィールド ===

  // 動的状態
  current_state: CharacterState;

  // 記憶システム
  memory: MemoryEvent[];

  // 関係性グラフ
  relationships_graph: Map<string, Relationship>;

  // 所持品管理
  inventory: InventoryItem[];

  // キャラクターアーク
  arc?: CharacterArc;

  // 物語内での役割
  story_role: StoryRole;

  // 登場シーン
  appearances: SceneAppearance[];
}

/**
 * キャラクター状態（動的に変化）
 */
export interface CharacterState {
  // 位置情報
  current_location: string;        // 例: "森の入口", "王宮の謁見室"
  previous_location?: string;

  // 感情状態
  emotional_state: EmotionalState;

  // 身体状態
  physical_condition: PhysicalCondition;

  // 知識状態
  known_information: KnownInformation[];

  // 目標・動機
  current_goal?: string;
  motivations: string[];

  // タイムスタンプ
  last_updated: Timestamp;
}

/**
 * 感情状態
 */
export interface EmotionalState {
  primary_emotion: Emotion;
  secondary_emotions: Emotion[];
  intensity: number;               // 0-1（感情の強さ）
  valence: number;                 // -1（悲）〜 1（喜）
  arousal: number;                 // 0-1（覚醒度）
}

export type Emotion =
  | 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust'
  | 'trust' | 'anticipation' | 'love' | 'hope' | 'anxiety' | 'shame'
  | 'pride' | 'guilt' | 'envy' | 'gratitude' | 'curiosity' | 'confusion'
  | 'neutral';

/**
 * 身体状態
 */
export interface PhysicalCondition {
  health: number;                  // 0-100
  stamina: number;                 // 0-100
  injuries: Injury[];
  status_effects: StatusEffect[];  // 例: "呪われている", "魔法で強化"
}

export interface Injury {
  type: 'minor' | 'moderate' | 'severe' | 'critical';
  description: string;
  acquired_at: Timestamp;
  healed: boolean;
}

export interface StatusEffect {
  id: string;
  name: string;
  description: string;
  duration?: number;               // ミリ秒（nullは永続）
  effect_type: 'buff' | 'debuff' | 'neutral';
  applied_at: Timestamp;
}

/**
 * 知識情報
 */
export interface KnownInformation {
  id: string;
  category: 'fact' | 'rumor' | 'secret' | 'skill' | 'memory';
  content: string;
  source: string;                  // 情報源（キャラクターID or "書物"等）
  learned_at: Timestamp;
  confidence: number;              // 0-1（確信度）
}
```

---

## 🧠 記憶システム

```typescript
/**
 * 記憶イベント
 * キャラクターが経験した重要な出来事
 */
export interface MemoryEvent {
  id: string;
  event_type: MemoryEventType;
  description: string;
  emotional_impact: number;        // -1（トラウマ）〜 1（喜び）
  importance: number;              // 0-1
  participants: string[];          // 関わったキャラクターID
  location: string;
  occurred_at: Timestamp;          // 物語内時刻

  // 記憶の鮮明さ（時間経過で薄れる）
  vividness: number;               // 0-1
  last_recalled?: Timestamp;
}

export type MemoryEventType =
  | 'trauma'           // トラウマ
  | 'achievement'      // 達成
  | 'loss'             // 喪失
  | 'discovery'        // 発見
  | 'betrayal'         // 裏切り
  | 'bonding'          // 絆の形成
  | 'conflict'         // 対立
  | 'revelation';      // 真実の発覚
```

---

## 💞 関係性システム

```typescript
/**
 * キャラクター間の関係性
 */
export interface Relationship {
  target_character_id: string;
  relationship_type: RelationshipType;
  intensity: number;               // 0-1（関係の強さ）
  valence: number;                 // -1（敵対）〜 1（友好）

  // 関係の詳細
  description: string;
  history: RelationshipHistory[];

  // 動的変化
  trust_level: number;             // 0-1
  respect_level: number;           // 0-1
  affection_level: number;         // 0-1

  // メタデータ
  established_at: Timestamp;
  last_interaction: Timestamp;
}

export type RelationshipType =
  | 'family'           // 家族
  | 'romantic'         // 恋愛
  | 'friendship'       // 友情
  | 'rivalry'          // ライバル
  | 'mentor-student'   // 師弟
  | 'ally'             // 同盟者
  | 'enemy'            // 敵
  | 'acquaintance'     // 知人
  | 'stranger';        // 他人

/**
 * 関係性の履歴
 */
export interface RelationshipHistory {
  event: string;
  impact: number;                  // -1（悪化）〜 1（改善）
  occurred_at: Timestamp;
  scene_id?: string;
}
```

---

## 🎒 所持品管理

```typescript
/**
 * 所持品アイテム
 */
export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;

  // 特性
  properties: ItemProperty[];
  value?: number;                  // 金銭的価値
  weight?: number;                 // 重量

  // ストーリー的重要度
  plot_significance: number;       // 0-1
  can_be_lost: boolean;

  // 取得情報
  acquired_at: Timestamp;
  acquired_from?: string;          // 入手元
  acquired_scene?: string;         // 入手シーンID
}

export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'tool'
  | 'consumable'
  | 'key_item'         // ストーリー必須
  | 'treasure'
  | 'document'
  | 'magical_item'
  | 'quest_item';

export interface ItemProperty {
  type: 'magical' | 'cursed' | 'blessed' | 'unique' | 'fragile';
  description: string;
  effect?: string;
}
```

---

## 🎬 物語内での役割

```typescript
/**
 * ストーリー内の役割
 */
export type StoryRole =
  | 'protagonist'      // 主人公
  | 'deuteragonist'    // 第二主人公
  | 'antagonist'       // 敵役
  | 'supporting'       // 脇役
  | 'mentor'           // 導師
  | 'comic_relief'     // コミックリリーフ
  | 'love_interest'    // 恋愛対象
  | 'foil'             // 引き立て役
  | 'extra';           // エキストラ

/**
 * シーン登場情報
 */
export interface SceneAppearance {
  scene_id: string;
  chapter_id: string;
  role_in_scene: 'active' | 'passive' | 'mentioned';
  dialogue_count: number;
  action_count: number;
  state_before: CharacterState;
  state_after: CharacterState;
}
```

---

## 🔄 世界状態変化

```typescript
/**
 * 世界状態の変化（キャラクター関連）
 */
export interface CharacterStateChange extends WorldStateChange {
  change_type: 'character_state';
  character_id: string;
  field: keyof CharacterState;
  old_value: unknown;
  new_value: unknown;
  reason: string;
  caused_by_event?: string;        // イベントID
}

/**
 * 関係性変化
 */
export interface RelationshipChange extends WorldStateChange {
  change_type: 'relationship';
  character_id_a: string;
  character_id_b: string;
  old_relationship: Relationship;
  new_relationship: Relationship;
  trigger_event: string;
}

/**
 * 所持品変化
 */
export interface InventoryChange extends WorldStateChange {
  change_type: 'inventory';
  character_id: string;
  action: 'acquired' | 'lost' | 'used' | 'destroyed';
  item: InventoryItem;
  reason: string;
}

/**
 * 基底の世界状態変化
 */
export interface WorldStateChange {
  id: string;
  timestamp: Timestamp;
  scene_id: string;
  change_type: 'character_state' | 'relationship' | 'inventory' | 'location' | 'world_rule';
  description: string;
}
```

---

## 🧬 キャラクター生成・更新

```typescript
/**
 * キャラクター初期化パラメータ
 */
export interface StoryCharacterInit {
  base_character: Character;       // 既存Characterから
  story_role: StoryRole;
  initial_location: string;
  initial_emotional_state?: EmotionalState;
  starting_inventory?: InventoryItem[];
  character_arc?: CharacterArc;
}

/**
 * キャラクター状態更新リクエスト
 */
export interface CharacterStateUpdateRequest {
  character_id: string;
  updates: Partial<CharacterState>;
  reason: string;
  scene_id: string;
  auto_validate: boolean;          // 自動一貫性チェック
}

/**
 * 関係性更新リクエスト
 */
export interface RelationshipUpdateRequest {
  character_id_a: string;
  character_id_b: string;
  change: {
    intensity_delta?: number;      // -1 〜 1
    valence_delta?: number;        // -1 〜 1
    trust_delta?: number;
    respect_delta?: number;
    affection_delta?: number;
  };
  event_description: string;
  scene_id: string;
}
```

---

## 🔗 既存Character型との統合

```typescript
/**
 * Character型からStoryCharacter型への変換
 */
export function convertToStoryCharacter(
  character: Character,
  init: Omit<StoryCharacterInit, 'base_character'>
): StoryCharacter {
  return {
    ...character,
    current_state: {
      current_location: init.initial_location,
      emotional_state: init.initial_emotional_state || {
        primary_emotion: 'neutral',
        secondary_emotions: [],
        intensity: 0.5,
        valence: 0,
        arousal: 0.5,
      },
      physical_condition: {
        health: 100,
        stamina: 100,
        injuries: [],
        status_effects: [],
      },
      known_information: [],
      motivations: [],
      last_updated: Date.now(),
    },
    memory: [],
    relationships_graph: new Map(),
    inventory: init.starting_inventory || [],
    arc: init.character_arc,
    story_role: init.story_role,
    appearances: [],
  };
}
```

---

## 📚 使用例

```typescript
// 既存キャラクターをストーリー用に初期化
const baseCharacter: Character = {
  id: 'char_001',
  name: 'エララ',
  personality: '勇敢だが衝動的',
  // ... 他のCharacterフィールド
};

const storyCharacter: StoryCharacter = convertToStoryCharacter(baseCharacter, {
  story_role: 'protagonist',
  initial_location: '村の広場',
  initial_emotional_state: {
    primary_emotion: 'determination',
    secondary_emotions: ['anxiety'],
    intensity: 0.8,
    valence: 0.3,
    arousal: 0.7,
  },
  starting_inventory: [
    {
      id: 'item_sword',
      name: '鋼の剣',
      category: 'weapon',
      plot_significance: 0.5,
      // ...
    },
  ],
});
```

---

## 🔗 次のステップ

この型定義を使用するサービス:
- `CharacterStateManager` - キャラクター状態の更新・追跡
- `RelationshipTracker` - 関係性の動的変化管理
- `MemorySystem` - キャラクター記憶の管理
- `ConsistencyValidator` - キャラクター一貫性検証
