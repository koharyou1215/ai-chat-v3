"use client";

import React from "react";
import { EffectSettings } from "@/types/core/settings.types";
import { SettingItem } from "../components/SettingItem";

interface TrackerPanelProps {
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(
    key: K,
    value: EffectSettings[K]
  ) => void;
}

/**
 * トラッカーシステム設定パネル
 * トラッカーの自動更新と表示設定を管理
 */
export const TrackerPanel: React.FC<TrackerPanelProps> = ({
  settings,
  updateSetting,
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">
        トラッカーシステム
      </h3>

      <SettingItem
        title="自動トラッカー更新"
        description="メッセージ内容に基づいてトラッカーを自動更新します"
        checked={settings.autoTrackerUpdate}
        onChange={(checked) => updateSetting("autoTrackerUpdate", checked)}
      />

      <SettingItem
        title="トラッカー表示"
        description="チャット画面にトラッカーパネルを表示します"
        checked={settings.showTrackers}
        onChange={(checked) => updateSetting("showTrackers", checked)}
      />
    </div>
  );
};
