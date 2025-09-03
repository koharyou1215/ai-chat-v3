// import { GoogleGenerativeAI } from "@google/generative-ai";

// const API_KEY = process.env.GEMINI_API_KEY || '';

// File system operations - Node.js only

// Gemini API インターフェース
export interface GeminiMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

export interface GeminiRequest {
  contents: GeminiMessage[];
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
}

export class GeminiClient {
  private apiKey: string;
  private openRouterApiKey: string;
  private baseURL: string;
  private model: string;
  private openRouterModelsCache: { models: string[]; timestamp: number } | null = null;
  private openRouterModelsCacheTTL = 60 * 60 * 1000; // 1時間のキャッシュ

  constructor() {
    this.apiKey = "";
    this.openRouterApiKey = "";
    this.baseURL = "https://generativelanguage.googleapis.com/v1beta/models";
    this.model = "gemini-2.5-flash"; // デフォルトは公式のgemini-2.5-flash
    this.initializeApiKeySync();
  }

  // モデル名の正規化（マイグレーションユーティリティを使用）
  private normalizeModelName(modelName: string): string {
    // レガシーモデル名の自動マイグレーションを実行
    const { migrateModelName } = require('@/utils/model-migration');
    const migration = migrateModelName(modelName);
    
    if (migration.wasLegacy && migration.message) {
      console.warn(`🚨 レガシーモデル検出: ${migration.message}`);
    }
    
    // google/ プレフィックスを除去して返す（Gemini API用）
    return migration.migratedModel.replace('google/', '');
  }

  // モデルを設定するメソッド
  setModel(modelName: string): void {
    // モデル名を正規化
    this.model = this.normalizeModelName(modelName);
    console.log("🌟 Gemini model set to:", this.model);
  }

  private initializeApiKeySync(): void {
    // 環境変数から同期的にAPIキーを取得（サーバーサイド優先）
    const apiKey =
      process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (apiKey) {
      this.apiKey = apiKey;
      // Gemini API Key loaded from environment variable (sync)
    } else {
      console.warn(
        "❌ GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY not found, API calls will fail"
      );
    }

    // OpenRouter API キーも初期化（フォールバック用）
    const openRouterKey =
      process.env.OPENROUTER_API_KEY ||
      process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (openRouterKey) {
      this.openRouterApiKey = openRouterKey;
      // OpenRouter API Key loaded for Gemini fallback
    }
  }

  // 明示的な初期化メソッド（必要時のみ使用）
  async initialize(): Promise<void> {
    try {
      if (!this.apiKey) {
        this.apiKey = await this.loadApiKeyFromFile();
        console.log("Gemini API key initialized successfully (async)");
      }
    } catch (error) {
      console.error("Failed to initialize API key:", error);
      throw error;
    }
  }

  private async loadApiKeyFromFile(): Promise<string> {
    try {
      // 環境変数を最初に確認（サーバーサイド優先）
      const apiKey =
        process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (apiKey) {
        // Gemini API Key loaded from environment variable
        return apiKey;
      }

      // ブラウザ環境では環境変数のみ使用
      if (typeof window !== "undefined") {
        throw new Error(
          "GEMINI_API_KEY または NEXT_PUBLIC_GEMINI_API_KEY 環境変数が設定されていません（ブラウザ環境）"
        );
      }

      // サーバー環境でのファイル読み込み（フォールバック）
      if (typeof window === "undefined") {
        try {
          const fs = await import("fs");
          const path = await import("path");
          const keyPath = path.default.join(
            process.cwd(),
            "gemini-api-key.txt"
          );
          const fileApiKey = fs.default.readFileSync(keyPath, "utf-8").trim();

          if (!fileApiKey) {
            throw new Error("GeminiAPIキーが空です");
          }

          console.log("Gemini API Key loaded from file");
          return fileApiKey;
        } catch (fileError) {
          console.error("ファイルからの読み込みも失敗:", fileError);
          throw new Error(
            "GEMINI_API_KEY または NEXT_PUBLIC_GEMINI_API_KEY 環境変数またはgemini-api-key.txtファイルが必要です"
          );
        }
      }
      
      // This should never be reached, but TypeScript needs it
      throw new Error("API key could not be loaded");
    } catch (error) {
      console.error("GeminiAPIキーの読み込みに失敗:", error);
      throw error;
    }
  }

  async generateMessage(
    messages: GeminiMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      topK?: number;
      model?: string;
      useDirectGeminiAPI?: boolean; // 設定のオーバーライド
    }
  ): Promise<string> {
    // モデルを一時的に上書きまたはデフォルトを使用（スコープを関数全体に拡張）
    const modelToUse = options?.model
      ? this.normalizeModelName(options.model)
      : this.model;

    // Gemini API直接使用フラグ（デフォルトはtrue）
    const useDirectAPI = options?.useDirectGeminiAPI ?? true;

    // OpenRouter経由を強制する場合
    if (!useDirectAPI && this.openRouterApiKey) {
      console.log('🚀 Using OpenRouter directly for Gemini (bypassing Gemini API)');
      return await this.generateViaOpenRouter(messages, {
        ...options,
        model: modelToUse
      });
    }

    try {
      // API key validation
      if (!this.apiKey) {
        console.error("Gemini API key is not set");
        await this.initialize(); // Try to initialize if not done
        if (!this.apiKey) {
          // Gemini APIキーがない場合、OpenRouterにフォールバック
          if (this.openRouterApiKey) {
            // No Gemini API key, using OpenRouter fallback
            return await this.generateViaOpenRouter(messages, {
              ...options,
              model: modelToUse
            });
          }
          throw new Error(
            "Gemini API key is not available. Please check GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY environment variable."
          );
        }
      }

      console.log("🔗 Gemini API Request:", {
        model: modelToUse,
        messageCount: messages.length,
        hasApiKey: !!this.apiKey,
      });

      const request: GeminiRequest = {
        contents: messages,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          topP: options?.topP ?? 0.9,
          topK: options?.topK ?? 40,
          maxOutputTokens: options?.maxTokens ?? 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
        ],
      };

      const url = `${this.baseURL}/${modelToUse}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(`Gemini API error: ${errorMessage}`);
      }

      const data: GeminiResponse = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("No candidates returned from Gemini API");
      }

      const candidate = data.candidates[0];
      console.log("Gemini API Response:", JSON.stringify(data, null, 2));

      if (
        !candidate.content ||
        !candidate.content.parts ||
        candidate.content.parts.length === 0
      ) {
        console.error("Gemini candidate details:", candidate);

        // Handle different finish reasons appropriately
        if (candidate.finishReason === "MAX_TOKENS") {
          console.warn("Gemini response truncated due to token limit");
          return "申し訳ございませんが、レスポンスが長すぎて切り詰められました。より短い入力でお試しください。";
        } else if (candidate.finishReason === "SAFETY") {
          throw new Error("Gemini response blocked by safety filters");
        } else if (candidate.finishReason === "RECITATION") {
          throw new Error("Gemini response blocked due to recitation concerns");
        } else if (candidate.finishReason) {
          throw new Error(
            `Gemini response blocked. Reason: ${candidate.finishReason}`
          );
        }

        throw new Error("No content parts in Gemini response");
      }

      return candidate.content.parts[0].text;
    } catch (error) {
      console.error("Gemini message generation failed:", error);

      // レート制限エラーの場合のみOpenRouterフォールバックを試行
      if (this.isQuotaOrRateLimitError(error)) {
        console.log(
          "🔄 Quota/Rate limit detected, attempting fallback via OpenRouter..."
        );
        
        // OpenRouter APIキーが設定されているか確認
        if (!this.openRouterApiKey) {
          console.error("OpenRouter API key not configured for fallback");
          throw new Error(
            "Gemini APIのクォータ制限に達しました。設定画面でOpenRouter APIキーを入力してフォールバックを有効にしてください。"
          );
        }
        
        try {
          // 設定されたモデル情報をフォールバックに渡す
          const fallbackOptions = {
            ...options,
            model: options?.model || modelToUse,
          };
          return await this.generateViaOpenRouter(messages, fallbackOptions);
        } catch (fallbackError) {
          console.error("OpenRouter fallback also failed:", fallbackError);
          
          const fallbackErrorMsg = fallbackError instanceof Error 
            ? fallbackError.message 
            : "Unknown error";
          
          // OpenRouterエラーの場合、より具体的な指示を提供
          if (fallbackErrorMsg.includes("401") || fallbackErrorMsg.includes("Unauthorized")) {
            throw new Error(
              "OpenRouter APIキーが無効です。設定で正しいAPIキーを入力してください。"
            );
          }
          
          throw new Error(
            `Gemini APIのクォータ制限に達しました。OpenRouterフォールバックも失敗しました: ${fallbackErrorMsg}`
          );
        }
      }

      // その他のエラーはそのまま投げる
      throw error;
    }
  }

  // OpenRouter経由でGeminiを呼び出す
  private async generateViaOpenRouter(
    messages: GeminiMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      topK?: number;
      model?: string;
    }
  ): Promise<string> {
    if (!this.openRouterApiKey) {
      throw new Error('OpenRouter API key not found for fallback. Please set OpenRouter API key.');
    }

    const openRouterMessages = messages.map((msg) => ({
      role: msg.role === 'model' ? 'assistant' : msg.role,
      content: msg.parts[0].text,
    }));

    // モデル名のマイグレーションを実行
    const { migrateModelName } = require('@/utils/model-migration');
    const originalModel = options?.model || this.model;
    const migration = migrateModelName(originalModel);
    
    if (migration.wasLegacy) {
      console.warn(`🚨 OpenRouterフォールバック時にレガシーモデル検出: ${migration.message}`);
    }
    
    const fallbackModel = migration.migratedModel; // すでに google/ プレフィックス付き

    if (originalModel !== fallbackModel) {
      // Model conversion applied
    }
    // Using OpenRouter fallback

    const available = await this.fetchOpenRouterModels();
    let chosenModel = fallbackModel;
    if (!available.includes(fallbackModel)) {
      const candidates = [
        fallbackModel,
        'google/gemini-2.5-flash',
        'google/gemini-2.5-pro',
        'google/gemini-2.5-flash-lite',
        'openai/gpt-4o-mini',
        'openai/gpt-4o',
        'anthropic/claude-3-5-sonnet',
      ];

      const found = candidates.find((c) => available.includes(c));
      if (found) {
        // OpenRouter mapped model not present, switching to available model
        chosenModel = found;
      } else {
        throw new Error(`No supported OpenRouter model available for fallback (tried: ${candidates.join(', ')})`);
      }
    }

    // Try request with a simple retry
    let lastError: any = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:3000',
            'X-Title': 'AI Chat V3',
          },
          body: JSON.stringify({
            model: chosenModel,
            messages: openRouterMessages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? 2048,
            top_p: options?.topP ?? 0.9,
          }),
        });

        if (!response.ok) {
          let errorMessage = response.statusText;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error?.message || errorMessage;
            
            // 無効なモデルIDエラーの場合、利用可能なモデルにフォールバック
            if (errorMessage.includes('is not a valid model') || 
                errorMessage.includes('not a valid model ID') || 
                errorMessage.includes('model not found') ||
                errorMessage.includes('does not exist')) {
              console.warn(`⚠️ Invalid model ${chosenModel}, attempting fallback to default model`);
              // デフォルトモデルで再試行（再帰呼び出しを避けるため直接設定）
              if (chosenModel !== 'google/gemini-2.5-flash') {
                chosenModel = 'google/gemini-2.5-flash';
                // Retrying with fallback model
                continue; // ループを続行して再試行
              }
            }
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
          }
          throw new Error(`OpenRouter API error: ${errorMessage}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
      } catch (err) {
        lastError = err;
        if (attempt === 1) await new Promise((r) => setTimeout(r, 300));
      }
    }

    throw lastError;
  }

  // Fetch available model ids from OpenRouter for runtime validation with caching.
  private async fetchOpenRouterModels(): Promise<string[]> {
    // キャッシュが有効な場合は返す
    if (this.openRouterModelsCache && 
        Date.now() - this.openRouterModelsCache.timestamp < this.openRouterModelsCacheTTL) {
      // Using cached OpenRouter models list
      return this.openRouterModelsCache.models;
    }

    if (!this.openRouterApiKey) {
      throw new Error('OpenRouter API key not found for model discovery');
    }

    // Fetching fresh OpenRouter models list
    const resp = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${this.openRouterApiKey}`,
        'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:3000',
        'X-Title': 'AI Chat V3',
      },
    });

    if (!resp.ok) {
      let text = resp.statusText;
      try {
        const body = await resp.text();
        text = body || text;
      } catch (_) {}
      throw new Error(`OpenRouter models API error: ${resp.status} ${text}`);
    }

    const body = await resp.json();
    const models = Array.isArray(body?.data) ? body.data.map((m: any) => m.id).filter(Boolean) : [];
    
    // キャッシュに保存
    this.openRouterModelsCache = {
      models,
      timestamp: Date.now()
    };
    
    // Cached OpenRouter models
    return models;
  }

  async generateMessageStream(
    messages: GeminiMessage[],
    onChunk: (chunk: string) => void,
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      topK?: number;
      model?: string;
    }
  ): Promise<string> {
    // モデルを一時的に上書きまたはデフォルトを使用
    const modelToUse = options?.model
      ? this.normalizeModelName(options.model)
      : this.model;
    
    try {
      const request: GeminiRequest = {
        contents: messages,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          topP: options?.topP ?? 0.9,
          topK: options?.topK ?? 40,
          maxOutputTokens: options?.maxTokens ?? 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
        ],
      };

        const url = `${this.baseURL}/${modelToUse}:streamGenerateContent?key=${this.apiKey}`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          let errorMessage = response.statusText;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error?.message || errorMessage;
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
          }
          throw new Error(`Gemini API error: ${errorMessage}`);
        }

        const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      let fullContent = "";
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonData = JSON.parse(line.slice(6));
                if (
                  jsonData.candidates &&
                  jsonData.candidates[0]?.content?.parts?.[0]?.text
                ) {
                  const text = jsonData.candidates[0].content.parts[0].text;
                  fullContent += text;
                  onChunk(text);
                }
              } catch (_parseError) {
                // JSON parsing error - skip this chunk
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return fullContent;
    } catch (error) {
      console.error("Gemini streaming generation failed:", error);
      throw error;
    }
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    // Gemini API key set dynamically
  }

  setOpenRouterApiKey(apiKey: string): void {
    this.openRouterApiKey = apiKey;
    // OpenRouter API key set for Gemini fallback
  }

  /**
   * クォータ制限やレート制限エラーかどうかを判定
   */
  private isQuotaOrRateLimitError(error: any): boolean {
    if (!error || !error.message) return false;

    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes("quota exceeded") ||
      errorMessage.includes("rate limit") ||
      errorMessage.includes("too many requests") ||
      errorMessage.includes("requests per minute") ||
      errorMessage.includes("resource_exhausted") ||
      errorMessage.includes("429")
    );
  }

  getAvailableModels(): string[] {
  // Only expose the three allowed models
  return ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
  }

  formatMessagesForGemini(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: Array<{
      role: "user" | "assistant";
      content: string;
    }> = []
  ): GeminiMessage[] {
    const messages: GeminiMessage[] = [];

    // システムプロンプトを最初のメッセージに統合
    let firstMessage = "";
    if (systemPrompt.trim()) {
      firstMessage = `${systemPrompt}\n\n`;
    }

    // 会話履歴を追加（英語混じりをクリーニング）
    for (const msg of conversationHistory) {
      // 会話履歴のクリーニング：英語混じりの文を修正
      const cleanedContent = this.cleanHistoryContent(msg.content);
      messages.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: cleanedContent }],
      });
    }

    // 現在のユーザーメッセージを追加（初回の場合はシステムプロンプトも含める）
    const finalUserMessage =
      conversationHistory.length === 0
        ? firstMessage + userMessage
        : userMessage;
    messages.push({
      role: "user",
      parts: [{ text: finalUserMessage }],
    });

    console.log("=== Gemini Messages Debug ===");
    console.log("System prompt:", systemPrompt.substring(0, 100) + "...");
    console.log("Conversation history length:", conversationHistory.length);
    console.log("Final messages:", JSON.stringify(messages, null, 2));
    console.log("==============================");

    return messages;
  }

  /**
   * 会話履歴の内容から英語混じりをクリーニング
   */
  private cleanHistoryContent(content: string): string {
    // よく混入する英語パターンを日本語に置換
    const replacements: Record<string, string> = {
      ' and ': 'と',
      ' but ': 'しかし',
      ' or ': 'または',
      ' so ': 'だから',
      ' because ': 'なぜなら',
      ' What': '何',
      'there': 'そこ',
      'あなた and ': 'あなたと',
      'です and ': 'ですし',
    };

    let cleaned = content;
    Object.entries(replacements).forEach(([eng, jpn]) => {
      const pattern = new RegExp(eng, 'gi');
      cleaned = cleaned.replace(pattern, jpn);
    });

    // 独立した英単語を検出して削除（固有名詞を除く）
    cleaned = cleaned.replace(
      /\b([a-z]{2,})\b/gi,
      (match) => {
        // 固有名詞（最初が大文字で短い）は残す
        if (match[0] === match[0].toUpperCase() && match.length <= 10) {
          return match;
        }
        return '';
      }
    );

    // 連続スペースを削除
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }
}

export const geminiClient = new GeminiClient();
