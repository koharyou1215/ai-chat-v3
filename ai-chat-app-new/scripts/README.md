# 🛠️ プロジェクト状態管理ツール

このディレクトリには、AI Chat V3 プロジェクトの状態を追跡・管理するためのツールが含まれています。

## 🎯 解決する問題

- **機能の退行検出**: 変更後に機能が動作しなくなることを防ぐ
- **状態の可視化**: プロジェクトの健康状態を数値で把握
- **変更履歴の自動記録**: 手動説明の負担を削減
- **差分分析**: 変更前後の影響を自動分析

## 🚀 ツール一覧

### 1. feature-test.js - 機能テストスイート
プロジェクトの主要機能が正常動作するかを自動確認

```bash
# 機能テスト実行
node scripts/feature-test.js

# 結果確認
cat claudedocs/test-results.json
```

**テスト項目:**
- ✅ 主要ファイルの存在確認
- ✅ TypeScript構文チェック
- ✅ インポート整合性チェック  
- ✅ 設定値確認
- ✅ 感情知能システム状態確認

### 2. pre-commit-check.js - 変更前状態記録
コミット前にプロジェクト状態のスナップショットを自動保存

```bash
# Git hookとして設定（推奨）
echo "node scripts/pre-commit-check.js" > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# 手動実行
node scripts/pre-commit-check.js
```

**記録内容:**
- TypeScriptエラー数
- 変更ファイルリスト
- プロジェクト統計情報
- タイムスタンプ付きスナップショット

### 3. feature-diff.js - 機能差分分析
変更前後の差分を分析し、影響を評価

```bash
# 最新の変更分析
node scripts/feature-diff.js

# 差分レポート確認
cat claudedocs/latest-diff-report.json
```

**分析内容:**
- 📊 指標変化（エラー数、ファイル数、コード量）
- 🎯 変更評価（positive/negative/neutral）
- 💡 推奨事項の自動生成
- 🧪 機能テスト結果との相関分析

## 📋 使用フロー

### 作業開始前
```bash
# 1. 現在の状態を記録
node scripts/pre-commit-check.js

# 2. 機能テストでベースライン確認
node scripts/feature-test.js
```

### 作業完了後
```bash
# 1. 機能テストで動作確認
node scripts/feature-test.js

# 2. 差分分析で影響評価
node scripts/feature-diff.js

# 3. 問題なければコミット（自動でスナップショット記録）
git add .
git commit -m "変更内容"
```

### 問題発生時
```bash
# 1. 差分分析で原因特定
node scripts/feature-diff.js

# 2. スナップショット履歴確認
cat claudedocs/project-snapshots.jsonl | tail -5

# 3. 機能テストで詳細確認
node scripts/feature-test.js

# 4. 状態追跡ドキュメント確認
cat claudedocs/project-state-tracker.md
```

## 📁 生成ファイル

```
claudedocs/
├── project-state-tracker.md    # 手動更新する状態追跡ドキュメント
├── project-snapshots.jsonl     # 時系列スナップショットデータ
├── test-results.json           # 最新の機能テスト結果
└── latest-diff-report.json     # 最新の差分分析レポート
```

## 🎯 ベストプラクティス

### 1. 定期実行
- 作業開始前に必ず機能テスト実行
- 重要な変更前後でスナップショット記録
- 週次で差分分析レポート確認

### 2. Git hookの活用
```bash
# pre-commit hook設定（推奨）
#!/bin/sh
node scripts/pre-commit-check.js
exit $?
```

### 3. CI/CDとの連携
```yaml
# .github/workflows/feature-test.yml (例)
name: Feature Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run feature tests
        run: node scripts/feature-test.js
```

## 🔧 カスタマイズ

各ツールは用途に応じてカスタマイズ可能：

- `feature-test.js`: テスト項目の追加・変更
- `pre-commit-check.js`: 記録する指標の拡張
- `feature-diff.js`: 評価ロジックの調整

## 🚨 トラブルシューティング

### TypeScriptエラーで機能テストが失敗
```bash
# エラー詳細確認
npx tsc --noEmit

# 主要機能のみテスト
node scripts/feature-test.js --basic-only
```

### スナップショットが記録されない
```bash
# 権限確認
ls -la claudedocs/

# 手動記録
node scripts/pre-commit-check.js
```

## 📊 メトリクス指標

| 指標 | 良い状態 | 注意が必要 | 危険 |
|------|----------|------------|------|
| TypeScriptエラー | <50 | 50-200 | >200 |
| テスト成功率 | >90% | 70-90% | <70% |
| コード量変化 | ±100行 | ±500行 | ±1000行+ |