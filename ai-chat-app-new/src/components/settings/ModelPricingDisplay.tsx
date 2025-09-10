// src/components/settings/ModelPricingDisplay.tsx

import React from "react";
import { ModelInfo, ModelPricing } from "@/types/core/settings.types";
import { formatPricePerMillion } from "@/constants/model-pricing";
import { DollarSign, Zap, Brain, Clock } from "lucide-react";

interface ModelPricingDisplayProps {
  modelInfo: ModelInfo;
  className?: string;
}

export const ModelPricingDisplay: React.FC<ModelPricingDisplayProps> = ({
  modelInfo,
  className = "",
}) => {
  const { pricing, contextWindow, description } = modelInfo;

  const getPriceLevel = (
    inputPrice: number,
    outputPrice: number
  ): "low" | "medium" | "high" => {
    const avgPrice = (inputPrice + outputPrice) / 2;
    if (avgPrice < 0.000001) return "low";
    if (avgPrice < 0.00001) return "medium";
    return "high";
  };

  const priceLevel = getPriceLevel(pricing.input, pricing.output);

  const getPriceLevelColor = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "low":
        return "text-green-400 bg-green-400/10 border-green-400/20";
      case "medium":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "high":
        return "text-red-400 bg-red-400/10 border-red-400/20";
    }
  };

  const getPriceLevelText = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "low":
        return "コスト効率良好";
      case "medium":
        return "バランス型";
      case "high":
        return "高品質重視";
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 価格レベル表示 */}
      <div
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border backdrop-blur-sm ${getPriceLevelColor(
          priceLevel
        )}`}>
        <DollarSign className="w-4 h-4" />
        {getPriceLevelText(priceLevel)}
      </div>

      {/* 価格詳細 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3 bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Brain className="w-4 h-4" />
            <span>入力</span>
          </div>
          <div className="text-xl font-bold text-white">
            {formatPricePerMillion(pricing.input, pricing.currency)}
            <span className="text-sm text-gray-400 ml-1 font-normal">
              /1M tokens
            </span>
          </div>
        </div>

        <div className="space-y-3 bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Zap className="w-4 h-4" />
            <span>出力</span>
          </div>
          <div className="text-xl font-bold text-white">
            {formatPricePerMillion(pricing.output, pricing.currency)}
            <span className="text-sm text-gray-400 ml-1 font-normal">
              /1M tokens
            </span>
          </div>
        </div>
      </div>

      {/* コンテキストウィンドウ */}
      <div className="flex items-center gap-3 text-sm text-gray-300 bg-slate-800/20 backdrop-blur-sm rounded-lg p-3 border border-white/5">
        <Clock className="w-4 h-4" />
        <span>コンテキスト: {contextWindow.toLocaleString()} tokens</span>
      </div>

      {/* 説明 */}
      {description && (
        <p className="text-sm text-gray-300 leading-relaxed bg-slate-800/20 backdrop-blur-sm rounded-lg p-3 border border-white/5">
          {description}
        </p>
      )}

      {/* コスト比較例 */}
      <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 space-y-3 border border-white/10">
        <h4 className="text-sm font-medium text-gray-300">
          コスト例（1,000トークンの会話）
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-gray-400">
            入力:{" "}
            {formatPricePerMillion(pricing.input * 0.001, pricing.currency)}
          </div>
          <div className="text-gray-400">
            出力:{" "}
            {formatPricePerMillion(pricing.output * 0.001, pricing.currency)}
          </div>
        </div>
      </div>
    </div>
  );
};

// コンパクト版（選択肢内で使用）
export const CompactModelPricing: React.FC<{ modelInfo: ModelInfo }> = ({
  modelInfo,
}) => {
  const { pricing } = modelInfo;

  const getPriceLevel = (
    inputPrice: number,
    outputPrice: number
  ): "low" | "medium" | "high" => {
    const avgPrice = (inputPrice + outputPrice) / 2;
    if (avgPrice < 0.000001) return "low";
    if (avgPrice < 0.00001) return "medium";
    return "high";
  };

  const priceLevel = getPriceLevel(pricing.input, pricing.output);

  const getPriceLevelColor = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "low":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "high":
        return "text-red-400";
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`font-medium ${getPriceLevelColor(priceLevel)}`}>
        {formatPricePerMillion(pricing.input, pricing.currency)}
      </span>
      <span className="text-gray-400">/1M</span>
    </div>
  );
};
