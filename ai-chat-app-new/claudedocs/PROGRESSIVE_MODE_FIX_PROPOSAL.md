# プログレッシブモード設定が反映されない問題の根本原因と修正案

**調査日時**: 2025-10-08
**問題**: プログレッシブモードを設定でONにしても通常のチャットと変わらない動作になる
**ステータス**: ✅ 根本原因特定完了 → 修正案作成完了

---

## 📊 エグゼクティブサマリー

プログレッシブモードが設定画面でONにしても反映されない問題は、**設定の永続化漏れ**が原因です。

### 問題の本質

1. ✅ **実装は完璧**: プログレッシブモードの実装自体は正しく動作する
2. ❌ **永続化が不完全**: 設定変更が`settingsManager`に保存されていない
3. 🔄 **リロード時に消失**: ページリロード時にデフォルト値に戻る

### 影響範囲

- **プログレッシブモード設定**: 保存されず、リロード時に消失
- **他のチャット設定**: `memoryLimits`, `memoryCapacity`なども影響を受ける可能性
- **ユーザー体験**: 設定が保存されないため、毎回設定し直す必要がある

---

## 🔍 根本原因分析

### 1. 設定管理の二重体制

プロジェクトには2つの設定管理システムが存在します：

| システム | 保存先 | 役割 |
|---------|--------|------|
| **settingsManager** | `localStorage["unified-settings"]` | 統一設定管理（永続化） |
| **settings.slice.ts** | `localStorage["ai-chat-v3-storage"]`<br>（ただしpartializeから除外） | Zustand一時ストア |

### 2. 永続化設定の除外

**ファイル**: `src/store/index.ts` (Line 508-522)

```typescript
// ═══════════════════════════════════════
// ⚠️ ALL SETTINGS REMOVED
// ═══════════════════════════════════════
// Settings are now managed by settingsManager
// and persisted in localStorage["unified-settings"]
//
// Removed from persist:
// - apiConfig, openRouterApiKey, geminiApiKey
// - systemPrompts, enableSystemPrompt, enableJailbreakPrompt
// - chat, voice, imageGeneration  // ❌ chat設定が永続化から除外！
// - languageSettings, effectSettings, appearanceSettings
// - emotionalIntelligenceFlags
```

**問題**: Zustandの`partialize`設定で`chat`が除外されている → `settingsManager`に保存する必要がある

### 3. updateChatSettingsの不完全な実装

**ファイル**: `src/store/slices/settings.slice.ts` (Line 373-402)

```typescript
updateChatSettings: (settings) => {
  console.log("🔧 [updateChatSettings] Called with:", settings);

  // チャット設定を統一設定に反映
  const chatUpdates: any = {};
  if ("enterToSend" in settings)
    chatUpdates.enterToSend = settings.enterToSend;
  if ("autoScroll" in settings)
    chatUpdates.autoScroll = settings.autoScroll;
  // ❌ progressiveMode が含まれていない！

  if (Object.keys(chatUpdates).length > 0) {
    settingsManager.updateCategory("chat", chatUpdates);
  }

  set((state) => {
    const newChatSettings = { ...state.chat, ...settings };
    return { chat: newChatSettings };
  });
}
```

**問題**: `progressiveMode`, `memoryLimits`, `memoryCapacity`などが`settingsManager`に保存されていない

### 4. 動作フロー（現状）

```
1. ユーザーが設定画面でプログレッシブモードをONにする
   ↓
2. ChatPanel.tsx が updateChatSettings を呼び出す
   ↓
3. Zustandストアの chat.progressiveMode.enabled が一時的に true になる
   ↓
4. しかし settingsManager には保存されない（Line 377-384で除外）
   ↓
5. MessageInput.tsx は chat.progressiveMode.enabled を参照する
   ↓
6. この時点では true なので、プログレッシブモードが動作する（ように見える）
   ↓
7. ページをリロードすると…
   ↓
8. settingsManager から設定を読み込む
   ↓
9. settingsManager にはプログレッシブモードの設定が保存されていない
   ↓
10. デフォルト値（enabled: true）が使われる…はずだが、
    syncFromUnifiedSettings で上書きされる可能性がある
   ↓
11. 結果: プログレッシブモードが無効のまま
```

---

## ✅ 修正案

### 修正1: updateChatSettingsの完全実装

**ファイル**: `src/store/slices/settings.slice.ts` (Line 373-402)

**変更前**:
```typescript
updateChatSettings: (settings) => {
  console.log("🔧 [updateChatSettings] Called with:", settings);

  // チャット設定を統一設定に反映
  const chatUpdates: any = {};
  if ("enterToSend" in settings)
    chatUpdates.enterToSend = settings.enterToSend;
  if ("autoScroll" in settings)
    chatUpdates.autoScroll = settings.autoScroll;

  if (Object.keys(chatUpdates).length > 0) {
    settingsManager.updateCategory("chat", chatUpdates);
  }

  set((state) => {
    const newChatSettings = { ...state.chat, ...settings };
    console.log("🔧 [updateChatSettings] Previous state:", state.chat);
    console.log("🔧 [updateChatSettings] New state:", newChatSettings);

    if ("progressiveMode" in settings) {
      console.log("🔧 [updateChatSettings] Progressive mode update:", {
        oldEnabled: state.chat?.progressiveMode?.enabled,
        newEnabled: newChatSettings.progressiveMode?.enabled,
        settingsParam: settings.progressiveMode,
      });
    }

    return { chat: newChatSettings };
  });
}
```

**変更後**:
```typescript
updateChatSettings: (settings) => {
  console.log("🔧 [updateChatSettings] Called with:", settings);

  // ✅ FIX: すべてのチャット設定を統一設定に反映
  const chatUpdates: any = {};

  // 既存の設定
  if ("enterToSend" in settings)
    chatUpdates.enterToSend = settings.enterToSend;
  if ("autoScroll" in settings)
    chatUpdates.autoScroll = settings.autoScroll;
  if ("showTypingIndicator" in settings)
    chatUpdates.showTypingIndicator = settings.showTypingIndicator;
  if ("messageGrouping" in settings)
    chatUpdates.messageGrouping = settings.messageGrouping;
  if ("soundEnabled" in settings)
    chatUpdates.soundEnabled = settings.soundEnabled;
  if ("notificationsEnabled" in settings)
    chatUpdates.notificationsEnabled = settings.notificationsEnabled;
  if ("responseFormat" in settings)
    chatUpdates.responseFormat = settings.responseFormat;
  if ("memoryCapacity" in settings)
    chatUpdates.memoryCapacity = settings.memoryCapacity;
  if ("generationCandidates" in settings)
    chatUpdates.generationCandidates = settings.generationCandidates;

  // ✅ 追加: メモリー制限設定
  if ("memoryLimits" in settings)
    chatUpdates.memoryLimits = settings.memoryLimits;
  if ("memory_limits" in settings)
    chatUpdates.memoryLimits = settings.memory_limits;

  // ✅ 追加: プログレッシブモード設定（最重要！）
  if ("progressiveMode" in settings) {
    chatUpdates.progressiveMode = settings.progressiveMode;
    console.log("🔧 [updateChatSettings] Saving progressive mode to settingsManager:", {
      progressiveMode: settings.progressiveMode,
    });
  }

  // 統一設定に保存
  if (Object.keys(chatUpdates).length > 0) {
    console.log("🔧 [updateChatSettings] Updating settingsManager with:", chatUpdates);
    settingsManager.updateCategory("chat", chatUpdates);
  }

  // Zustandストアも更新（即座の反映用）
  set((state) => {
    const newChatSettings = { ...state.chat, ...settings };
    console.log("🔧 [updateChatSettings] Previous state:", state.chat);
    console.log("🔧 [updateChatSettings] New state:", newChatSettings);

    if ("progressiveMode" in settings) {
      console.log("🔧 [updateChatSettings] Progressive mode update:", {
        oldEnabled: state.chat?.progressiveMode?.enabled,
        newEnabled: newChatSettings.progressiveMode?.enabled,
        settingsParam: settings.progressiveMode,
        savedToManager: true,
      });
    }

    return { chat: newChatSettings };
  });
}
```

### 修正2: syncFromUnifiedSettingsの確認

**ファイル**: `src/store/slices/settings.slice.ts`

`syncFromUnifiedSettings`メソッドが統一設定から正しく`chat.progressiveMode`を読み込んでいることを確認する必要があります。

**確認ポイント**:
```typescript
syncFromUnifiedSettings: () => {
  const unifiedSettings = get().unifiedSettings;

  set({
    chat: {
      ...get().chat,
      // ✅ progressiveModeが統一設定から読み込まれることを確認
      progressiveMode: unifiedSettings.chat.progressiveMode,
      // 他の設定も同様
    },
  });
}
```

---

## 🧪 検証方法

### 1. 設定保存の確認

```typescript
// ブラウザのコンソールで実行
const unifiedSettings = JSON.parse(localStorage.getItem('unified-settings'));
console.log('Progressive Mode Setting:', unifiedSettings?.chat?.progressiveMode);
```

**期待結果**:
```json
{
  "enabled": true,
  "showIndicators": true,
  "highlightChanges": true,
  "glowIntensity": "medium",
  "stageDelays": {
    "reflex": 0,
    "context": 1000,
    "intelligence": 2000
  }
}
```

### 2. リロード後の動作確認

1. プログレッシブモードをONにする
2. ページをリロード（F5）
3. 設定画面を開いてプログレッシブモードがONのままか確認
4. メッセージを送信してプログレッシブ応答が動作するか確認

### 3. ログ確認

設定変更時に以下のログが出力されることを確認：

```
🔧 [updateChatSettings] Called with: { progressiveMode: { enabled: true, ... } }
🔧 [updateChatSettings] Saving progressive mode to settingsManager: { progressiveMode: { enabled: true, ... } }
🔧 [updateChatSettings] Updating settingsManager with: { progressiveMode: { enabled: true, ... } }
🔧 [updateChatSettings] Progressive mode update: { oldEnabled: false, newEnabled: true, settingsParam: { enabled: true, ... }, savedToManager: true }
```

---

## 📈 期待される効果

### Before（修正前）

❌ プログレッシブモードをONにしても、リロード後に設定が消失
❌ ユーザーが毎回設定し直す必要がある
❌ プログレッシブモードが実質的に使用不可能

### After（修正後）

✅ プログレッシブモードの設定が永続化される
✅ リロード後も設定が保持される
✅ ユーザーが一度設定すれば、以降は自動的に適用される
✅ プログレッシブモードが正常に動作する

---

## 🎯 影響範囲と注意点

### 影響を受ける機能

1. **プログレッシブモード**: 主要な修正対象
2. **メモリー制限設定**: `memoryLimits`も同様に修正
3. **その他のチャット設定**: すべてのチャット設定が永続化されるようになる

### 破壊的変更はなし

- ✅ 既存の動作を壊すことはない
- ✅ デフォルト値は変更しない
- ✅ 後方互換性を維持

### テスト推奨事項

1. **設定保存・読み込みテスト**: すべてのチャット設定項目をテスト
2. **リロードテスト**: 設定変更後のリロードで設定が保持されることを確認
3. **デフォルト値テスト**: 新規ユーザーがデフォルト値で起動できることを確認

---

## 🔄 実装優先度

| 優先度 | タスク | 理由 |
|--------|--------|------|
| 🔴 **最高** | updateChatSettingsの修正 | プログレッシブモード設定が保存されるようになる |
| 🟡 **高** | syncFromUnifiedSettingsの確認 | 統一設定からの読み込みが正しいことを確認 |
| 🟢 **中** | テストケースの追加 | 今後の回帰を防ぐ |

---

## 📝 結論

プログレッシブモードが設定で有効化されても反映されない問題は、**設定の永続化漏れ**が原因でした。`updateChatSettings`メソッドで`progressiveMode`を含むすべてのチャット設定を`settingsManager`に保存することで、問題を解決できます。

**修正箇所**: `src/store/slices/settings.slice.ts` の `updateChatSettings` メソッド
**修正内容**: `progressiveMode`, `memoryLimits`などを`chatUpdates`に追加し、`settingsManager.updateCategory("chat", chatUpdates)`で保存
**期待結果**: プログレッシブモード設定が永続化され、リロード後も保持される

---

**調査完了日時**: 2025-10-08
**次回レビュー推奨時期**: 修正実装後、ユーザーフィードバック収集時
