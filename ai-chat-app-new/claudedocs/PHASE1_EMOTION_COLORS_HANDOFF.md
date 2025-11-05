# Phase 1: 感情色カスタマイズ機能 - 実装引き継ぎドキュメント

**作成日**: 2025-10-22
**ステータス**: ✅ Phase 1 完了
**次のステップ**: Phase 2（フォントエフェクトロジック統一）

---

## 📋 実装概要

### 目的
ユーザーが鍵括弧（「」）内のテキストの感情検出色を設定から変更できるようにする。

### 解決した問題
- **以前**: 感情色が `emotion-text-processor.ts` にハードコードされており、ユーザーが変更できなかった
- **現在**: 設定UIから6つの感情タイプの色をカスタマイズ可能

---

## ✅ 完了した変更

### 1. 型定義の追加

#### `src/services/settings-manager/types/domains/effects.types.ts`
```typescript
// 追加された型定義
export interface EmotionColorSettings {
  positive: string;   // ポジティブ感情の色
  negative: string;   // ネガティブ感情の色
  surprise: string;   // 驚き感情の色
  question: string;   // 質問感情の色
  general: string;    // 一般的な強調の色
  default: string;    // デフォルトの色
}

// EffectSettings インターフェースに追加
export interface EffectSettings {
  // ... 既存のプロパティ
  emotionColors: EmotionColorSettings;  // 🆕 Phase 1で追加
}
```

#### `src/types/core/settings.types.ts`
```typescript
export interface EffectSettings {
  // ... 既存のプロパティ
  bubbleBlurIntensity?: number;  // 🆕 Phase 2の設定も追加

  emotionColors?: {  // 🎨 Phase 1で追加（オプショナル）
    positive: string;
    negative: string;
    surprise: string;
    question: string;
    general: string;
    default: string;
  };
}
```

---

### 2. デフォルト値の定義

#### `src/services/settings-manager/defaults/settings.defaults.ts`
```typescript
effects: {
  // ... 既存の設定

  // 🎨 Phase 1: Emotion Color Settings
  emotionColors: {
    positive: '#ff99c2',   // ポジティブ: ピンク
    negative: '#70b8ff',   // ネガティブ: ライトブルー
    surprise: '#ffd93d',   // 驚き: イエロー
    question: '#00d9ff',   // 質問: シアン
    general: '#ff9999',    // 一般強調: ライトレッド
    default: '#ffffff',    // デフォルト: 白
  },
}
```

---

### 3. バリデーションスキーマの更新

#### `src/services/settings-manager/validation/settings.schema.ts`
```typescript
effects: z.object({
  // ... 既存のスキーマ

  // 🎨 Phase 1: Emotion color settings validation
  emotionColors: z.object({
    positive: z.string(),
    negative: z.string(),
    surprise: z.string(),
    question: z.string(),
    general: z.string(),
    default: z.string(),
  }),
})
```

---

### 4. 感情テキスト処理の設定ベース化

#### `src/utils/text/emotion-text-processor.ts`

**主な変更点:**

1. **デフォルト色定数の追加**
```typescript
export const DEFAULT_EMOTION_COLORS: EmotionColorSettings = {
  positive: '#ff99c2',
  negative: '#70b8ff',
  surprise: '#ffd93d',
  question: '#00d9ff',
  general: '#ff9999',
  default: '#ffffff',
};
```

2. **感情スタイル生成関数の追加**
```typescript
export function getEmotionStyles(colors: EmotionColorSettings): Record<EmotionType, string> {
  return {
    positive: `color: ${colors.positive}; text-shadow: 0 0 10px ${hexToRgba(colors.positive, 0.6)}; font-weight: bold;`,
    // ... 他の感情タイプ
  };
}
```

3. **HEX → RGBA 変換関数の追加**
```typescript
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

4. **processEmotionalText関数の更新**
```typescript
export function processEmotionalText(
  text: string,
  emotionColors?: EmotionColorSettings  // 🆕 オプショナルパラメータ追加
): string {
  if (!text) return text;

  const colors = emotionColors || DEFAULT_EMOTION_COLORS;  // デフォルト値を使用
  const styles = getEmotionStyles(colors);

  return text.replace(/「([^」]+)」/g, (match, innerText) => {
    const emotion = detectEmotion(innerText);
    const style = styles[emotion];
    const effectClass = `${emotion}-emotion`;

    return `<span class="${effectClass}" style="${style}">「${innerText}」</span>`;
  });
}
```

**後方互換性:**
- `emotionColors` パラメータはオプショナル
- 未指定時は `DEFAULT_EMOTION_COLORS` を使用
- 既存のコードはそのまま動作

---

### 5. 色ピッカーUIの追加

#### `src/components/settings/SettingsModal/panels/EffectsPanel.tsx`

**追加された機能:**

1. **折りたたみ可能な感情色設定セクション**
```tsx
const [showEmotionColors, setShowEmotionColors] = useState(false);
const emotionColors = settings.emotionColors || DEFAULT_EMOTION_COLORS;
```

2. **6つの色ピッカー**
- ポジティブ（愛、好き、嬉しい等）
- ネガティブ（悲しい、寂しい、辛い等）
- 驚き（えっ、まさか、すごい等）
- 質問（？、なんで、なぜ等）
- 一般強調（！、～、... 等）
- デフォルト（感情未検出時）

3. **リアルタイムプレビュー**
- 色の選択と同時にプレビュー表示が更新
- カラープレビューボックスで現在の色を確認可能

**UIの配置:**
```
設定モーダル
└── エフェクトタブ
    └── フォントエフェクト
        ├── フォントエフェクト強度スライダー
        └── 感情色のカスタマイズ（折りたたみ可能）
            ├── ポジティブ色
            ├── ネガティブ色
            ├── 驚き色
            ├── 質問色
            ├── 一般強調色
            └── デフォルト色
```

---

### 6. コンポーネントの更新

#### `src/components/chat/ProgressiveMessageBubble.tsx`
```tsx
// 🎨 Phase 1: 設定から感情色を取得
const processedContent = useMemo(() => {
  return processEmotionalText(
    displayedContent || "",
    effectSettings.emotionColors  // 設定から色を渡す
  );
}, [displayedContent, effectSettings.emotionColors]);
```

#### `src/components/chat/RichMessage.tsx`
```tsx
// 🎨 Phase 1: 統合された感情テキスト処理を使用（設定から色を取得）
processed = processEmotionalText(processed, effectSettings.emotionColors);

// 依存配列にも追加
}, [displayContent, isEffectEnabled, effectSettings.fontEffectsIntensity, effectSettings.emotionColors]);
```

---

## 📁 変更されたファイル一覧

### 型定義・設定
1. `src/services/settings-manager/types/domains/effects.types.ts` - 型定義追加
2. `src/types/core/settings.types.ts` - 型定義追加
3. `src/services/settings-manager/defaults/settings.defaults.ts` - デフォルト値追加
4. `src/services/settings-manager/validation/settings.schema.ts` - バリデーション追加

### ロジック
5. `src/utils/text/emotion-text-processor.ts` - 設定ベース化、関数追加

### UI
6. `src/components/settings/SettingsModal/panels/EffectsPanel.tsx` - 色ピッカーUI追加

### コンポーネント
7. `src/components/chat/ProgressiveMessageBubble.tsx` - 設定から色取得
8. `src/components/chat/RichMessage.tsx` - 設定から色取得

**合計**: 8ファイル

---

## 🧪 テスト方法

### 1. 型チェック
```bash
npx tsc --noEmit
```
**結果**: ✅ エラーなし

### 2. 設定UIの確認
1. 設定モーダルを開く
2. エフェクトタブを選択
3. フォントエフェクトを有効化
4. 「感情色のカスタマイズ」をクリックして展開
5. 各色ピッカーが正常に表示されることを確認

### 3. 色変更のテスト
1. 各感情タイプの色を変更
2. チャットで以下を送信:
```
今日は「楽しい」ね！
「悲しい」気持ちだよ
「えっ、まさか」！
「なんで」そうなるの？
「最高」！
```
3. 括弧内のテキストが設定した色で表示されることを確認

### 4. 永続化テスト
1. 色を変更
2. ページをリロード
3. 設定した色が保持されていることを確認

---

## 📊 既知の問題・注意事項

### ✅ 解決済み
- **型エラー**: `emotionColors` が undefined の可能性 → デフォルト値で対応済み
- **後方互換性**: 既存のコードが動作しない → オプショナルパラメータで対応済み

### ⚠️ 今後の改善点
1. **色のバリデーション**: 現在は文字列型のみ、HEX形式のバリデーションは未実装
2. **プレビュー機能**: 設定画面内でリアルタイムプレビューはまだない
3. **プリセット機能**: デフォルト、パステル、ビビッド等のプリセットは未実装
4. **エクスポート/インポート**: 色設定の共有機能は未実装

---

## 🚀 次のステップ: Phase 2

### Phase 2の目的
フォントエフェクトロジックの統一（重複排除）

### 問題点
現在、フォントエフェクトスタイル計算が3箇所に分散:
1. `useMessageEffects.ts:86-114` - 共通フック
2. `ProgressiveMessageBubble.tsx:206-230` - 独自実装
3. `RichMessage.tsx:165-192` - 独自実装

### Phase 2の実装タスク
1. ✅ `useMessageEffects.ts` の `calculateFontEffects()` を統一実装として確立
2. ✅ `ProgressiveMessageBubble.tsx` で共通フックを使用
3. ✅ `RichMessage.tsx` で共通フックを使用
4. ✅ 重複コードを削除
5. ✅ テストして動作確認

### 期待される成果
- コードの保守性向上
- 一貫性のある動作
- 修正時の工数削減（1箇所の修正で全体に反映）

---

## 🚀 次のステップ: Phase 3（オプション）

### Phase 3の目的
機能拡張（ユーザビリティ向上）

### 実装予定機能
1. **色プリセット機能**
   - デフォルト、パステル、ビビッド、モノクロ等
   - ワンクリックで色セットを変更

2. **リアルタイムプレビュー**
   - 設定画面内でサンプルテキストを表示
   - 色変更が即座に反映

3. **エクスポート/インポート**
   - JSON形式で色設定をエクスポート
   - 他のユーザーと設定を共有可能

4. **カラーピッカーの改善**
   - より高度な色選択UI
   - RGB/HSL値の直接入力
   - 最近使用した色の履歴

---

## 💡 実装時のTips

### 設定の取得方法
```typescript
// フックを使用
const { settings: effectSettings } = useMessageEffects();
const emotionColors = effectSettings.emotionColors || DEFAULT_EMOTION_COLORS;
```

### 設定の更新方法
```typescript
// EffectsPanel内で
updateSetting("emotionColors", {
  ...emotionColors,
  positive: newColor,
});
```

### 後方互換性の維持
```typescript
// 常にデフォルト値を提供
const colors = emotionColors || DEFAULT_EMOTION_COLORS;
```

---

## 📚 参考情報

### 関連ドキュメント
- `EFFECT_SETTINGS_CONSOLIDATION_ANALYSIS.md` - エフェクト設定統合分析
- `SETTINGS_SYSTEM_COMPREHENSIVE_ANALYSIS.md` - 設定システム包括分析
- `🎯 AI Chat V3 完全開発ガイド.md` - プロジェクト全体ガイド

### 感情検出パターン
```typescript
export const EMOTION_PATTERNS = {
  positive: /愛|好き|うれしい|楽しい|幸せ|最高|素晴らしい|ありがとう|嬉しい|ドキドキ|ワクワク|キラキラ/,
  negative: /悲しい|寂しい|つらい|苦しい|嫌い|最悪|うざい|むかつく|怒り|泣き/,
  surprise: /えっ|まさか|すごい|びっくり|驚き|興奮|ドキドキ|ハラハラ/,
  question: /？|\?|なんで|なぜ|どうして|どう|何|どれ|いつ|どこ|誰/,
  general: /！|!|〜|ー|…|\.\.\./,
};
```

---

## ✅ チェックリスト（次のセッション開始時）

- [ ] Phase 1の実装内容を確認
- [ ] 変更されたファイルを確認
- [ ] テスト方法を実行して動作確認
- [ ] Phase 2の実装タスクを確認
- [ ] `/sc:implement` でPhase 2を開始

---

**次のセッションでの推奨コマンド:**
```bash
# 1. 現在の状態を確認
git status && git branch

# 2. 型チェック
npx tsc --noEmit

# 3. Phase 2の実装開始
/sc:implement Phase 2: フォントエフェクトロジックの統一
```

---

**作成者**: Claude Code
**最終更新**: 2025-10-22
**ステータス**: ✅ Phase 1完了、Phase 2準備完了
