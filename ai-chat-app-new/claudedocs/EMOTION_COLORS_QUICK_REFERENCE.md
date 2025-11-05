# 感情色カスタマイズ機能 - クイックリファレンス

## 🚀 次のセッションで即座に開始

### Phase 2を開始する場合
```
/sc:implement Phase 2: フォントエフェクトロジックの統一

目的: 重複しているフォントエフェクトロジックを統一

実装タスク:
1. useMessageEffects.tsのcalculateFontEffects()を統一実装として確立
2. ProgressiveMessageBubble.tsxで共通フックを使用
3. RichMessage.tsxで共通フックを使用
4. 重複コードを削除
5. テストして動作確認
```

### Phase 1の動作テストをする場合
```bash
# 型チェック
npx tsc --noEmit

# サーバー起動
npm run dev
```

**テスト手順:**
1. 設定 → エフェクト → フォントエフェクト有効化
2. 「感情色のカスタマイズ」を展開
3. 色を変更
4. チャットで `今日は「楽しい」ね！` と送信
5. 色が反映されることを確認

---

## 📁 変更ファイル一覧（Phase 1）

```
型定義・設定 (4ファイル)
├── src/services/settings-manager/types/domains/effects.types.ts
├── src/types/core/settings.types.ts
├── src/services/settings-manager/defaults/settings.defaults.ts
└── src/services/settings-manager/validation/settings.schema.ts

ロジック (1ファイル)
└── src/utils/text/emotion-text-processor.ts

UI (1ファイル)
└── src/components/settings/SettingsModal/panels/EffectsPanel.tsx

コンポーネント (2ファイル)
├── src/components/chat/ProgressiveMessageBubble.tsx
└── src/components/chat/RichMessage.tsx
```

---

## 🔑 重要な変更点

### emotion-text-processor.ts
```typescript
// 新しいインターフェース
processEmotionalText(text: string, emotionColors?: EmotionColorSettings)

// デフォルト値
DEFAULT_EMOTION_COLORS = { positive: '#ff99c2', ... }

// 新しい関数
getEmotionStyles(colors: EmotionColorSettings)
hexToRgba(hex: string, alpha: number)
```

### EffectsPanel.tsx
```typescript
// 色ピッカーUIを追加
{settings.fontEffects && (
  <div className="ml-6 mb-4 space-y-4">
    <FontEffectSlider ... />
    {/* 🎨 感情色カスタマイズUI */}
    <div className="border-t border-white/10 pt-4">
      ...
    </div>
  </div>
)}
```

---

## 🎨 デフォルト色設定

| 感情タイプ | 色コード | 説明 |
|-----------|---------|------|
| ポジティブ | `#ff99c2` | ピンク（愛、好き、嬉しい等） |
| ネガティブ | `#70b8ff` | ライトブルー（悲しい、寂しい等） |
| 驚き | `#ffd93d` | イエロー（えっ、まさか等） |
| 質問 | `#00d9ff` | シアン（？、なんで等） |
| 一般強調 | `#ff9999` | ライトレッド（！、～等） |
| デフォルト | `#ffffff` | 白（感情未検出時） |

---

## 🐛 トラブルシューティング

### 型エラーが出る場合
```bash
npx tsc --noEmit
```
→ エラーなしが正常

### 色が反映されない場合
1. フォントエフェクトが有効化されているか確認
2. ブラウザのキャッシュをクリア
3. LocalStorageを確認（emotionColorsが保存されているか）

### ビルドエラーが出る場合
```bash
# キャッシュクリア
powershell "Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue"

# 再ビルド
npm run build
```

---

## 📊 実装進捗

- ✅ **Phase 1**: 感情色カスタマイズ機能（完了）
- ⏳ **Phase 2**: フォントエフェクトロジック統一（未着手）
- ⏳ **Phase 3**: 機能拡張（未着手）

---

## 🔗 関連ドキュメント

- `PHASE1_EMOTION_COLORS_HANDOFF.md` - 詳細な引き継ぎドキュメント
- `EFFECT_SETTINGS_CONSOLIDATION_ANALYSIS.md` - エフェクト設定分析
- `🎯 AI Chat V3 完全開発ガイド.md` - プロジェクト全体ガイド

---

**最終更新**: 2025-10-22
**ステータス**: Phase 1完了
