# ストーリージェネレーター 実装ロードマップ

## 📋 概要

AI Chat V3の既存資産を最大限活用し、段階的にストーリージェネレーターを構築する実装計画。

---

## 🎯 開発フェーズ全体像

```
Phase 0: 準備        (1週間)   ← 環境構築・型定義
Phase 1: MVP         (2-3週間) ← 基本機能実装
Phase 2: 拡張機能    (3-4週間) ← 一貫性チェック・分岐管理
Phase 3: 高度機能    (4-6週間) ← マルチエージェント・評価
Phase 4: 最適化・公開 (2-3週間) ← パフォーマンス・デプロイ
```

**総開発期間**: 12-17週間（3-4ヶ月）

---

## 🚀 Phase 0: 準備フェーズ（1週間）

### 目標
- 開発環境整備
- 型定義完成
- 定数・ユーティリティ実装

### タスク詳細

#### Day 1-2: 環境構築
```bash
# 1. ディレクトリ作成
mkdir -p src/story-generator/{types,services,components,store,utils,constants,__tests__}

# 2. tsconfig.json にエイリアス追加
# "@story/*": ["./src/story-generator/*"]

# 3. 依存パッケージインストール（必要に応じて）
npm install docx epub-gen-memory
npm install --save-dev @types/docx
```

#### Day 3-4: 型定義実装
**ファイル一覧**:
- ✅ `types/story-core.types.ts` - 核心型
- ✅ `types/story-character.types.ts` - キャラクター型
- ✅ `types/story-structure.types.ts` - 構造型
- ✅ `types/story-generation.types.ts` - 生成型
- ✅ `types/story-validation.types.ts` - 検証型
- ✅ `types/story-world.types.ts` - 世界設定型
- ✅ `types/story-ui.types.ts` - UI型
- ✅ `types/index.ts` - エクスポート集約

**検証**: `npx tsc --noEmit` でエラーゼロ

#### Day 5-6: 定数・ユーティリティ実装
**ファイル一覧**:
- ✅ `constants/genres.constants.ts` - 50種類以上のジャンル定義
- ✅ `constants/quests.constants.ts` - クエストテンプレート
- ✅ `constants/structures.constants.ts` - 物語構造定義
- ✅ `constants/prompts.constants.ts` - プロンプトテンプレート
- ✅ `utils/converters/character-converter.ts` - Character → StoryCharacter変換
- ✅ `utils/helpers/consistency-scorer.ts` - 一貫性スコア計算

**検証**: ユニットテスト実装・実行

#### Day 7: レビュー・調整
- コードレビュー
- 型定義の最終調整
- ドキュメント更新

---

## 🥇 Phase 1: MVP実装（2-3週間）

### 目標
- ストーリー作成〜生成までの基本フロー完成
- 既存コンポーネント転用
- 最小限の一貫性チェック

### Week 1: ウィザード・プロジェクト管理

#### Day 1-2: プロジェクト管理Store
**ファイル**: `store/story-project.slice.ts`

```typescript
// 実装内容
interface StoryProjectState {
  projects: Map<string, StoryProject>;
  currentProjectId: string | null;

  createProject: (init: StoryProjectInit) => Promise<StoryProject>;
  updateProject: (id: string, updates: Partial<StoryProject>) => void;
  deleteProject: (id: string) => void;
  // ...
}
```

**検証**: プロジェクトCRUD動作確認

#### Day 3-5: ウィザードコンポーネント
**ファイル**:
- `components/wizard/StoryCreationWizard.tsx`
- `components/wizard/steps/WorldSetupStep.tsx`
- `components/wizard/steps/QuestSelectionStep.tsx`
- `components/wizard/steps/CharacterAssignmentStep.tsx`
- `components/wizard/steps/StructureSelectionStep.tsx`

**転用**:
- ベース: `ScenarioSetupModal.tsx`
- セレクター: `GenreSelector.tsx`, `QuestSelector.tsx` を新規作成

**検証**: ウィザード完走テスト

### Week 2: アウトライン生成

#### Day 1-3: アウトライン生成サービス
**ファイル**: `services/generation/outline-generator.service.ts`

```typescript
export class OutlineGenerator {
  async generateOutline(
    setup: WorldSetup,
    quest: QuestDefinition,
    structure: StoryStructure,
    characters: StoryCharacter[]
  ): Promise<StoryOutline> {
    // Plan-and-Write実装
    const prompt = this.buildOutlinePrompt(setup, quest, structure);
    const response = await this.llm.generate(prompt);
    return this.parseOutline(response);
  }
}
```

**転用**: `PromptBuilderService` のプロンプト構築ロジック

**検証**: 三幕構成アウトライン自動生成

#### Day 4-5: アウトラインエディター
**ファイル**: `components/editor/OutlineEditor.tsx`

**転用**: `TrackerDisplay.tsx` のUI構造

**検証**: アウトライン手動編集・保存

### Week 3: シーン生成・執筆UI

#### Day 1-3: シーン生成サービス
**ファイル**: `services/generation/scene-generator.service.ts`

```typescript
export class SceneGenerator {
  async generateScene(
    request: SceneGenerationRequest
  ): Promise<Scene> {
    // Generate-Evaluate-Refineループ（簡易版）
    for (let i = 0; i < maxRetries; i++) {
      const scene = await this.generate(request);
      const validation = await this.validate(scene);

      if (validation.isValid) return scene;

      request = this.adjustPrompt(request, validation.errors);
    }
    throw new Error('生成失敗');
  }
}
```

**転用**: `PromptBuilderService`, `ConversationManager`

**検証**: シーン生成・再生成

#### Day 4-5: 執筆UI
**ファイル**:
- `components/layout/WritingCanvas.tsx`
- `components/editor/DirectiveInput.tsx`
- `components/cards/SceneBlock.tsx`

**転用**:
- `ChatInterface.tsx` → `WritingCanvas`
- `MessageInput.tsx` → `DirectiveInput`
- `MessageBubble.tsx` → `SceneBlock`

**検証**: ディレクティブ入力→生成→表示フロー

---

## 🥈 Phase 2: 拡張機能実装（3-4週間）

### 目標
- 一貫性チェック機能
- トラッカー統合（キャラクター状態追跡）
- 分岐管理システム
- 詳細な生成設定

### Week 1: 一貫性検証システム

#### Day 1-2: 検証サービス基盤
**ファイル**: `services/validation/consistency-validator.service.ts`

```typescript
export class ConsistencyValidator {
  async validateScene(
    scene: Scene,
    worldState: WorldStateSnapshot
  ): Promise<ValidationResult> {
    const characterCheck = await this.validateCharacterConsistency(scene, worldState);
    const plotCheck = await this.validatePlotConsistency(scene, worldState);
    const worldRuleCheck = await this.validateWorldRules(scene, worldState);

    return this.aggregateResults([characterCheck, plotCheck, worldRuleCheck]);
  }
}
```

**検証**: 各種一貫性チェック動作確認

#### Day 3-4: 検証UI
**ファイル**:
- `components/validation/ConsistencyAlert.tsx`
- `components/validation/ValidationReport.tsx`

**検証**: エラー表示・警告表示

#### Day 5: 自動修正機能（簡易版）
**ファイル**: `services/validation/auto-fix.service.ts`

**検証**: 軽微なエラーの自動修正

### Week 2: 世界状態管理

#### Day 1-3: 世界状態マネージャー
**ファイル**: `services/world-state/world-state-manager.service.ts`

```typescript
export class WorldStateManager {
  async updateFromScene(
    scene: Scene,
    currentState: WorldStateSnapshot
  ): Promise<WorldStateSnapshot> {
    // シーンテキストから状態変化を抽出
    const changes = await this.extractStateChanges(scene);

    // 状態適用
    return this.applyChanges(currentState, changes);
  }
}
```

**転用**: `TrackerManager` をSVOトリプレット形式に拡張

**検証**: シーン生成→状態自動更新

#### Day 4-5: キャラクター状態トラッカー
**ファイル**:
- `services/world-state/character-state-manager.service.ts`
- `components/panels/CharacterStatesPanel.tsx`

**転用**: `TrackerDisplay.tsx`

**検証**: キャラクター位置・感情・所持品の自動追跡

### Week 3-4: 分岐管理

#### Day 1-3: 分岐サービス
**ファイル**: `services/project/branch-manager.service.ts`

```typescript
export class BranchManager {
  async createBranch(
    fromSceneId: string,
    alternativeChoice: string
  ): Promise<StoryBranch> {
    const branchPoint = await this.createBranchPoint(fromSceneId);
    const divergedState = await this.cloneWorldState(branchPoint);

    return {
      id: generateId(),
      branch_point: branchPoint,
      diverged_world_state: divergedState,
      // ...
    };
  }
}
```

**検証**: 分岐作成・切り替え

#### Day 4-5: 分岐管理UI
**ファイル**: `components/modals/BranchManagerModal.tsx`

**検証**: 分岐ツリー表示・マージ

---

## 🥉 Phase 3: 高度機能実装（4-6週間）

### 目標
- マルチエージェントシミュレーション
- 高度な一貫性検証
- プロットグラフビジュアライゼーション
- 評価システム

### Week 1-2: マルチエージェントシステム

#### Day 1-5: エージェント実装
**ファイル**: `services/generation/multi-agent/`

```typescript
// CharacterAgent: キャラクター視点で行動生成
export class CharacterAgent {
  async act(situation: string, character: StoryCharacter): Promise<string> {
    const prompt = `
      あなたは${character.name}です。
      性格: ${character.personality}
      現在の目標: ${character.current_state.current_goal}

      状況: ${situation}

      この状況でどう行動しますか？
    `;
    return await this.llm.generate(prompt);
  }
}

// DirectorAgent: 物語全体を監督
export class DirectorAgent {
  async createSituation(
    targetPlotPoint: PlotPoint,
    characters: CharacterAgent[]
  ): Promise<string> {
    // プロットポイント達成のための状況設定
    // 各キャラクターエージェントの行動を統合
  }
}
```

**検証**: 複数キャラクターの自律的インタラクション

#### Day 6-10: 統合・調整
- エージェント間の協調動作
- 物語の流れの制御
- パフォーマンス最適化

### Week 3-4: プロットグラフ・評価システム

#### Day 1-5: プロットグラフ
**ファイル**: `components/visualization/PlotGraph.tsx`

**実装内容**:
- プロットポイント間の因果関係ビジュアライゼーション
- インタラクティブなグラフ編集
- React Flow / D3.js 使用

**検証**: グラフ表示・編集

#### Day 6-10: 評価システム
**ファイル**: `services/evaluation/quality-evaluator.service.ts`

```typescript
export class QualityEvaluator {
  evaluateCreativity(story: StoryProject): CreativityMetrics {
    return {
      novelty_score: this.calculateNovelty(story),
      lexical_diversity: this.calculateLexicalDiversity(story),
      plot_unpredictability: this.calculateUnpredictability(story),
      // ...
    };
  }

  evaluateQuality(story: StoryProject): QualityMetrics {
    return {
      grammar_score: this.checkGrammar(story),
      coherence_score: this.checkCoherence(story),
      pacing_score: this.evaluatePacing(story),
      // ...
    };
  }
}
```

**検証**: 各種メトリクス算出

### Week 5-6: 高度な一貫性検証

#### Day 1-5: 詳細検証ロジック
- タイムライン一貫性チェック
- 複雑な因果関係検証
- 長期的な伏線追跡

#### Day 6-10: 検証レポート
**ファイル**: `components/reports/DetailedValidationReport.tsx`

---

## 🏁 Phase 4: 最適化・公開準備（2-3週間）

### Week 1: パフォーマンス最適化

#### Day 1-3: フロントエンド最適化
- コンポーネントの遅延ロード
- メモ化・最適化
- バンドルサイズ削減

#### Day 4-5: バックエンド最適化
- LLM呼び出しのバッチ処理
- プロンプトキャッシング
- 並列処理最適化

### Week 2: 統合テスト・バグ修正

#### Day 1-5: E2Eテスト
```bash
# Playwright でE2Eテスト
npx playwright test story-generator/
```

**テストシナリオ**:
1. ウィザード完走→アウトライン生成
2. シーン生成→編集→検証
3. 分岐作成→マージ
4. エクスポート（TXT/DOCX/EPUB）

#### Day 6-7: バグ修正・調整

### Week 3: ドキュメント・デプロイ

#### Day 1-3: ドキュメント作成
- ユーザーガイド
- API仕様書
- 開発者ドキュメント

#### Day 4-5: デプロイ準備
- 環境変数設定
- ビルド設定
- デプロイスクリプト

#### Day 6-7: リリース
- デプロイ実行
- 動作確認
- リリースノート公開

---

## 📊 各フェーズの成果物

### Phase 0 成果物
- ✅ 完全な型定義（7ファイル）
- ✅ 定数定義（4ファイル）
- ✅ ユーティリティ（5ファイル）

### Phase 1 成果物（MVP）
- ✅ ストーリー作成ウィザード
- ✅ アウトライン自動生成
- ✅ シーン生成・編集UI
- ✅ 基本的な一貫性チェック
- ✅ プロジェクト管理機能

### Phase 2 成果物（拡張）
- ✅ 詳細な一貫性検証
- ✅ キャラクター状態自動追跡
- ✅ 分岐管理システム
- ✅ 世界状態管理

### Phase 3 成果物（高度）
- ✅ マルチエージェントシミュレーション
- ✅ プロットグラフビジュアライゼーション
- ✅ 評価システム（創造性・品質）
- ✅ 高度な検証ロジック

### Phase 4 成果物（完成）
- ✅ 最適化済みアプリケーション
- ✅ 完全なドキュメント
- ✅ デプロイ済みプロダクション環境

---

## 🧪 テスト戦略

### ユニットテスト
```bash
# 各サービス・ユーティリティ
npm run test:unit
```

**カバレッジ目標**: 80%以上

### 統合テスト
```bash
# サービス間の連携
npm run test:integration
```

**重点テスト**:
- 生成→検証→状態更新フロー
- 分岐作成→切り替え→マージ

### E2Eテスト
```bash
# ユーザーフロー全体
npm run test:e2e
```

**シナリオ**:
1. 新規プロジェクト作成
2. アウトライン生成・編集
3. 複数章の生成
4. 分岐作成・管理
5. エクスポート

---

## 📈 リスク管理

### 技術的リスク

#### リスク1: LLM生成の不安定性
**対策**:
- リトライロジック（最大3回）
- フォールバックプロンプト
- 部分的な人間介入オプション

#### リスク2: 一貫性検証の精度
**対策**:
- 複数の検証ロジック組み合わせ
- 人間によるレビューフロー
- 段階的な検証強化

#### リスク3: パフォーマンス問題
**対策**:
- 早期のパフォーマンステスト
- プロファイリング・最適化
- バッチ処理・並列化

### スケジュールリスク

#### リスク: 各フェーズの遅延
**対策**:
- 週次進捗確認
- 優先度の明確化（MVP機能優先）
- バッファ期間の確保

---

## 🎯 成功指標（KPI）

### 技術指標
- ✅ 型安全性: 100%（`any`型ゼロ）
- ✅ 一貫性スコア平均: 0.9以上
- ✅ テストカバレッジ: 80%以上
- ✅ ビルドエラー: ゼロ

### 機能指標
- ✅ アウトライン生成成功率: 95%以上
- ✅ シーン生成成功率: 90%以上
- ✅ 一貫性エラー検出率: 85%以上

### UX指標
- ✅ プロジェクト作成時間: 10分以内
- ✅ シーン生成速度: 30秒以内
- ✅ UI応答性: 100ms以内

---

## 🔗 次のアクションアイテム

### 即座に実施
1. ✅ Phase 0のディレクトリ作成
2. ✅ tsconfig.jsonエイリアス設定
3. ✅ 型定義ファイル作成開始

### 1週間以内
4. ✅ 定数・ユーティリティ実装
5. ✅ プロジェクト管理Store実装
6. ✅ ウィザードUIプロトタイプ

### 2週間以内
7. ✅ アウトライン生成サービス実装
8. ✅ 基本的な執筆UI完成
9. ✅ MVP機能統合テスト

---

**このロードマップに従い、段階的かつ確実にストーリージェネレーターを構築してください。**
