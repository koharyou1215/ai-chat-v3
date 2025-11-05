# 🔄 新セッション引き継ぎ - コード品質改善プロジェクト

**作成日**: 2025-10-30
**優先度**: 🔴 HIGH
**推定期間**: 1-8週間（Phase により変動）

---

## 📌 30秒サマリー

AI Chat V3の**コード品質改善プロジェクト**を実施中。
型安全性、テストカバレッジ、保守性の向上が目標。

**現状**: 総合評価 5.2/10
**目標**: 総合評価 8.5/10 以上

---

## 🎯 クイックスタート (3ステップ)

### Step 1: 現状確認 (2分)

```bash
# リポジトリ状態確認
git status && git log --oneline -3

# 品質メトリクス確認
grep -r ": any" src/ | wc -l        # 目標: <200 (Phase1)
npm run test:coverage 2>/dev/null | tail -5  # 目標: >15% (Phase1)
```

### Step 2: ドキュメント確認 (3分)

```markdown
必読ドキュメント (優先順):
1. 📄 claudedocs/QUALITY_IMPROVEMENT_QUICK_REFERENCE.md  ← まずここ
2. 📘 claudedocs/CODE_QUALITY_IMPROVEMENT_MASTER_PLAN.md
3. 📗 🎯 AI Chat V3 完全開発ガイド.md
```

### Step 3: タスク選択 (5分)

```markdown
優先タスク:
  🔴 Phase 1 (1-2週間): 型安全性改善
  🟡 Phase 2 (2-4週間): 構造改善
  🟢 Phase 3 (4-8週間): 品質向上

今日のおすすめタスク:
  □ message-send-handler.ts の型安全化 (4h)
  □ simple-api-manager-v2.test.ts 作成 (4h)
```

---

## 📊 プロジェクト状況

### 重要指標

| メトリクス | 現状 | Phase1 | Phase2 | Phase3 |
|----------|------|--------|--------|--------|
| any型使用 | 347回 | 200回 | 100回 | 0回 |
| テストカバレッジ | <1% | 15% | 30% | 80% |
| console.log | 2015回 | 1000回 | 100回 | 0回 |
| 最大ファイル | 1543行 | - | 800行 | 500行 |

### 主要課題

```
1. 🔴 型安全性の欠如
   - 93ファイルで347回のany型使用
   - 影響: ランタイムエラー、IDE補完不全

2. 🔴 テスト不足
   - 推定カバレッジ < 1%
   - 既存テスト: わずか3ファイル

3. 🟡 巨大ファイル
   - 1000行超: 5ファイル
   - 保守性低下のリスク

4. 🟡 デバッグコード
   - 164ファイルで2015回のconsole使用
   - 本番パフォーマンス影響
```

---

## 🚀 即実行可能タスク

### ⚡ 5分タスク

```bash
# ESLint設定追加
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
# .eslintrc.json を QUICK_REFERENCE.md からコピー
```

### ⚡ 30分タスク

```typescript
// message-send-handler.ts の any型削減
// QUICK_REFERENCE.md の「型安全化テンプレート」参照

// Before (10箇所の any)
const data: any = await response.json();

// After
const data: unknown = await response.json();
if (!isValidAPIResponse(data)) {
  throw new TypeError('Invalid response');
}
```

### ⚡ 1時間タスク

```typescript
// simple-api-manager-v2.test.ts 作成
// QUICK_REFERENCE.md の「ユニットテストテンプレート」参照

describe('SimpleAPIManagerV2', () => {
  // テストケース実装
});
```

---

## 📁 重要ファイル一覧

### 優先度の高いファイル (Phase 1)

```
型安全化が必要:
  □ src/store/slices/chat/operations/message-send-handler.ts (10箇所)
  □ src/components/chat/MessageBubble.tsx (8箇所)
  □ src/store/index.ts (7箇所)
  □ src/components/chat/ChatInterface.tsx (6箇所)

テスト追加が必要:
  □ src/services/simple-api-manager-v2.ts
  □ src/services/memory/conversation-manager.ts
  □ src/services/prompt-builder.service.ts
  □ src/store/slices/chat.slice.ts
```

### 巨大ファイル (Phase 2)

```
リファクタリング対象:
  □ src/services/memory/conversation-manager.ts (1,543行)
  □ src/store/slices/groupChat.slice.ts (1,472行)
  □ src/components/chat/ChatInterface.tsx (1,255行)
  □ src/components/chat/MessageBubble.tsx (1,165行)
  □ src/services/prompt-builder.service.ts (981行)
```

---

## 🔧 コピペ用コマンド

### 開発環境セットアップ

```bash
# 依存関係インストール
npm install -D \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint-config-prettier \
  prettier \
  husky \
  lint-staged

# Husky セットアップ
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

### 品質チェック

```bash
# 型エラー確認
npx tsc --noEmit

# Lint実行
npm run lint

# テスト実行
npm run test

# カバレッジ確認
npm run test:coverage

# any型カウント
grep -r ": any" src/ | wc -l

# console.logカウント
grep -r "console.log" src/ | wc -l
```

### よく使うコマンド

```bash
# ファイルサイズ確認 (上位10)
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -n | tail -11

# 特定ファイルのany型確認
grep -n ": any" src/services/simple-api-manager-v2.ts

# 特定ディレクトリのテストカバレッジ
npm run test:coverage -- src/services
```

---

## 🎓 学習リソース

### テンプレート集 (QUICK_REFERENCE.md より)

1. **型安全化テンプレート**: API応答、イベントハンドラー、ユーティリティ
2. **ユニットテストテンプレート**: サービス層、ストア層、コンポーネント
3. **ロガーテンプレート**: console.log の置き換え

### 実装パターン

```typescript
// パターン1: 型ガード
function isValidData(data: unknown): data is DataType {
  return typeof data === 'object' && data !== null && 'property' in data;
}

// パターン2: テスト (AAA)
it('should work', () => {
  // Arrange (準備)
  const input = 'test';

  // Act (実行)
  const result = fn(input);

  // Assert (検証)
  expect(result).toBe('expected');
});

// パターン3: ロギング
logger.info('Event occurred', { userId, action });
```

---

## ✅ チェックリスト: 今日の作業

```markdown
作業開始前:
  □ git pull origin main
  □ npm install
  □ 品質メトリクス確認

作業中:
  □ TDDアプローチ (テスト → 実装)
  □ 小さくコミット (1ファイル = 1コミット)
  □ 型エラー0を維持

作業完了時:
  □ npx tsc --noEmit (成功)
  □ npm run lint (成功)
  □ npm run test (成功)
  □ git commit -m "meaningful message"
```

---

## 🚦 Phase完了基準

### Phase 1 (1-2週間)

```bash
✅ any型使用: 200以下
✅ テストカバレッジ: 15%以上
✅ console.log: 1000以下
✅ 主要8ファイルの型安全化完了
✅ 8つのテストファイル追加
```

### Phase 2 (2-4週間)

```bash
✅ any型使用: 100以下
✅ テストカバレッジ: 30%以上
✅ 最大ファイルサイズ: 800行以下
✅ ESLint設定完了、エラー0件
✅ 20以上のテストファイル追加
```

### Phase 3 (4-8週間)

```bash
✅ any型使用: 0
✅ テストカバレッジ: 80%以上
✅ Lighthouse Performance: 90+
✅ 全コンポーネントテスト完了
✅ ドキュメント整備完了
```

---

## 💬 よくある質問

**Q: どこから始めればいい？**
A: `message-send-handler.ts`の型安全化がおすすめ（4時間、高影響）

**Q: テストの書き方がわからない**
A: `QUICK_REFERENCE.md`のテンプレートをコピペして使用

**Q: リファクタリングで既存機能が壊れないか心配**
A: 必ずテストを先に書き、リファクタリング後もテストが通ることを確認

**Q: 時間がない場合の優先順位は？**
A: Phase 1の型安全化のみでも大きな効果あり

---

## 📞 困ったときは

### トラブルシューティング

```markdown
1. TypeScriptエラー
   → QUICK_REFERENCE.md「トラブルシューティング」参照

2. テストが失敗
   → vi.mock の設定を確認

3. ESLintエラー多数
   → 段階的に修正（1ルールずつ）

4. ビルドエラー
   → npm run type-check で型エラー特定
```

### サポートリソース

- **詳細ガイド**: `CODE_QUALITY_IMPROVEMENT_MASTER_PLAN.md`
- **コードテンプレート**: `QUALITY_IMPROVEMENT_QUICK_REFERENCE.md`
- **プロジェクト全体**: `🎯 AI Chat V3 完全開発ガイド.md`

---

## 🎯 今日のゴール設定

### おすすめゴール (選択してチェック)

```markdown
□ Option A (4時間): message-send-handler.ts 型安全化
□ Option B (4時間): simple-api-manager-v2.test.ts 作成
□ Option C (2時間): ESLint設定 + ロガー実装
□ Option D (8時間): conversation-manager.ts リファクタリング
□ Option E (1時間): 品質メトリクス確認 + 小タスク
```

---

## 📈 進捗記録テンプレート

```markdown
## [日付] 作業記録

### 完了タスク
- [ ] ファイル名: 作業内容

### メトリクス更新
- any型: [現在] → [変更後]
- カバレッジ: [現在%] → [変更後%]

### 学んだこと
-

### 次回タスク
1.
2.
```

---

## 🚀 開始コマンド

```bash
# このコマンドを実行して今すぐ開始！
cd /c/ai-chat-v3/ai-chat-app-new
git status
npm run type-check
echo "準備完了！ QUICK_REFERENCE.md を開いてタスクを選択してください"
```

---

**新しいセッションでこのドキュメントを最初に開き、3ステップで作業を開始できます！**

詳細が必要な場合:
1. `QUALITY_IMPROVEMENT_QUICK_REFERENCE.md` - 実装テンプレート
2. `CODE_QUALITY_IMPROVEMENT_MASTER_PLAN.md` - 完全なマスタープラン
