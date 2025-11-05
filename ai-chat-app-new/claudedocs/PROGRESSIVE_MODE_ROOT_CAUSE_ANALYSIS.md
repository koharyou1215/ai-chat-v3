# プログレッシブモード動作不良の根本原因分析

**日時**: 2025-10-08
**問題**: デバッグページで設定が有効でも、プログレッシブ応答が実行されない

---

## 🎯 調査方針

設定の保存・読み込みではなく、**実行フロー全体**を追跡する必要があります。

---

## 🔍 考えられる根本原因（優先度順）

### 1. **実際のLocalStorage値が`enabled: false`** (最有力)

**仮説**:
- デバッグページでは`enabled: true`に見えるが、実際のアプリケーションでは`false`
- `unified-settings`と`ai-chat-v3-storage`の不整合

**確認方法**:
```javascript
// ブラウザコンソールで実行
console.log('unified-settings:', JSON.parse(localStorage.getItem('unified-settings')).chat.progressiveMode);
console.log('ai-chat-v3-storage:', JSON.parse(localStorage.getItem('ai-chat-v3-storage')).state?.chat?.progressiveMode);
console.log('実行時のストア:', window.useAppStore?.getState().chat.progressiveMode);
```

**対処法**:
- `deep-settings-analysis.html`で不整合を検出して修正


### 2. **Zustandストアの初期化タイミング問題** (有力)

**仮説**:
- `settingsManager`の初期化がZustandストアより後
- `createSettingsSliceV2`が実行される時点で`initialSettings.chat`が未定義
- 結果として、ハードコードされたデフォルト値（`enabled: true`）が使われている

**確認方法**:
```typescript
// settings.slice.ts:86 の実行順序を確認
console.log('initialSettings.chat:', initialSettings.chat);
```

**対処法**:
- `settingsManager`の初期化を確実にする
- または、起動時に強制的に`syncFromUnifiedSettings`を呼ぶ


### 3. **`sendProgressiveMessage`メソッドが未定義** (可能性低)

**仮説**:
- `createProgressiveHandler`が正しくスプレッドされていない
- `sendProgressiveMessage`メソッドがストアに存在しない

**確認方法**:
```javascript
// ブラウザコンソールで実行
console.log('sendProgressiveMessage:', typeof window.useAppStore?.getState().sendProgressiveMessage);
```

**対処法**:
- `chat.slice.ts:85`の`...createProgressiveHandler(set, get, {} as any)`を確認


### 4. **`handleSend`の判定ロジックのバグ** (可能性低)

**仮説**:
- `chat?.progressiveMode?.enabled === true`の判定が正しく動作していない
- 型の不一致（例: `enabled`が文字列`"true"`になっている）

**確認方法**:
```javascript
// MessageInput.tsx:193 のログを確認
// 🔍 Progressive Mode Check (Enhanced): のログが表示されるか
```

**対処法**:
- ログの内容を確認して型を検証


### 5. **グループモードが誤って有効** (可能性低)

**仮説**:
- `is_group_mode`が`true`になっている
- `shouldUseProgressive = false`になる

**確認方法**:
```javascript
console.log('is_group_mode:', window.useAppStore?.getState().is_group_mode);
```

**対処法**:
- グループモードを無効化


### 6. **`chat-progressive-handler.ts`内でフォールバック** (可能性あり)

**仮説**:
- `sendProgressiveMessage`は呼ばれているが、内部でフォールバックしている
- `chat.progressiveMode?.enabled`のチェックが2回行われている

**確認場所**:
```typescript
// chat-progressive-handler.ts:55
if (!state.chat?.progressiveMode?.enabled) {
  console.log("🚀 [sendProgressiveMessage] Progressive mode disabled, falling back to normal message");
  return await state.sendMessage(content, imageUrl);
}
```

**確認方法**:
- ブラウザコンソールで「falling back to normal message」ログを探す

**対処法**:
- この2重チェックを削除または修正

---

## 🛠️ 診断ツール

### ツール1: 実行フロー確認ページ

**URL**: `http://localhost:3000/check-execution-flow.html`

**機能**:
1. ストア状態の確認
2. コンソールログの監視
3. デバッグコードの注入

### ツール2: 詳細設定分析ページ

**URL**: `http://localhost:3000/deep-settings-analysis.html`

**機能**:
1. LocalStorageの2つのストレージ比較
2. 不整合の検出
3. 設定の修正

---

## 📊 診断フローチャート

```
START
  ↓
[1] deep-settings-analysis.htmlで不整合チェック
  ↓
  ├─ 不整合あり → 「設定を修正」ボタンで修正 → ページリロード → END
  │
  └─ 不整合なし
       ↓
     [2] check-execution-flow.htmlで「デバッグコードを注入」
       ↓
     [3] ブラウザコンソールでデバッグコードを実行
       ↓
       ├─ sendProgressiveMessage が undefined → chat.slice.tsの問題
       │
       ├─ chat.progressiveMode.enabled が false → LocalStorageの問題
       │
       ├─ is_group_mode が true → グループモードの問題
       │
       └─ すべて正常
            ↓
          [4] メッセージを送信してログを確認
            ↓
            ├─ 「🔍 Progressive Mode Check」なし → handleSendが呼ばれていない
            │
            ├─ 「📝 Using Normal Message Generation」→ 判定ロジックの問題
            │
            ├─ 「🚀 Using Progressive Message Generation」
            │   +「falling back to normal message」→ chat-progressive-handlerの2重チェック
            │
            └─ 「🚀 [sendProgressiveMessage] Method called」→ 正常動作
```

---

## 🎯 次のアクション

### ユーザーに確認してほしいこと

1. **`http://localhost:3000/deep-settings-analysis.html`** にアクセス
   - 不整合が検出されるか確認
   - 検出された場合は「設定を修正」ボタンをクリック

2. **`http://localhost:3000/check-execution-flow.html`** にアクセス
   - 「3. デバッグコードを注入」をクリック
   - コードをコピーしてブラウザコンソールに貼り付け
   - 出力結果を報告

3. **メッセージを送信**
   - ブラウザコンソールに表示されるログを確認
   - どのログが表示されるか報告

---

## 💡 最も可能性が高いシナリオ

**仮説**: LocalStorageの`unified-settings`に古い`enabled: false`の値が残っている

**理由**:
- デフォルト値は`enabled: true`
- しかし、過去に一度でも設定画面で無効化していれば、その値が永続化される
- 今回の修正でデフォルト値を読み込むようにしたが、既存のLocalStorageは上書きされない

**解決策**:
1. `deep-settings-analysis.html`で「設定を修正」
2. または、LocalStorageをクリアして再起動

---

## 📝 コード解析結果

### ✅ 正しく実装されている箇所

1. **chat.slice.ts**: `createProgressiveHandler`を正しくスプレッド
2. **MessageInput.tsx**: `sendProgressiveMessage`を正しくインポート
3. **handleSend**: 判定ロジックは正しい
4. **chat-progressive-handler.ts**: 実装は正しい

### ⚠️ 潜在的な問題

1. **chat-progressive-handler.ts:55**: 2重チェックがフォールバックを引き起こす可能性
2. **settings.slice.ts初期化**: `initialSettings.chat`が未定義の可能性

---

**作成者**: Claude Code (Sonnet 4.5)
**最終更新**: 2025-10-08
