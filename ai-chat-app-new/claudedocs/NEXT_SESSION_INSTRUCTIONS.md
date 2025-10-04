# 次セッション開始用指示書

**作成日**: 2025年10月4日
**現在のブランチ**: `refactor/phase0-shared-services`
**プロジェクト**: AI Chat V3 巨大ファイル分割リファクタリング

---

## 🎯 次セッションで行うこと

**Phase 1: conversation-manager.ts の分解**を開始します。

**最重要事項**: **プロンプト品質を1文字も変更しない**ことが絶対条件です。

---

## 📋 現状の完了事項

### ✅ Phase 0完了（2025年10月4日）
- 2つの共有ヘルパー作成完了
  - `src/utils/chat/session-update-helper.ts`
  - `src/utils/chat/mem0-integration-helper.ts`
- `chat-message-operations.ts`に統合完了
- TypeScriptエラー: 0
- コミット完了: `4815056e`
- ビルド: 成功確認済

### 📊 リファクタリング全体進捗
- **Phase 0**: ✅ 完了（共有サービス作成）
- **Phase 1**: 🔜 次セッションで開始（conversation-manager分解）
- **Phase 2**: ⏳ 未着手（chat-message-operations分解）
- **Phase 3**: ⏳ 未着手（groupChat.slice分解）

---

## 🎯 次セッション開始コマンド

### Step 1: 環境確認
```bash
cd C:\ai-chat-v3\ai-chat-app-new
git status
git branch
```

**期待結果**:
- ブランチ: `refactor/phase0-shared-services`
- 未コミット変更: なし

### Step 2: Phase 1ブランチ作成
```bash
git checkout -b refactor/phase1-conversation-manager
```

### Step 3: 現状把握
```bash
# conversation-manager.tsの行数確認
wc -l src/services/memory/conversation-manager.ts

# generatePromptメソッドの位置確認
grep -n "async generatePrompt" src/services/memory/conversation-manager.ts
```

---

## 🔐 Phase 1 絶対遵守事項

### ❌ やってはいけないこと
1. **プロンプトロジックの変更**
   - `generatePrompt()`の出力を1文字でも変えない
   - 改行、スペース、順序も完全維持

2. **既存コードの再構築**
   - ロジックを新規作成しない
   - 既存コードを一字一句コピペのみ

3. **テストなしでの実装**
   - Golden Masterテストなしで進めない
   - 文字単位比較テストなしで進めない

### ✅ やるべきこと
1. **Golden Masterテスト準備**
   - 現在の`generatePrompt()`で1000プロンプト生成
   - MD5ハッシュ保存
   - 完全なプロンプト文字列保存

2. **既存コード完全コピー方式**
   - `conversation-manager.ts` line 328-742（generatePrompt）
   - 1文字も変更せず、セクション別ファイルに抽出

3. **文字単位比較検証**
   - 旧実装 vs 新実装
   - 1000ケース全て完全一致確認

---

## 📚 重要ドキュメント参照順序

### 1. プロンプト品質保証戦略を確認
```bash
# このセッションでの品質保証に関する議論を参照
# 「プロンプトの質の低下」への回答を確認
```

**要点**:
- プロンプト内容をゼロ変更
- 文字単位完全一致
- Golden Master 1000ケース
- 即時ロールバック可能

### 2. マスタープラン確認
```bash
cat claudedocs/THREE_FILE_REFACTORING_MASTER_PLAN.md
cat claudedocs/CONVERSATION_MANAGER_DISTRIBUTION_PLAN.md
```

### 3. Phase 0完了レポート確認
```bash
cat claudedocs/PHASE0_REFACTORING_COMPLETION_REPORT.md
```

**重要な発見**:
- 多くのサービスが既に実装済み
- `promptBuilderService`が既に存在
- 実際の重複は想定より少ない

---

## 🎯 Phase 1 実装戦略（詳細）

### Phase 1-A: Golden Masterテスト作成（優先度：最高）

**目的**: 現在のプロンプト品質を100%保証

#### 作業内容

1. **テストデータ準備**
```typescript
// tests/golden-master/test-data-generator.ts
export function generateTestCases(count: number): TestCase[] {
  // 多様なキャラクター
  // 多様なペルソナ
  // 多様なシステム設定
  // 多様な会話履歴長
}
```

2. **Golden Master生成**
```typescript
// tests/golden-master/generate-golden-master.ts
async function generateGoldenMaster() {
  const testCases = generateTestCases(1000);
  const results = [];

  for (const testCase of testCases) {
    const manager = new ConversationManager(...);
    const prompt = await manager.generatePrompt(...);

    results.push({
      testCaseId: testCase.id,
      prompt: prompt,
      md5: md5(prompt),
      characterId: testCase.character.id,
      timestamp: Date.now()
    });
  }

  // 保存
  fs.writeFileSync(
    'tests/golden-master/prompts-golden-master.json',
    JSON.stringify(results, null, 2)
  );
}
```

3. **比較テスト作成**
```typescript
// tests/golden-master/compare-prompts.test.ts
describe('Prompt Quality Guarantee', () => {
  const goldenMaster = loadGoldenMaster();

  goldenMaster.forEach((golden, index) => {
    it(`should match golden master exactly - Case ${index}`, async () => {
      const newPrompt = await newImplementation.generatePrompt(...);

      // 文字単位完全一致
      expect(newPrompt).toBe(golden.prompt);

      // MD5一致
      expect(md5(newPrompt)).toBe(golden.md5);
    });
  });
});
```

### Phase 1-B: セクション抽出（コピー方式）

**目的**: 既存コードを1文字も変えずにファイル分割

#### 現在の構造（conversation-manager.ts: 328-742行）

```typescript
async generatePrompt(
  userInput: string,
  character?: Character,
  persona?: Persona,
  systemSettings?: {...}
): Promise<string> {
  // 1. System Definitions (line 357-358)
  // 2. System Prompt (line 360-373)
  // 3. Character Information (line 375-546)
  // 4. Persona Information (line 549-571)
  // 5. Tracker Information (line 573-603)
  // 6. Memory System (line 605-684)
  // 7. Recent Conversation (line 704-710)
  // 8. Character System Prompt (line 712-715)
  // 9. Jailbreak Prompt (line 717-727)
  // 10. Current Input (line 729-734)
}
```

#### 抽出方針

**❌ 悪い例（ロジック再構築）**:
```typescript
class PersonaSection {
  build(context) {
    // 新規ロジック作成 → バグ混入リスク
    return `Name: ${context.persona.name}...`;
  }
}
```

**✅ 良い例（既存コード完全コピー）**:
```typescript
class PersonaSection {
  build(context) {
    // 🔒 line 549-571を一字一句コピペ
    const { persona } = context;
    let prompt = "";

    if (persona) {
      console.log("🎭 [ConversationManager] Persona found:",
                  persona.name, persona.other_settings);
      prompt += "<persona_information>\n";
      prompt += `Name: ${persona.name}\n`;
      // ... 既存コードをそのままコピー
    }

    return prompt;
  }
}
```

### Phase 1-C: ファイル構成（提案）

```
src/services/memory/conversation-manager/
├── sections/
│   ├── system-definitions.section.ts      (line 357-358)
│   ├── system-prompt.section.ts           (line 360-373)
│   ├── character-info.section.ts          (line 375-546)
│   ├── persona-info.section.ts            (line 549-571)
│   ├── tracker-info.section.ts            (line 573-603)
│   ├── memory-system.section.ts           (line 605-684)
│   ├── recent-conversation.section.ts     (line 704-710)
│   ├── character-system-prompt.section.ts (line 712-715)
│   ├── jailbreak-prompt.section.ts        (line 717-727)
│   └── current-input.section.ts           (line 729-734)
├── prompt-builder.ts                      (セクション統合)
└── conversation-manager.ts                (Facade - 180行)
```

---

## 🚨 トラブルシューティング

### 問題: プロンプトが一致しない

**原因候補**:
1. 改行コードの違い（CRLF vs LF）
2. スペース/タブの違い
3. 変数置換タイミングの違い

**解決方法**:
```typescript
// 正規化してから比較
const normalize = (str: string) => str.replace(/\r\n/g, '\n').trim();
expect(normalize(newPrompt)).toBe(normalize(goldenPrompt));
```

### 問題: TypeScriptエラー

**確認事項**:
```bash
npx tsc --noEmit
```

**よくあるエラー**:
- インポートパス間違い
- 型定義不足
- `any`型の使用

### 問題: ビルド失敗

**確認事項**:
```bash
npm run build 2>&1 | tee build.log
```

**ロールバック**:
```bash
git reset --hard HEAD
git checkout refactor/phase0-shared-services
```

---

## 📞 質問テンプレート

次セッション開始時に以下を確認してください：

1. **Phase 1のスコープ確認**
   - 「Phase 1は conversation-manager.ts の generatePrompt() メソッドのみ分解でよいですか？」

2. **プロンプト品質保証確認**
   - 「Golden Masterテストを先に作成してから実装開始でよいですか？」

3. **既存サービス活用確認**
   - 「promptBuilderService との統合は考慮する必要がありますか？」

---

## 🎯 成功基準

Phase 1完了時の確認項目：

### 必須条件
- [ ] Golden Masterテスト: 1000ケース全て一致
- [ ] TypeScriptエラー: 0
- [ ] ビルド: 成功
- [ ] プロンプト出力: 文字単位完全一致

### 推奨条件
- [ ] テストカバレッジ: 80%以上
- [ ] コード行数: conversation-manager.ts ≤ 200行
- [ ] 最大セクション: ≤ 150行
- [ ] ドキュメント: Phase 1完了レポート作成

---

## 🔗 関連ファイル

### 必読ドキュメント
- `claudedocs/THREE_FILE_REFACTORING_MASTER_PLAN.md`
- `claudedocs/CONVERSATION_MANAGER_DISTRIBUTION_PLAN.md`
- `claudedocs/PHASE0_REFACTORING_COMPLETION_REPORT.md`

### 参照コード
- `src/services/memory/conversation-manager.ts` (現行実装)
- `src/services/prompt-builder.service.ts` (既存サービス)
- `src/utils/chat/session-update-helper.ts` (Phase 0成果物)
- `src/utils/chat/mem0-integration-helper.ts` (Phase 0成果物)

### テスト参照
- `tests/e2e/phase0-settings-unification.spec.ts` (既存テスト例)

---

## 💡 次セッション開始時のプロンプト例

```
Phase 1開始準備完了しました。

現在地:
- ブランチ: refactor/phase0-shared-services
- Phase 0: 完了（共有サービス作成）
- TypeScriptエラー: 0
- ビルド: 成功

次のタスク:
Phase 1（conversation-manager.ts分解）を開始します。

重要事項:
プロンプト品質を1文字も変更しないことが最優先です。
Golden Masterテストを先に作成してから実装を開始します。

claudedocs/NEXT_SESSION_INSTRUCTIONS.md を確認済み。
Phase 1開始の準備をお願いします。

フラグ: --think-hard --introspect --seq --serena --focus quality --scope project
```

---

## 🎊 Phase 0成果の確認

次セッション開始前に以下を確認してください：

```bash
# Phase 0で作成したファイルの確認
ls -la src/utils/chat/session-update-helper.ts
ls -la src/utils/chat/mem0-integration-helper.ts
ls -la claudedocs/PHASE0_REFACTORING_COMPLETION_REPORT.md

# コミット履歴の確認
git log --oneline -3

# 期待される出力:
# 4815056e feat(phase0): Complete shared services extraction - Code deduplication
```

---

## 📝 最後のチェックリスト

次セッション開始前に確認：

- [ ] ブランチ確認: `refactor/phase0-shared-services`
- [ ] 未コミット変更: なし
- [ ] ビルド状態: 成功
- [ ] ドキュメント: Phase 0完了レポート作成済
- [ ] 次の作業: Phase 1準備完了

---

**次セッションでお会いしましょう！ 🚀**

Phase 1でもプロンプト品質を100%保証しながら、
安全にリファクタリングを進めます。

Good luck! 😊
