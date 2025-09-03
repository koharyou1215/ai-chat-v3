/**
 * Unified API Router - 統一されたAPI routing戦略
 * 
 * 問題解決:
 * - API routing の複雑性を一元化
 * - フォールバック遅延を最適化  
 * - プロンプト処理を統一
 * - 設定ベースの provider 選択
 */

import { geminiClient } from './gemini-client';
import { APIConfig } from '@/types';

// 統一された provider 戦略
export type APIProviderStrategy = 
  | 'gemini-direct'      // Gemini API直接使用
  | 'gemini-openrouter'  // OpenRouter経由でGemini使用
  | 'openrouter-native'  // OpenRouter native models使用
  | 'auto-optimal';      // 最適ルート自動選択

// API request 共通インターフェース
export interface UnifiedAPIRequest {
  systemPrompt: string;
  userMessage: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  options?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

// API route 定義
export interface APIRoute {
  name: string;
  provider: 'gemini' | 'openrouter';
  endpoint: 'direct' | 'openrouter';
  execute: (request: UnifiedAPIRequest) => Promise<string>;
  available: () => Promise<boolean>;
  priority: number; // Lower = higher priority
}

// 統一されたAPI設定
export interface UnifiedAPIConfig {
  strategy: APIProviderStrategy;
  model: string;
  geminiApiKey?: string;
  openRouterApiKey?: string;
  
  // Performance optimization
  enableSmartFallback: boolean;
  fallbackDelayMs: number;
  maxRetries: number;
  
  // Generation parameters
  temperature: number;
  maxTokens: number;
  topP: number;
}

export class UnifiedAPIRouter {
  private config: UnifiedAPIConfig;
  private availableRoutes: APIRoute[] = [];

  constructor(config: UnifiedAPIConfig) {
    this.config = config;
    this.initializeRoutes();
  }

  /**
   * メイン生成メソッド - 統一されたエントリーポイント
   */
  async generateMessage(request: UnifiedAPIRequest): Promise<string> {
    const route = await this.selectOptimalRoute();
    
    if (this.config.enableSmartFallback) {
      return this.executeWithSmartFallback(request, route);
    } else {
      return route.execute(request);
    }
  }

  /**
   * 最適ルート選択ロジック
   */
  private async selectOptimalRoute(): Promise<APIRoute> {
    const availableRoutes = await this.getAvailableRoutes();
    
    switch (this.config.strategy) {
      case 'gemini-direct':
        return availableRoutes.find(r => r.name === 'gemini-direct') || availableRoutes[0];
        
      case 'gemini-openrouter':
        return availableRoutes.find(r => r.name === 'gemini-openrouter') || availableRoutes[0];
        
      case 'openrouter-native':
        return availableRoutes.find(r => r.name === 'openrouter-native') || availableRoutes[0];
        
      case 'auto-optimal':
        // 利用可能な中で最も優先度の高いルートを選択
        return availableRoutes.sort((a, b) => a.priority - b.priority)[0];
        
      default:
        return availableRoutes[0];
    }
  }

  /**
   * 利用可能なルートを動的に取得
   */
  private async getAvailableRoutes(): Promise<APIRoute[]> {
    const available: APIRoute[] = [];
    
    for (const route of this.availableRoutes) {
      if (await route.available()) {
        available.push(route);
      }
    }
    
    if (available.length === 0) {
      throw new Error('No available API routes. Please check your API keys.');
    }
    
    return available;
  }

  /**
   * Smart fallback 実行 - 並列試行でlatency削減
   */
  private async executeWithSmartFallback(
    request: UnifiedAPIRequest, 
    primaryRoute: APIRoute
  ): Promise<string> {
    const availableRoutes = await this.getAvailableRoutes();
    const fallbackRoutes = availableRoutes.filter(r => r.name !== primaryRoute.name);
    
    if (fallbackRoutes.length === 0) {
      return primaryRoute.execute(request);
    }

    const fallbackRoute = fallbackRoutes[0];
    
    return new Promise((resolve, reject) => {
      let resolved = false;
      let primaryError: any = null;
      let fallbackError: any = null;

      // Primary route execution
      primaryRoute.execute(request)
        .then(result => {
          if (!resolved) {
            resolved = true;
            resolve(result);
          }
        })
        .catch(error => {
          primaryError = error;
          console.warn(`Primary route failed: ${error.message}`);
          
          // If fallback also failed, reject
          if (fallbackError && !resolved) {
            resolved = true;
            reject(new Error(`Both routes failed. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`));
          }
        });

      // Delayed fallback execution
      setTimeout(() => {
        if (!resolved) {
          fallbackRoute.execute(request)
            .then(result => {
              if (!resolved) {
                resolved = true;
                console.log(`Fallback route succeeded after ${this.config.fallbackDelayMs}ms delay`);
                resolve(result);
              }
            })
            .catch(error => {
              fallbackError = error;
              console.warn(`Fallback route failed: ${error.message}`);
              
              // If primary also failed, reject
              if (primaryError && !resolved) {
                resolved = true;
                reject(new Error(`Both routes failed. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`));
              }
            });
        }
      }, this.config.fallbackDelayMs);
    });
  }

  /**
   * ルートの初期化
   */
  private initializeRoutes(): void {
    this.availableRoutes = [
      {
        name: 'gemini-direct',
        provider: 'gemini',
        endpoint: 'direct',
        priority: 1,
        available: async () => !!this.config.geminiApiKey,
        execute: async (request: UnifiedAPIRequest) => {
          geminiClient.setApiKey(this.config.geminiApiKey || '');
          
          const messages = geminiClient.formatMessagesForGemini(
            request.systemPrompt,
            request.userMessage,
            request.conversationHistory
          );

          return await geminiClient.generateMessage(messages, {
            model: this.config.model.replace('google/', ''),
            temperature: request.options?.temperature || this.config.temperature,
            maxTokens: request.options?.maxTokens || this.config.maxTokens,
            topP: request.options?.topP || this.config.topP,
            useDirectGeminiAPI: true
          });
        }
      },
      
      {
        name: 'gemini-openrouter',
        provider: 'gemini',
        endpoint: 'openrouter',
        priority: 2,
        available: async () => !!this.config.openRouterApiKey,
        execute: async (request: UnifiedAPIRequest) => {
          geminiClient.setOpenRouterApiKey(this.config.openRouterApiKey || '');
          
          const messages = geminiClient.formatMessagesForGemini(
            request.systemPrompt,
            request.userMessage,
            request.conversationHistory
          );

          return await geminiClient.generateMessage(messages, {
            model: this.config.model.replace('google/', ''),
            temperature: request.options?.temperature || this.config.temperature,
            maxTokens: request.options?.maxTokens || this.config.maxTokens,
            topP: request.options?.topP || this.config.topP,
            useDirectGeminiAPI: false // Force OpenRouter usage
          });
        }
      },
      
      {
        name: 'openrouter-native',
        provider: 'openrouter',
        endpoint: 'openrouter',
        priority: 3,
        available: async () => !!this.config.openRouterApiKey,
        execute: async (request: UnifiedAPIRequest) => {
          // Direct OpenRouter call for non-Gemini models
          const messages = [
            { role: 'system' as const, content: request.systemPrompt },
            ...request.conversationHistory,
            { role: 'user' as const, content: request.userMessage }
          ];

          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.config.openRouterApiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
              'X-Title': 'AI Chat V3'
            },
            body: JSON.stringify({
              model: this.config.model,
              messages,
              temperature: request.options?.temperature || this.config.temperature,
              max_tokens: request.options?.maxTokens || this.config.maxTokens,
              top_p: request.options?.topP || this.config.topP
            })
          });

          if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          return data.choices[0].message.content;
        }
      }
    ];
  }

  /**
   * ルート状態の診断
   */
  async diagnoseRoutes(): Promise<{
    available: string[];
    unavailable: string[];
    recommended: string;
  }> {
    const available: string[] = [];
    const unavailable: string[] = [];

    for (const route of this.availableRoutes) {
      if (await route.available()) {
        available.push(route.name);
      } else {
        unavailable.push(route.name);
      }
    }

    const optimalRoute = await this.selectOptimalRoute();
    
    return {
      available,
      unavailable,
      recommended: optimalRoute.name
    };
  }

  /**
   * 設定更新
   */
  updateConfig(newConfig: Partial<UnifiedAPIConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Utility function for creating default config
export function createDefaultUnifiedConfig(): UnifiedAPIConfig {
  return {
    strategy: 'auto-optimal',
    model: 'google/gemini-2.5-flash',
    enableSmartFallback: true,
    fallbackDelayMs: 1000,
    maxRetries: 2,
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9
  };
}

// Export singleton instance
export const unifiedAPIRouter = new UnifiedAPIRouter(createDefaultUnifiedConfig());