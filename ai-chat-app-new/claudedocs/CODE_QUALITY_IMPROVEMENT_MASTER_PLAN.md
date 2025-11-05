# AI Chat V3 コード品質改善マスタープラン

**作成日**: 2025-10-30
**バージョン**: 1.0
**目的**: プロジェクトの品質、保守性、信頼性の向上

---

## 📋 目次

1. [エグゼクティブサマリー](#エグゼクティブサマリー)
2. [現状分析](#現状分析)
3. [アーキテクチャ概要](#アーキテクチャ概要)
4. [改善ロードマップ](#改善ロードマップ)
5. [Phase 1: 緊急対応](#phase-1-緊急対応)
6. [Phase 2: 構造改善](#phase-2-構造改善)
7. [Phase 3: 品質向上](#phase-3-品質向上)
8. [実装ガイド](#実装ガイド)
9. [検証方法](#検証方法)
10. [新セッション引き継ぎ](#新セッション引き継ぎ)

---

## エグゼクティブサマリー

### プロジェクト概要

```
プロジェクト名: AI Chat V3
技術スタック: Next.js 15.5.4 + TypeScript + Zustand
総ファイル数: 309 (TypeScript/TSX)
総行数: 71,562
サービス層: 93ファイル
コンポーネント: 97ファイル
カスタムフック: 16ファイル
```

### 総合評価

| 項目 | スコア | ステータス |
|------|--------|-----------|
| 型安全性 | 3/10 | 🔴 Critical |
| テストカバレッジ | 1/10 | 🔴 Critical |
| 保守性 | 5/10 | 🟡 Needs Improvement |
| アーキテクチャ | 7/10 | 🟢 Good |
| ドキュメント | 6/10 | 🟢 Fair |
| **総合** | **5.2/10** | 🟡 **Needs Attention** |

### 最優先課題

1. **🔴 型安全性の欠如**: 93ファイルで347回の`any`型使用
2. **🔴 テスト不足**: 推定カバレッジ < 1%
3. **🟡 デバッグコード**: 164ファイルで2015回のconsole使用
4. **🟡 巨大ファイル**: 1000行超のファイルが5つ存在

---

## 現状分析

### 🔍 コードメトリクス

#### 型安全性の問題

```typescript
// ❌ 問題: any型の多用
const data: any = await response.json();
const result: any = processData(data);

// 影響を受ける主要ファイル (上位10)
src/services/inspiration-service.ts              // 5箇所
src/components/chat/ChatInterface.tsx            // 6箇所
src/store/slices/chat/operations/message-send-handler.ts  // 10箇所
src/services/memory/conversation-manager.ts      // 5箇所
src/services/prompt-builder.service.ts           // 1箇所
src/store/index.ts                               // 7箇所
src/services/simple-api-manager-v2.ts            // 2箇所
src/store/slices/groupChat.slice.ts             // 4箇所
src/components/chat/MessageBubble.tsx           // 8箇所
src/services/chat/message-sender.service.ts     // 4箇所
```

**影響範囲**:
- ランタイムエラーの増加
- IDEサポートの低下
- リファクタリングリスクの増大

#### テストカバレッジの状況

```
既存テスト:
  ✓ src/__tests__/time-formatters.test.ts
  ✓ src/__tests__/session-storage.test.ts
  ✓ src/__tests__/inspiration-service.test.ts

未テスト領域（重要度順）:
  ✗ Zustandストア (20スライス)
  ✗ APIクライアント層
  ✗ メモリ管理システム
  ✗ プロンプト生成ロジック
  ✗ 感情分析エンジン
  ✗ トラッカーマネージャー
  ✗ Reactコンポーネント (97ファイル)
```

#### 保守性の問題

**巨大ファイル一覧**:

| ファイル | 行数 | 責任範囲 | リスク |
|---------|------|---------|-------|
| `conversation-manager.ts` | 1,543 | 会話管理・メモリ統合 | 🔴 High |
| `groupChat.slice.ts` | 1,472 | グループチャット状態 | 🔴 High |
| `ChatInterface.tsx` | 1,255 | メインチャットUI | 🔴 High |
| `MessageBubble.tsx` | 1,165 | メッセージ表示 | 🟡 Medium |
| `prompt-builder.service.ts` | 981 | プロンプト生成 | 🟡 Medium |

---

## アーキテクチャ概要

### レイヤー構造

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (Components: 97 files, Hooks: 16)      │
│  - ChatInterface, MessageBubble, etc.   │
│  - useAppStore: 191回使用 (50ファイル)  │
└─────────────────────────────────────────┘
              ↓ ↑
┌─────────────────────────────────────────┐
│         State Management Layer          │
│       (Zustand Store: 20 slices)        │
│  - chat.slice, groupChat.slice, etc.    │
│  - Persistent storage with localStorage │
└─────────────────────────────────────────┘
              ↓ ↑
┌─────────────────────────────────────────┐
│          Business Logic Layer           │
│        (Services: 93 files)             │
│  - API統合, メモリ管理, プロンプト生成   │
│  - 感情分析, トラッカー管理              │
└─────────────────────────────────────────┘
              ↓ ↑
┌─────────────────────────────────────────┐
│            Data Access Layer            │
│    (API Clients, Vector Store, etc.)    │
│  - Gemini API, OpenRouter API           │
│  - LocalStorage, Vector Database        │
└─────────────────────────────────────────┘
```

### 依存関係の問題

**密結合の問題**:
- コンポーネントが直接ストアに依存 (useAppStore: 191回)
- サービス層がストアに直接依存
- 循環参照のリスク

**推奨アプローチ**:
- カスタムフックでストアアクセスをカプセル化
- サービス層はpure functionに
- 依存性注入パターンの導入

---

## 改善ロードマップ

### 全体タイムライン

```
┌─────────────┬─────────────┬─────────────┐
│   Phase 1   │   Phase 2   │   Phase 3   │
│  (1-2週間)  │  (2-4週間)  │  (4-8週間)  │
├─────────────┼─────────────┼─────────────┤
│ 型安全性    │ 構造改善    │ 品質向上    │
│ 緊急テスト  │ リファクタ  │ 完全テスト  │
│ ロギング    │ ESLint設定  │ パフォーマンス│
└─────────────┴─────────────┴─────────────┘
```

### KPI目標

| メトリクス | 現状 | Phase 1 | Phase 2 | Phase 3 |
|----------|------|---------|---------|---------|
| 型安全性 (any型削減) | 347回 | 200回 | 100回 | 0回 |
| テストカバレッジ | <1% | 15% | 30% | 80% |
| console.log削減 | 2015回 | 1000回 | 100回 | 0回 |
| 最大ファイルサイズ | 1543行 | - | 800行 | 500行 |
| ESLintエラー | - | 0 | 0 | 0 |

---

## Phase 1: 緊急対応

**期間**: 1-2週間
**優先度**: 🔴 CRITICAL

### 目標

1. 型安全性の基盤構築
2. コアロジックのテスト追加
3. デバッグコードの整理

### タスクリスト

#### 1.1 型安全性の改善 (推定: 3-5日)

**重要度順のファイルリスト**:

```markdown
□ message-send-handler.ts (10箇所)
□ MessageBubble.tsx (8箇所)
□ store/index.ts (7箇所)
□ ChatInterface.tsx (6箇所)
□ inspiration-service.ts (5箇所)
□ conversation-manager.ts (5箇所)
□ groupChat.slice.ts (4箇所)
□ message-sender.service.ts (4箇所)
```

**実装ガイド**:

```typescript
// ========================================
// パターン1: API応答の型安全化
// ========================================

// ❌ Before
async function fetchData() {
  const response = await fetch('/api/data');
  const data: any = await response.json();
  return data;
}

// ✅ After
interface APIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

function isValidAPIResponse(data: unknown): data is APIResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'content' in data &&
    typeof (data as APIResponse).content === 'string'
  );
}

async function fetchData(): Promise<APIResponse> {
  const response = await fetch('/api/data');
  const data: unknown = await response.json();

  if (!isValidAPIResponse(data)) {
    throw new Error('Invalid API response format');
  }

  return data;
}

// ========================================
// パターン2: イベントハンドラーの型安全化
// ========================================

// ❌ Before
const handleClick = (e: any) => {
  e.preventDefault();
  doSomething(e.target.value);
};

// ✅ After
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  const target = e.currentTarget;
  doSomething(target.value);
};

// ========================================
// パターン3: ユーティリティ関数の型安全化
// ========================================

// ❌ Before
function processData(data: any) {
  return data.map((item: any) => item.value);
}

// ✅ After
interface DataItem {
  value: string;
  timestamp: number;
}

function processData(data: DataItem[]): string[] {
  return data.map(item => item.value);
}

// ========================================
// パターン4: Zustandストアの型安全化
// ========================================

// ❌ Before
set((state: any) => ({
  ...state,
  data: newData
}));

// ✅ After
set((state) => ({
  ...state,
  data: newData as DataType
}));

// または型ガードを使用
function isValidData(data: unknown): data is DataType {
  // 検証ロジック
}

if (isValidData(newData)) {
  set((state) => ({
    ...state,
    data: newData
  }));
}
```

#### 1.2 コアロジックのテスト追加 (推定: 4-6日)

**優先度順テストファイル**:

```markdown
Priority 1: ビジネスロジック層
  □ simple-api-manager-v2.test.ts
  □ conversation-manager.test.ts
  □ prompt-builder.service.test.ts
  □ inspiration-service.test.ts (既存を拡張)

Priority 2: 状態管理層
  □ chat.slice.test.ts
  □ groupChat.slice.test.ts
  □ character.slice.test.ts
  □ settings.slice.test.ts

Priority 3: ユーティリティ層
  □ session-storage.service.test.ts (既存を拡張)
  □ time-formatters.test.ts (既存を拡張)
  □ variable-replacer.test.ts
```

**テストテンプレート**:

```typescript
// ========================================
// テンプレート1: サービス層のテスト
// ========================================
// File: src/services/__tests__/simple-api-manager-v2.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SimpleAPIManagerV2 } from '../simple-api-manager-v2';

describe('SimpleAPIManagerV2', () => {
  let manager: SimpleAPIManagerV2;

  beforeEach(() => {
    manager = new SimpleAPIManagerV2();
    vi.clearAllMocks();
  });

  describe('API Key Management', () => {
    it('should load API keys from localStorage', () => {
      // Arrange
      const mockApiKey = 'test-api-key';
      localStorage.setItem('ai-chat-v3-storage', JSON.stringify({
        state: { geminiApiKey: mockApiKey }
      }));

      // Act
      const newManager = new SimpleAPIManagerV2();

      // Assert
      expect(newManager['geminiApiKey']).toBe(mockApiKey);
    });

    it('should prioritize environment variables over localStorage', () => {
      // Arrange
      process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'env-key';
      localStorage.setItem('ai-chat-v3-storage', JSON.stringify({
        state: { geminiApiKey: 'local-key' }
      }));

      // Act
      const newManager = new SimpleAPIManagerV2();

      // Assert
      expect(newManager['geminiApiKey']).toBe('env-key');
    });
  });

  describe('JSON Parsing', () => {
    it('should safely parse valid JSON', () => {
      // Arrange
      const validJson = '{"content": "test"}';

      // Act
      const result = manager['safeJsonParse'](validJson);

      // Assert
      expect(result).toEqual({ content: 'test' });
    });

    it('should handle invalid JSON gracefully', () => {
      // Arrange
      const invalidJson = '{content: "test"}'; // Missing quotes

      // Act & Assert
      expect(() => manager['safeJsonParse'](invalidJson)).toThrow();
    });
  });

  describe('API Configuration', () => {
    it('should update API config correctly', () => {
      // Arrange
      const newConfig = {
        temperature: 0.8,
        max_tokens: 2048
      };

      // Act
      manager.setAPIConfig(newConfig);

      // Assert
      expect(manager['currentConfig'].temperature).toBe(0.8);
      expect(manager['currentConfig'].max_tokens).toBe(2048);
    });
  });
});

// ========================================
// テンプレート2: Zustandストアのテスト
// ========================================
// File: src/store/slices/__tests__/chat.slice.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createChatSlice, ChatSlice } from '../chat.slice';

describe('ChatSlice', () => {
  let store: ReturnType<typeof create<ChatSlice>>;

  beforeEach(() => {
    store = create<ChatSlice>()(
      (set, get, api) => createChatSlice(set, get, api)
    );
  });

  describe('Session Management', () => {
    it('should create a new session', async () => {
      // Arrange
      const character = {
        id: 'test-char',
        name: 'Test Character',
        // ... other required fields
      };
      const persona = {
        id: 'test-persona',
        name: 'Test Persona',
        // ... other required fields
      };

      // Act
      const sessionId = await store.getState().createSession(character, persona);

      // Assert
      expect(sessionId).toBeDefined();
      expect(store.getState().sessions.has(sessionId)).toBe(true);
    });

    it('should set active session', () => {
      // Arrange
      const sessionId = 'test-session-id';

      // Act
      store.getState().setActiveSession(sessionId);

      // Assert
      expect(store.getState().active_session_id).toBe(sessionId);
    });
  });

  describe('Message Operations', () => {
    it('should add message to session', () => {
      // Arrange
      const sessionId = 'test-session';
      const message = {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Test message',
        timestamp: Date.now()
      };

      // Act
      store.getState().addMessageToSession(sessionId, message);

      // Assert
      const session = store.getState().sessions.get(sessionId);
      expect(session?.messages).toContainEqual(message);
    });
  });
});

// ========================================
// テンプレート3: コンポーネントのテスト
// ========================================
// File: src/components/chat/__tests__/MessageBubble.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageBubble } from '../MessageBubble';

describe('MessageBubble', () => {
  const defaultProps = {
    message: {
      id: 'msg-1',
      role: 'assistant' as const,
      content: 'Test message',
      timestamp: Date.now()
    },
    isStreaming: false,
    onRegenerate: vi.fn(),
    onContinue: vi.fn()
  };

  it('should render message content', () => {
    render(<MessageBubble {...defaultProps} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should call onRegenerate when regenerate button is clicked', async () => {
    const user = userEvent.setup();
    render(<MessageBubble {...defaultProps} />);

    const regenerateButton = screen.getByLabelText('メッセージを再生成');
    await user.click(regenerateButton);

    expect(defaultProps.onRegenerate).toHaveBeenCalledTimes(1);
  });

  it('should not show action buttons while streaming', () => {
    render(<MessageBubble {...defaultProps} isStreaming={true} />);

    expect(screen.queryByLabelText('メッセージを再生成')).not.toBeInTheDocument();
  });
});
```

#### 1.3 ロギングシステムの統合 (推定: 2-3日)

**実装ガイド**:

```typescript
// ========================================
// File: src/utils/logger.ts
// ========================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
}

class Logger {
  private config: LoggerConfig;
  private readonly isDevelopment: boolean;

  constructor(config?: Partial<LoggerConfig>) {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.config = {
      level: config?.level || (this.isDevelopment ? 'debug' : 'warn'),
      enableConsole: config?.enableConsole ?? this.isDevelopment,
      enableRemote: config?.enableRemote ?? !this.isDevelopment,
      remoteEndpoint: config?.remoteEndpoint
    };
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      this.log('debug', message, meta);
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      this.log('info', message, meta);
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      this.log('warn', message, meta);
    }
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      this.log('error', message, { ...meta, error: error?.stack });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.config.level);
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta
    };

    if (this.config.enableConsole) {
      const consoleMethod = level === 'debug' ? 'log' : level;
      console[consoleMethod](`[${level.toUpperCase()}]`, message, meta);
    }

    if (this.config.enableRemote && this.config.remoteEndpoint) {
      // 本番環境でのリモートロギング
      this.sendToRemote(logEntry);
    }
  }

  private async sendToRemote(logEntry: unknown): Promise<void> {
    try {
      await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      // リモートロギング失敗は無視
    }
  }
}

export const logger = new Logger();

// ========================================
// 使用例: console.logの置き換え
// ========================================

// ❌ Before
console.log('User logged in:', userId);
console.error('Failed to fetch data:', error);

// ✅ After
import { logger } from '@/utils/logger';

logger.info('User logged in', { userId });
logger.error('Failed to fetch data', error);
```

**移行計画**:

```bash
# Step 1: console.logを段階的に置き換え
grep -r "console.log" src/ | wc -l  # 現状確認

# Step 2: 高頻度ファイルから優先的に移行
# - API統合層
# - 状態管理層
# - エラーハンドリング

# Step 3: ESLintルールで新規追加を防止
# .eslintrc.json に追加:
{
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### Phase 1 完了チェックリスト

```markdown
型安全性:
  □ 主要10ファイルの`any`型を削減 (347 → 200)
  □ 型ガード関数を実装
  □ APIレスポンスの型定義を追加

テスト:
  □ 8つのテストファイルを追加
  □ カバレッジ15%達成
  □ CIパイプラインでテスト自動実行

ロギング:
  □ Loggerクラスを実装
  □ 主要サービスでconsole.logを置き換え (2015 → 1000)
  □ 環境変数ベースのログレベル制御
```

---

## Phase 2: 構造改善

**期間**: 2-4週間
**優先度**: 🟡 HIGH

### 目標

1. 巨大ファイルのリファクタリング
2. ESLint + Prettier設定
3. テストカバレッジ30%達成

### タスクリスト

#### 2.1 巨大ファイルのリファクタリング (推定: 6-8日)

**対象ファイル**:

```markdown
□ conversation-manager.ts (1,543行 → 3ファイル)
□ groupChat.slice.ts (1,472行 → 3ファイル)
□ ChatInterface.tsx (1,255行 → 4コンポーネント)
□ MessageBubble.tsx (1,165行 → 3コンポーネント)
□ prompt-builder.service.ts (981行 → 3ファイル)
```

**リファクタリング例**:

```typescript
// ========================================
// Example 1: conversation-manager.ts の分割
// ========================================

// 元ファイル (1,543行)
// src/services/memory/conversation-manager.ts

// ↓ 分割後 ↓

// src/services/memory/conversation-manager/core.ts
export class ConversationManagerCore {
  private vectorStore: VectorStore;
  private memoryLayers: MemoryLayerManager;

  constructor(initialMessages: UnifiedMessage[]) {
    this.vectorStore = new VectorStore();
    this.memoryLayers = new MemoryLayerManager();
  }

  public updateMemoryLimits(limits: MemoryLimits): void {
    // コアロジック
  }
}

// src/services/memory/conversation-manager/memory-integration.ts
export class MemoryIntegration {
  constructor(private core: ConversationManagerCore) {}

  public async getRelevantMemories(query: string): Promise<MemoryCard[]> {
    // メモリ統合ロジック
  }
}

// src/services/memory/conversation-manager/prompt-generation.ts
export class PromptGeneration {
  constructor(
    private core: ConversationManagerCore,
    private memoryIntegration: MemoryIntegration
  ) {}

  public async generatePrompt(context: ConversationContext): Promise<string> {
    // プロンプト生成ロジック
  }
}

// src/services/memory/conversation-manager/index.ts
export class ConversationManager {
  private core: ConversationManagerCore;
  private memoryIntegration: MemoryIntegration;
  private promptGeneration: PromptGeneration;

  constructor(initialMessages: UnifiedMessage[]) {
    this.core = new ConversationManagerCore(initialMessages);
    this.memoryIntegration = new MemoryIntegration(this.core);
    this.promptGeneration = new PromptGeneration(
      this.core,
      this.memoryIntegration
    );
  }

  // 公開APIは変更なし（後方互換性維持）
  public async generatePrompt(context: ConversationContext): Promise<string> {
    return this.promptGeneration.generatePrompt(context);
  }
}

// ========================================
// Example 2: ChatInterface.tsx の分割
// ========================================

// 元ファイル (1,255行)
// src/components/chat/ChatInterface.tsx

// ↓ 分割後 ↓

// src/components/chat/ChatInterface/ChatHeader.tsx
export function ChatHeader({
  character,
  onSettingsClick
}: ChatHeaderProps) {
  return (
    <header className="chat-header">
      {/* ヘッダーロジック */}
    </header>
  );
}

// src/components/chat/ChatInterface/ChatBody.tsx
export function ChatBody({
  messages,
  isStreaming
}: ChatBodyProps) {
  return (
    <div className="chat-body">
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}

// src/components/chat/ChatInterface/ChatInput.tsx
export function ChatInput({
  onSend,
  disabled
}: ChatInputProps) {
  const [input, setInput] = useState('');

  return (
    <div className="chat-input">
      {/* 入力ロジック */}
    </div>
  );
}

// src/components/chat/ChatInterface/useChatLogic.ts
export function useChatLogic() {
  const messages = useAppStore(state => state.messages);
  const sendMessage = useAppStore(state => state.sendMessage);

  const handleSend = useCallback((content: string) => {
    sendMessage(content);
  }, [sendMessage]);

  return { messages, handleSend };
}

// src/components/chat/ChatInterface/index.tsx (メインコンポーネント)
export function ChatInterface() {
  const { messages, handleSend } = useChatLogic();
  const { character } = useCharacter();

  return (
    <div className="chat-interface">
      <ChatHeader character={character} onSettingsClick={handleSettings} />
      <ChatBody messages={messages} isStreaming={isStreaming} />
      <ChatInput onSend={handleSend} disabled={isGenerating} />
    </div>
  );
}
```

#### 2.2 ESLint + Prettier設定 (推定: 1-2日)

**設定ファイル**:

```json
// ========================================
// File: .eslintrc.json
// ========================================
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    // 型安全性
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "warn",
    "@typescript-eslint/no-unsafe-member-access": "warn",
    "@typescript-eslint/no-unsafe-call": "warn",
    "@typescript-eslint/no-unsafe-return": "warn",

    // コード品質
    "@typescript-eslint/no-unused-vars": ["warn", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "complexity": ["warn", 15],
    "max-lines": ["warn", 500],
    "max-lines-per-function": ["warn", { "max": 100, "skipBlankLines": true }],

    // React
    "react-hooks/exhaustive-deps": "warn",
    "react/jsx-no-leaked-render": "error"
  }
}

// ========================================
// File: .prettierrc.json
// ========================================
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}

// ========================================
// File: package.json (scripts追加)
// ========================================
{
  "scripts": {
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,md}\"",
    "type-check": "tsc --noEmit"
  }
}
```

#### 2.3 テストカバレッジ30%達成 (推定: 5-7日)

**追加テスト一覧**:

```markdown
サービス層:
  □ progressive-prompt-builder.service.test.ts
  □ context-management.service.test.ts
  □ memory/vector-store.test.ts
  □ memory/memory-layer-manager.test.ts
  □ emotion/BaseEmotionAnalyzer.test.ts
  □ tracker/tracker-manager.test.ts

ストア層:
  □ memory.slice.test.ts
  □ persona.slice.test.ts
  □ tracker.slice.test.ts
  □ settings.slice.test.ts

ユーティリティ層:
  □ text-formatter.test.ts
  □ variable-replacer.test.ts
  □ uuid.test.ts

コンポーネント層 (優先):
  □ MessageInput.test.tsx
  □ ChatHeader.test.tsx
  □ QuickSettingsPanel.test.tsx
```

### Phase 2 完了チェックリスト

```markdown
リファクタリング:
  □ 5つの巨大ファイルを分割完了
  □ 最大ファイルサイズ 800行以下
  □ 既存機能の動作確認

コード品質:
  □ ESLint設定完了、エラー0件
  □ Prettier設定完了
  □ pre-commit hook設定 (husky)

テスト:
  □ 20以上のテストファイル追加
  □ カバレッジ30%達成
  □ CI/CDパイプラインでカバレッジレポート
```

---

## Phase 3: 品質向上

**期間**: 4-8週間
**優先度**: 🟢 MEDIUM

### 目標

1. テストカバレッジ80%達成
2. パフォーマンス最適化
3. ドキュメント整備

### タスクリスト

#### 3.1 完全テストカバレッジ (推定: 10-15日)

**目標**: 全コンポーネント・サービスのテスト

```markdown
残りのサービス層:
  □ api/gemini-client.test.ts
  □ api/vector-search.test.ts
  □ api/emotion-analysis.test.ts
  □ image-generation/sd-image-generator.test.ts
  □ mem0/character-service.test.ts
  □ tts/safari-tts-manager.test.ts

残りのストア層:
  □ history.slice.test.ts
  □ suggestion.slice.test.ts
  □ ui.slice.test.ts

全コンポーネント層 (重要度順):
  □ GroupChatInterface.test.tsx
  □ CharacterGallery.test.tsx
  □ MemoryGallery.test.tsx
  □ SettingsModal.test.tsx
  □ (その他全97コンポーネント)

E2Eテスト拡張:
  □ critical-user-flows.spec.ts
  □ cross-browser-compatibility.spec.ts
  □ accessibility.spec.ts
```

#### 3.2 パフォーマンス最適化 (推定: 5-7日)

```typescript
// ========================================
// 最適化1: React.memo の適用
// ========================================

// Before
export function MessageBubble({ message, onRegenerate }: Props) {
  // レンダリングロジック
}

// After
export const MessageBubble = React.memo(function MessageBubble({
  message,
  onRegenerate
}: Props) {
  // レンダリングロジック
}, (prevProps, nextProps) => {
  // カスタム比較関数
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.content === nextProps.message.content;
});

// ========================================
// 最適化2: useCallback の適用
// ========================================

// Before
function ChatInterface() {
  const handleSend = (content: string) => {
    sendMessage(content);
  };

  return <ChatInput onSend={handleSend} />;
}

// After
function ChatInterface() {
  const handleSend = useCallback((content: string) => {
    sendMessage(content);
  }, [sendMessage]);

  return <ChatInput onSend={handleSend} />;
}

// ========================================
// 最適化3: useMemo の適用
// ========================================

// Before
function MessageList({ messages }: Props) {
  const filteredMessages = messages.filter(m => !m.hidden);

  return (
    <div>
      {filteredMessages.map(m => <MessageBubble key={m.id} message={m} />)}
    </div>
  );
}

// After
function MessageList({ messages }: Props) {
  const filteredMessages = useMemo(
    () => messages.filter(m => !m.hidden),
    [messages]
  );

  return (
    <div>
      {filteredMessages.map(m => <MessageBubble key={m.id} message={m} />)}
    </div>
  );
}

// ========================================
// 最適化4: 遅延ロード (React.lazy)
// ========================================

// Before
import { SettingsModal } from './SettingsModal';

// After
const SettingsModal = React.lazy(() => import('./SettingsModal'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SettingsModal />
    </Suspense>
  );
}

// ========================================
// 最適化5: バンドルサイズ削減
// ========================================

// next.config.ts
export default {
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10
        }
      }
    };
    return config;
  }
};
```

#### 3.3 ドキュメント整備 (推定: 3-5日)

```markdown
作成するドキュメント:
  □ ARCHITECTURE.md - システムアーキテクチャ図
  □ API_REFERENCE.md - 内部API仕様
  □ DEVELOPMENT_GUIDE.md - 開発者向けガイド
  □ TESTING_GUIDE.md - テスト作成ガイド
  □ DEPLOYMENT_GUIDE.md - デプロイ手順
  □ TROUBLESHOOTING.md - よくある問題と解決策

更新するドキュメント:
  □ README.md - プロジェクト概要を最新化
  □ CONTRIBUTING.md - 貢献ガイドライン
  □ CHANGELOG.md - 変更履歴
```

### Phase 3 完了チェックリスト

```markdown
テスト:
  □ カバレッジ80%達成
  □ 全コンポーネントのテスト完了
  □ E2Eテスト拡充
  □ ビジュアルリグレッションテスト導入

パフォーマンス:
  □ Lighthouseスコア 90以上
  □ バンドルサイズ 30%削減
  □ 初期ロード時間 2秒以内

ドキュメント:
  □ 7つの主要ドキュメント作成
  □ コードコメント追加
  □ JSDoc形式のAPI文書
```

---

## 実装ガイド

### 開発環境セットアップ

```bash
# 1. 依存パッケージのインストール
npm install -D \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint-config-prettier \
  prettier \
  husky \
  lint-staged

# 2. Huskyのセットアップ
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"

# 3. lint-staged設定
# package.json に追加:
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### 型安全化の段階的アプローチ

```typescript
// ========================================
// Step 1: 型定義の作成
// ========================================
// File: src/types/api/responses.types.ts

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ========================================
// Step 2: 型ガードの実装
// ========================================
// File: src/utils/type-guards.ts

export function isOpenRouterResponse(
  data: unknown
): data is OpenRouterResponse {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const response = data as OpenRouterResponse;

  return (
    typeof response.id === 'string' &&
    typeof response.model === 'string' &&
    Array.isArray(response.choices) &&
    response.choices.length > 0 &&
    typeof response.choices[0].message.content === 'string'
  );
}

// ========================================
// Step 3: 既存コードの段階的置き換え
// ========================================

// Phase 1: unknown + 型ガード
const data: unknown = await response.json();
if (isOpenRouterResponse(data)) {
  return data.choices[0].message.content;
}

// Phase 2: 専用関数で型安全化
async function fetchOpenRouterResponse(
  url: string
): Promise<OpenRouterResponse> {
  const response = await fetch(url);
  const data: unknown = await response.json();

  if (!isOpenRouterResponse(data)) {
    throw new TypeError('Invalid OpenRouter response format');
  }

  return data;
}
```

### テスト作成ガイドライン

```typescript
// ========================================
// テストの基本構造
// ========================================

describe('ComponentName または FunctionName', () => {
  // セットアップ
  beforeEach(() => {
    // 各テスト前の準備
  });

  afterEach(() => {
    // 各テスト後のクリーンアップ
  });

  // 機能ごとにグループ化
  describe('Feature 1', () => {
    it('should do something correctly', () => {
      // Arrange (準備)
      const input = 'test';

      // Act (実行)
      const result = functionUnderTest(input);

      // Assert (検証)
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      // エッジケースのテスト
    });
  });

  describe('Feature 2', () => {
    // 次の機能のテスト
  });
});

// ========================================
// モックの作成
// ========================================

// 1. 関数のモック
const mockFunction = vi.fn();
mockFunction.mockReturnValue('mocked value');

// 2. モジュールのモック
vi.mock('@/services/api-client', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ data: 'test' })
  }
}));

// 3. Zustandストアのモック
vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector) => selector({
    messages: [],
    sendMessage: vi.fn()
  }))
}));

// ========================================
// 非同期処理のテスト
// ========================================

it('should handle async operation', async () => {
  const promise = asyncFunction();

  await expect(promise).resolves.toBe('expected value');
});

it('should handle async error', async () => {
  const promise = asyncFunctionThatThrows();

  await expect(promise).rejects.toThrow('Error message');
});
```

---

## 検証方法

### 型安全性の検証

```bash
# TypeScriptコンパイルエラーチェック
npm run type-check

# 特定ファイルの型チェック
npx tsc --noEmit src/services/simple-api-manager-v2.ts

# any型の使用箇所を確認
grep -r ": any" src/ | wc -l

# 目標値と比較
# Phase 1: 200以下
# Phase 2: 100以下
# Phase 3: 0
```

### テストカバレッジの検証

```bash
# カバレッジレポート生成
npm run test:coverage

# カバレッジ閾値チェック
# package.json に追加:
{
  "vitest": {
    "coverage": {
      "provider": "v8",
      "reporter": ["text", "json", "html"],
      "statements": 80,
      "branches": 80,
      "functions": 80,
      "lines": 80
    }
  }
}
```

### コード品質の検証

```bash
# ESLintチェック
npm run lint

# 複雑度チェック
npx eslint src/ --ext .ts,.tsx --max-warnings 0

# フォーマットチェック
npm run format -- --check
```

### パフォーマンスの検証

```bash
# バンドルサイズ分析
npm run analyze

# Lighthouse CI
npm run perf:lighthouse

# 目標値:
# - Performance: 90+
# - Accessibility: 100
# - Best Practices: 95+
# - SEO: 100
```

---

## 新セッション引き継ぎ

### クイックスタート

```markdown
新しいセッションを開始する際の手順:

1. 現状確認
   - [ ] `git status` で変更内容確認
   - [ ] `git log -5` で最近のコミット確認
   - [ ] このドキュメントのPhase進捗確認

2. 環境セットアップ
   - [ ] `npm install` で依存関係更新
   - [ ] `npm run type-check` で型エラー確認
   - [ ] `npm run lint` でコード品質確認

3. タスク選択
   - [ ] Phase 1, 2, 3のチェックリストから未完了タスク特定
   - [ ] 優先度の高いタスクから着手

4. 実装開始
   - [ ] 該当Phaseの実装ガイドを参照
   - [ ] テスト駆動開発(TDD)で実装
   - [ ] コミット前に検証コマンド実行
```

### 重要なファイル

```
プロジェクト構造:
  src/
    ├── services/         # ビジネスロジック層 (93ファイル)
    ├── store/           # 状態管理層 (20スライス)
    ├── components/      # プレゼンテーション層 (97ファイル)
    ├── hooks/           # カスタムフック (16ファイル)
    ├── types/           # 型定義 (26ファイル)
    └── utils/           # ユーティリティ

重要な設定ファイル:
  - tsconfig.json      # TypeScript設定
  - .eslintrc.json     # ESLint設定 (Phase 2で追加)
  - .prettierrc.json   # Prettier設定 (Phase 2で追加)
  - package.json       # npm scripts
  - vitest.config.ts   # テスト設定

ドキュメント:
  - claudedocs/CODE_QUALITY_IMPROVEMENT_MASTER_PLAN.md (このファイル)
  - claudedocs/PHASE3_IMPLEMENTATION_GUIDE.md
  - 🎯 AI Chat V3 完全開発ガイド.md
```

### よくある質問

**Q1: どのPhaseから開始すべきか？**

A: 現在の状況に応じて選択:
- 型エラーが頻発 → Phase 1の型安全性改善
- リファクタリングが必要 → Phase 2の構造改善
- 安定稼働中 → Phase 3の品質向上

**Q2: 既存機能への影響は？**

A: 全てのPhaseで後方互換性を維持:
- リファクタリングは内部実装のみ変更
- 公開APIは変更しない
- テストで動作確認を徹底

**Q3: 推奨される作業時間配分は？**

A:
- Phase 1: 1-2週間 (緊急度高)
- Phase 2: 2-4週間 (構造改善)
- Phase 3: 4-8週間 (品質向上)

各Phaseは並行実施可能（異なる領域を担当する場合）

---

## 付録

### A. ESLintルール詳細

```json
{
  "rules": {
    // 型安全性（最優先）
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "warn",
    "@typescript-eslint/no-unsafe-member-access": "warn",

    // コード複雑度
    "complexity": ["warn", 15],              // 循環的複雑度15以下
    "max-lines": ["warn", 500],              // ファイル500行以下
    "max-lines-per-function": ["warn", 100], // 関数100行以下
    "max-depth": ["warn", 4],                // ネスト4階層以下

    // 命名規則
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "interface",
        "format": ["PascalCase"]
      },
      {
        "selector": "typeAlias",
        "format": ["PascalCase"]
      }
    ],

    // デバッグコード
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-debugger": "error",

    // React
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### B. テストカバレッジ目標

| レイヤー | Phase 1 | Phase 2 | Phase 3 |
|---------|---------|---------|---------|
| サービス層 | 20% | 40% | 90% |
| ストア層 | 10% | 30% | 85% |
| ユーティリティ層 | 30% | 60% | 95% |
| コンポーネント層 | 0% | 15% | 70% |
| **全体** | **15%** | **30%** | **80%** |

### C. パフォーマンス目標

| メトリクス | 現状 | 目標 |
|----------|------|------|
| 初期ロード時間 | 3.5s | 2.0s |
| Time to Interactive | 4.2s | 2.5s |
| バンドルサイズ (gzip) | 450KB | 300KB |
| Lighthouse Performance | 75 | 90+ |
| Lighthouse Accessibility | 92 | 100 |

---

## まとめ

このマスタープランは、AI Chat V3プロジェクトの品質を体系的に向上させるための包括的なロードマップです。

**成功の鍵**:
1. 段階的な実施（一度に全てをやらない）
2. テスト駆動開発（TDD）の徹底
3. 継続的なコードレビュー
4. 定期的な進捗確認

**期待される効果**:
- バグ発生率: -60%
- 開発速度: +40%
- リファクタリング安全性: +80%
- チーム生産性: +50%

---

**次のステップ**: Phase 1の型安全性改善から着手することを推奨します。

**連絡先**: 質問や問題が発生した場合は、GitHubのIssueで報告してください。

**最終更新**: 2025-10-30
