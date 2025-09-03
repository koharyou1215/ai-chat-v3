"use client";

import React from "react";
import { EffectSettings } from "@/store/slices/settings.slice";
import { IntensitySlider } from "../components/IntensitySlider";
import { SettingItem } from "../components/SettingItem";

interface ThreeDPanelProps {
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(
    key: K,
    value: EffectSettings[K]
  ) => void;
}

/**
 * 3D機能設定パネル
 * WebGLベースの3Dエフェクトと視覚効果を管理
 */
export const ThreeDPanel: React.FC<ThreeDPanelProps> = ({ 
  settings, 
  updateSetting 
}) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-white mb-4">3D機能</h3>

    <SettingItem
      title="ホログラムメッセージ"
      description="WebGLを使用した立体的なメッセージ表示"
      checked={settings.hologramMessages}
      onChange={(checked) => updateSetting("hologramMessages", checked)}
    />
    {settings.hologramMessages && (
      <div className="ml-6 mb-4">
        <IntensitySlider
          label="ホログラム強度"
          value={settings.hologramIntensity}
          onChange={(value) => updateSetting("hologramIntensity", value)}
        />
      </div>
    )}

    <SettingItem
      title="パーティクルテキスト"
      description="文字が粒子化して集合・分散するエフェクト"
      checked={settings.particleText}
      onChange={(checked) => updateSetting("particleText", checked)}
    />
    {settings.particleText && (
      <div className="ml-6 mb-4">
        <IntensitySlider
          label="パーティクルテキスト強度"
          value={settings.particleTextIntensity}
          onChange={(value) => updateSetting("particleTextIntensity", value)}
        />
      </div>
    )}

    <SettingItem
      title="リップルエフェクト"
      description="タッチ位置から波紋が広がるニューモーフィック効果"
      checked={settings.rippleEffects}
      onChange={(checked) => updateSetting("rippleEffects", checked)}
    />
    {settings.rippleEffects && (
      <div className="ml-6 mb-4">
        <IntensitySlider
          label="リップル強度"
          value={settings.rippleIntensity}
          onChange={(value) => updateSetting("rippleIntensity", value)}
        />
      </div>
    )}

    <SettingItem
      title="背景パーティクル"
      description="3D空間に浮遊するパーティクル背景を表示"
      checked={settings.backgroundParticles}
      onChange={(checked) => updateSetting("backgroundParticles", checked)}
    />
    {settings.backgroundParticles && (
      <div className="ml-6 mb-4">
        <IntensitySlider
          label="背景パーティクル強度"
          value={settings.backgroundParticlesIntensity}
          onChange={(value) =>
            updateSetting("backgroundParticlesIntensity", value)
          }
        />
      </div>
    )}
  </div>
);