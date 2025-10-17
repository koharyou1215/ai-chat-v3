# AI Chat V3 - Code Cleanup Checklist

**Based on**: ARCHITECTURE_ANALYSIS_REPORT.md
**Date**: 2025-10-17

---

## Phase 1: Dead Code Removal (即座に実行可能)

### ✅ 確実に削除できるファイル

#### 1. src/utils/map-helpers.ts (251行)
**理由**: 完全な重複ファイル。`src/utils/chat/map-helpers.ts`が実際に使用されている。

**削除コマンド**:
```bash
rm src/utils/map-helpers.ts
```

**確認済み**: どこからもインポートされていない ✅

---

#### 2. src/components/character/AppearancePanel.tsx
**理由**: `src/components/settings/SettingsModal/panels/AppearancePanel.tsx`に置き換え済み

**削除前の最終確認**:
```bash
grep -r "character/AppearancePanel" src/ --include="*.ts" --include="*.tsx"
```

**期待される結果**: マッチなし

**削除コマンド**:
```bash
rm src/components/character/AppearancePanel.tsx
```

---

### ⚠️ 確認が必要なファイル

#### 3. src/components/optimized/OptimizedSettingsModal.tsx
**理由**: どこからも使用されていない

**確認コマンド**:
```bash
grep -r "OptimizedSettingsModal" src/ --include="*.ts" --include="*.tsx"
```

**削除判断**:
- マッチなし → 削除OK
- マッチあり → 用途確認後に判断

**削除コマンド** (確認後):
```bash
rm src/components/optimized/OptimizedSettingsModal.tsx
```

---

#### 4. src/components/optimized/OptimizedChatInterface.tsx
#### 5. src/components/optimized/OptimizedMessageBubble.tsx
**理由**: ドキュメントのみで言及、実際のコードでは未使用

**確認コマンド**:
```bash
# ドキュメントとhistoryを除外して検索
grep -r "OptimizedChatInterface" src/ --include="*.ts" --include="*.tsx"
grep -r "OptimizedMessageBubble" src/ --include="*.ts" --include="*.tsx"
```

**削除判断**:
- 本番コードで使用なし → 削除OK
- 使用あり → パフォーマンス最適化戦略として保持

**削除コマンド** (確認後):
```bash
rm src/components/optimized/OptimizedChatInterface.tsx
rm src/components/optimized/OptimizedMessageBubble.tsx
```

---

#### 6. src/components/settings/SettingsModal/panels/EffectsPanel/MessageEffects.tsx
**理由**: `src/components/chat/MessageEffects.tsx`と重複の可能性

**確認手順**:
1. 両ファイルを読んで内容比較
2. 機能が同じなら片方削除
3. 異なる場合は名前を明確化

**確認コマンド**:
```bash
# 使用箇所を確認
grep -r "EffectsPanel/MessageEffects" src/ --include="*.ts" --include="*.tsx"
```

---

### テストディレクトリの統合

#### 現状の問題
- `src/test/` - 1ファイル (group-chat.test.md)
- `src/tests/` - 1ファイル (session-storage.test.ts)
- `src/services/__tests__/` - 1ファイル (inspiration-service.test.ts)

#### 統合手順
```bash
# 1. 統一ディレクトリ作成
mkdir -p src/__tests__

# 2. テストファイル移動
mv src/tests/session-storage.test.ts src/__tests__/
mv src/services/__tests__/inspiration-service.test.ts src/__tests__/

# 3. マークダウンテストファイルの移動（またはdocsへ）
mv src/test/group-chat.test.md claudedocs/

# 4. 空ディレクトリ削除
rmdir src/tests
rmdir src/test
rmdir src/services/__tests__
```

---

## Phase 1 実行後の検証

### TypeScript検証
```bash
npx tsc --noEmit
```

**期待**: エラー0件

### ビルド検証
```bash
npm run build
```

**期待**: ビルド成功

### Git確認
```bash
git status
git diff --stat
```

**期待される変更**:
- 削除: 3-6ファイル
- 削除行数: 700-1000行

---

## Phase 2: 重複コードの統合

### 1. MessageEffects.tsx の比較と統合

#### ステップ1: ファイル比較
```bash
# ファイルサイズ確認
wc -l src/components/chat/MessageEffects.tsx
wc -l src/components/settings/SettingsModal/panels/EffectsPanel/MessageEffects.tsx

# 差分確認
diff src/components/chat/MessageEffects.tsx \
     src/components/settings/SettingsModal/panels/EffectsPanel/MessageEffects.tsx
```

#### ステップ2: 統合判断
**ケース1: 完全に同じ → 片方削除**
```bash
# settings版を削除し、chat版を使用
rm src/components/settings/SettingsModal/panels/EffectsPanel/MessageEffects.tsx
# インポートパス更新
```

**ケース2: 異なる機能 → 名前を明確化**
```bash
# 例:
# - MessageEffects.tsx → ChatMessageEffects.tsx
# - EffectsPanel/MessageEffects.tsx → SettingsMessageEffects.tsx
```

---

### 2. API Manager の確認

#### 現状
- `simple-api-manager-v2.ts` - 使用中 ✅
- 旧`api-manager.ts` - 存在しない（削除済み） ✅

**アクション**: なし（すでに統合済み）

---

## Phase 2 実行後の検証

### インポートエラー確認
```bash
npx tsc --noEmit
```

### 機能テスト
1. チャット機能の動作確認
2. エフェクト設定の動作確認
3. 全体的なUI/UX確認

---

## 削除予定ファイル一覧

### 即座に削除可能 (確認済み)
- [ ] `src/utils/map-helpers.ts` (251行)

### 確認後に削除 (高確率)
- [ ] `src/components/character/AppearancePanel.tsx` (~200行)
- [ ] `src/components/optimized/OptimizedSettingsModal.tsx` (~150行)
- [ ] `src/components/optimized/OptimizedChatInterface.tsx` (~300行)
- [ ] `src/components/optimized/OptimizedMessageBubble.tsx` (~150行)

### 要調査
- [ ] `src/components/settings/SettingsModal/panels/EffectsPanel/MessageEffects.tsx`

---

## 推定削除コード量

**最小**: 700行 (map-helpers + AppearancePanel + OptimizedSettings)
**最大**: 1200行 (上記 + OptimizedChat + OptimizedBubble + MessageEffects)

---

## 実行タイミング

### 推奨スケジュール
1. **Phase 1 (今すぐ実行可能)**:
   - 時間: 30分-1時間
   - リスク: 低
   - 影響: 即座にコードベース削減

2. **Phase 2 (Phase 1完了後)**:
   - 時間: 2-4時間
   - リスク: 中
   - 影響: 重複排除、保守性向上

---

## 実行コマンドまとめ (Phase 1)

```bash
#!/bin/bash
# AI Chat V3 - Phase 1 Cleanup Script

echo "🧹 Phase 1: Dead Code Removal"

# 1. 確実な削除
echo "Deleting confirmed dead code..."
rm src/utils/map-helpers.ts
echo "✅ Deleted src/utils/map-helpers.ts"

# 2. 確認付き削除
echo ""
echo "Checking OptimizedSettingsModal usage..."
if ! grep -r "OptimizedSettingsModal" src/ --include="*.ts" --include="*.tsx" -q; then
  rm src/components/optimized/OptimizedSettingsModal.tsx
  echo "✅ Deleted OptimizedSettingsModal.tsx"
else
  echo "⚠️ OptimizedSettingsModal is still used, skipping"
fi

# 3. テストディレクトリ統合
echo ""
echo "Consolidating test directories..."
mkdir -p src/__tests__
mv src/tests/session-storage.test.ts src/__tests__/ 2>/dev/null
mv src/services/__tests__/inspiration-service.test.ts src/__tests__/ 2>/dev/null
mv src/test/group-chat.test.md claudedocs/ 2>/dev/null
rmdir src/tests 2>/dev/null
rmdir src/test 2>/dev/null
rmdir src/services/__tests__ 2>/dev/null
echo "✅ Test directories consolidated"

# 4. 検証
echo ""
echo "🔍 Running TypeScript validation..."
npx tsc --noEmit

echo ""
echo "✅ Phase 1 Complete!"
echo "📊 Check git status for changes:"
git status --short
```

**使用方法**:
```bash
# スクリプトを保存
cat > cleanup-phase1.sh << 'EOF'
# 上記のスクリプト内容
EOF

# 実行権限付与
chmod +x cleanup-phase1.sh

# 実行
./cleanup-phase1.sh
```

---

**更新日**: 2025-10-17
**ステータス**: Ready for Execution
