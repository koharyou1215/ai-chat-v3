"use client";

import React from "react";
import { EffectSettings } from "@/store/slices/settings.slice";
import { SettingItem } from "../components/SettingItem";

interface TrackerPanelProps {
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(
    key: K,
    value: EffectSettings[K]
  ) => void;
}

/**
 * トラッカー設定パネル
 * メモリーカードとトラッカー機能のパフォーマンス設定を管理
 */
export const TrackerPanel: React.FC<TrackerPanelProps> = ({ 
  settings, 
  updateSetting 
}) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-white mb-4">
      トラッカーシステム
    </h3>

    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4">
      <p className="text-yellow-400 text-sm">
        🎯 パフォーマンステスト:
        メモリーカード機能とトラッカー機能を個別に無効化して、レスポンス速度への影響を測定できます
      </p>
    </div>

    <SettingItem
      title="メモリーカード機能"
      description="会話内容からメモリーカードを生成・検索する機能（無効化でレスポンス向上）"
      checked={settings.enableMemoryCards}
      onChange={(checked) => updateSetting("enableMemoryCards", checked)}
    />

    <SettingItem
      title="トラッカー機能"
      description="キャラクター状態を追跡・更新する機能（無効化でレスポンス向上）"
      checked={settings.enableTrackers}
      onChange={(checked) => updateSetting("enableTrackers", checked)}
    />

    <div className="pt-4 border-t border-white/10">
      <h4 className="text-lg font-medium text-white mb-3">
        トラッカー表示設定
      </h4>

      <SettingItem
        title="自動トラッカー更新"
        description="メッセージ内容に基づいてトラッカーを自動更新します"
        checked={settings.autoTrackerUpdate}
        onChange={(checked) => updateSetting("autoTrackerUpdate", checked)}
        disabled={!settings.enableTrackers}
      />

      <SettingItem
        title="トラッカー表示"
        description="チャット画面にトラッカーパネルを表示します"
        checked={settings.showTrackers}
        onChange={(checked) => updateSetting("showTrackers", checked)}
        disabled={!settings.enableTrackers}
      />
    </div>
  </div>
);