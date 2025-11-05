# ストーリージェネレーター 生成・検証型定義

## 📋 概要

AI生成、検証、評価に関する型定義。Generate-Evaluate-Refineループの実装基盤。

---

## 🎲 生成リクエスト

```typescript
import { Timestamp } from '@/types/core/base.types';

/**
 * シーン生成リクエスト
 */
export interface SceneGenerationRequest {
  // コンテキスト
  project_id: string;
  chapter_id: string;
  scene_number: number;

  // 生成指示
  directive?: string;              // ユーザー指示（例: "エララが秘密を明かす"）
  target_plot_points: string[];    // 達成すべきプロットポイントID

  // 現在の世界状態
  world_state: WorldStateSnapshot;
  present_characters: string[];    // 登場キャラクターID

  // 生成設定
  settings: GenerationSettings;

  // 前シーンからの継続性
  previous_scene?: Scene;
}

/**
 * 章生成リクエスト
 */
export interface ChapterGenerationRequest {
  project_id: string;
  chapter_number: number;
  act_number: number;

  // アウトライン情報
  outline: StoryOutline;
  target_plot_points: string[];

  // 章設定
  narrative_type: NarrativeType;
  creativity_level: CreativityLevel;
  ending_type: ChapterEndingType;

  // 世界状態
  world_state: WorldStateSnapshot;

  // 生成設定
  settings: GenerationSettings;
}

/**
 * アウトライン生成リクエスト
 */
export interface OutlineGenerationRequest {
  project_id: string;

  // 基本設定
  world_setting: WorldSetting;
  quest: QuestDefinition;
  structure: StoryStructure;
  characters: StoryCharacter[];

  // 生成設定
  settings: GenerationSettings;
}
```

---

## ⚙️ 生成設定

```typescript
/**
 * 生成設定
 */
export interface GenerationSettings {
  // モデル設定
  model_config: ModelConfig;

  // 生成パラメータ
  creativity_level: CreativityLevel;
  temperature: number;             // 0-2（創造性）
  max_tokens: number;
  top_p: number;

  // スタイル設定
  writing_style: WritingStyle;
  tone: ToneSettings;
  pacing: 'fast' | 'moderate' | 'slow';

  // 制約
  constraints: GenerationConstraints;

  // 検証設定
  validation: ValidationSettings;
}

/**
 * モデル設定
 */
export interface ModelConfig {
  provider: 'gemini' | 'openrouter' | 'openai';
  model_id: string;
  fallback_models?: string[];      // フォールバックモデル
}

/**
 * 執筆スタイル
 */
export interface WritingStyle {
  perspective: '1st_person' | '3rd_person_limited' | '3rd_person_omniscient';
  tense: 'past' | 'present' | 'future';
  voice: 'active' | 'passive' | 'mixed';
  description_density: 'sparse' | 'moderate' | 'rich';
  dialogue_frequency: 'minimal' | 'balanced' | 'heavy';
}

/**
 * トーン設定
 */
export interface ToneSettings {
  primary_tone: Tone;
  secondary_tones: Tone[];
  emotional_range: {
    min: number;                   // -1（暗）〜 1（明）
    max: number;
  };
}

export type Tone =
  | 'dramatic' | 'comedic' | 'romantic' | 'suspenseful' | 'mysterious'
  | 'adventurous' | 'melancholic' | 'hopeful' | 'dark' | 'whimsical'
  | 'epic' | 'intimate' | 'satirical' | 'nostalgic';

/**
 * 生成制約
 */
export interface GenerationConstraints {
  // 長さ制約
  min_words?: number;
  max_words?: number;
  target_words?: number;

  // 内容制約
  must_include: string[];          // 必須要素
  must_avoid: string[];            // 禁止要素
  world_rules_strict: boolean;     // 世界ルール厳守

  // キャラクター制約
  character_consistency: 'strict' | 'moderate' | 'flexible';
  allow_character_death: boolean;
  allow_major_character_changes: boolean;
}

/**
 * 検証設定
 */
export interface ValidationSettings {
  enabled: boolean;
  auto_retry: boolean;
  max_retries: number;
  consistency_threshold: number;   // 0-1（最低一貫性スコア）
  validate_world_rules: boolean;
  validate_character_states: boolean;
  validate_plot_logic: boolean;
}
```

---

## ✅ 検証・評価

```typescript
/**
 * 検証結果
 */
export interface ValidationResult {
  is_valid: boolean;
  overall_score: number;           // 0-1
  timestamp: Timestamp;

  // ドメイン別スコア
  scores: {
    character_consistency: number;
    plot_consistency: number;
    world_rule_compliance: number;
    emotional_coherence: number;
    narrative_flow: number;
  };

  // エラー詳細
  errors: ValidationError[];
  warnings: ValidationWarning[];

  // 推奨アクション
  recommendations: ValidationRecommendation[];
}

/**
 * 検証エラー
 */
export interface ValidationError {
  id: string;
  severity: 'critical' | 'major' | 'minor';
  category: ValidationErrorCategory;
  message: string;
  location?: TextLocation;         // エラー箇所
  affected_element: string;        // 影響を受ける要素（キャラクターID等）

  // 修正提案
  suggested_fix?: string;
  auto_fixable: boolean;
}

export type ValidationErrorCategory =
  | 'character_contradiction'      // キャラクター矛盾
  | 'plot_hole'                    // プロット矛盾
  | 'world_rule_violation'         // 世界ルール違反
  | 'timeline_inconsistency'       // 時系列矛盾
  | 'location_error'               // 位置情報エラー
  | 'relationship_mismatch'        // 関係性の不一致
  | 'tone_shift';                  // トーン急変

/**
 * テキスト位置
 */
export interface TextLocation {
  start_char: number;
  end_char: number;
  line_number?: number;
  context: string;                 // 前後のテキスト
}

/**
 * 検証警告
 */
export interface ValidationWarning {
  id: string;
  category: string;
  message: string;
  suggestion: string;
}

/**
 * 検証推奨アクション
 */
export interface ValidationRecommendation {
  type: 'regenerate' | 'edit' | 'review' | 'branch';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  action_details: string;
}
```

---

## 🔄 Generate-Evaluate-Refine ループ

```typescript
/**
 * 生成ループ状態
 */
export interface GenerationLoopState {
  request: SceneGenerationRequest;
  current_attempt: number;
  max_attempts: number;
  attempts: GenerationAttempt[];
  final_result?: Scene;
  loop_status: 'running' | 'success' | 'failed' | 'aborted';
}

/**
 * 生成試行
 */
export interface GenerationAttempt {
  attempt_number: number;
  generated_content: string;
  validation_result: ValidationResult;
  timestamp: Timestamp;
  model_used: string;
  tokens_used: number;
  generation_time: number;         // ミリ秒

  // フィードバック
  user_feedback?: UserFeedback;
  refinement_applied?: RefinementAction;
}

/**
 * ユーザーフィードバック
 */
export interface UserFeedback {
  rating: 1 | 2 | 3 | 4 | 5;
  comments: string;
  requested_changes: string[];
  approved: boolean;
}

/**
 * 改善アクション
 */
export interface RefinementAction {
  type: 'prompt_adjustment' | 'parameter_change' | 'constraint_addition';
  changes: Record<string, unknown>;
  reason: string;
}
```

---

## 📊 生成メタデータ

```typescript
/**
 * 生成メタデータ
 */
export interface GenerationMetadata {
  // モデル情報
  model_provider: string;
  model_id: string;
  model_version: string;

  // パラメータ
  temperature: number;
  top_p: number;
  max_tokens: number;

  // 使用状況
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_estimate?: number;          // USD

  // パフォーマンス
  generation_time: number;         // ミリ秒
  retries: number;

  // プロンプト情報
  prompt_version: string;
  prompt_sections: PromptSection[];

  // タイムスタンプ
  generated_at: Timestamp;
}

/**
 * プロンプトセクション
 */
export interface PromptSection {
  section_name: string;
  token_count: number;
  content_summary: string;
}
```

---

## 🎯 一貫性チェック

```typescript
/**
 * キャラクター一貫性チェック
 */
export interface CharacterConsistencyCheck {
  character_id: string;
  checks: {
    // 位置整合性
    location_valid: boolean;
    location_reachable: boolean;    // 前シーンから到達可能か

    // 感情整合性
    emotional_transition_valid: boolean;
    emotional_shift_justified: boolean;

    // 知識整合性
    has_required_knowledge: boolean;
    no_forbidden_knowledge: boolean;

    // 性格整合性
    actions_align_with_personality: boolean;
    dialogue_matches_speech_style: boolean;

    // 身体状態
    physical_condition_tracked: boolean;
    injuries_accounted_for: boolean;
  };
  violations: ConsistencyViolation[];
}

/**
 * プロット整合性チェック
 */
export interface PlotConsistencyCheck {
  checks: {
    // 因果関係
    causal_chain_valid: boolean;
    no_deus_ex_machina: boolean;

    // プロットポイント
    required_points_achieved: boolean;
    no_skipped_prerequisites: boolean;

    // タイムライン
    timeline_coherent: boolean;
    no_time_paradoxes: boolean;
  };
  violations: ConsistencyViolation[];
}

/**
 * 世界ルール整合性チェック
 */
export interface WorldRuleConsistencyCheck {
  rule_id: string;
  rule_description: string;
  checks: {
    rule_followed: boolean;
    violations_count: number;
  };
  violations: ConsistencyViolation[];
}

/**
 * 整合性違反
 */
export interface ConsistencyViolation {
  type: ValidationErrorCategory;
  description: string;
  evidence: string;                // 違反の証拠となるテキスト
  severity: 'critical' | 'major' | 'minor';
  fix_suggestion?: string;
}
```

---

## 🌿 分岐管理

```typescript
/**
 * ストーリー分岐
 */
export interface StoryBranch {
  id: string;
  name: string;
  description: string;

  // 分岐点
  branch_point: BranchPoint;

  // 分岐後のシーン
  scenes: Scene[];
  chapters: Chapter[];

  // 世界状態
  diverged_world_state: WorldStateSnapshot;

  // ステータス
  status: 'active' | 'merged' | 'abandoned';
  created_at: Timestamp;
  last_modified: Timestamp;
}

/**
 * 分岐点
 */
export interface BranchPoint {
  scene_id: string;
  chapter_id: string;
  decision_description: string;
  alternative_choice: string;

  // 分岐前の状態
  state_before_branch: WorldStateSnapshot;
}

/**
 * 分岐マージリクエスト
 */
export interface BranchMergeRequest {
  source_branch_id: string;
  target_branch_id: string;
  merge_strategy: 'prefer_source' | 'prefer_target' | 'manual';
  conflict_resolution: ConflictResolution[];
}

/**
 * コンフリクト解決
 */
export interface ConflictResolution {
  conflict_type: 'character_state' | 'world_state' | 'plot_event';
  element_id: string;
  resolution: 'use_source' | 'use_target' | 'custom';
  custom_value?: unknown;
}
```

---

## 📈 評価指標

```typescript
/**
 * 創造性評価
 */
export interface CreativityMetrics {
  // 新規性
  novelty_score: number;           // 0-1（参照コーパスとの類似度の逆数）

  // 多様性
  lexical_diversity: number;       // 0-1（語彙の豊富さ）
  sentence_variety: number;        // 0-1（文構造の多様性）

  // 意外性
  plot_unpredictability: number;   // 0-1（展開の予測不可能性）
  character_originality: number;   // 0-1（キャラクターの独創性）

  // 総合スコア
  overall_creativity: number;      // 0-1
}

/**
 * 品質評価
 */
export interface QualityMetrics {
  // 技術的品質
  grammar_score: number;           // 0-1
  readability_score: number;       // 0-1（Flesch-Kincaid等）
  coherence_score: number;         // 0-1（文章の論理性）

  // 物語品質
  pacing_score: number;            // 0-1
  tension_arc: number[];           // シーンごとの緊張度
  emotional_impact: number;        // 0-1

  // 一貫性
  consistency_score: number;       // 0-1

  // 総合スコア
  overall_quality: number;         // 0-1
}

/**
 * 人間評価
 */
export interface HumanEvaluation {
  evaluator_id: string;
  timestamp: Timestamp;

  // 主観的評価
  ratings: {
    plot_coherence: 1 | 2 | 3 | 4 | 5;
    character_depth: 1 | 2 | 3 | 4 | 5;
    emotional_impact: 1 | 2 | 3 | 4 | 5;
    originality: 1 | 2 | 3 | 4 | 5;
    technical_quality: 1 | 2 | 3 | 4 | 5;
  };

  // コメント
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];

  // 総合評価
  overall_rating: 1 | 2 | 3 | 4 | 5;
  would_recommend: boolean;
}
```

---

## 🔗 次のステップ

この型定義を使用するサービス:
- `SceneGenerator` - シーン生成エンジン
- `ConsistencyValidator` - 一貫性検証システム
- `GenerationLoop` - Generate-Evaluate-Refineループ実装
- `QualityEvaluator` - 品質評価システム
