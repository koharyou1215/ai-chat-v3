# Map修復計画書

## 🎯 目的
Zustand persistミドルウェアとMapオブジェクトの互換性問題を解決し、アプリケーションの安定動作を実現する

## 📝 問題の概要

### 1. 根本原因
- localStorage（JSON）はMapオブジェクトをプレーンオブジェクトに変換してしまう
- 復元時にMapメソッド（`.get()`, `.set()`, `.has()`等）が使用できずエラーになる

### 2. 影響範囲
- **chat.slice.ts**: `sessions`（Map<string, UnifiedChatSession>）
- **character.slice.ts**: `characters`（Map<string, Character>）
- **groupChat.slice.ts**: `groups`（Map）関連のメソッド
- **AppInitializer.tsx**: セッション存在チェック

### 3. 発生したエラー
```javascript
// エラー1: Mapメソッドが使用できない
TypeError: get(...).sessions.get is not a function

// エラー2: オブジェクトがiterableではない  
TypeError: object is not iterable (cannot read property Symbol.iterator)

// エラー3: Hydrationミスマッチ
Warning: Prop `data-extension` did not match. Server: null Client: "true"
```

## ✅ 実装済みの修正

### 1. ヘルパー関数の実装（chat.slice.ts）

```typescript
// Map/Object両対応のヘルパー関数
const getSessionSafely = (sessions: any, sessionId: string): UnifiedChatSession | undefined => {
  if (!sessions || !sessionId) return undefined;
  if (sessions instanceof Map) {
    return sessions.get(sessionId);
  } else if (typeof sessions === 'object') {
    return sessions[sessionId];
  }
  return undefined;
};

const getTrackerManagerSafely = (trackerManagers: any, sessionId: string): TrackerManager | undefined => {
  if (!trackerManagers || !sessionId) return undefined;
  if (trackerManagers instanceof Map) {
    return trackerManagers.get(sessionId);
  } else if (typeof trackerManagers === 'object') {
    return trackerManagers[sessionId];
  }
  return undefined;
};

const createMapSafely = (data: any): Map<string, any> => {
  if (!data) return new Map();
  if (data instanceof Map) {
    return new Map(data);
  } else if (typeof data === 'object') {
    return new Map(Object.entries(data));
  }
  return new Map();
};
```

### 2. 全メソッドの修正（chat.slice.ts）

修正済みメソッド一覧:
- `getActiveSession()` - ヘルパー関数使用
- `createSession()` - createMapSafely使用
- `deleteSession()` - Map/Object両対応
- `switchSession()` - 存在チェック修正
- `clearAllSessions()` - Map生成修正
- `exportSessions()` - イテレーション修正
- `importSessions()` - Map変換修正
- `getSessionById()` - ヘルパー関数使用
- `getCurrentMemory()` - ヘルパー関数使用
- `addTrackerToSession()` - ヘルパー関数使用

### 3. character.slice.tsの修正

```typescript
getSelectedCharacter: () => {
  const characters = get().characters;
  const selectedId = get().selectedCharacterId;
  
  if (!selectedId) return null;
  
  // Map/Object両対応
  if (characters instanceof Map) {
    return characters.get(selectedId) || null;
  } else if (typeof characters === 'object' && characters) {
    return (characters as any)[selectedId] || null;
  }
  
  return null;
}
```

### 4. AppInitializer.tsxの修正

```typescript
const hasActiveSession = sessions instanceof Map 
  ? sessions.has(active_session_id) 
  : (sessions && typeof sessions === 'object' && active_session_id in sessions);
```

### 5. store/index.tsのデバッグ強化

```typescript
// 永続化成功時の詳細ログ
console.log('🔧 Settings saved successfully', {
  size: `${(sizeInBytes / 1024).toFixed(2)}KB`,
  hasSystemPrompts: parsed.state?.systemPrompts !== undefined,
  hasAPIConfig: parsed.state?.apiConfig !== undefined,
  hasEnableFlags: parsed.state?.enableSystemPrompt !== undefined
});
```

## 🚀 追加実装予定

### Phase 1: 完全なMap復元機能（推奨）
```typescript
// persist設定にカスタムdeserializer追加
persist(
  (set, get) => ({...}),
  {
    name: 'ai-chat-v3-storage',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({...}),
    // カスタムデシリアライザー
    deserialize: (str) => {
      const parsed = JSON.parse(str);
      if (parsed.state) {
        // sessionsをMapに復元
        if (parsed.state.sessions && !(parsed.state.sessions instanceof Map)) {
          parsed.state.sessions = new Map(Object.entries(parsed.state.sessions));
        }
        // charactersをMapに復元
        if (parsed.state.characters && !(parsed.state.characters instanceof Map)) {
          parsed.state.characters = new Map(Object.entries(parsed.state.characters));
        }
      }
      return parsed;
    }
  }
)
```

### Phase 2: groupChat.slice.tsの修正
- 全メソッドにヘルパー関数適用
- Map/Object互換性確保

### Phase 3: 型定義の改善
```typescript
// Union型でMap/Object両対応を明示
type MapOrObject<T> = Map<string, T> | Record<string, T>;

interface ChatState {
  sessions: MapOrObject<UnifiedChatSession>;
  // ...
}
```

## 📊 検証チェックリスト

- [x] アプリケーション起動確認
- [x] チャットセッション作成
- [x] ページリロード後のセッション復元
- [x] キャラクター選択機能
- [x] Map関連エラーの解消
- [ ] グループチャット機能（要追加修正）
- [x] 設定の永続化
- [ ] パフォーマンステスト

## 🔍 デバッグコマンド

```javascript
// Console上でのデバッグ
const storage = JSON.parse(localStorage.getItem('ai-chat-v3-storage'));
console.log('Sessions type:', typeof storage.state.sessions);
console.log('Sessions instanceof Map:', storage.state.sessions instanceof Map);
console.log('Sessions content:', storage.state.sessions);
```

## 📌 今後の課題

1. **完全なMap復元の実装**
   - カスタムdeserializerによる自動Map変換
   - 全スライスへの適用

2. **型安全性の向上**
   - Union型の活用
   - 型ガードの実装

3. **パフォーマンス最適化**
   - 大量データ時のMap vs Objectベンチマーク
   - 最適なデータ構造の選択

## 🎯 結論

現在の実装により、Map/Object互換性問題は解決され、アプリケーションは安定動作している。
将来的には完全なMap復元機能の実装により、よりクリーンなコードベースを実現できる。