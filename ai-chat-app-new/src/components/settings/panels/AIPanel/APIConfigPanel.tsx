"use client";

import React from "react";
import { APIConfig } from "@/types/core/settings.types";

interface APIConfigPanelProps {
  apiConfig: APIConfig;
  onSetTemperature: (temp: number) => void;
  onSetMaxTokens: (tokens: number) => void;
  onSetTopP: (topP: number) => void;
}

/**
 * API設定パネルコンポーネント
 * Temperature, Max Tokens, Top-p等のAI生成パラメータを管理
 */
export const APIConfigPanel: React.FC<APIConfigPanelProps> = ({
  apiConfig,
  onSetTemperature,
  onSetMaxTokens,
  onSetTopP,
}) => {
  return (
    <div className="space-y-4">
      <h4 className="text-lg font-medium text-white">生成パラメータ</h4>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Temperature: {apiConfig.temperature}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={apiConfig.temperature}
          onChange={(e) => onSetTemperature(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <p className="text-xs text-gray-400 mt-1">
          創造性の度合い (0: 保守的, 2: 創造的)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Max Tokens: {apiConfig.max_tokens}
        </label>
        <input
          type="range"
          min="256"
          max="8192"
          step="256"
          value={apiConfig.max_tokens}
          onChange={(e) => onSetMaxTokens(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <p className="text-xs text-gray-400 mt-1">最大出力トークン数</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Top-p: {apiConfig.top_p}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={apiConfig.top_p}
          onChange={(e) => onSetTopP(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <p className="text-xs text-gray-400 mt-1">
          語彙の多様性 (0.1: 制限的, 1.0: 多様)
        </p>
      </div>
    </div>
  );
};