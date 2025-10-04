"use client";

import React from "react";
import { EffectSettings } from "@/types/core/settings.types";
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
 * ホログラム、パーティクルテキスト、リップルエフェクト、背景パーティクルを管理
 */
export const ThreeDPanel: React.FC<ThreeDPanelProps> = ({
  settings,
  updateSetting,
}) => {
  // Helper function to update nested 3D effects
  const update3DEffect = (
    category: 'hologram' | 'particleText' | 'ripple' | 'backgroundParticles',
    enabled: boolean
  ) => {
    const threeDEffects = settings.threeDEffects || {
      enabled: true,
      hologram: { enabled: false, intensity: 40 },
      particleText: { enabled: false, intensity: 35 },
      ripple: { enabled: false, intensity: 60 },
      backgroundParticles: { enabled: false, intensity: 25 },
      depth: { enabled: true },
      quality: 'medium' as const,
    };

    updateSetting('threeDEffects', {
      ...threeDEffects,
      [category]: {
        ...threeDEffects[category],
        enabled,
      },
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">3D機能</h3>

      <SettingItem
        title="ホログラムメッセージ"
        description="WebGLを使用した立体的なメッセージ表示"
        checked={settings.threeDEffects?.hologram.enabled ?? settings.hologramMessages ?? false}
        onChange={(checked) => update3DEffect('hologram', checked)}
        badge="実験的"
      />

      <SettingItem
        title="パーティクルテキスト"
        description="文字が粒子化して集合・分散するエフェクト"
        checked={settings.threeDEffects?.particleText.enabled ?? settings.particleText ?? false}
        onChange={(checked) => update3DEffect('particleText', checked)}
        badge="実験的"
      />

      <SettingItem
        title="リップルエフェクト"
        description="タッチ位置から波紋が広がるニューモーフィック効果"
        checked={settings.threeDEffects?.ripple.enabled ?? settings.rippleEffects ?? false}
        onChange={(checked) => update3DEffect('ripple', checked)}
      />

      <SettingItem
        title="背景パーティクル"
        description="3D空間に浮遊するパーティクル背景を表示"
        checked={settings.threeDEffects?.backgroundParticles.enabled ?? settings.backgroundParticles ?? false}
        onChange={(checked) => update3DEffect('backgroundParticles', checked)}
        badge="実験的"
      />
    </div>
  );
};
