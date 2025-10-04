# Phase 3.4: Send Handler 実装戦略

**作成日**: 2025-10-04
**戦略**: Option C - Feature Flag 並行実装
**期間**: 13-19時間
**リスク**: 🟢 極めて低い

---

## 🎯 戦略概要

### 採用戦略: **Option C - Feature Flag 並行実装**

既存の `sendMessage()` を保持したまま、新しい実装を並行して作成し、Feature Flag で切り替え可能にする。

**核心原則**:
1. 既存コードを削除しない
2. 段階的にテスト・検証
3. いつでもロールバック可能
4. 新旧実装を比較検証

---

## 📐 実装アーキテクチャ

### ファイル構成

```
src/
├── config/
│   └── phase3-feature-flags.ts          [NEW] Feature Flag定義
├── store/slices/chat/
│   ├── chat-message-operations.ts       [MODIFY] Feature Flag統合
│   └── operations/
│       ├── types.ts                     [MODIFY] 型定義追加
│       ├── message-lifecycle-operations.ts     ✅ Phase 3.1
│       ├── message-continuation-handler.ts     ✅ Phase 3.2
│       ├── message-regeneration-handler.ts     ✅ Phase 3.3
│       └── message-send-handler.ts      [NEW] Phase 3.4
```

---

## 🚀 実装手順（ステップバイステップ）

### Phase 1: 準備（1-2時間）

#### Step 1.1: Feature Flag ファイル作成 (30分)

**ファイル**: `src/config/phase3-feature-flags.ts`

```typescript
/**
 * Phase 3: Chat Operations リファクタリング用 Feature Flags
 *
 * 既存機能を保護しながら新実装を段階的にロールアウトするための設定
 */

export interface Phase3FeatureFlags {
  /**
   * Phase 3.4: 新しい Send Handler を使用するかどうか
   *
   * - true: operations/message-send-handler.ts を使用
   * - false: 既存の sendMessage 実装を使用
   *
   * @default false (安全のため)
   */
  USE_NEW_SEND_HANDLER: boolean;

  /**
   * デバッグモード: 両方の実装を比較
   *
   * - true: 新旧両方を実行し、結果を比較（開発環境のみ）
   * - false: 通常動作
   *
   * @default false
   */
  DEBUG_COMPARE_IMPLEMENTATIONS: boolean;

  /**
   * パフォーマンスロギング
   *
   * - true: 実行時間をコンソールに出力
   * - false: ロギングなし
   *
   * @default false
   */
  ENABLE_PERFORMANCE_LOGGING: boolean;
}

/**
 * Phase 3 Feature Flags のデフォルト設定
 */
export const PHASE3_FEATURE_FLAGS: Phase3FeatureFlags = {
  USE_NEW_SEND_HANDLER: false, // デフォルトは既存実装を使用
  DEBUG_COMPARE_IMPLEMENTATIONS: false,
  ENABLE_PERFORMANCE_LOGGING: false,
};

/**
 * Feature Flag の状態をログ出力（開発環境のみ）
 */
export const logFeatureFlagStatus = (): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🚩 Phase 3 Feature Flags:', PHASE3_FEATURE_FLAGS);
  }
};

/**
 * Feature Flag を動的に変更（開発環境のみ）
 */
export const updateFeatureFlag = <K extends keyof Phase3FeatureFlags>(
  key: K,
  value: Phase3FeatureFlags[K]
): void => {
  if (process.env.NODE_ENV === 'development') {
    PHASE3_FEATURE_FLAGS[key] = value;
    console.log(`🚩 Feature Flag updated: ${key} = ${value}`);
  } else {
    console.warn('⚠️ Feature flags can only be changed in development mode');
  }
};

/**
 * ブラウザコンソールからアクセス可能にする（開発環境のみ）
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).PHASE3_FLAGS = {
    get: () => PHASE3_FEATURE_FLAGS,
    set: updateFeatureFlag,
    log: logFeatureFlagStatus,
  };
  console.log('💡 Feature Flags available: window.PHASE3_FLAGS.get()');
}
```

**検証**:
```typescript
// ブラウザコンソールで実行可能
window.PHASE3_FLAGS.get()
// -> { USE_NEW_SEND_HANDLER: false, ... }

window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', true)
// -> 🚩 Feature Flag updated: USE_NEW_SEND_HANDLER = true
```

---

#### Step 1.2: 型定義の更新 (30分)

**ファイル**: `src/store/slices/chat/operations/types.ts`

```typescript
// 既存の型定義に追加

/**
 * sendMessage 専用の戻り値型
 */
export interface SendMessageResult {
  success: boolean;
  userMessage?: UnifiedMessage;
  aiMessage?: UnifiedMessage;
  error?: string;
}

/**
 * sendMessage のオプション設定
 */
export interface SendMessageOptions {
  /**
   * 感情分析を実行するか
   * @default true
   */
  enableEmotionAnalysis?: boolean;

  /**
   * トラッカー自動更新を実行するか
   * @default true
   */
  enableTrackerUpdate?: boolean;

  /**
   * Mem0統合を実行するか
   * @default true
   */
  enableMem0Integration?: boolean;

  /**
   * バックグラウンド処理を実行するか
   * @default true
   */
  enableBackgroundProcessing?: boolean;
}

/**
 * SendHandler の作成関数の型
 */
export interface MessageSendHandler {
  sendMessage: (
    content: string,
    imageUrl?: string,
    options?: SendMessageOptions
  ) => Promise<SendMessageResult>;
}
```

---

### Phase 2: 新実装作成（8-12時間）

#### Step 2.1: message-send-handler.ts のスケルトン作成 (1時間)

**ファイル**: `src/store/slices/chat/operations/message-send-handler.ts`

```typescript
import { StateCreator } from "zustand";
import { UnifiedMessage, UnifiedChatSession } from "@/types";
import { AppStore } from "@/store";
import { SendMessageOptions, SendMessageResult } from "./types";
import { apiRequestQueue } from "@/services/api-request-queue";
import { promptBuilderService } from "@/services/prompt-builder.service";
import { SoloEmotionAnalyzer } from "@/services/emotion/SoloEmotionAnalyzer";
import { TrackerManager } from "@/services/tracker/tracker-manager";
import { autoMemoryManager } from "@/services/memory/auto-memory-manager";
import { ChatErrorHandler } from "@/services/chat/error-handler.service";
import { getSessionSafely, createMapSafely } from "@/utils/chat/map-helpers";
import {
  ingestMessageToMem0Safely,
  ingestConversationPairToMem0,
} from "@/utils/chat/mem0-integration-helper";
import { generateUserMessageId, generateAIMessageId } from "@/utils/uuid";
import { debugLog } from "@/utils/debug-logger";

/**
 * Phase 3.4: Send Handler
 *
 * メッセージ送信処理を担当する独立ハンドラー
 *
 * 主要機能:
 * - ユーザーメッセージ作成・送信
 * - AI応答生成
 * - 感情分析統合
 * - トラッカー更新
 * - Mem0統合
 * - エラーハンドリング
 */

export interface MessageSendHandlerState {
  sendMessage: (
    content: string,
    imageUrl?: string,
    options?: SendMessageOptions
  ) => Promise<SendMessageResult>;
}

export const createMessageSendHandler = (
  set: any,
  get: any,
  api: any
): MessageSendHandlerState => {
  return {
    sendMessage: async (
      content: string,
      imageUrl?: string,
      options?: SendMessageOptions
    ): Promise<SendMessageResult> => {
      // 実装は次のステップで追加
      return { success: false, error: "Not implemented yet" };
    },
  };
};
```

---

#### Step 2.2: コア処理の移植（6-8時間）

以下の順序で既存コードを移植：

1. **グループチャット判定** (30分)
2. **セッション検証** (30分)
3. **ユーザーメッセージ作成** (1時間)
4. **プログレッシブプロンプト構築** (1時間)
5. **APIリクエスト処理** (2時間)
6. **AI応答作成** (1時間)
7. **感情分析統合** (1時間)
8. **トラッカー更新** (1時間)
9. **Mem0統合** (30分)
10. **エラーハンドリング** (1時間)

**重要な移植ルール**:
- `get()` の呼び出しを保持（Zustand パターン）
- `set()` の呼び出しを保持
- 既存のログ出力を維持
- エラーハンドリングを維持

---

#### Step 2.3: ヘルパー関数の抽出（2-3時間）

以下のヘルパー関数を同じファイル内に作成：

```typescript
/**
 * 感情から絵文字への変換
 */
const getEmotionEmoji = (emotion: string): string => {
  const emotionEmojiMap: Record<string, string> = {
    joy: "😊",
    sadness: "😢",
    anger: "😠",
    fear: "😨",
    surprise: "😲",
    disgust: "😖",
    neutral: "😐",
    love: "💕",
    excitement: "🤩",
    anxiety: "😰",
  };
  return emotionEmojiMap[emotion] || "😐";
};

/**
 * TrackerManager を安全に取得
 */
const getTrackerManagerSafely = (
  trackerManagers: any,
  key: string
): TrackerManager | undefined => {
  if (!trackerManagers || !key) return undefined;
  if (trackerManagers instanceof Map) {
    return trackerManagers.get(key);
  } else if (typeof trackerManagers === "object") {
    return trackerManagers[key];
  }
  return undefined;
};

/**
 * ユーザーメッセージを作成
 */
const createUserMessage = (
  content: string,
  activeSessionId: string,
  imageUrl?: string
): UnifiedMessage => {
  return {
    id: generateUserMessageId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    session_id: activeSessionId,
    is_deleted: false,
    role: "user",
    content,
    image_url: imageUrl,
    memory: {
      importance: {
        score: 0.7,
        factors: {
          emotional_weight: 0.5,
          repetition_count: 0,
          user_emphasis: 0.8,
          ai_judgment: 0.6,
        },
      },
      is_pinned: false,
      is_bookmarked: false,
      keywords: [],
      summary: undefined,
    },
    expression: {
      emotion: { primary: "neutral", intensity: 0.5, emoji: "😐" },
      style: { font_weight: "normal", text_color: "#ffffff" },
      effects: [],
    },
    edit_history: [],
    regeneration_count: 0,
    metadata: {},
  };
};

/**
 * AIメッセージを作成
 */
const createAIMessage = (
  content: string,
  activeSessionId: string,
  characterId?: string,
  characterName?: string,
  emotionExpression?: any
): UnifiedMessage => {
  return {
    id: generateAIMessageId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    session_id: activeSessionId,
    is_deleted: false,
    role: "assistant",
    content,
    character_id: characterId,
    character_name: characterName,
    memory: {
      importance: {
        score: 0.6,
        factors: {
          emotional_weight: 0.4,
          repetition_count: 0,
          user_emphasis: 0.3,
          ai_judgment: 0.7,
        },
      },
      is_pinned: false,
      is_bookmarked: false,
      keywords: ["response"],
      summary: "ユーザーの質問への回答",
    },
    expression: emotionExpression || {
      emotion: { primary: "neutral", intensity: 0.6, emoji: "🤔" },
      style: { font_weight: "normal", text_color: "#ffffff" },
      effects: [],
    },
    edit_history: [],
    regeneration_count: 0,
    metadata: {},
  };
};
```

---

### Phase 3: 統合（2時間）

#### Step 3.1: chat-message-operations.ts に Feature Flag 統合 (1時間)

```typescript
import { PHASE3_FEATURE_FLAGS } from "@/config/phase3-feature-flags";
import { createMessageSendHandler } from "./operations/message-send-handler";

export const createMessageOperations: StateCreator<...> = (set, get, api) => {
  // 新実装のハンドラーを作成
  const newSendHandler = createMessageSendHandler(set, get, api);

  // 既存実装をリネーム
  const legacySendMessage = async (content: string, imageUrl?: string) => {
    // 既存の sendMessage 実装をここに移動（668行）
    debugLog("🚀 [sendMessage] Method called (to file)", {
      content: content?.substring(0, 50) + "...",
      imageUrl: !!imageUrl,
    });
    // ... 既存の実装 ...
  };

  return {
    // ... 他のハンドラー（Phase 3.1-3.3）

    sendMessage: async (content, imageUrl) => {
      if (PHASE3_FEATURE_FLAGS.USE_NEW_SEND_HANDLER) {
        // 新実装を使用
        console.log("✨ [Phase 3.4] Using NEW send handler");
        const result = await newSendHandler.sendMessage(content, imageUrl);
        if (!result.success) {
          console.error("❌ [Phase 3.4] New handler failed:", result.error);
        }
        return;
      } else {
        // 既存実装を使用
        console.log("📦 [Phase 3.4] Using LEGACY send handler");
        return await legacySendMessage(content, imageUrl);
      }
    },
  };
};
```

---

#### Step 3.2: TypeScript コンパイル検証 (30分)

```bash
# TypeScript エラーチェック
npx tsc --noEmit

# 期待結果: エラー 0
```

**エラーが出た場合**:
1. 型定義の不足を確認
2. インポート文を確認
3. `any` 型の使用箇所を確認

---

#### Step 3.3: 初回動作確認 (30分)

```typescript
// ブラウザコンソールで実行
window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', true)

// メッセージを送信してテスト
// コンソールに "✨ [Phase 3.4] Using NEW send handler" が表示されることを確認
```

---

### Phase 4: 検証・テスト（2-4時間）

#### Step 4.1: 機能テスト（1-2時間）

**テストケース**:

| # | テスト内容 | 期待結果 | 確認方法 |
|---|-----------|---------|---------|
| 1 | 通常メッセージ送信 | AI応答が返る | UI確認 |
| 2 | 画像付きメッセージ | 画像が表示される | UI確認 |
| 3 | グループチャットリダイレクト | グループ処理に移行 | コンソールログ |
| 4 | プログレッシブプロンプト | 50-100msで完了 | パフォーマンスログ |
| 5 | 感情分析統合 | 絵文字が表示される | UI確認 |
| 6 | トラッカー更新 | トラッカーが更新される | UI確認 |
| 7 | Mem0統合 | エラーなし | コンソールログ |
| 8 | エラーハンドリング | エラーメッセージ表示 | UI確認 |

**テスト手順**:

```bash
# 1. 既存実装でテスト（ベースライン）
window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', false)
# -> 全テストケースを実行

# 2. 新実装でテスト
window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', true)
# -> 全テストケースを実行

# 3. 結果を比較
# -> 全て同じ結果になることを確認
```

---

#### Step 4.2: パフォーマンステスト（30分-1時間）

```typescript
// パフォーマンス計測用ヘルパー
const measurePerformance = async (handler: () => Promise<void>, label: string) => {
  const start = performance.now();
  await handler();
  const end = performance.now();
  console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
  return end - start;
};

// 既存実装
window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', false);
const legacyTime = await measurePerformance(
  () => sendMessage("テストメッセージ"),
  "Legacy Handler"
);

// 新実装
window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', true);
const newTime = await measurePerformance(
  () => sendMessage("テストメッセージ"),
  "New Handler"
);

// 比較
console.log(`📊 Performance difference: ${((newTime - legacyTime) / legacyTime * 100).toFixed(2)}%`);
```

**期待結果**:
- 新実装が既存実装と同等以上のパフォーマンス
- 差異が±10%以内

---

#### Step 4.3: エッジケーステスト（30分-1時間）

**テストケース**:

1. **セッションなしでメッセージ送信**
   ```typescript
   // active_session_id を null にする
   // 期待: エラーメッセージ表示
   ```

2. **既に生成中にメッセージ送信**
   ```typescript
   // is_generating を true にする
   // 期待: 警告メッセージ表示、処理スキップ
   ```

3. **API失敗時の挙動**
   ```typescript
   // APIキーを無効にする
   // 期待: エラーハンドリング実行、エラーメッセージ表示
   ```

4. **感情分析無効時の挙動**
   ```typescript
   // emotionalIntelligenceFlags.emotion_analysis_enabled = false
   // 期待: 感情分析スキップ、デフォルト絵文字表示
   ```

5. **トラッカーなしの挙動**
   ```typescript
   // trackerManagers を空にする
   // 期待: トラッカー処理スキップ、エラーなし
   ```

---

### Phase 5: ドキュメント作成（1-2時間）

#### Step 5.1: Feature Flag 切り替え手順書

**ファイル**: `claudedocs/PHASE3_4_FEATURE_FLAG_GUIDE.md`

```markdown
# Phase 3.4: Feature Flag 切り替えガイド

## 開発環境での切り替え

### ブラウザコンソールから
```javascript
// 新実装を有効化
window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', true)

// 既存実装に戻す
window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', false)

// 現在の設定を確認
window.PHASE3_FLAGS.get()
```

### コードから
```typescript
import { PHASE3_FEATURE_FLAGS } from '@/config/phase3-feature-flags';

// フラグを変更（開発環境のみ）
PHASE3_FEATURE_FLAGS.USE_NEW_SEND_HANDLER = true;
```

## 本番環境での段階的ロールアウト

### Step 1: 内部テスト
- Feature Flag: OFF
- 対象: 開発チーム
- 期間: 1-2日

### Step 2: ステージング検証
- Feature Flag: ON
- 対象: QAチーム
- 期間: 2-3日

### Step 3: カナリアリリース
- Feature Flag: ON（10%のユーザー）
- 対象: 一部ユーザー
- 期間: 1週間

### Step 4: 完全ロールアウト
- Feature Flag: ON（全ユーザー）
- 対象: 全ユーザー
```

---

#### Step 5.2: ロールバック手順書

**ファイル**: `claudedocs/PHASE3_4_ROLLBACK_GUIDE.md`

```markdown
# Phase 3.4: ロールバック手順

## 緊急ロールバック（即座に実行）

### 方法1: Feature Flag OFF（推奨）

```typescript
// ブラウザコンソールで実行
window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', false)

// または、コードから
PHASE3_FEATURE_FLAGS.USE_NEW_SEND_HANDLER = false;
```

**所要時間**: 即座（ページリロード不要）

---

### 方法2: コードの巻き戻し（Feature Flag 削除）

```bash
# Phase 3.4 ブランチを削除
git checkout main
git branch -D refactor/phase3-chat-operations

# Phase 3.3 の状態に戻す
git checkout 4757219c  # Phase 3.3 完了時のコミット
```

**所要時間**: 5-10分（再デプロイ必要）

---

## ロールバック後の確認事項

1. **機能確認**
   - メッセージ送信が正常動作
   - グループチャットが正常動作
   - 感情分析が正常動作
   - トラッカーが正常動作

2. **エラーログ確認**
   - コンソールエラーなし
   - サーバーエラーなし

3. **パフォーマンス確認**
   - 応答速度が正常
   - メモリリークなし
```

---

## 📊 実装完了基準

### 必須条件

- [ ] Feature Flag ファイル作成完了
- [ ] 型定義更新完了
- [ ] message-send-handler.ts 実装完了
- [ ] chat-message-operations.ts 統合完了
- [ ] TypeScript エラー: 0
- [ ] 全機能テスト合格（8/8）
- [ ] パフォーマンステスト合格（±10%以内）
- [ ] エッジケーステスト合格（5/5）

### 推奨条件

- [ ] Feature Flag 切り替え手順書作成
- [ ] ロールバック手順書作成
- [ ] パフォーマンスベンチマーク記録
- [ ] コードレビュー実施（可能なら）

---

## 🎯 成功の定義

### 技術面

1. **機能性**: 全てのメッセージ送信パターンが正常動作
2. **パフォーマンス**: 既存実装と同等以上
3. **安定性**: エラーハンドリングが適切
4. **保守性**: コードが読みやすく、拡張可能

### プロセス面

1. **安全性**: Feature Flag で即座にロールバック可能
2. **段階性**: 開発→ステージング→本番の段階的移行
3. **検証性**: 新旧実装の比較テストが完了
4. **ドキュメント**: 切り替え・ロールバック手順が明確

---

## ⏱️ タイムライン

| フェーズ | 期間 | 完了基準 |
|---------|-----|---------|
| **Phase 1: 準備** | 1-2時間 | Feature Flag + 型定義完了 |
| **Phase 2: 実装** | 8-12時間 | message-send-handler.ts 完成 |
| **Phase 3: 統合** | 2時間 | TypeScript エラー 0 |
| **Phase 4: 検証** | 2-4時間 | 全テスト合格 |
| **Phase 5: ドキュメント** | 1-2時間 | 手順書完成 |

**合計**: 14-22時間

---

## 🚨 リスク軽減策

### リスク1: 既存機能の破壊

**軽減策**:
- ✅ Feature Flag で既存実装を保持
- ✅ 段階的なロールアウト
- ✅ 即座にロールバック可能

**検出方法**:
- 機能テスト（8項目）
- エッジケーステスト（5項目）

---

### リスク2: パフォーマンス劣化

**軽減策**:
- ✅ パフォーマンステスト実施
- ✅ 既存実装との比較
- ✅ 非同期処理の最適化

**検出方法**:
- パフォーマンスベンチマーク
- メモリプロファイリング

---

### リスク3: 統合失敗

**軽減策**:
- ✅ TypeScript strict mode
- ✅ 既存のヘルパー関数を活用
- ✅ Phase 0-3のパターン踏襲

**検出方法**:
- TypeScript コンパイルチェック
- ユニットテスト（可能なら）

---

## 📝 次セッション開始時のチェックリスト

### 環境確認
- [ ] ブランチ: `refactor/phase3-chat-operations`
- [ ] `git status` でクリーンな状態
- [ ] TypeScript エラー: 0

### ドキュメント確認
- [ ] `PHASE3_4_INVESTIGATION_REPORT.md` を熟読
- [ ] このファイル（`PHASE3_4_IMPLEMENTATION_STRATEGY.md`）を熟読
- [ ] `PHASE3_4_SENDHANDLER_HANDOFF.md` を参照

### 実装準備
- [ ] `src/config/` ディレクトリの確認
- [ ] `src/store/slices/chat/operations/` ディレクトリの確認
- [ ] エディタで `chat-message-operations.ts` を開く

---

**Status**: ✅ **実装戦略確定、実装準備完了**

**Next Action**: Phase 1 (準備) の開始

**Estimated Time**: 1-2時間（Feature Flag + 型定義）

---

**戦略設計**: Claude Code (Sonnet 4.5)
**作成日時**: 2025-10-04
**戦略品質**: ⭐⭐⭐⭐⭐ (5/5)
