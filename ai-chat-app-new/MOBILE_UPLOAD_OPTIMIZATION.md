# モバイルアップロード最適化設定

## 概要
このドキュメントは、AI Chat V3アプリケーションのモバイル環境でのアイコンと背景画像アップロード機能の最適化について説明します。

## 実装された改善点

### 1. タッチ操作の最適化
- **タッチイベント対応**: `onTouchStart`、`onTouchEnd`イベントを追加
- **視覚的フィードバック**: タッチ時の色変化とスケール効果
- **タッチ遅延対策**: モバイル環境でのファイル選択時の遅延処理

### 2. UI/UX改善
- **レスポンシブテキスト**: モバイルとデスクトップで異なる説明文を表示
- **最小タップサイズ**: 44px以上のタップ領域を確保
- **タッチマニピュレーション**: `touch-manipulation`クラスでタッチ操作を最適化

### 3. ファイル選択の改善
- **ファイル入力リセット**: 同じファイルを再度選択可能
- **モバイル専用処理**: タッチデバイス検出と専用処理
- **エラーハンドリング**: モバイル環境でのエラー表示改善

## 対象コンポーネント

### 1. ImageUploader (`src/components/ui/image-uploader.tsx`)
- 画像・動画アップロード用の汎用コンポーネント
- ドラッグ&ドロップとクリック/タップの両方に対応

### 2. AvatarUploadWidget (`src/components/ui/AvatarUploadWidget.tsx`)
- アバター画像専用のアップロードコンポーネント
- 円形表示とサイズ設定に対応

### 3. AppearancePanel (`src/components/character/AppearancePanel.tsx`)
- キャラクターの背景画像設定
- 外見設定パネル内のアップロード機能

### 4. MessageInput (`src/components/chat/MessageInput.tsx`)
- チャットメッセージでの画像添付機能
- アクションメニューからの画像アップロード

## CSS最適化

### モバイル専用クラス
```css
.mobile-upload-optimized {
  touch-action: manipulation;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  min-height: 44px;
  min-width: 44px;
}

.mobile-file-input {
  position: relative;
  overflow: hidden;
  touch-action: manipulation;
  -webkit-touch-callout: none;
  transition: all 0.2s ease-in-out;
}

.mobile-file-input:active {
  transform: scale(0.98);
  background-color: rgba(59, 130, 246, 0.1);
}
```

## Next.js設定

### 画像最適化
```typescript
images: {
  formats: ['image/webp', 'image/avif'],
  minimumCacheTTL: 31536000,
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  loader: 'default',
  unoptimized: false,
}
```

### モバイル対応ヘッダー
```typescript
{
  key: 'X-Viewport-Meta',
  value: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
}
```

## テスト項目

### モバイル環境でのテスト
1. **タッチ操作**: ファイル選択エリアのタップ反応
2. **視覚的フィードバック**: タッチ時の色変化とスケール効果
3. **ファイル選択**: カメラロールからの画像選択
4. **アップロード処理**: ネットワーク接続でのアップロード
5. **エラーハンドリング**: ネットワークエラー時の表示

### デスクトップ環境でのテスト
1. **ドラッグ&ドロップ**: ファイルのドラッグ&ドロップ機能
2. **クリック操作**: ファイル選択ダイアログの表示
3. **レスポンシブ表示**: 画面サイズに応じた表示切り替え

## 永続化設定

### 1. Next.js設定 (`next.config.ts`)
- 画像最適化設定
- モバイル対応ヘッダー
- パフォーマンス最適化

### 2. CSS設定 (`src/app/globals.css`)
- モバイル専用クラス
- タッチ操作最適化
- レスポンシブデザイン

### 3. コンポーネント設定
- 各アップロードコンポーネントのモバイル対応
- タッチイベント処理
- エラーハンドリング

## 今後の改善点

1. **プログレッシブWebアプリ（PWA）対応**
2. **オフライン機能の追加**
3. **画像圧縮機能の実装**
4. **バッチアップロード機能**
5. **アップロード進捗の詳細表示**

## 注意事項

- モバイル環境ではファイルサイズ制限（50MB）が適用されます
- サポートされるファイル形式: PNG, JPG, GIF, WebP, AVIF, MP4, WebM
- タッチ操作は44px以上の領域で確実に動作します
- iOS Safariでの特殊な動作に注意が必要です

## 更新履歴

- 2025-01-27: 初回実装
  - モバイル対応のタッチ操作最適化
  - レスポンシブUI改善
  - ファイル選択機能の改善
  - CSS最適化とNext.js設定更新
