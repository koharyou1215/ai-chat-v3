# Phase 3.4: Send Handler 実装ガイド（次セッション用）

**作成日**: 2025-10-04
**現在の進捗**: Phase 3.1, 3.2, 3.3 完了 (60%)
**次のステップ**: Phase 3.4 - Send Handler 抽出

---

## 🎯 このセッションで達成したこと

### ✅ 完了済みフェーズ

**Phase 3.1: Message Lifecycle Operations** ✅
- ファイル: `message-lifecycle-operations.ts` (127行)
- 機能: `addMessage()`, `deleteMessage()`, `rollbackSession()`, `resetGeneratingState()`
- コミット: `046720fd`

**Phase 3.2: Continuation Handler** ✅
- ファイル: `message-continuation-handler.ts` (227行)
- 機能: `continueLastMessage()`
- コミット: `cc58fd64`

**Phase 3.3: Regeneration Handler** ✅
- ファイル: `message-regeneration-handler.ts` (214行)
- 機能: `regenerateLastMessage()`
- コミット: `4757219c`

### 📊 現在の状態

**ファイル構造**:
```
src/store/slices/chat/operations/
├── types.ts (24行)
├── message-lifecycle-operations.ts (127行)
├── message-continuation-handler.ts (227行)
└── message-regeneration-handler.ts (214行)
```

**chat-message-operations.ts**: 757行 (元: 1222行)
- 削減: 465行 (-38%)
- 残り: `sendMessage()` (668行) + ヘルパー関数

---

## 🔴 Phase 3.4: Send Handler - 最重要・最高リスク

### なぜ Phase 3.4 が最重要か

**理由1: コア機能**
- `sendMessage()` はアプリケーションの心臓部
- 全てのユーザーメッセージ送信がこの関数を経由
- 失敗 = アプリ全体の機能停止

**理由2: 最大の複雑性**
- **668行** (Phase 3.1-3.3合計の約1.5倍)
- 15以上の異なる処理フロー
- グループチャット統合
- プログレッシブ応答
- 感情分析統合
- トラッカー更新
- Mem0統合
- エラーハンドリング

**理由3: 多数の依存関係**
- `simpleAPIManagerV2`
- `promptBuilderService` (ConversationManager)
- `SoloEmotionAnalyzer`
- `TrackerManager`
- `autoMemoryManager`
- `apiRequestQueue`
- Mem0サービス

---

## 📋 Phase 3.4 実装前の必須調査事項

次セッション開始時は、**実装の前に必ず調査フェーズを実施**してください。

### 🔍 調査タスク 1: sendMessage の完全な理解

**目的**: 668行のコードの全体像を把握し、分割戦略を決定

**調査項目**:

1. **処理フローの分解**
   ```bash
   # sendMessage の全体を読み込み、主要な処理ブロックを特定
   Read src/store/slices/chat/chat-message-operations.ts (79-747行)

   # 抽出するべき処理ブロック:
   # - グループチャット判定
   # - ユーザーメッセージ作成
   # - プログレッシブ応答判定
   # - プロンプト構築
   # - API呼び出し
   # - AIメッセージ作成
   # - 感情分析
   # - トラッカー更新
   # - Mem0統合
   # - エラーハンドリング
   ```

2. **依存関係マッピング**
   ```bash
   # sendMessage が依存する全ての外部サービス・関数を特定
   Grep "import.*from" src/store/slices/chat/chat-message-operations.ts
   Grep "await.*\." src/store/slices/chat/chat-message-operations.ts (79-747行)

   # 調査対象:
   # - promptBuilderService.buildPromptProgressive() の役割
   # - simpleAPIManagerV2.generateMessage() の呼び出しパターン
   # - SoloEmotionAnalyzer の統合方法
   # - TrackerManager の更新タイミング
   # - Mem0 の ingest パターン
   ```

3. **エッジケース・特殊処理の特定**
   ```bash
   # 特殊な処理フローを特定
   Grep "if.*group" src/store/slices/chat/chat-message-operations.ts
   Grep "progressive" src/store/slices/chat/chat-message-operations.ts
   Grep "emotion" src/store/slices/chat/chat-message-operations.ts

   # 調査内容:
   # - グループチャットへのリダイレクト処理
   # - プログレッシブ応答の分岐ロジック
   # - 感情分析の有効/無効判定
   # - トラッカーの条件付き更新
   ```

4. **状態管理パターンの理解**
   ```bash
   # is_generating フラグの管理方法
   Grep "is_generating" src/store/slices/chat/chat-message-operations.ts

   # セッション更新パターン
   Grep "set\(" src/store/slices/chat/chat-message-operations.ts (79-747行)
   ```

### 🔍 調査タスク 2: 分割可能性の評価

**目的**: 668行を安全に分割できるか判断

**評価項目**:

1. **独立性の評価**
   - どの処理ブロックが独立して抽出可能か？
   - どの処理が密結合しているか？

2. **リスク評価**
   - 各処理ブロックの分離リスクを評価（低/中/高）
   - テストが困難な部分を特定

3. **分割戦略の決定**
   ```
   Option A: モノリシック抽出
   - sendMessage 全体を1ファイルに移動
   - リスク: 低
   - 保守性: 中

   Option B: 段階的分割
   - ヘルパー関数を先に抽出
   - メイン処理を最後に移動
   - リスク: 中
   - 保守性: 高

   Option C: Feature Flag並行実装
   - 既存コードを残したまま新実装を作成
   - Feature Flagで切り替え
   - リスク: 低（ロールバック可能）
   - 保守性: 高（段階的移行）
   ```

### 🔍 調査タスク 3: テスト戦略の立案

**目的**: 実装後の検証方法を事前に決定

**検証項目**:

1. **機能テスト**
   - 通常メッセージ送信
   - 画像付きメッセージ送信
   - グループチャットへのリダイレクト
   - プログレッシブ応答モード
   - 感情分析統合
   - トラッカー更新

2. **エラーケーステスト**
   - API失敗時の挙動
   - セッション不在時の処理
   - 既に生成中の場合の処理

3. **パフォーマンステスト**
   - 既存実装と新実装のレスポンス時間比較
   - メモリ使用量の確認

---

## 🛡️ Feature Flag 実装戦略

Phase 3.4 は **Feature Flag必須** です。

### Feature Flag 設計

**ファイル**: `src/config/phase3-feature-flags.ts`

```typescript
// src/config/phase3-feature-flags.ts

export const PHASE3_FEATURE_FLAGS = {
  /**
   * Phase 3.4: 新しい Send Handler を使用するかどうか
   *
   * true: operations/message-send-handler.ts を使用
   * false: 既存の sendMessage 実装を使用
   *
   * デフォルト: false（安全のため）
   */
  USE_NEW_SEND_HANDLER: false,

  /**
   * デバッグモード: 両方の実装を比較
   *
   * true: 新旧両方を実行し、結果を比較（開発環境のみ）
   * false: 通常動作
   */
  DEBUG_COMPARE_IMPLEMENTATIONS: false,
};

/**
 * Feature Flag の状態をログ出力
 */
export const logFeatureFlagStatus = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🚩 Phase 3 Feature Flags:', PHASE3_FEATURE_FLAGS);
  }
};
```

### 並行実装パターン

```typescript
// chat-message-operations.ts での使用例

import { PHASE3_FEATURE_FLAGS } from '@/config/phase3-feature-flags';
import { createMessageSendHandler } from './operations/message-send-handler';

export const createMessageOperations: StateCreator<...> = (set, get, api) => {
  // 新実装のハンドラーを作成
  const newSendHandler = createMessageSendHandler(set, get, api);

  return {
    // ... 他のハンドラー

    sendMessage: async (content, imageUrl) => {
      if (PHASE3_FEATURE_FLAGS.USE_NEW_SEND_HANDLER) {
        // 新実装を使用
        return newSendHandler.sendMessage(content, imageUrl);
      } else {
        // 既存実装を使用（このセクションにレガシーコードを残す）
        return legacySendMessage(content, imageUrl);
      }
    },
  };
};

// レガシー実装（既存の sendMessage をリネーム）
const legacySendMessage = async (content: string, imageUrl?: string) => {
  // 既存の668行の実装をここに保持
  // ...
};
```

---

## 📐 Phase 3.4 実装計画（推奨アプローチ）

### Day 1: 調査フェーズ（6-8時間）

**午前**: 完全な理解
- sendMessage 全体の詳細読み込み (2時間)
- 処理フローのダイアグラム作成 (1時間)
- 依存関係マッピング (1時間)

**午後**: 戦略決定
- 分割可能性の評価 (2時間)
- Feature Flag 設計 (1時間)
- テスト戦略の立案 (1-2時間)

**成果物**:
- `PHASE3_4_INVESTIGATION_REPORT.md` (調査結果)
- `PHASE3_4_IMPLEMENTATION_STRATEGY.md` (実装戦略)

### Day 2-3: 実装フェーズ（12-16時間）

**準備** (2時間):
- Feature Flag ファイル作成
- types.ts 更新
- レガシー実装のリネーム

**実装** (8-12時間):
- message-send-handler.ts 作成
- 段階的な機能移植
- Feature Flag 統合

**検証** (2時間):
- TypeScript コンパイル確認
- 両実装の比較テスト
- エッジケーステスト

### Day 4: 最終検証・ドキュメント（4-6時間）

**検証** (3-4時間):
- 全機能テスト実行
- パフォーマンス比較
- メモリリークチェック

**ドキュメント** (1-2時間):
- PHASE3_4_COMPLETION_REPORT.md 作成
- Feature Flag 切り替え手順書
- ロールバック手順書

---

## ⚠️ リスク軽減策

### リスク 1: 既存機能の破壊

**軽減策**:
- ✅ Feature Flag で既存実装を保持
- ✅ 段階的なロールアウト（開発環境 → ステージング → 本番）
- ✅ 即座にロールバック可能な仕組み

### リスク 2: 複雑性による実装ミス

**軽減策**:
- ✅ 調査フェーズを十分に取る（Day 1全て）
- ✅ 小さなコミット単位で進める
- ✅ 各処理ブロックごとにテスト

### リスク 3: パフォーマンス劣化

**軽減策**:
- ✅ パフォーマンス比較テスト実施
- ✅ 非同期処理の最適化
- ✅ 不要な再レンダリングの防止

### リスク 4: 統合失敗

**軽減策**:
- ✅ 既存のヘルパー関数を最大限活用
- ✅ Phase 0-3で確立したパターンを踏襲
- ✅ 型定義を厳密に

---

## 📝 次セッション開始時のチェックリスト

### 環境確認
- [ ] ブランチ: `refactor/phase3-chat-operations` にいることを確認
- [ ] `git status` でクリーンな状態を確認
- [ ] TypeScript エラー: 0 を確認 (`npx tsc --noEmit`)

### ドキュメント確認
- [ ] このファイル (`PHASE3_4_SENDHANDLER_HANDOFF.md`) を熟読
- [ ] `NEXT_SESSION_PHASE3_HANDOFF.md` の Phase 3.4 セクションを確認
- [ ] `CHAT_MESSAGE_OPERATIONS_DISTRIBUTION_PLAN.md` を参照

### 調査準備
- [ ] `chat-message-operations.ts` (79-747行) を読み込む準備
- [ ] エディタで該当行にジャンプ: `code -g src/store/slices/chat/chat-message-operations.ts:79`

---

## 🎯 Phase 3.4 成功の定義

### 必須条件

**機能面**:
- [ ] 全てのメッセージ送信パターンが動作
- [ ] グループチャットリダイレクトが正常動作
- [ ] プログレッシブ応答が正常動作
- [ ] 感情分析統合が正常動作
- [ ] トラッカー更新が正常動作
- [ ] エラーハンドリングが適切

**技術面**:
- [ ] TypeScript エラー: 0
- [ ] Feature Flag 実装完了
- [ ] レガシー実装が保持されている
- [ ] 新旧実装の切り替えが可能
- [ ] パフォーマンスが既存と同等以上

**ドキュメント**:
- [ ] 調査レポート作成
- [ ] 実装戦略ドキュメント作成
- [ ] Feature Flag 切り替え手順書
- [ ] ロールバック手順書

### 推奨条件

- [ ] 新旧実装の比較テスト実施
- [ ] パフォーマンスベンチマーク記録
- [ ] エッジケース網羅的にテスト
- [ ] コードレビュー（可能なら）

---

## 💡 重要な注意事項

### 🚨 絶対にやってはいけないこと

**❌ 既存の sendMessage を削除する**
- Feature Flag 実装までは絶対に削除しない
- レガシーコードは `legacySendMessage` として保持

**❌ 一度に全てを書き換える**
- 段階的に実装し、各ステップで検証

**❌ Feature Flag なしでデプロイ**
- 本番環境では必ず Feature Flag OFF でデプロイ
- 十分なテスト後に ON に切り替え

### ✅ 必ずやるべきこと

**✅ 調査フェーズを十分に取る**
- 最低6時間は調査に費やす
- 焦らず、理解を深める

**✅ 小さなコミット単位**
- 各処理ブロックごとにコミット
- ロールバックしやすくする

**✅ Feature Flag の活用**
- 開発中も Feature Flag で切り替えながらテスト
- 問題があれば即座に既存実装に戻す

---

## 📊 現在の進捗状況

### Phase 3 全体進捗

| サブフェーズ | 状態 | 完了度 | 期間目安 |
|------------|------|--------|---------|
| Phase 3.1: Lifecycle | ✅ 完了 | 100% | 2日 |
| Phase 3.2: Continuation | ✅ 完了 | 100% | 3日 |
| Phase 3.3: Regeneration | ✅ 完了 | 100% | 3日 |
| **Phase 3.4: Send** | ⬜ 未着手 | 0% | **4日** |
| Phase 3.5: Orchestrator | ⬜ 未着手 | 0% | 2日 |

**全体進捗**: 60% (3/5)

### コード削減状況

- 元の行数: 1,222行
- 現在の行数: 757行
- 削減: 465行 (-38%)
- 残りの sendMessage: 668行

**Phase 3.4 完了後の予想**:
- 削減予定: 追加 500-600行
- 最終的な chat-message-operations.ts: ~150-200行（オーケストレーターのみ）

---

## 🚀 次セッションの開始コマンド

```bash
# 1. 環境確認
git status
git branch  # refactor/phase3-chat-operations にいることを確認
npx tsc --noEmit  # TypeScript エラー: 0 を確認

# 2. 調査開始
# sendMessage の全体を読み込む
code -g src/store/slices/chat/chat-message-operations.ts:79

# または
Read src/store/slices/chat/chat-message-operations.ts (offset: 79, limit: 100)
```

---

## 📚 参考ドキュメント

**必読**:
1. `PHASE3_4_SENDHANDLER_HANDOFF.md` (このファイル)
2. `NEXT_SESSION_PHASE3_HANDOFF.md` - Phase 3 全体ガイド
3. `CHAT_MESSAGE_OPERATIONS_DISTRIBUTION_PLAN.md` - 詳細計画

**参考**:
4. `THREE_FILE_REFACTORING_MASTER_PLAN.md` - マスタープラン
5. `PHASE3_QUICK_REFERENCE.md` - クイックリファレンス

---

**Status**: ✅ **Phase 3.1-3.3 完了、Phase 3.4 準備完了**

**Next Action**: 次セッション開始時に調査フェーズから開始

**Estimated Time for Phase 3.4**: 20-30時間（調査6-8h + 実装12-16h + 検証4-6h）

**Success Criteria**: Feature Flag実装 + 全機能動作 + TypeScriptエラー0 + パフォーマンス維持

---

**Good luck with Phase 3.4! 🚀**
