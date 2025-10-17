# ストーリージェネレーター UI設計書

## 📋 概要

既存UI（`ChatInterface.tsx`, `MessageInput.tsx`等）を転用・拡張したストーリージェネレーター専用UI設計。

---

## 🎨 メインレイアウト

### StoryGeneratorLayout

```typescript
/**
 * メインレイアウトコンポーネント
 * 3カラム構成
 */
interface StoryGeneratorLayoutProps {
  children: React.ReactNode;
}

// 既存のChatInterface.tsxを拡張
// 転用率: 70%
```

**構造**:
```tsx
<StoryGeneratorLayout>
  <ProjectSidebar />           {/* 左: プロジェクト管理 */}
  <WritingCanvas />            {/* 中央: 執筆エリア */}
  <ContextPanel />             {/* 右: コンテキスト情報 */}
</StoryGeneratorLayout>
```

---

## 📁 左サイドバー: ProjectSidebar

### コンポーネント型定義

```typescript
/**
 * プロジェクトサイドバー
 * 既存: ChatSidebar.tsx を転用（転用率: 80%）
 */
interface ProjectSidebarProps {
  currentProjectId: string | null;
  onProjectSelect: (projectId: string) => void;
  onNewProject: () => void;
}

/**
 * プロジェクト一覧アイテム
 */
interface ProjectListItemProps {
  project: StoryProject;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onExport: () => void;
}

/**
 * アウトラインツリー
 */
interface OutlineTreeProps {
  outline: StoryOutline;
  currentChapterId: string | null;
  onChapterSelect: (chapterId: string) => void;
  onSceneSelect: (sceneId: string) => void;
}

/**
 * 幕（Act）セグメント
 */
interface ActSegmentProps {
  act: Act;
  chapters: Chapter[];
  expanded: boolean;
  onToggle: () => void;
}

/**
 * 章アイテム
 */
interface ChapterItemProps {
  chapter: Chapter;
  isActive: boolean;
  onSelect: () => void;
  validationStatus: ValidationStatus;
}
```

### UI構造

```tsx
<ProjectSidebar>
  {/* プロジェクト選択 */}
  <ProjectHeader>
    <ProjectSelector
      value={currentProjectId}
      onChange={onProjectSelect}
    />
    <NewProjectButton onClick={onNewProject} />
  </ProjectHeader>

  {/* 検索 */}
  <SearchBar
    placeholder="章・シーンを検索"
    value={searchQuery}
    onChange={setSearchQuery}
  />

  {/* アウトラインツリー */}
  <OutlineTree>
    {outline.acts.map(act => (
      <ActSegment key={act.act_number} act={act} expanded>
        {getChaptersByAct(act.act_number).map(chapter => (
          <ChapterItem
            key={chapter.id}
            chapter={chapter}
            isActive={chapter.id === currentChapterId}
            onSelect={() => onChapterSelect(chapter.id)}
          >
            {chapter.scenes.map(scene => (
              <SceneItem
                key={scene.id}
                scene={scene}
                isActive={scene.id === currentSceneId}
                onSelect={() => onSceneSelect(scene.id)}
              />
            ))}
          </ChapterItem>
        ))}
      </ActSegment>
    ))}
  </OutlineTree>
</ProjectSidebar>
```

---

## ✍️ 中央エリア: WritingCanvas

### コンポーネント型定義

```typescript
/**
 * 執筆キャンバス
 * 既存: ChatInterface.tsx のメインエリアを転用（転用率: 60%）
 */
interface WritingCanvasProps {
  currentChapter: Chapter | null;
  currentScene: Scene | null;
  onSceneUpdate: (sceneId: string, content: string) => void;
  onGenerateNext: (directive: string) => Promise<void>;
}

/**
 * 章ヘッダー
 */
interface ChapterHeaderProps {
  chapter: Chapter;
  onTitleChange: (title: string) => void;
  onNarrativeTypeChange: (type: NarrativeType) => void;
  onEndingTypeChange: (type: ChapterEndingType) => void;
}

/**
 * シーンエディター
 */
interface SceneEditorProps {
  scene: Scene;
  onContentChange: (content: string) => void;
  readOnly?: boolean;
}

/**
 * ディレクティブ入力
 * 既存: MessageInput.tsx を転用（転用率: 70%）
 */
interface DirectiveInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: (directive: string) => void;
  onRegenerate: () => void;
  onBranch: () => void;
  isGenerating: boolean;
}

/**
 * 一貫性アラート
 */
interface ConsistencyAlertProps {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  onDismiss: () => void;
  onAutoFix: (errorId: string) => void;
}
```

### UI構造

```tsx
<WritingCanvas>
  {/* 章ヘッダー */}
  <ChapterHeader>
    <TitleInput
      value={chapter.title}
      onChange={onTitleChange}
      placeholder="章タイトル"
    />

    <ControlRow>
      <NarrativeTypeSelector
        value={chapter.narrative_type}
        onChange={onNarrativeTypeChange}
        options={narrativeTypes}
      />

      <CreativitySlider
        value={chapter.creativity_level}
        onChange={onCreativityChange}
      />

      <EndingTypeSelector
        value={chapter.ending_type}
        onChange={onEndingTypeChange}
      />
    </ControlRow>
  </ChapterHeader>

  {/* シーン表示エリア */}
  <SceneDisplayArea>
    {chapter.scenes.map(scene => (
      <SceneBlock key={scene.id} scene={scene}>
        {/* 編集可能テキストエリア */}
        <EditableContent
          value={scene.content}
          onChange={(content) => onSceneUpdate(scene.id, content)}
        />

        {/* 一貫性警告 */}
        {scene.validation_errors.length > 0 && (
          <ConsistencyAlert
            errors={scene.validation_errors}
            warnings={[]}
            onDismiss={() => {}}
            onAutoFix={handleAutoFix}
          />
        )}

        {/* シーンメタ情報 */}
        <SceneMetadata>
          <MetaItem icon={<Users />}>
            {scene.characters_present.map(id =>
              getCharacterName(id)
            ).join(', ')}
          </MetaItem>
          <MetaItem icon={<MapPin />}>
            {scene.location}
          </MetaItem>
          <MetaItem icon={<Activity />}>
            一貫性: {(scene.consistency_score * 100).toFixed(0)}%
          </MetaItem>
        </SceneMetadata>
      </SceneBlock>
    ))}
  </SceneDisplayArea>

  {/* 執筆コントロール */}
  <WritingControls>
    <DirectiveInput
      placeholder="次のシーンで達成したいこと（例: エララがカエランに秘密を明かす）"
      value={directive}
      onChange={setDirective}
      onGenerate={handleGenerate}
      onRegenerate={handleRegenerate}
      onBranch={handleBranch}
      isGenerating={isGenerating}
    />

    <ButtonGroup>
      <ActionButton
        icon={<Sparkles />}
        onClick={() => handleGenerate(directive)}
        disabled={isGenerating}
        variant="primary"
      >
        続きを生成
      </ActionButton>

      <ActionButton
        icon={<RefreshCw />}
        onClick={handleRegenerate}
        disabled={isGenerating}
      >
        再生成
      </ActionButton>

      <ActionButton
        icon={<GitBranch />}
        onClick={handleBranch}
      >
        分岐作成
      </ActionButton>

      <ActionButton
        icon={<CheckCircle />}
        onClick={handleValidate}
      >
        一貫性チェック
      </ActionButton>
    </ButtonGroup>
  </WritingControls>
</WritingCanvas>
```

---

## 🔍 右サイドバー: ContextPanel

### コンポーネント型定義

```typescript
/**
 * コンテキストパネル
 * 既存: TrackerDisplay.tsx を転用・拡張（転用率: 75%）
 */
interface ContextPanelProps {
  worldState: WorldStateSnapshot;
  presentCharacters: StoryCharacter[];
  worldRules: WorldRule[];
  consistencyScore: number;
}

/**
 * キャラクター状態カード
 */
interface CharacterStateCardProps {
  character: StoryCharacter;
  compact?: boolean;
}

/**
 * 世界ルール表示
 */
interface WorldRulesDisplayProps {
  rules: WorldRule[];
  violations: ConsistencyViolation[];
}

/**
 * 一貫性スコア表示
 */
interface ConsistencyScoreDisplayProps {
  score: number;
  breakdown: ValidationResult['scores'];
}
```

### UI構造

```tsx
<ContextPanel>
  {/* キャラクター状態 */}
  <Section title="登場キャラクター">
    <CharacterStateList>
      {presentCharacters.map(char => (
        <CharacterStateCard key={char.id} character={char}>
          <Avatar src={char.avatar_url} />

          <StateGrid>
            <StateItem label="場所">
              {char.current_state.current_location}
            </StateItem>

            <StateItem label="感情">
              {char.current_state.emotional_state.primary_emotion}
            </StateItem>

            <StateItem label="健康">
              <ProgressBar
                value={char.current_state.physical_condition.health}
              />
            </StateItem>

            <StateItem label="所持品">
              {char.inventory.length}個
            </StateItem>
          </StateGrid>

          <ExpandButton onClick={() => openCharacterDetail(char.id)} />
        </CharacterStateCard>
      ))}
    </CharacterStateList>
  </Section>

  {/* 世界ルール */}
  <Section title="世界のルール">
    <WorldRulesDisplay
      rules={worldRules}
      violations={validationErrors.filter(e =>
        e.category === 'world_rule_violation'
      )}
    >
      {worldRules.map(rule => (
        <RuleItem key={rule.id}>
          <RuleIcon category={rule.category} />
          <RuleText>{rule.description}</RuleText>
          {hasViolation(rule.id) && (
            <ViolationBadge count={getViolationCount(rule.id)} />
          )}
        </RuleItem>
      ))}
    </WorldRulesDisplay>
  </Section>

  {/* 一貫性スコア */}
  <Section title="一貫性">
    <ConsistencyScoreDisplay
      score={consistencyScore}
      breakdown={validationResult.scores}
    >
      <CircularProgress
        value={consistencyScore * 100}
        size="large"
        color={getScoreColor(consistencyScore)}
      />

      <ScoreBreakdown>
        <BreakdownItem
          label="キャラクター"
          value={validationResult.scores.character_consistency}
        />
        <BreakdownItem
          label="プロット"
          value={validationResult.scores.plot_consistency}
        />
        <BreakdownItem
          label="世界ルール"
          value={validationResult.scores.world_rule_compliance}
        />
        <BreakdownItem
          label="感情"
          value={validationResult.scores.emotional_coherence}
        />
      </ScoreBreakdown>
    </ConsistencyScoreDisplay>
  </Section>

  {/* プロットポイント進捗 */}
  <Section title="プロット進捗">
    <PlotProgressTracker>
      {outline.acts.map(act => (
        <ActProgress key={act.act_number}>
          <ActLabel>第{act.act_number}幕</ActLabel>
          <PlotPointList>
            {act.plot_points.map(point => (
              <PlotPointItem
                key={point.id}
                achieved={point.achieved}
              >
                {point.achieved ? <CheckIcon /> : <ClockIcon />}
                {point.name}
              </PlotPointItem>
            ))}
          </PlotPointList>
        </ActProgress>
      ))}
    </PlotProgressTracker>
  </Section>
</ContextPanel>
```

---

## 🧙 ウィザードモーダル

### StoryCreationWizard

```typescript
/**
 * ストーリー作成ウィザード
 * 既存: ScenarioSetupModal.tsx を大幅拡張（転用率: 40%）
 */
interface StoryCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (project: StoryProject) => void;
}

/**
 * ウィザードステップ
 */
type WizardStep =
  | 'world_setup'           // Step 1: 世界設定
  | 'quest_selection'       // Step 2: クエスト選択
  | 'character_assignment'  // Step 3: キャラクター割り当て
  | 'structure_selection'   // Step 4: 物語構造選択
  | 'outline_generation'    // Step 5: アウトライン生成
  | 'review';               // Step 6: 最終確認

/**
 * ステップコンポーネントProps
 */
interface WizardStepProps<T> {
  data: Partial<StoryProjectInit>;
  onUpdate: (updates: Partial<StoryProjectInit>) => void;
  onNext: () => void;
  onBack: () => void;
}
```

### UI構造

```tsx
<StoryCreationWizard isOpen={isOpen} onClose={onClose}>
  <WizardHeader>
    <StepIndicator currentStep={currentStep} totalSteps={6} />
    <CloseButton onClick={onClose} />
  </WizardHeader>

  <WizardBody>
    {currentStep === 'world_setup' && (
      <WorldSetupStep
        data={wizardData}
        onUpdate={updateWizardData}
        onNext={nextStep}
      >
        <Input
          label="物語のタイトル"
          value={wizardData.title}
          onChange={(title) => updateWizardData({ title })}
        />

        <GenreSelector
          value={wizardData.genre}
          onChange={(genre) => updateWizardData({ genre })}
          showSubgenres
        />

        <ToneSelector
          value={wizardData.tone}
          onChange={(tone) => updateWizardData({
            world_setting: { ...wizardData.world_setting, tone }
          })}
        />

        <Textarea
          label="世界の設定"
          value={wizardData.world_setting.description}
          onChange={(description) => updateWizardData({
            world_setting: { ...wizardData.world_setting, description }
          })}
        />

        <WorldRulesEditor
          rules={wizardData.world_setting.world_rules}
          onChange={(rules) => updateWizardData({
            world_setting: { ...wizardData.world_setting, world_rules: rules }
          })}
        />
      </WorldSetupStep>
    )}

    {currentStep === 'quest_selection' && (
      <QuestSelectionStep
        data={wizardData}
        onUpdate={updateWizardData}
        onNext={nextStep}
        onBack={prevStep}
      >
        <QuestCategoryTabs
          categories={questCategories}
          activeCategory={activeQuestCategory}
          onChange={setActiveQuestCategory}
        />

        <QuestGrid>
          {getQuestsByCategory(activeQuestCategory).map(quest => (
            <QuestCard
              key={quest.id}
              quest={quest}
              selected={wizardData.quest?.id === quest.id}
              onClick={() => updateWizardData({ quest })}
            >
              <QuestTitle>{quest.title}</QuestTitle>
              <QuestDescription>{quest.description}</QuestDescription>
              <QuestImpact impact={quest.impact} />
            </QuestCard>
          ))}
        </QuestGrid>
      </QuestSelectionStep>
    )}

    {currentStep === 'character_assignment' && (
      <CharacterAssignmentStep
        data={wizardData}
        onUpdate={updateWizardData}
        onNext={nextStep}
        onBack={prevStep}
      >
        <CharacterRolePicker>
          <RoleSection title="主人公">
            <CharacterSelector
              value={wizardData.protagonist}
              onChange={(char) => updateWizardData({ protagonist: char })}
              availableCharacters={characters}
            />
          </RoleSection>

          <RoleSection title="脇役">
            <MultiCharacterSelector
              value={wizardData.supporting_characters}
              onChange={(chars) => updateWizardData({
                supporting_characters: chars
              })}
              availableCharacters={characters}
            />
          </RoleSection>

          <RoleSection title="敵役（任意）">
            <CharacterSelector
              value={wizardData.antagonist}
              onChange={(char) => updateWizardData({ antagonist: char })}
              availableCharacters={characters}
              optional
            />
          </RoleSection>
        </CharacterRolePicker>
      </CharacterAssignmentStep>
    )}

    {currentStep === 'structure_selection' && (
      <StructureSelectionStep
        data={wizardData}
        onUpdate={updateWizardData}
        onNext={nextStep}
        onBack={prevStep}
      >
        <StructureGrid>
          {structures.map(structure => (
            <StructureCard
              key={structure.type}
              structure={structure}
              selected={wizardData.structure?.type === structure.type}
              onClick={() => updateWizardData({ structure })}
            >
              <StructureDiagram structure={structure} />
              <StructureDescription>{structure.description}</StructureDescription>
            </StructureCard>
          ))}
        </StructureGrid>

        <CreativitySlider
          value={wizardData.creativity_level}
          onChange={(level) => updateWizardData({
            creativity_level: level
          })}
        />

        <LengthEstimator
          value={wizardData.structure.estimated_length}
          onChange={(length) => updateWizardData({
            structure: { ...wizardData.structure, estimated_length: length }
          })}
        />
      </StructureSelectionStep>
    )}

    {/* ... 他のステップ ... */}
  </WizardBody>

  <WizardFooter>
    <Button onClick={prevStep} disabled={currentStep === 'world_setup'}>
      戻る
    </Button>
    <Button onClick={nextStep} variant="primary">
      {currentStep === 'review' ? '作成' : '次へ'}
    </Button>
  </WizardFooter>
</StoryCreationWizard>
```

---

## 📊 その他のモーダル・パネル

### OutlineEditorModal

```typescript
interface OutlineEditorModalProps {
  outline: StoryOutline;
  onSave: (outline: StoryOutline) => void;
  onClose: () => void;
}
```

### BranchManagerModal

```typescript
interface BranchManagerModalProps {
  branches: StoryBranch[];
  currentBranchId: string;
  onBranchSwitch: (branchId: string) => void;
  onBranchMerge: (request: BranchMergeRequest) => void;
  onClose: () => void;
}
```

### ValidationReportModal

```typescript
interface ValidationReportModalProps {
  validationResult: ValidationResult;
  onAutoFix: (errorId: string) => void;
  onDismiss: () => void;
}
```

---

## 🔗 既存コンポーネント転用マップ

| 既存コンポーネント | 新コンポーネント | 転用率 | 主な変更点 |
|------------------|----------------|-------|-----------|
| `ChatInterface.tsx` | `WritingCanvas` | 60% | メッセージ→シーン、チャット→執筆 |
| `ChatSidebar.tsx` | `ProjectSidebar` | 80% | セッション→プロジェクト、追加: アウトラインツリー |
| `MessageBubble.tsx` | `SceneBlock` | 70% | 編集可能エディター、一貫性警告 |
| `MessageInput.tsx` | `DirectiveInput` | 70% | アクション: 生成/再生成/分岐 |
| `TrackerDisplay.tsx` | `ContextPanel` | 75% | トラッカー→世界状態、追加: プロット進捗 |
| `ScenarioSetupModal.tsx` | `StoryCreationWizard` | 40% | 単一→多段階ウィザード |
| `CharacterForm.tsx` | `CharacterStateEditor` | 85% | 追加: 動的状態管理 |
| `SettingsModal.tsx` | `StorySettingsModal` | 60% | 追加パネル: Genre/Quest/Narrative |

---

## 📱 モバイル対応

### レスポンシブ設計

```typescript
/**
 * モバイルレイアウト（iPhone 15 Pro Max対応）
 */
interface MobileLayoutProps {
  activeView: 'sidebar' | 'canvas' | 'context';
  onViewChange: (view: MobileLayoutProps['activeView']) => void;
}
```

**モバイル時の動作**:
- 3カラム → タブ切り替え式
- スワイプジェスチャーでビュー切り替え
- ボトムナビゲーション追加

---

## 🎯 次のステップ

UI実装時に使用するサービス:
- `StoryProjectService` - プロジェクト管理
- `OutlineService` - アウトライン操作
- `SceneGenerationService` - シーン生成
- `ValidationService` - 一貫性検証
- `BranchService` - 分岐管理
