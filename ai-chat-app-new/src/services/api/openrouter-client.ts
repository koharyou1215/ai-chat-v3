// OpenRouter API インターフェース
export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
}

export class OpenRouterClient {
  private baseURL: string;
  private defaultModel: string;

  constructor() {
    this.baseURL = 'https://openrouter.ai/api/v1/chat/completions';
    this.defaultModel = 'anthropic/claude-3-sonnet';
  }

  async generateMessage(
    apiKey: string,
    messages: OpenRouterMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    }
  ): Promise<string> {
    try {
      if (!apiKey || !apiKey.trim()) {
        throw new Error('OpenRouter APIキーが設定されていません');
      }

      const request: OpenRouterRequest = {
        model: options?.model ?? this.defaultModel,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        top_p: options?.topP ?? 0.9,
        frequency_penalty: options?.frequencyPenalty ?? 0,
        presence_penalty: options?.presencePenalty ?? 0,
        stream: false
      };

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://ai-chat-app.local',
          'X-Title': 'AI Chat App'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`OpenRouter API error: ${errorMessage}`);
      }

      const data: OpenRouterResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No choices returned from OpenRouter API');
      }

      const choice = data.choices[0];
      if (!choice.message || !choice.message.content) {
        throw new Error('No content in OpenRouter response');
      }

      return choice.message.content;
    } catch (error) {
      console.error('OpenRouter message generation failed:', error);
      throw error;
    }
  }

  async generateMessageStream(
    apiKey: string,
    messages: OpenRouterMessage[],
    onChunk: (chunk: string) => void,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    }
  ): Promise<string> {
    try {
      if (!apiKey || !apiKey.trim()) {
        throw new Error('OpenRouter APIキーが設定されていません');
      }

      const request: OpenRouterRequest = {
        model: options?.model ?? this.defaultModel,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        top_p: options?.topP ?? 0.9,
        frequency_penalty: options?.frequencyPenalty ?? 0,
        presence_penalty: options?.presencePenalty ?? 0,
        stream: true
      };

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://ai-chat-app.local',
          'X-Title': 'AI Chat App'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`OpenRouter API error: ${errorMessage}`);
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
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                break;
              }
              
              try {
                const jsonData: OpenRouterStreamChunk = JSON.parse(data);
                
                if (jsonData.choices && jsonData.choices[0]?.delta?.content) {
                  const content = jsonData.choices[0].delta.content;
                  fullContent += content;
                  onChunk(content);
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
      console.error('OpenRouter streaming generation failed:', error);
      throw error;
    }
  }

  async getModels(apiKey: string): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    context_length?: number;
    pricing?: {
      prompt: string;
      completion: string;
    };
  }>> {
    try {
      if (!apiKey || !apiKey.trim()) {
        throw new Error('OpenRouter APIキーが設定されていません');
      }

      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://ai-chat-app.local',
          'X-Title': 'AI Chat App'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`OpenRouter API error: ${errorMessage}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch OpenRouter models:', error);
      throw error;
    }
  }

  formatMessagesForOpenRouter(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): OpenRouterMessage[] {
    const messages: OpenRouterMessage[] = [];

    // システムプロンプトを追加
    if (systemPrompt.trim()) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // 会話履歴を追加
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }

    // 現在のユーザーメッセージを追加
    messages.push({
      role: 'user',
      content: userMessage
    });

    return messages;
  }

  getPopularModels(): Array<{
    id: string;
    name: string;
    description: string;
    provider: string;
  }> {
    return [
      {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        description: 'Most capable Claude model',
        provider: 'Anthropic'
      },
      {
        id: 'anthropic/claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        description: 'Balanced performance and speed',
        provider: 'Anthropic'
      },
      {
        id: 'anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        description: 'Fast and lightweight',
        provider: 'Anthropic'
      },
      {
        id: 'openai/gpt-4-turbo-preview',
        name: 'GPT-4 Turbo',
        description: 'Latest GPT-4 model',
        provider: 'OpenAI'
      },
      {
        id: 'openai/gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective',
        provider: 'OpenAI'
      },
      {
        id: 'google/gemini-pro',
        name: 'Gemini Pro',
        description: 'Google\'s advanced model',
        provider: 'Google'
      },
      {
        id: 'mistralai/mistral-7b-instruct',
        name: 'Mistral 7B',
        description: 'Open source instruction model',
        provider: 'Mistral AI'
      },
      {
        id: 'meta-llama/llama-2-70b-chat',
        name: 'Llama 2 70B',
        description: 'Meta\'s large language model',
        provider: 'Meta'
      }
    ];
  }

  setDefaultModel(model: string) {
    this.defaultModel = model;
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }
}

export const openRouterClient = new OpenRouterClient();