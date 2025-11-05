# 🎯 右パネル完全リファクタリング計画

**作成日**: 2025-10-31
**対象**: 右サイドパネル関連の全システム（メモリーカード、トラッカー、履歴、レイヤー）

---

## 📊 発見された致命的な問題

### ❌ 問題1: MemoryGalleryの`current_session_id`依存

**場所**: `src/components/memory/MemoryGallery.tsx:56-58`

```typescript
const filteredAndSortedMemories = useMemo(() => {
  // 🔴 問題: current_session_idに依存している
  if (!current_session_id) return [];  // ← ページリロード後、常にnullになる
  const currentSessionCards = memory_cards_by_session.get(current_session_id);
  if (!currentSessionCards || currentSessionCards.size === 0) return [];
  // ...
}, [
  memory_cards_by_session,
  current_session_id,  // ← これが永続化されていない！
  // ...
]);
```

**問題の連鎖**:
1. `current_session_id`は永続化されていない（`src/store/index.ts:498-568`）
2. ページリロード後、`current_session_id`は常に`null`になる
3. MemoryGalleryは空配列を返す（Line 56）
4. メモリーカードが表示されない

**なぜこの設計になっているか**:
- propsで`session_id`が渡されているのに使用していない
- `current_session_id`という内部状態に依存している

---

### ❌ 問題2: トラッカーのキャラクター依存とキャラクターファイルの変更

**場所**: `src/components/tracker/TrackerDisplay.tsx:210-227`

```typescript
const trackersWithValues: TrackerWithValue[] = useMemo(() => {
  if (!trackerManager || !character?.trackers) return [];

  const trackerSet = trackerManager.getTrackerSet(character_id);
  if (!trackerSet) return [];

  return character.trackers  // ← キャラクターファイルのtrackersに依存
    .map((trackerDef) => {
      const tracker = trackerSet.trackers.get(trackerDef.name);
      if (!tracker) return null;  // ← トラッカーが見つからない場合はnull

      return {
        ...trackerDef,
        current_value: tracker.current_value,
      };
    })
    .filter((t): t is TrackerWithValue => t !== null);
}, [trackerManager, character?.trackers, character_id]);
```

**問題**:
- キャラクターファイルが変更されると、`character.trackers`の内容が変わる
- 既存のTrackerManagerとキャラクターファイルのtrackers定義が一致しない
- 結果として、トラッカーが消える

**Gitステータスから見えること**:
- 多数のキャラクターファイルが変更されている
- トラッカー定義のフォーマットが統一されていない可能性

---

### ❌ 問題3: TrackerManagerの複雑な初期化ロジック

**場所**: `src/services/tracker/tracker-manager.ts:35-150`

- 古い形式から新しい形式への変換ロジック
- `current_value`の設定ロジックが複雑（JSONファイルのcurrent_value → initial_value → デフォルト値）
- トラッカー名から初期値を推測する処理

**問題**:
- キャラクターファイルのフォーマットが統一されていない
- 変換ロジックが失敗すると、トラッカーが正しく初期化されない

---

### ❌ 問題4: 永続化設定の不完全性

**場所**: `src/store/index.ts:527-529`

```typescript
// ✅ 前回の修正で追加された
memory_cards_by_session: state.memory_cards_by_session,
memory_layers_by_session: state.memory_layers_by_session,
memoryLayers: state.memoryLayers,
```

**しかし、`current_session_id`は永続化されていない**

**場所**: `src/store/index.ts:498-568`のpartialize設定に含まれていない

---

## 🔧 リファクタリングすべき箇所

### 🔴 Phase 1: 緊急修正（最優先）

#### **1. MemoryGallery.tsxの修正**
**ファイル**: `src/components/memory/MemoryGallery.tsx`

**修正内容**:
- **Line 54-59**: `current_session_id`依存を削除し、propsの`session_id`を使用
- **Line 126-136**: useMemoの依存配列から`current_session_id`を削除

**修正例**:
```typescript
// ❌ 現在
const filteredAndSortedMemories = useMemo(() => {
  if (!current_session_id) return [];
  const currentSessionCards = memory_cards_by_session.get(current_session_id);
  // ...
}, [memory_cards_by_session, current_session_id, ...]);

// ✅ 修正後
const filteredAndSortedMemories = useMemo(() => {
  // propsのsession_idを使用
  if (!session_id) return [];
  const currentSessionCards = memory_cards_by_session.get(session_id);
  // ...
}, [memory_cards_by_session, session_id, ...]);  // current_session_idを削除
```

**効果**:
- ページリロード後もメモリーカードが表示される
- propsで渡されるsession_idに正しく依存する

---

#### **2. TrackerDisplay.tsxの強化**
**ファイル**: `src/components/tracker/TrackerDisplay.tsx`

**修正内容**:
- **Line 186-206**: キャラクターファイル変更時のトラッカー再初期化ロジックを改善
- **Line 210-227**: トラッカーが見つからない場合のエラーハンドリング強化

**修正例**:
```typescript
// トラッカーが見つからない場合は警告を表示
.map((trackerDef) => {
  const tracker = trackerSet.trackers.get(trackerDef.name);
  if (!tracker) {
    console.warn(`⚠️ Tracker not found: ${trackerDef.name} for character: ${character?.name}`);
    // トラッカーマネージャーに存在しないトラッカーは初期化を試みる
    return null;
  }
  return { ...trackerDef, current_value: tracker.current_value };
})
```

**効果**:
- トラッカーが消える問題を軽減
- エラーの原因を特定しやすくなる

---

### 🟡 Phase 2: 根本修正（短期）

#### **3. memory.slice.tsから`current_session_id`を削除**
**ファイル**: `src/store/slices/memory.slice.ts`

**修正内容**:
- **Line 11**: `current_session_id: UUID | null;` を削除
- **Line 18**: `setCurrentSessionId: (session_id: UUID) => void;` を削除
- **Line 130-138**: `setCurrentSessionId`実装を削除
- **Line 56-58**: 関連する参照を削除

**理由**:
- `current_session_id`は不要（propsで渡される）
- 永続化されないため、リロード後に問題を引き起こす
- コードの複雑性を減らす

**影響範囲**:
- MemoryGallery.tsx（修正済み）
- その他の参照箇所（検索して確認）

---

#### **4. キャラクターファイルのトラッカー定義の統一**
**場所**: `public/characters/*.json`

**問題**: 多数のキャラクターファイルが変更されており、トラッカー定義が統一されていない可能性

**必要な作業**:
1. すべてのキャラクターファイルのトラッカー定義を新しい形式に統一
2. `config`プロパティを使用した形式に変換
3. `current_value`を削除（TrackerManagerが管理）

**新しい形式の例**:
```json
{
  "name": "好感度",
  "category": "relationship",
  "description": "キャラクターの好感度",
  "config": {
    "type": "numeric",
    "initial_value": 50,
    "min_value": 0,
    "max_value": 100,
    "step": 1
  }
}
```

**古い形式（削除対象）**:
```json
{
  "name": "好感度",
  "type": "numeric",
  "initial_value": 50,
  "min_value": 0,
  "max_value": 100,
  "current_value": 75  // ← これを削除
}
```

---

### 🟢 Phase 3: 最適化（中期）

#### **5. TrackerManagerの簡素化**
**ファイル**: `src/services/tracker/tracker-manager.ts`

**修正内容**:
- **Line 35-150**: 古い形式から新しい形式への変換ロジックを簡素化
- **Line 119-150**: `current_value`設定ロジックを簡素化

**提案**:
- 古い形式のサポートを削除（Phase 2でキャラクターファイルを統一後）
- すべてのキャラクターファイルを新しい形式に移行
- 初期値設定ロジックを単純化

**簡素化後の例**:
```typescript
initializeTrackerSet(characterId: string, trackers: TrackerDefinition[]): TrackerSet {
  const trackerMap = new Map<string, Tracker>();

  trackers.forEach(definition => {
    // 新しい形式のみサポート（古い形式の変換ロジックを削除）
    if (!definition.config) {
      console.error('Tracker definition is missing config:', definition);
      return;
    }

    // 初期値を設定（シンプルに）
    const currentValue = this.getInitialValue(definition.config);

    trackerMap.set(definition.name, {
      ...definition,
      current_value: currentValue,
    });
  });

  // ...
}

private getInitialValue(config: TrackerDefinition['config']): string | number | boolean {
  switch (config.type) {
    case 'numeric':
      return config.initial_value ?? config.min_value ?? 0;
    case 'state':
      return config.initial_state ?? '';
    case 'boolean':
      return config.initial_value ?? false;
    case 'text':
      return config.initial_value ?? '';
    default:
      return '';
  }
}
```

---

#### **6. 永続化設定の最終調整**
**ファイル**: `src/store/index.ts`

**検討事項**:
- `current_session_id`を永続化するか？ → **削除推奨**
- UI状態（`isRightPanelOpen`）を永続化するか？ → **現状維持（永続化しない）**

**推奨**: `current_session_id`を削除し、propsで渡す設計に統一

---

## 📝 推奨実施順序

### **Phase 1: 緊急修正（即座に実施）**
1. ✅ MemoryGallery.tsxの`current_session_id`依存を削除
2. ✅ TrackerDisplay.tsxのエラーハンドリング強化

**所要時間**: 30分
**効果**: メモリーカード表示の即座の修復

---

### **Phase 2: 根本修正（短期・1-2日）**
3. ✅ memory.slice.tsから`current_session_id`を削除
4. ✅ キャラクターファイルのトラッカー定義を統一

**所要時間**: 2-4時間
**効果**: トラッカー消失問題の根本解決

---

### **Phase 3: 最適化（中期・1週間）**
5. ✅ TrackerManagerの簡素化
6. ✅ 永続化設定の最終調整

**所要時間**: 4-8時間
**効果**: システム全体の安定性向上、保守性向上

---

## 🎯 期待される効果

### Phase 1実施後:
- ✅ メモリーカードがページリロード後も表示される
- ✅ トラッカーのエラーハンドリングが改善される

### Phase 2実施後:
- ✅ トラッカーが消える問題が根本解決される
- ✅ コードの複雑性が減少する
- ✅ キャラクターファイルのフォーマットが統一される

### Phase 3実施後:
- ✅ TrackerManagerの保守性が向上する
- ✅ 新しいトラッカー追加が容易になる
- ✅ システム全体の安定性が向上する

---

## ⚠️ 注意事項

### 破壊的変更:
- Phase 2の`current_session_id`削除は、参照箇所すべてに影響
- Phase 3のTrackerManager簡素化は、古い形式のサポート終了

### バックアップ推奨:
- キャラクターファイル変更前にバックアップ
- Gitコミットでロールバック可能にする

### テスト推奨:
- Phase 1実施後: メモリーカード作成・表示のテスト
- Phase 2実施後: トラッカー動作の全体テスト
- Phase 3実施後: 新規キャラクター追加のテスト

---

## 📊 影響範囲の見積もり

### ファイル数:
- **Phase 1**: 2ファイル
- **Phase 2**: 4ファイル + キャラクターファイル（約30-50個）
- **Phase 3**: 2ファイル

### コード行数:
- **Phase 1**: 約20行
- **Phase 2**: 約100行 + キャラクターファイル
- **Phase 3**: 約200行

---

## 🔗 関連ドキュメント

- `CLAUDE.md` - プロジェクト設定
- `🎯 AI Chat V3 完全開発ガイド.md` - システム全体のドキュメント
- `Character,User Persona Type Definitive Format.md` - キャラクター・ペルソナ型定義

---

**最終更新**: 2025-10-31
