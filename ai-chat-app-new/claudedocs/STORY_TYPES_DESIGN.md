# ストーリージェネレーター 型定義設計書

## 📋 設計方針

### 型安全性ルール
- ✅ `any`型使用絶対禁止
- ✅ `unknown`型は適切な型ガード使用
- ✅ すべてのAPIレスポンスに型定義
- ✅ strict モード準拠

### 命名規則
- インターフェース: PascalCase（例: `StoryCharacter`）
- 型エイリアス: PascalCase（例: `GenreType`）
- Enum: PascalCase（例: `NarrativeType`）

---

## 🎯 核心型定義（Core Types）

### 1. ストーリープロジェクト

```typescript
import { BaseEntity, Timestamp } from '@/types/core/base.types';

/**
 * ストーリープロジェクト
 * 一つの物語全体を表現
 */
export interface StoryProject extends BaseEntity {
  title: string;
  genre: GenreType;
  subgenre?: SubGenreType;
  quest: QuestDefinition;
  structure: StoryStructure;
  world_setting: WorldSetting;
  outline: StoryOutline;
  chapters: Chapter[];
  metadata: ProjectMetadata;

  // 統計
  statistics: ProjectStatistics;

  // 設定
  settings: GenerationSettings;
}

/**
 * プロジェクトメタデータ
 */
export interface ProjectMetadata {
  author: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_edited_chapter: string | null;
  word_count: number;
  estimated_reading_time: number; // 分
  status: 'draft' | 'in_progress' | 'completed' | 'published';
  tags: string[];
}

/**
 * プロジェクト統計
 */
export interface ProjectStatistics {
  total_chapters: number;
  total_scenes: number;
  total_words: number;
  characters_count: number;
  average_consistency_score: number;
  generation_time_total: number; // ミリ秒
  last_validation_score: number;
}
```

---

### 2. ジャンル・クエスト定義

```typescript
/**
 * ジャンルタイプ（参照プラットフォーム準拠）
 */
export type GenreType =
  // ファンタジー系
  | 'fantasy'
  | 'fantasy-romance'
  | 'science-fantasy'
  | 'high-fantasy'
  | 'epic-fantasy'
  | 'urban-fantasy'
  | 'dark-fantasy'
  | 'gaslight-fantasy'
  | 'mythology'
  | 'magical-realism'

  // SF系
  | 'sci-fi'
  | 'cyberpunk'
  | 'dystopia'
  | 'utopia'
  | 'dieselpunk'
  | 'solarpunk'

  // アニメ・マンガ系
  | 'anime'
  | 'light-novel'
  | 'shonen'
  | 'shojo'
  | 'seinen'
  | 'josei'
  | 'isekai'

  // 歴史・時代系
  | 'historical'
  | 'western'
  | 'military'

  // その他
  | 'adventure'
  | 'romance'
  | 'comedy'
  | 'horror'
  | 'mystery'
  | 'drama';

/**
 * サブジャンル（ジャンルごとの詳細分類）
 */
export type SubGenreType = string; // ジャンルに応じた動的値

/**
 * クエスト定義
 */
export interface QuestDefinition {
  id: string;
  category: QuestCategory;
  title: string;
  description: string;
  goal: string;                    // 例: "古代の剣を見つける"
  emotional_driver: string;        // 感情的動機
  expected_outcome: string;        // 期待される結末
  impact: QuestImpact;
}

/**
 * クエストカテゴリー
 */
export type QuestCategory =
  | 'adventure'      // 冒険（宝探し、脱出等）
  | 'romance'        // ロマンス（一目惚れ、禁断の恋等）
  | 'drama'          // ドラマ（道徳的ジレンマ、犠牲等）
  | 'fantasy'        // ファンタジー（呪い解除、魔法生物等）
  | 'mystery';       // ミステリー（謎解き、陰謀等）

/**
 * クエストの影響
 */
export interface QuestImpact {
  plot_arc: 'linear' | 'branching' | 'circular';
  emotional_tone: 'uplifting' | 'dark' | 'bittersweet' | 'suspenseful';
  character_focus: 'individual' | 'ensemble' | 'dual-protagonist';
  pacing: 'fast' | 'moderate' | 'slow-burn';
}
```

---

### 3. 物語構造

```typescript
/**
 * 物語構造タイプ
 */
export type StoryStructureType =
  | 'three_act'        // 三幕構成
  | 'heros_journey'    // 英雄の旅
  | 'kishotenketsu'    // 起承転結
  | 'custom';          // カスタム

/**
 * 物語構造
 */
export interface StoryStructure {
  type: StoryStructureType;
  acts: Act[];
  estimated_length: {
    chapters: number;
    scenes_per_chapter: number;
    words_per_scene: number;
  };
}

/**
 * 幕（Act）
 */
export interface Act {
  act_number: number;
  name: string;                    // 例: "設定と事件"
  goal: string;
  percentage: number;              // 全体における比率（0-100）
  plot_points: PlotPoint[];
  estimated_chapters: number;
}

/**
 * プロットポイント
 */
export interface PlotPoint {
  id: string;
  name: string;                    // 例: "村の呪い発生"
  description: string;
  act_number: number;
  order: number;                   // 幕内の順序

  // 依存関係
  prerequisites: string[];         // 前提となるプロットポイントID

  // 世界への影響
  effects: WorldStateChange[];

  // キャラクター要件
  required_character_states: Record<string, CharacterStateRequirement>;

  // 達成状況
  achieved: boolean;
  achieved_in_chapter?: string;    // チャプターID
}

/**
 * キャラクター状態要件
 */
export interface CharacterStateRequirement {
  character_id: string;
  required_location?: string;
  required_emotional_state?: string;
  required_items?: string[];
  required_knowledge?: string[];
}
```

---

### 4. アウトライン

```typescript
/**
 * ストーリーアウトライン
 */
export interface StoryOutline {
  id: string;
  project_id: string;
  structure: StoryStructure;
  character_arcs: CharacterArc[];
  world_state_checkpoints: WorldStateCheckpoint[];
  generated_at: Timestamp;
  generation_method: 'ai_generated' | 'manual' | 'hybrid';
}

/**
 * キャラクターアーク
 */
export interface CharacterArc {
  character_id: string;
  arc_type: 'positive' | 'negative' | 'flat' | 'transformational';
  starting_state: CharacterState;
  key_changes: ArcKeyChange[];
  ending_state: CharacterState;
}

/**
 * アークの重要な変化
 */
export interface ArcKeyChange {
  plot_point_id: string;
  change_type: 'belief' | 'goal' | 'relationship' | 'ability';
  description: string;
  emotional_impact: number;        // -1（悲）〜 1（喜）
}

/**
 * 世界状態チェックポイント
 */
export interface WorldStateCheckpoint {
  id: string;
  plot_point_id: string;
  timestamp: number;               // 物語内の時系列
  snapshot: WorldStateSnapshot;
}

/**
 * 世界状態スナップショット
 */
export interface WorldStateSnapshot {
  characters: Record<string, CharacterState>;
  locations: Record<string, LocationState>;
  items: Record<string, ItemState>;
  active_rules: string[];          // 有効な世界ルールID
}
```

---

### 5. 世界設定

```typescript
/**
 * 世界設定
 */
export interface WorldSetting {
  id: string;
  name: string;
  description: string;

  // 物理設定
  setting: {
    time_period: string;           // 例: "中世ヨーロッパ風"
    primary_location: string;
    geography: string;
  };

  // ルール・法則
  world_rules: WorldRule[];

  // 社会設定
  social_structure?: SocialStructure;

  // 魔法/技術システム
  magic_system?: MagicSystem;
  technology_level?: TechnologyLevel;
}

/**
 * 世界ルール
 */
export interface WorldRule {
  id: string;
  category: 'physics' | 'magic' | 'social' | 'divine';
  title: string;
  description: string;
  constraints: string[];           // 例: ["魔法は消耗する", "死者は蘇らない"]
  priority: number;                // 違反検証の優先度（1-10）
}

/**
 * 魔法システム
 */
export interface MagicSystem {
  exists: boolean;
  type: 'hard' | 'soft';           // ハード（明確なルール）/ ソフト（神秘的）
  source: string;                  // 例: "マナ", "精霊の力"
  limitations: string[];
  cost: string;                    // 例: "体力消耗", "寿命削減"
}

/**
 * 技術レベル
 */
export type TechnologyLevel =
  | 'stone_age'
  | 'medieval'
  | 'renaissance'
  | 'industrial'
  | 'modern'
  | 'near_future'
  | 'far_future';

/**
 * 社会構造
 */
export interface SocialStructure {
  government_type: string;         // 例: "封建制", "民主主義"
  class_system: ClassTier[];
  major_factions: Faction[];
}

export interface ClassTier {
  name: string;
  description: string;
  privileges: string[];
  restrictions: string[];
}

export interface Faction {
  id: string;
  name: string;
  ideology: string;
  leader?: string;                 // キャラクターID
  influence: number;               // 0-100
}
```

---

### 6. 章・シーン

```typescript
/**
 * 章
 */
export interface Chapter {
  id: string;
  project_id: string;
  chapter_number: number;
  title: string;

  // 構造
  act_number: number;
  scenes: Scene[];

  // 物語要素
  narrative_type: NarrativeType;
  target_plot_points: string[];    // この章で達成すべきプロットポイントID

  // 設定
  creativity_level: CreativityLevel;
  ending_type: ChapterEndingType;

  // 統計
  word_count: number;
  generated_at: Timestamp;
  validation_status: ValidationStatus;
  consistency_score: number;       // 0-1
}

/**
 * 視点タイプ（参照プラットフォーム準拠）
 */
export type NarrativeType =
  | 'prologue'       // プロローグ（雰囲気、世界観）
  | 'main'           // 通常章
  | 'interlude'      // 幕間（内省、サイドストーリー）
  | 'flashback'      // フラッシュバック
  | 'flashforward'   // フラッシュフォワード
  | 'climax'         // クライマックス
  | 'denouement'     // デヌーマン（結末の解きほぐし）
  | 'epilogue';      // エピローグ

/**
 * 創造性レベル（参照プラットフォーム準拠）
 */
export type CreativityLevel =
  | 'conservative'   // 保守的（指示に厳密）
  | 'balanced'       // バランス
  | 'inventive';     // 創造的（意外な展開）

/**
 * 章の終わり方
 */
export type ChapterEndingType =
  | 'open_end'       // オープンエンド
  | 'cliffhanger'    // クリフハンガー
  | 'resolved'       // 解決
  | 'custom';        // カスタム

/**
 * シーン
 */
export interface Scene {
  id: string;
  chapter_id: string;
  scene_number: number;

  // コンテンツ
  content: string;                 // 生成されたテキスト
  directive?: string;              // 生成指示（ユーザー入力）

  // コンテキスト
  characters_present: string[];    // 登場キャラクターID
  location: string;
  time_of_day?: string;

  // 感情・トーン
  emotional_tone: number;          // -1（悲）〜 1（喜）
  pacing: 'fast' | 'moderate' | 'slow';

  // 世界状態
  world_state_before: WorldStateSnapshot;
  world_state_after: WorldStateSnapshot;
  state_changes: WorldStateChange[];

  // 検証
  generated_at: Timestamp;
  validation_status: ValidationStatus;
  validation_errors: ValidationError[];
  consistency_score: number;       // 0-1

  // 生成メタデータ
  generation_metadata: GenerationMetadata;
}

/**
 * 検証ステータス
 */
export type ValidationStatus = 'pending' | 'validated' | 'has_errors' | 'failed';
```

---

## 📖 次のファイルへ続く

この型定義を基に以下を作成：
- `STORY_CHARACTER_TYPES_DESIGN.md` - キャラクター関連型
- `STORY_GENERATION_TYPES_DESIGN.md` - 生成・検証関連型
- `STORY_UI_TYPES_DESIGN.md` - UIコンポーネント型
