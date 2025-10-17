"use client";

import React from "react";
import { EffectSettings } from "@/types/core/settings.types";
import type { UnifiedSettings } from "@/services/settings-manager";
import { SettingItem } from "../components/SettingItem";

type EmotionalIntelligenceSettings = UnifiedSettings['emotionalIntelligence'];

interface EmotionPanelProps {
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(
    key: K,
    value: EffectSettings[K]
  ) => void;
  emotionalIntelligence: EmotionalIntelligenceSettings;
  updateEmotionalIntelligence: (updates: Partial<EmotionalIntelligenceSettings>) => void;
}

/**
 * 感情分析設定パネル
 * 感情分析エンジンと関連エフェクト設定を管理
 */
export const EmotionPanel: React.FC<EmotionPanelProps> = ({
  settings,
  updateSetting,
  emotionalIntelligence,
  updateEmotionalIntelligence,
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">感情分析</h3>

      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">基盤機能</h4>

        <SettingItem
          title="感情分析エンジン"
          description="メッセージから感情を分析する基本機能を有効にします"
          checked={emotionalIntelligence.enabled}
          onChange={(checked) =>
            updateEmotionalIntelligence({ enabled: checked })
          }
        />

        <SettingItem
          title="基本分析"
          description="基本的な感情分析を実行します"
          checked={emotionalIntelligence.analysis.basic}
          onChange={(checked) =>
            updateEmotionalIntelligence({
              analysis: { ...emotionalIntelligence.analysis, basic: checked }
            })
          }
        />

        <SettingItem
          title="感情記憶システム"
          description="重要な感情体験を記録・学習する機能を有効にします"
          checked={emotionalIntelligence.memoryEnabled}
          onChange={(checked) =>
            updateEmotionalIntelligence({ memoryEnabled: checked })
          }
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">統合機能</h4>

        <SettingItem
          title="文脈感情分析"
          description="会話の文脈を考慮した高度な感情分析を有効にします"
          checked={emotionalIntelligence.analysis.contextual}
          onChange={(checked) =>
            updateEmotionalIntelligence({
              analysis: { ...emotionalIntelligence.analysis, contextual: checked }
            })
          }
        />

        <SettingItem
          title="適応パフォーマンス"
          description="デバイス性能に応じて感情分析の精度を自動調整します"
          checked={emotionalIntelligence.adaptivePerformance}
          onChange={(checked) =>
            updateEmotionalIntelligence({ adaptivePerformance: checked })
          }
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">高度機能</h4>

        <SettingItem
          title="予測分析"
          description="会話の流れから今後の感情変化を予測します"
          checked={emotionalIntelligence.analysis.predictive}
          onChange={(checked) =>
            updateEmotionalIntelligence({
              analysis: { ...emotionalIntelligence.analysis, predictive: checked }
            })
          }
        />

        <SettingItem
          title="多層分析"
          description="複数のレイヤーで感情を深く分析します"
          checked={emotionalIntelligence.analysis.multiLayer}
          onChange={(checked) =>
            updateEmotionalIntelligence({
              analysis: { ...emotionalIntelligence.analysis, multiLayer: checked }
            })
          }
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">感情表示エフェクト</h4>

        <SettingItem
          title="リアルタイム検出"
          description="入力中の感情をリアルタイムで検出します"
          checked={settings.emotion.realtimeDetection}
          onChange={(checked) =>
            updateSetting("emotion", {
              ...settings.emotion,
              realtimeDetection: checked
            })
          }
        />

        <SettingItem
          title="自動リアクション"
          description="感情に応じた自動応答を有効にします"
          checked={settings.emotion.autoReactions}
          onChange={(checked) =>
            updateSetting("emotion", {
              ...settings.emotion,
              autoReactions: checked
            })
          }
        />

        <SettingItem
          title="感情アイコン表示"
          description="感情アイコンを表示します"
          checked={settings.emotion.display.showIcon}
          onChange={(checked) =>
            updateSetting("emotion", {
              ...settings.emotion,
              display: {
                ...settings.emotion.display,
                showIcon: checked
              }
            })
          }
        />

        <SettingItem
          title="感情テキスト表示"
          description="感情名をテキストで表示します"
          checked={settings.emotion.display.showText}
          onChange={(checked) =>
            updateSetting("emotion", {
              ...settings.emotion,
              display: {
                ...settings.emotion.display,
                showText: checked
              }
            })
          }
        />

        <SettingItem
          title="感情カラー適用"
          description="感情に応じた色を適用します"
          checked={settings.emotion.display.applyColors}
          onChange={(checked) =>
            updateSetting("emotion", {
              ...settings.emotion,
              display: {
                ...settings.emotion.display,
                applyColors: checked
              }
            })
          }
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">デバッグ・安全設定</h4>

        <SettingItem
          title="セーフモード"
          description="エラー時に安全な動作を保証します"
          checked={emotionalIntelligence.safeMode}
          onChange={(checked) =>
            updateEmotionalIntelligence({ safeMode: checked })
          }
        />

        <SettingItem
          title="レガシーフォールバック"
          description="問題発生時に旧システムへ自動切り替えします"
          checked={emotionalIntelligence.fallbackToLegacy}
          onChange={(checked) =>
            updateEmotionalIntelligence({ fallbackToLegacy: checked })
          }
        />

        <SettingItem
          title="パフォーマンス監視"
          description="性能メトリクスを記録します"
          checked={emotionalIntelligence.performanceMonitoring}
          onChange={(checked) =>
            updateEmotionalIntelligence({ performanceMonitoring: checked })
          }
        />

        <SettingItem
          title="デバッグモード"
          description="詳細なログを出力します"
          checked={emotionalIntelligence.debugMode}
          onChange={(checked) =>
            updateEmotionalIntelligence({ debugMode: checked })
          }
        />
      </div>
    </div>
  );
};
