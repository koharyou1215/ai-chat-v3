import { geminiClient } from './api/gemini-client';
import { APIConfig, APIProvider } from '@/types';
import { formatMessageContent } from '@/utils/text-formatter';

export type { APIProvider };

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

  /**
   * JSON Parse with better error handling and text sanitization
   */
  private safeJsonParse(text: string): any {
    try {
      // Remove control characters that can break JSON parsing
      const sanitized = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      return JSON.parse(sanitized);
    } catch (error) {
      console.error('🚨 JSON Parse Error:', error);
      console.error('🔍 Raw text (first 200 chars):', text.substring(0, 200));
      console.error('🔍 Text length:', text.length);
      
      // Try to extract valid JSON from potentially malformed response
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) {
        try {
          const sanitized = jsonMatch[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
          console.warn('🔧 Attempting to parse extracted JSON...');
          return JSON.parse(sanitized);
        } catch (secondError) {
          console.error('🚨 Second JSON parse attempt failed:', secondError);
        }
      }
      
      throw new Error(`JSON解析エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  constructor() {
    this.currentConfig = {
      provider: 'gemini',
      model: 'google/gemini-2.5-flash',
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 0.9,
      frequency_penalty: 0.6,
      presence_penalty: 0.3,
      context_window: 20, // A reasonable default
    };
    
    // ブラウザ環境でのみローカルストレージから読み込み
    if (typeof window !== 'undefined') {
      this.loadOpenRouterKey();
      this.loadGeminiKey();
    }
  }

  private loadOpenRouterKey() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('openrouter_api_key');
      if (stored) {
        this.openRouterApiKey = this.decryptApiKey(stored);
      }
    } catch (error) {
      console.warn('Failed to load OpenRouter API key:', error);
    }
  }

  private loadGeminiKey() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('gemini_api_key');
      if (stored) {
        this.geminiApiKey = this.decryptApiKey(stored);
      }
    } catch (error) {
      console.warn('Failed to load Gemini API key:', error);
    }
  }

  private saveOpenRouterKey(key: string) {
    if (typeof window === 'undefined') return;
    
    try {
      const encrypted = this.encryptApiKey(key);
      localStorage.setItem('openrouter_api_key', encrypted);
      this.openRouterApiKey = key;
    } catch (error) {
      console.error('Failed to save OpenRouter API key:', error);
      throw error;
    }
  }

  private saveGeminiKey(key: string) {
    if (typeof window === 'undefined') return;
    
    try {
      const encrypted = this.encryptApiKey(key);
      localStorage.setItem('gemini_api_key', encrypted);
      this.geminiApiKey = key;
    } catch (error) {
      console.error('Failed to save Gemini API key:', error);
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
      ...config
    };

    if (config.apiKey && config.provider === 'openrouter') {
      this.saveOpenRouterKey(config.apiKey);
    }
  }

  getConfig(): APIConfig {
    return { ...this.currentConfig };
  }

  setOpenRouterApiKey(key: string) {
    this.saveOpenRouterKey(key);
    if (this.currentConfig.provider === 'openrouter') {
      this.currentConfig.apiKey = key;
    }
  }

  getOpenRouterApiKey(): string | null {
    return this.openRouterApiKey;
  }

  setGeminiApiKey(key: string) {
    this.saveGeminiKey(key);
    if (this.currentConfig.provider === 'gemini') {
      this.currentConfig.apiKey = key;
    }
  }

  getGeminiApiKey(): string | null {
    return this.geminiApiKey;
  }

  async generateMessage(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [],
    options?: Partial<APIConfig> & { openRouterApiKey?: string; geminiApiKey?: string; textFormatting?: 'compact' | 'readable' | 'detailed' }
  ): Promise<string> {
    const config = { ...this.currentConfig, ...options };
    const { provider, model, temperature, max_tokens, top_p } = config;

    // 開発環境でのログ出力
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      console.log(`\n🤖 [APIManager] ${provider}/${model} | User: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}" | Prompt: ${systemPrompt.length} chars`);
    }

    // options から渡された API キーを優先して使用
    if (options?.openRouterApiKey) {
      this.openRouterApiKey = options.openRouterApiKey;
    }
    
    if (options?.geminiApiKey) {
      this.geminiApiKey = options.geminiApiKey;
    }

    try {
      if (provider === 'gemini') {
        return await this.generateWithGemini(systemPrompt, userMessage, conversationHistory, {
          model,
          temperature,
          maxTokens: max_tokens,
          topP: top_p,
          textFormatting: options?.textFormatting
        });
      } else if (provider === 'openrouter') {
        if (!this.openRouterApiKey) {
          throw new Error('OpenRouter APIキーが設定されていません');
        }
        return await this.generateWithOpenRouter(systemPrompt, userMessage, conversationHistory, {
          model,
          temperature,
          max_tokens,
          top_p,
          apiKey: this.openRouterApiKey,
          textFormatting: options?.textFormatting
        });
      } else {
        throw new Error(`Unsupported API provider: ${provider}`);
      }
    } catch (error) {
      console.error('Message generation failed:', error);
      throw error;
    }
  }

  async generateMessageStream(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [],
    onChunk: (chunk: string) => void,
    options?: Partial<APIConfig> & { openRouterApiKey?: string; geminiApiKey?: string; textFormatting?: 'compact' | 'readable' | 'detailed' }
  ): Promise<string> {
    const config = { ...this.currentConfig, ...options };
    const { provider, model, temperature, max_tokens, top_p } = config;

    try {
      if (provider === 'gemini') {
        return await this.generateStreamWithGemini(systemPrompt, userMessage, conversationHistory, onChunk, {
          model,
          temperature,
          maxTokens: max_tokens,
          topP: top_p,
          textFormatting: options?.textFormatting
        });
      } else if (provider === 'openrouter') {
        if (!this.openRouterApiKey) {
          throw new Error('OpenRouter APIキーが設定されていません');
        }
        return await this.generateStreamWithOpenRouter(systemPrompt, userMessage, conversationHistory, onChunk, {
          model,
          temperature,
          max_tokens,
          top_p,
          apiKey: this.openRouterApiKey,
          textFormatting: options?.textFormatting
        });
      } else {
        throw new Error(`Unsupported API provider: ${provider}`);
      }
    } catch (error) {
      console.error('Streaming message generation failed:', error);
      throw error;
    }
  }

  private async generateWithGemini(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[],
    options: {
      model: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      textFormatting?: 'compact' | 'readable' | 'detailed';
    }
  ): Promise<string> {
    // Geminiモデル名からプレフィックスを除去
    const geminiModel = options.model.replace('google/', '');
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
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP
    });
    
    // テキストを読みやすく整形
    const formattingPreset = options?.textFormatting || 'readable';
    return formatMessageContent(response, formattingPreset);
  }

  private async generateStreamWithGemini(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[],
    onChunk: (chunk: string) => void,
    options: {
      model: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      textFormatting?: 'compact' | 'readable' | 'detailed';
    }
  ): Promise<string> {
    // Geminiモデル名からプレフィックスを除去
    const geminiModel = options.model.replace('google/', '');
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
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP
    });
  }

  private async generateWithOpenRouter(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[],
    options: {
      model: string;
      apiKey: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      textFormatting?: 'compact' | 'readable' | 'detailed';
    }
  ): Promise<string> {
    // OpenRouterのメッセージ形式に変換
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory,
      { role: 'user' as const, content: userMessage }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'AI Chat V3'
      },
      body: JSON.stringify({
        model: options.model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2048,
        top_p: options.topP || 1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API Error Response:', errorText);
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    // Safe JSON parsing for OpenRouter response
    let data;
    try {
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const errorText = await response.text();
        throw new Error(`OpenRouter APIがJSON以外のレスポンスを返しました: ${errorText}`);
      }
      const responseText = await response.text();
      data = this.safeJsonParse(responseText);
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        throw new Error('OpenRouter APIレスポンスの解析に失敗しました。サーバーエラーの可能性があります。');
      }
      throw parseError;
    }
    
    // Safe property access with fallback
    const aiResponse = data?.choices?.[0]?.message?.content || '';
    
    // テキストを読みやすく整形
    const formattingPreset = options?.textFormatting || 'readable';
    return formatMessageContent(aiResponse, formattingPreset);
  }

  private async generateStreamWithOpenRouter(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[],
    onChunk: (chunk: string) => void,
    options: {
      model: string;
      apiKey: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      textFormatting?: 'compact' | 'readable' | 'detailed';
    }
  ): Promise<string> {
    // OpenRouterのメッセージ形式に変換
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory,
      { role: 'user' as const, content: userMessage }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'AI Chat V3'
      },
      body: JSON.stringify({
        model: options.model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2048,
        top_p: options.topP || 1,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    let fullResponse = '';
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = this.safeJsonParse(data);
              const content = parsed.choices[0]?.delta?.content || '';
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
        'You are a helpful assistant.',
        'Hello! Please respond with just "OK" to confirm the connection.',
        []
      );
      
      const latency = Date.now() - startTime;
      
      return {
        success: true,
        message: `接続成功! 応答: "${testMessage.slice(0, 50)}${testMessage.length > 50 ? '...' : ''}"`,
        latency
      };
    } catch (error) {
      return {
        success: false,
        message: `接続失敗: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  getAvailableModels(): { provider: APIProvider; models: Array<{ id: string; name: string; description?: string; provider?: string }> }[] {
    return [
      {
        provider: 'gemini',
        models: [
          { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (最新)', description: '最高性能のGeminiモデル' },
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (高速)', description: '高速応答に最適化' },
          { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', description: '安定したパフォーマンス' }
        ]
      },
      {
        provider: 'openrouter',
        models: [
          { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Anthropic最新モデル' },
          { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'OpenAI最新モデル' },
          { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: 'コスト効率重視' },
          { id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', description: '高速Gemini 2.0' },
          { id: 'x-ai/grok-beta', name: 'Grok Beta', description: 'xAI開発モデル' },
          { id: 'qwen/qwen3-30b-a3b-thinking-2507', name: 'Qwen 3 30B Thinking', description: 'アリババの思考モデル' },
          { id: 'x-ai/grok-code-fast-1', name: 'Grok Code Fast 1', description: 'xAI高速コードモデル' },
          { id: 'nousresearch/hermes-4-405b', name: 'Hermes 4 405B', description: 'Nous Research超大型モデル' }
        ]
      }
    ];
  }

  async refreshOpenRouterModels(): Promise<Array<{ id: string; name: string; description?: string }>> {
    if (!this.openRouterApiKey) {
      throw new Error('OpenRouter APIキーが設定されていません');
    }
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'AI Chat V3'
        }
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      // Safe JSON parsing for models response
      let data: OpenRouterModelsResponse;
      try {
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          const errorText = await response.text();
          throw new Error(`OpenRouter models APIがJSON以外のレスポンスを返しました: ${errorText}`);
        }
        const responseText = await response.text();
        data = this.safeJsonParse(responseText);
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          throw new Error('OpenRouter models APIレスポンスの解析に失敗しました。');
        }
        throw parseError;
      }
      
      return data?.data?.map((model: OpenRouterModel) => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description
      })) || [];
    } catch (error) {
      console.error('Failed to fetch OpenRouter models:', error);
      throw error;
    }
  }

  clearOpenRouterApiKey() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('openrouter_api_key');
    }
    this.openRouterApiKey = null;
    if (this.currentConfig.provider === 'openrouter') {
      this.currentConfig.apiKey = undefined;
    }
  }

  getProviderStatus(): {
    gemini: { available: boolean; reason?: string };
    openrouter: { available: boolean; reason?: string };
  } {
    return {
      gemini: {
        available: true,
        reason: 'Gemini APIは常に利用可能です（ローカルファイルからキー読み込み）'
      },
      openrouter: {
        available: !!this.openRouterApiKey,
        reason: this.openRouterApiKey ? undefined : 'APIキーが設定されていません'
      }
    };
  }
}

// シングルトンインスタンス
export const apiManager = new APIManager();