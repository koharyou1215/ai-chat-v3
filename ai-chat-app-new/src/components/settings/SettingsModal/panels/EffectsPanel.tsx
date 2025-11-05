"use client";

import React, { useState } from "react";
import { EffectSettings } from "@/types/core/settings.types";
import { SettingItem } from "../components/SettingItem";
import { IntensitySlider } from "../components/IntensitySlider";
import { FontEffectSlider } from "../components/FontEffectSlider";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DEFAULT_EMOTION_COLORS } from "@/utils/text/emotion-text-processor";

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
  // 🎨 Phase 1: 感情色設定の折りたたみ状態
  const [showEmotionColors, setShowEmotionColors] = useState(false);

  // 感情色のデフォルト値（undefinedの場合に使用）
  const emotionColors = settings.emotionColors || DEFAULT_EMOTION_COLORS;

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
        <div className="ml-6 mb-4 space-y-4">
          <FontEffectSlider
            value={settings.fontEffectsIntensity}
            onChange={(value) => updateSetting("fontEffectsIntensity", value)}
          />

          {/* 🎨 Phase 1: 感情色カスタマイズUI */}
          <div className="border-t border-white/10 pt-4">
            <button
              onClick={() => setShowEmotionColors(!showEmotionColors)}
              className="flex items-center justify-between w-full text-sm font-medium text-white hover:text-purple-400 transition-colors"
            >
              <span>感情色のカスタマイズ</span>
              {showEmotionColors ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showEmotionColors && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-gray-400 mb-3">
                  括弧「」内のテキストの感情検出色を設定します
                </p>

                {/* ポジティブ */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-white/20"
                      style={{ backgroundColor: emotionColors.positive }}
                    />
                    <span className="text-sm text-white">ポジティブ</span>
                    <span className="text-xs text-gray-500">
                      (愛、好き、嬉しい等)
                    </span>
                  </div>
                  <input
                    type="color"
                    value={emotionColors.positive}
                    onChange={(e) =>
                      updateSetting("emotionColors", {
                        ...emotionColors,
                        positive: e.target.value,
                      })
                    }
                    className="w-12 h-8 rounded cursor-pointer bg-transparent border border-white/20"
                  />
                </div>

                {/* ネガティブ */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-white/20"
                      style={{ backgroundColor: emotionColors.negative }}
                    />
                    <span className="text-sm text-white">ネガティブ</span>
                    <span className="text-xs text-gray-500">
                      (悲しい、寂しい、辛い等)
                    </span>
                  </div>
                  <input
                    type="color"
                    value={emotionColors.negative}
                    onChange={(e) =>
                      updateSetting("emotionColors", {
                        ...emotionColors,
                        negative: e.target.value,
                      })
                    }
                    className="w-12 h-8 rounded cursor-pointer bg-transparent border border-white/20"
                  />
                </div>

                {/* 驚き */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-white/20"
                      style={{ backgroundColor: emotionColors.surprise }}
                    />
                    <span className="text-sm text-white">驚き</span>
                    <span className="text-xs text-gray-500">
                      (えっ、まさか、すごい等)
                    </span>
                  </div>
                  <input
                    type="color"
                    value={emotionColors.surprise}
                    onChange={(e) =>
                      updateSetting("emotionColors", {
                        ...emotionColors,
                        surprise: e.target.value,
                      })
                    }
                    className="w-12 h-8 rounded cursor-pointer bg-transparent border border-white/20"
                  />
                </div>

                {/* 質問 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-white/20"
                      style={{ backgroundColor: emotionColors.question }}
                    />
                    <span className="text-sm text-white">質問</span>
                    <span className="text-xs text-gray-500">
                      (？、なんで、なぜ等)
                    </span>
                  </div>
                  <input
                    type="color"
                    value={emotionColors.question}
                    onChange={(e) =>
                      updateSetting("emotionColors", {
                        ...emotionColors,
                        question: e.target.value,
                      })
                    }
                    className="w-12 h-8 rounded cursor-pointer bg-transparent border border-white/20"
                  />
                </div>

                {/* 一般強調 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-white/20"
                      style={{ backgroundColor: emotionColors.general }}
                    />
                    <span className="text-sm text-white">一般強調</span>
                    <span className="text-xs text-gray-500">
                      (！、～、... 等)
                    </span>
                  </div>
                  <input
                    type="color"
                    value={emotionColors.general}
                    onChange={(e) =>
                      updateSetting("emotionColors", {
                        ...emotionColors,
                        general: e.target.value,
                      })
                    }
                    className="w-12 h-8 rounded cursor-pointer bg-transparent border border-white/20"
                  />
                </div>

                {/* デフォルト */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-white/20"
                      style={{ backgroundColor: emotionColors.default }}
                    />
                    <span className="text-sm text-white">デフォルト</span>
                    <span className="text-xs text-gray-500">
                      (感情未検出時)
                    </span>
                  </div>
                  <input
                    type="color"
                    value={emotionColors.default}
                    onChange={(e) =>
                      updateSetting("emotionColors", {
                        ...emotionColors,
                        default: e.target.value,
                      })
                    }
                    className="w-12 h-8 rounded cursor-pointer bg-transparent border border-white/20"
                  />
                </div>
              </div>
            )}
          </div>
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
          title="吹き出しぼかし効果"
          description="吹き出し背景にぼかし効果を適用します（半透明時により美しい見た目になります）"
          checked={settings.bubbleBlur}
          onChange={(checked) => updateSetting("bubbleBlur", checked)}
        />

        {/* 🆕 Phase 2: ぼかし強度スライダー（条件付き表示） */}
        {settings.bubbleBlur && (
          <div className="ml-6 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium text-white">ぼかし強度</h5>
                <p className="text-xs text-gray-400">
                  ぼかしの強さを調整します（0-20px）
                </p>
              </div>
              <span className="text-sm text-purple-400 font-medium">
                {settings.bubbleBlurIntensity || 8}px
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={settings.bubbleBlurIntensity || 8}
              onChange={(e) =>
                updateSetting("bubbleBlurIntensity", parseInt(e.target.value))
              }
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((settings.bubbleBlurIntensity || 8) / 20) * 100}%, #4b5563 ${((settings.bubbleBlurIntensity || 8) / 20) * 100}%, #4b5563 100%)`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
