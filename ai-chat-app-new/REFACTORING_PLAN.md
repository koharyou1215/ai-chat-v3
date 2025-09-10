# Chat.slice.ts リファクタリング実装計画

## 🎯 目標
2192行の巨大ファイルを200行以下に縮小し、保守性を向上

## 📊 現状分析
- **総行数**: 2,192行
- **メソッド数**: 30以上
- **責務**: 8つ以上（メッセージ送信、セッション管理、プログレッシブ処理、エラー処理等）
- **問題点**: 
  - 単一責任原則違反
  - テスト困難性
  - 並行開発の困難性

## 🔄 Phase 1: 基盤整備（リスク: 低）
**期間**: 1週間
**影響範囲**: 新規ファイル作成のみ

### 1.1 エラーハンドリング基盤
```typescript
// src/services/chat/error-handler.service.ts
export class ChatErrorHandler {
  static getDetailedErrorMessage(error: unknown): string
  static showUserFriendlyError(message: string): void
  static logError(error: unknown, context: string): void
}
```

### 1.2 Map操作ヘルパー
```typescript
// src/utils/chat/map-helpers.ts
export function getSessionSafely<T>(
  sessions: Map<string, T> | Record<string, T> | undefined,
  sessionId: string
): T | undefined

export function createMapSafely<K, V>(
  source: Map<K, V> | Record<string, V> | undefined
): Map<K, V>
```

### 1.3 型定義の整理
```typescript
// src/types/chat/error.types.ts
export interface ChatError {
  type: 'send' | 'receive' | 'parse' | 'network';
  message: string;
  timestamp: string;
  details?: unknown;
}
```

## 🔧 Phase 2: サービス層実装（リスク: 中）
**期間**: 2週間
**影響範囲**: 新規サービス作成、既存コードからの抽出

### 2.1 メッセージ送信サービス
```typescript
// src/services/chat/message-sender.service.ts
export class MessageSenderService {
  constructor(
    private get: () => ChatState,
    private set: (state: Partial<ChatState>) => void
  ) {}

  async sendMessage(content: string, imageUrl?: string): Promise<void>
  async sendToAPI(message: UnifiedMessage): Promise<string>
  private validateMessage(content: string): void
  private createUserMessage(content: string): UnifiedMessage
}
```

### 2.2 プログレッシブハンドラー
```typescript
// src/services/chat/progressive-handler.service.ts
export class ProgressiveMessageHandler {
  async handleStage1(params: Stage1Params): Promise<StageContent>
  async handleStage2(params: Stage2Params): Promise<StageContent>
  async handleStage3(params: Stage3Params): Promise<StageContent>
  private updateProgressiveMessage(message: ProgressiveMessage): void
}
```

### 2.3 セッション管理サービス
```typescript
// src/services/chat/session-manager.service.ts
export class SessionManagerService {
  createSession(character: Character, persona: Persona): Promise<UUID>
  deleteSession(sessionId: UUID): void
  updateSession(session: Partial<UnifiedChatSession>): void
  getActiveSession(): UnifiedChatSession | null
  rollbackSession(messageId: UUID): void
}
```

## 🚀 Phase 3: 統合と移行（リスク: 高）
**期間**: 1週間
**影響範囲**: chat.slice.tsの大幅な変更

### 3.1 Sliceの軽量化
```typescript
// src/store/slices/chat.slice.ts (リファクタリング後)
export const createChatSlice = (set, get) => {
  // Services
  const messageSender = new MessageSenderService(get, set);
  const sessionManager = new SessionManagerService(get, set);
  const progressiveHandler = new ProgressiveMessageHandler(get, set);
  
  return {
    // State only
    messages: new Map(),
    sessions: new Map(),
    activeSessionId: null,
    is_generating: false,
    lastError: null,
    
    // Delegated actions
    sendMessage: messageSender.sendMessage.bind(messageSender),
    createSession: sessionManager.createSession.bind(sessionManager),
    sendProgressiveMessage: progressiveHandler.handle.bind(progressiveHandler),
    // ... other delegated methods
  };
};
```

## 📈 成功指標
- [ ] ファイルサイズ: 2192行 → 200行以下
- [ ] テストカバレッジ: 0% → 80%以上
- [ ] ビルド時間: 変化なし
- [ ] ランタイムパフォーマンス: 変化なし
- [ ] 開発者体験: 改善（アンケート実施）

## ⚠️ リスクと対策

### リスク1: 実行時エラー
**対策**: 
- 段階的移行
- 既存テストの維持
- Feature flagによる切り替え

### リスク2: パフォーマンス劣化
**対策**:
- ベンチマーク測定
- プロファイリング実施
- 必要に応じてロールバック

### リスク3: 開発速度の低下
**対策**:
- ドキュメント整備
- ペアプログラミング
- 段階的レビュー

## 🧪 テスト戦略

### Phase 1テスト
```typescript
// error-handler.test.ts
describe('ChatErrorHandler', () => {
  test('should parse API errors correctly', () => {
    const error = new Error('API quota exceeded');
    expect(ChatErrorHandler.getDetailedErrorMessage(error))
      .toBe('API利用制限に達しました');
  });
});
```

### Phase 2テスト
```typescript
// message-sender.test.ts
describe('MessageSenderService', () => {
  test('should send message successfully', async () => {
    const service = new MessageSenderService(mockGet, mockSet);
    await service.sendMessage('Hello');
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ is_generating: true })
    );
  });
});
```

### 統合テスト
```typescript
// chat.integration.test.ts
describe('Chat System Integration', () => {
  test('should handle complete message flow', async () => {
    // End-to-end test
  });
});
```

## 📅 タイムライン

| 週 | フェーズ | タスク | 担当 |
|----|---------|--------|------|
| 1 | Phase 1 | 基盤整備 | 全員 |
| 2-3 | Phase 2 | サービス実装 | 分担 |
| 4 | Phase 3 | 統合・移行 | リード |
| 5 | 検証 | テスト・調整 | QA |

## 🎯 次のステップ
1. このプランのレビューと承認
2. Phase 1の実装開始
3. 週次進捗レビュー設定
4. ドキュメント作成

## 📚 参考資料
- [SOLID原則](https://en.wikipedia.org/wiki/SOLID)
- [リファクタリング - Martin Fowler](https://refactoring.com/)
- [Clean Code - Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)