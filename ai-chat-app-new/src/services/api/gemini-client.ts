// import { GoogleGenerativeAI } from "@google/generative-ai";

// const API_KEY = process.env.GEMINI_API_KEY || '';

// File system operations - Node.js only

// Gemini API インターフェース
export interface GeminiMessage {
  role: 'user' | 'model';
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

  constructor() {
    this.apiKey = '';
    this.openRouterApiKey = '';
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.model = 'gemini-2.5-pro'; // Gemini 2.5 Proモデル名
    this.initializeApiKeySync();
  }

  private initializeApiKeySync(): void {
    // 環境変数から同期的にAPIキーを取得（サーバーサイド優先）
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (apiKey) {
      this.apiKey = apiKey;
      console.log('✅ Gemini API Key loaded from environment variable (sync)');
    } else {
      console.warn('❌ GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY not found, API calls will fail');
    }

    // OpenRouter API キーも初期化
    const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (openRouterKey) {
      this.openRouterApiKey = openRouterKey;
      console.log('✅ OpenRouter API Key loaded');
    }
  }

  // 明示的な初期化メソッド（必要時のみ使用）
  async initialize(): Promise<void> {
    try {
      if (!this.apiKey) {
        this.apiKey = await this.loadApiKeyFromFile();
        console.log('Gemini API key initialized successfully (async)');
      }
    } catch (error) {
      console.error('Failed to initialize API key:', error);
      throw error;
    }
  }

  private async loadApiKeyFromFile(): Promise<string> {
    try {
      // 環境変数を最初に確認（サーバーサイド優先）
      const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (apiKey) {
        console.log('✅ Gemini API Key loaded from environment variable');
        return apiKey;
      }

      // ブラウザ環境では環境変数のみ使用
      if (typeof window !== 'undefined') {
        throw new Error('GEMINI_API_KEY または NEXT_PUBLIC_GEMINI_API_KEY 環境変数が設定されていません（ブラウザ環境）');
      }
      
      // サーバー環境でのファイル読み込み（フォールバック）
      if (typeof window === 'undefined') {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const keyPath = path.default.join(process.cwd(), 'gemini-api-key.txt');
          const fileApiKey = fs.default.readFileSync(keyPath, 'utf-8').trim();
          
          if (!fileApiKey) {
            throw new Error('GeminiAPIキーが空です');
          }
          
          console.log('Gemini API Key loaded from file');
          return fileApiKey;
        } catch (fileError) {
          console.error('ファイルからの読み込みも失敗:', fileError);
          throw new Error('GEMINI_API_KEY または NEXT_PUBLIC_GEMINI_API_KEY 環境変数またはgemini-api-key.txtファイルが必要です');
        }
      }
      
      throw new Error('GEMINI_API_KEY または NEXT_PUBLIC_GEMINI_API_KEY 環境変数またはgemini-api-key.txtファイルが必要です');
    } catch (error) {
      console.error('GeminiAPIキーの読み込みに失敗:', error);
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
    }
  ): Promise<string> {
    try {
      // API key validation
      if (!this.apiKey) {
        console.error('Gemini API key is not set');
        await this.initialize(); // Try to initialize if not done
        if (!this.apiKey) {
          throw new Error('Gemini API key is not available. Please check GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY environment variable.');
        }
      }

      console.log('🔗 Gemini API Request:', { 
        model: this.model, 
        messageCount: messages.length,
        hasApiKey: !!this.apiKey
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
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE'
          }
        ]
      };

      const url = `${this.baseURL}/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
          
          // Quota exceededエラーの特別処理
          if (errorMessage.includes('Quota exceeded') || response.status === 429) {
            console.error('⚠️ Gemini API使用制限に達しました。');

            // リトライ情報を含むエラーをスロー
            const quotaError = new Error('Gemini APIの使用制限に達しました。約1分後に再試行してください。');
            (quotaError as any).retryAfter = 60000; // 60秒後にリトライ
            (quotaError as any).isQuotaError = true;
            throw quotaError;
          }
          
          // モデルが見つからないエラー
          if (errorMessage.includes('not found') || errorMessage.includes('is not a valid model')) {
            console.error(`❌ モデル ${this.model} が見つかりません。gemini-2.5-flash、gemini-2.5-flash-light、またはgemini-2.5-proを使用してください。`);
            throw new Error(`無効なGeminiモデル: ${this.model}。gemini-2.5-flash、gemini-2.5-flash-light、またはgemini-2.5-proのいずれかを使用してください。`);
          }
        } catch (parseError) {
          // JSONパースエラーの場合はテキストレスポンスを試す
          if (parseError instanceof SyntaxError) {
            try {
              errorMessage = await response.text();
            } catch {
              // テキスト読み取りも失敗した場合はステータステキストを使用
            }
          } else {
            // 特別なエラーの場合は再スロー
            throw parseError;
          }
        }
        throw new Error(`Gemini API error: ${errorMessage}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No candidates returned from Gemini API');
      }

      const candidate = data.candidates[0];
      console.log('Gemini API Response:', JSON.stringify(data, null, 2));

      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        console.error('Gemini candidate details:', candidate);

        // Handle different finish reasons appropriately
        if (candidate.finishReason === 'MAX_TOKENS') {
          console.warn('⚠️ Gemini応答がトークン制限で切り詰められました');
          // 🔧 部分的な応答がある場合はそれを返す（インスピレーションパースを試行可能にする）
          if (candidate.content?.parts?.[0]?.text) {
            console.log('✅ 部分的な応答を返します');
            return candidate.content.parts[0].text;
          }
          throw new Error('MAX_TOKENS: トークン制限に達しました。max_tokensを増やしてください。');
        } else if (candidate.finishReason === 'SAFETY') {
          throw new Error('Gemini応答が安全フィルターでブロックされました');
        } else if (candidate.finishReason === 'RECITATION') {
          throw new Error('Gemini応答が引用検出でブロックされました');
        } else if (candidate.finishReason) {
          throw new Error(`Gemini応答がブロックされました: ${candidate.finishReason}`);
        }

        throw new Error('No content parts in Gemini response');
      }

      // 🔧 FIX: 空文字列チェックを追加（空の応答を防ぐ）
      const responseText = candidate.content.parts[0].text;
      if (!responseText || responseText.trim().length === 0) {
        console.error('🚨 Gemini API returned empty text:', {
          finishReason: candidate.finishReason,
          hasContent: !!candidate.content,
          hasParts: !!candidate.content?.parts,
          partsLength: candidate.content?.parts?.length
        });
        throw new Error('Gemini APIから空の応答が返されました。プロンプトを変更するか、別のモデルをお試しください。');
      }

      return responseText;
    } catch (error) {
      console.error('Gemini message generation failed:', error);
      throw error;
    }
  }


  async generateMessageStream(
    messages: GeminiMessage[],
    onChunk: (chunk: string) => void,
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      topK?: number;
    }
  ): Promise<string> {
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
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE'
          }
        ]
      };

      const url = `${this.baseURL}/${this.model}:streamGenerateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
          
          // Quota exceededエラーの特別処理
          if (errorMessage.includes('Quota exceeded') || response.status === 429) {
            console.error('⚠️ Gemini API使用制限に達しました。');

            // リトライ情報を含むエラーをスロー
            const quotaError = new Error('Gemini APIの使用制限に達しました。約1分後に再試行してください。');
            (quotaError as any).retryAfter = 60000; // 60秒後にリトライ
            (quotaError as any).isQuotaError = true;
            throw quotaError;
          }
          
          // モデルが見つからないエラー
          if (errorMessage.includes('not found') || errorMessage.includes('is not a valid model')) {
            console.error(`❌ モデル ${this.model} が見つかりません。gemini-2.5-flash、gemini-2.5-flash-light、またはgemini-2.5-proを使用してください。`);
            throw new Error(`無効なGeminiモデル: ${this.model}。gemini-2.5-flash、gemini-2.5-flash-light、またはgemini-2.5-proのいずれかを使用してください。`);
          }
        } catch (parseError) {
          // JSONパースエラーの場合はテキストレスポンスを試す
          if (parseError instanceof SyntaxError) {
            try {
              errorMessage = await response.text();
            } catch {
              // テキスト読み取りも失敗した場合はステータステキストを使用
            }
          } else {
            // 特別なエラーの場合は再スロー
            throw parseError;
          }
        }
        throw new Error(`Gemini API error: ${errorMessage}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let fullContent = '';
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonData = JSON.parse(line.slice(6));
                if (jsonData.candidates && jsonData.candidates[0]?.content?.parts?.[0]?.text) {
                  const text = jsonData.candidates[0].content.parts[0].text;
                  fullContent += text;
                  onChunk(text);
                }
              } catch (parseError) {
                // 🔧 JSONパースエラーを警告として出力（完全に黙殺しない）
                console.warn('⚠️ Streaming JSON parse error:', {
                  error: parseError instanceof Error ? parseError.message : String(parseError),
                  chunk: line.substring(0, 100)
                });
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // 🔧 FIX: 空文字列チェックを追加（ストリーミング版）
      if (!fullContent || fullContent.trim().length === 0) {
        console.error('🚨 Gemini Streaming API returned empty content');
        throw new Error('Gemini Streaming APIから空の応答が返されました。プロンプトを変更するか、別のモデルをお試しください。');
      }

      return fullContent;
    } catch (error) {
      console.error('Gemini streaming generation failed:', error);
      throw error;
    }
  }

  setModel(model: string) {
    // "google/" プレフィックスがあれば除去
    let cleanModel = model.startsWith('google/') ? model.substring(7) : model;
    
    // 不正なサフィックス(-8b など)を除去
    if (cleanModel.endsWith('-8b')) {
      console.warn(`⚠️ 不正なモデルサフィックス '-8b' を除去: ${cleanModel} → ${cleanModel.replace('-8b', '')}`);
      cleanModel = cleanModel.replace('-8b', '');
    }
    
    // 2.5系以外のモデル名は一切受け付けない
    // モデル名の変換処理は削除
    
    // 有効なモデルかチェック
    const validModels = this.getAvailableModels();
    if (!validModels.includes(cleanModel)) {
      console.error(`❌ 無効なGeminiモデル: ${cleanModel}. デフォルトのgemini-2.5-flashを使用します`);
      cleanModel = 'gemini-2.5-flash';
    }
    
    this.model = cleanModel;
    console.log(`✅ Geminiモデル設定: ${this.model}`);
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    console.log('✅ Gemini API key set dynamically');
  }

  setOpenRouterApiKey(apiKey: string): void {
    this.openRouterApiKey = apiKey;
    console.log('✅ OpenRouter API key set');
  }

  getAvailableModels(): string[] {
    // 3つのモデルのみをサポート
    return [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-light'
    ];
  }

  formatMessagesForGemini(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): GeminiMessage[] {
    const messages: GeminiMessage[] = [];

    // 会話履歴を追加
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    // システムプロンプトとユーザーメッセージを結合（毎回送信）
    let finalUserMessage = userMessage;
    if (systemPrompt.trim()) {
      finalUserMessage = `${systemPrompt}\n\n${userMessage}`;
    }
    
    messages.push({
      role: 'user',
      parts: [{ text: finalUserMessage }]
    });

    console.log('=== Gemini Messages Debug ===');
    console.log('System prompt:', systemPrompt.substring(0, 100) + '...');
    console.log('Conversation history length:', conversationHistory.length);
    console.log('Final messages:', JSON.stringify(messages, null, 2));
    console.log('==============================');

    return messages;
  }
}

// 遅延初期化パターンで、実際に使用されるまでインスタンスを作成しない
let geminiClientInstance: GeminiClient | null = null;

export const getGeminiClient = (): GeminiClient => {
  if (!geminiClientInstance) {
    geminiClientInstance = new GeminiClient();
  }
  return geminiClientInstance;
};

// 後方互換性のため、既存コードが動作するようにgetter経由でアクセス
export const geminiClient = new Proxy({} as GeminiClient, {
  get(target, prop) {
    return getGeminiClient()[prop as keyof GeminiClient];
  },
  set(target, prop, value) {
    const client = getGeminiClient();
    (client as any)[prop] = value;
    return true;
  }
});