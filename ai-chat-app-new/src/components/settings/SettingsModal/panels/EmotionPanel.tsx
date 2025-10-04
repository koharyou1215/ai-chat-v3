"use client";

import React from "react";
import { EffectSettings } from "@/types/core/settings.types";
import { EmotionalIntelligenceFlags } from "@/types/core/emotional-intelligence.types";
import { SettingItem } from "../components/SettingItem";

interface EmotionPanelProps {
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(
    key: K,
    value: EffectSettings[K]
  ) => void;
  emotionalFlags: EmotionalIntelligenceFlags;
  updateEmotionalFlags: (flags: Partial<EmotionalIntelligenceFlags>) => void;
}

/**
 * 感情分析設定パネル
 * 感情分析エンジンと関連エフェクト設定を管理
 */
export const EmotionPanel: React.FC<EmotionPanelProps> = ({
  settings,
  updateSetting,
  emotionalFlags,
  updateEmotionalFlags,
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">感情分析</h3>

      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">基盤機能</h4>

        <SettingItem
          title="感情分析エンジン"
          description="メッセージから感情を分析する基本機能を有効にします"
          checked={emotionalFlags.emotion_analysis_enabled}
          onChange={(checked) =>
            updateEmotionalFlags({ emotion_analysis_enabled: checked })
          }
        />

        <SettingItem
          title="感情記憶システム"
          description="重要な感情体験を記録・学習する機能を有効にします"
          checked={emotionalFlags.emotional_memory_enabled}
          onChange={(checked) =>
            updateEmotionalFlags({ emotional_memory_enabled: checked })
          }
        />

        <SettingItem
          title="基本エフェクト"
          description="感情に基づく基本的な視覚効果を有効にします"
          checked={emotionalFlags.basic_effects_enabled}
          onChange={(checked) =>
            updateEmotionalFlags({ basic_effects_enabled: checked })
          }
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">統合機能</h4>

        <SettingItem
          title="文脈感情分析"
          description="会話の文脈を考慮した高度な感情分析を有効にします"
          checked={emotionalFlags.contextual_analysis_enabled}
          onChange={(checked) =>
            updateEmotionalFlags({ contextual_analysis_enabled: checked })
          }
        />

        <SettingItem
          title="適応パフォーマンス"
          description="デバイス性能に応じて感情分析の精度を自動調整します"
          checked={emotionalFlags.adaptive_performance_enabled}
          onChange={(checked) =>
            updateEmotionalFlags({ adaptive_performance_enabled: checked })
          }
        />

        <SettingItem
          title="視覚エフェクト"
          description="感情に応じた高度な視覚効果を有効にします"
          checked={emotionalFlags.visual_effects_enabled}
          onChange={(checked) =>
            updateEmotionalFlags({ visual_effects_enabled: checked })
          }
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">高度機能</h4>

        <SettingItem
          title="予測分析"
          description="会話の流れから今後の感情変化を予測します"
          checked={emotionalFlags.predictive_analysis_enabled}
          onChange={(checked) =>
            updateEmotionalFlags({ predictive_analysis_enabled: checked })
          }
        />

        <SettingItem
          title="アドバンストエフェクト"
          description="より洗練された感情表現エフェクトを有効にします"
          checked={emotionalFlags.advanced_effects_enabled}
          onChange={(checked) =>
            updateEmotionalFlags({ advanced_effects_enabled: checked })
          }
        />

        <SettingItem
          title="多層分析"
          description="複数のレイヤーで感情を深く分析します"
          checked={emotionalFlags.multi_layer_analysis_enabled}
          onChange={(checked) =>
            updateEmotionalFlags({ multi_layer_analysis_enabled: checked })
          }
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">既存エフェクト設定</h4>

        <SettingItem
          title="感情表示"
          description="メッセージに感情インジケーターを表示します"
          checked={settings.enableEmotionDisplay ?? false}
          onChange={(checked) => updateSetting("enableEmotionDisplay", checked)}
        />

        <SettingItem
          title="感情パーティクル"
          description="感情に基づくパーティクルエフェクトを表示します"
          checked={settings.enableEmotionParticles ?? false}
          onChange={(checked) => updateSetting("enableEmotionParticles", checked)}
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">デバッグ・安全設定</h4>

        <SettingItem
          title="セーフモード"
          description="安全性を最優先にした保守的な感情分析を行います"
          checked={emotionalFlags.safe_mode}
          onChange={(checked) => updateEmotionalFlags({ safe_mode: checked })}
        />

        <SettingItem
          title="パフォーマンス監視"
          description="感情分析の性能を監視・最適化します"
          checked={emotionalFlags.performance_monitoring}
          onChange={(checked) =>
            updateEmotionalFlags({ performance_monitoring: checked })
          }
        />

        <SettingItem
          title="デバッグモード"
          description="開発者向けの詳細なログと情報を表示します"
          checked={emotionalFlags.debug_mode}
          onChange={(checked) => updateEmotionalFlags({ debug_mode: checked })}
        />
      </div>
    </div>
  );
};
