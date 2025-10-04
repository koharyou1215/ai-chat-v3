# Phase 3 Quick Reference Card

**目的**: 次セッションで即座に作業開始できるクイックリファレンス

---

## ⚡ 1分で始める

```bash
# 1. ブランチ作成（初回のみ）
git checkout -b refactor/phase3-chat-operations

# 2. Phase 3.1開始
mkdir -p src/store/slices/chat/operations
code src/store/slices/chat/operations/message-lifecycle-operations.ts

# 3. テンプレートをコピペ（下記参照）
```

---

## 📋 Phase 3.1 テンプレート（即コピペ可能）

### types.ts

```typescript
// src/store/slices/chat/operations/types.ts
import { StateCreator } from "zustand";
import { AppStore } from "@/store";
import { UnifiedMessage, UUID } from "@/types";

export interface MessageLifecycleOperations {
  addMessage: (message: UnifiedMessage) => Promise<void>;
  deleteMessage: (message_id: UUID) => void;
  rollbackSession: (message_id: UUID) => void;
  resetGeneratingState: () => void;
}

export type MessageLifecycleSlice = MessageLifecycleOperations;
```

### message-lifecycle-operations.ts

```typescript
// src/store/slices/chat/operations/message-lifecycle-operations.ts
import { StateCreator } from "zustand";
import { AppStore } from "@/store";
import { MessageLifecycleSlice } from "./types";
import { updateSessionSafely } from "@/utils/chat/session-update-helper";
import { ingestMessageToMem0Safely } from "@/utils/chat/mem0-integration-helper";

export const createMessageLifecycleOperations: StateCreator<
  AppStore,
  [],
  [],
  MessageLifecycleSlice
> = (set, get) => ({
  addMessage: async (message) => {
    const state = get() as any;
    const activeSessionId = state.active_session_id;
    if (!activeSessionId) return;

    set({
      sessions: updateSessionSafely(state.sessions, activeSessionId, {
        addMessage: message,
        updateTimestamp: true,
      }),
    });

    await ingestMessageToMem0Safely(message, "addMessage");
  },

  deleteMessage: (message_id) => {
    const state = get() as any;
    const activeSessionId = state.active_session_id;
    if (!activeSessionId) return;

    set({
      sessions: updateSessionSafely(state.sessions, activeSessionId, {
        removeMessageId: message_id,
        updateTimestamp: true,
      }),
    });
  },

  rollbackSession: (message_id) => {
    const state = get() as any;
    const activeSessionId = state.active_session_id;
    if (!activeSessionId) return;

    const session = state.sessions.get(activeSessionId);
    if (!session) return;

    const messageIndex = session.messages.findIndex(
      (msg) => msg.message_id === message_id
    );
    if (messageIndex === -1) return;

    set({
      sessions: updateSessionSafely(state.sessions, activeSessionId, {
        customUpdate: (s) => ({
          ...s,
          messages: s.messages.slice(0, messageIndex),
        }),
        updateTimestamp: true,
      }),
    });
  },

  resetGeneratingState: () => {
    set({ is_generating: false });
  },
});
```

---

## 🔧 検証コマンド

```bash
# TypeScript確認
npx tsc --noEmit

# ビルド
npm run build

# 開発サーバー
npm run dev
```

---

## ✅ Phase 3.1 完了チェック

- [ ] ファイル作成: `types.ts`, `message-lifecycle-operations.ts`
- [ ] TypeScriptエラー: 0
- [ ] ビルド成功
- [ ] 4つの操作が動作（add, delete, rollback, reset）
- [ ] コミット完了

---

## 📝 コミットメッセージテンプレート

```bash
git add src/store/slices/chat/operations/
git commit -m "feat(phase3.1): Extract message lifecycle operations

- Create message-lifecycle-operations.ts
- Extract addMessage, deleteMessage, rollbackSession, resetGeneratingState
- Use Phase 0 helpers (updateSessionSafely, ingestMessageToMem0Safely)
- 🎯 Phase 3.1 complete"
```

---

## 🎯 実装順序（厳守）

1. ✅ **Phase 3.1** (2日): Lifecycle Operations ← **まずここから**
2. ⬜ **Phase 3.2** (3日): Continuation Handler
3. ⬜ **Phase 3.3** (3日): Regeneration Handler
4. ⬜ **Phase 3.4** (4日): Send Handler（最重要・最難関）
5. ⬜ **Phase 3.5** (2日): Orchestrator

**合計**: 14日

---

## 🚨 注意事項

### やってはいけないこと
- ❌ 実装順序を変えない（リスク管理のため）
- ❌ 既存の`chat-message-operations.ts`を先に削除しない
- ❌ Phase 0ヘルパーを使わずに直接実装しない

### 必ずやること
- ✅ 各フェーズごとにコミット
- ✅ TypeScriptエラー0を維持
- ✅ 動作確認してから次へ

---

## 📚 詳細ガイド

**完全版**: `NEXT_SESSION_PHASE3_HANDOFF.md`

**計画書**: `CHAT_MESSAGE_OPERATIONS_DISTRIBUTION_PLAN.md`

**進捗確認**: `THREE_FILE_REFACTORING_PROGRESS_REPORT.md`

---

## 💡 ヘルパー関数リファレンス

### updateSessionSafely()

```typescript
import { updateSessionSafely } from "@/utils/chat/session-update-helper";

// メッセージ追加
updateSessionSafely(sessions, sessionId, {
  addMessage: newMessage,
  updateTimestamp: true,
});

// メッセージ削除
updateSessionSafely(sessions, sessionId, {
  removeMessageId: messageId,
  updateTimestamp: true,
});

// カスタム更新
updateSessionSafely(sessions, sessionId, {
  customUpdate: (session) => ({ ...session, /* 変更 */ }),
  updateTimestamp: true,
});
```

### ingestMessageToMem0Safely()

```typescript
import { ingestMessageToMem0Safely } from "@/utils/chat/mem0-integration-helper";

// メッセージをMem0に保存（エラーハンドリング込み）
await ingestMessageToMem0Safely(message, "context");
```

---

**次セッション**: このファイルを開いて、テンプレートをコピペして開始！
