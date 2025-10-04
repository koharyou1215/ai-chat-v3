"use client";

import React from "react";
import { EffectSettings } from "@/types/core/settings.types";

interface PerformancePanelProps {
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(
    key: K,
    value: EffectSettings[K]
  ) => void;
}

/**
 * パフォーマンス設定パネル
 * エフェクト品質とアニメーション速度を管理
 */
export const PerformancePanel: React.FC<PerformancePanelProps> = ({
  settings,
  updateSetting,
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">パフォーマンス</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            エフェクト品質
          </label>
          <select
            value={settings.effectQuality}
            onChange={(e) =>
              updateSetting(
                "effectQuality",
                e.target.value as "low" | "medium" | "high"
              )
            }
            className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
            <option value="low">低品質（軽快）</option>
            <option value="medium">中品質（推奨）</option>
            <option value="high">高品質（重い）</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            アニメーション速度: {settings.animationSpeed}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={settings.animationSpeed}
            onChange={(e) =>
              updateSetting("animationSpeed", parseFloat(e.target.value))
            }
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
