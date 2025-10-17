# トラブルシューティングレポート: Gemini API "The model is overloaded" エラー

**日時**: 2025-10-17
**エラー**: `Gemini API error: The model is overloaded. Please try again later.`
**モデル**: `google/gemini-2.5-flash-preview-09-2025`
**設定**: Provider: `openrouter`, Use Direct Gemini: `true`

---

## 🔍 根本原因分析

### 問題の本質

**プレビュー版モデルは直接Gemini APIでは利用できない**

エラーメッセージ「The model is overloaded」は誤解を招きますが、実際には：

```
❌ 誤解: モデルが過負荷状態
✅ 実態: プレビュー版モデルがGemini API直接アクセスでサポートされていない
```

### 設定の矛盾

現在の設定：
```
provider: "openrouter"        ← OpenRouterを使うべき
useDirectGeminiAPI: true      ← Gemini APIを直接使う
model: "google/gemini-2.5-flash-preview-09-2025"
```

**問題点**:
- `useDirectGeminiAPI: true`の場合、`provider`設定は無視される
- Line 188-196 (simple-api-manager-v2.ts) で`useDirectGeminiAPI`が優先される

```typescript
if (this.useDirectGeminiAPI && this.geminiApiKey) {
  // プロバイダー設定に関わらずGemini APIを直接使用
  return await this.generateWithGemini(...);
}
```

### API の違い

| API | プレビュー版サポート | URL形式 |
|-----|---------------------|---------|
| **Gemini API (直接)** | ❌ なし | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` |
| **OpenRouter** | ✅ あり | `https://openrouter.ai/api/v1/chat/completions` (model: `google/gemini-2.5-flash-preview-09-2025`) |

### モデルの可用性

#### Gemini API (直接アクセス)
利用可能なモデル：
```
✅ gemini-2.5-pro
✅ gemini-2.5-flash
✅ gemini-2.5-flash-lite
❌ gemini-2.5-flash-preview-09-2025 (プレビュー版は非対応)
```

#### OpenRouter経由
利用可能なモデル：
```
✅ google/gemini-2.5-pro
✅ google/gemini-2.5-flash
✅ google/gemini-2.5-flash-lite
✅ google/gemini-2.5-flash-preview-09-2025 (プレビュー版に対応)
✅ google/gemini-2.5-flash-lite-preview-09-2025
```

---

## 🎯 解決策

### 即座の対策（推奨）

**Option 1: OpenRouterを使用する**

設定画面（AIタブ）で：
1. `Use Direct Gemini API`を**OFF**にする
2. プロバイダーは`openrouter`のまま
3. モデルは`google/gemini-2.5-flash-preview-09-2025`のまま

これで、OpenRouter経由でプレビュー版モデルが使用できます。

**Option 2: 安定版モデルを使用する**

`Use Direct Gemini API`を**ON**のままにしたい場合：
1. モデルを安定版に変更：
   - `google/gemini-2.5-flash`
   - `google/gemini-2.5-pro`
   - `google/gemini-2.5-flash-lite`（存在する場合）

### 長期的な改善

#### 1. UI改善: 設定の整合性チェック

`src/components/settings/SettingsModal/panels/AIPanel.tsx`に警告表示を追加：

```typescript
{useDirectGeminiAPI && model.includes('preview') && (
  <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
    ⚠️ プレビュー版モデルは直接Gemini APIでは利用できません。
    OpenRouter経由での使用を推奨します。
  </div>
)}
```

#### 2. モデル選択の制限

`useDirectGeminiAPI: true`の場合、選択可能なモデルを安定版のみに制限：

```typescript
const availableGeminiModels = useDirectGeminiAPI
  ? [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite'
    ]
  : [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash-preview-09-2025',      // プレビュー版
      'gemini-2.5-flash-lite-preview-09-2025'  // プレビュー版
    ];
```

#### 3. エラーハンドリングの改善

`gemini-client.ts`のエラーメッセージを改善：

```typescript
// Line 233あたり
if (errorMessage.includes('overloaded') || errorMessage.includes('not found')) {
  if (this.model.includes('preview')) {
    throw new Error(
      `プレビュー版モデル「${this.model}」は直接Gemini APIでは利用できません。\n` +
      `OpenRouter経由での使用（Use Direct Gemini API: OFF）に切り替えてください。`
    );
  }
  throw new Error(`Gemini API error: ${errorMessage}`);
}
```

#### 4. 自動フォールバック（オプション）

直接APIでプレビュー版が選択された場合、自動的にOpenRouterに切り替える：

```typescript
// simple-api-manager-v2.ts の generateMessage 内
if (this.useDirectGeminiAPI && options?.model?.includes('preview')) {
  console.warn('⚠️ プレビュー版モデルはOpenRouter経由で使用します');
  this.useDirectGeminiAPI = false; // 一時的にOpenRouterに切り替え
}
```

---

## 🔧 実装修正案

### 修正1: エラーメッセージの改善

```typescript
// src/services/api/gemini-client.ts:198-234
if (!response.ok) {
  let errorMessage = response.statusText;
  try {
    const errorData = await response.json();
    errorMessage = errorData.error?.message || errorMessage;

    // プレビュー版モデルのエラーを特定
    if ((errorMessage.includes('overloaded') ||
         errorMessage.includes('not found') ||
         errorMessage.includes('not available')) &&
        this.model.includes('preview')) {
      throw new Error(
        `❌ プレビュー版モデル「${this.model}」は直接Gemini APIでは利用できません。\n\n` +
        `解決策:\n` +
        `1. 設定画面で「Use Direct Gemini API」をOFFにしてOpenRouter経由で使用\n` +
        `2. または、安定版モデル（gemini-2.5-flash, gemini-2.5-pro）に変更`
      );
    }

    // その他のエラーハンドリング...
  } catch (parseError) {
    // ...
  }
  throw new Error(`Gemini API error: ${errorMessage}`);
}
```

### 修正2: 設定検証

```typescript
// src/services/simple-api-manager-v2.ts:188-196
if (this.useDirectGeminiAPI && this.geminiApiKey) {
  const model = options?.model || this.currentConfig.model;

  // プレビュー版モデルの警告
  if (model && model.includes('preview')) {
    console.error(
      `⚠️ プレビュー版モデル「${model}」は直接Gemini APIでサポートされていません。\n` +
      `OpenRouter経由での使用を推奨します。`
    );
    throw new Error(
      `プレビュー版モデル「${model}」は直接Gemini APIでは利用できません。\n` +
      `設定画面で「Use Direct Gemini API」をOFFにしてください。`
    );
  }

  console.log("🔥 Gemini API直接使用 (AIタブトグルON)");
  const result = await this.generateWithGemini(...);
  return result;
}
```

### 修正3: gemini-client.tsのホワイトリスト更新

```typescript
// src/services/api/gemini-client.ts:445-452
getAvailableModels(): string[] {
  // 直接Gemini APIで利用可能な安定版のみ
  return [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    // プレビュー版は除外（OpenRouterでのみ利用可能）
  ];
}
```

---

## ✅ 推奨アクション

### 即座に実施すべきこと

1. **設定変更**（ユーザー側）:
   ```
   Use Direct Gemini API: OFF に変更
   ```
   または
   ```
   モデルを gemini-2.5-flash（安定版）に変更
   ```

2. **エラーメッセージの改善**（開発側）:
   - プレビュー版が直接APIで使えないことを明示
   - 具体的な解決策を提示

### 今後の改善

3. **UI検証の追加**:
   - 矛盾する設定の組み合わせに警告表示
   - プレビュー版選択時に自動でOpenRouterモードを推奨

4. **モデルリストの整理**:
   - 直接API: 安定版のみ
   - OpenRouter: 安定版 + プレビュー版

---

## 📊 設定マトリックス

| Use Direct Gemini | Provider | Model | 結果 |
|-------------------|----------|-------|------|
| ON | （無視） | gemini-2.5-flash | ✅ 動作 |
| ON | （無視） | gemini-2.5-flash-preview-09-2025 | ❌ エラー |
| OFF | openrouter | google/gemini-2.5-flash | ✅ 動作 |
| OFF | openrouter | google/gemini-2.5-flash-preview-09-2025 | ✅ 動作 |

---

## 🎓 学んだこと

1. **プレビュー版とGA版の違い**:
   - プレビュー版は実験的機能を含み、OpenRouterなどのプロキシ経由でのみ利用可能
   - GA版（安定版）は公式APIで直接利用可能

2. **API エンドポイントの違い**:
   - Gemini API直接: 安定版モデルのみサポート
   - OpenRouter: 幅広いモデル（プレビュー版含む）をサポート

3. **エラーメッセージの信頼性**:
   - 「overloaded」は必ずしも過負荷を意味しない
   - モデルが存在しない/アクセスできない場合にも同じメッセージが返される

4. **設定の優先順位**:
   - `useDirectGeminiAPI`フラグは`provider`設定を完全に上書き
   - UIで矛盾する設定が可能になってしまっている

---

**次のステップ**:
このレポートを基に、上記の修正を適用することを推奨します。
特に、エラーメッセージの改善と設定検証は即座に実施すべきです。
