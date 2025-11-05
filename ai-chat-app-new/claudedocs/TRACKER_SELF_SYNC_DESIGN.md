# TrackerManager 自己同期型設計書

**作成日**: 2025-11-04
**目的**: TrackerManagerを完璧な自己同期型に改造し、二度と同じ問題が起きないようにする

---

## 📊 現状分析

### 更新メソッド（2つ）
1. `updateTracker()` (Line 189-234)
   - 手動更新用
   - TrackerDisplay.tsxから呼ばれる

2. `analyzeMessageForTrackerUpdates()` (Line 311-414)
   - AI自動更新用
   - 内部でupdateTracker()を呼ぶ
   - message-send-handler.ts、groupChat.sliceから呼ばれる

### 呼び出し箇所（10箇所）

| # | ファイル | メソッド | 用途 |
|---|---------|---------|------|
| 1 | TrackerDisplay.tsx:267 | updateTracker | 手動+ |
| 2 | TrackerDisplay.tsx:270 | updateTracker | 手動変更 |
| 3 | chat-tracker-integration.ts:Line不明 | updateTracker | テスト用？ |
| 4 | chat-tracker-integration.ts:Line不明 | analyzeMessage | 分析 |
| 5 | message-send-handler.ts:551 | analyzeMessage | User |
| 6 | message-send-handler.ts:555 | analyzeMessage | AI |
| 7 | message-send-handler.ts:605 | analyzeMessage | Error User |
| 8 | message-send-handler.ts:609 | analyzeMessage | Error AI |
| 9 | groupChat.slice.ts:Line不明 | analyzeMessage | Group1 |
| 10 | groupChat.slice.ts:Line不明 | analyzeMessage | Group2 |

### TrackerManager生成箇所（7箇所）

全て `new TrackerManager()` で引数なし。

| # | ファイル | 用途 |
|---|---------|------|
| 1 | store/index.ts | persist復元時 |
| 2-5 | chat-session-management.ts | セッション作成時（4箇所） |
| 6 | chat-tracker-integration.ts | 初期化 |
| 7-8 | groupChat.slice.ts | グループチャット（2箇所） |

---

## 🎯 設計目標

### 必須要件
1. ✅ **完全自動同期**: 呼び出し側は何もしなくて良い
2. ✅ **循環依存回避**: TrackerManagerがZustandに直接依存しない
3. ✅ **テスト可能**: 同期ロジックを独立してテスト可能
4. ✅ **既存コード最小変更**: 呼び出し側の変更を最小限に
5. ✅ **型安全**: TypeScript型チェックで安全性保証

### 禁止事項
- ❌ TrackerManagerがuseAppStoreを直接importする（循環依存）
- ❌ グローバル変数を使う（テスト困難）
- ❌ 既存の公開APIを変更する（破壊的変更）

---

## 💡 選択した設計：コールバック登録方式

### アーキテクチャ

```typescript
┌─────────────────────────────────────────────────────┐
│ Zustand Store (store/index.ts)                      │
│                                                      │
│  1. TrackerManager生成時にsessionIdを設定           │
│  2. グローバル同期コールバックを登録                  │
└─────────────────────────────────────────────────────┘
                           ↓
              ┌────────────────────────┐
              │  TrackerManager        │
              │                        │
              │  - sessionId: string   │ ← 保持
              │  - onSync: callback    │ ← 呼び出し
              └────────────────────────┘
                           ↓
              updateTracker() / analyzeMessage()
                           ↓
              this.onSync(this.sessionId, this)
                           ↓
              ┌────────────────────────┐
              │ Zustand Store Update   │
              │ trackerManagers.set()  │
              │ setState()             │
              └────────────────────────┘
```

### メリット
- ✅ 依存関係が一方向（Zustand → TrackerManager）
- ✅ TrackerManagerがZustandを知らない（疎結合）
- ✅ テスト時はモックコールバックを渡せる
- ✅ 既存の呼び出し側は変更不要

---

## 📋 実装計画

### Phase 1: TrackerManagerにsessionIdとコールバック追加

**ファイル**: `src/services/tracker/tracker-manager.ts`

```typescript
export type TrackerSyncCallback = (sessionId: string, manager: TrackerManager) => void;

export class TrackerManager {
  private trackerSets: Map<string, TrackerSet> = new Map();
  private updateCallbacks: Set<(update: InternalTrackerUpdate) => void> = new Set();

  // 🆕 追加
  private sessionId: string | null = null;
  private syncCallback: TrackerSyncCallback | null = null;

  /**
   * セッションIDと同期コールバックを設定
   *
   * @param sessionId - このTrackerManagerが属するセッションID
   * @param syncCallback - 更新時に呼ばれる同期コールバック
   */
  configure(sessionId: string, syncCallback: TrackerSyncCallback): void {
    this.sessionId = sessionId;
    this.syncCallback = syncCallback;
    logger.debug(`[TrackerManager] Configured for session: ${sessionId}`);
  }

  /**
   * 内部: Zustandストアに同期
   */
  private syncToStore(): void {
    if (this.sessionId && this.syncCallback) {
      this.syncCallback(this.sessionId, this);
      logger.debug(`💾 [TrackerManager] Synced to store for session: ${this.sessionId}`);
    } else {
      logger.warn(`⚠️ [TrackerManager] Cannot sync: sessionId or callback not configured`);
    }
  }

  updateTracker(...): boolean {
    // ... 既存のロジック ...

    tracker.current_value = newValue;
    trackerSet.last_updated = new Date().toISOString();
    // ...

    // 🆕 自動同期
    this.syncToStore();

    return true;
  }
}
```

### Phase 2: Zustand側でコールバックを登録

**ファイル**: `src/store/slices/chat/chat-tracker-integration.ts`

```typescript
initializeTrackerForSession: async (sessionId: UUID, character: Character) => {
  // ... 既存のロジック ...

  const trackerManager = new TrackerManager();

  // 🆕 sessionIdとコールバックを設定
  trackerManager.configure(sessionId, (sid, manager) => {
    // Zustandストアを更新
    const store = useAppStore.getState();
    const newManagers = new Map(store.trackerManagers);
    newManagers.set(sid, manager);
    useAppStore.setState({ trackerManagers: newManagers });
  });

  // キャラクターのトラッカー設定を初期化
  if (character.trackers && character.trackers.length > 0) {
    trackerManager.initializeTrackerSet(character.id, character.trackers);
  }

  // Mapに追加
  trackerManagers.set(sessionId, trackerManager);

  // ストアを更新
  set({ trackerManagers: new Map(trackerManagers) });
}
```

### Phase 3: store/index.ts の復元処理も修正

**ファイル**: `src/store/index.ts`

```typescript
reviver: (key, value) => {
  // ... 既存のロジック ...

  if (key === "trackerManagers") {
    const restoredMap = new Map();
    for (const [sessionId, serializedManager] of mapData.value) {
      const manager = new TrackerManager();

      // 🆕 configure を呼ぶ
      manager.configure(sessionId, (sid, mgr) => {
        const store = useAppStore.getState();
        const newManagers = new Map(store.trackerManagers);
        newManagers.set(sid, mgr);
        useAppStore.setState({ trackerManagers: newManagers });
      });

      // データ復元
      manager.loadFromObject(serializedManager.value);

      restoredMap.set(sessionId, manager);
    }
    return restoredMap;
  }
}
```

### Phase 4: 他の生成箇所も修正

**ファイル**: `src/store/slices/chat/chat-session-management.ts`

全ての `new TrackerManager()` の後に `.configure()` を追加。

---

## 🧪 テスト戦略

### 単体テスト

```typescript
describe('TrackerManager Self-Sync', () => {
  test('should call sync callback when tracker is updated', () => {
    const trackerManager = new TrackerManager();
    const mockSync = jest.fn();

    trackerManager.configure('test-session', mockSync);
    trackerManager.initializeTrackerSet('char-1', [/* trackers */]);
    trackerManager.updateTracker('char-1', 'trust', 50);

    expect(mockSync).toHaveBeenCalledWith('test-session', trackerManager);
  });

  test('should sync after AI auto-update', () => {
    const trackerManager = new TrackerManager();
    const mockSync = jest.fn();

    trackerManager.configure('test-session', mockSync);
    trackerManager.initializeTrackerSet('char-1', [/* trackers */]);

    const message = { role: 'user', content: 'ありがとう' };
    trackerManager.analyzeMessageForTrackerUpdates(message, 'char-1');

    expect(mockSync).toHaveBeenCalled();
  });
});
```

### 統合テスト

1. セッション作成
2. トラッカー手動更新
3. LocalStorage確認
4. ページリロード
5. 値が保持されているか確認

---

## ⚠️ リスク分析

### リスク1: 既存のTrackerManager生成箇所を見落とす
**影響**: その箇所では同期されない
**緩和策**:
- Grepで全箇所を特定済み（7箇所）
- TypeScriptの型チェックで警告
- configure()呼び忘れの検出ロジック追加

### リスク2: 循環更新（無限ループ）
**影響**: スタックオーバーフロー
**緩和策**:
- syncToStore()内でフラグチェック
- 既に同期中なら何もしない

### リスク3: パフォーマンス低下
**影響**: 更新のたびにZustand setState
**緩和策**:
- デバウンス（100ms）
- バッチ更新（複数更新を1回にまとめる）

---

## 📊 成功基準

### 必須
- ✅ 手動更新が保存される
- ✅ AI自動更新が保存される
- ✅ ページリロード後も値が保持
- ✅ 全ての呼び出し箇所で動作

### 推奨
- ✅ パフォーマンス低下なし
- ✅ コンソールエラーなし
- ✅ TypeScript型エラーなし

---

## 次のステップ

1. ✅ 設計完了
2. ⏳ Phase 1実装（TrackerManager改造）
3. ⏳ Phase 2実装（Zustand側修正）
4. ⏳ Phase 3実装（復元処理）
5. ⏳ Phase 4実装（他の生成箇所）
6. ⏳ テスト実行
7. ⏳ 動作確認

---

**作成者**: Claude Code (Sonnet 4.5)
**ステータス**: 設計完了、実装準備完了
**推定作業時間**: 1-2時間
