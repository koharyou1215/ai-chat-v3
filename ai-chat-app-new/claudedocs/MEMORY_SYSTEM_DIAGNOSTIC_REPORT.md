# メモリーシステム診断レポート

**作成日**: 2025-11-04
**目的**: メモリーシステムの安全な修復計画策定のための診断
**スコープ**: AutoMemoryManager、ConversationManager、Mem0、VectorStore

---

## 🔴 診断結果サマリー

### 重大な問題（Critical）
1. **重複したVectorStore実装** - ConversationManagerとMem0で独立したVectorStoreインスタンス
2. **Tracker情報がプロンプトに2回挿入** - Line 610とLine 722で重複
3. **過去のリファクタリング計画が未実装** - CONVERSATION_MANAGER_DISTRIBUTION_PLAN.mdが放置

### 高リスク（High）
4. **AutoMemoryManagerの閾値が低すぎる** - 0.3（推奨0.6以上）
5. **ConversationManagerが1,577行の巨大クラス** - テスト困難、バグ多発の原因
6. **メモリー生成ロジックが3箇所に分散** - AutoMemoryManager、ConversationManager、Mem0

### 中リスク（Medium）
7. **MemoryLayerManagerが実質未使用** - 実装されているが効果なし
8. **プロンプトが14セクション構成** - AIが混乱する可能性

---

## 📊 依存関係マップ

### 現在のアーキテクチャ（問題あり）

```
┌─────────────────────────────────────────────────────────────┐
│ Chat Operations (message-send-handler.ts)                   │
│  ├─ AutoMemoryManager.processNewMessage() ← 削除候補         │
│  ├─ ConversationManager (PromptBuilderService経由)           │
│  │   ├─ VectorStore (独自インスタンス) ← 重複！              │
│  │   ├─ MemoryLayerManager ← 不要                            │
│  │   ├─ DynamicSummarizer                                    │
│  │   └─ Mem0.search() を呼ぶ                                 │
│  └─ Mem0.ingestMessage() ← 正しい                            │
│      └─ VectorStore (Mem0専用) ← 重複！                      │
└─────────────────────────────────────────────────────────────┘
```

### AutoMemoryManager使用箇所（3箇所）

```
1. src/store/slices/chat/operations/message-send-handler.ts:593
   └─ autoMemoryManager.processNewMessage() (感情メモリー有効時)

2. src/store/slices/chat/chat-progressive-handler.ts:878
   └─ autoMemoryManager.processNewMessage() (プログレッシブモード)

3. src/store/slices/groupChat.slice.ts:553
   └─ autoMemoryManager.processNewMessage() (グループチャット)
```

### ConversationManager使用箇所

```
1. src/services/prompt-builder.service.ts
   └─ new ConversationManager() (キャッシュ管理)
   └─ generatePrompt() 呼び出し

2. 各所でimport (16ファイル)
   └─ プロンプト生成、メモリー管理、コンテキスト構築
```

---

## ⚠️ 過去の失敗パターン分析

### パターン1: 「大規模な一括リファクタリング」
**証拠**: `CONVERSATION_MANAGER_DISTRIBUTION_PLAN.md`

**計画内容**:
- ConversationManagerを6つのモジュールに分割
- 414行のgeneratePrompt()をセクションベースに再構築
- 1,504行を180行のオーケストレーターに縮小

**失敗理由（推測）**:
- ❌ 一度に全部変更しようとした
- ❌ テストが不十分
- ❌ 既存コードとの互換性が取れなかった
- ❌ ロールバックポイントがなかった

**教訓**: **段階的な移行が必須**

---

### パターン2: 「新旧システムの並行稼働失敗」
**証拠**: ConversationManagerとMem0の重複

**現状**:
- ConversationManagerが独自VectorStoreを持つ
- Mem0も独自VectorStoreを持つ
- 両方が同じメッセージを処理（二重処理）

**失敗理由（推測）**:
- ❌ 完全移行前に両方が動いている
- ❌ どちらが「正」か不明確
- ❌ データの一貫性が保証されない

**教訓**: **単一の真実の源（Single Source of Truth）を明確にする**

---

### パターン3: 「メモリー生成ロジックの分散」
**証拠**: AutoMemoryManager、ConversationManager、Mem0に分散

**現状**:
```typescript
// 場所1: AutoMemoryManager (auto-memory-manager.ts:111)
private async shouldCreateMemoryCard() {
  const totalScore = ... // 複雑な計算
  return totalScore >= this.IMPORTANCE_THRESHOLD; // 0.3
}

// 場所2: ConversationManager (conversation-manager.ts:913)
private async shouldAutoPinMessage() {
  if (message.memory?.importance?.score >= 0.8) return true;
  // ...
}

// 場所3: Mem0 (core.ts:74)
async promoteToMemoryCard(summary: string, meta: Partial<MemoryCard>) {
  // メモリーカード生成ロジック
}
```

**問題**:
- ❌ 3箇所で異なる基準
- ❌ どれが実際に動いているか不明
- ❌ 設定変更時に全部変える必要

**教訓**: **ロジックは1箇所に集約**

---

## 🎯 リスク評価マトリックス

| 修正対象 | 影響範囲 | 破壊リスク | 優先度 |
|---------|---------|-----------|--------|
| AutoMemoryManager削除 | 3ファイル | 🔴 HIGH | P1 |
| VectorStore統一 | ConversationManager全体 | 🔴 HIGH | P2 |
| Tracker重複削除 | generatePrompt() | 🟡 MEDIUM | P3 |
| MemoryLayerManager削除 | ConversationManager | 🔴 HIGH | P4 |
| プロンプト最適化 | generatePrompt() | 🟡 MEDIUM | P5 |

### リスク詳細

#### 🔴 HIGH RISK: AutoMemoryManager削除
**影響ファイル**:
- message-send-handler.ts
- chat-progressive-handler.ts
- groupChat.slice.ts

**懸念事項**:
- 削除後、Mem0.promoteToMemoryCard()が動作するか？
- 既存のメモリーカード生成ロジックが止まらないか？
- 感情メモリー機能（emotional_memory_enabled）が壊れないか？

**緩和策**:
1. Mem0.promoteToMemoryCard()の完全実装確認
2. 段階的移行（まずログ出力のみ）
3. フィーチャーフラグ導入

---

#### 🔴 HIGH RISK: VectorStore統一
**影響範囲**: ConversationManager全体

**現在の状態**:
```typescript
// ConversationManager.ts:65
this.vectorStore = new VectorStore(); // 独自インスタンス

// Mem0 core.ts:21
this.vectorStore = new VectorStore(); // 別インスタンス
```

**問題**:
- 同じメッセージが2つのVectorStoreに保存される
- メモリー使用量2倍
- 検索結果が一致しない可能性

**緩和策**:
1. Mem0のVectorStoreを「正」とする
2. ConversationManagerからMem0.search()を呼ぶように変更
3. 既存のVectorStoreは段階的に削除

---

## 📋 安全な修復計画の要件

### 必須要件
1. ✅ **段階的実装** - 1機能ずつ修正
2. ✅ **ロールバック可能** - 各ステップで元に戻せる
3. ✅ **テスト可能** - 修正前後で動作確認
4. ✅ **フィーチャーフラグ** - 新旧を切り替え可能
5. ✅ **ログ出力** - 動作を追跡可能

### 推奨アプローチ
1. **Phase 1: 診断と準備**（現在地）
2. **Phase 2: AutoMemoryManager → Mem0移行**（最小リスク）
3. **Phase 3: VectorStore統一**（中リスク）
4. **Phase 4: プロンプト最適化**（低リスク）
5. **Phase 5: ConversationManager簡素化**（高リスク、最後）

---

## 次のステップ

1. ✅ 診断完了
2. ⏳ 段階的修復計画の詳細策定
3. ⏳ プロンプト構築最適化案の作成
4. ⏳ ユーザー承認待ち
5. ⏳ Phase 2実装開始

---

**診断者**: Claude Code (Sonnet 4.5)
**ステータス**: 診断完了、計画策定中
