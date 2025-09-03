"use client";

import React from "react";
import { EffectSettings } from "@/store/slices/settings.slice";
import { IntensitySlider } from "../components/IntensitySlider";
import { SettingItem } from "../components/SettingItem";

interface EmotionPanelProps {
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(
    key: K,
    value: EffectSettings[K]
  ) => void;
}

/**
 * 感情分析設定パネル
 * リアルタイム感情検出とスタイル変更機能を管理
 */
export const EmotionPanel: React.FC<EmotionPanelProps> = ({ 
  settings, 
  updateSetting 
}) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-white mb-4">感情分析</h3>

    <SettingItem
      title="リアルタイム感情検出"
      description="メッセージから感情を自動検出し、表情を変更します"
      checked={settings.realtimeEmotion}
      onChange={(checked) => updateSetting("realtimeEmotion", checked)}
    />

    <SettingItem
      title="感情ベースのスタイル変更"
      description="検出した感情に基づいてメッセージの見た目を自動変更します"
      checked={settings.emotionBasedStyling}
      onChange={(checked) => updateSetting("emotionBasedStyling", checked)}
    />
    {settings.emotionBasedStyling && (
      <div className="ml-6 mb-4">
        <IntensitySlider
          label="感情スタイル強度"
          value={settings.emotionStylingIntensity}
          onChange={(value) => updateSetting("emotionStylingIntensity", value)}
        />
      </div>
    )}

    <SettingItem
      title="自動リアクション"
      description="感情に応じて自動的にビジュアルエフェクトを発動します"
      checked={settings.autoReactions}
      onChange={(checked) => updateSetting("autoReactions", checked)}
    />
  </div>
);