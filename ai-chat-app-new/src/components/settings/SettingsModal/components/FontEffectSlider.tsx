import React from "react";
import { IntensitySlider } from "./IntensitySlider";

interface FontEffectSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export const FontEffectSlider: React.FC<FontEffectSliderProps> = ({
  value,
  onChange,
}) => {
  const getPreviewStyle = (intensity: number) => {
    const baseSize = 14;
    const maxSize = 28;
    const size = baseSize + (maxSize - baseSize) * (intensity / 100);
    const weight = 400 + (900 - 400) * (intensity / 100);
    const letterSpacing = intensity / 50;
    const blur = Math.max(0, (100 - intensity) / 50);

    return {
      fontSize: `${size}px`,
      fontWeight: weight,
      letterSpacing: `${letterSpacing}px`,
      textShadow: intensity > 50 ? `0 0 ${blur}px rgba(147, 197, 253, 0.5)` : "none",
      transition: "all 0.3s ease",
    };
  };

  return (
    <div className="space-y-4">
      <IntensitySlider
        label="フォントエフェクト強度"
        value={value}
        onChange={onChange}
      />
      <div className="p-4 bg-white/5 rounded-lg">
        <p style={getPreviewStyle(value)} className="text-white">
          プレビューテキスト: フォントサイズとスタイルが変化します
        </p>
        <p className="text-xs text-white/50 mt-2">
          強度: {value < 30 ? "弱" : value < 70 ? "中" : "強"}
        </p>
      </div>
    </div>
  );
};