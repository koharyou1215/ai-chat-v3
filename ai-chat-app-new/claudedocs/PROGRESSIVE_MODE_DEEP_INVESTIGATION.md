# プログレッシブモード徹底調査レポート

**日時**: 2025-10-08
**問題**: 設定ON/OFFしても変わらない（前回の2重チェック修正後も動作しない）
**ステータス**: 🔍 徹底デバッグログ追加・実行時の値を確認待ち

---

## 🔍 実施した徹底調査

### 1. 全ファイル検索による重複・干渉の確認

#### `progressiveMode.enabled`を参照している全ファイル

```bash
grep -r "progressiveMode.*enabled" src/
```

**結果（4ファイル）**:
1. `src/store/slices/settings.slice.ts` - 設定の同期
2. `src/types/core/settings.types.ts` - 型定義とヘルパー関数
3. `src/components/settings/SettingsModal/panels/ChatPanel.tsx` - 設定UI
4. `src/components/chat/MessageInput.tsx` - メッセージ送信判定

✅ **重複なし**: 各ファイルが異なる責任を持っている

---

### 2. `sendProgressiveMessage`を呼び出す全箇所

```bash
grep -r "sendProgressiveMessage|sendMessage" src/
```

**結果（13ファイル）**:
- 主要な呼び出し元: `MessageInput.tsx`のみ
- その他: 型定義、テスト、無関係なファイル

✅ **干渉なし**: MessageInputからのみ呼び出されている

---

### 3. 設定値の伝播経路

#### 経路1: 設定保存
```
ChatPanel.tsx (Line 186-211)
  → updateChatSettings({ progressiveMode: {...} })
    → settings.slice.ts (Line 379-453)
      → settingsManager.updateCategory("chat", chatUpdates)
        → localStorage["unified-settings"]
      → set({ chat: newChatSettings })
        → Zustandストア更新
```

#### 経路2: 設定読み込み
```
起動時:
  settingsManager.getSettings()
    → initialSettings = localStorage["unified-settings"]
      → settings.slice.ts (Line 86-87)
        → createSettingsSliceV2の初期化
          → chat: { progressiveMode: initialSettings.chat?.progressiveMode ?? {...} }

設定変更時:
  settingsManager.subscribe()
    → syncFromUnifiedSettings() (Line 578-631)
      → chat.progressiveMode = unified.chat?.progressiveMode ?? get().chat.progressiveMode
```

#### 経路3: コンポーネントでの取得
```
MessageInput.tsx (Line 45-71)
  → const { chat } = useAppStore()
    → chat.progressiveMode.enabled
      → handleSend内で判定
```

✅ **経路は単純**: 設定マネージャー → Zustandストア → コンポーネント

---

### 4. 判定ロジックの確認

#### MessageInput.tsx:193-210
```typescript
const isProgressiveModeEnabled = chat?.progressiveMode?.enabled === true;
const shouldUseProgressive = isProgressiveModeEnabled && !is_group_mode;

if (shouldUseProgressive) {
  await sendProgressiveMessage(currentInputText, selectedImage || undefined);
} else {
  await sendMessage(currentInputText, selectedImage || undefined);
}
```

✅ **ロジックは正しい**: 厳格な真偽値チェック

---

### 5. chat-progressive-handler.ts の2重チェック

**前回修正で削除済み（Line 52-54）**:
```typescript
// ✅ FIX: 2重チェックを削除
// MessageInput.tsxで既にチェック済みのため、ここでは実行のみ
console.log("✅ [sendProgressiveMessage] Progressive mode enabled, proceeding with 3-stage generation");
```

✅ **2重チェック削除済み**: フォールバックの可能性は排除

---

## 🚨 発見した可能性のある問題

### 仮説1: `chat`オブジェクトが`undefined`

MessageInput.tsx:70で`chat`を取得していますが、SettingsSliceV2では`chat: ChatSettings`として定義されています。

**確認すべきこと**:
- `chat`オブジェクトが正しく初期化されているか
- `chat.progressiveMode`が存在するか
- `chat.progressiveMode.enabled`の実際の値と型

### 仮説2: 初期化タイミングの問題

`settingsManager.getSettings()`が実行される前に、Zustandストアが初期化されている可能性。

**確認すべきこと**:
- `initialSettings.chat`が`undefined`になっていないか
- デフォルト値`enabled: true`が正しく設定されているか

### 仮説3: 設定の上書き

`syncFromUnifiedSettings()`が`updateChatSettings()`の後に実行され、設定を上書きしている可能性。

**確認すべきこと**:
- `syncFromUnifiedSettings()`の呼び出しタイミング
- `localStorage["unified-settings"]`の実際の値

---

## ✅ 追加した徹底デバッグログ

### MessageInput.tsx:182-206

```typescript
console.log("🔍 [MessageInput.handleSend] Progressive Mode Check (Full Trace):", {
  // chat オブジェクトの存在確認
  chat_exists: !!chat,
  chat_object: chat,

  // progressiveMode の存在確認
  progressiveMode_exists: !!chat?.progressiveMode,
  progressiveMode_object: chat?.progressiveMode,

  // enabled の値と型
  enabled_value: chat?.progressiveMode?.enabled,
  enabled_type: typeof chat?.progressiveMode?.enabled,
  enabled_strict_true: chat?.progressiveMode?.enabled === true,
  enabled_loose_true: chat?.progressiveMode?.enabled == true,
  enabled_truthy: !!chat?.progressiveMode?.enabled,

  // グループモード状態
  is_group_mode,

  // 最終判定
  should_use_progressive: chat?.progressiveMode?.enabled === true && !is_group_mode,

  // 完全な chat オブジェクト
  full_chat_settings: JSON.stringify(chat, null, 2),
});
```

### 確認項目

このログで以下を確認できます：

1. **`chat`オブジェクトの存在**: `chat_exists`, `chat_object`
2. **`progressiveMode`の存在**: `progressiveMode_exists`, `progressiveMode_object`
3. **`enabled`の実際の値**: `enabled_value`
4. **`enabled`の型**: `enabled_type`（`"boolean"`, `"string"`, `"undefined"`など）
5. **厳格な比較結果**: `enabled_strict_true` (=== true)
6. **緩い比較結果**: `enabled_loose_true` (== true)
7. **真偽値変換結果**: `enabled_truthy` (!!enabled)
8. **完全なchatオブジェクト**: `full_chat_settings`

---

## 🔍 次のステップ - ユーザーに実行してもらうこと

### 1. 設定画面でプログレッシブモードを有効化

1. 設定画面を開く
2. 「チャット設定」タブを開く
3. 「3段階プログレッシブ応答を有効化」をONにする
4. コンソールログを確認:
   ```
   🔧 [updateChatSettings] Called with: ...
   🔧 [updateChatSettings] Saving progressive mode to settingsManager: ...
   🔧 [updateChatSettings] Progressive mode update: ...
   ```

### 2. メッセージを送信

1. チャット画面に戻る
2. メッセージを入力して送信
3. **ブラウザコンソールで以下のログを確認**:

```
🔍 [MessageInput.handleSend] Progressive Mode Check (Full Trace):
  chat_exists: true/false
  chat_object: {...}
  progressiveMode_exists: true/false
  progressiveMode_object: {...}
  enabled_value: true/false/undefined
  enabled_type: "boolean"/"string"/"undefined"
  enabled_strict_true: true/false
  ...
```

### 3. ログ内容を報告

特に以下の値を確認してください：

- `enabled_value`: 実際の値は何か？
- `enabled_type`: 型は`"boolean"`か？
- `enabled_strict_true`: `true`になっているか？
- `should_use_progressive`: `true`になっているか？

---

## 💡 予想される原因と対処法

### ケース1: `enabled_value: undefined`

**原因**: `chat.progressiveMode`が存在しない
**対処**: 設定の初期化を修正

### ケース2: `enabled_value: "true"` (文字列)

**原因**: 型の不一致
**対処**: 設定保存時の型変換を追加

### ケース3: `enabled_value: false`

**原因**: 設定が保存されていない、または上書きされている
**対処**: LocalStorageの値を直接確認

### ケース4: `should_use_progressive: false` だが `enabled_strict_true: true`

**原因**: `is_group_mode`が`true`になっている
**対処**: グループモード状態を確認

---

## 🛠️ デバッグ用ブラウザコンソールコマンド

### LocalStorageを直接確認

```javascript
// unified-settings の確認
const unified = JSON.parse(localStorage.getItem('unified-settings'));
console.log('unified-settings:', unified.chat?.progressiveMode);

// ai-chat-v3-storage の確認
const store = JSON.parse(localStorage.getItem('ai-chat-v3-storage'));
console.log('ai-chat-v3-storage:', store.state?.chat?.progressiveMode);

// 実行時のZustandストア
console.log('Runtime store:', window.useAppStore?.getState().chat?.progressiveMode);
```

### 設定を強制的に有効化

```javascript
// Zustandストアを直接更新
window.useAppStore.getState().updateChatSettings({
  progressiveMode: {
    enabled: true,
    showIndicators: true,
    highlightChanges: true,
    glowIntensity: "medium",
    stageDelays: { reflex: 0, context: 1000, intelligence: 2000 }
  }
});

// 確認
console.log('Updated:', window.useAppStore.getState().chat.progressiveMode);
```

---

## 📊 調査結果まとめ

### ✅ 確認済み

1. **重複・干渉なし**: 各ファイルの責任は分離されている
2. **2重チェック削除済み**: chat-progressive-handlerのフォールバックは削除
3. **経路は単純**: 設定マネージャー → Zustandストア → コンポーネント
4. **ロジックは正しい**: 判定条件に問題なし

### ❓ 未確認

1. **実行時の実際の値**: `chat.progressiveMode.enabled`の実際の値と型
2. **初期化タイミング**: `initialSettings.chat`が正しく読み込まれているか
3. **LocalStorageの内容**: `unified-settings`と`ai-chat-v3-storage`の実際の値

---

**作成者**: Claude Code (Sonnet 4.5)
**最終更新**: 2025-10-08

**次のアクション**: ユーザーにメッセージを送信してもらい、詳細ログを報告してもらう
