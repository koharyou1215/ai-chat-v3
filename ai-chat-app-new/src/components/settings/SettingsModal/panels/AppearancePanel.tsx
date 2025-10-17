"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";

// SettingItem コンポーネント
const SettingItem: React.FC<{
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  badge?: string;
}> = ({ title, description, checked, onChange, badge }) => (
  <div className="flex items-start justify-between p-4 bg-slate-800/50 rounded-lg border border-gray-700">
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <h4 className="font-medium text-white">{title}</h4>
        {badge && (
          <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
    <div className="ml-4">
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
      </label>
    </div>
  </div>
);

// カラー設定コンポーネント
const ColorSetting: React.FC<{
  label: string;
  value: string;
  onChange: (color: string) => void;
}> = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-300">{label}</label>
    <div className="flex gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-8 rounded border border-gray-600 cursor-pointer"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-2 py-1 bg-slate-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-purple-500"
        placeholder="#000000"
      />
    </div>
  </div>
);

// AppearancePanel メインコンポーネント
const AppearancePanel: React.FC = () => {
  const { appearanceSettings, updateAppearanceSettings } = useAppStore();
  const [previewMode, setPreviewMode] = useState(false);

  // テーマプリセット
  const themePresets = [
    {
      name: "ダーク",
      key: "dark",
      colors: {
        primaryColor: "#8b5cf6",
        accentColor: "#ec4899",
        backgroundColor: "#0f0f23",
        surfaceColor: "#1e1e2e",
        textColor: "#ffffff",
        secondaryTextColor: "#9ca3af",
      },
    },
    {
      name: "ライト",
      key: "light",
      colors: {
        primaryColor: "#6366f1",
        accentColor: "#f59e0b",
        backgroundColor: "#ffffff",
        surfaceColor: "#f9fafb",
        textColor: "#111827",
        secondaryTextColor: "#6b7280",
      },
    },
    {
      name: "ミッドナイト",
      key: "midnight",
      colors: {
        primaryColor: "#3b82f6",
        accentColor: "#10b981",
        backgroundColor: "#0c0a09",
        surfaceColor: "#1c1917",
        textColor: "#f5f5f4",
        secondaryTextColor: "#a8a29e",
      },
    },
    {
      name: "コズミック",
      key: "cosmic",
      colors: {
        primaryColor: "#8b5cf6",
        accentColor: "#06b6d4",
        backgroundColor: "#1e1b4b",
        surfaceColor: "#312e81",
        textColor: "#e0e7ff",
        secondaryTextColor: "#c7d2fe",
      },
    },
    {
      name: "サンセット",
      key: "sunset",
      colors: {
        primaryColor: "#f97316",
        accentColor: "#ef4444",
        backgroundColor: "#431407",
        surfaceColor: "#7c2d12",
        textColor: "#fed7aa",
        secondaryTextColor: "#fb923c",
      },
    },
  ];

  const updateAppearanceSetting = <K extends keyof typeof appearanceSettings>(
    key: K,
    value: (typeof appearanceSettings)[K]
  ) => {
    updateAppearanceSettings({ [key]: value });
  };

  const applyThemePreset = (preset: (typeof themePresets)[0]) => {
    updateAppearanceSettings({
      theme: preset.key as any,
      ...preset.colors,
    });
  };

  const fontSizeMap = {
    small: "14px",
    medium: "16px",
    large: "18px",
    "x-large": "20px",
  };

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">外観設定</h3>
        <button
          onClick={() => setPreviewMode(!previewMode)}
          className={cn(
            "px-3 py-2 rounded-lg text-sm transition-colors",
            previewMode
              ? "bg-purple-500 text-white"
              : "bg-slate-700 text-gray-300 hover:bg-slate-600"
          )}>
          {previewMode ? "プレビュー停止" : "プレビューモード"}
        </button>
      </div>

      {/* テーマ選択 */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">テーマプリセット</h4>
        <div className="grid grid-cols-2 gap-3">
          {themePresets.map((preset) => (
            <button
              key={preset.key}
              onClick={() => applyThemePreset(preset)}
              className={cn(
                "p-3 rounded-lg border-2 transition-all group",
                appearanceSettings.theme === preset.key
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-gray-600 hover:border-gray-500 bg-slate-800/50"
              )}>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: preset.colors.primaryColor }}
                />
                <span className="text-sm font-medium text-white">
                  {preset.name}
                </span>
              </div>
              <div className="flex gap-1">
                {Object.values(preset.colors)
                  .slice(0, 4)
                  .map((color, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* カラー設定 */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">カラー設定</h4>
        <div className="grid grid-cols-2 gap-4">
          <ColorSetting
            label="プライマリカラー"
            value={appearanceSettings.primaryColor}
            onChange={(color) => updateAppearanceSetting("primaryColor", color)}
          />
          <ColorSetting
            label="アクセントカラー"
            value={appearanceSettings.accentColor}
            onChange={(color) => updateAppearanceSetting("accentColor", color)}
          />
          <ColorSetting
            label="背景色"
            value={appearanceSettings.backgroundColor}
            onChange={(color) =>
              updateAppearanceSetting("backgroundColor", color)
            }
          />
          <ColorSetting
            label="サーフェスカラー"
            value={appearanceSettings.surfaceColor}
            onChange={(color) => updateAppearanceSetting("surfaceColor", color)}
          />
        </div>
      </div>

      {/* フォント設定 */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">フォント設定</h4>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              フォントサイズ
            </label>
            <div className="flex gap-2">
              {(["small", "medium", "large", "x-large"] as const).map(
                (size) => (
                  <button
                    key={size}
                    onClick={() => updateAppearanceSetting("fontSize", size)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm transition-colors",
                      appearanceSettings.fontSize === size
                        ? "bg-purple-500 text-white"
                        : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                    )}
                    style={{ fontSize: fontSizeMap[size] }}>
                    {size === "small"
                      ? "小"
                      : size === "medium"
                      ? "中"
                      : size === "large"
                      ? "大"
                      : "特大"}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              フォントウェイト
            </label>
            <select
              value={appearanceSettings.fontWeight}
              onChange={(e) =>
                updateAppearanceSetting("fontWeight", e.target.value as any)
              }
              className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
              <option value="light">軽い (Light)</option>
              <option value="normal">通常 (Normal)</option>
              <option value="medium">中太 (Medium)</option>
              <option value="bold">太字 (Bold)</option>
            </select>
          </div>
        </div>
      </div>

      {/* レイアウト設定 */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">レイアウト設定</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              メッセージ間隔
            </label>
            <select
              value={appearanceSettings.messageSpacing}
              onChange={(e) =>
                updateAppearanceSetting("messageSpacing", e.target.value as any)
              }
              className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
              <option value="compact">コンパクト</option>
              <option value="normal">通常</option>
              <option value="spacious">ゆったり</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              角の丸み
            </label>
            <select
              value={appearanceSettings.messageBorderRadius}
              onChange={(e) =>
                updateAppearanceSetting(
                  "messageBorderRadius",
                  e.target.value as any
                )
              }
              className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
              <option value="none">なし</option>
              <option value="small">小</option>
              <option value="medium">中</option>
              <option value="large">大</option>
              <option value="full">完全</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              チャット幅
            </label>
            <select
              value={appearanceSettings.chatMaxWidth}
              onChange={(e) =>
                updateAppearanceSetting("chatMaxWidth", e.target.value as any)
              }
              className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
              <option value="narrow">狭い</option>
              <option value="normal">通常</option>
              <option value="wide">広い</option>
              <option value="full">フル幅</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              サイドバー幅
            </label>
            <select
              value={appearanceSettings.sidebarWidth}
              onChange={(e) =>
                updateAppearanceSetting("sidebarWidth", e.target.value as any)
              }
              className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
              <option value="narrow">狭い</option>
              <option value="normal">通常</option>
              <option value="wide">広い</option>
            </select>
          </div>
        </div>
      </div>

      {/* 背景設定 */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">背景設定</h4>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            背景タイプ
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["solid", "gradient", "image", "animated"] as const).map(
              (type) => (
                <button
                  key={type}
                  onClick={() =>
                    updateAppearanceSetting("backgroundType", type)
                  }
                  className={cn(
                    "py-2 px-3 rounded-lg text-sm transition-colors",
                    appearanceSettings.backgroundType === type
                      ? "bg-purple-500 text-white"
                      : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                  )}>
                  {type === "solid"
                    ? "単色"
                    : type === "gradient"
                    ? "グラデーション"
                    : type === "image"
                    ? "画像"
                    : "アニメーション"}
                </button>
              )
            )}
          </div>
        </div>

        {/* グラデーション設定 */}
        {appearanceSettings.backgroundType === "gradient" && (
          <div className="space-y-3 p-4 bg-slate-800/30 rounded-lg">
            <label className="block text-sm font-medium text-gray-300">
              グラデーションプリセット
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  name: "パープル",
                  value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                },
                {
                  name: "サンセット",
                  value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                },
                {
                  name: "オーシャン",
                  value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                },
                {
                  name: "フォレスト",
                  value: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                },
              ].map((gradient) => (
                <button
                  key={gradient.name}
                  onClick={() =>
                    updateAppearanceSetting(
                      "backgroundGradient",
                      gradient.value
                    )
                  }
                  className="relative h-12 rounded-lg border border-gray-600 overflow-hidden group"
                  style={{ background: gradient.value }}>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white text-xs font-medium drop-shadow-lg">
                      {gradient.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                カスタムグラデーション
              </label>
              <input
                type="text"
                value={appearanceSettings.backgroundGradient}
                onChange={(e) =>
                  updateAppearanceSetting("backgroundGradient", e.target.value)
                }
                className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="linear-gradient(135deg, #color1, #color2)"
              />
            </div>
          </div>
        )}

        {/* 画像背景設定 */}
        {appearanceSettings.backgroundType === "image" && (
          <div className="space-y-3 p-4 bg-slate-800/30 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                背景画像URL
              </label>
              <input
                type="text"
                value={appearanceSettings.backgroundImage}
                onChange={(e) =>
                  updateAppearanceSetting("backgroundImage", e.target.value)
                }
                className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
        )}
      </div>

      {/* アニメーション設定 */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">アニメーション設定</h4>

        <SettingItem
          title="アニメーションを有効にする"
          description="UIのアニメーション効果を有効にします"
          checked={appearanceSettings.enableAnimations}
          onChange={(checked) =>
            updateAppearanceSetting("enableAnimations", checked)
          }
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            アニメーション速度
          </label>
          <select
            value={appearanceSettings.transitionDuration}
            onChange={(e) =>
              updateAppearanceSetting(
                "transitionDuration",
                e.target.value as any
              )
            }
            className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
            <option value="fast">高速</option>
            <option value="normal">通常</option>
            <option value="slow">低速</option>
          </select>
        </div>
      </div>

      {/* カスタムCSS */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">カスタムCSS</h4>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            追加のCSSスタイル
          </label>
          <textarea
            value={appearanceSettings.customCSS}
            onChange={(e) =>
              updateAppearanceSetting("customCSS", e.target.value)
            }
            className="w-full h-32 px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-purple-500"
            placeholder="/* カスタムCSSをここに入力 */"
          />
          <p className="text-xs text-gray-400 mt-1">
            上級者向け：カスタムCSSを追加してさらなるカスタマイズが可能です
          </p>
        </div>
      </div>

      {/* プレビューエリア */}
      {previewMode && (
        <div className="p-4 bg-slate-800/50 rounded-lg border border-gray-600">
          <h5 className="text-sm font-medium text-white mb-3">プレビュー</h5>
          <div className="space-y-2">
            <div
              className="p-3 rounded-lg"
              style={{
                backgroundColor: appearanceSettings.surfaceColor,
                color: appearanceSettings.textColor,
                fontSize:
                  fontSizeMap[
                    appearanceSettings.fontSize as keyof typeof fontSizeMap
                  ],
                fontWeight: appearanceSettings.fontWeight,
              }}>
              これはサンプルメッセージです。
            </div>
            <div
              className="p-2 rounded text-right"
              style={{
                backgroundColor: appearanceSettings.primaryColor,
                color: "white",
                fontSize:
                  fontSizeMap[
                    appearanceSettings.fontSize as keyof typeof fontSizeMap
                  ],
              }}>
              ユーザーメッセージのプレビュー
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppearancePanel;
