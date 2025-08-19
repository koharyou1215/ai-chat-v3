import { geminiClient } from './api/gemini-client';
import { openRouterClient } from './api/openrouter-client';
import { APIConfig, APIProvider } from '@/types';

export type { APIProvider };

export class APIManager {
  private currentConfig: APIConfig;
  private openRouterApiKey: string | null = null;

  constructor() {
    this.currentConfig = {
      provider: 'gemini',
      model: 'google/gemini-2.5-pro',
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
      context_window: 20, // A reasonable default
    };
    
    // ブラウザ環境でのみローカルストレージから読み込み
    if (typeof window !== 'undefined') {
      this.loadOpenRouterKey();
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

  async generateMessage(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [],
    options?: Partial<APIConfig>
  ): Promise<string> {
    const config = { ...this.currentConfig, ...options };
    const { provider, model, temperature, max_tokens, top_p } = config;

    try {
      if (provider === 'gemini') {
        return await this.generateWithGemini(systemPrompt, userMessage, conversationHistory, {
          model,
          temperature,
          max_tokens,
          top_p
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
          apiKey: this.openRouterApiKey
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
    options?: Partial<APIConfig>
  ): Promise<string> {
    const config = { ...this.currentConfig, ...options };
    const { provider, model, temperature, max_tokens, top_p } = config;

    try {
      if (provider === 'gemini') {
        return await this.generateStreamWithGemini(systemPrompt, userMessage, conversationHistory, onChunk, {
          model,
          temperature,
          max_tokens,
          top_p
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
          apiKey: this.openRouterApiKey
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
    }
  ): Promise<string> {
    geminiClient.setModel(options.model);
    
    const messages = geminiClient.formatMessagesForGemini(
      systemPrompt,
      userMessage,
      conversationHistory
    );

    return await geminiClient.generateMessage(messages, {
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP
    });
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
    }
  ): Promise<string> {
    geminiClient.setModel(options.model);
    
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
    }
  ): Promise<string> {
    const messages = openRouterClient.formatMessagesForOpenRouter(
      systemPrompt,
      userMessage,
      conversationHistory
    );

    const response = await openRouterClient.generateMessage(options.apiKey, messages, {
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP
    });
    
    return response;
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
    }
  ): Promise<string> {
    const messages = openRouterClient.formatMessagesForOpenRouter(
      systemPrompt,
      userMessage,
      conversationHistory
    );

    return await openRouterClient.generateMessageStream(options.apiKey, messages, onChunk, {
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP
    });
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
          { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro (最新)', description: '最高性能のGeminiモデル' },
          { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash (高速)', description: '高速応答に最適化' },
          { id: 'gemini-1.0-pro-latest', name: 'Gemini 1.0 Pro', description: '安定したパフォーマンス' }
        ]
      },
      {
        provider: 'openrouter',
        models: openRouterClient.getPopularModels()
      }
    ];
  }

  async refreshOpenRouterModels(): Promise<Array<{ id: string; name: string; description?: string }>> {
    if (!this.openRouterApiKey) {
      throw new Error('OpenRouter APIキーが設定されていません');
    }
    
    try {
      return await openRouterClient.getModels(this.openRouterApiKey);
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