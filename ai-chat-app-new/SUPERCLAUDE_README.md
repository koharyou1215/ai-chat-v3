# SuperClaude Workflow System

## 概要

SuperClaude ワークフローシステムは、AI チャットアプリケーション V3 に統合された高度なワークフロー管理システムです。各ワークフローには最適化された MCP フラグが設定されており、`--all-mcp` の代わりに特定のタスクに最適な MCP サーバーの組み合わせを使用します。

## 主な修正内容

### 1. ワークフローテンプレートの最適化

- **削除**: `--all-mcp` フラグを全てのテンプレートから削除
- **追加**: 各ワークフローに最適化された MCP フラグセット

#### ワークフローと最適化フラグ

| ワークフロー | 最適化フラグ | 用途 |
|------------|------------|-----|
| 🐛 バグ修正 | `--think-hard --seq --morph --validate --serena` | 体系的なバグ診断と修正 |
| ♻️ リファクタリング | `--ultrathink --morph --seq --validate --loop --iterations 3` | コード改善と最適化 |
| ⚡ パフォーマンス最適化 | `--think-hard --seq --morph --serena --validate` | パフォーマンス分析と最適化 |
| ✨ 機能開発 | `--think --magic --morph --validate --delegate auto` | 新機能の実装 |
| 🏗️ アーキテクチャレビュー | `--ultrathink --seq --c7 --serena --validate` | システムアーキテクチャ分析 |
| 🛡️ セキュリティ監査 | `--ultrathink --seq --validate --safe-mode` | セキュリティ脆弱性評価 |
| 🧪 テストカバレッジ | `--think --play --seq --validate --loop` | 包括的なテスト実行 |
| 📚 ドキュメント作成 | `--think --c7 --serena --validate` | ドキュメント生成 |
| 🎨 UI開発 | `--magic --play --morph --validate` | フロントエンド開発 |
| 💡 ブレインストーミング | `--brainstorm --think --seq` | 要件探索 |

### 2. バグ修正

#### ワークフロー選択の永続化バグ
- **問題**: 一度ワークフローを選択すると固定されて変更できない
- **修正**:
  - localStorage への保存を debounce で遅延
  - 同じワークフローをクリックで選択解除可能に
  - 設定の適切なリセット機能を追加

#### 追加コマンドの反映
- **問題**: 追加コマンドが生成プロンプトに反映されない
- **修正**:
  - `generatePrompt()` メソッドで追加コマンドを確実に含める
  - リアルタイムプレビューで確認可能

#### αコンテキストの反映
- **問題**: αコンテキスト選択が生成プロンプトに反映されない
- **修正**:
  - αコンテキストの詳細情報を含めるように修正
  - チェックボックスでの選択を即座に反映

## 使用方法

### 1. SuperClaudePanel をチャット画面で使用

```tsx
import { MessageInputWithSuperClaude } from "@/components/superclaude";

// ChatInterface で使用
<MessageInputWithSuperClaude />
```

### 2. React Hook での使用

```tsx
import { useSuperClaude } from "@/hooks/useSuperClaude";

const MyComponent = () => {
  const {
    selectWorkflow,
    toggleCommand,
    toggleAlphaContext,
    generateAndAppendPrompt,
    isActive
  } = useSuperClaude();

  // ワークフロー選択
  selectWorkflow("bug-fix");

  // コマンド追加
  toggleCommand("/sc:test");

  // αコンテキスト有効化
  toggleAlphaContext("memory");

  // プロンプト生成して入力欄に追加
  generateAndAppendPrompt();
};
```

### 3. メッセージ送信時の自動強化

```tsx
import { useSuperClaudeMessageEnhancement } from "@/hooks/useSuperClaude";

const ChatComponent = () => {
  const { sendMessage, isEnhancementActive } = useSuperClaudeMessageEnhancement();

  // SuperClaude が有効な場合、自動的にメッセージが強化される
  const handleSend = async (message: string) => {
    await sendMessage(message); // 自動的に SuperClaude コンテキストが追加される
  };
};
```

## ファイル構成

```
src/
├── components/
│   ├── superclaude/
│   │   ├── SuperClaudePanel.tsx      # UI コンポーネント
│   │   └── index.ts                  # エクスポート集約
│   └── chat/
│       └── MessageInputWithSuperClaude.tsx # 統合コンポーネント
├── services/
│   ├── superclaude-workflows.ts      # ワークフロー定義とマネージャー
│   └── superclaude-integration.service.ts # プロンプトビルダー統合
└── hooks/
    └── useSuperClaude.ts             # React Hook

```

## MCP フラグの意味

| フラグ | 用途 |
|-------|------|
| `--think` | 標準的な構造化分析 (~4K tokens) |
| `--think-hard` | 深い分析 (~10K tokens) |
| `--ultrathink` | 最大深度分析 (~32K tokens) |
| `--seq` | Sequential MCP - 構造化された多段階推論 |
| `--magic` | Magic MCP - UI コンポーネント生成 |
| `--morph` | Morphllm MCP - 効率的な複数ファイル編集 |
| `--serena` | Serena MCP - シンボル操作とプロジェクトメモリ |
| `--c7` | Context7 MCP - キュレートされたドキュメント検索 |
| `--play` | Playwright MCP - ブラウザ自動化とテスト |
| `--validate` | 事前実行リスク評価 |
| `--safe-mode` | 最大検証、保守的実行 |
| `--loop` | 反復改善サイクル |
| `--iterations [n]` | 改善サイクル回数 |
| `--delegate [auto]` | サブエージェント並列処理 |
| `--brainstorm` | 協調的発見マインドセット |

## 設定の永続化

SuperClaude の設定は localStorage に自動保存され、セッション間で保持されます。

```javascript
// 保存される設定
{
  selectedWorkflow: "bug-fix",
  additionalCommands: ["/sc:test", "/sc:analyze"],
  alphaContexts: ["memory", "emotion"],
  customFlags: ["--custom-flag"]
}
```

## トラブルシューティング

### ワークフローが切り替わらない
- ブラウザの localStorage をクリア: `localStorage.removeItem("superClaudeConfig")`
- リセットボタンを使用

### プロンプトが反映されない
- プレビューエリアで生成される内容を確認
- 「プロンプト生成」ボタンをクリック
- メッセージ入力欄にプロンプトが追加されることを確認

### MCP フラグが効かない
- 各ワークフローに最適化された MCP フラグが設定されていることを確認
- カスタムフラグ欄で追加のフラグを指定可能

## 今後の改善案

1. ワークフローのカスタマイズ機能
2. ワークフロー実行履歴の記録
3. ワークフローのインポート/エクスポート
4. ワークフローの効果測定とレポート機能