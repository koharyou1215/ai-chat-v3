# Phase 3.4: Feature Flag 切り替えガイド

**作成日**: 2025-10-04
**Phase**: 3.4 - Send Handler Feature Flag

---

## 🚩 Feature Flag 概要

Phase 3.4では、既存の`sendMessage`実装を保持したまま、新しい実装を並行して使用できるようにFeature Flagを実装しました。

### Feature Flag の種類

| Flag名 | デフォルト | 説明 |
|--------|----------|------|
| `USE_NEW_SEND_HANDLER` | `false` | 新しいSend Handlerを使用 |
| `DEBUG_COMPARE_IMPLEMENTATIONS` | `false` | 新旧実装の比較モード（開発環境のみ） |
| `ENABLE_PERFORMANCE_LOGGING` | `false` | パフォーマンスログ出力 |

---

## 🔧 開発環境での切り替え

### 方法1: ブラウザコンソールから（推奨）

```javascript
// 現在の設定を確認
window.PHASE3_FLAGS.get()
// -> { USE_NEW_SEND_HANDLER: false, ... }

// 新実装を有効化
window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', true)
// -> 🚩 Feature Flag updated: USE_NEW_SEND_HANDLER = true

// 既存実装に戻す
window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', false)
// -> 🚩 Feature Flag updated: USE_NEW_SEND_HANDLER = false

// Feature Flagの状態をログ出力
window.PHASE3_FLAGS.log()
// -> 🚩 Phase 3 Feature Flags: { ... }
```

**特徴**:
- ✅ ページリロード不要
- ✅ 即座に切り替え可能
- ✅ デバッグに最適

---

### 方法2: コードから直接変更

```typescript
import { PHASE3_FEATURE_FLAGS, updateFeatureFlag } from '@/config/phase3-feature-flags';

// フラグを変更（開発環境のみ）
updateFeatureFlag('USE_NEW_SEND_HANDLER', true);

// または直接アクセス
PHASE3_FEATURE_FLAGS.USE_NEW_SEND_HANDLER = true;
```

**特徴**:
- ✅ コード内で制御可能
- ❌ 開発環境のみ動作

---

## 📊 動作確認

### 新実装が有効化されているか確認

```javascript
// 1. Feature Flagを確認
window.PHASE3_FLAGS.get()
// -> { USE_NEW_SEND_HANDLER: true }

// 2. メッセージを送信
// コンソールに以下が表示されることを確認:
// ✨ [Phase 3.4] Using NEW send handler
// 🚀 [NEW sendMessage] Method called ...
```

### 既存実装が有効化されているか確認

```javascript
// 1. Feature Flagを確認
window.PHASE3_FLAGS.get()
// -> { USE_NEW_SEND_HANDLER: false }

// 2. メッセージを送信
// コンソールに以下が表示されることを確認:
// 📦 [Phase 3.4] Using LEGACY send handler
// 🚀 [sendMessage] Method called ...
```

---

## 🧪 テスト手順

### 基本テスト

1. **既存実装でベースライン確認**
   ```javascript
   window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', false)
   ```
   - メッセージ送信
   - 画像付きメッセージ送信
   - グループチャット

2. **新実装でテスト**
   ```javascript
   window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', true)
   ```
   - 同じテストケースを実行
   - 結果が同じことを確認

3. **パフォーマンス比較**
   ```javascript
   // パフォーマンスログ有効化
   window.PHASE3_FLAGS.set('ENABLE_PERFORMANCE_LOGGING', true)

   // 新旧それぞれでメッセージ送信
   // コンソールに実行時間が表示される
   ```

---

## 🚀 本番環境での段階的ロールアウト

### Stage 1: 内部テスト（開発環境）

**対象**: 開発チーム
**期間**: 1-2日
**設定**: `USE_NEW_SEND_HANDLER = false`（デフォルト）

```javascript
// 開発環境で新実装をテスト
window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', true)
```

**確認事項**:
- [ ] 全機能が正常動作
- [ ] パフォーマンスが既存実装と同等以上
- [ ] エラーなし
- [ ] メモリリークなし

---

### Stage 2: ステージング検証

**対象**: QAチーム
**期間**: 2-3日
**設定**: `USE_NEW_SEND_HANDLER = true`（ステージング環境）

**確認事項**:
- [ ] 8項目の機能テスト合格
- [ ] 5項目のエッジケーステスト合格
- [ ] 負荷テスト合格
- [ ] セキュリティチェック合格

---

### Stage 3: カナリアリリース（本番環境）

**対象**: 10%のユーザー
**期間**: 1週間
**設定**: サーバー側で制御（ユーザーIDベース）

```typescript
// サーバー側でユーザーベースの Feature Flag 制御
const isCanaryUser = (userId: string) => {
  return parseInt(userId, 16) % 10 === 0; // 10%のユーザー
};

if (isCanaryUser(currentUserId)) {
  PHASE3_FEATURE_FLAGS.USE_NEW_SEND_HANDLER = true;
}
```

**モニタリング**:
- エラー率
- レスポンス時間
- ユーザーフィードバック
- システムリソース使用率

---

### Stage 4: 完全ロールアウト（本番環境）

**対象**: 全ユーザー
**期間**: 継続
**設定**: `USE_NEW_SEND_HANDLER = true`（全環境）

```typescript
// src/config/phase3-feature-flags.ts
export const PHASE3_FEATURE_FLAGS: Phase3FeatureFlags = {
  USE_NEW_SEND_HANDLER: true, // 全ユーザーに展開
  DEBUG_COMPARE_IMPLEMENTATIONS: false,
  ENABLE_PERFORMANCE_LOGGING: false,
};
```

**最終確認**:
- [ ] エラー率が許容範囲内（<0.1%）
- [ ] パフォーマンスが目標値以上
- [ ] ユーザー満足度が維持
- [ ] システムが安定稼働

---

## 🔍 デバッグ・トラブルシューティング

### 問題: 新実装でエラーが発生

**対処法1: 即座にロールバック**
```javascript
window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', false)
```

**対処法2: エラーログ確認**
```javascript
// コンソールで詳細ログを確認
// "❌ [Phase 3.4] New handler failed:" で検索
```

**対処法3: 比較モード**
```javascript
window.PHASE3_FLAGS.set('DEBUG_COMPARE_IMPLEMENTATIONS', true)
// 新旧両方を実行し、結果を比較
```

---

### 問題: パフォーマンスが低下

**診断方法**:
```javascript
// パフォーマンスログ有効化
window.PHASE3_FLAGS.set('ENABLE_PERFORMANCE_LOGGING', true)

// 計測用ヘルパー
const measurePerformance = async (handler, label) => {
  const start = performance.now();
  await handler();
  const end = performance.now();
  console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
};

// 既存実装
window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', false);
await measurePerformance(() => sendMessage("テスト"), "Legacy");

// 新実装
window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', true);
await measurePerformance(() => sendMessage("テスト"), "New");
```

---

### 問題: 機能が動作しない

**チェックリスト**:
1. [ ] Feature Flagが正しく設定されているか
   ```javascript
   window.PHASE3_FLAGS.get()
   ```
2. [ ] コンソールエラーがないか
3. [ ] 既存実装で動作するか
   ```javascript
   window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', false)
   ```
4. [ ] ブラウザキャッシュをクリア

---

## 📝 ログ出力の見方

### 新実装使用時

```
✨ [Phase 3.4] Using NEW send handler
🚀 [NEW sendMessage] Method called { content: "テスト...", imageUrl: false }
📊 [NEW sendMessage] State check - is_group_mode: false
✅ [NEW sendMessage] Starting message generation
🎯 [NEW sendMessage] Building progressive prompt...
✅ [NEW sendMessage] Progressive prompt built, length: 1234
🌐 [NEW sendMessage] Enqueuing API request - model: gemini-2.5-flash
📝 [NEW sendMessage] Prompt length: 1234
✅ [NEW sendMessage] API request successful
```

### 既存実装使用時

```
📦 [Phase 3.4] Using LEGACY send handler
🚀 [sendMessage] Method called (to console) { content: "テスト...", imageUrl: false }
📊 [sendMessage] State check - is_group_mode: false
✅ [sendMessage] Starting message generation
🔍 [sendMessage] About to call buildPromptProgressive...
✅ [sendMessage] buildPromptProgressive completed, basePrompt length: 1234
```

---

## 🎯 成功基準

### 新実装が成功と判断される条件

**機能面**:
- [ ] 全メッセージ送信パターンが動作
- [ ] グループチャットリダイレクトが正常動作
- [ ] 感情分析が正常動作
- [ ] トラッカー更新が正常動作
- [ ] エラーハンドリングが適切

**パフォーマンス面**:
- [ ] レスポンス時間が既存実装と同等以上（±10%以内）
- [ ] メモリ使用量が許容範囲内
- [ ] CPU使用率が許容範囲内

**安定性面**:
- [ ] エラー率 < 0.1%
- [ ] 24時間連続稼働で問題なし
- [ ] メモリリークなし

---

**Status**: ✅ **Feature Flag 実装完了**

**Next Action**: 本番環境での段階的ロールアウト

**Support**: 問題が発生した場合は、即座に `USE_NEW_SEND_HANDLER = false` に設定してロールバック

---

**作成者**: Claude Code (Phase 3.4 Implementation)
**最終更新**: 2025-10-04
