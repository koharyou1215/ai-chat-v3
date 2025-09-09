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

export class SimpleAPIManagerV2 {
  private geminiApiKey: string | null = null;
  private openRouterApiKey: string | null = null;
  private useDirectGeminiAPI: boolean = false;
  private currentConfig: APIConfig;
  private apiKeyCache: { gemini: string | null; openRouter: string | null; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5000; // 5 seconds cache for API keys

  constructor() {
    // デフォルト設定
    this.currentConfig = {
      provider: "gemini",
      model: "gemini-2.5-flash",
      temperature: 0.7,
      max_tokens: 2048,
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
        // 方法1: 既存のAPIManagerと同じキー名を使用
        const savedData = localStorage.getItem("ai-chat-v3-storage");
        console.log(
          "🔍 ローカルストレージデータ:",
          savedData ? "存在" : "なし"
        );

        if (savedData) {
          const parsed = JSON.parse(savedData);
          console.log("🔍 パースされたデータ構造:", {
            hasState: !!parsed?.state,
            stateKeys: parsed?.state ? Object.keys(parsed.state) : [],
            geminiKey: parsed?.state?.geminiApiKey ? "設定済み" : "未設定",
            openRouterKey: parsed?.state?.openRouterApiKey
              ? "設定済み"
              : "未設定",
          });

          this.geminiApiKey = parsed?.state?.geminiApiKey || null;
          this.openRouterApiKey = parsed?.state?.openRouterApiKey || null;
          this.useDirectGeminiAPI = parsed?.state?.useDirectGeminiAPI || false;
        }

        // 方法2: 個別のlocalStorageキーからも読み込み（フォールバック）
        if (!this.geminiApiKey) {
          const geminiKey = localStorage.getItem("gemini_api_key");
          if (geminiKey) {
            this.geminiApiKey = geminiKey;
            console.log("🔑 個別キーからGemini APIキーを読み込み");
          }
        }

        if (!this.openRouterApiKey) {
          const openRouterKey = localStorage.getItem("openrouter_api_key");
          if (openRouterKey) {
            this.openRouterApiKey = openRouterKey;
            console.log("🔑 個別キーからOpenRouter APIキーを読み込み");
          }
        }

        console.log("🔑 APIキー読み込み結果:", {
          gemini: this.geminiApiKey ? "設定済み" : "未設定",
          openRouter: this.openRouterApiKey ? "設定済み" : "未設定",
          useDirectGeminiAPI: this.useDirectGeminiAPI,
        });
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

    console.log("🔑 最終的なAPIキー状態:", {
      gemini: this.geminiApiKey ? "設定済み" : "未設定",
      openRouter: this.openRouterApiKey ? "設定済み" : "未設定",
      useDirectGeminiAPI: this.useDirectGeminiAPI,
    });
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
    console.log("🔑 Gemini APIキー更新:", key ? "設定済み" : "未設定");
    if (typeof window !== "undefined") {
      localStorage.setItem("gemini_api_key", key);
    }
  }

  setOpenRouterApiKey(key: string) {
    this.openRouterApiKey = key;
    console.log("🔑 OpenRouter APIキー更新:", key ? "設定済み" : "未設定");
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
   * メッセージ生成 - シンプルなモデルベース分岐のみ
   */
  async generateMessage(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[] = [],
    options?: Partial<APIConfig>
  ): Promise<string> {
    console.log("🔧 [SimpleAPIManagerV2] generateMessage called with:", {
      systemPrompt: systemPrompt.substring(0, 100) + "...",
      userMessage: userMessage.substring(0, 50) + "...",
      historyLength: conversationHistory.length,
      options,
    });

    // 🔧 リアルタイムでAPIキーを取得（Zustandストアから）
    this.refreshApiKeys();

    const rawModel = options?.model || "gemini-2.5-flash";
    const model = this.validateAndCleanModel(rawModel);

    console.log(`🚀 [SimpleAPIManagerV2] Generating with model: ${model}`);
    console.log(`🔑 [SimpleAPIManagerV2] API Keys status:`, {
      gemini: this.geminiApiKey ? "✅ 設定済み" : "❌ 未設定",
      openRouter: this.openRouterApiKey ? "✅ 設定済み" : "❌ 未設定",
      useDirectGeminiAPI: this.useDirectGeminiAPI
    });

    // useDirectGeminiAPIフラグを考慮した分岐
    if (this.isGeminiModel(model) && this.useDirectGeminiAPI && this.geminiApiKey) {
      // Geminiモデルかつ直接API使用が有効な場合
      console.log("🔥 Gemini APIを直接使用します");
      return await this.generateWithGemini(
        systemPrompt,
        userMessage,
        conversationHistory,
        options
      );
    } else if (this.openRouterApiKey) {
      // OpenRouter経由で使用
      console.log("🌐 OpenRouter経由で使用します");
      return await this.generateWithOpenRouter(
        systemPrompt,
        userMessage,
        conversationHistory,
        model,
        options
      );
    } else {
      // APIキーが設定されていない場合
      const errorMsg = this.isGeminiModel(model) 
        ? "Gemini APIキーが設定されていません。設定画面でAPIキーを入力してください。"
        : "OpenRouter APIキーが設定されていません。設定画面でAPIキーを入力してください。";
      console.error("❌ APIキー未設定エラー:", errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * ZustandストアからリアルタイムでAPIキーを取得（キャッシュ付き）
   */
  private refreshApiKeys() {
    if (typeof window !== "undefined") {
      try {
        // Check cache first
        const now = Date.now();
        if (this.apiKeyCache && (now - this.apiKeyCache.timestamp) < this.CACHE_TTL) {
          this.geminiApiKey = this.apiKeyCache.gemini;
          this.openRouterApiKey = this.apiKeyCache.openRouter;
          return;
        }
        
        const savedData = localStorage.getItem("ai-chat-v3-storage");
        if (savedData) {
          const parsed = JSON.parse(savedData);
          const newGeminiKey = parsed?.state?.geminiApiKey;
          const newOpenRouterKey = parsed?.state?.openRouterApiKey;
          const newUseDirectGeminiAPI = parsed?.state?.useDirectGeminiAPI;
          
          // Update cache
          this.apiKeyCache = {
            gemini: newGeminiKey || null,
            openRouter: newOpenRouterKey || null,
            timestamp: now
          };

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
        }
      } catch (error) {
        console.warn("APIキーのリアルタイム取得に失敗:", error);
      }
    }
  }

  /**
   * モデル名を検証・正規化する（強化版）
   */
  private validateAndCleanModel(model: string): string {
    console.log(`🧹 Model validation - Input: ${model}`);
    
    // Step 0: Immediate rejection of known invalid patterns
    if (model.includes('-8b') || model.includes('-4b') || model.includes('flash-8b')) {
      console.warn(`🚫 Immediately rejecting invalid model: ${model} -> gemini-2.5-flash`);
      return 'gemini-2.5-flash';
    }
    
    // Step 1: Remove invalid prefixes and suffixes (強化版)
    let cleanModel = model
      .replace(/^google\//, '')     // Remove google/ prefix
      .replace(/-8b$/, '')         // Remove invalid -8b suffix
      .replace(/-4b$/, '')         // Remove invalid -4b suffix
      .replace(/-light$/, '-flash-light') // Fix light variant naming
      .replace(/\s+/g, '')         // Remove all whitespace
      .toLowerCase();              // Normalize to lowercase
    
    console.log(`🧹 After cleaning: ${cleanModel}`);
    
    // Step 2: Handle completely invalid model names (including flash-8b in original)
    if (cleanModel.includes('flash-8b') || cleanModel.includes('flash8b') || 
        model.toLowerCase().includes('flash-8b')) {
      console.warn(`⚠️ Detected invalid model with -8b suffix: ${model} -> gemini-2.5-flash`);
      cleanModel = 'gemini-2.5-flash';
    }
    
    // Step 3: Map old model names to new ones (1.5 -> 2.5)
    const modelMapping: { [key: string]: string } = {
      'gemini-1.5-flash': 'gemini-2.5-flash',
      'gemini-1.5-flash-light': 'gemini-2.5-flash-light', 
      'gemini-1.5-pro': 'gemini-2.5-pro',
      // Handle variants
      'gemini-1.5-flash-8b': 'gemini-2.5-flash',
      'gemini-1.5-flash-4b': 'gemini-2.5-flash',
      'geminiflash': 'gemini-2.5-flash',
      'geminipro': 'gemini-2.5-pro'
    };
    
    if (modelMapping[cleanModel]) {
      console.log(`🔄 Model mapping: ${cleanModel} -> ${modelMapping[cleanModel]}`);
      cleanModel = modelMapping[cleanModel];
    }
    
    // Step 4: Validate against allowed models
    const allowedGeminiModels = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-light',
      'gemini-2.5-pro'
    ];
    
    // If it's supposed to be a Gemini model but invalid, default to flash
    if ((model.toLowerCase().includes('gemini') || cleanModel.includes('gemini')) 
        && !allowedGeminiModels.includes(cleanModel)) {
      console.warn(`❌ Invalid Gemini model: ${model} -> defaulting to gemini-2.5-flash`);
      cleanModel = 'gemini-2.5-flash';
    }
    
    // Step 5: Final validation - if still not valid, use default
    if (!allowedGeminiModels.includes(cleanModel) && cleanModel.includes('gemini')) {
      console.error(`🚨 Critical: Could not validate Gemini model: ${model} -> forcing gemini-2.5-flash`);
      cleanModel = 'gemini-2.5-flash';
    }
    
    console.log(`✅ Final validated model: ${cleanModel}`);
    return cleanModel;
  }

  /**
   * Geminiモデルかどうかの判定（許可された3つのみ）
   */
  private isGeminiModel(model: string): boolean {
    const cleanModel = this.validateAndCleanModel(model);
    const allowedModels = [
      "gemini-2.5-flash",
      "gemini-2.5-flash-light",
      "gemini-2.5-pro",
    ];

    return allowedModels.includes(cleanModel);
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

    const model = options?.model || "gemini-2.5-flash";
    const cleanModel = this.validateAndCleanModel(model);

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
  ): Promise<string> {
    if (!this.openRouterApiKey) {
      throw new Error(
        `OpenRouter APIキーが設定されていません。${model}を使用するにはOpenRouter APIキーが必要です。`
      );
    }

    // 🚨 CRITICAL: Validate model FIRST before any processing
    const validatedModel = this.validateAndCleanModel(model);
    
    // Debug logging to trace model transformation
    console.log('🔍 Model validation chain:', {
      inputModel: model,
      validatedModel: validatedModel,
      isGemini: this.isGeminiModel(validatedModel)
    });
    
    // For Gemini models via OpenRouter, add the google/ prefix if needed
    let openRouterModel = validatedModel;
    if (this.isGeminiModel(validatedModel) && !validatedModel.startsWith('google/')) {
      openRouterModel = `google/${validatedModel}`;
    }
    
    console.log(`🌐 Using OpenRouter with model: ${model} -> ${openRouterModel}`);

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
          model: openRouterModel,
          messages,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.max_tokens || 2048,
          top_p: options?.top_p || 0.9,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🚨 OpenRouter API Error (${response.status}):`, errorText);
      
      // Better error messages for common issues
      if (response.status === 400 && errorText.includes('not a valid model')) {
        throw new Error(`選択されたモデル "${openRouterModel}" は利用できません。設定画面で有効なモデルを選択してください。`);
      } else if (response.status === 429) {
        throw new Error('API使用制限に達しました。しばらく待ってから再試行してください。');
      } else if (response.status === 401) {
        throw new Error('OpenRouter APIキーが無効です。設定画面で正しいAPIキーを入力してください。');
      }
      
      throw new Error(
        `OpenRouter API error (${response.status}): ${errorText}`
      );
    }

    // 🛡️ Safe JSON parsing
    let data;
    let responseText: string;
    try {
      responseText = await response.text();
      console.log('🔍 OpenRouter Response (first 200 chars):', responseText.substring(0, 200));
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('❌ JSON Parse Error:', jsonError);
      console.error('❌ Invalid JSON Response:', responseText);
      
      // エラーレスポンスがHTML形式の場合の処理
      if (responseText && responseText.includes('<html')) {
        throw new Error('OpenRouterサービスが一時的に利用できません。しばらく待ってから再試行してください。');
      }
      
      throw new Error(`OpenRouterからの応答を解析できませんでした: ${String(jsonError).substring(0, 100)}`);
    }
    
    // デバッグ情報を追加
    console.log('🔍 OpenRouter Response:', {
      hasData: !!data,
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length || 0,
      firstChoice: data.choices?.[0],
      error: data.error
    });
    
    // エラーレスポンスのチェック
    if (data.error) {
      throw new Error(`OpenRouter APIエラー: ${data.error.message || data.error}`);
    }
    
    const content = data.choices?.[0]?.message?.content;
    
    if (!content || content.trim() === '') {
      console.error('❌ OpenRouter空レスポンス:', {
        originalModel: model,
        validatedModel: openRouterModel,
        messageCount: messages.length,
        systemPromptLength: systemPrompt.length,
        userMessageLength: userMessage.length,
        response: data
      });
      throw new Error(`OpenRouterからの応答が空です。モデル: ${openRouterModel} (元: ${model})`);
    }

    return formatMessageContent(content, "readable");
  }

  /**
   * ストリーミング生成（必要に応じて）
   */
  async generateMessageStream(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[] = [],
    onChunk: (chunk: string) => void,
    options?: Partial<APIConfig>
  ): Promise<string> {
    const rawModel = options?.model || "gemini-2.5-flash";
    const model = this.validateAndCleanModel(rawModel);

    if (this.isGeminiModel(model)) {
      // Geminiストリーミング
      if (!this.geminiApiKey) {
        throw new Error("Gemini APIキーが設定されていません");
      }
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
      const result = await this.generateWithOpenRouter(
        systemPrompt,
        userMessage,
        conversationHistory,
        model,
        options
      );
      onChunk(result); // 一度に全体を送信
      return result;
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
          { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
          { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku" },
          { id: "openai/gpt-4", name: "GPT-4" },
          { id: "openai/gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
          { id: "meta-llama/llama-3.1-405b", name: "Llama 3.1 405B" },
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