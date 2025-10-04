# Phase 3.4: ロールバック手順書

**作成日**: 2025-10-04
**Phase**: 3.4 - Send Handler Rollback Guide

---

## 🚨 緊急ロールバック手順

Phase 3.4 の新実装で問題が発生した場合の即座のロールバック手順

---

## 方法1: Feature Flag OFF（最速・推奨）

### 実行時間: **即座（ページリロード不要）**

### 手順

```javascript
// ブラウザコンソールで実行
window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', false)
```

または

```typescript
// コードから実行
import { PHASE3_FEATURE_FLAGS } from '@/config/phase3-feature-flags';

PHASE3_FEATURE_FLAGS.USE_NEW_SEND_HANDLER = false;
```

### 確認

```javascript
// 1. Feature Flag確認
window.PHASE3_FLAGS.get()
// -> { USE_NEW_SEND_HANDLER: false }

// 2. メッセージ送信してログ確認
// コンソールに表示されること:
// 📦 [Phase 3.4] Using LEGACY send handler
```

### メリット

- ✅ 即座に実行可能
- ✅ ページリロード不要
- ✅ コード変更不要
- ✅ デプロイ不要

### デメリット

- ❌ ブラウザリロード後に設定リセット（開発環境のみ）
- ❌ 本番環境では恒久的な設定変更が必要

---

## 方法2: コード変更でのロールバック

### 実行時間: **5-10分（再デプロイ含む）**

### 手順

1. **Feature Flag設定ファイルを変更**

```typescript
// src/config/phase3-feature-flags.ts

export const PHASE3_FEATURE_FLAGS: Phase3FeatureFlags = {
  USE_NEW_SEND_HANDLER: false, // true → false に変更
  DEBUG_COMPARE_IMPLEMENTATIONS: false,
  ENABLE_PERFORMANCE_LOGGING: false,
};
```

2. **変更をコミット**

```bash
git add src/config/phase3-feature-flags.ts
git commit -m "🔙 Phase 3.4: Rollback to legacy send handler"
git push
```

3. **デプロイ**

```bash
# Vercelの場合
vercel --prod

# または自動デプロイを待つ
```

### メリット

- ✅ 恒久的な変更
- ✅ 全ユーザーに適用
- ✅ ロールバック履歴が残る

### デメリット

- ❌ デプロイ時間が必要
- ❌ Git履歴に記録される

---

## 方法3: Git Revert（完全巻き戻し）

### 実行時間: **10-15分（再デプロイ含む）**

### 手順

1. **Phase 3.4の全変更を巻き戻し**

```bash
# Phase 3.4のコミットを特定
git log --oneline | grep "Phase 3.4"

# コミットをrevert（例: abc123がPhase 3.4のコミット）
git revert abc123

# または、Phase 3.3の状態に戻す
git checkout 4757219c  # Phase 3.3完了時のコミット
git checkout -b rollback/phase3-4
git push origin rollback/phase3-4
```

2. **ブランチをデプロイ**

```bash
# ロールバックブランチをデプロイ
git checkout rollback/phase3-4
vercel --prod
```

### メリット

- ✅ 完全に以前の状態に戻る
- ✅ Phase 3.4の全変更を削除
- ✅ Git履歴にロールバックが明確に記録

### デメリット

- ❌ 時間がかかる
- ❌ Phase 3.4の作業が失われる
- ❌ 再実装が必要

---

## ロールバック後の確認事項

### 1. 機能確認（必須）

```javascript
// ブラウザコンソールで確認
window.PHASE3_FLAGS.get()
// -> { USE_NEW_SEND_HANDLER: false }
```

**テストケース**:
- [ ] 通常メッセージ送信
- [ ] 画像付きメッセージ送信
- [ ] グループチャット
- [ ] メッセージ再生成
- [ ] メッセージ続き生成
- [ ] 感情分析
- [ ] トラッカー更新
- [ ] Mem0統合

---

### 2. エラーログ確認

```bash
# コンソールエラーがないことを確認
# 特に以下のエラーがないか確認:
# - sendMessage related errors
# - Feature Flag errors
# - State management errors
```

**確認項目**:
- [ ] コンソールエラーなし
- [ ] ネットワークエラーなし
- [ ] APIエラーなし

---

### 3. パフォーマンス確認

```javascript
// パフォーマンスを計測
const measurePerformance = async (handler, label) => {
  const start = performance.now();
  await handler();
  const end = performance.now();
  console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
};

await measurePerformance(() => sendMessage("テスト"), "Rollback Performance");
```

**期待値**:
- [ ] レスポンス時間が正常範囲（500-2000ms）
- [ ] メモリリークなし
- [ ] CPU使用率が正常範囲

---

### 4. ユーザー影響確認

**確認項目**:
- [ ] 既存のチャット履歴が正常表示
- [ ] 既存のセッションが正常動作
- [ ] 既存の設定が保持されている
- [ ] データ損失なし

---

## ロールバック判断基準

### 即座にロールバックすべき状況（🔴 Critical）

1. **機能停止**
   - メッセージ送信が全く動作しない
   - アプリケーションがクラッシュ
   - データ損失が発生

2. **重大なエラー**
   - エラー率 > 5%
   - ユーザーの50%以上に影響
   - データ整合性の問題

3. **セキュリティ問題**
   - セキュリティ脆弱性の発見
   - 個人情報漏洩のリスク

**対処**: 即座に方法1（Feature Flag OFF）を実行

---

### 一時的にロールバックすべき状況（🟡 High）

1. **パフォーマンス劣化**
   - レスポンス時間が2倍以上
   - メモリ使用量が急増
   - CPU使用率が80%以上

2. **エラー増加**
   - エラー率 > 1%
   - 特定機能でのエラー集中

3. **ユーザーからの報告**
   - 複数のユーザーから同じ問題の報告
   - 重要な機能が使えないとの報告

**対処**: 方法1（Feature Flag OFF）で様子を見る → 問題が解決しない場合は方法2

---

### 調査後にロールバックを検討すべき状況（🟢 Medium）

1. **軽微なエラー**
   - エラー率 < 1%
   - 影響範囲が限定的

2. **パフォーマンス微減**
   - レスポンス時間が10-20%増加
   - メモリ使用量がわずかに増加

3. **UI/UXの問題**
   - 表示の不具合
   - アニメーションのカクつき

**対処**: 問題を調査 → 修正可能なら修正 → 修正困難ならロールバック

---

## ロールバック後の対応

### 1. 問題の記録

```markdown
# Incident Report

## 問題概要
- 発生日時: YYYY-MM-DD HH:MM
- 影響範囲:
- エラー内容:

## ロールバック内容
- 方法:
- 実行時刻:
- 実行者:

## 根本原因
- 原因:
- 再発防止策:
```

---

### 2. ユーザーへの通知（必要に応じて）

```markdown
【お知らせ】機能一時停止のお知らせ

いつもご利用いただきありがとうございます。

[日時]に発生した問題により、一部機能を以前のバージョンに戻させていただきました。
現在、問題の調査と修正を進めております。

ご不便をおかけして申し訳ございません。
```

---

### 3. 再実装の計画

**Phase 3.4 再実装チェックリスト**:

- [ ] 問題の根本原因を特定
- [ ] 修正方法を決定
- [ ] テストケースを追加
- [ ] 段階的ロールアウト計画を再作成
- [ ] より慎重なモニタリング計画

---

## モニタリング・アラート設定

### 推奨アラート設定

```typescript
// エラー率モニタリング
const errorRateThreshold = 0.01; // 1%

if (errorRate > errorRateThreshold) {
  alert('🚨 Error rate exceeded threshold! Consider rollback.');
  // 自動ロールバック
  PHASE3_FEATURE_FLAGS.USE_NEW_SEND_HANDLER = false;
}

// レスポンス時間モニタリング
const responseTimeThreshold = 2000; // 2秒

if (averageResponseTime > responseTimeThreshold) {
  alert('⚠️ Response time degraded! Monitor closely.');
}
```

---

## よくある質問（FAQ）

### Q1: ロールバック後、データは失われますか？

**A**: いいえ。Feature Flagによるロールバックはデータに影響しません。既存のチャット履歴、設定、セッションは全て保持されます。

---

### Q2: ロールバック後、再度新実装を試すことはできますか？

**A**: はい。いつでも `window.PHASE3_FLAGS.set('USE_NEW_SEND_HANDLER', true)` で再度有効化できます。

---

### Q3: ロールバックに失敗した場合はどうすればいいですか？

**A**: 以下の順序で試してください:
1. ページをリロード
2. ブラウザキャッシュをクリア
3. 方法2（コード変更）を実行
4. 方法3（Git Revert）を実行

---

### Q4: 本番環境でロールバックする際の注意点は？

**A**:
- 即座にFeature FlagをOFFにする
- ユーザーへの影響を最小限にする
- 問題を詳細に記録する
- 再発防止策を立てる

---

## 緊急連絡先・エスカレーション

### レベル1: 開発者対応（即座）

- Feature Flag OFF
- ログ確認
- 問題の特定

### レベル2: チームリーダー対応（15分以内）

- 影響範囲の評価
- ロールバック判断
- ユーザー通知の決定

### レベル3: マネジメント対応（1時間以内）

- 公式声明
- 再発防止策の承認
- リソース割り当て

---

**Status**: ✅ **ロールバック手順書完成**

**重要**: このドキュメントは緊急時に即座にアクセスできる場所に保管してください

---

**作成者**: Claude Code (Phase 3.4 Implementation)
**最終更新**: 2025-10-04
