# AI Chat V3 品質改善クイックリファレンス

**作成日**: 2025-10-30
**目的**: 新セッションでの迅速な作業開始

---

## 🚀 5分で始める

### 現状確認コマンド

```bash
# 1. ブランチとgit状態確認
git status
git branch
git log --oneline -5

# 2. 型エラーチェック
npx tsc --noEmit | head -20

# 3. any型の使用箇所確認
grep -r ": any" src/ | wc -l
# 目標: Phase1=200, Phase2=100, Phase3=0

# 4. console.logの使用箇所確認
grep -r "console.log" src/ | wc -l
# 目標: Phase1=1000, Phase2=100, Phase3=0

# 5. テストカバレッジ確認
npm run test:coverage
# 目標: Phase1=15%, Phase2=30%, Phase3=80%
```

---

## 📋 優先タスクマトリクス

### Phase 1: 緊急対応 (1-2週間)

| タスク | ファイル | 推定時間 | 優先度 |
|--------|---------|---------|--------|
| 型安全化 | message-send-handler.ts | 4h | 🔴 |
| 型安全化 | MessageBubble.tsx | 3h | 🔴 |
| 型安全化 | store/index.ts | 3h | 🔴 |
| テスト追加 | simple-api-manager-v2.test.ts | 4h | 🔴 |
| テスト追加 | chat.slice.test.ts | 3h | 🔴 |
| ロギング統合 | logger.ts実装 | 2h | 🟡 |

### Phase 2: 構造改善 (2-4週間)

| タスク | ファイル | 推定時間 | 優先度 |
|--------|---------|---------|--------|
| リファクタリング | conversation-manager.ts | 8h | 🟡 |
| リファクタリング | groupChat.slice.ts | 6h | 🟡 |
| リファクタリング | ChatInterface.tsx | 6h | 🟡 |
| ESLint設定 | .eslintrc.json | 2h | 🟡 |
| テスト追加 | 20ファイル | 20h | 🟡 |

### Phase 3: 品質向上 (4-8週間)

| タスク | 内容 | 推定時間 | 優先度 |
|--------|-----|---------|--------|
| 完全テスト | 全コンポーネント | 40h | 🟢 |
| パフォーマンス | React.memo等 | 10h | 🟢 |
| ドキュメント | 7種類 | 15h | 🟢 |

---

## 🔧 コピペ用コードテンプレート

### 1. 型安全化テンプレート

```typescript
// ========================================
// テンプレート: API応答の型安全化
// ========================================

// Step 1: 型定義作成 (src/types/api/responses.types.ts)
export interface APIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

// Step 2: 型ガード作成 (src/utils/type-guards.ts)
export function isValidAPIResponse(data: unknown): data is APIResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'content' in data &&
    typeof (data as APIResponse).content === 'string'
  );
}

// Step 3: 既存コード置き換え
// ❌ Before
const data: any = await response.json();

// ✅ After
const data: unknown = await response.json();
if (!isValidAPIResponse(data)) {
  throw new TypeError('Invalid API response');
}
// data は APIResponse 型として使用可能
```

### 2. ユニットテストテンプレート

```typescript
// ========================================
// テンプレート: サービス層のテスト
// ========================================
// File: src/services/__tests__/your-service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YourService } from '../your-service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(() => {
    service = new YourService();
    vi.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = service.methodName(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      expect(() => service.methodName('')).toThrow();
    });
  });
});
```

### 3. Zustandストアテストテンプレート

```typescript
// ========================================
// テンプレート: Zustandストアのテスト
// ========================================
// File: src/store/slices/__tests__/your-slice.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createYourSlice, YourSlice } from '../your-slice';

describe('YourSlice', () => {
  let store: ReturnType<typeof create<YourSlice>>;

  beforeEach(() => {
    store = create<YourSlice>()(
      (set, get, api) => createYourSlice(set, get, api)
    );
  });

  it('should initialize with default state', () => {
    const state = store.getState();
    expect(state.someProperty).toBe('defaultValue');
  });

  it('should update state correctly', () => {
    store.getState().updateSomeProperty('newValue');
    expect(store.getState().someProperty).toBe('newValue');
  });
});
```

### 4. Reactコンポーネントテストテンプレート

```typescript
// ========================================
// テンプレート: Reactコンポーネントのテスト
// ========================================
// File: src/components/__tests__/YourComponent.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { YourComponent } from '../YourComponent';

describe('YourComponent', () => {
  const defaultProps = {
    title: 'Test Title',
    onClick: vi.fn()
  };

  it('should render correctly', () => {
    render(<YourComponent {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<YourComponent {...defaultProps} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
  });
});
```

### 5. ロガーテンプレート

```typescript
// ========================================
// テンプレート: ロギングシステム
// ========================================
// File: src/utils/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDev = process.env.NODE_ENV === 'development';

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.isDev) {
      console.log(`[DEBUG] ${message}`, meta);
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.isDev) {
      console.log(`[INFO] ${message}`, meta);
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, { ...meta, error: error?.stack });
  }
}

export const logger = new Logger();

// 使用例:
// logger.info('User logged in', { userId: '123' });
// logger.error('API call failed', error, { endpoint: '/api/chat' });
```

---

## 📊 進捗トラッキング

### チェックリスト: Phase 1

```markdown
型安全性 (347 → 200):
  □ message-send-handler.ts (10箇所)
  □ MessageBubble.tsx (8箇所)
  □ store/index.ts (7箇所)
  □ ChatInterface.tsx (6箇所)
  □ inspiration-service.ts (5箇所)
  □ conversation-manager.ts (5箇所)
  □ groupChat.slice.ts (4箇所)
  □ message-sender.service.ts (4箇所)

テスト (<1% → 15%):
  □ simple-api-manager-v2.test.ts
  □ conversation-manager.test.ts
  □ prompt-builder.service.test.ts
  □ chat.slice.test.ts
  □ groupChat.slice.test.ts
  □ character.slice.test.ts
  □ settings.slice.test.ts
  □ variable-replacer.test.ts

ロギング (2015 → 1000):
  □ Logger実装
  □ API統合層で使用
  □ 状態管理層で使用
  □ エラーハンドリングで使用
```

### メトリクス記録テンプレート

```markdown
## [日付] 作業記録

### 完了タスク
- [ ] ファイル名: 作業内容

### メトリクス
- any型使用: [数] (目標: [数])
- テストカバレッジ: [%] (目標: [%])
- console.log: [数] (目標: [数])

### 課題・ブロッカー
- 問題内容と対応方針

### 次回タスク
- 優先順位1: [タスク]
- 優先順位2: [タスク]
```

---

## 🔍 トラブルシューティング

### よくあるエラーと対処法

#### 1. TypeScriptエラー: "Type 'unknown' is not assignable to type 'X'"

```typescript
// ❌ 問題
const data: unknown = await response.json();
processData(data); // エラー

// ✅ 解決策1: 型ガード
if (isValidData(data)) {
  processData(data); // OK
}

// ✅ 解決策2: 型アサーション (慎重に)
processData(data as DataType);
```

#### 2. テストエラー: "Cannot find module '@/store'"

```typescript
// vitest.config.ts に追加
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

#### 3. ESLintエラー: "Parsing error: Cannot read file 'tsconfig.json'"

```json
// .eslintrc.json を確認
{
  "parserOptions": {
    "project": "./tsconfig.json"  // パスが正しいか確認
  }
}
```

#### 4. Zustandストアテストが失敗する

```typescript
// モックを正しく設定
vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector) => {
    const mockState = { /* モック状態 */ };
    return selector(mockState);
  })
}));
```

---

## 🎯 実装時の注意点

### DO ✅

1. **小さく始める**: 1ファイルずつ改善
2. **テストを先に書く**: TDDアプローチ
3. **既存機能を保護**: 後方互換性維持
4. **頻繁にコミット**: 小さな変更を積み重ねる
5. **ドキュメント更新**: 変更内容を記録

### DON'T ❌

1. **一度に大量変更しない**: リスク増大
2. **テストなしで変更しない**: バグ混入のリスク
3. **型を適当にキャストしない**: 型安全性が失われる
4. **console.logを残さない**: 本番環境でパフォーマンス低下
5. **既存APIを破壊しない**: 他の部分に影響

---

## 🚦 品質ゲート

各Phaseの完了基準:

### Phase 1 完了条件

```bash
# 全て成功すること
✅ npx tsc --noEmit  # 型エラー0件
✅ npm run lint      # ESLintエラー0件
✅ npm run test      # テスト全て成功
✅ grep -r ": any" src/ | wc -l  # 200以下
✅ npm run test:coverage  # 15%以上
```

### Phase 2 完了条件

```bash
✅ npx tsc --noEmit
✅ npm run lint
✅ npm run test
✅ grep -r ": any" src/ | wc -l  # 100以下
✅ npm run test:coverage  # 30%以上
✅ 最大ファイルサイズ 800行以下
```

### Phase 3 完了条件

```bash
✅ npx tsc --noEmit
✅ npm run lint --max-warnings 0
✅ npm run test
✅ grep -r ": any" src/ | wc -l  # 0
✅ npm run test:coverage  # 80%以上
✅ npm run perf:lighthouse  # Performance 90+
```

---

## 📚 参考リソース

### 内部ドキュメント

- `CODE_QUALITY_IMPROVEMENT_MASTER_PLAN.md` - 詳細マスタープラン
- `🎯 AI Chat V3 完全開発ガイド.md` - プロジェクト全体ガイド
- `PHASE3_IMPLEMENTATION_GUIDE.md` - Phase3実装ガイド

### 外部リソース

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [ESLint Rules](https://eslint.org/docs/rules/)

---

## 💡 ヒント

### 効率的な型安全化

```typescript
// 1. まず型定義を追加
// 2. 型ガードを実装
// 3. 既存コードを段階的に置き換え
// 4. テストで検証

// この順序で進めると効率的
```

### 効率的なテスト追加

```typescript
// 1. 重要度の高い機能から
// 2. 1テストケース = 1機能
// 3. エッジケースも忘れずに
// 4. モックは必要最小限に
```

### 効率的なリファクタリング

```typescript
// 1. 既存テストを確認
// 2. テストがなければ追加
// 3. 小さく分割
// 4. 各ステップでテスト実行
// 5. 機能テストで最終確認
```

---

## 🎬 次のアクション

### 今すぐ始められるタスク

1. **5分タスク**: ESLint設定の追加
2. **30分タスク**: message-send-handler.tsの型安全化
3. **1時間タスク**: simple-api-manager-v2.test.tsの作成
4. **半日タスク**: conversation-manager.tsのリファクタリング

### おすすめの開始パターン

**パターン1: 型安全性重視**
```
1. message-send-handler.ts の型安全化
2. その部分のテスト追加
3. 他の重要ファイルへ展開
```

**パターン2: テスト重視**
```
1. simple-api-manager-v2.test.ts 作成
2. テスト実行環境整備
3. 他のサービスへ展開
```

**パターン3: 構造改善重視**
```
1. ESLint設定追加
2. 既存コードのlint
3. エラーを1つずつ修正
```

---

**このドキュメントを使って、すぐに作業を開始できます！**

詳細が必要な場合は `CODE_QUALITY_IMPROVEMENT_MASTER_PLAN.md` を参照してください。
