# 🎯 背景設定階層構造化 Phase 3 実装指示書

## 📋 新しいセッションでの開始方法

**このファイルを読み込んで以下のように指示してください**:

```
claudedocs/PHASE3_IMPLEMENTATION_GUIDE.md を読んで、Phase 3の実装を進めてください。

/sc:implement --think-hard --validate --loop --iterations 2
```

---

## 🎯 背景と目的

**Phase 1 & 2完了状況**:
- ✅ Phase 1: HTML属性分離、UI名称変更（混乱解消）
- ✅ Phase 2: 吹き出しぼかし強度スライダー追加（0-20px）

**Phase 3の目的**:
現在のフラット構造を階層構造に変更し、設定の可読性・拡張性を向上させる

**変更内容**:
```typescript
// Before (Phase 2)
ui: {
  backgroundType: 'image',
  backgroundImage: 'url',
  backgroundBlur: 10,
  backgroundBlurEnabled: true,
  backgroundOpacity: 100,
  backgroundGradient: 'gradient-string',
}

// After (Phase 3)
ui: {
  background: {
    type: 'image',
    image: {
      url: 'url',
      blur: 10,
      blurEnabled: true,
      opacity: 100,
    },
    gradient: {
      value: 'gradient-string',
    },
  },
}
```

---

## 📂 影響ファイル（14ファイル）

**コアファイル（必須更新）**:
1. `src/services/settings-manager/types/domains/ui.types.ts` - 型定義
2. `src/services/settings-manager/validation/settings.schema.ts` - Zodスキーマ
3. `src/services/settings-manager/defaults/settings.defaults.ts` - デフォルト値
4. `src/store/slices/settings.slice.ts` - Zustand統合
5. `src/components/providers/AppearanceProvider.tsx` - DOM適用
6. `src/components/settings/SettingsModal/panels/AppearancePanel.tsx` - UI

**マイグレーション（必須実装）**:
7. `src/services/settings-manager/migration/strategies/background-migration.strategy.ts` - 新規作成（順方向）
8. `src/services/settings-manager/migration/strategies/reverse-background-migration.strategy.ts` - 新規作成（逆方向）
9. `src/services/settings-manager/migration/strategies/index.ts` - エクスポート追加

**その他影響ファイル**:
10-14. ChatHeader, ChatInterface, HologramEffect など

---

## 🔧 実装手順

### Step 1: マイグレーション戦略作成（最優先）

#### 1-1. 順方向マイグレーション

**ファイル作成**: `src/services/settings-manager/migration/strategies/background-migration.strategy.ts`

```typescript
import type { MigrationStrategy } from './types';
import type { UnifiedSettings } from '../../../settings-manager';

export class BackgroundMigrationStrategy implements MigrationStrategy {
  readonly name = 'Background Settings Hierarchical Structure Migration (Phase 3)';

  canMigrate(settings: UnifiedSettings): boolean {
    // フラット構造が存在し、階層構造が存在しない場合にマイグレーション
    return (
      settings.ui.backgroundType !== undefined &&
      (settings.ui as any).background === undefined
    );
  }

  migrate(settings: UnifiedSettings): boolean {
    try {
      // フラット構造から値を取得
      const type = settings.ui.backgroundType || 'gradient';
      const imageUrl = settings.ui.backgroundImage || '';
      const blur = settings.ui.backgroundBlur || 10;
      const blurEnabled = settings.ui.backgroundBlurEnabled ?? false;
      const opacity = settings.ui.backgroundOpacity || 100;
      const gradientValue = settings.ui.backgroundGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

      // 階層構造を作成
      (settings.ui as any).background = {
        type,
        image: {
          url: imageUrl,
          blur,
          blurEnabled,
          opacity,
        },
        gradient: {
          value: gradientValue,
        },
      };

      // 古いフラット構造を削除
      delete settings.ui.backgroundType;
      delete settings.ui.backgroundImage;
      delete settings.ui.backgroundBlur;
      delete settings.ui.backgroundBlurEnabled;
      delete settings.ui.backgroundOpacity;
      delete settings.ui.backgroundGradient;

      console.log('✅ [BackgroundMigration] Migrated to hierarchical structure');
      return true;
    } catch (error) {
      console.error('❌ [BackgroundMigration] Migration failed:', error);
      return false;
    }
  }
}
```

---

#### 1-2. 逆方向マイグレーション（ロールバック用）

**ファイル作成**: `src/services/settings-manager/migration/strategies/reverse-background-migration.strategy.ts`

```typescript
import type { MigrationStrategy } from './types';
import type { UnifiedSettings } from '../../../settings-manager';

export class ReverseBackgroundMigrationStrategy implements MigrationStrategy {
  readonly name = 'Reverse Background Migration (Phase 3 Rollback)';

  canMigrate(settings: UnifiedSettings): boolean {
    // 階層構造が存在する場合に逆マイグレーション
    return (settings.ui as any).background !== undefined;
  }

  migrate(settings: UnifiedSettings): boolean {
    try {
      const bg = (settings.ui as any).background;

      // 階層構造からフラット構造に戻す
      settings.ui.backgroundType = bg.type || 'gradient';
      settings.ui.backgroundImage = bg.image?.url || '';
      settings.ui.backgroundBlur = bg.image?.blur || 10;
      settings.ui.backgroundBlurEnabled = bg.image?.blurEnabled ?? false;
      settings.ui.backgroundOpacity = bg.image?.opacity || 100;
      settings.ui.backgroundGradient = bg.gradient?.value || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

      // 階層構造を削除
      delete (settings.ui as any).background;

      console.log('✅ [ReverseBackgroundMigration] Rolled back to flat structure');
      return true;
    } catch (error) {
      console.error('❌ [ReverseBackgroundMigration] Rollback failed:', error);
      return false;
    }
  }
}
```

---

#### 1-3. Strategyのエクスポート追加

**ファイル編集**: `src/services/settings-manager/migration/strategies/index.ts`

以下の2行を追加：

```typescript
export { BackgroundMigrationStrategy } from './background-migration.strategy';
export { ReverseBackgroundMigrationStrategy } from './reverse-background-migration.strategy';
```

---

#### 1-4. Migratorへの登録

**ファイル編集**: `src/services/settings-manager/migration/settings-migrator.ts`

`strategies` 配列に `BackgroundMigrationStrategy` を追加：

```typescript
private readonly strategies: MigrationStrategy[] = [
  new ThreeDMigrationStrategy(),
  new EmotionMigrationStrategy(),
  new BackgroundMigrationStrategy(), // 🆕 追加
  new LocalStorageMigrationStrategy(),
  new ZustandMigrationStrategy(),
];
```

**重要**: `BackgroundMigrationStrategy`のインポート文も追加：

```typescript
import {
  ThreeDMigrationStrategy,
  EmotionMigrationStrategy,
  BackgroundMigrationStrategy, // 🆕 追加
  LocalStorageMigrationStrategy,
  ZustandMigrationStrategy,
  type MigrationStrategy,
} from './strategies';
```

---

### Step 2: 型定義更新

#### 2-1. UISettings型更新

**ファイル編集**: `src/services/settings-manager/types/domains/ui.types.ts`

`UISettings` インターフェースに以下を追加：

```typescript
export interface UISettings {
  // ... 既存フィールド（そのまま）

  // 🔄 Phase 3: 階層構造に変更
  background: {
    type: 'color' | 'gradient' | 'image' | 'animated';
    image: {
      url: string;
      blur: number;
      blurEnabled: boolean;
      opacity: number;
    };
    gradient: {
      value: string;
    };
    pattern?: string;
    patternOpacity?: number;
  };

  // 🔄 後方互換性（非推奨、マイグレーション用）
  backgroundType?: 'color' | 'gradient' | 'image' | 'animated';
  backgroundImage?: string;
  backgroundBlur?: number;
  backgroundBlurEnabled?: boolean;
  backgroundOpacity?: number;
  backgroundGradient?: string;
  backgroundPattern?: string;
  backgroundPatternOpacity?: number;
}
```

**注意**: 既存のフラットフィールドをoptional（`?`付き）に変更

---

#### 2-2. Zodスキーマ更新

**ファイル編集**: `src/services/settings-manager/validation/settings.schema.ts`

`ui` オブジェクトに以下を追加：

```typescript
ui: z.object({
  // ... 既存フィールド（そのまま）

  // 🆕 Phase 3: 階層構造
  background: z.object({
    type: z.enum(['color', 'gradient', 'image', 'animated']),
    image: z.object({
      url: z.string(),
      blur: z.number().min(0).max(50),
      blurEnabled: z.boolean(),
      opacity: z.number().min(0).max(100),
    }),
    gradient: z.object({
      value: z.string(),
    }),
    pattern: z.string().optional(),
    patternOpacity: z.number().min(0).max(100).optional(),
  }),

  // 🔄 後方互換性（optional）
  backgroundType: z.enum(['color', 'gradient', 'image', 'animated']).optional(),
  backgroundImage: z.string().optional(),
  backgroundBlur: z.number().min(0).max(50).optional(),
  backgroundBlurEnabled: z.boolean().optional(),
  backgroundOpacity: z.number().min(0).max(100).optional(),
  backgroundGradient: z.string().optional(),
  backgroundPattern: z.string().optional(),
  backgroundPatternOpacity: z.number().min(0).max(100).optional(),
}),
```

---

#### 2-3. デフォルト値更新

**ファイル編集**: `src/services/settings-manager/defaults/settings.defaults.ts`

`ui` オブジェクトに以下を追加：

```typescript
export const DEFAULT_SETTINGS: UnifiedSettings = {
  // ... 他のカテゴリ

  ui: {
    // ... 既存フィールド（そのまま）

    // 🆕 Phase 3: 階層構造
    background: {
      type: 'gradient',
      image: {
        url: '',
        blur: 10,
        blurEnabled: false,
        opacity: 100,
      },
      gradient: {
        value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
    },
  },

  // ... 他のカテゴリ
};
```

**注意**: 古いフラットフィールド（`backgroundType`等）は削除

---

### Step 3: コンポーネント更新

#### 3-1. settings.slice.ts更新

**ファイル編集**: `src/store/slices/settings.slice.ts`

**① `updateAppearanceSettings` メソッド更新**（323行目付近）

既存の Background セクションを以下に置き換え：

```typescript
updateAppearanceSettings: (settings) => {
  const uiUpdates: any = {};

  // Typography（既存コードそのまま）
  if (settings.fontSize !== undefined) uiUpdates.fontSize = settings.fontSize;
  if (settings.fontWeight !== undefined) uiUpdates.fontWeight = settings.fontWeight;
  if (settings.fontFamily !== undefined) uiUpdates.fontFamily = settings.fontFamily;
  if (settings.lineHeight !== undefined) uiUpdates.lineHeight = settings.lineHeight;

  // Theme（既存コードそのまま）
  if (settings.theme !== undefined) {
    uiUpdates.theme =
      settings.theme === "dark" || settings.theme === "light"
        ? settings.theme
        : "auto";
  }

  // Layout（既存コードそのまま）
  if (settings.messageSpacing !== undefined) uiUpdates.messageSpacing = settings.messageSpacing;
  if (settings.messageBorderRadius !== undefined) uiUpdates.messageBorderRadius = settings.messageBorderRadius;
  if (settings.chatMaxWidth !== undefined) uiUpdates.chatMaxWidth = settings.chatMaxWidth;
  if (settings.sidebarWidth !== undefined) uiUpdates.sidebarWidth = settings.sidebarWidth;

  // Colors（既存コードそのまま）
  if (settings.primaryColor !== undefined) uiUpdates.primaryColor = settings.primaryColor;
  if (settings.accentColor !== undefined) uiUpdates.accentColor = settings.accentColor;
  if (settings.backgroundColor !== undefined) uiUpdates.backgroundColor = settings.backgroundColor;
  if (settings.surfaceColor !== undefined) uiUpdates.surfaceColor = settings.surfaceColor;
  if (settings.textColor !== undefined) uiUpdates.textColor = settings.textColor;
  if (settings.secondaryTextColor !== undefined) uiUpdates.secondaryTextColor = settings.secondaryTextColor;
  if (settings.borderColor !== undefined) uiUpdates.borderColor = settings.borderColor;
  if (settings.shadowColor !== undefined) uiUpdates.shadowColor = settings.shadowColor;

  // 🆕 Phase 3: Background（階層構造への変換）
  if (settings.backgroundType !== undefined) {
    if (!uiUpdates.background) uiUpdates.background = {};
    uiUpdates.background.type = settings.backgroundType;
  }
  if (settings.backgroundImage !== undefined) {
    if (!uiUpdates.background) uiUpdates.background = {};
    if (!uiUpdates.background.image) uiUpdates.background.image = {};
    uiUpdates.background.image.url = settings.backgroundImage;
  }
  if (settings.backgroundBlur !== undefined) {
    if (!uiUpdates.background) uiUpdates.background = {};
    if (!uiUpdates.background.image) uiUpdates.background.image = {};
    uiUpdates.background.image.blur = settings.backgroundBlur;
  }
  if (settings.backgroundBlurEnabled !== undefined) {
    if (!uiUpdates.background) uiUpdates.background = {};
    if (!uiUpdates.background.image) uiUpdates.background.image = {};
    uiUpdates.background.image.blurEnabled = settings.backgroundBlurEnabled;
  }
  if (settings.backgroundOpacity !== undefined) {
    if (!uiUpdates.background) uiUpdates.background = {};
    if (!uiUpdates.background.image) uiUpdates.background.image = {};
    uiUpdates.background.image.opacity = settings.backgroundOpacity;
  }
  if (settings.backgroundGradient !== undefined) {
    if (!uiUpdates.background) uiUpdates.background = {};
    if (!uiUpdates.background.gradient) uiUpdates.background.gradient = {};
    uiUpdates.background.gradient.value = settings.backgroundGradient;
  }

  // Effects（既存コードそのまま）
  if (settings.enableAnimations !== undefined) uiUpdates.enableAnimations = settings.enableAnimations;
  if (settings.transitionDuration !== undefined) uiUpdates.transitionDuration = settings.transitionDuration;

  // Favicon（既存コードそのまま）
  if (settings.faviconPath !== undefined) uiUpdates.faviconPath = settings.faviconPath;
  if (settings.faviconSvg !== undefined) uiUpdates.faviconSvg = settings.faviconSvg;
  if (settings.appleTouchIcon !== undefined) uiUpdates.appleTouchIcon = settings.appleTouchIcon;

  // Custom CSS（既存コードそのまま）
  if (settings.customCSS !== undefined) uiUpdates.customCSS = settings.customCSS;

  // 統一設定に保存
  if (Object.keys(uiUpdates).length > 0) {
    console.log("🎨 [updateAppearanceSettings] Updating UI via unified settings:", uiUpdates);
    settingsManager.updateCategory("ui", uiUpdates);
  }
},
```

**② `syncFromUnifiedSettings` メソッド更新**（660行目付近）

`appearanceSettings` オブジェクトの Background セクションを以下に置き換え：

```typescript
syncFromUnifiedSettings: () => {
  const unified = get().unifiedSettings;

  console.log("🔄 [syncFromUnifiedSettings] Syncing settings from unified settings:", {
    effectSettings: unified.effects,
    chatSettings: unified.chat,
    progressiveMode: unified.chat?.progressiveMode,
    uiSettings: unified.ui,
    prompts: unified.prompts,
  });

  set({
    effectSettings: unified.effects,
    systemPrompts: {
      system: unified.prompts?.system || "",
      jailbreak: unified.prompts?.jailbreak || "",
      replySuggestion: unified.prompts?.replySuggestion || "",
      textEnhancement: unified.prompts?.textEnhancement || "",
    },
    enableSystemPrompt: unified.prompts?.enableSystemPrompt ?? false,
    enableJailbreakPrompt: unified.prompts?.enableJailbreakPrompt ?? false,
    languageSettings: {
      language: unified.ui.language,
      timezone: "Asia/Tokyo",
      dateFormat: "YYYY/MM/DD",
      timeFormat: unified.ui.language === "ja" ? "24" : "12",
      currency: unified.ui.language === "ja" ? "JPY" : "USD",
    },
    appearanceSettings: {
      theme: unified.ui.theme === "auto" ? "dark" : unified.ui.theme,
      primaryColor: unified.ui.primaryColor,
      accentColor: unified.ui.accentColor,
      backgroundColor: unified.ui.backgroundColor,
      surfaceColor: unified.ui.surfaceColor,
      textColor: unified.ui.textColor,
      secondaryTextColor: unified.ui.secondaryTextColor,
      borderColor: unified.ui.borderColor,
      shadowColor: unified.ui.shadowColor,
      fontFamily: unified.ui.fontFamily,
      fontSize: unified.ui.fontSize,
      fontWeight: unified.ui.fontWeight,
      lineHeight: unified.ui.lineHeight,
      messageSpacing: unified.ui.messageSpacing,
      messageBorderRadius: unified.ui.messageBorderRadius,
      chatMaxWidth: unified.ui.chatMaxWidth,
      sidebarWidth: unified.ui.sidebarWidth,

      // 🆕 Phase 3: 階層構造からフラット構造への変換（後方互換性）
      backgroundType: unified.ui.background?.type || 'gradient',
      backgroundImage: unified.ui.background?.image?.url || '',
      backgroundBlur: unified.ui.background?.image?.blur || 10,
      backgroundBlurEnabled: unified.ui.background?.image?.blurEnabled ?? false,
      backgroundOpacity: unified.ui.background?.image?.opacity || 100,
      backgroundGradient: unified.ui.background?.gradient?.value || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',

      faviconPath: unified.ui.faviconPath || "/favicon.ico",
      faviconSvg: unified.ui.faviconSvg || "/favicon.svg",
      appleTouchIcon: unified.ui.appleTouchIcon || "/apple-touch-icon.png",
      enableAnimations: unified.ui.enableAnimations ?? true,
      transitionDuration: unified.ui.transitionDuration || "normal",
      customCSS: unified.ui.customCSS || "",
    },
    // ... 残りの設定（apiConfig, voice, imageGeneration, chat等）はそのまま
  });
},
```

**③ 初期化処理の更新**（132行目付近）

`appearanceSettings` の初期値も同様に更新：

```typescript
// 🔧 FIX: すべての外観設定を統一設定から読み込む
appearanceSettings: {
  theme:
    initialSettings.ui.theme === "auto" ? "dark" : initialSettings.ui.theme,
  // Colors
  primaryColor: initialSettings.ui.primaryColor,
  accentColor: initialSettings.ui.accentColor,
  backgroundColor: initialSettings.ui.backgroundColor,
  surfaceColor: initialSettings.ui.surfaceColor,
  textColor: initialSettings.ui.textColor,
  secondaryTextColor: initialSettings.ui.secondaryTextColor,
  borderColor: initialSettings.ui.borderColor,
  shadowColor: initialSettings.ui.shadowColor,
  // Typography
  fontFamily: initialSettings.ui.fontFamily,
  fontSize: initialSettings.ui.fontSize,
  fontWeight: initialSettings.ui.fontWeight,
  lineHeight: initialSettings.ui.lineHeight,
  // Layout
  messageSpacing: initialSettings.ui.messageSpacing,
  messageBorderRadius: initialSettings.ui.messageBorderRadius,
  chatMaxWidth: initialSettings.ui.chatMaxWidth,
  sidebarWidth: initialSettings.ui.sidebarWidth,

  // 🆕 Phase 3: 階層構造からフラット構造への変換
  backgroundType: initialSettings.ui.background?.type || "gradient",
  backgroundImage: initialSettings.ui.background?.image?.url || "",
  backgroundBlur: initialSettings.ui.background?.image?.blur || 10,
  backgroundBlurEnabled: initialSettings.ui.background?.image?.blurEnabled ?? false,
  backgroundOpacity: initialSettings.ui.background?.image?.opacity || 100,
  backgroundGradient: initialSettings.ui.background?.gradient?.value || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",

  // Favicon
  faviconPath: initialSettings.ui.faviconPath || "/favicon.ico",
  faviconSvg: initialSettings.ui.faviconSvg || "/favicon.svg",
  appleTouchIcon: initialSettings.ui.appleTouchIcon || "/apple-touch-icon.png",
  // Effects
  enableAnimations: initialSettings.ui.enableAnimations ?? true,
  transitionDuration: initialSettings.ui.transitionDuration || "normal",
  // Custom CSS
  customCSS: initialSettings.ui.customCSS || "",
},
```

---

#### 3-2. AppearanceProvider.tsx更新

**ファイル編集**: `src/components/providers/AppearanceProvider.tsx`

背景関連の変数定義を更新（200行目付近）:

```typescript
// 🆕 Phase 3: 階層構造から読み取り（フォールバック付き）
const backgroundType = appearanceSettings.background?.type || appearanceSettings.backgroundType || 'gradient';
const backgroundImage = appearanceSettings.background?.image?.url || appearanceSettings.backgroundImage || '';
const backgroundBlur = appearanceSettings.background?.image?.blur ?? appearanceSettings.backgroundBlur ?? 10;
const backgroundBlurEnabled = appearanceSettings.background?.image?.blurEnabled ?? appearanceSettings.backgroundBlurEnabled ?? false;
const backgroundOpacity = appearanceSettings.background?.image?.opacity ?? appearanceSettings.backgroundOpacity ?? 100;
const backgroundGradient = appearanceSettings.background?.gradient?.value || appearanceSettings.backgroundGradient || '';
```

これらの変数を使用している既存のuseEffectはそのまま動作します。

---

#### 3-3. AppearancePanel.tsx更新

**ファイル編集**: `src/components/settings/SettingsModal/panels/AppearancePanel.tsx`

コンポーネント内で背景設定を参照している箇所を更新（470行目付近）:

```typescript
// 🆕 Phase 3: 階層構造対応（フォールバック付き）
const backgroundImage = appearanceSettings.background?.image?.url || appearanceSettings.backgroundImage || '';
const backgroundBlur = appearanceSettings.background?.image?.blur ?? appearanceSettings.backgroundBlur ?? 10;
const backgroundBlurEnabled = appearanceSettings.background?.image?.blurEnabled ?? appearanceSettings.backgroundBlurEnabled ?? false;
const backgroundOpacity = appearanceSettings.background?.image?.opacity ?? appearanceSettings.backgroundOpacity ?? 100;
const backgroundGradient = appearanceSettings.background?.gradient?.value || appearanceSettings.backgroundGradient || '';
const backgroundType = appearanceSettings.background?.type || appearanceSettings.backgroundType || 'gradient';
```

**注意**: これらの変数をコンポーネント関数の先頭で定義し、UIレンダリングで使用します。

---

## ✅ 実装完了チェックリスト

### マイグレーション
- [ ] `BackgroundMigrationStrategy` 作成完了
- [ ] `ReverseBackgroundMigrationStrategy` 作成完了
- [ ] strategies/index.ts にエクスポート追加
- [ ] settings-migrator.ts に登録（import追加も含む）

### 型定義
- [ ] ui.types.ts 更新（階層構造 + 後方互換性）
- [ ] settings.schema.ts 更新（Zod検証）
- [ ] settings.defaults.ts 更新（デフォルト値）

### コンポーネント
- [ ] settings.slice.ts 更新（3箇所: updateAppearanceSettings, syncFromUnifiedSettings, 初期化）
- [ ] AppearanceProvider.tsx 更新（階層構造対応）
- [ ] AppearancePanel.tsx 更新（階層構造対応）

### テスト
- [ ] ビルド成功確認（`npm run build`）
- [ ] 型チェック成功（`npx tsc --noEmit`）
- [ ] 既存設定の保持確認（ページリロード後）
- [ ] 4種類の背景タイプすべてで動作確認
  - [ ] solid（単色）
  - [ ] gradient（グラデーション）
  - [ ] image（画像）
  - [ ] animated（アニメーション）
- [ ] 画像背景ぼかし効果の動作確認
- [ ] 吹き出しぼかし効果の独立制御確認

---

## 🚨 注意事項

1. **マイグレーション最優先**: Step 1を完全に実装してからStep 2以降に進む
2. **後方互換性維持**: フラット構造のフィールドを optional として残す
3. **段階的テスト**: 各Stepごとにビルド・型チェックを実行
4. **既存データ保護**: 既存ユーザーの設定が失われないこと確認
5. **フォールバック**: 階層構造が優先、なければフラット構造から読み取り

---

## 🔄 ロールバック手順

もし問題が発生した場合：

### コードレベルのロールバック

```bash
git log --oneline  # コミットハッシュ確認
git revert <commit-hash>  # Phase 3コミットを取り消し
```

### データレベルのロールバック

`ReverseBackgroundMigrationStrategy`を一時的に優先実行：

**ファイル編集**: `src/services/settings-manager/migration/settings-migrator.ts`

```typescript
private readonly strategies: MigrationStrategy[] = [
  new ReverseBackgroundMigrationStrategy(), // 🆘 ロールバック用に最優先
  new ThreeDMigrationStrategy(),
  new EmotionMigrationStrategy(),
  new LocalStorageMigrationStrategy(),
  new ZustandMigrationStrategy(),
];
```

インポート文も修正：

```typescript
import {
  ThreeDMigrationStrategy,
  EmotionMigrationStrategy,
  ReverseBackgroundMigrationStrategy, // 🆘 追加
  LocalStorageMigrationStrategy,
  ZustandMigrationStrategy,
  type MigrationStrategy,
} from './strategies';
```

ユーザーがアプリを開くと自動的にフラット構造に戻ります。

ロールバック完了後は、この変更をrevertして元の順序に戻してください。

---

## 📊 実装スケジュール目安

| Step | 内容 | 所要時間 |
|------|------|---------|
| Step 1 | マイグレーション戦略作成 | 2-3時間 |
| Step 2 | 型定義更新 | 1-2時間 |
| Step 3 | コンポーネント更新 | 3-4時間 |
| テスト | 包括的動作確認 | 2-3時間 |
| **合計** | | **8-12時間** |

---

## 🎯 成功基準

Phase 3実装が成功したと判断する基準：

1. ✅ ビルドエラーなし（`npm run build`成功）
2. ✅ 型エラーなし（`npx tsc --noEmit`成功）
3. ✅ 既存ユーザーの設定が保持される（マイグレーション成功）
4. ✅ 4種類の背景すべてが正常動作
5. ✅ 画像背景ぼかしと吹き出しぼかしが独立制御できる
6. ✅ ページリロード後も設定が永続化される

---

## 📝 実装後の確認事項

実装完了後、以下を確認してください：

1. **LocalStorageの確認**
   - ブラウザのDevToolsでLocalStorageを開く
   - `settings-storage` キーの内容を確認
   - `ui.background` が階層構造になっていることを確認

2. **マイグレーションログの確認**
   - コンソールに `[BackgroundMigration] Migrated to hierarchical structure` が表示されることを確認

3. **後方互換性の確認**
   - 古い設定を持つユーザー（フラット構造）でも正常動作することを確認
   - マイグレーション後、設定パネルで変更→保存→リロードで維持されることを確認

---

**以上の指示に従ってPhase 3を実装してください。各Stepを順番に進め、チェックリストを確認しながら慎重に作業してください。**

**質問や不明点があれば、いつでも確認してください。段階的に進めることが成功の鍵です。**
