"use client";

import React from "react";
import { EffectSettings } from "@/types/core/settings.types";
import { SettingItem } from "../components/SettingItem";
import { IntensitySlider } from "../components/IntensitySlider";
import { FontEffectSlider } from "../components/FontEffectSlider";

interface EffectsPanelProps {
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(
    key: K,
    value: EffectSettings[K]
  ) => void;
}

/**
 * エフェクト設定パネル
 * メッセージエフェクト、外観設定を管理
 */
export const EffectsPanel: React.FC<EffectsPanelProps> = ({
  settings,
  updateSetting,
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">
        メッセージエフェクト
      </h3>

      <SettingItem
        title="カラフル吹き出し"
        description="グラデーション背景とグロー効果を有効にします"
        checked={settings.colorfulBubbles}
        onChange={(checked) => updateSetting("colorfulBubbles", checked)}
      />
      {settings.colorfulBubbles && (
        <div className="ml-6 mb-4">
          <IntensitySlider
            label="カラフル強度"
            value={settings.colorfulBubblesIntensity}
            onChange={(value) => updateSetting("colorfulBubblesIntensity", value)}
          />
        </div>
      )}

      <SettingItem
        title="フォントエフェクト"
        description="特殊文字の装飾と動的なフォントスタイルを有効にします"
        checked={settings.fontEffects}
        onChange={(checked) => updateSetting("fontEffects", checked)}
      />
      {settings.fontEffects && (
        <div className="ml-6 mb-4">
          <FontEffectSlider
            value={settings.fontEffectsIntensity}
            onChange={(value) => updateSetting("fontEffectsIntensity", value)}
          />
        </div>
      )}

      <SettingItem
        title="パーティクルエフェクト"
        description="ハート、星、虹などのアニメーションエフェクトを有効にします"
        checked={settings.particleEffects}
        onChange={(checked) => updateSetting("particleEffects", checked)}
      />
      {settings.particleEffects && (
        <div className="ml-6 mb-4">
          <IntensitySlider
            label="パーティクル強度"
            value={settings.particleEffectsIntensity}
            onChange={(value) => updateSetting("particleEffectsIntensity", value)}
          />
        </div>
      )}

      <SettingItem
        title="タイプライター効果"
        description="文字を1つずつ表示するタイプライター効果を有効にします"
        checked={settings.typewriterEffect}
        onChange={(checked) => updateSetting("typewriterEffect", checked)}
      />
      {settings.typewriterEffect && (
        <div className="ml-6 mb-4">
          <IntensitySlider
            label="タイプライター強度"
            value={settings.typewriterIntensity}
            onChange={(value) => updateSetting("typewriterIntensity", value)}
          />
        </div>
      )}

      {/* 外観設定 */}
      <div className="border-t border-white/10 pt-6">
        <h4 className="text-lg font-medium text-white mb-4">外観設定</h4>

        {/* 透明度設定 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-sm font-medium text-white">吹き出しの透明度</h5>
              <p className="text-xs text-gray-400">
                吹き出しの背景の透明度を調整します
              </p>
            </div>
            <span className="text-sm text-purple-400 font-medium">
              {settings.bubbleOpacity}%
            </span>
          </div>
          <div className="relative">
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={settings.bubbleOpacity}
              onChange={(e) =>
                updateSetting("bubbleOpacity", parseInt(e.target.value))
              }
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${settings.bubbleOpacity}%, #4b5563 ${settings.bubbleOpacity}%, #4b5563 100%)`,
              }}
            />
          </div>
        </div>

        <SettingItem
          title="背景ぼかし効果"
          description="吹き出し背景にぼかし効果を適用します（半透明時により美しい見た目になります）"
          checked={settings.bubbleBlur}
          onChange={(checked) => updateSetting("bubbleBlur", checked)}
        />
      </div>
    </div>
  );
};
