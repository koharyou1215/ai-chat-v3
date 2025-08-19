import { APIError } from '@/types/api';

export class APIClient {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
    this.apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    const config: RequestInit = {
      ...options,
      headers: defaultHeaders,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          response.status,
          errorData.message || `HTTP error! status: ${response.status}`,
          errorData.details
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      throw new APIError(
        0,
        error instanceof Error ? error.message : 'Unknown error occurred',
        { originalError: error }
      );
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = params 
      ? `${endpoint}?${new URLSearchParams(params).toString()}`
      : endpoint;
    
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async stream<T>(
    endpoint: string,
    data?: unknown,
    onChunk?: (chunk: T) => void
  ): Promise<T[]> {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        response.status,
        errorData.message || `HTTP error! status: ${response.status}`,
        errorData.details
      );
    }

    if (!response.body) {
      throw new APIError(0, 'No response body for streaming request');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const chunks: T[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              const parsed = JSON.parse(data);
              chunks.push(parsed);
              
              if (onChunk) {
                onChunk(parsed);
              }
            } catch (_e) {
              console.warn('Failed to parse streaming chunk:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return chunks;
  }

  async analyzeEmotion(text: string): Promise<unknown> {
    return this.post('/api/emotion/analyze', { text });
  }

  async getVoicevoxSpeakers(): Promise<unknown[]> {
    return this.get('/api/voice/voicevox/speakers');
  }

  async synthesizeVoicevox(text: string, speakerId: number, settings: unknown): Promise<ArrayBuffer> {
    return this.post('/api/voice/voicevox/synthesize', { text, speakerId, settings }, { responseType: 'arraybuffer' });
  }
}

// シングルトンインスタンス
export const apiClient = new APIClient();
