# Session-Scoped TrackerManager Implementation Plan

**Goal:** TrackerManagerをキャラクター単位からセッション単位に変更し、新しいセッション作成時に必ず`initial_value`にリセットする

**Date:** 2025-10-06
**Priority:** High
**Risk Level:** Medium (型エラーの可能性あり)

---

## 1. Current Architecture Analysis

### 1.1 Current Data Structure

```typescript
// 現在のストア構造
interface AppStore {
  trackerManagers: Map<characterId, TrackerManager>;  // ← キャラクター単位
  sessions: Map<sessionId, UnifiedChatSession>;
  active_session_id: UUID | null;
}

// 現在のセッション作成フロー
createSession(character, persona) {
  // 既存のTrackerManagerを再利用（同じキャラクターなら）
  if (!trackerManagers.has(character.id)) {
    trackerManager = new TrackerManager();
    trackerManager.initializeTrackerSet(character.id, character.trackers);
    trackerManagers.set(character.id, trackerManager);
  } else {
    trackerManager = trackerManagers.get(character.id);  // ← 再利用
  }
}
```

**問題点:**
- ✅ 同じキャラクターで新しいセッションを作成しても、トラッカー値が保持される
- ❌ ユーザーが「新しいセッション」として期待する「完全リセット」が行われない

---

## 2. Target Architecture

### 2.1 New Data Structure

```typescript
// 新しいストア構造
interface AppStore {
  trackerManagers: Map<sessionId, TrackerManager>;  // ← セッション単位に変更
  sessions: Map<sessionId, UnifiedChatSession>;
  active_session_id: UUID | null;
}

// 新しいセッション作成フロー
createSession(character, persona) {
  const sessionId = generateSessionId();

  // セッションごとに必ず新しいTrackerManagerを作成
  const trackerManager = new TrackerManager();
  trackerManager.initializeTrackerSet(character.id, character.trackers);
  trackerManagers.set(sessionId, trackerManager);  // ← セッションIDで保存

  return sessionId;
}
```

**改善点:**
- ✅ 新しいセッション = 必ず`initial_value`から開始
- ✅ セッション間でトラッカー値が完全に独立
- ✅ ユーザーの期待に一致する動作

---

## 3. Impact Analysis

### 3.1 Affected Files

| File | Impact | Changes Required |
|------|--------|-----------------|
| `src/store/index.ts` | High | `trackerManagers` の型定義変更、persist設定 |
| `src/store/slices/chat/chat-tracker-integration.ts` | High | 全メソッドの`characterId` → `sessionId`変更 |
| `src/store/slices/chat/chat-session-management.ts` | High | `createSession`のTrackerManager初期化ロジック |
| `src/services/prompt-builder.service.ts` | Medium | `getTrackerManager`の引数を`sessionId`に変更 |
| `src/store/slices/chat/operations/*.ts` | Medium | TrackerManager取得ロジックの変更 |
| `src/components/tracker/TrackerDisplay.tsx` | Low | `getTrackerManager`の呼び出し方変更 |
| `src/types/core/session.types.ts` | Low | 型定義の更新（オプション） |

### 3.2 Breaking Changes

#### ❌ 破壊的変更
1. **`trackerManagers` の型変更**
   - Before: `Map<characterId, TrackerManager>`
   - After: `Map<sessionId, TrackerManager>`

2. **`getTrackerManager()` の引数変更**
   - Before: `getTrackerManager(characterId: UUID)`
   - After: `getTrackerManager(sessionId: UUID)`

3. **LocalStorage のデータ移行**
   - 既存のLocalStorageデータは互換性なし
   - マイグレーション処理が必要

#### ✅ 互換性維持
- `TrackerManager`クラス自体は変更不要
- トラッカー定義（`TrackerDefinition`）は変更不要
- UIコンポーネントは最小限の変更

---

## 4. Implementation Steps

### Phase 1: Type Definitions (型定義の更新)

#### Step 1.1: Update `TrackerIntegration` interface

**File:** `src/store/slices/chat/chat-tracker-integration.ts`

```typescript
export interface TrackerIntegration {
  // Before: Map<characterId, TrackerManager>
  // After: Map<sessionId, TrackerManager>
  trackerManagers: Map<UUID, TrackerManager>;  // ← 意味的には変更（キーがsessionIdに）

  // メソッドシグネチャの変更
  initializeTrackerForSession: (sessionId: UUID, character: Character) => Promise<void>;
  getTrackerManager: (sessionId: UUID) => TrackerManager | undefined;  // ← 引数変更
  updateTrackerValues: (sessionId: UUID, updates: Record<string, number>) => void;
  resetTrackerForSession: (sessionId: UUID) => void;  // ← メソッド名変更
  cleanupUnusedTrackers: (activeSessionIds: UUID[]) => void;
}
```

#### Step 1.2: Update `AppStore` type

**File:** `src/store/index.ts`

```typescript
export type AppStore = ChatSlice &
  GroupChatSlice &
  CharacterSlice &
  PersonaSlice &
  MemorySlice &
  TrackerSlice &
  HistorySlice &
  SettingsSlice &
  SuggestionSlice &
  UISlice & {
    // Before: Map<characterId, TrackerManager>
    // After: Map<sessionId, TrackerManager>
    trackerManagers: Map<UUID, TrackerManager>;  // ← 型自体は同じだが意味が変わる
    apiManager: SimpleAPIManagerV2;
    promptBuilderService: PromptBuilderService;
    clearConversationCache: (sessionId: string) => void;
    [key: string]: unknown;
  };
```

**注意:** 型定義自体は `Map<UUID, TrackerManager>` のまま変更なし。しかし、キーの意味が「キャラクターID」から「セッションID」に変わる。

---

### Phase 2: Store Layer (ストア層の変更)

#### Step 2.1: Update `chat-tracker-integration.ts`

**File:** `src/store/slices/chat/chat-tracker-integration.ts`

**変更内容:**

```typescript
export const createTrackerIntegration: StateCreator<
  AppStore,
  [],
  [],
  TrackerIntegration
> = (set, get) => ({
  trackerManagers: new Map(),

  /**
   * セッションのトラッカーを初期化
   * 🆕 キャラクターIDではなくセッションIDで管理
   */
  initializeTrackerForSession: async (sessionId: UUID, character: Character) => {
    const trackerManagers = get().trackerManagers;

    // 🔧 修正: セッションIDで確認（同じキャラクターでも新しいセッションなら新規作成）
    if (trackerManagers.has(sessionId)) {
      console.log(`✅ Tracker already initialized for session: ${sessionId}`);
      return;
    }

    try {
      const { TrackerManager } = await import("@/services/tracker/tracker-manager");
      const trackerManager = new TrackerManager();

      if (character.trackers && character.trackers.length > 0) {
        trackerManager.initializeTrackerSet(character.id, character.trackers);
        console.log(
          `🎯 Initialized ${character.trackers.length} trackers for session: ${sessionId} (character: ${character.name})`
        );
      }

      // 🔧 修正: セッションIDで保存
      trackerManagers.set(sessionId, trackerManager);

      set({ trackerManagers: new Map(trackerManagers) });

    } catch (error) {
      console.error(
        `❌ Failed to initialize tracker for session ${sessionId}:`,
        error
      );
    }
  },

  /**
   * 指定されたセッションIDのトラッカーマネージャーを取得
   * 🔧 修正: 引数をsessionIdに変更
   */
  getTrackerManager: (sessionId: UUID): TrackerManager | undefined => {
    const trackerManagers = get().trackerManagers;

    if (trackerManagers instanceof Map) {
      return trackerManagers.get(sessionId);  // ← sessionIdで取得
    } else if (typeof trackerManagers === "object") {
      return (trackerManagers as any)[sessionId];
    }

    return undefined;
  },

  /**
   * トラッカーの値を更新
   * 🔧 修正: 引数をsessionIdに変更
   */
  updateTrackerValues: (sessionId: UUID, updates: Record<string, number>) => {
    const trackerManager = get().getTrackerManager(sessionId);

    if (!trackerManager) {
      console.warn(`⚠️ No tracker manager found for session: ${sessionId}`);
      return;
    }

    // 🔧 修正: characterIdはセッションから取得
    const session = get().sessions.get(sessionId);
    if (!session || session.participants.characters.length === 0) {
      console.warn(`⚠️ No character found in session: ${sessionId}`);
      return;
    }

    const characterId = session.participants.characters[0].id;

    // 各トラッカーの値を更新
    Object.entries(updates).forEach(([trackerName, value]) => {
      try {
        const trackerSet = trackerManager.getTrackerSet(characterId);
        let tracker: any = null;
        let currentValue: any = undefined;

        if (trackerSet?.trackers instanceof Map) {
          trackerSet.trackers.forEach((t: any, key: string) => {
            if (key === trackerName || t.name === trackerName) {
              tracker = t;
              currentValue = t.value;
            }
          });
        }

        if (currentValue !== undefined) {
          const numericValue = typeof value === 'number' ? value : 0;
          const numericCurrent = typeof currentValue === 'number' ? currentValue : 0;
          trackerManager.updateTracker(
            characterId,
            trackerName,
            numericValue - numericCurrent
          );
          console.log(
            `📊 Updated tracker "${trackerName}" for session ${sessionId}: ${currentValue} → ${value}`
          );
        }
      } catch (error) {
        console.error(`❌ Failed to update tracker "${trackerName}":`, error);
      }
    });

    set({ trackerManagers: new Map(get().trackerManagers) });
  },

  /**
   * セッションのトラッカーをリセット
   * 🔧 修正: メソッド名をresetTrackerForSessionに変更
   */
  resetTrackerForSession: (sessionId: UUID) => {
    const session = get().sessions.get(sessionId);

    if (!session || session.participants.characters.length === 0) {
      console.warn(`⚠️ Session or character not found: ${sessionId}`);
      return;
    }

    const character = session.participants.characters[0];
    const trackerManager = get().getTrackerManager(sessionId);

    if (trackerManager && character.trackers) {
      // 全てのトラッカーを初期値にリセット
      trackerManager.initializeTrackerSet(character.id, character.trackers);
      console.log(`🔄 Reset all trackers for session: ${sessionId}`);

      set({ trackerManagers: new Map(get().trackerManagers) });
    }
  },

  /**
   * 使用されていないトラッカーをクリーンアップ
   * 🔧 修正: activeCharacterIds → activeSessionIds
   */
  cleanupUnusedTrackers: (activeSessionIds: UUID[]) => {
    const trackerManagers = get().trackerManagers;
    const activeSet = new Set(activeSessionIds);
    const beforeSize = trackerManagers.size;

    // アクティブでないセッションのトラッカーを削除
    for (const sessionId of trackerManagers.keys()) {
      if (!activeSet.has(sessionId)) {
        trackerManagers.delete(sessionId);
        console.log(`🧹 Cleaned up tracker for inactive session: ${sessionId}`);
      }
    }

    const cleanedCount = beforeSize - trackerManagers.size;
    if (cleanedCount > 0) {
      console.log(
        `📊 Tracker cleanup: Removed ${cleanedCount} inactive trackers (${trackerManagers.size} remaining)`
      );

      set({ trackerManagers: new Map(trackerManagers) });
    }
  },
});
```

#### Step 2.2: Update `chat-session-management.ts`

**File:** `src/store/slices/chat/chat-session-management.ts`

**変更内容:**

```typescript
createSession: async (character, persona) => {
  const sessionId = generateSessionId();

  // 🔧 修正: セッションIDでTrackerManagerを初期化
  // 既存のTrackerManagerを再利用しない（必ず新規作成）
  const { TrackerManager } = await import("@/services/tracker/tracker-manager");
  const trackerManager = new TrackerManager();
  trackerManager.initializeTrackerSet(character.id, character.trackers);

  const trackerManagers = get().trackerManagers;
  trackerManagers.set(sessionId, trackerManager);  // ← sessionIdで保存

  const newSession: UnifiedChatSession = {
    id: sessionId,
    // ... (他のフィールドは変更なし)
  };

  const sessions = new Map(get().sessions);
  sessions.set(sessionId, newSession);

  set({
    sessions,
    active_session_id: sessionId,
    trackerManagers: new Map(trackerManagers)  // ← 更新
  });

  return sessionId;
}
```

---

### Phase 3: Service Layer (サービス層の変更)

#### Step 3.1: Update `prompt-builder.service.ts`

**File:** `src/services/prompt-builder.service.ts`

**変更箇所1: `buildBasicInfo` メソッド**

```typescript
private async buildBasicInfo(
  character: Character,
  user: Persona,
  userInput: string,
  sessionId: UUID,  // 🆕 引数追加
  trackerManager?: TrackerManager
): Promise<string> {
  // ... (既存のコード)

  // 🔧 修正: trackerManagerの取得方法
  const effectiveTrackerManager =
    trackerManager ||
    (sessionId && systemSettings.trackerManagers?.get(sessionId));  // ← sessionIdで取得

  if (effectiveTrackerManager) {
    console.log(
      "✅ [PromptBuilder] Found tracker manager for session:",
      sessionId
    );
    // ... (既存のコード)
  }

  // ... (残りのコード)
}
```

**変更箇所2: `buildPromptProgressive` メソッド**

```typescript
public async buildPromptProgressive(
  session: UnifiedChatSession,
  userInput: string,
  trackerManager?: TrackerManager
): Promise<{ basePrompt: string; enhancePrompt: () => Promise<string> }> {
  // ... (既存のコード)

  const basePrompt = await this.buildBasicInfo(
    character,
    user,
    userInput,
    session.id,  // 🆕 sessionIdを渡す
    trackerManager
  );

  // ... (残りのコード)
}
```

#### Step 3.2: Update Message Handlers

**Files:**
- `src/store/slices/chat/operations/message-send-handler.ts`
- `src/store/slices/chat/operations/message-regeneration-handler.ts`
- `src/store/slices/chat/operations/message-continuation-handler.ts`

**変更内容（共通）:**

```typescript
// Before: characterIdでTrackerManager取得
const trackerManager = characterId
  ? get().trackerManagers.get(characterId)
  : null;

// After: sessionIdでTrackerManager取得
const trackerManager = session?.id
  ? get().trackerManagers.get(session.id)
  : null;
```

---

### Phase 4: UI Components (UIコンポーネントの変更)

#### Step 4.1: Update `TrackerDisplay.tsx`

**File:** `src/components/tracker/TrackerDisplay.tsx`

**変更内容:**

```typescript
// Before: characterIdで取得
const trackerManager = useAppStore((state) =>
  state.getTrackerManager(characterId)
);

// After: sessionIdで取得
const activeSessionId = useAppStore((state) => state.active_session_id);
const trackerManager = useAppStore((state) =>
  activeSessionId ? state.getTrackerManager(activeSessionId) : undefined
);
```

---

### Phase 5: Data Migration (データ移行)

#### Step 5.1: Add Migration Logic

**File:** `src/store/index.ts`

```typescript
migrate: (persistedState: unknown, version: number) => {
  const state = persistedState as Partial<AppStore>;

  // version 3から4へのマイグレーション
  if (version < 4) {
    console.log("🔄 Migration v4: Converting character-scoped to session-scoped trackers");

    // 古い形式のtrackerManagers（characterId → TrackerManager）をクリア
    if (state.trackerManagers) {
      console.warn("⚠️ Clearing old character-scoped trackerManagers");
      state.trackerManagers = new Map();  // 空のMapで初期化
    }

    // 既存セッションのTrackerManagerは再作成が必要
    // （セッション作成時に自動的に再初期化される）
  }

  return state as AppStore;
},
version: 4,  // ← バージョンアップ
```

**注意:**
- 既存のLocalStorageデータは互換性がないため、クリアする
- ユーザーには「トラッカー値がリセットされる」旨を通知する必要がある（オプション）

---

## 5. Testing Strategy

### 5.1 Unit Tests

```typescript
// test: Session-scoped tracker initialization
test("TrackerManager is created per session", () => {
  const store = useAppStore.getState();
  const session1 = await store.createSession(character1, persona);
  const session2 = await store.createSession(character1, persona);  // 同じキャラクター

  const tracker1 = store.getTrackerManager(session1);
  const tracker2 = store.getTrackerManager(session2);

  expect(tracker1).not.toBe(tracker2);  // ← 異なるインスタンス
});

// test: Tracker values are isolated
test("Tracker values are isolated between sessions", () => {
  const store = useAppStore.getState();
  const session1 = await store.createSession(character1, persona);
  const session2 = await store.createSession(character1, persona);

  // session1のトラッカーを更新
  store.updateTrackerValues(session1, { affection: 80 });

  const tracker1 = store.getTrackerManager(session1);
  const tracker2 = store.getTrackerManager(session2);

  const affection1 = tracker1.getTrackerSet(character1.id).trackers.get("affection").current_value;
  const affection2 = tracker2.getTrackerSet(character1.id).trackers.get("affection").current_value;

  expect(affection1).toBe(80);
  expect(affection2).toBe(50);  // ← initial_value
});
```

### 5.2 Integration Tests

1. **セッション作成テスト**
   - 新しいセッション作成時、トラッカーが`initial_value`で初期化されることを確認

2. **セッション切り替えテスト**
   - セッションAでトラッカー値を変更
   - セッションBに切り替え
   - セッションAに戻る
   - トラッカー値が保持されていることを確認

3. **プロンプト生成テスト**
   - セッションIDで正しいTrackerManagerが取得されることを確認
   - トラッカー情報が正しくプロンプトに含まれることを確認

---

## 6. Rollout Plan

### Phase A: Preparation (準備)
- [ ] 詳細な実装計画のレビュー
- [ ] 型定義の変更を先行実装
- [ ] ユニットテストの作成

### Phase B: Implementation (実装)
- [ ] `chat-tracker-integration.ts`の更新
- [ ] `chat-session-management.ts`の更新
- [ ] `prompt-builder.service.ts`の更新
- [ ] Message handlersの更新
- [ ] UIコンポーネントの更新

### Phase C: Testing (テスト)
- [ ] ユニットテストの実行
- [ ] 統合テストの実行
- [ ] 手動テスト（UIでの動作確認）

### Phase D: Migration (マイグレーション)
- [ ] LocalStorageマイグレーションの実装
- [ ] バージョンアップ（v3 → v4）

### Phase E: Deployment (デプロイ)
- [ ] ビルドエラーの確認
- [ ] 本番環境での動作確認

---

## 7. Risk Mitigation

### 7.1 Type Errors

**リスク:** `trackerManagers`の意味変更により、型エラーが発生する可能性

**対策:**
- TypeScript strict modeで全ファイルをチェック
- `characterId`と`sessionId`の混同を防ぐため、変数名を明確に

### 7.2 Data Loss

**リスク:** 既存のトラッカー値がリセットされる

**対策:**
- マイグレーション時に警告ログを出力
- 可能であれば、既存データを一時的にバックアップ

### 7.3 Breaking Changes

**リスク:** 既存のコードが動作しなくなる

**対策:**
- 全ての`getTrackerManager`呼び出しを検索して修正
- 段階的な実装とテスト

---

## 8. Success Criteria

✅ **実装成功の基準:**

1. **新しいセッション作成時にトラッカーが`initial_value`でリセットされる**
2. **セッション間でトラッカー値が完全に独立している**
3. **既存の機能（プロンプト生成、トラッカー表示）が正常動作する**
4. **ビルドエラーなし、型エラーなし**
5. **手動テストで動作確認完了**

---

## 9. Implementation Checklist

### Core Changes
- [ ] `src/store/slices/chat/chat-tracker-integration.ts`: 全メソッドの変更
- [ ] `src/store/slices/chat/chat-session-management.ts`: `createSession`の変更
- [ ] `src/store/index.ts`: マイグレーションロジック、バージョンアップ

### Service Layer
- [ ] `src/services/prompt-builder.service.ts`: `buildBasicInfo`の引数追加
- [ ] `src/store/slices/chat/operations/message-send-handler.ts`: TrackerManager取得方法変更
- [ ] `src/store/slices/chat/operations/message-regeneration-handler.ts`: 同上
- [ ] `src/store/slices/chat/operations/message-continuation-handler.ts`: 同上

### UI Components
- [ ] `src/components/tracker/TrackerDisplay.tsx`: TrackerManager取得方法変更

### Testing
- [ ] ユニットテスト作成: セッション単位の独立性確認
- [ ] 統合テスト作成: プロンプト生成、メッセージ送信の動作確認
- [ ] 手動テスト: UIでの動作確認

### Documentation
- [ ] `DATA_PERSISTENCE_ARCHITECTURE_ANALYSIS.md`の更新
- [ ] コードコメントの更新

---

## 10. Estimated Timeline

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| A: Preparation | 実装計画レビュー、型定義変更 | 1 hour |
| B: Implementation | Core + Service + UI変更 | 2-3 hours |
| C: Testing | Unit + Integration + Manual | 1-2 hours |
| D: Migration | LocalStorage移行 | 30 minutes |
| E: Deployment | ビルド確認、動作確認 | 30 minutes |
| **Total** | | **5-7 hours** |

---

## 11. Next Steps

1. **ユーザー承認:** この実装計画をレビューして承認
2. **実装開始:** Phase A（準備）から順次実施
3. **継続的なフィードバック:** 各Phaseごとに進捗報告

---

**作成者:** Claude Code
**レビュー待ち:** ユーザー承認
