# 🚨 トラッカー永続化 緊急修正レポート

**作成日**: 2025-11-04
**優先度**: P0（最優先）
**問題**: トラッカーの値が保存されない、デフォルトに戻ってしまう

---

## 🔍 根本原因の特定

### 問題の流れ

```
1. ユーザーがトラッカーを手動で変更
   ↓
2. TrackerDisplay.tsx:267 → trackerManager.updateTracker() 呼び出し
   ↓
3. TrackerManager.ts:211 → tracker.current_value = newValue (内部状態更新)
   ↓
4. TrackerManager.ts:231 → this.trackerSets.set() (内部Mapのみ更新)
   ↓
5. ❌ Zustandストアの state.trackerManagers は更新されない！
   ↓
6. ❌ Zustand persist がトリガーされない
   ↓
7. ❌ LocalStorageに保存されない
   ↓
8. ページリロード時 → デフォルト値に戻る
```

### 核心的な問題

**TrackerManagerインスタンスの内部状態とZustandストアが分離している**

```typescript
// store/index.ts:79
trackerManagers: new Map(), // ← Zustandが管理するMap

// tracker-manager.ts:30
private trackerSets: Map<string, TrackerSet> = new Map(); // ← 独立した内部Map
```

**TrackerManager.updateTracker()の問題**:
```typescript
// tracker-manager.ts:189-234
updateTracker(characterId, trackerName, newValue, reason) {
  // ...
  tracker.current_value = newValue; // ← 内部状態のみ更新
  this.trackerSets.set(characterId, { ...trackerSet }); // ← 内部Mapのみ更新

  // ❌ Zustand ストアは更新されていない！
}
```

---

## ✅ 修正方法

### 修正1: TrackerDisplay.tsx - ストア更新を追加

**ファイル**: `src/components/tracker/TrackerDisplay.tsx:262-272`

**Before**:
```typescript
const handleTrackerValueChange = (trackerName: string, change: number | string | boolean) => {
  const oldValue = tracker.current_value;
  let newValue: number | string | boolean;

  if (typeof change === "number" && typeof tracker.current_value === "number") {
    newValue = tracker.current_value + change;
    trackerManager.updateTracker(character_id, trackerName, newValue);
  } else {
    newValue = change;
    trackerManager.updateTracker(character_id, trackerName, change);
  }

  console.log(`🎯 [TrackerDisplay] Tracker updated:`, { ... });
};
```

**After**:
```typescript
const handleTrackerValueChange = (trackerName: string, change: number | string | boolean) => {
  const oldValue = tracker.current_value;
  let newValue: number | string | boolean;

  if (typeof change === "number" && typeof tracker.current_value === "number") {
    newValue = tracker.current_value + change;
    trackerManager.updateTracker(character_id, trackerName, newValue);
  } else {
    newValue = change;
    trackerManager.updateTracker(character_id, trackerName, change);
  }

  // 🔧 FIX: Zustand ストアを更新してpersistをトリガー
  const sessionId = useAppStore.getState().active_session_id;
  if (sessionId) {
    const trackerManagers = new Map(useAppStore.getState().trackerManagers);
    trackerManagers.set(sessionId, trackerManager);
    useAppStore.setState({ trackerManagers });

    console.log(`💾 [TrackerDisplay] Saved to Zustand:`, {
      sessionId,
      trackerName,
      newValue
    });
  }

  console.log(`🎯 [TrackerDisplay] Tracker updated:`, { ... });
};
```

---

## 📋 実装手順

### ステップ1: useAppStoreインポート追加

```typescript
// src/components/tracker/TrackerDisplay.tsx の先頭
import { useAppStore } from "@/store";
```

### ステップ2: TrackerDisplay.tsx を修正

Line 262-280を上記のAfterコードで置き換える。

### ステップ3: 動作確認

1. 開発サーバー起動
2. トラッカーの値を変更
3. コンソールで「💾 [TrackerDisplay] Saved to Zustand」を確認
4. ページリロード
5. トラッカーの値が保持されているか確認

---

## 🧪 テスト方法

### 手動テスト

```
1. トラッカーを手動で変更（例：信頼度 0 → 50）
2. ブラウザのコンソールを開く
3. 以下のコードを実行：
   > localStorage.getItem('ai-chat-v3-storage')
   > JSON.parse(localStorage.getItem('ai-chat-v3-storage')).state.trackerManagers

4. trackerSetsにcharacterIdが含まれ、trackersの値が50になっているか確認

5. F5でページリロード

6. トラッカーが50のまま維持されているか確認
```

### 確認すべきログ

```
✅ 正常な場合:
🎯 [TrackerDisplay] Tracker updated: { trackerName: '信頼度', newValue: 50 }
💾 [TrackerDisplay] Saved to Zustand: { sessionId: 'xxx', trackerName: '信頼度', newValue: 50 }
[Store] 💾 Serializing TrackerManager: { characterCount: 1, characterIds: [...] }
🔧 Settings saved successfully { size: '123.45KB', ... }

❌ 問題がある場合（修正前）:
🎯 [TrackerDisplay] Tracker updated: { trackerName: '信頼度', newValue: 50 }
（💾 ログが出ない）
（Store の Serializing ログが出ない）
```

---

## ⚠️ なぜこれが起きたのか

### 過去の設計の問題

1. **TrackerManagerが独立したクラス**
   - Zustandストアとは別に内部状態を持つ設計
   - 状態の一元管理ができていない

2. **Store更新の責任が不明確**
   - TrackerManagerが更新を通知するだけ（Line 228 `notifyUpdate()`）
   - 誰もZustandストアを更新していなかった

3. **persist設定の誤解**
   - `trackerManagers`はpersist対象に含まれている（store/index.ts:555）
   - しかし、**TrackerManagerインスタンスの中身が変わっても、Map自体が置き換わらないとpersistがトリガーされない**

### 正しい理解

Zustandのpersistは**shallowな変更検知**です：

```typescript
// ❌ これだけでは persist がトリガーされない
trackerManager.updateTracker(...); // TrackerManagerの内部だけ変わる

// ✅ Map 自体を置き換える必要がある
const newMap = new Map(state.trackerManagers);
newMap.set(sessionId, trackerManager);
setState({ trackerManagers: newMap }); // ← これで persist トリガー
```

---

## 🎯 期待される効果

### 修正前
- ❌ トラッカーを変更してもLocalStorageに保存されない
- ❌ ページリロードでデフォルト値に戻る
- ❌ 手動変更が失われる

### 修正後
- ✅ トラッカー変更が即座にLocalStorageに保存される
- ✅ ページリロードしても値が維持される
- ✅ セッション間で正しく保存・復元される

---

## 📚 関連ファイル

| ファイル | 役割 | 修正の有無 |
|---------|------|----------|
| `src/components/tracker/TrackerDisplay.tsx` | トラッカーUI | ✅ 修正必要 |
| `src/services/tracker/tracker-manager.ts` | トラッカーロジック | 変更なし |
| `src/store/index.ts` | Zustand persist設定 | 変更なし（設定済み） |
| `src/store/slices/tracker.slice.ts` | トラッカースライス | 変更なし |

---

## 次のステップ

1. ✅ 根本原因特定完了
2. ⏳ 修正実装（TrackerDisplay.tsx）
3. ⏳ 動作確認
4. ⏳ ユーザー確認待ち

---

**作成者**: Claude Code (Sonnet 4.5)
**ステータス**: 修正準備完了、実装待ち
**推定修正時間**: 5分
