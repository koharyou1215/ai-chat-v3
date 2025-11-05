# メモリーシステム安全修復計画

**作成日**: 2025-11-04
**前提**: MEMORY_SYSTEM_DIAGNOSTIC_REPORT.mdの診断結果に基づく
**目標**: 壊さない・段階的・ロールバック可能な修復

---

## 🎯 修復の基本方針

### ✅ DO（実施すること）
1. **1機能ずつ修正** - 一度に1つの変更のみ
2. **ログ出力優先** - まず動作確認、後で削除
3. **フィーチャーフラグ** - 新旧を切り替え可能に
4. **テスト駆動** - 修正前後で動作確認
5. **ドキュメント更新** - 変更内容を記録

### ❌ DON'T（禁止事項）
1. **大規模リファクタリング** - 過去の失敗パターン
2. **一括削除** - ロールバック不可能
3. **未テストの変更** - 壊れてから気付く
4. **ドキュメントなし** - 次回また同じ失敗
5. **既存機能の破壊** - ユーザー影響大

---

## 📊 Phase 構成（5段階）

```
Phase 1: 準備と検証基盤  ← 🔵 安全（リスク: 0%）
  ↓
Phase 2: AutoMemoryManager → Mem0移行 ← 🟡 低リスク（リスク: 20%）
  ↓
Phase 3: プロンプト最適化 ← 🟡 低リスク（リスク: 15%）
  ↓
Phase 4: VectorStore統一 ← 🟠 中リスク（リスク: 40%）
  ↓
Phase 5: ConversationManager簡素化 ← 🔴 高リスク（リスク: 60%）
```

**重要**: 各Phaseは独立して完了・検証・ロールバック可能

---

## Phase 1: 準備と検証基盤（リスク: 0%）

### 目的
- 現在の動作を記録
- テストケースを作成
- ロールバックポイント設定

### タスク

#### 1.1 現在の動作をログで記録
```typescript
// src/utils/memory-debug.ts (新規作成)
export const memoryDebugLog = {
  autoMemory: (context: string, data: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AutoMemory:${context}]`, data);
    }
  },
  vectorStore: (context: string, data: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[VectorStore:${context}]`, data);
    }
  },
  mem0: (context: string, data: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Mem0:${context}]`, data);
    }
  }
};
```

**挿入箇所**:
- `auto-memory-manager.ts:82` - メモリーカード生成時
- `conversation-manager.ts:220` - VectorStore追加時
- `mem0/core.ts:31` - Mem0 ingest時

**期待結果**:
- コンソールに動作ログが出力される
- どのシステムが動いているか可視化

#### 1.2 テストケース作成
```typescript
// tests/memory-system/baseline.test.ts (新規作成)
describe('Memory System Baseline', () => {
  test('AutoMemoryManager generates memory card', async () => {
    // 現在の動作を記録
  });

  test('ConversationManager searches memories', async () => {
    // 現在の検索結果を記録
  });

  test('Mem0 ingests messages', async () => {
    // Mem0の動作を記録
  });
});
```

**実施方法**:
1. 実際のチャットで10往復
2. メモリーカードが何枚生成されるか記録
3. 検索結果を記録
4. これを「正解」として保存

#### 1.3 フィーチャーフラグ準備
```typescript
// src/config/feature-flags.ts (新規作成)
export const FEATURE_FLAGS = {
  USE_MEM0_MEMORY_GENERATION: false, // Phase 2で切り替え
  USE_OPTIMIZED_PROMPT: false,        // Phase 3で切り替え
  USE_UNIFIED_VECTOR_STORE: false,    // Phase 4で切り替え
} as const;
```

**成功条件**:
- ✅ ログが正しく出力される
- ✅ テストが通る（baseline記録）
- ✅ フィーチャーフラグが機能する

**所要時間**: 1-2時間
**ロールバック**: git revert（新規ファイルのみ削除）

---

## Phase 2: AutoMemoryManager → Mem0移行（リスク: 20%）

### 目的
- AutoMemoryManagerの処理をMem0に移行
- 既存機能を壊さない
- 段階的に切り替え可能

### 戦略
1. **並行稼働** - 両方動かして結果を比較
2. **ログ比較** - どちらが良いメモリーを生成するか確認
3. **段階的切替** - フィーチャーフラグで制御

### Step 2.1: Mem0のメモリー生成ロジック強化

**現在の問題**:
```typescript
// mem0/core.ts:74 - promoteToMemoryCard()
// スタブ実装で重要度判定なし
```

**修正内容**:
```typescript
// mem0/core.ts に追加
async shouldPromoteToMemoryCard(
  messages: UnifiedMessage[]
): Promise<{ shouldPromote: boolean; importance: number }> {
  // AutoMemoryManagerのロジックを移植（改善版）

  const importance = this.calculateImportance(messages);

  // 閾値を0.3 → 0.6に引き上げ（診断レポートの推奨）
  return {
    shouldPromote: importance >= 0.6,
    importance
  };
}

private calculateImportance(messages: UnifiedMessage[]): number {
  // 1. 重要キーワード検出（AutoMemoryManagerから移植）
  // 2. 感情的重要度（改善版）
  // 3. 会話の深さ（新規）
  // 4. ユーザー強調（改善版）

  // 総合スコア計算
  return totalScore;
}
```

**成功条件**:
- ✅ Mem0が重要度を正しく計算
- ✅ 閾値0.6で適切なメモリーのみ生成
- ✅ テストが通る

### Step 2.2: 並行稼働モード追加

**修正箇所**: `message-send-handler.ts:590`

**Before**:
```typescript
autoMemoryManager.processNewMessage(
  aiResponse,
  activeSessionId,
  characterId,
  emotionResult
)
```

**After**:
```typescript
import { FEATURE_FLAGS } from '@/config/feature-flags';
import { memoryDebugLog } from '@/utils/memory-debug';

// 並行稼働モード
if (FEATURE_FLAGS.USE_MEM0_MEMORY_GENERATION) {
  // 新: Mem0を使用
  const messages = [userMessage, aiResponse];
  const result = await Mem0.shouldPromoteToMemoryCard(messages);

  memoryDebugLog.mem0('shouldPromote', result);

  if (result.shouldPromote) {
    await Mem0.promoteToMemoryCard(
      `Conversation: ${messages.map(m => m.content.slice(0, 30)).join(' → ')}`,
      {
        importance: { score: result.importance, factors: {...} },
        session_id: activeSessionId,
        character_id: characterId
      }
    );
  }
} else {
  // 旧: AutoMemoryManagerを使用
  await autoMemoryManager.processNewMessage(
    aiResponse,
    activeSessionId,
    characterId,
    emotionResult
  );
}
```

**同様の修正**:
- `chat-progressive-handler.ts:878`
- `groupChat.slice.ts:553`

**成功条件**:
- ✅ フラグfalse時: 旧動作（変化なし）
- ✅ フラグtrue時: Mem0が動作
- ✅ 両方のログが出力される

### Step 2.3: 比較テストと切替

**テスト方法**:
1. フラグfalseで10往復チャット → メモリー枚数記録
2. フラグtrueで同じ10往復 → メモリー枚数記録
3. 品質比較（どちらが重要な情報を保存したか）

**切替判断基準**:
- Mem0の方が適切なメモリーを生成
- または同等の品質
- バグなし

**切替後**:
- `FEATURE_FLAGS.USE_MEM0_MEMORY_GENERATION = true` をデフォルトに
- AutoMemoryManager関連コードは残す（Phase 5で削除）

**ロールバック方法**:
```typescript
FEATURE_FLAGS.USE_MEM0_MEMORY_GENERATION = false;
```

**所要時間**: 3-4時間
**リスク**: 🟡 低（フラグで即座に戻せる）

---

## Phase 3: プロンプト最適化（リスク: 15%）

### 目的
- Tracker情報の重複削除
- プロンプト構造の整理
- トークン数削減

### Step 3.1: Tracker重複削除

**問題箇所**: `conversation-manager.ts`

**Before**:
```typescript
// Line 610: Tracker Information (1回目)
if (this.trackerManager && character) {
  const trackerInfo = this.trackerManager.getDetailedTrackersForPrompt(character.id);
  if (trackerInfo) {
    prompt += `<relationship_state>\n${trackerInfo}\n</relationship_state>\n\n`;
  }
}

// ... 他のセクション ...

// Line 722: Tracker Information (2回目) ← 重複！
if (processedCharacter && this.trackerManager) {
  const detailedTrackerInfo = this.trackerManager.getDetailedTrackersForPrompt(character.id);
  if (detailedTrackerInfo) {
    prompt += `${detailedTrackerInfo}\n\n`;
  }
}
```

**After**:
```typescript
// Line 610付近に統一（最初の1回のみ）
if (this.trackerManager && character) {
  const trackerInfo = this.trackerManager.getDetailedTrackersForPrompt(character.id);
  if (trackerInfo) {
    prompt += `<relationship_state>\n${trackerInfo}\n</relationship_state>\n\n`;
  }
}

// Line 722の重複コードは削除
```

**検証方法**:
1. 修正前後でプロンプトを生成
2. Tracker情報が1回だけ含まれることを確認
3. チャット動作に問題なし

### Step 3.2: プロンプトセクション整理

**現在の構造**（14セクション）:
```
1. System Definitions
2. System Instructions
3. Character Information (100行以上)
4. Persona Information
5. Tracker Information
6. Pinned Memory Cards
7. Relevant Memory Cards
8. Pinned Messages
9. Relevant Messages
10. Session Summary
11. Recent Conversation
12. Character System Prompt
13. Jailbreak Instructions
14. Current Input
```

**最適化後**（10セクション）:
```
1. System Instructions (統合)
   ├─ System Definitions
   ├─ Core Rules
   └─ Jailbreak (必要時のみ)

2. Character Core (統合・簡素化)
   ├─ Basic Info (圧縮)
   ├─ Personality (重要部のみ)
   ├─ Communication Style
   └─ Character System Prompt

3. Persona Information (変更なし)

4. Relationship State (Tracker)

5. Memory System (統合)
   ├─ Pinned Memory Cards (最大3件)
   ├─ Relevant Memory Cards (最大5件)
   └─ Session Summary (100文字以内)

6. Recent Conversation (最大10往復)

7. Current Input
```

**効果**:
- トークン数: 約30%削減
- 情報の重複: 削除
- AIの混乱: 軽減

### Step 3.3: トークン数動的調整

```typescript
// conversation-manager.ts に追加
private optimizePromptSections(
  sections: PromptSection[],
  maxTokens: number
): PromptSection[] {
  const estimatedTokens = this.estimateTokens(sections);

  if (estimatedTokens <= maxTokens) {
    return sections; // そのまま
  }

  // 優先順位に基づいて削減
  // 1. Character Basic Info を圧縮
  // 2. Relevant Memory Cards を削減 (8→5件)
  // 3. Recent Conversation を削減 (10→5往復)

  return optimizedSections;
}
```

**成功条件**:
- ✅ Tracker重複が削除されている
- ✅ プロンプトが10セクションに整理
- ✅ トークン数が30%削減
- ✅ チャット品質が低下しない

**ロールバック**: git revert

**所要時間**: 2-3時間
**リスク**: 🟡 低（プロンプト生成のみの変更）

---

## Phase 4: VectorStore統一（リスク: 40%）

### ⚠️ 警告
このPhaseは**中リスク**です。慎重に進めます。

### 目的
- ConversationManagerの独自VectorStoreを削除
- Mem0のVectorStoreに一元化
- 検索結果の一貫性確保

### Step 4.1: ConversationManagerの検索をMem0経由に変更

**修正箇所**: `conversation-manager.ts:819`

**Before**:
```typescript
private async searchRelevantMemories(query: string): Promise<SearchResult[]> {
  const keywords = this.extractKeywords(query);
  const results = await this.vectorStore.hybridSearch(query, keywords, k);
  // ...
}
```

**After**:
```typescript
private async searchRelevantMemories(query: string): Promise<SearchResult[]> {
  // Mem0経由で検索（Unified Vector Store）
  const results = await Mem0.search(query, this.config.maxRelevantMemories);

  // SearchResult形式に変換
  return results.map(r => ({
    message: r.message,
    similarity: r.similarity,
    relevance: r.relevance
  }));
}
```

**同様の修正**:
- `buildContext()` - Line 241

**成功条件**:
- ✅ Mem0.search()が正しく動作
- ✅ 検索結果の品質が同等以上
- ✅ パフォーマンス低下なし

### Step 4.2: VectorStoreインスタンス削除

**修正箇所**: `conversation-manager.ts:31`

**Before**:
```typescript
export class ConversationManager {
  private vectorStore: VectorStore; // 削除対象
  private memoryLayers: MemoryLayerManager;
  private summarizer: DynamicSummarizer;

  constructor(initialMessages: UnifiedMessage[] = []) {
    this.vectorStore = new VectorStore(); // 削除
    this.memoryLayers = new MemoryLayerManager();
    this.summarizer = new DynamicSummarizer();
  }
}
```

**After**:
```typescript
export class ConversationManager {
  // vectorStoreフィールド削除
  private memoryLayers: MemoryLayerManager;
  private summarizer: DynamicSummarizer;

  constructor(initialMessages: UnifiedMessage[] = []) {
    // vectorStoreインスタンス化削除
    this.memoryLayers = new MemoryLayerManager();
    this.summarizer = new DynamicSummarizer();
  }
}
```

**影響範囲**:
- `addMessage()` - VectorStore追加処理削除
- `importMessages()` - バッチ追加削除
- `shouldIndexMessage()` - 判定ロジック削除（Mem0に移動）

**ロールバック**: git revert

**所要時間**: 2-3時間
**リスク**: 🟠 中（VectorStore依存コードが多い）

---

## Phase 5: ConversationManager簡素化（リスク: 60%）

### ⚠️ 重要
このPhaseは**高リスク**です。Phase 1-4が完了し、安定動作を確認してから実施。

### 目的
- AutoMemoryManager完全削除
- MemoryLayerManager削除
- ConversationManagerの行数削減

### 実施条件
- ✅ Phase 1-4が完了
- ✅ 最低2週間の安定動作確認
- ✅ ユーザーからのバグ報告なし
- ✅ メモリーカード生成が正常

### 詳細計画
Phase 4完了後に詳細を策定（現時点では計画しない）

---

## 🔄 各Phaseのロールバック手順

### Phase 1
```bash
git log --oneline | grep "Phase 1"
git revert <commit-hash>
```

### Phase 2
```typescript
// feature-flags.ts
USE_MEM0_MEMORY_GENERATION: false
```

### Phase 3
```bash
git revert <commit-hash>
```

### Phase 4
```bash
git revert <commit-hash>
# または
git checkout conversation-manager.ts
```

### Phase 5
（Phase 4完了後に計画）

---

## 📊 成功基準

### Phase 2成功基準
- メモリーカード生成数: 旧システムの70-130%
- メモリー品質: 人間評価で「同等以上」
- バグ報告: 0件
- パフォーマンス: 劣化なし

### Phase 3成功基準
- Tracker重複: 0件
- トークン数削減: 25-35%
- チャット品質: 低下なし
- ユーザー満足度: 維持

### Phase 4成功基準
- 検索精度: 同等以上
- パフォーマンス: 劣化なし
- メモリー使用量: 30-50%削減
- バグ報告: 0件

---

## 次のステップ

1. ✅ 修復計画策定完了
2. ⏳ プロンプト最適化案の詳細作成
3. ⏳ ユーザー承認待ち
4. ⏳ Phase 1実装開始

---

**作成者**: Claude Code (Sonnet 4.5)
**ステータス**: 計画策定完了、承認待ち
**推定総所要時間**: Phase 1-3で8-12時間、Phase 4-5で6-10時間
