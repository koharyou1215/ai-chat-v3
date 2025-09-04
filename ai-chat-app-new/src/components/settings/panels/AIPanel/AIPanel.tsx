"use client";

import React, { useState, useEffect } from "react";
import {
  SystemPrompts,
  APIConfig,
  APIProvider,
  APIProviderStrategy,
} from "@/types/core/settings.types";
import { ModelSelector } from "./ModelSelector";
import { APIKeyManager } from "./APIKeyManager";
import { APIConfigPanel } from "./APIConfigPanel";
import { PromptEditor } from "./PromptEditor";
import { ProviderStrategySelector } from "./ProviderStrategySelector";
import { apiManager } from "@/services/api-manager";

interface AIPanelProps {
  systemPrompts: SystemPrompts;
  enableSystemPrompt: boolean;
  enableJailbreakPrompt: boolean;
  promptMode: "default" | "custom" | "both";
  apiConfig: APIConfig;
  openRouterApiKey: string;
  geminiApiKey: string;
  showSystemPrompt: boolean;
  showJailbreakPrompt: boolean;
  showReplySuggestionPrompt: boolean;
  showTextEnhancementPrompt: boolean;
  onUpdateSystemPrompts: (prompts: SystemPrompts) => void;
  onSetEnableSystemPrompt: (enable: boolean) => void;
  onSetEnableJailbreakPrompt: (enable: boolean) => void;
  onSetPromptMode: (mode: "default" | "custom" | "both") => void;
  onSetTemperature: (temp: number) => void;
  onSetMaxTokens: (tokens: number) => void;
  onSetTopP: (topP: number) => void;
  onToggleSystemPrompt: () => void;
  onToggleJailbreakPrompt: () => void;
  updateAPIConfig: (updates: Partial<APIConfig>) => void;
  onToggleReplySuggestionPrompt: () => void;
  onToggleTextEnhancementPrompt: () => void;
  setAPIModel: (model: string) => void;
  setAPIProvider: (provider: APIProvider) => void;
  setOpenRouterApiKey: (key: string) => void;
  setGeminiApiKey: (key: string) => void;
}

/**
 * AI設定パネル（統合版）
 * モデル選択、APIキー管理、パラメータ設定、プロンプト管理を統合
 *
 * 旧3,324行ファイルから抽出・モジュール化されたコンポーネント
 * - ModelSelector: モデル選択UI
 * - APIKeyManager: APIキー管理UI
 * - APIConfigPanel: AI生成パラメータ調整UI
 * - PromptEditor: プロンプト管理UI
 */
export const AIPanel: React.FC<AIPanelProps> = ({
  systemPrompts,
  enableSystemPrompt,
  enableJailbreakPrompt,
  promptMode,
  apiConfig,
  openRouterApiKey,
  geminiApiKey,
  showSystemPrompt,
  showJailbreakPrompt,
  showReplySuggestionPrompt,
  showTextEnhancementPrompt,
  onUpdateSystemPrompts,
  onSetEnableSystemPrompt,
  onSetEnableJailbreakPrompt,
  onSetPromptMode,
  onSetTemperature,
  onSetMaxTokens,
  onSetTopP,
  onToggleSystemPrompt,
  onToggleJailbreakPrompt,
  updateAPIConfig,
  onToggleReplySuggestionPrompt,
  onToggleTextEnhancementPrompt,
  setAPIModel,
  setAPIProvider,
  setOpenRouterApiKey,
  setGeminiApiKey,
}) => {
  // apiConfig がなければ何も表示しない
  if (!apiConfig) {
    return null;
  }

  // 🔄 UI再表示時に保存済みキーを自動読込してZustandに同期
  useEffect(() => {
    try {
      const savedOR = apiManager.getOpenRouterApiKey?.();
      if (!openRouterApiKey && savedOR) {
        setOpenRouterApiKey(savedOR);
      }
      const savedGem = apiManager.getGeminiApiKey?.();
      if (!geminiApiKey && savedGem) {
        setGeminiApiKey(savedGem);
      }
    } catch {}
    // open時に一度同期すれば十分
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModelChange = (modelId: string) => {
    // 戦略優先でproviderを決定（"google/gemini-*" でもOpenRouter経由を許可）
    let nextProvider: APIProvider = apiConfig.provider;
    const strategy = apiConfig.strategy || 'auto-optimal';
    if (strategy === 'openrouter-native' || strategy === 'gemini-openrouter') {
      nextProvider = 'openrouter';
    } else if (strategy === 'gemini-direct') {
      nextProvider = 'gemini';
    } else {
      // auto-optimal: キーの有無で自動判定
      const hasOR = !!openRouterApiKey;
      const hasGem = !!geminiApiKey;
      if (modelId.startsWith('google/')) {
        // Geminiモデル: OpenRouterキーがあればOpenRouter優先、無ければGemini
        nextProvider = hasOR ? 'openrouter' : 'gemini';
      } else {
        nextProvider = 'openrouter';
      }
    }

    updateAPIConfig({ model: modelId, provider: nextProvider });
    try {
      setAPIModel(modelId);
      setAPIProvider(nextProvider);
    } catch {
      // no-op
    }
  };

  const handleSavePrompts = () => {
    console.log("Saving custom prompts:", systemPrompts);
  };

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto">
      {/* API設定セクション */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">API設定</h4>

        {/* モデル選択 */}
        <ModelSelector
          apiConfig={apiConfig}
          onModelChange={handleModelChange}
        />

        {/* APIキー管理 */}
        <APIKeyManager
          apiConfig={apiConfig}
          openRouterApiKey={openRouterApiKey}
          geminiApiKey={geminiApiKey}
          onOpenRouterApiKeyChange={setOpenRouterApiKey}
          onGeminiApiKeyChange={setGeminiApiKey}
          onUpdateAPIConfig={updateAPIConfig}
        />

        {/* 🔧 NEW: プロバイダー戦略選択 */}
        <ProviderStrategySelector
          apiConfig={apiConfig}
          onUpdateAPIConfig={updateAPIConfig}
          geminiApiKey={geminiApiKey}
          openRouterApiKey={openRouterApiKey}
        />
      </div>

      {/* API設定パラメータ */}
      <APIConfigPanel
        apiConfig={apiConfig}
        onSetTemperature={onSetTemperature}
        onSetMaxTokens={onSetMaxTokens}
        onSetTopP={onSetTopP}
      />

      {/* プロンプト管理 */}
      <PromptEditor
        systemPrompts={systemPrompts}
        enableSystemPrompt={enableSystemPrompt}
        enableJailbreakPrompt={enableJailbreakPrompt}
        promptMode={promptMode}
        showSystemPrompt={showSystemPrompt}
        showJailbreakPrompt={showJailbreakPrompt}
        showReplySuggestionPrompt={showReplySuggestionPrompt}
        showTextEnhancementPrompt={showTextEnhancementPrompt}
        onUpdateSystemPrompts={onUpdateSystemPrompts}
        onSetEnableSystemPrompt={onSetEnableSystemPrompt}
        onSetEnableJailbreakPrompt={onSetEnableJailbreakPrompt}
        onSetPromptMode={onSetPromptMode}
        onToggleSystemPrompt={onToggleSystemPrompt}
        onToggleJailbreakPrompt={onToggleJailbreakPrompt}
        onToggleReplySuggestionPrompt={onToggleReplySuggestionPrompt}
        onToggleTextEnhancementPrompt={onToggleTextEnhancementPrompt}
        onSavePrompts={handleSavePrompts}
      />
    </div>
  );
};
