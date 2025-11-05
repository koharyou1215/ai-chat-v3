/**
 * Simple API Manager V2 - 完全にシンプル化されたAPI管理
 *
 * 設計方針:
 * - ユーザーが選択したモデルを素直に使用
 * - フォールバック機能なし（エラーは明確に表示）
 * - 複雑なルーティング戦略なし
 * - デバッグしやすいシンプルな構造
 */

import { geminiClient } from "./api/gemini-client";
import { APIConfig } from "@/types";
import { formatMessageContent } from "@/utils/text-formatter";
import { validateGeminiModel, formatModelForProvider } from "@/utils/model-migration";
import { logger } from "@/utils/logger";

/**
 * 🔧 Type-safe API response types
 */
interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenRouterResponse {
  content: string;
  usage?: OpenRouterUsage;
}

export class SimpleAPIManagerV2 {
  private geminiApiKey: string | null = null;
  private openRouterApiKey: string | null = null;
  private useDirectGeminiAPI: boolean = false;
  private currentConfig: APIConfig;

  constructor() {
    // 🔧 FIX: デフォルト設定削除 - ユーザー選択モデルのみ使用
    this.currentConfig = {
      provider: "openrouter", // デフォルトをopenrouterに変更
      model: "anthropic/claude-sonnet-4.5",
      temperature: 0.7,
      max_tokens: 4096, // 🔧 2048→4096に増加（インスピレーション提案とプロンプトに十分な容量を確保）
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
      context_window: 32000,
    };
    // 環境変数またはローカルストレージからAPIキーを読み込み
    this.loadApiKeys();
  }

  /**
   * APIキーの読み込み
   * 🔧 FIX: 環境変数を優先（本番環境対策）
   *
   * 優先順位:
   * 1. 環境変数（Vercel等の本番環境設定）
   * 2. LocalStorage（ユーザー設定）
   */
  private loadApiKeys() {
    // 環境変数から読み込み（本番環境の正しい値）
    const envGeminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || null;
    const envOpenRouterKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || null;

    // LocalStorageから読み込み（ユーザー設定）
    let localGeminiKey: string | null = null;
    let localOpenRouterKey: string | null = null;

    if (typeof window !== "undefined") {
      try {
        const savedData = localStorage.getItem("ai-chat-v3-storage");
        if (savedData) {
          const parsed = JSON.parse(savedData);
          localGeminiKey = parsed?.state?.geminiApiKey || null;
          localOpenRouterKey = parsed?.state?.openRouterApiKey || null;
          this.useDirectGeminiAPI = parsed?.state?.useDirectGeminiAPI || false;
        }
      } catch (error) {
        logger.warn("APIキーの読み込みに失敗:", error);
      }
    }

    // 🔧 FIX: 環境変数を優先（本番環境の正しいキーを使用）
    // LocalStorageに値があっても、環境変数がある場合は環境変数を使用
    this.geminiApiKey = envGeminiKey || localGeminiKey;
    this.openRouterApiKey = envOpenRouterKey || localOpenRouterKey;

    // デバッグログ: APIキーの読み込み元を表示
    if (typeof window !== "undefined") {
      logger.debug("🔑 APIキー読み込み:", {
        gemini: envGeminiKey ? "環境変数" : localGeminiKey ? "LocalStorage" : "未設定",
        openRouter: envOpenRouterKey ? "環境変数" : localOpenRouterKey ? "LocalStorage" : "未設定",
        useDirectGeminiAPI: this.useDirectGeminiAPI
      });
    }
  }

  /**
   * JSON安全解析機能
   * 🔧 Returns unknown instead of any for type safety
   */
  private safeJsonParse(text: string): unknown {
    try {
      // 制御文字を除去
      const sanitized = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
      return JSON.parse(sanitized);
    } catch (error) {
      logger.error("🚨 JSON Parse Error:", error);

      // 不正なJSONから有効な部分を抽出
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) {
        try {
          const sanitized = jsonMatch[0].replace(
            /[\u0000-\u001F\u007F-\u009F]/g,
            ""
          );
          return JSON.parse(sanitized);
        } catch (secondError) {
          logger.error("🚨 Second JSON parse attempt failed:", secondError);
        }
      }

      throw new Error(
        `JSON解析エラー: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * APIキーの設定
   * 🔧 FIX: LocalStorageへの直接保存を削除（統一設定システムで管理）
   */
  setGeminiApiKey(key: string) {
    this.geminiApiKey = key;
    // LocalStorage直接保存は統一設定システムに任せる
  }

  setOpenRouterApiKey(key: string) {
    this.openRouterApiKey = key;
    // LocalStorage直接保存は統一設定システムに任せる
  }

  /**
   * API設定の更新
   */
  setAPIConfig(config: Partial<APIConfig>) {
    this.currentConfig = { ...this.currentConfig, ...config };
    logger.debug("🔧 API設定更新:", this.currentConfig);
  }

  setAPIProvider(provider: APIConfig["provider"]) {
    this.currentConfig.provider = provider;
  }

  setAPIModel(model: string) {
    this.currentConfig.model = model;
  }

  setTemperature(temp: number) {
    this.currentConfig.temperature = temp;
  }

  setMaxTokens(tokens: number) {
    this.currentConfig.max_tokens = tokens;
  }

  setTopP(topP: number) {
    this.currentConfig.top_p = topP;
  }

  setUseDirectGeminiAPI(enabled: boolean) {
    this.useDirectGeminiAPI = enabled;
    logger.debug("🔧 Gemini API直接使用フラグ:", enabled);
  }

  getCurrentConfig(): APIConfig {
    return { ...this.currentConfig };
  }

  /**
   * メッセージ生成 - AIタブのトグル1つで判断
   */
  async generateMessage(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[] = [],
    options?: Partial<APIConfig>
  ): Promise<string> {
    logger.debug("🔧 [SimpleAPIManagerV2] generateMessage called");
    logger.debug("🔍 Options provided:", {
      hasOptions: !!options,
      model: options?.model,
      provider: options?.provider,
      hasOpenRouterKey: !!options?.openRouterApiKey,
      hasGeminiKey: !!options?.geminiApiKey,
    });

    // 🔧 リアルタイムでAPIキーを取得
    // 環境変数を優先（本番環境対策）
    this.refreshApiKeys();

    // 🔧 FIX: モバイルSafari対策 - LocalStorageから直接useDirectGeminiAPIを読み込む
    if (typeof window !== 'undefined' && this.useDirectGeminiAPI === false) {
      try {
        const savedData = localStorage.getItem("ai-chat-v3-storage");
        if (savedData) {
          const parsed = JSON.parse(savedData);
          const storedFlag = parsed?.state?.useDirectGeminiAPI;
          if (storedFlag === true) {
            logger.debug("🔧 [Safari Fix] LocalStorageから直接useDirectGeminiAPI=trueを読み込みました");
            this.useDirectGeminiAPI = true;
          }
        }
      } catch (error) {
        logger.warn("⚠️ LocalStorageからのuseDirectGeminiAPI読み込みに失敗:", error);
      }
    }

    // 🔧 FIX: 環境変数がない場合のみoptionsから設定
    // 本番環境では環境変数が優先されるため、LocalStorageの古いキーで上書きしない
    const envGeminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const envOpenRouterKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;

    if (!envGeminiKey && options?.geminiApiKey) {
      this.geminiApiKey = options.geminiApiKey;
      logger.info("✅ Using Gemini API key from options (環境変数なし)");
    } else if (envGeminiKey) {
      logger.info("✅ Using Gemini API key from environment variable (優先)");
    }

    if (!envOpenRouterKey && options?.openRouterApiKey) {
      this.openRouterApiKey = options.openRouterApiKey;
      logger.info("✅ Using OpenRouter API key from options (環境変数なし)");
    } else if (envOpenRouterKey) {
      logger.info("✅ Using OpenRouter API key from environment variable (優先)");
    }

    if (options?.useDirectGeminiAPI !== undefined) {
      this.useDirectGeminiAPI = options.useDirectGeminiAPI;
      logger.debug("🔄 useDirectGeminiAPI set to:", options.useDirectGeminiAPI);
    }

    // モデルタイプを判定してプロバイダーを選択
    const model = options?.model || this.currentConfig.model || "gpt-4o-mini";
    const isGeminiModel = model.includes("gemini");

    // 🔧 デバッグ: モデル選択状況を詳細にログ
    logger.debug("🔍 [API Manager] モデル選択状況:");
    logger.debug("  - options?.model:", options?.model);
    logger.debug("  - this.currentConfig.model:", this.currentConfig.model);
    logger.debug("  - 最終選択モデル:", model);
    logger.debug("  - isGeminiModel:", isGeminiModel);
    logger.debug("  - useDirectGeminiAPI:", this.useDirectGeminiAPI);
    logger.debug("  - geminiApiKey present:", !!this.geminiApiKey);
    logger.debug("  - User Agent:", typeof navigator !== 'undefined' ? navigator.userAgent : 'Server-side');
    logger.debug("  - LocalStorage available:", typeof window !== 'undefined' && typeof localStorage !== 'undefined');

    // AIタブがONで、かつGemini系モデルの場合のみGemini APIを使用
    if (this.useDirectGeminiAPI && this.geminiApiKey && isGeminiModel) {
      logger.info("🔥 Gemini API直接使用 (AIタブトグルON & Geminiモデル)");
      const result = await this.generateWithGemini(
        systemPrompt,
        userMessage,
        conversationHistory,
        options
      );
      return result;
    } else {
      logger.info(
        "🌐 OpenRouter使用 (AIタブトグルOFF / 非Geminiモデル / Geminiキー未設定)"
      );
      logger.debug("🔑 OpenRouter API key available:", !!this.openRouterApiKey);
      logger.debug("📍 Selected model:", model);

      // 🚨 修正: GeminiモデルをOpenRouterに送信しない
      let finalModel = model;

      // Geminiモデルの場合のみ検証とフォーマット
      if (isGeminiModel) {
        // 有効性チェック（自動変換なし）
        if (!validateGeminiModel(model)) {
          throw new Error(`❌ 無効なGeminiモデル: ${model}. Gemini 2.5シリーズ(flash, light, pro)のみ使用可能です。`);
        }
        // OpenRouter用にフォーマット
        const formattedModel = formatModelForProvider(model, 'openrouter');
        if (!formattedModel) {
          throw new Error(`❌ モデルフォーマットエラー: ${model}`);
        }
        finalModel = formattedModel;
        logger.debug("📍 OpenRouter用Geminiモデル:", finalModel);
      }
      // Gemini以外のモデル（deepseek等）はそのまま使用
      else {
        logger.debug("✅ OpenRouter用モデル（そのまま使用）:", finalModel);
      }

      const result = await this.generateWithOpenRouter(
        systemPrompt,
        userMessage,
        conversationHistory,
        finalModel,
        options
      );
      return result.content;
    }
  }

  /**
   * ZustandストアからリアルタイムでAPIキーを取得
   * 🔧 FIX: 環境変数を優先（本番環境対策）
   */
  private refreshApiKeys() {
    logger.debug("🔄 [refreshApiKeys] APIキーを再読み込み中...");

    // 環境変数から読み込み（本番環境の正しい値）
    const envGeminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || null;
    const envOpenRouterKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || null;

    // LocalStorageから読み込み（ユーザー設定）
    let localGeminiKey: string | null = null;
    let localOpenRouterKey: string | null = null;
    let newUseDirectGeminiAPI: boolean | undefined = undefined;
    let currentApiConfig: Partial<APIConfig> | null = null;

    if (typeof window !== "undefined") {
      try {
        const savedData = localStorage.getItem("ai-chat-v3-storage");
        if (savedData) {
          const parsed = JSON.parse(savedData);
          localGeminiKey = parsed?.state?.geminiApiKey;
          localOpenRouterKey = parsed?.state?.openRouterApiKey;
          newUseDirectGeminiAPI = parsed?.state?.useDirectGeminiAPI;
          currentApiConfig = parsed?.state?.apiConfig;

          logger.debug("📊 [refreshApiKeys] LocalStorage読み込み結果:", {
            hasLocalGeminiKey: !!localGeminiKey,
            hasLocalOpenRouterKey: !!localOpenRouterKey,
            hasEnvGeminiKey: !!envGeminiKey,
            hasEnvOpenRouterKey: !!envOpenRouterKey,
            useDirectGeminiAPI: newUseDirectGeminiAPI,
            apiConfigModel: currentApiConfig?.model,
            apiConfigProvider: currentApiConfig?.provider
          });
        }
      } catch (error) {
        logger.warn("APIキーのリアルタイム取得に失敗:", error);
      }
    }

    // 🔧 FIX: 環境変数を優先
    const finalGeminiKey = envGeminiKey || localGeminiKey;
    const finalOpenRouterKey = envOpenRouterKey || localOpenRouterKey;

    if (finalGeminiKey && finalGeminiKey !== this.geminiApiKey) {
      this.geminiApiKey = finalGeminiKey;
      logger.debug("🔄 Gemini APIキーを更新しました (元:", envGeminiKey ? "環境変数" : "LocalStorage", ")");
      geminiClient.setApiKey(finalGeminiKey);
    }

    if (finalOpenRouterKey && finalOpenRouterKey !== this.openRouterApiKey) {
      this.openRouterApiKey = finalOpenRouterKey;
      logger.debug("🔄 OpenRouter APIキーを更新しました (元:", envOpenRouterKey ? "環境変数" : "LocalStorage", ")");
      geminiClient.setOpenRouterApiKey(finalOpenRouterKey);
    }

    // useDirectGeminiAPIフラグも更新
    if (newUseDirectGeminiAPI !== undefined) {
      this.useDirectGeminiAPI = newUseDirectGeminiAPI;
      logger.debug(
        "🔄 Gemini API直接使用フラグ:",
        this.useDirectGeminiAPI
      );
    }

    // 現在のAPIConfigも更新（モデル設定を反映）
    if (currentApiConfig && currentApiConfig.model) {
      // Geminiモデルの場合のみ検証
      if (currentApiConfig.model.includes('gemini') && !validateGeminiModel(currentApiConfig.model)) {
        logger.error(`❌ 無効なGeminiモデル設定: ${currentApiConfig.model}`);
        // 無効なモデルは使用しない
      } else {
        this.currentConfig = { ...this.currentConfig, ...currentApiConfig };
        logger.debug(
          "🔄 APIConfig更新（モデル:",
          currentApiConfig.model,
          "）"
        );
      }
    }
  }

  /**
   * Gemini API直接使用
   */
  private async generateWithGemini(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[],
    options?: Partial<APIConfig>
  ): Promise<string> {
    // 🔥 Performance Measurement: 開始時刻を記録
    const startTime = Date.now();

    if (!this.geminiApiKey) {
      throw new Error(
        "Gemini APIキーが設定されていません。設定画面でAPIキーを入力してください。"
      );
    }

    logger.info("🔥 Using Gemini API directly");

    // モデル名の検証とフォーマット
    const requestedModel = options?.model || "gemini-2.5-flash";
    if (!validateGeminiModel(requestedModel)) {
      throw new Error(`❌ 無効なGeminiモデル: ${requestedModel}. Gemini 2.5シリーズのみ使用可能です。`);
    }
    const formattedModel = formatModelForProvider(requestedModel, 'gemini');
    if (!formattedModel) {
      throw new Error(`❌ モデルフォーマットエラー: ${requestedModel}`);
    }
    const cleanModel = formattedModel; // 直接API用はプレフィックスなし

    geminiClient.setApiKey(this.geminiApiKey);
    geminiClient.setModel(cleanModel);

    const messages = geminiClient.formatMessagesForGemini(
      systemPrompt,
      userMessage,
      conversationHistory
    );

    // 🔥 Prompt Caching: Pass cache-related options to gemini-client
    // 🚨 CRITICAL FIX: Disable cache for free tier (limit=0)
    const response = await geminiClient.generateMessage(messages, {
      temperature: options?.temperature || 0.7,
      maxTokens: options?.max_tokens || 2048,
      topP: options?.top_p || 0.9,
      characterId: options?.characterId,
      personaId: options?.personaId,
      systemPrompt: systemPrompt, // For cache key generation
      enableCache: false, // 🔧 FIX: 無料版ではキャッシュ制限(limit=0)のため無効化
    });

    // 🔥 Performance Measurement: 終了時刻と処理時間を記録
    const endTime = Date.now();
    const duration = endTime - startTime;

    logger.debug("📊 [Gemini Performance]");
    logger.debug(`  - Generation Time: ${duration}ms`);
    logger.debug(`  - Model: ${cleanModel}`);
    logger.debug(`  - System Prompt Length: ${systemPrompt.length} chars`);
    logger.debug(`  - Response Length: ${response.length} chars`);
    if (options?.characterId) logger.debug(`  - Character ID: ${options.characterId}`);
    if (options?.personaId) logger.debug(`  - Persona ID: ${options.personaId}`);

    return formatMessageContent(response, "readable");
  }

  /**
   * OpenRouter使用
   * 🔧 Returns properly typed OpenRouterResponse
   */
  private async generateWithOpenRouter(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[],
    model: string,
    options?: Partial<APIConfig>
  ): Promise<OpenRouterResponse> {
    // 🔥 Performance Measurement: 開始時刻を記録
    const startTime = Date.now();

    if (!this.openRouterApiKey) {
      throw new Error(
        `OpenRouter APIキーが設定されていません。${model}を使用するにはOpenRouter APIキーが必要です。`
      );
    }

    logger.info(`🌐 Using OpenRouter with model: ${model}`);

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory,
      { role: "user" as const, content: userMessage },
    ];

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.openRouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "AI Chat V3",
        },
        body: JSON.stringify({
          model: model,
          messages,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.max_tokens || 2048,
          top_p: options?.top_p || 0.9,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter API error (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();

    // 🔧 完全なAPIレスポンスをデバッグログ出力（Grok等の問題診断用）
    logger.debug("📥 OpenRouter完全レスポンス:", JSON.stringify(data, null, 2));

    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error("OpenRouterからの応答が不正です（choices配列が空）");
    }

    const finishReason = choice.finish_reason;
    const content = choice.message?.content || "";

    // 🔧 finish_reason と content の状態をログ出力
    logger.debug(`📋 OpenRouter finish_reason: "${finishReason}", content length: ${content.length}`);

    // 🔧 finish_reason別の詳細なハンドリング（Grok 4 Fast問題対応）
    if (finishReason === "length") {
      logger.warn("⚠️ トークン制限で応答が切り詰められました");
      if (content) {
        // 部分的な応答でも返す（インスピレーションのパースを試行可能にする）
        logger.debug("✅ 部分的な応答を返します");
        return { content: formatMessageContent(content, "readable"), usage: data.usage };
      } else {
        throw new Error(
          `トークン制限に達しました（max_tokens: ${options?.max_tokens || 4096}）。` +
          `max_tokensを増やすか、プロンプトを短縮してください。`
        );
      }
    } else if (finishReason === "content_filter" || finishReason === "moderation") {
      throw new Error(
        `コンテンツがモデレーションでブロックされました (reason: ${finishReason})。` +
        `別のモデルを試すか、入力内容を変更してください。`
      );
    } else if (finishReason === "stop") {
      // 正常終了
      if (!content) {
        logger.error("🚨 finish_reason=stop だが contentが空！");
        throw new Error(
          `モデル${model}から空の応答が返されました。モデルの制限に達した可能性があります。`
        );
      }
    } else if (!finishReason) {
      // finish_reasonがnullまたはundefined（Grok 4 Fast無料版で発生）
      logger.warn(`⚠️ finish_reasonがnullです（モデル: ${model}）`);
      if (!content) {
        throw new Error(
          `モデル${model}から不完全な応答が返されました。` +
          `finish_reason=null, content=empty。APIの制限またはモデルの問題の可能性があります。`
        );
      }
      // contentがある場合はログを出力して続行
      logger.debug("✅ finish_reasonはnullですが、contentがあるため続行します");
    } else {
      // 未知のfinish_reason
      logger.warn(`⚠️ 未知のfinish_reason: "${finishReason}"`);
      if (!content) {
        throw new Error(
          `モデル${model}から空の応答が返されました (finish_reason: ${finishReason})`
        );
      }
    }

    // 🔥 Performance Measurement: 終了時刻と処理時間を記録
    const endTime = Date.now();
    const duration = endTime - startTime;

    // 使用量情報を詳細にログ出力
    if (data.usage) {
      logger.debug("📊 [OpenRouter Performance]");
      logger.debug(`  - Generation Time: ${duration}ms`);
      logger.debug(`  - Model: ${model}`);
      logger.debug(`  - Prompt Tokens: ${data.usage.prompt_tokens}`);
      logger.debug(`  - Completion Tokens: ${data.usage.completion_tokens}`);
      logger.debug(`  - Total Tokens: ${data.usage.total_tokens}`);
      logger.debug(`  - Finish Reason: ${finishReason}`);
      logger.debug(`  - Response Length: ${content.length} chars`);
      logger.debug(`  - Estimated Cost: $${(data.usage.total_tokens * 0.000002).toFixed(6)}`);
    } else {
      // Usage情報がない場合でも基本的なパフォーマンス情報を出力
      logger.debug("📊 [OpenRouter Performance]");
      logger.debug(`  - Generation Time: ${duration}ms`);
      logger.debug(`  - Model: ${model}`);
      logger.debug(`  - Response Length: ${content.length} chars`);
    }

    return {
      content: formatMessageContent(content, "readable"),
      usage: data.usage,
    };
  }

  /**
   * ストリーミング生成 - AIタブのトグル1つで判断
   */
  async generateMessageStream(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[] = [],
    onChunk: (chunk: string) => void,
    options?: Partial<APIConfig>
  ): Promise<string> {
    // 🔧 リアルタイムでAPIキーを取得（Zustandストアから）
    this.refreshApiKeys();

    // AIタブのuseDirectGeminiAPIトグルのみで判断
    if (this.useDirectGeminiAPI && this.geminiApiKey) {
      // Geminiストリーミング
      return await geminiClient.generateMessageStream(
        geminiClient.formatMessagesForGemini(
          systemPrompt,
          userMessage,
          conversationHistory
        ),
        onChunk,
        options
      );
    } else {
      // OpenRouterはストリーミング非対応のため通常生成
      let model = options?.model || this.currentConfig.model || "gpt-4o-mini";

      // Geminiモデルの場合のみ検証とフォーマット
      if (model.includes("gemini")) {
        // 有効性チェック（自動変換なし）
        if (!validateGeminiModel(model)) {
          throw new Error(`❌ 無効なGeminiモデル: ${model}. Gemini 2.5シリーズ(flash, light, pro)のみ使用可能です。`);
        }
        // OpenRouter用にフォーマット
        const formattedModel = formatModelForProvider(model, 'openrouter');
        if (!formattedModel) {
          throw new Error(`❌ モデルフォーマットエラー: ${model}`);
        }
        model = formattedModel;
        logger.debug("📍 OpenRouter用Geminiモデル:", model);
      }
      // Gemini以外のモデル（deepseek等）はそのまま使用
      else {
        logger.debug("✅ OpenRouter用モデル（そのまま使用）:", model);
      }

      const result = await this.generateWithOpenRouter(
        systemPrompt,
        userMessage,
        conversationHistory,
        model,
        options
      );
      onChunk(result.content); // 一度に全体を送信
      return result.content;
    }
  }

  /**
   * 利用可能なモデル一覧
   */
  getAvailableModels(): {
    provider: string;
    models: Array<{ id: string; name: string }>;
  }[] {
    return [
      {
        provider: "Gemini (Direct)",
        models: [
          { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
          { id: "gemini-2.5-flash-light", name: "Gemini 2.5 Flash Light" },
          { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
        ],
      },
      {
        provider: "OpenRouter",
        models: [
          { id: "anthropic/claude-opus-4.1", name: "Claude Opus 4" },
          { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5" },
          { id: "openai/gpt-4", name: "GPT-4" },
          { id: "openai/gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
          { id: "x-ai/grok-4-fast", name: "grok-4-fast" },
          { id: "deepseek/deepseek-v3.2-exp", name: "DeepSeek V3.2 Experimental" },
          { id: "meta-llama/llama-3.1-405b", name: "Llama 3.1 405B" },
          { id: "qwen/qwen3-next-80b-a3b-thinking", name: "Qwen3 Next 80B Thinking" },
          { id: "qwen/qwen3-next-80b-a3b-instruct", name: "Qwen3 Next 80B Instruct" },
        ],
      },
    ];
  }

  /**
   * 接続テスト
   * 🔧 Uses proper error type guards
   */
  async testConnection(
    model: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const testResponse = await this.generateMessage(
        "簡単なテストです。「テスト成功」と返答してください。",
        "テスト",
        [],
        { model }
      );

      return {
        success: true,
        message: `${model} との接続に成功しました: ${testResponse.substring(
          0,
          50
        )}...`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `${model} との接続に失敗: ${errorMessage}`,
      };
    }
  }
}

// シングルトンインスタンス
export const simpleAPIManagerV2 = new SimpleAPIManagerV2();
