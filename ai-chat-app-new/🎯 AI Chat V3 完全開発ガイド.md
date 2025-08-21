#🎯 AI Chat V3 完全開発ガイド

  📋 目次

  1. #プロジェクト概要
  2. #アーキテクチャ設計
  3. #ディレクトリ構造
  4. #型定義システム
  5. #主要コンポーネント
  6. #状態管理zustand
  7. #api設計
  8. #メモリシステム
  9. #トラッカーシステム
  10. #開発フロー
  11. #デバッグガイド
  12. #デプロイメント

  ---
  📊 プロジェクト概要

  技術スタック

  Frontend: Next.js 15.4.6 + TypeScript + Tailwind CSS
  State: Zustand (スライス分割アーキテクチャ)
  Animation: Framer Motion
  UI: Radix UI + Lucide React Icons
  API: Gemini AI + OpenRouter + VoiceVox + ElevenLabs
  Deployment: Vercel

  主要機能

  - AIチャット: Gemini/OpenRouter/Claude対応
  - キャラクターシステム: カスタムペルソナ機能
  - メモリ管理: 5層階層メモリシステム
  - トラッカーシステム: リアルタイム状態追跡
  - 音声合成: VoiceVox/ElevenLabs対応
  - エフェクト: リアルタイム感情分析・視覚効果

  ---
  🏗️ アーキテクチャ設計

  全体アーキテクチャ

  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
  │   Presentation  │    │    Business     │    │      Data       │
  │   (Components)  │◄──►│    (Services)   │◄──►│   (API/Store)   │
  └─────────────────┘    └─────────────────┘    └─────────────────┘
           │                       │                       │
      ┌────┴────┐            ┌─────┴─────┐          ┌──────┴──────┐
      │UI Layer │            │Logic Layer│          │Storage Layer│
      └─────────┘            └───────────┘          └─────────────┘

  データフロー

  User Input → Component → Zustand Store → Service Layer → API → Response
      ↑                                                              ↓
      └──────────────── UI Update ← State Update ←──────────────────┘

  ---
  📁 ディレクトリ構造

  src/
  ├── app/                      # Next.js App Router
  │   ├── api/                 # API Routes
  │   │   ├── characters/      # キャラクター管理API
  │   │   ├── personas/        # ペルソナ管理API
  │   │   ├── upload/          # ファイルアップロードAPI
  │   │   └── voice/           # 音声合成API
  │   ├── globals.css          # グローバルスタイル
  │   ├── layout.tsx           # ルートレイアウト
  │   └── page.tsx            # ホームページ
  ├── components/              # UIコンポーネント
  │   ├── chat/               # チャット関連UI
  │   │   ├── ChatInterface.tsx
  │   │   ├── MessageBubble.tsx
  │   │   ├── MessageInput.tsx
  │   │   ├── RichMessage.tsx
  │   │   └── AdvancedEffects.tsx
  │   ├── character/          # キャラクター管理UI
  │   ├── settings/           # 設定UI
  │   ├── tracker/            # トラッカーUI
  │   ├── memory/             # メモリ管理UI
  │   └── ui/                 # 共通UIコンポーネント
  ├── contexts/               # React Context
  │   └── EffectSettingsContext.tsx
  ├── services/               # ビジネスロジック
  │   ├── api/                # API関連サービス
  │   │   ├── gemini-client.ts
  │   │   ├── openrouter-client.ts (削除済み)
  │   │   └── vector-search.ts
  │   ├── memory/             # メモリシステム
  │   │   ├── conversation-manager.ts
  │   │   ├── dynamic-summarizer.ts
  │   │   ├── memory-layer-manager.ts
  │   │   └── vector-store.ts
  │   ├── tracker/            # トラッカーシステム
  │   │   └── tracker-manager.ts
  │   ├── api-manager.ts      # 統合APIマネージャー
  │   ├── inspiration-service.ts # 提案生成サービス
  │   └── prompt-builder.service.ts
  ├── store/                  # Zustand状態管理
  │   ├── slices/             # 状態スライス
  │   │   ├── chat.slice.ts
  │   │   ├── character.slice.ts
  │   │   ├── memory.slice.ts
  │   │   ├── settings.slice.ts
  │   │   ├── suggestion.slice.ts
  │   │   └── tracker.slice.ts
  │   └── index.ts            # ストア統合
  ├── types/                  # TypeScript型定義
  │   ├── core/               # コア型定義
  │   │   ├── base.types.ts
  │   │   ├── message.types.ts (統一済み)
  │   │   ├── character.types.ts
  │   │   ├── memory.types.ts
  │   │   ├── session.types.ts
  │   │   ├── tracker.types.ts
  │   │   └── settings.types.ts
  │   ├── api/                # API型定義
  │   │   ├── requests.types.ts
  │   │   └── responses.types.ts
  │   ├── ui/                 # UI型定義
  │   └── index.ts            # 型エクスポート統合
  ├── lib/                    # ユーティリティ
  │   └── utils.ts
  └── hooks/                  # カスタムフック

  ---
  🔧 型定義システム

  統一メッセージ型（2024年8月リファクタリング済み）

  // src/types/core/message.types.ts
  export interface UnifiedMessage extends BaseEntity, SoftDeletable, WithMetadata {
    // 基本情報
    session_id: UUID;
    role: MessageRole;
    content: string;
    image_url?: string;

    // キャラクター関連
    character_id?: UUID;
    character_name?: string;
    character_avatar?: string;

    // メモリ関連
    memory: {
      importance: MemoryImportance;
      is_pinned: boolean;
      is_bookmarked: boolean;
      keywords: string[];
      summary?: string;
    };

    // 表現関連
    expression: {
      emotion: EmotionState;
      style: MessageStyle;
      effects: VisualEffect[];
    };

    // 編集履歴
    edit_history: MessageEditEntry[];
    regeneration_count: number;
  }

  基本エンティティ型

  // src/types/core/base.types.ts
  export interface BaseEntity {
    id: UUID;
    created_at: Timestamp;
    updated_at: Timestamp;
    version: number;
  }

  export interface SoftDeletable {
    is_deleted: boolean;
  }

  export interface WithMetadata<T = Record<string, unknown>> {
    metadata: T;
  }

  キャラクター型

  // src/types/core/character.types.ts
  export interface UnifiedCharacter extends BaseEntity, WithMetadata {
    name: string;
    age: string;
    occupation: string;
    personality: string;
    external_personality: string;
    internal_personality: string;
    speaking_style: string;
    background: string;
    scenario: string;
    first_message: string;
    avatar_url?: string;
    trackers: TrackerDefinition[];
    nsfw_profile?: NSFWProfile;
  }

  ---
  🧩 主要コンポーネント

  ChatInterface.tsx

  // メインチャットインターフェース
  // 役割: 全体レイアウト・モーダル管理・セッション制御
  // 依存: すべてのサブコンポーネント

  Key Features:
  - セッション管理
  - モーダル統合管理
  - レスポンシブレイアウト
  - キーボードショートカット

  MessageBubble.tsx

  // 個別メッセージ表示コンポーネント
  // 役割: メッセージレンダリング・インタラクション・エフェクト

  Key Features:
  - 動的メッセージスタイリング
  - 編集機能（2024年8月追加）
  - 音声再生・合成
  - 感情ベースアニメーション
  - アクションメニュー（再生成・コピー・編集・削除等）

  TrackerDisplay.tsx

  // トラッカー表示・操作コンポーネント
  // 役割: リアルタイム状態表示・インタラクティブ更新

  Key Features:
  - カテゴリ別グループ化
  - 数値・状態・ブール・テキストトラッカー対応
  - リアルタイム変更インジケーター
  - 視覚的フィードバック

  ---
  🏪 状態管理（Zustand）

  ストア構造

  // src/store/index.ts
  export interface AppStore extends
    ChatSlice,
    CharacterSlice,
    MemorySlice,
    SettingsSlice,
    SuggestionSlice,
    TrackerSlice {}

  // スライス統合
  export const useAppStore = create<AppStore>()(
    persist(
      (...args) => ({
        ...createChatSlice(...args),
        ...createCharacterSlice(...args),
        ...createMemorySlice(...args),
        ...createSettingsSlice(...args),
        ...createSuggestionSlice(...args),
        ...createTrackerSlice(...args),
      }),
      {
        name: 'ai-chat-store',
        partialize: (state) => ({
          // 永続化対象の選択
          characters: state.characters,
          personas: state.personas,
          apiConfig: state.apiConfig,
          voice: state.voice,
          // セッションは永続化しない（セキュリティ考慮）
        }),
      }
    )
  );

  ChatSlice

  // src/store/slices/chat.slice.ts
  export interface ChatSlice {
    sessions: Map<UUID, UnifiedChatSession>;
    trackerManagers: Map<UUID, TrackerManager>;
    active_session_id: UUID | null;
    is_generating: boolean;

    // アクション
    createSession: (character: Character, persona: Persona) => Promise<UUID>;
    sendMessage: (content: string, imageUrl?: string) => Promise<void>;
    regenerateLastMessage: () => Promise<void>;
    deleteMessage: (message_id: UUID) => void;
  }

  ---
  🔌 API設計

  APIマネージャー（統合済み）

  // src/services/api-manager.ts
  export class APIManager {
    private currentConfig: APIConfig;
    private openRouterApiKey: string | null = null;

    // 統一メッセージ生成インターフェース
    async generateMessage(
      systemPrompt: string,
      userMessage: string,
      conversationHistory: { role: 'user' | 'assistant'; content: string }[],
      options?: Partial<APIConfig>
    ): Promise<string>

    // Gemini/OpenRouter自動切り替え
    private async generateWithGemini(...)
    private async generateWithOpenRouter(...)
  }

  API Routes

  // src/app/api/characters/route.ts
  export async function GET(): Promise<NextResponse<Character[]>>
  export async function POST(request: NextRequest): Promise<NextResponse>

  // src/app/api/voice/voicevox/route.ts
  export async function POST(request: NextRequest): Promise<NextResponse>
  // Body: { text: string, speakerId: number, settings: VoiceVoxSettings }

  // src/app/api/upload/image/route.ts
  export async function POST(request: NextRequest): Promise<NextResponse>
  // 画像・動画アップロード対応（50MB制限）

  ---
  🧠 メモリシステム

  5層階層メモリ

  // src/services/memory/memory-layer-manager.ts
  interface MemoryLayers {
    immediate_memory: MemoryLayer;    // 直近3メッセージ
    working_memory: MemoryLayer;      // 活発な10メッセージ
    episodic_memory: MemoryLayer;     // エピソード50メッセージ
    semantic_memory: MemoryLayer;     // 重要な200メッセージ
    permanent_memory: PermanentLayer; // ピン留めメッセージ・要約
  }

  // 自動移行ロジック
  class MemoryLayerManager {
    addMessage(message: UnifiedMessage): void
    promoteMessage(messageId: string, fromLayer: string, toLayer: string): void
    demoteMessage(messageId: string, fromLayer: string, toLayer: string): void
    compressLayer(layerName: string): void
  }

  ベクトル検索

  // src/services/memory/vector-store.ts
  class VectorStore {
    private messages: Map<string, UnifiedMessage> = new Map();
    private embeddings: Map<string, number[]> = new Map();

    async addMessage(message: UnifiedMessage): Promise<void>
    async searchSimilar(query: string, limit: number = 5): Promise<SearchResult[]>
    cosineSimilarity(a: number[], b: number[]): number
  }

  ---
  📊 トラッカーシステム

  トラッカー定義

  // src/types/core/tracker.types.ts
  export interface TrackerDefinition extends BaseEntity {
    name: string;
    display_name: string;
    description?: string;
    category: 'relationship' | 'status' | 'condition' | 'other';
    config: TrackerConfig;
  }

  export type TrackerConfig =
    | NumericTrackerConfig
    | StateTrackerConfig
    | BooleanTrackerConfig
    | TextTrackerConfig;

  トラッカーマネージャー

  // src/services/tracker/tracker-manager.ts
  export class TrackerManager {
    private trackerSets: Map<string, TrackerSet> = new Map();

    initializeTrackerSet(characterId: string, trackers: TrackerDefinition[]): TrackerSet
    updateTracker(characterId: string, trackerName: string, newValue: TrackerValue): void
    getTrackersForPrompt(characterId: string): string

    // 自動更新ロジック
    analyzeMessageForTrackerUpdates(message: UnifiedMessage): TrackerUpdate[]
  }

  ---
  🔧 開発フロー

  セットアップ

  # 1. 依存関係インストール
  npm install

  # 2. 環境変数設定
  cp .env.local.example .env.local
  # NEXT_PUBLIC_GEMINI_API_KEY=your_api_key
  # ELEVENLABS_API_KEY=your_api_key
  # VOICEVOX_ENGINE_URL=http://127.0.0.1:50021

  # 3. 開発サーバー起動
  npm run dev
  # http://localhost:3000

  # 4. 型チェック
  npx tsc --noEmit

  # 5. ビルド
  npm run build

  コーディング規約

  // 1. 型安全性優先
  // ❌ 悪い例
  const message: any = getMessage();

  // ✅ 良い例
  const message: UnifiedMessage = getMessage();

  // 2. 統一メッセージ型使用
  // ❌ 旧型（削除済み）
  interface Message { sender: 'user' | 'assistant'; }

  // ✅ 新型
  interface UnifiedMessage { role: 'user' | 'assistant'; }

  // 3. サービス層分離
  // ❌ コンポーネント内でAPI直接呼び出し
  const response = await fetch('/api/chat');

  // ✅ サービス経由
  const response = await apiManager.generateMessage(prompt, message);

  // 4. エラーハンドリング
  try {
    const result = await someAsyncOperation();
    return result;
  } catch (error) {
    console.error('Operation failed:', error);
    throw new Error(`Failed to complete operation: ${error.message}`);
  }

  ---
  🐛 デバッグガイド

  一般的な問題と解決方法

  1. 型エラー

  // エラー: Property 'sender' does not exist on type 'UnifiedMessage'
  // 解決: 旧型参照を新型に更新
  message.sender → message.role

  2. トラッカー表示問題

  // エラー: トラッカーの初期値が表示されない
  // 解決: tracker.config.type を正しく参照
  tracker.type → tracker.config?.type

  3. 音声再生エラー

  // エラー: VoiceVox APIパラメータエラー
  // 解決: 正しいパラメータ形式使用
  { speaker: 1, speed: 1.0 }
  →
  { speakerId: 1, settings: { speed: 1.0 } }

  4. ビルドエラー

  # TypeScript型エラー
  npx tsc --noEmit --skipLibCheck

  # 依存関係問題
  rm -rf node_modules package-lock.json
  npm install

  # Next.js キャッシュクリア
  rm -rf .next
  npm run build

  デバッグツール設定

  // 1. コンソールログ設定
  // src/lib/debug.ts
  export const debugLog = (component: string, data: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${component}]`, data);
    }
  };

  // 2. Zustand DevTools
  import { devtools } from 'zustand/middleware';
  export const useAppStore = create<AppStore>()(
    devtools(
      persist(...),
      { name: 'ai-chat-store' }
    )
  );

  // 3. React DevTools Profiler使用推奨

  パフォーマンス監視

  // 1. レンダリング最適化
  const MemoizedComponent = React.memo(ExpensiveComponent);

  // 2. 状態更新最適化
  // ❌ 過度な再レンダリング
  const allMessages = useAppStore(state => state.sessions);

  // ✅ 必要な部分のみ
  const activeMessages = useAppStore(state =>
    state.sessions.get(state.active_session_id)?.messages || []
  );

  // 3. 大きなリスト仮想化
  import { FixedSizeList as List } from 'react-window';

  ---
  🚀 デプロイメント

  Vercel設定

  // vercel.json
  {
    "buildCommand": "npm run build",
    "installCommand": "npm install",
    "outputDirectory": ".next",
    "functions": {
      "src/app/api/**/*.ts": {
        "maxDuration": 30
      }
    },
    "env": {
      "NEXT_PUBLIC_GEMINI_API_KEY": "@gemini-api-key",
      "ELEVENLABS_API_KEY": "@elevenlabs-api-key",
      "VOICEVOX_ENGINE_URL": "@voicevox-url"
    }
  }

  環境変数

  # 本番環境
  NEXT_PUBLIC_GEMINI_API_KEY=     # Gemini APIキー
  ELEVENLABS_API_KEY=             # ElevenLabs APIキー
  OPENROUTER_TITLE=               # OpenRouterアプリ名
  RUNWARE_API_KEY=                # 画像生成APIキー
  VOICEVOX_ENGINE_URL=            # VoiceVoxエンジンURL

  デプロイコマンド

  # 1. ローカルビルド確認
  npm run build

  # 2. Vercelデプロイ
  npx vercel --prod

  # 3. プロジェクト削除（必要時）
  vercel rm project-name --yes

  # 4. 新規プロジェクト作成
  rm -rf .vercel
  npx vercel --prod --yes

  ---
  🔍 システム状況確認（2024年8月20日時点）

  ## メモリシステム現状

  ### メモリ記憶層
  - **自動更新**: ❌ 未実装
  - **階層管理**: memory-layer-manager.ts は存在するが、自動移行ロジックは未実装
  - **手動操作**: ✅ 限定的に可能
    - 各レイヤーの展開・詳細表示（MemoryLayerDisplay.tsx:129-131）
    - レイヤークリア機能（MemoryLayerDisplay.tsx:133-137）
    - 統計情報表示（メッセージ数、操作数）

  ### メモリカード機能
  - **手動作成**: ✅ AI自動生成実装済み - memory.slice.ts:49-169
    - ユーザーが「新規作成」ボタンで任意のタイミングで作成
    - 最新5メッセージからAI分析による自動生成
    - タイトル、要約、キーワード、カテゴリーを自動判定
    - 重要度スコア・感情タグ・文脈タグの自動付与
    - フォールバック機能付き（AI失敗時の代替処理）
  - **完全自動作成**: ✅ 新規実装 - auto-memory-manager.ts
    - 会話中の重要なメッセージを自動検出してメモリー作成
    - 重要キーワード・感情重み・会話深度・時間的重要性を総合判定
    - 閾値スコア0.7以上で自動作成実行
    - chat.slice.ts:260-272で各AIメッセージ後に実行
  - **AI生成サービス**: memory-card-generator.ts
    - JSON形式での構造化分析
    - 感情重み・繰り返し度・強調度の自動計算
    - 類似度検出・レーベンシュタイン距離による重複判定
  - **表示・編集**: ✅ 実装済み - MemoryCard.tsx
  - **フィルター・検索**: ✅ 実装済み

  ## インスピレーション機能現状

  ### 返信提案機能
  - **プロンプト参照**: ✅ チャット設定から参照
  - **実装場所**: inspiration-service.ts:14-67
  - **カスタムプロンプト対応**: ✅ customPrompt パラメータで設定可能
  - **プレースホルダー**: {{conversation}} が会話コンテキストに置換
  - **デフォルトカテゴリー**: ハードコーディング済み（inspiration-service.ts:30-35）
    - 共感・受容型
    - 探求・開発型（分析・調教師型）  
    - 挑発・逸脱型な返信文
    - 甘え・依存型（ヤンデレ・年下彼氏型）
  - **解析機能強化**: 複数の解析方式で柔軟対応（inspiration-service.ts:188-261）
    - [カテゴリー]形式の正確マッチング
    - 番号付きリスト（1. 2. 3.）での分割
    - 箇条書き（- •）での分割  
    - 段落分割による最終フォールバック
  - **出力形式改善**: {{user}}視点・箇条書き・説明文禁止の指示追加

  ### 文章強化機能  
  - **プロンプト参照**: ✅ チャット設定から参照
  - **実装場所**: inspiration-service.ts:75-112
  - **カスタムプロンプト対応**: ✅ enhancePrompt パラメータで設定可能
  - **プレースホルダー**: {{conversation}}, {{user}}, {{text}} が置換
  - **必須プレースホルダー**: {{user}} または {{text}} のいずれか（入力テキスト用）

  ## トラッカーシステム現状
  - **自動更新**: ✅ 正常動作
  - **UI表示**: ✅ 正常動作
  - **リアルタイム反映**: ✅ 正常動作

  ---
  📚 追加リソース

  重要ファイル一覧

  🔥 最重要（コア機能）
  ├── src/types/core/message.types.ts    # 統一メッセージ型
  ├── src/store/index.ts                 # Zustand統合ストア
  ├── src/services/api-manager.ts        # API統合マネージャー
  ├── src/components/chat/ChatInterface.tsx
  └── src/components/chat/MessageBubble.tsx

  ⚡ 重要（主要機能）
  ├── src/services/tracker/tracker-manager.ts
  ├── src/services/memory/memory-layer-manager.ts
  ├── src/store/slices/chat.slice.ts
  ├── src/components/tracker/TrackerDisplay.tsx
  └── src/contexts/EffectSettingsContext.tsx

  🛠️ 設定・ユーティリティ
  ├── src/types/index.ts
  ├── src/lib/utils.ts
  ├── next.config.js
  └── tailwind.config.js

  開発コマンド集

  # 開発
  npm run dev                    # 開発サーバー起動
  npm run build                  # 本番ビルド
  npm run start                  # 本番サーバー起動
  npx tsc --noEmit              # 型チェックのみ

  # デバッグ
  npm run dev -- --port 3001   # ポート指定起動
  npm run build -- --debug     # デバッグビルド

  # クリーンアップ
  rm -rf .next node_modules     # 完全リセット
  npm install                   # 再インストール

  ---
  🎯 まとめ

  このAI Chat V3プロジェクトは、型安全性、保守性、拡張性を重視して設計されています。

  開発時の注意点

  1. 必ずUnifiedMessage型を使用（旧Message型は削除済み）
  2. サービス層を経由してAPI呼び出し
  3. Zustandスライスパターンで状態管理
  4. TypeScript型チェックを常時実行

  拡張時のガイドライン

  1. 新機能は既存アーキテクチャに従って実装
  2. 型定義を先に作成してから実装
  3. テスト可能な小さなコンポーネントで構築
  4. パフォーマンスを考慮した実装