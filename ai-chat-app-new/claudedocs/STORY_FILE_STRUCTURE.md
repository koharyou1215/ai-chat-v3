# ストーリージェネレーター ファイル構造設計

## 📁 ディレクトリ構造全体図

```
src/
├── story-generator/                 # ストーリージェネレーター専用ディレクトリ
│   │
│   ├── types/                       # 型定義
│   │   ├── index.ts                 # エクスポート集約
│   │   ├── story-core.types.ts      # 核心型（Project, Chapter, Scene等）
│   │   ├── story-character.types.ts # キャラクター型（StoryCharacter等）
│   │   ├── story-structure.types.ts # 構造型（Act, PlotPoint, Outline等）
│   │   ├── story-generation.types.ts # 生成型（Request, Settings, Metadata等）
│   │   ├── story-validation.types.ts # 検証型（ValidationResult, Error等）
│   │   ├── story-ui.types.ts        # UI型（Props, State等）
│   │   └── story-world.types.ts     # 世界設定型（WorldSetting, Rule等）
│   │
│   ├── services/                    # ビジネスロジック
│   │   ├── generation/              # 生成サービス
│   │   │   ├── outline-generator.service.ts
│   │   │   ├── chapter-generator.service.ts
│   │   │   ├── scene-generator.service.ts
│   │   │   └── generation-loop.service.ts
│   │   │
│   │   ├── validation/              # 検証サービス
│   │   │   ├── consistency-validator.service.ts
│   │   │   ├── character-validator.service.ts
│   │   │   ├── plot-validator.service.ts
│   │   │   └── world-rule-validator.service.ts
│   │   │
│   │   ├── world-state/             # 世界状態管理
│   │   │   ├── world-state-manager.service.ts
│   │   │   ├── character-state-manager.service.ts
│   │   │   ├── relationship-tracker.service.ts
│   │   │   └── event-logger.service.ts
│   │   │
│   │   ├── project/                 # プロジェクト管理
│   │   │   ├── project-manager.service.ts
│   │   │   ├── outline-service.ts
│   │   │   └── branch-manager.service.ts
│   │   │
│   │   └── export/                  # エクスポート
│   │       ├── story-export.service.ts
│   │       ├── format-converters/
│   │       │   ├── txt-converter.ts
│   │       │   ├── docx-converter.ts
│   │       │   └── epub-converter.ts
│   │       └── index.ts
│   │
│   ├── components/                  # UIコンポーネント
│   │   ├── layout/                  # レイアウト
│   │   │   ├── StoryGeneratorLayout.tsx
│   │   │   ├── ProjectSidebar.tsx
│   │   │   ├── WritingCanvas.tsx
│   │   │   └── ContextPanel.tsx
│   │   │
│   │   ├── wizard/                  # ウィザード
│   │   │   ├── StoryCreationWizard.tsx
│   │   │   ├── steps/
│   │   │   │   ├── WorldSetupStep.tsx
│   │   │   │   ├── QuestSelectionStep.tsx
│   │   │   │   ├── CharacterAssignmentStep.tsx
│   │   │   │   ├── StructureSelectionStep.tsx
│   │   │   │   └── OutlineGenerationStep.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── editor/                  # エディター
│   │   │   ├── OutlineEditor.tsx
│   │   │   ├── SceneEditor.tsx
│   │   │   ├── DirectiveInput.tsx
│   │   │   └── EditableContent.tsx
│   │   │
│   │   ├── panels/                  # パネル
│   │   │   ├── CharacterStatesPanel.tsx
│   │   │   ├── WorldRulesPanel.tsx
│   │   │   ├── PlotProgressPanel.tsx
│   │   │   └── ConsistencyPanel.tsx
│   │   │
│   │   ├── validation/              # 検証UI
│   │   │   ├── ConsistencyAlert.tsx
│   │   │   ├── ValidationReport.tsx
│   │   │   └── ErrorList.tsx
│   │   │
│   │   ├── selectors/               # セレクター
│   │   │   ├── GenreSelector.tsx
│   │   │   ├── QuestSelector.tsx
│   │   │   ├── NarrativeTypeSelector.tsx
│   │   │   └── CreativitySlider.tsx
│   │   │
│   │   ├── cards/                   # カード
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ChapterCard.tsx
│   │   │   ├── SceneBlock.tsx
│   │   │   └── CharacterStateCard.tsx
│   │   │
│   │   └── modals/                  # モーダル
│   │       ├── BranchManagerModal.tsx
│   │       ├── ExportModal.tsx
│   │       └── SettingsModal.tsx
│   │
│   ├── store/                       # 状態管理（Zustand）
│   │   ├── story-project.slice.ts   # プロジェクト状態
│   │   ├── story-outline.slice.ts   # アウトライン状態
│   │   ├── story-world.slice.ts     # 世界状態
│   │   ├── story-generation.slice.ts # 生成状態
│   │   ├── story-validation.slice.ts # 検証状態
│   │   └── index.ts
│   │
│   ├── hooks/                       # カスタムフック
│   │   ├── useStoryGeneration.ts
│   │   ├── useValidation.ts
│   │   ├── useWorldState.ts
│   │   ├── useBranchManagement.ts
│   │   └── useExport.ts
│   │
│   ├── utils/                       # ユーティリティ
│   │   ├── prompt-builders/         # プロンプト構築
│   │   │   ├── outline-prompt.builder.ts
│   │   │   ├── scene-prompt.builder.ts
│   │   │   └── validation-prompt.builder.ts
│   │   │
│   │   ├── validators/              # バリデーター
│   │   │   ├── character-validator.ts
│   │   │   ├── plot-validator.ts
│   │   │   └── world-rule-validator.ts
│   │   │
│   │   ├── converters/              # コンバーター
│   │   │   ├── character-converter.ts
│   │   │   ├── tracker-to-plot.converter.ts
│   │   │   └── state-snapshot.converter.ts
│   │   │
│   │   └── helpers/                 # ヘルパー
│   │       ├── consistency-scorer.ts
│   │       ├── emotional-analyzer.ts
│   │       └── text-analyzer.ts
│   │
│   ├── constants/                   # 定数
│   │   ├── genres.constants.ts      # ジャンル定義
│   │   ├── quests.constants.ts      # クエスト定義
│   │   ├── structures.constants.ts  # 物語構造定義
│   │   └── prompts.constants.ts     # プロンプトテンプレート
│   │
│   └── __tests__/                   # テスト
│       ├── services/
│       ├── components/
│       └── utils/
│
├── types/                           # 共有型定義（既存）
│   └── core/
│       ├── character.types.ts       # 既存Character型
│       ├── tracker.types.ts         # 既存Tracker型
│       └── ...
│
├── services/                        # 既存サービス（転用）
│   ├── memory/
│   │   ├── conversation-manager.ts  # 転用: StoryContextManager
│   │   ├── memory-card-generator.ts # 転用: 世界設定記憶
│   │   └── vector-store.ts          # 転用: 世界設定検索
│   │
│   ├── tracker/
│   │   └── tracker-manager.ts       # 転用: プロット追跡
│   │
│   └── prompt-builder.service.ts    # 転用: Plan-and-Write
│
└── components/                      # 既存コンポーネント（転用）
    ├── chat/
    │   ├── ChatInterface.tsx        # ベース: WritingCanvas
    │   ├── ChatSidebar.tsx          # ベース: ProjectSidebar
    │   ├── MessageInput.tsx         # ベース: DirectiveInput
    │   └── MessageBubble.tsx        # ベース: SceneBlock
    │
    ├── character/
    │   └── CharacterForm.tsx        # ベース: CharacterStateEditor
    │
    └── settings/
        └── SettingsModal.tsx        # ベース: StorySettingsModal
```

---

## 📄 ファイル詳細設計

### 型定義ファイル（types/）

#### story-core.types.ts（150行）
```typescript
/**
 * 核心型定義
 * - StoryProject
 * - Chapter
 * - Scene
 * - ProjectMetadata
 * - ProjectStatistics
 */
export interface StoryProject extends BaseEntity { /* ... */ }
export interface Chapter { /* ... */ }
export interface Scene { /* ... */ }
// ...
```

#### story-character.types.ts（180行）
```typescript
/**
 * キャラクター関連型
 * - StoryCharacter
 * - CharacterState
 * - EmotionalState
 * - Relationship
 * - MemoryEvent
 */
export interface StoryCharacter extends Character { /* ... */ }
export interface CharacterState { /* ... */ }
// ...
```

#### story-structure.types.ts（160行）
```typescript
/**
 * 物語構造型
 * - StoryOutline
 * - Act
 * - PlotPoint
 * - CharacterArc
 */
export interface StoryOutline { /* ... */ }
export interface Act { /* ... */ }
// ...
```

#### story-generation.types.ts（200行）
```typescript
/**
 * 生成関連型
 * - GenerationRequest (Scene, Chapter, Outline)
 * - GenerationSettings
 * - GenerationMetadata
 */
export interface SceneGenerationRequest { /* ... */ }
export interface GenerationSettings { /* ... */ }
// ...
```

#### story-validation.types.ts（190行）
```typescript
/**
 * 検証関連型
 * - ValidationResult
 * - ValidationError
 * - ConsistencyCheck
 */
export interface ValidationResult { /* ... */ }
export interface ValidationError { /* ... */ }
// ...
```

#### story-world.types.ts（140行）
```typescript
/**
 * 世界設定型
 * - WorldSetting
 * - WorldRule
 * - WorldStateSnapshot
 * - WorldStateChange
 */
export interface WorldSetting { /* ... */ }
export interface WorldRule { /* ... */ }
// ...
```

#### story-ui.types.ts（150行）
```typescript
/**
 * UIコンポーネント型
 * - すべてのコンポーネントProps型
 */
export interface WritingCanvasProps { /* ... */ }
export interface DirectiveInputProps { /* ... */ }
// ...
```

---

### サービスファイル（services/）

#### generation/scene-generator.service.ts（180行）
```typescript
/**
 * シーン生成サービス
 */
export class SceneGenerator {
  async generateScene(
    request: SceneGenerationRequest
  ): Promise<Scene> {
    // Generate-Evaluate-Refineループ実装
  }

  async regenerateScene(
    sceneId: string,
    directive?: string
  ): Promise<Scene> {
    // 再生成ロジック
  }

  private async buildPrompt(
    request: SceneGenerationRequest
  ): Promise<string> {
    // プロンプト構築
  }
}
```

#### validation/consistency-validator.service.ts（190行）
```typescript
/**
 * 一貫性検証サービス
 */
export class ConsistencyValidator {
  async validateScene(
    scene: Scene,
    worldState: WorldStateSnapshot
  ): Promise<ValidationResult> {
    // 一貫性チェック実装
  }

  private validateCharacterConsistency(/* ... */): CharacterConsistencyCheck {
    // キャラクター一貫性チェック
  }

  private validatePlotConsistency(/* ... */): PlotConsistencyCheck {
    // プロット一貫性チェック
  }

  private validateWorldRules(/* ... */): WorldRuleConsistencyCheck {
    // 世界ルール一貫性チェック
  }
}
```

#### world-state/world-state-manager.service.ts（170行）
```typescript
/**
 * 世界状態管理サービス
 */
export class WorldStateManager {
  async updateFromScene(
    scene: Scene,
    currentState: WorldStateSnapshot
  ): Promise<WorldStateSnapshot> {
    // シーンから状態変化を抽出・適用
  }

  async createSnapshot(
    projectId: string
  ): Promise<WorldStateSnapshot> {
    // 現在の世界状態スナップショット作成
  }

  async rollbackToCheckpoint(
    checkpointId: string
  ): Promise<WorldStateSnapshot> {
    // チェックポイントへのロールバック
  }
}
```

---

### コンポーネントファイル（components/）

#### layout/WritingCanvas.tsx（180行）
```typescript
/**
 * メイン執筆エリア
 * 既存: ChatInterface.tsx を転用・拡張
 */
export const WritingCanvas: React.FC<WritingCanvasProps> = ({
  currentChapter,
  currentScene,
  onSceneUpdate,
  onGenerateNext,
}) => {
  // 実装
  return (
    <div className="writing-canvas">
      <ChapterHeader chapter={currentChapter} />
      <SceneDisplayArea scenes={currentChapter.scenes} />
      <WritingControls onGenerate={onGenerateNext} />
    </div>
  );
};
```

#### wizard/StoryCreationWizard.tsx（200行）
```typescript
/**
 * ストーリー作成ウィザード
 * 多段階フォーム
 */
export const StoryCreationWizard: React.FC<StoryCreationWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('world_setup');
  const [wizardData, setWizardData] = useState<Partial<StoryProjectInit>>({});

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <WizardHeader currentStep={currentStep} />
      <WizardBody>
        {renderStep(currentStep, wizardData, setWizardData)}
      </WizardBody>
      <WizardFooter
        onBack={prevStep}
        onNext={nextStep}
        isLastStep={currentStep === 'review'}
      />
    </Modal>
  );
};
```

#### editor/DirectiveInput.tsx（150行）
```typescript
/**
 * ディレクティブ入力コンポーネント
 * 既存: MessageInput.tsx を転用
 */
export const DirectiveInput: React.FC<DirectiveInputProps> = ({
  value,
  onChange,
  onGenerate,
  onRegenerate,
  onBranch,
  isGenerating,
}) => {
  return (
    <div className="directive-input">
      <Textarea
        value={value}
        onChange={onChange}
        placeholder="次のシーンで達成したいこと..."
      />
      <ButtonGroup>
        <ActionButton onClick={() => onGenerate(value)} disabled={isGenerating}>
          続きを生成
        </ActionButton>
        <ActionButton onClick={onRegenerate}>再生成</ActionButton>
        <ActionButton onClick={onBranch}>分岐作成</ActionButton>
      </ButtonGroup>
    </div>
  );
};
```

---

### Storeファイル（store/）

#### story-project.slice.ts（180行）
```typescript
/**
 * プロジェクト状態管理
 */
interface StoryProjectState {
  projects: Map<string, StoryProject>;
  currentProjectId: string | null;
  currentChapterId: string | null;
  currentSceneId: string | null;

  // アクション
  createProject: (init: StoryProjectInit) => Promise<StoryProject>;
  updateProject: (id: string, updates: Partial<StoryProject>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string) => void;
  exportProject: (id: string, format: ExportFormat) => Promise<Blob>;
}

export const useStoryProjectStore = create<StoryProjectState>()(
  persist(
    (set, get) => ({
      projects: new Map(),
      currentProjectId: null,
      currentChapterId: null,
      currentSceneId: null,

      createProject: async (init) => {
        // 実装
      },
      // ...
    }),
    {
      name: 'story-project-storage',
      partialize: (state) => ({
        projects: state.projects,
        currentProjectId: state.currentProjectId,
      }),
    }
  )
);
```

#### story-world.slice.ts（160行）
```typescript
/**
 * 世界状態管理
 */
interface StoryWorldState {
  worldStates: Map<string, WorldStateSnapshot>; // projectId -> state
  checkpoints: Map<string, WorldStateCheckpoint[]>; // projectId -> checkpoints

  // アクション
  updateWorldState: (
    projectId: string,
    scene: Scene
  ) => Promise<WorldStateSnapshot>;
  createCheckpoint: (projectId: string, plotPointId: string) => void;
  rollbackToCheckpoint: (checkpointId: string) => Promise<void>;
  getCharacterState: (projectId: string, characterId: string) => CharacterState;
}
```

---

## 🔗 既存ファイルとの統合

### 転用パターン

#### パターン1: 継承・拡張
```typescript
// 既存: src/types/core/character.types.ts
export interface Character { /* ... */ }

// 新規: src/story-generator/types/story-character.types.ts
import { Character } from '@/types/core/character.types';

export interface StoryCharacter extends Character {
  current_state: CharacterState;
  // ... 追加フィールド
}
```

#### パターン2: ラッパー作成
```typescript
// 既存: src/services/tracker/tracker-manager.ts
export class TrackerManager { /* ... */ }

// 新規: src/story-generator/services/world-state/plot-tracker.service.ts
import { TrackerManager } from '@/services/tracker/tracker-manager';

export class PlotTracker {
  private trackerManager: TrackerManager;

  async trackPlotEvent(event: PlotNode): Promise<void> {
    // TrackerManagerをSVOトリプレット形式でラップ
  }
}
```

#### パターン3: コンポーネント拡張
```typescript
// 既存: src/components/chat/MessageInput.tsx
export const MessageInput: React.FC<MessageInputProps> = ({ /* ... */ }) => {
  // チャット用実装
};

// 新規: src/story-generator/components/editor/DirectiveInput.tsx
import { MessageInput } from '@/components/chat/MessageInput';

export const DirectiveInput: React.FC<DirectiveInputProps> = ({ /* ... */ }) => {
  // MessageInputをベースに執筆用に特化
  return <MessageInput /* カスタムprops */ />;
};
```

---

## 📦 インポート規則

### エイリアス設定（tsconfig.json）
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@story/*": ["./src/story-generator/*"],
      "@story/types": ["./src/story-generator/types"],
      "@story/services": ["./src/story-generator/services"],
      "@story/components": ["./src/story-generator/components"],
      "@story/store": ["./src/story-generator/store"],
      "@story/utils": ["./src/story-generator/utils"],
      "@story/constants": ["./src/story-generator/constants"]
    }
  }
}
```

### インポート例
```typescript
// 型定義
import { StoryProject, Scene } from '@story/types';
import { Character } from '@/types/core/character.types';

// サービス
import { SceneGenerator } from '@story/services/generation/scene-generator.service';
import { TrackerManager } from '@/services/tracker/tracker-manager';

// コンポーネント
import { WritingCanvas } from '@story/components/layout/WritingCanvas';
import { MessageInput } from '@/components/chat/MessageInput';

// Store
import { useStoryProjectStore } from '@story/store';
import { useAppStore } from '@/store';
```

---

## 🧪 テストファイル配置

```
src/story-generator/__tests__/
├── services/
│   ├── scene-generator.service.test.ts
│   ├── consistency-validator.service.test.ts
│   └── world-state-manager.service.test.ts
│
├── components/
│   ├── WritingCanvas.test.tsx
│   ├── DirectiveInput.test.tsx
│   └── StoryCreationWizard.test.tsx
│
└── utils/
    ├── prompt-builder.test.ts
    └── consistency-scorer.test.ts
```

---

## 🔗 次のステップ

実装順序:
1. **型定義** (`types/`) - すべての型を先に定義
2. **定数** (`constants/`) - ジャンル、クエスト等の定数
3. **ユーティリティ** (`utils/`) - ヘルパー関数
4. **サービス** (`services/`) - ビジネスロジック
5. **Store** (`store/`) - 状態管理
6. **コンポーネント** (`components/`) - UI
7. **統合** - 既存システムとの接続
