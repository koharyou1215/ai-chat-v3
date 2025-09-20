# Mem0システム実装計画書

## 📅 作成日: 2025-09-20
## 📊 バージョン: 1.0

---

## 🎯 実装概要

### 目的
キャラクター管理システムとMem0を統合し、以下を実現する：
1. **キャラクターコア（芯）の保持** - JSONファイルの不変定義を毎回送信
2. **動的記憶管理** - 関係性・学習内容をMem0で効率的に管理
3. **トークン最適化** - 70%以上のトークン削減

### 現状と目標

| 項目 | 現状 | 目標 |
|------|------|------|
| トークン使用量 | 10,000-15,000 | 3,000-4,000 |
| 記憶管理 | 分散（4システム） | 統合（2+1システム） |
| 関係性追跡 | 静的 | 動的・進化型 |
| 長期記憶 | 制限あり | 無制限・圧縮保存 |

---

## 📐 アーキテクチャ設計

### システム構成図

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                 │
├─────────────────────────────────────────────────────┤
│                   Zustand Store                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │Character │  │  Memory  │  │ Tracker  │         │
│  │  Slice   │  │  Slice   │  │  Manager │         │
│  └──────────┘  └──────────┘  └──────────┘         │
├─────────────────────────────────────────────────────┤
│                  Service Layer                       │
│  ┌──────────────────────────────────────┐          │
│  │         Mem0 Service (Core)          │          │
│  │  ┌──────────┐  ┌──────────┐        │          │
│  │  │Character │  │  Memory  │        │          │
│  │  │  Core    │  │  Engine  │        │          │
│  │  └──────────┘  └──────────┘        │          │
│  └──────────────────────────────────────┘          │
├─────────────────────────────────────────────────────┤
│                  Storage Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │   JSON   │  │  Vector  │  │  Memory  │         │
│  │  Files   │  │  Store   │  │  Cards   │         │
│  └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────────────────────────────────┘
```

---

## 📋 実装タスク詳細

### Phase 1: 基盤構築（優先度: 🔴 高）

#### Task 1.1: Mem0キャラクターサービス実装
- **ファイル**: `src/services/mem0/character-service.ts`
- **内容**:
  ```typescript
  class Mem0CharacterService implements IMem0CharacterService {
    // CharacterCore管理
    loadCharacterCore(characterId: UUID): Promise<CharacterCore>

    // 関係性管理
    getRelationship(characterId: UUID, userId: string): Promise<RelationshipState>
    updateRelationship(...): Promise<void>

    // 記憶管理
    getCharacterMemory(characterId: UUID): Promise<CharacterMemory>
    learnFromConversation(messages: UnifiedMessage[]): Promise<void>
  }
  ```
- **依存**: 型定義（完了）
- **推定時間**: 4時間

#### Task 1.2: CharacterCore変換ユーティリティ
- **ファイル**: `src/utils/character/core-converter.ts`
- **内容**: 既存Character型からCharacterCoreへの変換
- **推定時間**: 2時間

#### Task 1.3: Mem0 promoteToMemoryCard実装
- **ファイル**: `src/services/mem0/core.ts`（更新）
- **内容**: スタブから実装へ移行
- **推定時間**: 3時間

### Phase 2: 統合実装（優先度: 🟡 中）

#### Task 2.1: PromptBuilder統合
- **ファイル**: `src/services/prompt-builder.service.ts`（更新）
- **変更内容**:
  ```typescript
  // Before: 全キャラクター情報を含める
  // After: CharacterCore + Mem0動的記憶
  async buildPrompt(session, userInput) {
    const core = await Mem0Character.loadCharacterCore(characterId);
    const memories = await Mem0.search(userInput, { characterId });
    // ...
  }
  ```
- **推定時間**: 3時間

#### Task 2.2: メッセージ処理統合
- **ファイル**: `src/store/slices/chat/chat-message-operations.ts`（更新）
- **内容**: addMessageでMem0.ingestMessage呼び出し追加
- **推定時間**: 2時間

#### Task 2.3: ConversationManager統合
- **ファイル**: `src/services/memory/conversation-manager.ts`（更新）
- **内容**: Mem0を通じた記憶取得に切り替え
- **推定時間**: 3時間

### Phase 3: 最適化（優先度: 🟢 低）

#### Task 3.1: バッチ処理実装
- **内容**: 複数メッセージの一括処理
- **推定時間**: 2時間

#### Task 3.2: キャッシング実装
- **内容**: 頻繁にアクセスされる記憶のキャッシュ
- **推定時間**: 2時間

#### Task 3.3: トークン最適化
- **内容**: 動的トークン配分アルゴリズム
- **推定時間**: 3時間

---

## 🛡️ リスク評価と対策

### リスク分析

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存機能の破壊 | 高 | 中 | フィーチャーフラグで段階的有効化 |
| パフォーマンス低下 | 中 | 低 | キャッシング、非同期処理 |
| データ不整合 | 高 | 低 | トランザクション処理、バックアップ |
| トークン増加 | 中 | 低 | 厳密なトークン管理、モニタリング |

### 対策詳細

#### 1. フィーチャーフラグ実装
```typescript
// src/config/features.ts
export const FEATURES = {
  MEM0_CHARACTER_INTEGRATION: process.env.ENABLE_MEM0_CHARACTER === 'true',
  MEM0_MEMORY_CARDS: process.env.ENABLE_MEM0_CARDS === 'true',
};

// 使用例
if (FEATURES.MEM0_CHARACTER_INTEGRATION) {
  // 新実装
} else {
  // 既存実装
}
```

#### 2. 段階的移行戦略
- **Stage 1**: 読み取り専用でMem0を並行稼働
- **Stage 2**: 新規データからMem0に保存開始
- **Stage 3**: 既存データの移行
- **Stage 4**: 完全切り替え

#### 3. ロールバック計画
- データバックアップを移行前に実施
- 既存システムを1ヶ月間は維持
- 問題発生時は即座に旧システムに切り戻し

---

## 📊 成功指標

### 定量的指標
- [ ] トークン使用量 70%削減
- [ ] API応答時間 30%改善
- [ ] メモリ使用量 50%削減

### 定性的指標
- [ ] キャラクターの一貫性維持
- [ ] 関係性の自然な進化
- [ ] 長期記憶の適切な保持

---

## 📚 参考資料

### 関連ファイル
- `src/types/mem0/character-memory.types.ts` - 型定義
- `メモリー最適化計画.txt` - 全体計画
- `Character,User Persona Type Definitive Format.md` - キャラクター仕様

### 技術仕様
- Mem0: 統合記憶管理システム
- VectorStore: ベクトル検索エンジン
- TrackerManager: 数値状態管理（維持）

---

## 🚀 実装開始チェックリスト

### 実装前確認
- [x] 現状分析完了
- [x] 設計図作成
- [x] 型定義整備
- [x] タスク計画作成
- [x] リスク評価完了
- [ ] バックアップ実施
- [ ] 開発環境準備
- [ ] テストケース設計

### 実装準備完了度: 90%

---

## 📝 更新履歴

| 日付 | バージョン | 更新内容 |
|------|------------|----------|
| 2025-09-20 | 1.0 | 初版作成 |

---

## ⚠️ 注意事項

1. **既存機能の保護**: 現在動作している機能を破壊しない
2. **段階的実装**: 一度にすべてを変更せず段階的に進める
3. **テスト重視**: 各フェーズ完了後に必ず動作確認
4. **ドキュメント更新**: 実装と並行してドキュメント更新

---

## 次のステップ

1. バックアップの実施
2. Phase 1.1 から実装開始
3. 各タスク完了後の動作確認
4. フィードバックに基づく調整