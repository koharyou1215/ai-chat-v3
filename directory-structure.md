# Directory Structure

プロジェクトの主要なディレクトリとファイルの役割についてのドキュメントです。

## `ai-chat-app-new/`

プロジェクトのルートディレクトリ。

### `public/`

画像やキャラクターデータなど、静的に配信されるファイルを格納します。

*   `public/characters/`: キャラクター定義のJSONファイルを格納します。
*   `public/personas/`: ペルソナ定義のJSONファイルを格納します。

### `src/`

アプリケーションの主要なソースコードを格納します。

#### `src/app/`

Next.jsのApp Routerに対応するディレクトリ。ページのルーティングやAPIエンドポイントを定義します。

*   `src/app/page.tsx`: アプリケーションのメインページ。
*   `src/app/layout.tsx`: 全ページに適用される共通レイアウト。
*   `src/app/api/`: APIルートを格納します。
    *   `voice/`: 音声合成関連のAPI。
    *   `characters/`: キャラクターリストを取得するAPI。
    *   `image/` (将来追加予定): 画像生成関連のAPI。

#### `src/components/`

再利用可能なReactコンポーネントを機能ごとに分類して格納します。

*   `src/components/chat/`: チャットUI関連 (`ChatInterface.tsx`, `MessageInput.tsx`)
*   `src/components/character/`: キャラクター関連 (`CharacterCard.tsx`, `CharacterGallery.tsx`)
*   `src/components/settings/`: 設定モーダル (`SettingsModal.tsx`)
*   `src/components/inspiration/` (将来追加予定): 返信提案や文章強化など、AIによる補助機能のUI。

#### `src/services/`

APIクライアントやビジネスロジックなど、UIから分離された純粋なロジックを格納します。

*   `src/services/api/`: 外部API（Gemini, OpenRouterなど）との通信を行うクライアント。
*   `src/services/memory/`: 記憶管理システム (`conversation-manager.ts`)
*   `src/services/inspiration/` (将来追加予定): 返信提案などのロジック。
*   `src/services/prompt-builder.service.ts`: `ConversationManager`等を利用して、AIに送信する最終的なプロンプトを構築する。

#### `src/store/`

Zustandを使用した状態管理のロジックを格納します。

*   `src/store/slices/`: 機能ごとに分割された状態管理の単位（スライス）。
    *   `chat.slice.ts`: チャットセッションの状態を管理。
    *   `character.slice.ts`: キャラクターデータの状態を管理。

#### `src/types/`

アプリケーション全体で使用されるTypeScriptの型定義を格納します。

*   `src/types/core/`: 中核となるデータ構造の型定義 (`character.types.ts`, `session.types.ts`)

#### `src/hooks/` (空のディレクトリ)

カスタムフック（`useWindowSize`など）を格納するディレクトリ。現在は空です。

#### `src/lib/`

ヘルパー関数やユーティリティなど、汎用的なコードを格納します。

*   `src/lib/utils.ts`: `cn`関数など。
