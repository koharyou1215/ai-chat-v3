# Phase 1 Validation Instructions

**Date**: 2025-10-04
**Purpose**: サーバーを停止して`generatePromptV2`の完全一致を確認
**Status**: 準備完了

---

## 🎯 検証の目的

`generatePrompt()` (V1) と `generatePromptV2()` (V2) が**完全に同じ出力**を生成することを確認します。

**なぜサーバーを止める必要があるのか**:
- ✅ Hot Reloadの影響を排除
- ✅ ファイルキャッシュの問題を回避
- ✅ 純粋な関数の動作を確認
- ✅ 再現性のある環境でテスト

---

## 📋 検証手順（推奨）

### ステップ1: 開発サーバーを停止

```bash
# 現在実行中のサーバーを確認
netstat -ano | findstr :3000

# プロセスIDを確認して停止
powershell "Stop-Process -Id [PID] -Force"

# または、サーバーのターミナルでCtrl+C
```

**確認**: `http://localhost:3000`にアクセスしてサーバーが停止していることを確認

### ステップ2: 検証スクリプトを準備

検証スクリプトは既に作成済みです：
- **場所**: `scripts/validate-prompt-v2.ts`
- **テストケース**: 8種類（minimal → full context → edge cases）

### ステップ3: 検証を実行

**⚠️ 重要**: ConversationManagerの依存関係が複雑なため、2つのアプローチがあります

#### アプローチA: 手動コンソール検証（推奨・簡単）

実際のアプリケーションコード内で検証：

```typescript
// src/components/chat/ChatInterface.tsx など、実際に使用している場所で

async function testPromptV2() {
  const manager = this.conversationManager; // 既存のインスタンスを使用

  // テストケース1: Minimal
  const v1_minimal = await manager.generatePrompt('こんにちは');
  const v2_minimal = await manager.generatePromptV2('こんにちは');
  console.log('Minimal match:', v1_minimal === v2_minimal);
  console.log('V1 length:', v1_minimal.length);
  console.log('V2 length:', v2_minimal.length);

  // テストケース2: With Character
  const v1_char = await manager.generatePrompt(
    '元気ですか？',
    this.currentCharacter,
    this.userPersona
  );
  const v2_char = await manager.generatePromptV2(
    '元気ですか？',
    this.currentCharacter,
    this.userPersona
  );
  console.log('Character match:', v1_char === v2_char);

  // テストケース3: Full Context with Settings
  const v1_full = await manager.generatePrompt(
    'テストメッセージ',
    this.currentCharacter,
    this.userPersona,
    this.systemSettings
  );
  const v2_full = await manager.generatePromptV2(
    'テストメッセージ',
    this.currentCharacter,
    this.userPersona,
    this.systemSettings
  );
  console.log('Full context match:', v1_full === v2_full);

  // 詳細な比較（不一致の場合）
  if (v1_full !== v2_full) {
    for (let i = 0; i < Math.max(v1_full.length, v2_full.length); i++) {
      if (v1_full[i] !== v2_full[i]) {
        console.error('First difference at position:', i);
        console.error('V1 char:', v1_full[i], 'code:', v1_full.charCodeAt(i));
        console.error('V2 char:', v2_full[i], 'code:', v2_full.charCodeAt(i));
        console.error('Context V1:', v1_full.substring(i-50, i+50));
        console.error('Context V2:', v2_full.substring(i-50, i+50));
        break;
      }
    }
  }
}

// 実行
testPromptV2();
```

**実行方法**:
1. 上記コードを一時的にチャットコンポーネントに追加
2. ブラウザの開発者ツールを開く（F12）
3. チャット画面を開く
4. コンソールで結果を確認

#### アプローチB: スタンドアロンスクリプト（後日対応）

`scripts/validate-prompt-v2.ts`を使用しますが、ConversationManagerの依存関係を解決する必要があります：

```bash
# 依存関係を解決後
npm run validate:prompt-v2
```

**現状**: ConversationManagerは以下を必要とします
- VectorStore
- MemoryLayerManager
- DynamicSummarizer
- TrackerManager

これらのモックを作成する必要があります（複雑）。

---

## ✅ 検証の成功基準

### 必須条件（100%達成必須）

- [ ] **完全一致**: `v1 === v2` が `true`
- [ ] **長さ一致**: `v1.length === v2.length`
- [ ] **MD5一致**: MD5ハッシュが同じ
- [ ] **エラーなし**: 例外が発生しない

### テストケース（すべて通過必須）

1. [ ] Minimal: キャラクター/ペルソナなし
2. [ ] Character only: キャラクターのみ
3. [ ] Persona only: ペルソナのみ
4. [ ] Full context: キャラクター + ペルソナ
5. [ ] With settings: カスタムシステムプロンプト
6. [ ] Long input: 長いユーザー入力
7. [ ] Special chars: 特殊文字・絵文字
8. [ ] Disabled settings: 無効化されたプロンプト設定

---

## 🔍 検証結果の記録

### テンプレート

```markdown
## Phase 1 Validation Results

**Date**: [日付]
**Tester**: [名前]
**Environment**: Windows, Node 20.x

### Test Results

| Test Case | V1 === V2 | V1 Length | V2 Length | Status |
|-----------|-----------|-----------|-----------|--------|
| Minimal | ✅ | 1234 | 1234 | PASS |
| Character only | ✅ | 2345 | 2345 | PASS |
| Persona only | ✅ | 1456 | 1456 | PASS |
| Full context | ✅ | 3456 | 3456 | PASS |
| With settings | ✅ | 3678 | 3678 | PASS |
| Long input | ✅ | 4567 | 4567 | PASS |
| Special chars | ✅ | 2234 | 2234 | PASS |
| Disabled settings | ✅ | 2345 | 2345 | PASS |

### Summary

- **Total Tests**: 8
- **Passed**: 8
- **Failed**: 0
- **Pass Rate**: 100%

### Conclusion

✅ All tests passed. generatePromptV2 produces identical output to generatePrompt.
Ready for production deployment.
```

### 結果の保存先

`claudedocs/PHASE1_VALIDATION_RESULTS.md` に保存してください。

---

## 🚨 失敗時の対処法

### 問題: V1とV2の出力が一致しない

**デバッグ手順**:

1. **差分の位置を特定**:
   ```typescript
   for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
     if (v1[i] !== v2[i]) {
       console.log('First diff at:', i);
       console.log('V1:', v1.substring(i-20, i+20));
       console.log('V2:', v2.substring(i-20, i+20));
       break;
     }
   }
   ```

2. **文字コードを確認**:
   ```typescript
   console.log('V1 char code:', v1.charCodeAt(diffPosition));
   console.log('V2 char code:', v2.charCodeAt(diffPosition));
   ```

3. **改行コードを確認**:
   ```typescript
   const normalized1 = v1.replace(/\r\n/g, '\n');
   const normalized2 = v2.replace(/\r\n/g, '\n');
   console.log('Normalized match:', normalized1 === normalized2);
   ```

**よくある原因**:
- 改行コードの違い（CRLF vs LF）
- スペース/タブの違い
- 変数置換の順序
- console.logの有無

**修正後**: 再度検証を実行

### 問題: TypeScriptエラー

```bash
npx tsc --noEmit
```

エラーがある場合は修正してから再検証。

### 問題: ランタイムエラー

**よくあるエラー**:
- `Cannot read property 'generatePromptV2' of undefined`
  → ConversationManagerのインスタンスが正しくない

- `replaceVariables is not a function`
  → インポートパスが間違っている

**解決**: エラーメッセージを確認してコードを修正

---

## 📝 検証完了後のアクション

### ✅ すべて成功した場合

1. **結果を記録**:
   ```bash
   # 結果を保存
   cat > claudedocs/PHASE1_VALIDATION_RESULTS.md
   ```

2. **コミット**:
   ```bash
   git add claudedocs/PHASE1_VALIDATION_RESULTS.md
   git commit -m "docs(phase1): Add validation results - All tests passed"
   ```

3. **次のステップ**:
   - オプション1: 本番環境でのテスト（10%ロールアウト）
   - オプション2: 完全置き換え（`generatePrompt`を`generatePromptV2`に）

### ❌ 失敗した場合

1. **ロールバック**:
   ```bash
   # 統合コミットを取り消し
   git revert HEAD
   ```

2. **問題の調査**:
   - 差分の原因を特定
   - セクションファイルを確認
   - PromptBuilderの順序を確認

3. **修正**:
   - 問題のあるセクションを修正
   - 型チェック実行
   - 再検証

---

## 💡 追加のテストアイデア

### パフォーマンステスト

```typescript
console.time('V1 - 100 iterations');
for (let i = 0; i < 100; i++) {
  await manager.generatePrompt(userInput, character, persona);
}
console.timeEnd('V1 - 100 iterations');

console.time('V2 - 100 iterations');
for (let i = 0; i < 100; i++) {
  await manager.generatePromptV2(userInput, character, persona);
}
console.timeEnd('V2 - 100 iterations');
```

**期待**: V2の実行時間はV1の±10%以内

### メモリリークテスト

```typescript
// 1000回実行してメモリ使用量を確認
for (let i = 0; i < 1000; i++) {
  const prompt = await manager.generatePromptV2(userInput, character, persona);
  if (i % 100 === 0) {
    console.log(`Iteration ${i}, memory:`, process.memoryUsage());
  }
}
```

### エッジケーステスト

```typescript
// 空文字列
await manager.generatePromptV2('', character, persona);

// 非常に長い入力（10000文字）
const longInput = 'あ'.repeat(10000);
await manager.generatePromptV2(longInput, character, persona);

// 特殊文字のみ
await manager.generatePromptV2('!@#$%^&*()', character, persona);
```

---

## 🎓 検証の重要性

### なぜこの検証が重要なのか

1. **プロンプト品質保証**
   - AIの応答品質は100%プロンプトに依存
   - 1文字の違いで応答が変わる可能性

2. **本番環境への影響**
   - すべてのチャット会話に影響
   - ユーザー体験の一貫性

3. **リファクタリングの信頼性**
   - コード整理が動作を変えないことの証明
   - 将来のメンテナンス性向上

### 検証なしでデプロイした場合のリスク

- ❌ プロンプトの微妙な変化
- ❌ キャラクター性格の変化
- ❌ システムプロンプトの欠落
- ❌ メモリ機能の動作不良
- ❌ ユーザーからの苦情

**結論**: 検証は絶対に必要です！

---

## 📚 関連ドキュメント

- **統合ガイド**: `claudedocs/PHASE1_INTEGRATION_GUIDE.md`
- **完了レポート**: `claudedocs/PHASE1_PROMPT_CONSOLIDATION_COMPLETION_REPORT.md`
- **手動検証**: `tests/manual/phase1-validation.md`

---

## ✅ チェックリスト

検証前:
- [ ] 開発サーバーを停止
- [ ] 最新のコードをpull
- [ ] TypeScriptエラーがないことを確認（`npx tsc --noEmit`）

検証中:
- [ ] すべてのテストケースを実行
- [ ] 結果を記録
- [ ] 失敗したケースをデバッグ

検証後:
- [ ] 結果をドキュメントに記録
- [ ] コミット（成功の場合）
- [ ] 次のステップを決定

---

**準備完了！** 🚀

サーバーを停止して、上記の手順に従ってください。

何か問題があれば、デバッグ手順を参照してください。
