# Phase 2 実装引き継ぎドキュメント

## 📋 現在の状況

### ✅ Phase 1 完了済み（2025-10-19）

**成果物**:
- ✅ **Phase 1.1**: `src/utils/chat/tracker-helpers.ts` 作成完了
  - `getTrackerManagerSafely()` 関数を集約
  - 5箇所の重複実装を削除

- ✅ **Phase 1.2**: 5ファイルのimport修正完了
  - `message-send-handler.ts`
  - `message-continuation-handler.ts`
  - `message-regeneration-handler.ts`
  - `chat-session-management.ts`
  - `groupChat.slice.ts`

- ✅ **Phase 1.3**: UUID関数統合完了（11個の関数削除）
  - `generateSessionId()` → `generateStableId('session')`
  - `generateUserMessageId()` → `generateStableId('user')`
  - `generateAIMessageId()` → `generateStableId('ai')`
  - その他8個のラッパー関数削除
  - 影響ファイル: 12ファイル修正

- ✅ **Phase 1.4**: TypeScript型チェック完了
  - `npx tsc --noEmit` → **0エラー**

**削減実績**: 約120-160行のコード削減

---

## 🎯 Phase 2 実装計画

### Phase 2 概要: メッセージ作成処理の統合（150-200行削減見込み）

現在、メッセージ作成ロジックが3つのハンドラーで重複しています。これをファクトリーパターンで統一します。

---

## 📝 Phase 2.1: message-factory.ts 作成

### 作成ファイル
**パス**: `src/utils/chat/message-factory.ts`

### 実装する関数（3つ）

#### 1. createUserMessage
```typescript
export function createUserMessage(
  content: string,
  sessionId: string,
  imageUrl?: string
): UnifiedMessage
```

**責任**:
- ユーザーメッセージの共通プロパティ設定
- `id`, `created_at`, `updated_at`, `session_id`, `role`, `content`, `image_url` を設定

#### 2. createAIMessage
```typescript
export function createAIMessage(
  content: string,
  sessionId: string,
  characterId?: string,
  characterName?: string,
  emotionExpression?: EmotionExpression
): UnifiedMessage
```

**責任**:
- AIメッセージの共通プロパティ設定
- `character_id`, `character_name`, `emotion_expression` を適切に設定

#### 3. createSystemMessage
```typescript
export function createSystemMessage(
  content: string,
  sessionId: string
): UnifiedMessage
```

**責任**:
- システムメッセージの共通プロパティ設定
- ウェルカムメッセージ、エラー通知などで使用

### 依存型定義
- `UnifiedMessage` (`src/types/index.ts`)
- `EmotionExpression` (`src/types/index.ts`)
- `generateStableId` (`src/utils/uuid.ts`)

### 実装パターン参照元

以下の3ファイルから共通パターンを抽出：

1. **`src/store/slices/chat/operations/message-send-handler.ts`**
   - Line 79-97: ユーザーメッセージ作成
   - Line 142-162: AIメッセージ作成

2. **`src/store/slices/chat/operations/message-continuation-handler.ts`**
   - Line 54-73: 継続メッセージ作成パターン

3. **`src/store/slices/chat/operations/message-regeneration-handler.ts`**
   - Line 126-134: 再生成メッセージ作成パターン

### 共通パターン抽出のポイント

#### 全メッセージ共通プロパティ
```typescript
{
  id: generateStableId(prefix),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  session_id: sessionId,
  role: 'user' | 'assistant' | 'system',
  content: content,
  is_deleted: false,
  // ... role別の追加プロパティ
}
```

#### ユーザーメッセージ固有
```typescript
{
  role: 'user',
  image_url: imageUrl || null,
}
```

#### AIメッセージ固有
```typescript
{
  role: 'assistant',
  character_id: characterId || null,
  character_name: characterName || '',
  emotion_expression: emotionExpression || null,
  regeneration_count: 0, // 初期値
}
```

#### システムメッセージ固有
```typescript
{
  role: 'system',
  // 最小限のプロパティ
}
```

---

## 📝 Phase 2.2: 3ハンドラーでのmessage-factory採用

### 修正対象ファイル

#### 1. `src/store/slices/chat/operations/message-send-handler.ts`

**修正箇所**:
- **Line 79-97**: ユーザーメッセージ作成
  - **Before**:
    ```typescript
    const userMessage: UnifiedMessage = {
      id: generateStableId('user'),
      created_at: new Date().toISOString(),
      // ... 長い初期化
    };
    ```
  - **After**:
    ```typescript
    const userMessage = createUserMessage(message, activeSessionId, imageUrl || undefined);
    ```

- **Line 142-162**: AIメッセージ作成
  - **Before**: 複雑なオブジェクト初期化
  - **After**:
    ```typescript
    const aiMessage = createAIMessage(
      aiResponseContent,
      activeSessionId,
      session.character_id || undefined,
      session.character_name,
      emotionData || undefined
    );
    ```

**削減見込み**: 約40-60行

#### 2. `src/store/slices/chat/operations/message-continuation-handler.ts`

**修正箇所**:
- **Line 54-73**: 継続メッセージ作成
  - **Before**: 手動でUnifiedMessage構築
  - **After**: `createAIMessage()` 使用

**削減見込み**: 約30-40行

#### 3. `src/store/slices/chat/operations/message-regeneration-handler.ts`

**修正箇所**:
- **Line 126-134**: 再生成メッセージ作成
  - **Before**: 既存メッセージのスプレッド + 手動更新
  - **After**: `createAIMessage()` + regeneration_count のみ更新

**削減見込み**: 約20-30行

### import追加（3ファイル共通）
```typescript
import { createUserMessage, createAIMessage } from '@/utils/chat/message-factory';
```

---

## 📝 Phase 2.3: context-management統合

### 背景
現在、Mem0の会話履歴取得ロジックが3ハンドラーで重複しています。

### 作成ファイル
**パス**: `src/utils/chat/context-management.ts`

### 実装する関数

#### buildConversationHistory
```typescript
export function buildConversationHistory(
  messages: UnifiedMessage[],
  sessionId: string,
  maxContextMessages: number
): Array<{ role: 'user' | 'assistant'; content: string }>;
```

**責任**:
- Mem0を使用した会話履歴の構築
- フォールバック処理（Mem0が利用不可の場合）
- メッセージフィルタリング（削除済みメッセージ除外）

### 修正対象ファイル（3ファイル）

重複コードパターン:
```typescript
// 現在の重複パターン（各ハンドラーで繰り返し）
try {
  const { Mem0 } = require('@/services/mem0/core');
  conversationHistory = Mem0.getCandidateHistory(messages, {
    sessionId: session.id,
    maxContextMessages,
    minRecentMessages: Math.max(5, Math.floor(maxContextMessages / 4)),
  });
} catch (e) {
  // フォールバック処理
}
```

**After**（統合後）:
```typescript
const conversationHistory = buildConversationHistory(
  messages,
  session.id,
  maxContextMessages
);
```

**削減見込み**: 約50-70行

---

## 📝 Phase 2.4: Chat Operationsベースクラス化

### 目的
3つのハンドラーの共通ロジックをベースクラスに抽出し、DRYを徹底します。

### 作成ファイル
**パス**: `src/store/slices/chat/operations/base-handler.ts`

### 共通化すべきロジック

#### 1. セッション取得とバリデーション
```typescript
protected getActiveSession(state: AppStore): ChatSession | null {
  const activeSessionId = state.active_session_id;
  if (!activeSessionId) return null;
  return getSessionSafely(state.sessions, activeSessionId);
}
```

#### 2. TrackerManager取得
```typescript
protected getTrackerManager(state: AppStore, sessionId: string): TrackerManager | null {
  return getTrackerManagerSafely(state.trackerManagers, sessionId);
}
```

#### 3. API設定取得
```typescript
protected getAPIConfig(state: AppStore): APIConfig {
  return {
    ...state.apiConfig,
    openRouterApiKey: state.openRouterApiKey,
    geminiApiKey: state.geminiApiKey,
    useDirectGeminiAPI: state.useDirectGeminiAPI,
  };
}
```

#### 4. エラーハンドリング
```typescript
protected handleError(error: unknown, operationType: string): void {
  console.error(`🚨 ${operationType} failed:`, error);
  // 共通エラーハンドリングロジック
}
```

### 削減見込み: 約60-80行

---

## 📝 Phase 2.5: 型チェック・検証

### 検証項目

#### 1. TypeScript型チェック
```bash
npx tsc --noEmit
```
**期待結果**: 0エラー

#### 2. ビルド検証
```bash
npm run build
```
**期待結果**: 成功

#### 3. 機能テスト（手動）
- ✅ メッセージ送信が正常動作
- ✅ メッセージ再生成が正常動作
- ✅ メッセージ続き生成が正常動作

---

## 🎯 Phase 2 実装の流れ（推奨順序）

### ステップ1: message-factory.ts作成（Phase 2.1）
1. `src/store/slices/chat/operations/message-send-handler.ts` を読み、ユーザーメッセージ作成パターンを確認
2. `src/store/slices/chat/operations/message-continuation-handler.ts` を読み、AIメッセージ作成パターンを確認
3. `src/store/slices/chat/operations/message-regeneration-handler.ts` を読み、再生成パターンを確認
4. `src/types/index.ts` でUnifiedMessage型を確認
5. `src/utils/chat/message-factory.ts` を作成
6. 3つのファクトリー関数を実装

### ステップ2: 3ハンドラーで採用（Phase 2.2）
1. `message-send-handler.ts` 修正
   - import追加
   - Line 79-97置換（ユーザーメッセージ）
   - Line 142-162置換（AIメッセージ）
2. `message-continuation-handler.ts` 修正
   - import追加
   - Line 54-73置換
3. `message-regeneration-handler.ts` 修正
   - import追加
   - Line 126-134置換
4. 型チェック: `npx tsc --noEmit`

### ステップ3: context-management統合（Phase 2.3）
1. `src/utils/chat/context-management.ts` 作成
2. `buildConversationHistory` 実装
3. 3ハンドラーで採用
4. 型チェック

### ステップ4: ベースクラス化（Phase 2.4）
1. `src/store/slices/chat/operations/base-handler.ts` 作成
2. 共通メソッド実装
3. 3ハンドラーで継承
4. 型チェック

### ステップ5: 最終検証（Phase 2.5）
1. `npx tsc --noEmit` → 0エラー確認
2. `npm run build` → 成功確認
3. 開発サーバーで動作確認

---

## ⚠️ 注意事項

### 型安全性
- **`any`型絶対禁止**
- すべての関数に適切な型アノテーションを付与
- UnifiedMessage型に完全準拠

### 後方互換性
- 既存のメッセージ構造を変更しない
- APIインターフェースを維持
- Zustandストアの構造を保持

### テスト
- 各Phase完了時に型チェック実施
- Phase 2完了時にビルド検証
- 手動で3つの機能（送信・再生成・続き生成）を確認

### エラー修復禁止
- **Geminiエラーの修復絶対禁止**（解決済み）
- ビルドエラーが発生した場合のみ対処
- 幻覚エラー（存在しないエラー）は無視

---

## 📊 期待される成果

### コード削減
- **Phase 2.1**: message-factory.ts作成（+30行）
- **Phase 2.2**: 3ハンドラー統合（-120〜170行）
- **Phase 2.3**: context-management統合（-50〜70行）
- **Phase 2.4**: ベースクラス化（-60〜80行）
- **合計削減**: 約200-290行

### 品質向上
- コードの重複排除
- 保守性の向上
- 型安全性の強化
- テストの容易性向上

---

## 🚀 次回セッション開始時のプロンプト例

```
Phase 2の実装を開始します。

Phase 1の完了状況:
- ✅ tracker-helpers.ts作成済み
- ✅ UUID関数統合済み
- ✅ 型チェック完了（0エラー）

Phase 2のタスク:
1. message-factory.ts作成
2. 3ハンドラーでの採用
3. context-management統合
4. ベースクラス化
5. 型チェック・検証

引き継ぎドキュメント: claudedocs/phase2-handoff.md を参照

--introspect --task-manage --think-hard --morphllm --seq --delegate auto --focus quality
```

---

## 📚 関連ドキュメント

- **分析レポート**: `claudedocs/core-utility-layers-deep-analysis.md`
- **型定義**: `src/types/index.ts`
- **完全開発ガイド**: `🎯 AI Chat V3 完全開発ガイド.md`

---

**作成日時**: 2025-10-19
**Phase 1完了日**: 2025-10-19
**Phase 2開始予定**: 次回セッション
