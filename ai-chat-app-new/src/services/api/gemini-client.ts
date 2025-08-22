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
  private baseURL: string;
  private model: string;

  constructor() {
    this.apiKey = '';
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.model = 'gemini-2.5-pro'; // デフォルト値をプレフィックスなしに修正
    this.initializeApiKey();
  }

  private async initializeApiKey() {
    try {
      this.apiKey = await this.loadApiKeyFromFile();
    } catch (error) {
      console.error('Failed to initialize API key:', error);
    }
  }

  private async loadApiKeyFromFile(): Promise<string> {
    try {
      // 環境変数を最初に確認
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (apiKey) {
        console.log('Gemini API Key loaded from environment variable');
        return apiKey;
      }

      // ブラウザ環境では環境変数のみ使用
      if (typeof window !== 'undefined') {
        throw new Error('NEXT_PUBLIC_GEMINI_API_KEY環境変数が設定されていません（ブラウザ環境）');
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
          throw new Error('NEXT_PUBLIC_GEMINI_API_KEY環境変数またはgemini-api-key.txtファイルが必要です');
        }
      }
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
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No candidates returned from Gemini API');
      }

      const candidate = data.candidates[0];
      console.log('Gemini API Response:', JSON.stringify(data, null, 2));
      
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        console.error('Gemini candidate details:', candidate);
        if (candidate.finishReason) {
          throw new Error(`Gemini response blocked. Reason: ${candidate.finishReason}`);
        }
        throw new Error('No content parts in Gemini response');
      }

      return candidate.content.parts[0].text;
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
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
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
      console.error('Gemini streaming generation failed:', error);
      throw error;
    }
  }

  setModel(model: string) {
    // "google/" プレフィックスがあれば除去してモデル名を設定
    this.model = model.startsWith('google/') ? model.substring(7) : model;
  }

  getAvailableModels(): string[] {
    return [
      'pro',
      'gemini-2.5-flash',
      'gemini-1.0-pro'
    ];
  }

  formatMessagesForGemini(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): GeminiMessage[] {
    const messages: GeminiMessage[] = [];

    // システムプロンプトを最初のuser messageとして追加
    if (systemPrompt.trim()) {
      messages.push({
        role: 'user',
        parts: [{ text: systemPrompt }]
      });
      
      // システムプロンプトに対するモデルの応答を追加
      messages.push({
        role: 'model',
        parts: [{ text: '理解しました。指示に従って応答します。' }]
      });
    }

    // 会話履歴を追加
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    // 現在のユーザーメッセージを追加
    messages.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    return messages;
  }
}

export const geminiClient = new GeminiClient();gemini-2.5-