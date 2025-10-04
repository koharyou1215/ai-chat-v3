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
   * APIキーの読み込み - 既存システムと互換性を保つ
   */
  private loadApiKeys() {
    if (typeof window !== "undefined") {
      try {
        // 既存のAPIManagerと同じキー名を使用
        const savedData = localStorage.getItem("ai-chat-v3-storage");
        if (savedData) {
          const parsed = JSON.parse(savedData);
          this.geminiApiKey = parsed?.state?.geminiApiKey || null;
          this.openRouterApiKey = parsed?.state?.openRouterApiKey || null;
          this.useDirectGeminiAPI = parsed?.state?.useDirectGeminiAPI || false;

          // APIキー読み込み完了
        }
      } catch (error) {
        console.warn("APIキーの読み込みに失敗:", error);
      }
    }

    // 環境変数からも読み込み
    this.geminiApiKey =
      this.geminiApiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY || null;
    this.openRouterApiKey =
      this.openRouterApiKey ||
      process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ||
      null;
  }

  /**
   * JSON安全解析機能
   */
  private safeJsonParse(text: string): any {
    try {
      // 制御文字を除去
      const sanitized = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
      return JSON.parse(sanitized);
    } catch (error) {
      console.error("🚨 JSON Parse Error:", error);

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
          console.error("🚨 Second JSON parse attempt failed:", secondError);
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
   */
  setGeminiApiKey(key: string) {
    this.geminiApiKey = key;
    if (typeof window !== "undefined") {
      localStorage.setItem("gemini_api_key", key);
    }
  }

  setOpenRouterApiKey(key: string) {
    this.openRouterApiKey = key;
    if (typeof window !== "undefined") {
      localStorage.setItem("openrouter_api_key", key);
    }
  }

  /**
   * API設定の更新
   */
  setAPIConfig(config: Partial<APIConfig>) {
    this.currentConfig = { ...this.currentConfig, ...config };
    console.log("🔧 API設定更新:", this.currentConfig);
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
    console.log("🔧 Gemini API直接使用フラグ:", enabled);
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
    console.log("🔧 [SimpleAPIManagerV2] generateMessage called");
    console.log("🔍 Options provided:", {
      hasOptions: !!options,
      model: options?.model,
      provider: options?.provider,
      hasOpenRouterKey: !!options?.openRouterApiKey,
      hasGeminiKey: !!options?.geminiApiKey,
    });

    // 🔧 リアルタイムでAPIキーを取得（Zustandストアから）
    this.refreshApiKeys();

    // optionsからAPIキーを優先的に使用
    if (options?.openRouterApiKey) {
      this.openRouterApiKey = options.openRouterApiKey;
      console.log("✅ Using OpenRouter API key from options");
    }
    if (options?.geminiApiKey) {
      this.geminiApiKey = options.geminiApiKey;
      console.log("✅ Using Gemini API key from options");
    }
    if (options?.useDirectGeminiAPI !== undefined) {
      this.useDirectGeminiAPI = options.useDirectGeminiAPI;
      console.log("🔄 useDirectGeminiAPI set to:", options.useDirectGeminiAPI);
    }

    // AIタブのuseDirectGeminiAPIトグルのみで判断
    if (this.useDirectGeminiAPI && this.geminiApiKey) {
      console.log("🔥 Gemini API直接使用 (AIタブトグルON)");
      const result = await this.generateWithGemini(
        systemPrompt,
        userMessage,
        conversationHistory,
        options
      );
      return result;
    } else {
      console.log(
        "🌐 OpenRouter使用 (AIタブトグルOFF または Geminiキー未設定)"
      );
      console.log("🔑 OpenRouter API key available:", !!this.openRouterApiKey);
      // 🚨 修正: GeminiモデルをOpenRouterに送信しない
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
        console.log("📍 OpenRouter用Geminiモデル:", model);
      }
      // Gemini以外のモデル（deepseek等）はそのまま使用
      else {
        console.log("✅ OpenRouter用モデル（そのまま使用）:", model);
      }

      const result = await this.generateWithOpenRouter(
        systemPrompt,
        userMessage,
        conversationHistory,
        model,
        options
      );
      return result.content;
    }
  }

  /**
   * ZustandストアからリアルタイムでAPIキーを取得
   */
  private refreshApiKeys() {
    if (typeof window !== "undefined") {
      try {
        const savedData = localStorage.getItem("ai-chat-v3-storage");
        if (savedData) {
          const parsed = JSON.parse(savedData);
          const newGeminiKey = parsed?.state?.geminiApiKey;
          const newOpenRouterKey = parsed?.state?.openRouterApiKey;
          const newUseDirectGeminiAPI = parsed?.state?.useDirectGeminiAPI;
          const currentApiConfig = parsed?.state?.apiConfig;

          if (newGeminiKey && newGeminiKey !== this.geminiApiKey) {
            this.geminiApiKey = newGeminiKey;
            console.log("🔄 Gemini APIキーを更新しました");
          }

          if (newOpenRouterKey && newOpenRouterKey !== this.openRouterApiKey) {
            this.openRouterApiKey = newOpenRouterKey;
            console.log("🔄 OpenRouter APIキーを更新しました");
          }

          // useDirectGeminiAPIフラグも更新
          if (newUseDirectGeminiAPI !== undefined) {
            this.useDirectGeminiAPI = newUseDirectGeminiAPI;
            console.log(
              "🔄 Gemini API直接使用フラグ:",
              this.useDirectGeminiAPI
            );
          }

          // 現在のAPIConfigも更新（モデル設定を反映）
          if (currentApiConfig && currentApiConfig.model) {
            // Geminiモデルの場合のみ検証
            if (currentApiConfig.model.includes('gemini') && !validateGeminiModel(currentApiConfig.model)) {
              console.error(`❌ 無効なGeminiモデル設定: ${currentApiConfig.model}`);
              // 無効なモデルは使用しない
            } else {
              this.currentConfig = { ...this.currentConfig, ...currentApiConfig };
              console.log(
                "🔄 APIConfig更新（モデル:",
                currentApiConfig.model,
                "）"
              );
            }
          }
        }
      } catch (error) {
        console.warn("APIキーのリアルタイム取得に失敗:", error);
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
    if (!this.geminiApiKey) {
      throw new Error(
        "Gemini APIキーが設定されていません。設定画面でAPIキーを入力してください。"
      );
    }

    console.log("🔥 Using Gemini API directly");

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

    const response = await geminiClient.generateMessage(messages, {
      temperature: options?.temperature || 0.7,
      maxTokens: options?.max_tokens || 2048,
      topP: options?.top_p || 0.9,
    });

    return formatMessageContent(response, "readable");
  }

  /**
   * OpenRouter使用
   */
  private async generateWithOpenRouter(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[],
    model: string,
    options?: Partial<APIConfig>
  ): Promise<{ content: string; usage?: any }> {
    if (!this.openRouterApiKey) {
      throw new Error(
        `OpenRouter APIキーが設定されていません。${model}を使用するにはOpenRouter APIキーが必要です。`
      );
    }

    console.log(`🌐 Using OpenRouter with model: ${model}`);

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
    console.log("📥 OpenRouter完全レスポンス:", JSON.stringify(data, null, 2));

    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error("OpenRouterからの応答が不正です（choices配列が空）");
    }

    const finishReason = choice.finish_reason;
    const content = choice.message?.content || "";

    // 🔧 finish_reason と content の状態をログ出力
    console.log(`📋 OpenRouter finish_reason: "${finishReason}", content length: ${content.length}`);

    // 🔧 finish_reason別の詳細なハンドリング（Grok 4 Fast問題対応）
    if (finishReason === "length") {
      console.warn("⚠️ トークン制限で応答が切り詰められました");
      if (content) {
        // 部分的な応答でも返す（インスピレーションのパースを試行可能にする）
        console.log("✅ 部分的な応答を返します");
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
        console.error("🚨 finish_reason=stop だが contentが空！");
        throw new Error(
          `モデル${model}から空の応答が返されました。モデルの制限に達した可能性があります。`
        );
      }
    } else if (!finishReason) {
      // finish_reasonがnullまたはundefined（Grok 4 Fast無料版で発生）
      console.warn(`⚠️ finish_reasonがnullです（モデル: ${model}）`);
      if (!content) {
        throw new Error(
          `モデル${model}から不完全な応答が返されました。` +
          `finish_reason=null, content=empty。APIの制限またはモデルの問題の可能性があります。`
        );
      }
      // contentがある場合はログを出力して続行
      console.log("✅ finish_reasonはnullですが、contentがあるため続行します");
    } else {
      // 未知のfinish_reason
      console.warn(`⚠️ 未知のfinish_reason: "${finishReason}"`);
      if (!content) {
        throw new Error(
          `モデル${model}から空の応答が返されました (finish_reason: ${finishReason})`
        );
      }
    }

    // 使用量情報を詳細にログ出力
    if (data.usage) {
      console.log("📊 OpenRouter API使用量:", {
        model: model,
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
        finish_reason: finishReason,
        contentLength: content.length,
        promptCost: data.usage.prompt_tokens * 0.000002, // 概算コスト
        completionCost: data.usage.completion_tokens * 0.000002, // 概算コスト
        totalCost: data.usage.total_tokens * 0.000002, // 概算コスト
      });
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
        console.log("📍 OpenRouter用Geminiモデル:", model);
      }
      // Gemini以外のモデル（deepseek等）はそのまま使用
      else {
        console.log("✅ OpenRouter用モデル（そのまま使用）:", model);
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
    } catch (error: any) {
      return {
        success: false,
        message: `${model} との接続に失敗: ${error.message}`,
      };
    }
  }
}

// シングルトンインスタンス
export const simpleAPIManagerV2 = new SimpleAPIManagerV2();
