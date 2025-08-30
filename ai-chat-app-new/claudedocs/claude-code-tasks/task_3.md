## TypeScriptエラー修正タスク

**ファイル**: `src/components/chat/CharacterReselectionModal.tsx`
**エラー数**: 2個

### エラー詳細:
1. Line 123: 'updateSessionCharacters' is of type 'unknown' (TS18046)
2. Line 305: Type 'string | undefined' is not assignable to type 'string | StaticImport' (TS2322)

### 修正方針:
• 型定義: unknown型を適切な型にキャストまたは型定義を追加
• undefined対応: デフォルト値設定や条件分岐を追加

### 重要事項:
1. 既存機能を損なわない安全な修正を行う
2. 型安全性を確保する（any型の使用は最小限に）
3. null/undefined チェックを適切に実装
4. 修正後は `node scripts/feature-test.js` で動作確認

### 期待する成果:
- CharacterReselectionModal.tsx の TypeScript エラーがゼロになる
- 機能テストがすべて通る
- 既存機能が正常動作する

**注意**: このファイルは重要な機能なので、慎重に修正してください。