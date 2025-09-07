# 📁 AI Chat V3 プロジェクト構造分析

**最終更新**: 2025年9月7日  
**分析対象**: C:\ai-chat-v3\ai-chat-app-new

---

## 🏗️ 実際のディレクトリ構造

### 📂 src/ 全体構造

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (Next.js 15対応)
│   │   ├── characters/           # キャラクター管理 API
│   │   │   └── route.ts
│   │   ├── chat/generate/        # チャット生成 API  
│   │   │   └── route.ts
│   │   ├── embeddings/           # ベクトル検索 API
│   │   │   ├── route.ts
│   │   │   └── batch/route.ts
│   │   ├── health/               # ヘルスチェック API
│   │   │   └── route.ts  
│   │   ├── history/              # 履歴管理 API
│   │   │   └── route.ts
│   │   ├── personas/             # ペルソナ管理 API
│   │   │   └── route.ts
│   │   ├── upload/image/         # 画像アップロード API
│   │   │   └── route.ts
│   │   └── voice/                # 音声合成 API群
│   │       ├── elevenlabs/route.ts
│   │       ├── test/route.ts
│   │       └── voicevox/
│   │           ├── route.ts
│   │           ├── check/route.ts
│   │           └── speakers/route.ts
│   ├── test/                     # テストページ
│   │   └── page.tsx
│   ├── globals.css               # グローバルスタイル
│   ├── layout.tsx                # ルートレイアウト
│   ├── page.tsx                  # ホームページ
│   └── favicon.ico
├── components/                   # React コンポーネント
│   ├── character/                # キャラクター関連UI
│   │   ├── AppearancePanel.tsx
│   │   ├── BasicInfoPanel.tsx
│   │   ├── CharacterCard.tsx
│   │   ├── CharacterForm.tsx
│   │   ├── CharacterGallery.tsx
│   │   ├── CharacterGalleryModal.tsx
│   │   ├── PersonalityPanel.tsx
│   │   └── TrackersPanel.tsx
│   ├── chat/                     # チャット関連UI（最重要）
│   │   ├── ChatInterface.tsx     # メインチャット画面
│   │   ├── GroupChatInterface.tsx # グループチャット
│   │   ├── ChatHeader.tsx        # チャットヘッダー
│   │   ├── ChatSidebar.tsx       # サイドバー
│   │   ├── MessageBubble.tsx     # メッセージ表示
│   │   ├── MessageInput.tsx      # メッセージ入力
│   │   ├── ProgressiveMessageBubble.tsx # プログレッシブ表示
│   │   ├── RichMessage.tsx       # リッチメッセージ
│   │   ├── MarkdownRenderer.tsx  # マークダウン描画
│   │   ├── MessageEffects.tsx    # メッセージエフェクト
│   │   ├── AdvancedEffects.tsx   # 高度エフェクト
│   │   ├── CharacterReselectionModal.tsx
│   │   ├── ScenarioSelector.tsx
│   │   ├── ScenarioSetupModal.tsx
│   │   ├── SuggestionModal.tsx
│   │   ├── EnhancementModal.tsx
│   │   └── ReplySuggestions.tsx
│   ├── emotion/                  # 感情分析UI
│   │   ├── EmotionDisplay.tsx
│   │   └── SoloEmotionalEffects.tsx
│   ├── history/                  # 履歴管理UI
│   │   ├── ChatHistoryModal.tsx
│   │   └── HistorySearch.tsx
│   ├── memory/                   # メモリー管理UI
│   │   ├── MemoryCard.tsx
│   │   ├── MemoryGallery.tsx
│   │   └── MemoryLayerDisplay.tsx
│   ├── persona/                  # ペルソナ管理UI
│   │   ├── PersonaCard.tsx
│   │   ├── PersonaDetailModal.tsx
│   │   └── PersonaGalleryModal.tsx
│   ├── settings/                 # 設定UI
│   │   └── SettingsModal.tsx     # 統合設定モーダル（重要）
│   ├── tracker/                  # トラッカーUI
│   │   ├── TrackerCard.tsx
│   │   └── TrackerDisplay.tsx
│   ├── voice/                    # 音声機能UI
│   │   └── VoiceCallInterface.tsx
│   ├── optimized/                # 最適化コンポーネント
│   │   └── OptimizedImports.ts
│   ├── lazy/                     # 遅延ローディング
│   │   ├── LazyComponents.tsx
│   │   └── LazyEffects.tsx
│   ├── providers/                # Reactプロバイダー
│   │   └── ClientOnlyProvider.tsx
│   ├── utils/                    # ユーティリティコンポーネント
│   │   ├── ClientOnly.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── StorageInitializer.tsx
│   ├── ui/                       # 基本UIコンポーネント
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── image-uploader.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── sonner.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   └── StorageMonitor.tsx
│   ├── AppInitializer.tsx        # アプリケーション初期化
│   ├── ClientOnlyProvider.tsx
│   └── ErrorBoundary.tsx
├── constants/                    # 定数定義
├── contexts/                     # Reactコンテキスト
│   └── EffectSettingsContext.tsx
├── hooks/                        # カスタムフック
│   ├── useAudioPlayback.ts
│   ├── useKeyboard.ts
│   ├── useLanguage.ts
│   └── useVH.ts
├── lib/                          # ライブラリ
│   └── utils.ts                  # クラス名ユーティリティ等
├── services/                     # ビジネスロジック（重要層）
│   ├── api/                      # API クライアント
│   │   ├── gemini-client.ts      # Gemini API クライアント
│   │   └── index.ts
│   ├── emotion/                  # 感情分析
│   │   ├── AdaptivePerformanceManager.ts
│   │   ├── BaseEmotionAnalyzer.ts
│   │   ├── EmotionAnalyzer.ts
│   │   └── SoloEmotionAnalyzer.ts
│   ├── memory/                   # メモリーシステム
│   │   ├── auto-memory-manager.ts
│   │   ├── dynamic-summarizer.ts
│   │   └── vector-store.ts
│   ├── tracker/                  # トラッカーシステム
│   │   └── tracker-manager.ts
│   ├── api-request-queue.ts      # API リクエストキュー
│   ├── inspiration-service.ts    # インスピレーション生成
│   ├── message-transition.service.ts
│   ├── progressive-prompt-builder.service.ts
│   ├── prompt-builder.service.ts # プロンプト構築（重要）
│   ├── prompt-templates.ts
│   ├── scenario-generator.ts
│   └── simple-api-manager-v2.ts  # API管理（重要）
├── store/                        # Zustand 状態管理（アーキテクチャ中核）
│   ├── slices/                   # 状態スライス
│   │   ├── character.slice.ts    # キャラクター状態
│   │   ├── chat.slice.ts         # チャット状態（最重要）
│   │   ├── groupChat.slice.ts    # グループチャット状態
│   │   ├── history.slice.ts      # 履歴状態
│   │   ├── memory.slice.ts       # メモリー状態
│   │   ├── persona.slice.ts      # ペルソナ状態
│   │   ├── settings.slice.ts     # 設定状態（重要）
│   │   ├── suggestion.slice.ts   # 提案状態
│   │   ├── tracker.slice.ts      # トラッカー状態
│   │   └── ui.slice.ts          # UI状態
│   └── index.ts                  # ストア統合
├── styles/                       # スタイルファイル
├── test/                         # テストファイル
├── types/                        # TypeScript型定義（重要層）
│   ├── core/                     # コア型定義
│   │   ├── base.types.ts         # 基本型
│   │   ├── character.types.ts    # キャラクター型
│   │   ├── context.types.ts      # コンテキスト型
│   │   ├── emotional-intelligence.types.ts
│   │   ├── expression.types.ts   # 表現型
│   │   ├── group-chat.types.ts   # グループチャット型
│   │   ├── memory.types.ts       # メモリー型
│   │   ├── message.types.ts      # メッセージ型（統合）
│   │   ├── persona.types.ts      # ペルソナ型
│   │   ├── session.types.ts      # セッション型
│   │   ├── settings.types.ts     # 設定型
│   │   └── tracker.types.ts      # トラッカー型
│   ├── api/                      # API型定義
│   │   ├── errors.ts
│   │   └── index.ts
│   ├── ui/                       # UI型定義
│   │   ├── components.types.ts
│   │   ├── modals.types.ts
│   │   └── index.ts
│   ├── websocket/                # WebSocket型定義
│   │   └── audio.types.ts
│   ├── index.ts                  # 型エクスポート統合
│   ├── memory.ts                 # 個別メモリー型
│   └── progressive-message.types.ts
└── utils/                        # ユーティリティ関数
    ├── prompt-validator.ts
    ├── storage-analyzer.ts
    ├── storage-cleaner.ts
    ├── storage-manager.ts
    ├── text-formatter.ts
    └── uuid.ts
```

---

## 🔧 型定義システムの詳細

### 📁 src/types/ 構造

#### 中核型定義 (src/types/core/)

**基本エンティティ型**
- `base.types.ts` - UUID, BaseEntity, SoftDeletable等の基本型
- `message.types.ts` - UnifiedMessage（統合メッセージ型）
- `session.types.ts` - UnifiedChatSession（統合セッション型）

**機能別型定義**
- `character.types.ts` - Character, NSFWProfile, PersonalityTrait等
- `persona.types.ts` - Persona, PersonaInput等  
- `settings.types.ts` - APIConfig, VoiceSettings, ChatSettings等
- `tracker.types.ts` - TrackerDefinition, TrackerSet等
- `memory.types.ts` - MemoryCard, MemoryLayer等

**特殊機能型**
- `group-chat.types.ts` - グループチャット専用型
- `emotional-intelligence.types.ts` - 感情分析システム型
- `progressive-message.types.ts` - プログレッシブメッセージ型

#### 型エクスポート戦略

```typescript
// src/types/index.ts - 統一エクスポート
export * from './core/base.types';
export * from './core/character.types';
export * from './core/settings.types';
// ... 重複エクスポートを避けた個別エクスポート
export type { UnifiedMessage, MessageRole } from './core/message.types';
```

---

## 🏛️ Zustand状態管理アーキテクチャ

### 📂 src/store/ 構造詳細

#### ストアスライス構成

**主要スライス**
1. `chat.slice.ts` - **中核スライス** (1,472行)
   - セッション管理、メッセージ送受信
   - プログレッシブメッセージ対応
   - 感情分析統合、トラッカー連携

2. `settings.slice.ts` - 設定管理 (17,780バイト)
   - API設定、プロンプト設定
   - 音声、エフェクト設定
   - 永続化対応

3. `groupChat.slice.ts` - グループチャット (48,060バイト)
   - マルチキャラクター会話
   - キャラクター選択、ローテーション

**補助スライス**
- `character.slice.ts` - キャラクター管理
- `persona.slice.ts` - ペルソナ管理  
- `memory.slice.ts` - メモリーカード管理
- `tracker.slice.ts` - トラッカー状態管理
- `ui.slice.ts` - UI状態（サイドバー等）

#### ストア統合パターン

```typescript
// src/store/index.ts
export type AppStore = ChatSlice & GroupChatSlice & CharacterSlice & 
  PersonaSlice & MemorySlice & TrackerSlice & HistorySlice & 
  SettingsSlice & SuggestionSlice & UISlice & {
  apiManager: SimpleAPIManagerV2;
  promptBuilderService: PromptBuilderService;
};
```

#### 永続化戦略

**partialize設定**で選択的永続化:
- ✅ 永続化: セッション、設定、キャラクター、メモリー
- ❌ 除外: UI状態（ハイドレーション問題回避）

**Map型の永続化**:
```typescript
replacer: (key, value) => {
  if (value instanceof Map) {
    return { _type: 'map', value: Array.from(value.entries()) };
  }
  return value;
}
```

---

## 🔌 サービス層アーキテクチャ

### 📂 src/services/ 詳細

#### API管理
- `simple-api-manager-v2.ts` - **統一API管理**
  - Gemini/OpenRouter統合
  - フォールバック機能なし（明確エラー表示）
  - 設計方針: シンプル、デバッグ容易

#### プロンプト管理
- `prompt-builder.service.ts` - プロンプト構築サービス
- `progressive-prompt-builder.service.ts` - 段階的プロンプト構築
- `prompt-templates.ts` - テンプレート定義

#### 感情・分析システム
- `emotion/SoloEmotionAnalyzer.ts` - ソロチャット感情分析
- `emotion/BaseEmotionAnalyzer.ts` - 基本感情分析
- `emotion/AdaptivePerformanceManager.ts` - 性能管理

#### メモリーシステム
- `memory/auto-memory-manager.ts` - 自動メモリー管理
- `memory/vector-store.ts` - ベクトル検索
- `memory/dynamic-summarizer.ts` - 動的要約

---

## 🎨 コンポーネント階層

### 📂 src/components/ 機能分類

#### レイアウト・基盤コンポーネント
```
ChatInterface.tsx (1,700+ lines) - メインレイアウト
├── ChatHeader.tsx - ヘッダー
├── ChatSidebar.tsx - サイドバー
├── MessageBubble.tsx - メッセージ表示
├── MessageInput.tsx - 入力欄
└── GroupChatInterface.tsx - グループチャット
```

#### モーダル・設定系
```
SettingsModal.tsx - 統合設定（7タブ構成）
├── Effects設定
├── 3D設定  
├── Emotion設定
├── Tracker設定
├── Performance設定
├── Chat設定
└── Voice設定

CharacterGalleryModal.tsx - キャラクター選択
PersonaGalleryModal.tsx - ペルソナ選択
```

#### 特殊機能コンポーネント
- `ProgressiveMessageBubble.tsx` - 段階的メッセージ表示
- `RichMessage.tsx` - リッチテキスト表示
- `AdvancedEffects.tsx` - 高度視覚効果

---

## 🚨 型安全開発フロー

### 重要ファイル更新順序

1. **型定義更新**: `src/types/core/*.types.ts`
2. **型検証**: `npx tsc --noEmit`
3. **ストア更新**: `src/store/slices/*.ts`  
4. **サービス更新**: `src/services/*.ts`
5. **コンポーネント更新**: `src/components/**/*.tsx`
6. **最終検証**: `npm run build`

### 型安全ルール

- ✅ **型ファースト**: 新プロパティ使用前に型定義追加
- ❌ **unknown型禁止**: 適切な型アサーション使用
- ✅ **継続検証**: TypeScriptエラーを放置しない
- ✅ **原子的変更**: 1機能 = 1型更新 + 1実装

---

## 📊 プロジェクト統計

- **総ファイル数**: 200+
- **TypeScript率**: 95%+
- **主要ファイルサイズ**:
  - `chat.slice.ts`: 58KB (1,472行)
  - `groupChat.slice.ts`: 48KB
  - `settings.slice.ts`: 17KB
  - `simple-api-manager-v2.ts`: 21KB
  - `ChatInterface.tsx`: 推定50KB+

- **型定義ファイル数**: 20+
- **コアスライス数**: 10
- **APIエンドポイント数**: 15+

---

## 🔍 開発時の注意点

### 既存の問題点

1. **TypeScriptエラー**: 複数のモジュール未見つけエラー
2. **型不整合**: ProgressiveMessage、TrackerManager等
3. **依存関係**: react-markdown, remark-gfm未インストール

### 推奨作業順序

1. **依存関係解決**: 不足パッケージインストール
2. **型エラー修正**: 順次型整合性確保
3. **ビルド確認**: エラーフリー状態維持
4. **機能追加**: 型安全フロー遵守

---

**このドキュメントは開発ガイドの構造セクションとして統合予定**