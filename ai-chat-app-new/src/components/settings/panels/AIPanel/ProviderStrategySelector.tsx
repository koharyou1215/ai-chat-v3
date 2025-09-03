"use client";

import React from "react";
import { APIProviderStrategy, APIConfig } from "@/types/core/settings.types";

interface ProviderStrategySelectorProps {
  apiConfig: APIConfig;
  onUpdateAPIConfig: (updates: Partial<APIConfig>) => void;
  geminiApiKey?: string;
  openRouterApiKey?: string;
}

/**
 * 🔧 NEW: プロバイダー戦略選択コンポーネント
 * 
 * 統一されたAPI routing戦略を選択するためのUI
 * - 自動最適選択
 * - Gemini直接
 * - Gemini (OpenRouter経由)
 * - OpenRouter native
 */
export const ProviderStrategySelector: React.FC<ProviderStrategySelectorProps> = ({
  apiConfig,
  onUpdateAPIConfig,
  geminiApiKey,
  openRouterApiKey,
}) => {
  const strategies: Array<{
    value: APIProviderStrategy;
    label: string;
    description: string;
    recommended?: boolean;
    requiresGemini?: boolean;
    requiresOpenRouter?: boolean;
  }> = [
    {
      value: 'auto-optimal',
      label: '🤖 自動最適選択',
      description: 'APIキーとモデルに基づいて自動で最適なルートを選択',
      recommended: true,
    },
    {
      value: 'gemini-direct',
      label: '⚡ Gemini直接',
      description: 'Google Gemini APIを直接使用（最高速度）',
      requiresGemini: true,
    },
    {
      value: 'gemini-openrouter',
      label: '🔄 Gemini (OpenRouter経由)',
      description: 'OpenRouter経由でGeminiを使用（安定性重視）',
      requiresOpenRouter: true,
    },
    {
      value: 'openrouter-native',
      label: '🌐 OpenRouter native',
      description: 'OpenRouterの他のモデル (Claude, GPT等) を使用',
      requiresOpenRouter: true,
    },
  ];

  const handleStrategyChange = (strategy: APIProviderStrategy) => {
    const updates: Partial<APIConfig> = {
      strategy,
      // Smart fallback と delay の自動設定
      enableSmartFallback: strategy === 'auto-optimal',
      fallbackDelayMs: strategy === 'auto-optimal' ? 1000 : 2000,
    };

    // 戦略に応じて provider と useDirectGeminiAPI を自動調整
    if (strategy === 'openrouter-native') {
      updates.provider = 'openrouter';
      updates.useDirectGeminiAPI = false;
    } else if (strategy === 'gemini-direct') {
      updates.provider = 'gemini';
      updates.useDirectGeminiAPI = true;
    } else if (strategy === 'gemini-openrouter') {
      updates.provider = 'gemini';
      updates.useDirectGeminiAPI = false;
    }

    onUpdateAPIConfig(updates);
  };

  const currentStrategy = apiConfig.strategy || 'auto-optimal';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium text-white">
          API Routing戦略
        </h5>
        <div className="text-xs text-gray-400">
          🔧 NEW: 統一API routing
        </div>
      </div>
      
      <div className="space-y-2">
        {strategies.map((strategy) => {
          const isSelected = currentStrategy === strategy.value;
          const isAvailable = 
            (!strategy.requiresGemini || geminiApiKey) &&
            (!strategy.requiresOpenRouter || openRouterApiKey);
          
          return (
            <div
              key={strategy.value}
              className={`
                relative p-3 rounded-lg border cursor-pointer transition-all
                ${isSelected
                  ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/20'
                  : isAvailable
                    ? 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                    : 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed'
                }
              `}
              onClick={() => isAvailable && handleStrategyChange(strategy.value)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {strategy.label}
                    </span>
                    {strategy.recommended && (
                      <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                        推奨
                      </span>
                    )}
                    {isSelected && (
                      <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                        選択中
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {strategy.description}
                  </p>
                  
                  {/* API key requirements */}
                  {(strategy.requiresGemini || strategy.requiresOpenRouter) && (
                    <div className="flex items-center gap-2 mt-2">
                      {strategy.requiresGemini && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          geminiApiKey 
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          Gemini Key {geminiApiKey ? '✓' : '✗'}
                        </span>
                      )}
                      {strategy.requiresOpenRouter && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          openRouterApiKey 
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          OpenRouter Key {openRouterApiKey ? '✓' : '✗'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className={`
                  w-4 h-4 rounded-full border-2 transition-colors
                  ${isSelected
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-500'
                  }
                `}>
                  {isSelected && (
                    <div className="w-full h-full rounded-full bg-white scale-50" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance settings for selected strategy */}
      {currentStrategy && (
        <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700">
          <h6 className="text-xs font-medium text-white mb-2">パフォーマンス設定</h6>
          
          <div className="space-y-2">
            {/* Smart fallback toggle */}
            <label className="flex items-center justify-between text-xs">
              <span className="text-gray-400">スマートフォールバック</span>
              <input
                type="checkbox"
                checked={apiConfig.enableSmartFallback ?? true}
                onChange={(e) => onUpdateAPIConfig({ enableSmartFallback: e.target.checked })}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
            </label>
            
            {/* Fallback delay */}
            {apiConfig.enableSmartFallback && (
              <div>
                <label className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400">フォールバック遅延</span>
                  <span className="text-white">{apiConfig.fallbackDelayMs || 1000}ms</span>
                </label>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="250"
                  value={apiConfig.fallbackDelayMs || 1000}
                  onChange={(e) => onUpdateAPIConfig({ fallbackDelayMs: parseInt(e.target.value) })}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Strategy explanation */}
      <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
        <p className="text-xs text-blue-200">
          💡 <strong>ヒント:</strong> 「自動最適選択」は利用可能なAPIキーに基づいて最適なルートを選択し、
          フォールバック機能により遅延を最小化します。
        </p>
      </div>
    </div>
  );
};