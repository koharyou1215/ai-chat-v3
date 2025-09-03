"use client";

import React from "react";
import { APIConfig, APIProvider } from "@/types/core/settings.types";

interface ModelSelectorProps {
  apiConfig: APIConfig;
  onModelChange: (modelId: string) => void;
}

/**
 * モデル選択コンポーネント
 * 各プロバイダーのモデル一覧と選択機能を提供
 */
export const ModelSelector: React.FC<ModelSelectorProps> = ({
  apiConfig,
  onModelChange,
}) => {
  const isGemini = apiConfig.provider === "gemini";

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        モデル選択
      </label>
      <select
        value={apiConfig.model}
        onChange={(e) => onModelChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
        <optgroup label="Google">
          <option value="google/gemini-2.5-pro">
            Gemini 2.5 Pro (最高性能)
          </option>
          <option value="google/gemini-2.5-flash">
            Gemini 2.5 Flash (高速)
          </option>
          <option value="google/gemini-2.5-flash-lite">
            Gemini 2.5 Flash Lite (軽量)
          </option>
        </optgroup>
        <optgroup label="Anthropic (OpenRouter)">
          <option value="anthropic/claude-opus-4">Claude Opus 4</option>
          <option value="anthropic/claude-sonnet-4">Claude Sonnet 4</option>
        </optgroup>
        <optgroup label="xAI (OpenRouter)">
          <option value="x-ai/grok-4">Grok-4</option>
          <option value="z-ai/glm-4.5">GLM-4.5</option>
          <option value="x-ai/grok-code-fast-1">Grok Code Fast</option>
        </optgroup>
        <optgroup label="OpenAI (OpenRouter)">
          <option value="openai/gpt-5-chat">GPT-5</option>
          <option value="openai/gpt-5-mini">GPT-5 Mini</option>
        </optgroup>
        <optgroup label="DeepSeek (OpenRouter)">
          <option value="deepseek/deepseek-chat-v3.1">
            DeepSeek Chat v3
          </option>
          <option value="deepcogito/cogito-v2-preview-deepseek-671b">
            DeepSeek 671B
          </option>
        </optgroup>
        <optgroup label="Standard (OpenRouter)">
          <option value="mistralai/mistral-medium-3.1">
            Mistral Medium 3.1
          </option>
          <option value="meta-llama/llama-4-maverick">
            Llama 4 Maverick
          </option>
        </optgroup>
        <optgroup label="Specialized (OpenRouter)">
          <option value="qwen/qwen3-30b-a3b-thinking-2507">
            Qwen3 30B A3B Thinking
          </option>
          <option value="qwen/qwen3-30b-a3b-instruct-2507">
            Qwen3 30B A3B
          </option>
          <option value="moonshotai/kimi-k2">Kimi K2</option>
        </optgroup>
      </select>
      {isGemini ? (
        <p className="text-xs text-blue-400 mt-1">
          Gemini APIを使用します。APIキーは{" "}
          <code className="bg-gray-700 px-1 rounded">
            gemini-api-key.txt
          </code>{" "}
          から読み込まれます。
        </p>
      ) : (
        <p className="text-xs text-purple-400 mt-1">
          OpenRouter APIを使用します。
        </p>
      )}
    </div>
  );
};