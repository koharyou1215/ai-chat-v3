/**
 * Token Usage Display Component
 * OpenRouter APIのトークン使用量を表示するコンポーネント
 */

import React from "react";
import { motion } from "framer-motion";

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface TokenUsageDisplayProps {
  usage?: TokenUsage;
  model?: string;
  isVisible?: boolean;
}

export const TokenUsageDisplay: React.FC<TokenUsageDisplayProps> = ({
  usage,
  model,
  isVisible = true,
}) => {
  if (!usage || !isVisible) return null;

  const promptCost = usage.prompt_tokens * 0.000002; // 概算コスト
  const completionCost = usage.completion_tokens * 0.000002;
  const totalCost = usage.total_tokens * 0.000002;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mt-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          API使用量
        </h4>
        {model && (
          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
            {model}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">プロンプト:</span>
            <span className="text-blue-300">
              {usage.prompt_tokens.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">応答:</span>
            <span className="text-green-300">
              {usage.completion_tokens.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between font-medium border-t border-gray-600 pt-1">
            <span className="text-gray-300">合計:</span>
            <span className="text-white">
              {usage.total_tokens.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">プロンプト:</span>
            <span className="text-blue-300">${promptCost.toFixed(6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">応答:</span>
            <span className="text-green-300">${completionCost.toFixed(6)}</span>
          </div>
          <div className="flex justify-between font-medium border-t border-gray-600 pt-1">
            <span className="text-gray-300">合計:</span>
            <span className="text-white">${totalCost.toFixed(6)}</span>
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500 text-center">
        コストは概算値です（実際の価格はモデルにより異なります）
      </div>
    </motion.div>
  );
};

export default TokenUsageDisplay;
