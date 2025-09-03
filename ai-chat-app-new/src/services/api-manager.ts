import { geminiClient } from "./api/gemini-client";
import { APIConfig, APIProvider, APIProviderStrategy } from "@/types";
import { formatMessageContent } from "@/utils/text-formatter";
import { unifiedAPIRouter, UnifiedAPIRouter, UnifiedAPIConfig, UnifiedAPIRequest } from "./api/unified-router";

export type { APIProvider, APIProviderStrategy };

// OpenRouter API レスポンス型定義
interface OpenRouterModel {
  id: string;
  name?: string;
  description?: string;
}

interface OpenRouterModelsResponse {
  data?: OpenRouterModel[];
}

export class APIManager {
  private currentConfig: APIConfig;
  private openRouterApiKey: string | null = null;
  private geminiApiKey: string | null = null;
  
  // 🔧 NEW: 統一されたAPI router
  private unifiedRouter!: UnifiedAPIRouter;

  /**
   * JSON Parse with better error handling and text sanitization
   */
  private safeJsonParse(text: string): any {
    try {
      // Remove control characters that can break JSON parsing
      const sanitized = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
      return JSON.parse(sanitized);
    } catch (error) {
      console.error("🚨 JSON Parse Error:", error);
      console.error("🔍 Raw text (first 200 chars):", text.substring(0, 200));
      console.error("🔍 Text length:", text.length);

      // Try to extract valid JSON from potentially malformed response
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) {
        try {
          const sanitized = jsonMatch[0].replace(
            /[\u0000-\u001F\u007F-\u009F]/g,
            ""
          );
          console.warn("🔧 Attempting to parse extracted JSON...");
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

  constructor() {
    this.currentConfig = {
      // 🔧 NEW: 統一戦略設定
      strategy: "auto-optimal",
      
      // Legacy compatibility
      provider: "gemini",
      useDirectGeminiAPI: true,
      
      // Model settings
      model: "google/gemini-2.5-flash",
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 0.9,
      frequency_penalty: 0.6,
      presence_penalty: 0.3,
      context_window: 20,
      
      // 🔧 NEW: Performance settings
      enableSmartFallback: true,
      fallbackDelayMs: 1000,
      maxRetries: 2,
    };

    // ブラウザ環境でのみローカルストレージから読み込み
    if (typeof window !== "undefined") {
      this.loadOpenRouterKey();
      this.loadGeminiKey();
    }
    
    // 🔧 NEW: 統一routerの初期化
    this.initializeUnifiedRouter();
  }

  private loadOpenRouterKey() {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem("openrouter_api_key");
      if (stored) {
        this.openRouterApiKey = this.decryptApiKey(stored);
      }
    } catch (error) {
      console.warn("Failed to load OpenRouter API key:", error);
    }
  }

  private loadGeminiKey() {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem("gemini_api_key");
      if (stored) {
        this.geminiApiKey = this.decryptApiKey(stored);
      }
    } catch (error) {
      console.warn("Failed to load Gemini API key:", error);
    }
  }

  private saveOpenRouterKey(key: string) {
    if (typeof window === "undefined") return;

    try {
      const encrypted = this.encryptApiKey(key);
      localStorage.setItem("openrouter_api_key", encrypted);
      this.openRouterApiKey = key;
    } catch (error) {
      console.error("Failed to save OpenRouter API key:", error);
      throw error;
    }
  }

  private saveGeminiKey(key: string) {
    if (typeof window === "undefined") return;

    try {
      const encrypted = this.encryptApiKey(key);
      localStorage.setItem("gemini_api_key", encrypted);
      this.geminiApiKey = key;
    } catch (error) {
      console.error("Failed to save Gemini API key:", error);
      throw error;
    }
  }

  private encryptApiKey(key: string): string {
    return btoa(key);
  }

  private decryptApiKey(encrypted: string): string {
    return atob(encrypted);
  }

  setConfig(config: Partial<APIConfig>) {
    this.currentConfig = {
      ...this.currentConfig,
      ...config,
    };
    
    // 🔧 NEW: 統一routerの設定も更新
    this.updateUnifiedRouterConfig();
  }

  /**
   * 🔧 NEW: 統一routerの初期化
   */
  private initializeUnifiedRouter(): void {
    const unifiedConfig: UnifiedAPIConfig = {
      strategy: this.currentConfig.strategy || 'auto-optimal',
      model: this.currentConfig.model,
      geminiApiKey: this.geminiApiKey || undefined,
      openRouterApiKey: this.openRouterApiKey || undefined,
      enableSmartFallback: this.currentConfig.enableSmartFallback || true,
      fallbackDelayMs: this.currentConfig.fallbackDelayMs || 1000,
      maxRetries: this.currentConfig.maxRetries || 2,
      temperature: this.currentConfig.temperature,
      maxTokens: this.currentConfig.max_tokens,
      topP: this.currentConfig.top_p,
    };
    
    this.unifiedRouter = new UnifiedAPIRouter(unifiedConfig);
  }

  /**
   * 🔧 NEW: 統一routerの設定更新
   */
  private updateUnifiedRouterConfig(): void {
    if (this.unifiedRouter) {
      this.unifiedRouter.updateConfig({
        strategy: this.currentConfig.strategy || 'auto-optimal',
        model: this.currentConfig.model,
        geminiApiKey: this.geminiApiKey || undefined,
        openRouterApiKey: this.openRouterApiKey || undefined,
        enableSmartFallback: this.currentConfig.enableSmartFallback || true,
        fallbackDelayMs: this.currentConfig.fallbackDelayMs || 1000,
        maxRetries: this.currentConfig.maxRetries || 2,
        temperature: this.currentConfig.temperature,
        maxTokens: this.currentConfig.max_tokens,
        topP: this.currentConfig.top_p,
      });
    }
  }

  getConfig(): APIConfig {
    return { ...this.currentConfig };
  }

  setOpenRouterApiKey(key: string) {
    this.saveOpenRouterKey(key);
    // 🔧 NEW: 統一routerの設定も更新
    this.updateUnifiedRouterConfig();
  }

  getOpenRouterApiKey(): string | null {
    return this.openRouterApiKey;
  }

  setGeminiApiKey(key: string) {
    this.saveGeminiKey(key);
    // 🔧 NEW: 統一routerの設定も更新  
    this.updateUnifiedRouterConfig();
  }

  getGeminiApiKey(): string | null {
    return this.geminiApiKey;
  }

  /**
   * 🔧 NEW: 統一されたAPI生成メソッド - 推奨
   */
  async generateMessageUnified(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[] = [],
    options?: {
      strategy?: APIProviderStrategy;
      textFormatting?: "compact" | "readable" | "detailed";
      temperature?: number;
      maxTokens?: number;
      topP?: number;
    }
  ): Promise<string> {
    // 戦略の一時的な上書き
    if (options?.strategy && options.strategy !== this.currentConfig.strategy) {
      this.unifiedRouter.updateConfig({ strategy: options.strategy });
    }

    const request: UnifiedAPIRequest = {
      systemPrompt,
      userMessage,
      conversationHistory,
      options: {
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        topP: options?.topP,
      },
    };

    try {
      const result = await this.unifiedRouter.generateMessage(request);
      
      // テキスト整形
      const formattingPreset = options?.textFormatting || "readable";
      return formatMessageContent(result, formattingPreset);
    } catch (error) {
      console.error("Unified message generation failed:", error);
      
      // Legacy fallback
      console.warn("Falling back to legacy generateMessage method");
      return this.generateMessage(systemPrompt, userMessage, conversationHistory, options);
    }
  }

  async generateMessage(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[] = [],
    options?: Partial<APIConfig> & {
      openRouterApiKey?: string;
      geminiApiKey?: string;
      textFormatting?: "compact" | "readable" | "detailed";
    }
  ): Promise<string> {
    const config = { ...this.currentConfig, ...options };
    const { provider, model, temperature, max_tokens, top_p } = config;

    // 開発環境でのログ出力
    const isDevelopment = process.env.NODE_ENV === "development";

    if (isDevelopment) {
      console.log(
        `\n🤖 [APIManager] ${provider}/${model} | User: "${userMessage.substring(
          0,
          50
        )}${userMessage.length > 50 ? "..." : ""}" | Prompt: ${
          systemPrompt.length
        } chars`
      );

      // プロンプト構造検証用の詳細ログ
      console.log("\n=== 📋 PROMPT STRUCTURE VERIFICATION ===");
      console.log("🎯 System Prompt Content (first 1000 chars):");
      console.log(systemPrompt.substring(0, 1000));
      console.log(`\n📊 Full prompt length: ${systemPrompt.length} characters`);

      // 8段階構造の確認
      const structureCheck = {
        "AI/User Definition":
          systemPrompt.includes("AI=") || systemPrompt.includes("User="),
        "System Instructions": systemPrompt.includes("<system_instructions>"),
        "Character Information": systemPrompt.includes(
          "<character_information>"
        ),
        "Persona Information": systemPrompt.includes("<persona_information>"),
        "Memory Cards":
          systemPrompt.includes("<pinned_memory_cards>") ||
          systemPrompt.includes("<relevant_memory_cards>"),
        "Tracker Information": systemPrompt.includes("<character_trackers>"),
        "Conversation Context":
          systemPrompt.includes("会話履歴") || systemPrompt.includes("Context"),
        "Current Interaction": userMessage.length > 0,
      };

      console.log("\n🔍 8段階構造チェック:");
      Object.entries(structureCheck).forEach(([stage, present]) => {
        console.log(`  ${present ? "✅" : "❌"} ${stage}`);
      });
      console.log("=========================================\n");
    }

    // options から渡された API キーを優先して使用
    if (options?.openRouterApiKey) {
      this.openRouterApiKey = options.openRouterApiKey;
    }

    if (options?.geminiApiKey) {
      this.geminiApiKey = options.geminiApiKey;
    }

    try {
      if (provider === "gemini") {
        return await this.generateWithGemini(
          systemPrompt,
          userMessage,
          conversationHistory,
          {
            model,
            temperature,
            maxTokens: max_tokens,
            topP: top_p,
            textFormatting: options?.textFormatting,
            useDirectGeminiAPI: config.useDirectGeminiAPI,
          }
        );
      } else if (provider === "openrouter") {
        if (!this.openRouterApiKey) {
          throw new Error("OpenRouter APIキーが設定されていません");
        }
        return await this.generateWithOpenRouter(
          systemPrompt,
          userMessage,
          conversationHistory,
          {
            model,
            temperature,
            maxTokens: max_tokens,
            topP: top_p,
            apiKey: this.openRouterApiKey,
            textFormatting: options?.textFormatting,
          }
        );
      } else {
        throw new Error(`Unsupported API provider: ${provider}`);
      }
    } catch (error) {
      console.error("Message generation failed:", error);

      // レート制限エラーの場合はフォールバック処理を試行
      if (this.isRateLimitError(error)) {
        return await this.attemptFallback(
          systemPrompt,
          userMessage,
          conversationHistory,
          config,
          options
        );
      }

      throw error;
    }
  }

  async generateMessageStream(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[] = [],
    onChunk: (chunk: string) => void,
    options?: Partial<APIConfig> & {
      openRouterApiKey?: string;
      geminiApiKey?: string;
      textFormatting?: "compact" | "readable" | "detailed";
    }
  ): Promise<string> {
    const config = { ...this.currentConfig, ...options };
    const { provider, model, temperature, max_tokens, top_p } = config;

    try {
      if (provider === "gemini") {
        return await this.generateStreamWithGemini(
          systemPrompt,
          userMessage,
          conversationHistory,
          onChunk,
          {
            model,
            temperature,
            maxTokens: max_tokens,
            topP: top_p,
            textFormatting: options?.textFormatting,
          }
        );
      } else if (provider === "openrouter") {
        if (!this.openRouterApiKey) {
          throw new Error("OpenRouter APIキーが設定されていません");
        }
        return await this.generateStreamWithOpenRouter(
          systemPrompt,
          userMessage,
          conversationHistory,
          onChunk,
          {
            model,
            temperature,
            maxTokens: max_tokens,
            topP: top_p,
            apiKey: this.openRouterApiKey,
            textFormatting: options?.textFormatting,
          }
        );
      } else {
        throw new Error(`Unsupported API provider: ${provider}`);
      }
    } catch (error) {
      console.error("Streaming message generation failed:", error);
      throw error;
    }
  }

  private async generateWithGemini(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[],
    options: {
      model: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      textFormatting?: "compact" | "readable" | "detailed";
      useDirectGeminiAPI?: boolean;
    }
  ): Promise<string> {
    // Geminiモデル名からプレフィックスを除去
    const geminiModel = options.model.replace("google/", "");
    geminiClient.setModel(geminiModel);

    // APIキーが設定されている場合は優先して使用
    if (this.geminiApiKey) {
      geminiClient.setApiKey(this.geminiApiKey);
    }

    // OpenRouter APIキーも設定（フォールバック用）
    if (this.openRouterApiKey) {
      geminiClient.setOpenRouterApiKey(this.openRouterApiKey);
    }

    const messages = geminiClient.formatMessagesForGemini(
      systemPrompt,
      userMessage,
      conversationHistory
    );

    const response = await geminiClient.generateMessage(messages, {
      model: geminiModel,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      useDirectGeminiAPI: options.useDirectGeminiAPI,
    });

    // テキストを読みやすく整形
    const formattingPreset = options?.textFormatting || "readable";
    return formatMessageContent(response, formattingPreset);
  }

  private async generateStreamWithGemini(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[],
    onChunk: (chunk: string) => void,
    options: {
      model: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      textFormatting?: "compact" | "readable" | "detailed";
    }
  ): Promise<string> {
    // Geminiモデル名からプレフィックスを除去
    const geminiModel = options.model.replace("google/", "");
    geminiClient.setModel(geminiModel);

    // APIキーが設定されている場合は優先して使用
    if (this.geminiApiKey) {
      geminiClient.setApiKey(this.geminiApiKey);
    }

    // OpenRouter APIキーも設定（フォールバック用）
    if (this.openRouterApiKey) {
      geminiClient.setOpenRouterApiKey(this.openRouterApiKey);
    }

    const messages = geminiClient.formatMessagesForGemini(
      systemPrompt,
      userMessage,
      conversationHistory
    );

    return await geminiClient.generateMessageStream(messages, onChunk, {
      model: geminiModel,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
    });
  }

  private async generateWithOpenRouter(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[],
    options: {
      model: string;
      apiKey: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      textFormatting?: "compact" | "readable" | "detailed";
    }
  ): Promise<string> {
    // OpenRouterのメッセージ形式に変換
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
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "AI Chat V3",
        },
        body: JSON.stringify({
          model: options.model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2048,
          top_p: options.topP || 1,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error Response:", errorText);
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText}`
      );
    }

    // Safe JSON parsing for OpenRouter response
    let data;
    try {
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        const errorText = await response.text();
        throw new Error(
          `OpenRouter APIがJSON以外のレスポンスを返しました: ${errorText}`
        );
      }
      const responseText = await response.text();
      data = this.safeJsonParse(responseText);
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        throw new Error(
          "OpenRouter APIレスポンスの解析に失敗しました。サーバーエラーの可能性があります。"
        );
      }
      throw parseError;
    }

    // Safe property access with fallback
    const aiResponse = data?.choices?.[0]?.message?.content || "";

    // テキストを読みやすく整形
    const formattingPreset = options?.textFormatting || "readable";
    return formatMessageContent(aiResponse, formattingPreset);
  }

  private async generateStreamWithOpenRouter(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[],
    onChunk: (chunk: string) => void,
    options: {
      model: string;
      apiKey: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      textFormatting?: "compact" | "readable" | "detailed";
    }
  ): Promise<string> {
    // OpenRouterのメッセージ形式に変換
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
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "AI Chat V3",
        },
        body: JSON.stringify({
          model: options.model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2048,
          top_p: options.topP || 1,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText}`
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response reader");
    }

    let fullResponse = "";
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = this.safeJsonParse(data);
              const content = parsed.choices[0]?.delta?.content || "";
              if (content) {
                fullResponse += content;
                onChunk(content);
              }
            } catch (_e) {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  }

  async testConnection(): Promise<{
    success: boolean;
    message: string;
    latency?: number;
  }> {
    const startTime = Date.now();

    try {
      const testMessage = await this.generateMessage(
        "You are a helpful assistant.",
        'Hello! Please respond with just "OK" to confirm the connection.',
        []
      );

      const latency = Date.now() - startTime;

      return {
        success: true,
        message: `接続成功! 応答: "${testMessage.slice(0, 50)}${
          testMessage.length > 50 ? "..." : ""
        }"`,
        latency,
      };
    } catch (error) {
      return {
        success: false,
        message: `接続失敗: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  getAvailableModels(): {
    provider: APIProvider;
    models: Array<{
      id: string;
      name: string;
      description?: string;
      provider?: string;
    }>;
  }[] {
    return [
      {
        provider: "gemini",
        models: [
          {
            id: "gemini-2.5-pro",
            name: "Gemini 2.5 Pro (最新)",
            description: "最高性能のGeminiモデル",
          },
          {
            id: "gemini-2.5-flash",
            name: "Gemini 2.5 Flash (高速)",
            description: "高速応答に最適化",
          },
          {
            id: "google/gemini-2.5-flash-lite",
            name: "Gemini 2.5 Flash Lite",
            description: "低レイテンシ・軽量版",
          },
        ],
      },
      {
        provider: "openrouter",
        models: [
          {
            id: "anthropic/claude-3-5-sonnet",
            name: "Claude 3.5 Sonnet",
            description: "Anthropic最新モデル",
          },
          {
            id: "openai/gpt-4o",
            name: "GPT-4o",
            description: "OpenAI最新モデル",
          },
          {
            id: "openai/gpt-4o-mini",
            name: "GPT-4o Mini",
            description: "コスト効率重視",
          },
          {
            id: "x-ai/grok-beta",
            name: "Grok Beta",
            description: "xAI開発モデル",
          },
          {
            id: "qwen/qwen3-30b-a3b-thinking-2507",
            name: "Qwen 3 30B Thinking",
            description: "アリババの思考モデル",
          },
          {
            id: "x-ai/grok-code-fast-1",
            name: "Grok Code Fast 1",
            description: "xAI高速コードモデル",
          },
          {
            id: "nousresearch/hermes-4-405b",
            name: "Hermes 4 405B",
            description: "Nous Research超大型モデル",
          },
        ],
      },
    ];
  }

  async refreshOpenRouterModels(): Promise<
    Array<{ id: string; name: string; description?: string }>
  > {
    if (!this.openRouterApiKey) {
      throw new Error("OpenRouter APIキーが設定されていません");
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          Authorization: `Bearer ${this.openRouterApiKey}`,
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "AI Chat V3",
        },
      });

      if (!response.ok) {
        throw new Error(
          `OpenRouter API error: ${response.status} ${response.statusText}`
        );
      }

      // Safe JSON parsing for models response
      let data: OpenRouterModelsResponse;
      try {
        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          const errorText = await response.text();
          throw new Error(
            `OpenRouter models APIがJSON以外のレスポンスを返しました: ${errorText}`
          );
        }
        const responseText = await response.text();
        data = this.safeJsonParse(responseText);
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          throw new Error(
            "OpenRouter models APIレスポンスの解析に失敗しました。"
          );
        }
        throw parseError;
      }

      return (
        data?.data?.map((model: OpenRouterModel) => ({
          id: model.id,
          name: model.name || model.id,
          description: model.description,
        })) || []
      );
    } catch (error) {
      console.error("Failed to fetch OpenRouter models:", error);
      throw error;
    }
  }

  clearOpenRouterApiKey() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("openrouter_api_key");
    }
    this.openRouterApiKey = null;
  }

  getProviderStatus(): {
    gemini: { available: boolean; reason?: string };
    openrouter: { available: boolean; reason?: string };
  } {
    return {
      gemini: {
        available: true,
        reason:
          "Gemini APIは常に利用可能です（ローカルファイルからキー読み込み）",
      },
      openrouter: {
        available: !!this.openRouterApiKey,
        reason: this.openRouterApiKey
          ? undefined
          : "APIキーが設定されていません",
      },
    };
  }

  /**
   * レート制限エラーかどうかを判定
   */
  private isRateLimitError(error: any): boolean {
    if (!error || !error.message) return false;

    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes("quota exceeded") ||
      errorMessage.includes("rate limit") ||
      errorMessage.includes("too many requests") ||
      errorMessage.includes("requests per minute") ||
      errorMessage.includes("resource_exhausted") ||
      errorMessage.includes("429") ||
      errorMessage.includes("limit") ||
      errorMessage.includes("exceeded")
    );
  }

  /**
   * フォールバック処理を試行
   */
  private async attemptFallback(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[],
    config: APIConfig,
    options?: Partial<APIConfig> & {
      openRouterApiKey?: string;
      geminiApiKey?: string;
      textFormatting?: "compact" | "readable" | "detailed";
    }
  ): Promise<string> {
    // Geminiでエラーが発生した場合、OpenRouterにフォールバック（設定されたモデルを使用）
    if (config.provider === "gemini" && this.openRouterApiKey) {
      console.log(
        `🔄 Falling back to OpenRouter with model: ${config.model} due to Gemini rate limit...`
      );
      try {
        // モデル名を正規化してOpenRouter互換形式に変換
        const cleanedModel = config.model.replace(/^google\//, '');
        
        // 公式にサポートされているGeminiモデルのみ
        const openRouterMapping: { [key: string]: string } = {
          'gemini-2.5-flash': 'google/gemini-2.5-flash',
          'gemini-2.5-pro': 'google/gemini-2.5-pro', 
          'gemini-2.5-flash-lite': 'google/gemini-2.5-flash-lite',
        };
        
        let fallbackModel = openRouterMapping[cleanedModel];
        if (!fallbackModel) {
          console.warn(`⚠️ No OpenRouter mapping for: ${cleanedModel}, using default`);
          fallbackModel = 'google/gemini-2.5-flash';
        } else {
          console.log(`✅ OpenRouter fallback mapping: ${cleanedModel} → ${fallbackModel}`);
        }

        return await this.generateWithOpenRouter(
          systemPrompt,
          userMessage,
          conversationHistory,
          {
            model: fallbackModel, // 設定されたモデルを使用
            temperature: config.temperature,
            maxTokens: config.max_tokens,
            topP: config.top_p,
            apiKey: this.openRouterApiKey,
            textFormatting: options?.textFormatting,
          }
        );
      } catch (fallbackError) {
        console.error("OpenRouter fallback also failed:", fallbackError);
        throw new Error(
          `Gemini APIのレート制限に達し、OpenRouterフォールバック（${
            config.model
          }）も失敗しました: ${
            fallbackError instanceof Error
              ? fallbackError.message
              : "Unknown error"
          }`
        );
      }
    }

    // OpenRouterでエラーが発生した場合、Geminiにフォールバック（レート制限でない場合のみ）
    if (config.provider === "openrouter") {
      try {
        return await this.generateWithGemini(
          systemPrompt,
          userMessage,
          conversationHistory,
          {
            model: "gemini-2.5-flash", // フォールバック用の高速モデル
            temperature: config.temperature,
            maxTokens: config.max_tokens,
            topP: config.top_p,
            textFormatting: options?.textFormatting,
          }
        );
      } catch (fallbackError) {
        console.error("Gemini fallback also failed:", fallbackError);
        throw new Error(
          `OpenRouterとGemini両方のAPIで問題が発生しました: ${
            fallbackError instanceof Error
              ? fallbackError.message
              : "Unknown error"
          }`
        );
      }
    }

    throw new Error("フォールバックオプションが利用できません");
  }
}

// シングルトンインスタンス
export const apiManager = new APIManager();
