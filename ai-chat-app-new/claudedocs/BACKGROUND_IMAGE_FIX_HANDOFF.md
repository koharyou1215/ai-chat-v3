# 背景画像デバイス別表示の修正完了 - 引き継ぎドキュメント

## 📋 概要

**問題：** キャラクターの背景画像で、デスクトップ用（横長）とモバイル用（縦長）の画像を設定しても、デスクトップで縦長画像が表示され、上下が切れてしまう問題が発生していた。

**原因：**
1. `background_url_desktop`と`background_url_mobile`のフィールドが`character.slice.ts`で読み込まれていなかった
2. CSS適用で`background`短縮プロパティを使用していたため`background-size`が無効化されていた
3. デバイス判定ロジックが厳しすぎてデスクトップをモバイルと誤認識していた
4. JSONファイルのURL前置スペースや重複ファイルの問題

**解決状況：** 温泉キャラクター（美咲）で動作確認済み。他のキャラクターにも同様の修正が必要。

---

## ✅ 実施した修正内容

### 1. AppearanceProvider.tsxのCSS修正
**ファイル：** `src/components/providers/AppearanceProvider.tsx:363`

**修正内容：**
```typescript
// 修正前
background: var(--background) !important;

// 修正後
background-image: var(--background) !important;
```

**理由：** CSS短縮プロパティ`background`は他のプロパティ（background-size等）をリセットしてしまうため、`background-image`に変更。

---

### 2. デバイス判定ロジックの改善
**ファイル：** `src/utils/device-detection.ts:23-38`

**修正内容：**
```typescript
// 修正前
return isMobileUA || (isMobileViewport && isTouchDevice);

// 修正後
if (isMobileUA) {
  return true;
}
// タッチスクリーン搭載デスクトップPCでの誤判定を防ぐ
const isMobileViewport = window.innerWidth < 640; // 768px → 640px
return isMobileViewport;
```

**理由：** タッチスクリーン搭載デスクトップPCでモバイルと誤判定される問題を解決。User Agentを最優先し、デスクトップは640px未満のみモバイル判定。

---

### 3. selectBackgroundImageURL関数の改善
**ファイル：** `src/utils/device-detection.ts:82`

**修正内容：**
```typescript
// 修正前
return url;

// 修正後
return url.trim(); // 前後の空白を削除
```

**理由：** JSONファイルに前置スペースがある場合に対応。

---

### 4. character.slice.tsに背景画像URLの読み込み追加（重要）
**ファイル：** `src/store/slices/character.slice.ts:237-242`

**修正内容：**
```typescript
background_url: (characterData.background_url && typeof characterData.background_url === 'string' && characterData.background_url.trim() !== '')
  ? characterData.background_url
  : '',
// 🆕 追加
background_url_desktop: (characterData.background_url_desktop && typeof characterData.background_url_desktop === 'string' && characterData.background_url_desktop.trim() !== '')
  ? characterData.background_url_desktop
  : undefined,
background_url_mobile: (characterData.background_url_mobile && typeof characterData.background_url_mobile === 'string' && characterData.background_url_mobile.trim() !== '')
  ? characterData.background_url_mobile
  : undefined,
```

**理由：** これまで`background_url_desktop`と`background_url_mobile`がZustand storeに読み込まれていなかったため、AppearanceProviderが認識できなかった。**最も重要な修正。**

---

### 5. デバッグ機能の追加（開発環境のみ）
**ファイル：** `src/components/providers/AppearanceProvider.tsx:196-212`

**追加内容：**
画面右上に以下の情報を表示するデバッグパネルを追加：
- Character名
- Character ID
- Base URL / Desktop URL / Mobile URL
- 選択されたURL
- デバイス判定結果

**用途：** 問題が発生した際に、どのURLが選択されているか、デバイス判定が正しいかを即座に確認可能。

---

## 🔧 温泉キャラクター（美咲）の個別修正

### 1. background_urlの前置スペース削除
**ファイル：** `public/characters/温泉.json:43`

```json
// 修正前
"background_url": " https://image.cdn2.seaart.me/..."

// 修正後
"background_url": "https://image.cdn2.seaart.me/..."
```

### 2. IDフィールドの追加
**ファイル：** `public/characters/温泉.json:2`

```json
{
  "id": "character-419",  // 追加
  "name": "美咲（みさき）",
  ...
}
```

**理由：** 既存のLocalStorageデータとの互換性を保つため。

### 3. 重複ファイルの削除
**削除したファイル：** `public/characters/character-419.json`

**理由：** 同じキャラクター（美咲）の古いバージョンが存在し、そちらが優先されていた。

---

## 🚨 他のキャラクターへの適用が必要な作業

以下のキャラクターファイルに`background_url_desktop`が設定されていることを確認済み：
1. ✅ `温泉.json` - 修正完了
2. ⚠️ `ユキ（雪村ユキ）.json` - 未確認
3. ⚠️ `万引き.json` - 未確認
4. ⚠️ `彼氏と彼女の字.json` - 未確認
5. ⚠️ `配信者.json` - 未確認
6. ⚠️ `アン-grok.json` - 未確認

### 実施すべき確認・修正作業

#### 1. 前置スペースのチェックと削除
**対象：** 全キャラクターファイル

**確認コマンド（PowerShell）：**
```powershell
cd "C:\ai-chat-v3\ai-chat-app-new\public\characters"
Get-Content *.json | Select-String '"background_url"\s*:\s*" '
```

**修正方法：** 該当する場合、URLの前の空白を削除。

---

#### 2. 重複キャラクターファイルの確認
**対象：** 全キャラクター

**確認コマンド（Node.js）：**
```javascript
const fs = require('fs');
const files = fs.readdirSync('public/characters').filter(f => f.endsWith('.json') && f !== 'manifest.json');
const names = {};
files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(`public/characters/${f}`, 'utf8').replace(/^\uFEFF/, ''));
  const name = data.name;
  if (names[name]) {
    console.log(`重複: ${name} -> ${names[name]}, ${f}`);
  } else {
    names[name] = f;
  }
});
```

**修正方法：**
- 重複が見つかった場合、古いバージョンを削除
- 新しいファイルに`id`フィールドを追加して互換性を保つ

---

#### 3. IDフィールドの追加
**対象：** `id`フィールドがないキャラクターファイル

**確認コマンド：**
```bash
grep -L '"id"' public/characters/*.json | grep -v manifest.json
```

**修正方法：** 各ファイルの最初に`"id"`フィールドを追加：
```json
{
  "id": "character-xxx",  // ファイル名またはキャラクター名から生成
  "name": "...",
  ...
}
```

---

#### 4. background_url_mobileの設定（オプション）
**対象：** `background_url_desktop`が設定されているキャラクター

**推奨事項：**
- `background_url_mobile`が未設定の場合、`background_url`（縦長画像）がモバイルで使用される
- 必要に応じてモバイル専用の縦長画像URLを`background_url_mobile`に設定

**設定例：**
```json
{
  "background_url": "https://...縦長画像.webp",
  "background_url_desktop": "https://...横長画像.webp",
  "background_url_mobile": "https://...縦長モバイル最適化画像.webp"  // オプション
}
```

---

## 📝 動作確認手順

### 各キャラクターで以下を確認：

1. **ブラウザのハードリロード**：`Ctrl + Shift + R`

2. **キャラクターを選択**

3. **デバッグ情報を確認**（開発環境のみ）：
   ```
   Character: [キャラクター名]
   ID: [キャラクターID]
   Desktop URL: ✅ または ❌
   Selected: [実際に選択されたURL]
   Device: Desktop (デスクトップの場合)
   ```

4. **期待される結果：**
   - デスクトップ（640px以上）：`background_url_desktop`が選択される
   - モバイル（640px未満）：`background_url_mobile`または`background_url`が選択される
   - 背景画像が画面全体に収まり、縦横比が保たれている

---

## 🐛 トラブルシューティング

### 問題1: デバッグ情報で「Desktop URL: ❌ none」と表示される

**原因：**
- JSONファイルに`background_url_desktop`が設定されていない
- character.slice.tsの修正が反映されていない

**対処法：**
1. JSONファイルを確認し、`background_url_desktop`を追加
2. `npm run dev`を再起動
3. LocalStorageをクリア：`localStorage.clear(); location.reload();`

---

### 問題2: 別のキャラクターのデータが表示される

**原因：**
- LocalStorageに古いデータがキャッシュされている
- 重複したキャラクターファイルが存在する

**対処法：**
1. ブラウザコンソールでLocalStorageをクリア
2. 重複ファイルを確認・削除
3. キャラクターを再選択

---

### 問題3: デバイス判定が「Mobile」になってしまう

**原因：**
- ブラウザの幅が640px未満
- User Agentがモバイルとして認識されている

**対処法：**
1. ブラウザの幅を640px以上に拡大
2. デバッグ情報の「Width」を確認
3. 必要に応じて`device-detection.ts`の閾値を調整

---

## 🎯 次のセッションでの作業指示

### 優先度：高
1. **全キャラクターファイルの前置スペースチェック**
   - `background_url`、`background_url_desktop`、`background_url_mobile`
   - 見つかった場合は削除

2. **重複キャラクターファイルの確認と削除**
   - 同じ`name`を持つファイルの検索
   - 古いバージョンの削除

### 優先度：中
3. **IDフィールドの追加**
   - 全キャラクターファイルに`id`フィールドを追加
   - 既存のLocalStorageデータとの互換性確保

4. **動作確認**
   - `background_url_desktop`が設定されている6キャラクターでテスト
   - デスクトップとモバイルの両方で確認

### 優先度：低
5. **デバッグ機能の削除（本番前）**
   - 開発が完了したらAppearanceProvider.tsxのデバッグコードを削除
   - または環境変数で制御

---

## 📚 参考情報

### 関連ファイル
- `src/components/providers/AppearanceProvider.tsx` - 背景画像の適用ロジック
- `src/utils/device-detection.ts` - デバイス判定とURL選択
- `src/store/slices/character.slice.ts` - キャラクターデータの読み込み
- `src/types/core/character.types.ts` - Character型定義（背景URLフィールド定義済み）

### Character型の背景画像フィールド
```typescript
interface Character {
  background_url?: string;           // 共通背景（後方互換・モバイル用）
  background_url_desktop?: string;   // デスクトップ用（横長推奨）
  background_url_mobile?: string;    // モバイル用（縦長推奨）
  ...
}
```

### 優先順位（デバイス別）
**デスクトップ（640px以上）：**
1. `background_url_desktop`（設定されている場合）
2. `background_url`（フォールバック）

**モバイル（640px未満）：**
1. `background_url_mobile`（設定されている場合）
2. `background_url`（フォールバック）

---

## ✅ 完了チェックリスト

- [x] AppearanceProvider.tsxのCSS修正
- [x] device-detection.tsのデバイス判定改善
- [x] selectBackgroundImageURL関数にtrim()追加
- [x] character.slice.tsに背景URLフィールド読み込み追加
- [x] 温泉.jsonの前置スペース削除
- [x] 温泉.jsonにIDフィールド追加
- [x] character-419.jsonの削除
- [x] 温泉キャラクターで動作確認
- [ ] 他の5キャラクターの前置スペースチェック
- [ ] 他の5キャラクターの動作確認
- [ ] 全キャラクターファイルの重複確認
- [ ] 全キャラクターファイルにIDフィールド追加
- [ ] デバッグ機能の削除（本番前）

---

**作成日：** 2025-10-31
**最終更新：** 2025-10-31
**ステータス：** 温泉キャラクターで修正完了、他キャラクターへの展開待ち
