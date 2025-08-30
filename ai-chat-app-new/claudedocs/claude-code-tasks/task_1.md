## TypeScriptエラー修正タスク

**ファイル**: `src/components/character/CharacterGalleryModal.tsx`
**エラー数**: 1個

### エラー詳細:
1. Line 102: Argument of type 'null' is not assignable to parameter of type 'Character' (TS2345)

### 修正方針:
• null チェック: optional chaining (?.) や null チェックを追加

### 重要事項:
1. 既存機能を損なわない安全な修正を行う
2. 型安全性を確保する（any型の使用は最小限に）
3. null/undefined チェックを適切に実装
4. 修正後は `node scripts/feature-test.js` で動作確認

### 期待する成果:
- CharacterGalleryModal.tsx の TypeScript エラーがゼロになる
- 機能テストがすべて通る
- 既存機能が正常動作する

**注意**: このファイルはキャラクター管理機能なので、慎重に修正してください。