"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { APIConfig } from "@/types/core/settings.types";

interface APIKeyManagerProps {
  apiConfig: APIConfig;
  openRouterApiKey: string;
  geminiApiKey: string;
  onOpenRouterApiKeyChange: (key: string) => void;
  onGeminiApiKeyChange: (key: string) => void;
  onUpdateAPIConfig: (updates: Partial<APIConfig>) => void;
}

/**
 * APIキー管理コンポーネント
 * Gemini API と OpenRouter API キーの管理を行う
 */
export const APIKeyManager: React.FC<APIKeyManagerProps> = ({
  apiConfig,
  openRouterApiKey,
  geminiApiKey,
  onOpenRouterApiKeyChange,
  onGeminiApiKeyChange,
  onUpdateAPIConfig,
}) => {
  const [localOpenRouterApiKey, setLocalOpenRouterApiKey] = useState(
    openRouterApiKey || ""
  );
  const [localGeminiApiKey, setLocalGeminiApiKey] = useState(
    geminiApiKey || ""
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);

  const isGemini = apiConfig.provider === "gemini";

  const handleApiKeyChange = (key: string) => {
    setLocalOpenRouterApiKey(key);
    onOpenRouterApiKeyChange(key);
  };

  const handleGeminiApiKeyChange = (key: string) => {
    setLocalGeminiApiKey(key);
    onGeminiApiKeyChange(key);
  };

  return (
    <>
      {/* Gemini APIキー入力（モデル未選択・別プロバイダーでも常に入力可能） */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-2 overflow-hidden">
        <label className="block text-sm font-medium text-gray-300">
          Gemini APIキー
        </label>
        <div className="relative">
          <input
            type={showGeminiApiKey ? "text" : "password"}
            value={localGeminiApiKey}
            onChange={(e) => handleGeminiApiKeyChange(e.target.value)}
            className="w-full px-3 py-2 pr-10 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            placeholder="AIza..."
          />
          <button
            onClick={() => setShowGeminiApiKey(!showGeminiApiKey)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
            {showGeminiApiKey ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Google AI Studioで取得したAPIキーを入力してください。
        </p>

        {/* Gemini API直接使用のトグル（表示はそのまま） */}
        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-300">
                Gemini API 直接使用
              </label>
              <p className="text-xs text-gray-500 mt-1">
                オフにするとOpenRouter経由でGeminiを使用（高速化）
              </p>
            </div>
            <button
              onClick={() => {
                const newValue = !apiConfig.useDirectGeminiAPI;
                onUpdateAPIConfig({ useDirectGeminiAPI: newValue });
                console.log(
                  `🔄 Gemini API direct mode: ${
                    newValue ? "ON (直接)" : "OFF (OpenRouter経由)"
                  }`
                );
              }}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                apiConfig.useDirectGeminiAPI !== false
                  ? "bg-purple-600"
                  : "bg-gray-600"
              )}>
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  apiConfig.useDirectGeminiAPI !== false
                    ? "translate-x-6"
                    : "translate-x-1"
                )}
              />
            </button>
          </div>
          {apiConfig.useDirectGeminiAPI === false && (
            <p className="text-xs text-yellow-400 mt-2">
              ⚡OpenRouter経由でGeminiを使用します（フォールバック無し・高速）
            </p>
          )}
        </div>
      </motion.div>

      {/* OpenRouter APIキー入力（モデル未選択でも常に入力可能） */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-2 overflow-hidden">
        <label className="block text-sm font-medium text-gray-300">
          OpenRouter APIキー
        </label>
        <div className="relative">
          <input
            type={showApiKey ? "text" : "password"}
            value={localOpenRouterApiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            className="w-full px-3 py-2 pr-10 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            placeholder="sk-or-..."
          />
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
            {showApiKey ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          OpenRouterで取得したAPIキーを入力してください。
        </p>
      </motion.div>
    </>
  );
};
