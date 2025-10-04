# Phase 3 Implementation Checklist

**目的**: 実装進捗を追跡し、漏れを防ぐための詳細チェックリスト

---

## 📋 Phase 3.1: Message Lifecycle Operations

### 準備
- [ ] ブランチ作成: `refactor/phase3-chat-operations`
- [ ] ディレクトリ作成: `src/store/slices/chat/operations/`
- [ ] 計画書確認: `CHAT_MESSAGE_OPERATIONS_DISTRIBUTION_PLAN.md`

### ファイル作成
- [ ] `types.ts` 作成
- [ ] `MessageLifecycleOperations` インターフェース定義
- [ ] `message-lifecycle-operations.ts` 作成

### 機能実装
- [ ] `addMessage()` 実装
  - [ ] セッションID取得
  - [ ] `updateSessionSafely()` 使用
  - [ ] `ingestMessageToMem0Safely()` 呼び出し
- [ ] `deleteMessage()` 実装
  - [ ] メッセージID検索
  - [ ] セッション更新
- [ ] `rollbackSession()` 実装
  - [ ] メッセージインデックス検索
  - [ ] スライス処理
  - [ ] セッション更新
- [ ] `resetGeneratingState()` 実装

### 統合
- [ ] `chat-message-operations.ts` にインポート追加
- [ ] `createMessageLifecycleOperations` を統合
- [ ] 既存の重複コードを削除/コメントアウト

### 検証
- [ ] `npx tsc --noEmit` → エラー0
- [ ] `npm run build` → 成功
- [ ] `npm run dev` → 起動成功
- [ ] ブラウザ動作確認:
  - [ ] メッセージ追加動作
  - [ ] メッセージ削除動作
  - [ ] セッションロールバック動作
  - [ ] 生成状態リセット動作

### コミット
- [ ] ステージング: `git add src/store/slices/chat/operations/`
- [ ] コミット: 明確なメッセージ
- [ ] プッシュ: `git push origin refactor/phase3-chat-operations`

### ドキュメント
- [ ] 変更内容をメモ
- [ ] 問題点があれば記録

---

## 📋 Phase 3.2: Continuation Handler

### 準備
- [ ] Phase 3.1完了確認
- [ ] TypeScriptエラー0確認

### ファイル作成
- [ ] `types.ts` に `MessageContinuationHandler` 追加
- [ ] `message-continuation-handler.ts` 作成

### 機能実装
- [ ] `continueLastMessage()` 実装
  - [ ] セッション取得
  - [ ] 最後のメッセージ検証
  - [ ] `is_generating` 状態管理
  - [ ] API呼び出し（`simpleAPIManagerV2`）
  - [ ] メッセージ更新
  - [ ] Mem0統合
  - [ ] エラーハンドリング

### 統合
- [ ] `chat-message-operations.ts` に統合
- [ ] 既存の `continueLastMessage` 削除

### 検証
- [ ] TypeScriptエラー0
- [ ] ビルド成功
- [ ] 続き生成ボタン表示確認
- [ ] 続き生成動作確認
- [ ] エラーハンドリング確認

### コミット
- [ ] コミット完了
- [ ] プッシュ完了

---

## 📋 Phase 3.3: Regeneration Handler

### 準備
- [ ] Phase 3.2完了確認
- [ ] TypeScriptエラー0確認

### ファイル作成
- [ ] `types.ts` に `MessageRegenerationHandler` 追加
- [ ] `message-regeneration-handler.ts` 作成

### 機能実装
- [ ] `regenerateLastMessage()` 実装
  - [ ] セッション取得
  - [ ] 最後のメッセージ削除
  - [ ] API呼び出し
  - [ ] 新メッセージ生成
  - [ ] セッション更新
  - [ ] Mem0統合
  - [ ] エラーハンドリング

### 統合
- [ ] `chat-message-operations.ts` に統合
- [ ] 既存の `regenerateLastMessage` 削除

### 検証
- [ ] TypeScriptエラー0
- [ ] ビルド成功
- [ ] 再生成ボタン表示確認
- [ ] 再生成動作確認
- [ ] エラーハンドリング確認

### コミット
- [ ] コミット完了
- [ ] プッシュ完了

---

## 📋 Phase 3.4: Send Handler（最重要）

### 準備
- [ ] Phase 3.3完了確認
- [ ] **リスク評価**: 最も重要な機能
- [ ] **Feature Flag準備**: `PHASE3_FEATURE_FLAGS.USE_NEW_SEND_HANDLER`
- [ ] **バックアップ**: 既存コードを保存

### ファイル作成
- [ ] `types.ts` に `MessageSendHandler` 追加
- [ ] `message-send-handler.ts` 作成

### 機能実装
- [ ] `sendMessage()` 実装
  - [ ] ユーザーメッセージ作成
  - [ ] セッション追加
  - [ ] `is_generating` 状態管理
  - [ ] プログレッシブモード判定
  - [ ] プロンプト構築（ConversationManager使用）
  - [ ] API呼び出し
  - [ ] AIメッセージ作成
  - [ ] セッション更新
  - [ ] Mem0統合
  - [ ] 感情分析（オプション）
  - [ ] トラッカー更新（オプション）
  - [ ] エラーハンドリング

### Feature Flag実装
- [ ] `src/config/feature-flags.ts` 作成/更新
- [ ] `USE_NEW_SEND_HANDLER` フラグ追加
- [ ] 既存コードを `legacySendMessage` にリネーム
- [ ] Feature Flagで切り替え実装

### 統合（慎重に）
- [ ] Feature Flag経由で統合
- [ ] 既存コードは保持（削除しない）
- [ ] 並行動作確認

### 検証（徹底的に）
- [ ] TypeScriptエラー0
- [ ] ビルド成功
- [ ] **Feature Flag OFF**: 既存動作確認
- [ ] **Feature Flag ON**: 新実装動作確認
- [ ] メッセージ送信動作
- [ ] プログレッシブモード動作
- [ ] 感情分析動作
- [ ] エラーハンドリング動作
- [ ] **比較テスト**: 1000メッセージ（可能なら）

### コミット
- [ ] コミット完了（Feature Flag OFF状態）
- [ ] プッシュ完了

---

## 📋 Phase 3.5: Orchestrator

### 準備
- [ ] Phase 3.4完了確認
- [ ] 全ハンドラー動作確認

### ファイル作成
- [ ] `operations/index.ts` 作成（バレルエクスポート）

### 実装
- [ ] 全型のエクスポート
- [ ] 全ハンドラーのエクスポート
- [ ] `ChatMessageOperations` 型統合
- [ ] `createChatMessageOperations` 関数作成
- [ ] 全ハンドラーの合成

### 統合
- [ ] `chat-message-operations.ts` を更新
- [ ] `operations/index.ts` からインポート
- [ ] 旧実装を完全に置き換え

### 検証
- [ ] TypeScriptエラー0
- [ ] ビルド成功
- [ ] 全操作動作確認:
  - [ ] メッセージ送信
  - [ ] メッセージ再生成
  - [ ] メッセージ続き生成
  - [ ] メッセージ追加/削除
  - [ ] セッションロールバック

### コミット
- [ ] 最終コミット
- [ ] プッシュ完了

---

## 📋 Phase 3 最終検証

### コード品質
- [ ] TypeScriptエラー: 0
- [ ] ESLintエラー: 0
- [ ] `npm run build` 成功
- [ ] ファイル数: 5ファイル作成確認
- [ ] 各ファイルサイズ:
  - [ ] `message-lifecycle-operations.ts` ≤ 200行
  - [ ] `message-continuation-handler.ts` ≤ 250行
  - [ ] `message-regeneration-handler.ts` ≤ 200行
  - [ ] `message-send-handler.ts` ≤ 350行
  - [ ] `index.ts` ≤ 200行

### 機能網羅性
- [ ] 全14操作が動作
- [ ] Phase 0ヘルパー全使用確認
- [ ] コード重複: 0%

### パフォーマンス
- [ ] メッセージ送信レスポンス: 既存と同等以上
- [ ] メモリリークなし
- [ ] コンソールエラーなし

### ドキュメント
- [ ] 各フェーズのコミットメッセージ明確
- [ ] 問題点の記録
- [ ] 完了レポート作成準備

---

## 📋 Phase 3 完了後アクション

### レポート作成
- [ ] `PHASE3_COMPLETION_REPORT.md` 作成
- [ ] 実装サマリー記載
- [ ] 問題点と解決策記載
- [ ] メトリクス記載

### マージ準備
- [ ] すべてのコミット確認
- [ ] コンフリクト解消
- [ ] PR作成準備（必要なら）

### Phase 4準備
- [ ] `GROUPCHAT_SLICE_DISTRIBUTION_PLAN.md` 確認
- [ ] Phase 4の詳細計画立案

---

## 🚨 トラブルシューティングチェックリスト

### TypeScriptエラーが出る
- [ ] `npx tsc --noEmit` で詳細確認
- [ ] インポートパス確認
- [ ] 型定義の整合性確認
- [ ] `as any` を適切に使用

### ビルドが失敗する
- [ ] `.next` フォルダ削除: `Remove-Item -Recurse -Force .next`
- [ ] 再ビルド: `npm run build`
- [ ] `node_modules` 削除して再インストール（最終手段）

### メッセージ送信が動作しない
- [ ] コンソールエラー確認
- [ ] セッションID確認
- [ ] API設定確認
- [ ] Feature Flag確認（Phase 3.4の場合）

### Mem0統合エラー
- [ ] Mem0サービス初期化確認
- [ ] エラーログ確認
- [ ] `ingestMessageToMem0Safely()` が使用されているか確認

---

## 📊 進捗追跡

### 日別進捗（目安）

**Day 1-2**: Phase 3.1 ✅
**Day 3-5**: Phase 3.2 ⬜
**Day 6-8**: Phase 3.3 ⬜
**Day 9-12**: Phase 3.4 ⬜
**Day 13-14**: Phase 3.5 ⬜

### 完了マイルストーン

- [ ] **Milestone 1**: Phase 3.1完了（2日目）
- [ ] **Milestone 2**: Phase 3.2完了（5日目）
- [ ] **Milestone 3**: Phase 3.3完了（8日目）
- [ ] **Milestone 4**: Phase 3.4完了（12日目）
- [ ] **Milestone 5**: Phase 3完了（14日目）

---

**使い方**: 各作業完了時にチェックボックスにチェック ✅

**完了時**: すべてのチェックボックスが✅になったらPhase 3完了！
