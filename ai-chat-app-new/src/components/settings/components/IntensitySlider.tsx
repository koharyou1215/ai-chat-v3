"use client";

import React from "react";

interface IntensitySliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

/**
 * エフェクト強度調整用スライダーコンポーネント
 * 設定値の範囲調整と視覚的なフィードバックを提供
 */
export const IntensitySlider: React.FC<IntensitySliderProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}) => {
  return (
    <div className="flex items-center justify-between space-x-4 py-2">
      <div className="flex-1">
        <label className="text-sm text-white/70 mb-1 block">{label}</label>
        <div className="flex items-center space-x-3">
          <input
            type="range"
            min={min}
            max={max}
            value={value || 0}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider-thumb:appearance-none slider-thumb:h-4 slider-thumb:w-4 slider-thumb:bg-blue-500 slider-thumb:rounded-full slider-thumb:cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${value}%, rgba(255,255,255,0.2) ${value}%, rgba(255,255,255,0.2) 100%)`,
            }}
          />
          <span className="text-white/80 text-sm min-w-[3rem] text-right">
            {value}%
          </span>
        </div>
      </div>
    </div>
  );
};