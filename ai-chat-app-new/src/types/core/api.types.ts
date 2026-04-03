/**
 * API設定型定義
 * API Settings Type Definitions
 *
 * LLMプロバイダー、認証、パラメータに関する型定義
 *
 * @module APITypes
 * @version Phase 2.2
 */

// ═══════════════════════════════════════════════════════════════════
// API設定型
// ═══════════════════════════════════════════════════════════════════

/**
 * APIプロバイダーの種類
 */
export type APIProvider = 'openrouter' | 'openai' | 'anthropic' | 'google' | 'groq' | 'gemini';

/**
 * API設定
 *
 * 各種LLMプロバイダーのAPI設定を管理
 */
export interface APISettings {
  /** 使用するAPIプロバイダー */
  provider: APIProvider;

  /** OpenAI APIキー */
  openaiApiKey?: string;

  /** Anthropic APIキー */
  anthropicApiKey?: string;

  /** Groq APIキー */
  groqApiKey?: string;

  /** Gemini APIキー */
  geminiApiKey?: string;

  /** OpenRouter APIキー */
  openrouterApiKey?: string;

  /** Google Cloud APIキー (Text-to-Speech等用) */
  googleCloudApiKey?: string;

  /** 使用モデルID */
  model?: string;

  /** 温度パラメータ (0-2) - 生成のランダム性を制御 */
  temperature?: number;

  /** 最大トークン数 - 生成する応答の長さ上限 */
  maxTokens?: number;

  /** Top-Pサンプリング (0-1) - 確率分布の累積確率閾値 */
  topP?: number;

  /** 頻度ペナルティ (0-2) - 同じ単語の繰り返しを抑制 */
  frequencyPenalty?: number;

  /** 存在ペナルティ (0-2) - 新しい話題への移行を促進 */
  presencePenalty?: number;

  /** コンテキストウィンドウサイズ - 保持する過去メッセージ数 */
  contextWindow?: number;

  /** Gemini直接API使用フラグ - trueの場合はOpenRouter経由せずに直接呼び出し */
  useDirectGeminiAPI?: boolean;

  /**
   * インスピレーション機能（返信提案・文章強化）の設定
   * 固定モデルを使用するか、チャット用モデルと同じモデルを使用するかを制御
   */
  inspiration?: {
    /** 固定モデルを使用するか（falseの場合は使用中のモデル） */
    useFixedModel: boolean;
    /** 固定モデルID */
    fixedModel?: string;
    /** 固定モデル用プロバイダー */
    fixedProvider?: APIProvider;
    /** 直接Gemini APIを使用するか（固定モデルがGemini直接APIの場合） */
    fixedUseDirectGeminiAPI?: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════
// プロンプト設定型
// ═══════════════════════════════════════════════════════════════════

/**
 * システムプロンプト設定
 *
 * 各種プロンプトと有効化フラグを管理
 */
export interface PromptSettings {
  /** システムプロンプト - AIの基本動作を定義 */
  system: string;

  /** アンカープロンプト - 最終入力の直前に配置される固定プロンプト */
  anchor: string;

  /** 返信提案プロンプト - 次の返信候補を生成 */
  replySuggestion: string;

  /** 返信提案スタイル設定 */
  replySuggestionStyle: {
    personality: string;
    tone: string;
    behavior: string;
    firstPerson: string;
  };

  /** テキスト拡張プロンプト - テキストの詳細化 */
  textEnhancement: string;


  /** Jailbreakプロンプト - 制限解除用 */
  jailbreak: string;

  /** システムプロンプト有効化フラグ */
  enableSystemPrompt: boolean;

  /** Normal chat fallback system prompt mode */
  chatSystemPromptMode: "legacy" | "minimal";

  /** アンカープロンプト有効化フラグ */
  enableAnchorPrompt: boolean;

  /** アンカープロンプト挿入位置（Depth: 0〜10） - 0は最新入力の直前、10は10メッセージ前 */
  anchorDepth: number;

  /** Jalbreakプロンプト有効化フラグ */
  enableJailbreakPrompt?: boolean;
}
