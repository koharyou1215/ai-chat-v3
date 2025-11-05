"use client";

import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { useFileUpload } from "@/hooks/useFileUpload";

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

  // 🆕 ファイルアップロード機能
  const { uploadFile, isUploading, progress } = useFileUpload();
  const desktopFileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);
  const commonFileInputRef = useRef<HTMLInputElement>(null);

  // 🆕 Phase 3: 階層構造対応（フォールバック付き）
  const backgroundImage = appearanceSettings.background?.image?.url || appearanceSettings.backgroundImage || '';
  const backgroundImageDesktop = appearanceSettings.background?.image?.desktop || '';  // 🆕 デスクトップURL
  const backgroundImageMobile = appearanceSettings.background?.image?.mobile || '';    // 🆕 モバイルURL
  const backgroundBlur = appearanceSettings.background?.image?.blur ?? appearanceSettings.backgroundBlur ?? 10;
  const backgroundBlurEnabled = appearanceSettings.background?.image?.blurEnabled ?? appearanceSettings.backgroundBlurEnabled ?? false;
  const backgroundOpacity = appearanceSettings.background?.image?.opacity ?? appearanceSettings.backgroundOpacity ?? 100;
  const backgroundGradient = appearanceSettings.background?.gradient?.value || appearanceSettings.backgroundGradient || '';
  const backgroundType = appearanceSettings.background?.type || appearanceSettings.backgroundType || 'gradient';

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

  // 🆕 ファイルアップロードハンドラー
  const handleFileUpload = async (
    file: File,
    target: 'desktop' | 'mobile' | 'common'
  ) => {
    try {
      const url = await uploadFile(file);

      // 階層構造に対応した設定更新
      const currentBg = (appearanceSettings.background || {}) as NonNullable<typeof appearanceSettings.background>;
      const currentImage = (currentBg?.image || {}) as NonNullable<typeof currentBg.image>;
      const currentGradient = currentBg?.gradient || { value: appearanceSettings.backgroundGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };

      if (target === 'desktop') {
        updateAppearanceSettings({
          background: {
            ...currentBg,
            type: 'image',
            image: {
              ...currentImage,
              desktop: url,
              url: currentImage.url || '',
              mobile: currentImage.mobile || '',
              blur: currentImage.blur ?? 10,
              blurEnabled: currentImage.blurEnabled ?? false,
              opacity: currentImage.opacity ?? 100,
            },
            gradient: currentGradient,
          }
        });
      } else if (target === 'mobile') {
        updateAppearanceSettings({
          background: {
            ...currentBg,
            type: 'image',
            image: {
              ...currentImage,
              mobile: url,
              url: currentImage.url || '',
              desktop: currentImage.desktop || '',
              blur: currentImage.blur ?? 10,
              blurEnabled: currentImage.blurEnabled ?? false,
              opacity: currentImage.opacity ?? 100,
            },
            gradient: currentGradient,
          }
        });
      } else {
        // common
        updateAppearanceSettings({
          background: {
            ...currentBg,
            type: 'image',
            image: {
              ...currentImage,
              url: url,
              desktop: currentImage.desktop || '',
              mobile: currentImage.mobile || '',
              blur: currentImage.blur ?? 10,
              blurEnabled: currentImage.blurEnabled ?? false,
              opacity: currentImage.opacity ?? 100,
            },
            gradient: currentGradient,
          }
        });
      }
    } catch (error) {
      console.error('ファイルアップロードエラー:', error);
      alert(error instanceof Error ? error.message : 'ファイルアップロードに失敗しました');
    }
  };

  const applyThemePreset = (preset: (typeof themePresets)[0]) => {
    updateAppearanceSettings({
      theme: preset.key as typeof appearanceSettings.theme,
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
            value={appearanceSettings.primaryColor || '#000000'}
            onChange={(color) => updateAppearanceSetting("primaryColor", color)}
          />
          <ColorSetting
            label="アクセントカラー"
            value={appearanceSettings.accentColor || '#000000'}
            onChange={(color) => updateAppearanceSetting("accentColor", color)}
          />
          <ColorSetting
            label="背景色"
            value={appearanceSettings.backgroundColor || '#000000'}
            onChange={(color) =>
              updateAppearanceSetting("backgroundColor", color)
            }
          />
          <ColorSetting
            label="サーフェスカラー"
            value={appearanceSettings.surfaceColor || '#000000'}
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
                updateAppearanceSetting("fontWeight", e.target.value as unknown as typeof appearanceSettings.fontWeight)
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
                updateAppearanceSetting("messageSpacing", e.target.value as unknown as typeof appearanceSettings.messageSpacing)
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
                  e.target.value as unknown as typeof appearanceSettings.messageBorderRadius
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
                updateAppearanceSetting("chatMaxWidth", e.target.value as unknown as typeof appearanceSettings.chatMaxWidth)
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
                updateAppearanceSetting("sidebarWidth", e.target.value as unknown as typeof appearanceSettings.sidebarWidth)
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
          <div className="grid grid-cols-3 gap-2">
            {(["color", "gradient", "image", "video", "animated"] as const).map(
              (type) => (
                <button
                  key={type}
                  onClick={() =>
                    updateAppearanceSetting("backgroundType", type)
                  }
                  className={cn(
                    "py-2 px-3 rounded-lg text-sm transition-colors",
                    backgroundType === type
                      ? "bg-purple-500 text-white"
                      : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                  )}>
                  {type === "color"
                    ? "単色"
                    : type === "gradient"
                    ? "グラデーション"
                    : type === "image"
                    ? "画像"
                    : type === "video"
                    ? "🎬 動画"
                    : "アニメーション"}
                </button>
              )
            )}
          </div>
        </div>

        {/* グラデーション設定 */}
        {backgroundType === "gradient" && (
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
                value={backgroundGradient}
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
        {backgroundType === "image" && (
          <div className="space-y-3 p-4 bg-slate-800/30 rounded-lg">
            {/* 🆕 デスクトップ用URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                🖥️ デスクトップ用背景画像URL（横長画像推奨）
              </label>
              <input
                type="text"
                value={backgroundImageDesktop}
                onChange={(e) => {
                  // desktop URL を更新（階層構造に対応）
                  const currentBg = (appearanceSettings.background || {}) as NonNullable<typeof appearanceSettings.background>;
                  const currentImage = (currentBg?.image || {}) as NonNullable<typeof currentBg.image>;
                  const currentGradient = currentBg?.gradient || { value: appearanceSettings.backgroundGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
                  updateAppearanceSettings({
                    background: {
                      ...currentBg,
                      type: 'image',
                      image: {
                        ...currentImage,
                        desktop: e.target.value,
                        url: currentImage.url || '',
                        mobile: currentImage.mobile || '',
                        blur: currentImage.blur ?? 10,
                        blurEnabled: currentImage.blurEnabled ?? false,
                        opacity: currentImage.opacity ?? 100,
                      },
                      gradient: currentGradient,
                    }
                  });
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="https://example.com/desktop-bg.jpg"
              />
              {/* 🆕 ファイルアップロードボタン */}
              <div className="mt-2">
                <input
                  ref={desktopFileInputRef}
                  type="file"
                  accept="image/*,video/mp4,video/webm"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleFileUpload(file, 'desktop');
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => desktopFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>アップロード中... {progress}%</span>
                    </>
                  ) : (
                    <>
                      <span>📁</span>
                      <span>画像/動画を選択してアップロード</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  ※ 10MB以下の画像（JPEG/PNG/GIF/WEBP）または動画（MP4）をアップロード可能
                </p>
              </div>
            </div>

            {/* 🆕 モバイル用URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                📱 モバイル用背景画像URL（縦長画像推奨）
              </label>
              <input
                type="text"
                value={backgroundImageMobile}
                onChange={(e) => {
                  // mobile URL を更新（階層構造に対応）
                  const currentBg = (appearanceSettings.background || {}) as NonNullable<typeof appearanceSettings.background>;
                  const currentImage = (currentBg?.image || {}) as NonNullable<typeof currentBg.image>;
                  const currentGradient = currentBg?.gradient || { value: appearanceSettings.backgroundGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
                  updateAppearanceSettings({
                    background: {
                      ...currentBg,
                      type: 'image',
                      image: {
                        ...currentImage,
                        mobile: e.target.value,
                        url: currentImage.url || '',
                        desktop: currentImage.desktop || '',
                        blur: currentImage.blur ?? 10,
                        blurEnabled: currentImage.blurEnabled ?? false,
                        opacity: currentImage.opacity ?? 100,
                      },
                      gradient: currentGradient,
                    }
                  });
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="https://example.com/mobile-bg.jpg"
              />
              {/* 🆕 ファイルアップロードボタン */}
              <div className="mt-2">
                <input
                  ref={mobileFileInputRef}
                  type="file"
                  accept="image/*,video/mp4,video/webm"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleFileUpload(file, 'mobile');
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => mobileFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>アップロード中... {progress}%</span>
                    </>
                  ) : (
                    <>
                      <span>📁</span>
                      <span>画像/動画を選択してアップロード</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  ※ 10MB以下の画像（JPEG/PNG/GIF/WEBP）または動画（MP4）をアップロード可能
                </p>
              </div>
            </div>

            {/* 後方互換性: 共通URL（フォールバック用） */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                🔄 共通背景画像URL（フォールバック用）
              </label>
              <input
                type="text"
                value={backgroundImage}
                onChange={(e) =>
                  updateAppearanceSetting("backgroundImage", e.target.value)
                }
                className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="https://example.com/image.jpg"
              />
              <p className="text-xs text-gray-500 mt-1">
                ※ デスクトップ/モバイル用URLが未設定の場合に使用されます
              </p>
              {/* 🆕 ファイルアップロードボタン */}
              <div className="mt-2">
                <input
                  ref={commonFileInputRef}
                  type="file"
                  accept="image/*,video/mp4,video/webm"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleFileUpload(file, 'common');
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => commonFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>アップロード中... {progress}%</span>
                    </>
                  ) : (
                    <>
                      <span>📁</span>
                      <span>画像/動画を選択してアップロード</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  ※ 10MB以下の画像（JPEG/PNG/GIF/WEBP）または動画（MP4）をアップロード可能
                </p>
              </div>
            </div>

            {/* 🖼️ 画像背景ぼかし設定 */}
            <SettingItem
              title="画像背景ぼかし効果"
              description="背景画像にぼかし効果を適用します（吹き出しのぼかしとは独立して制御されます）"
              checked={backgroundBlurEnabled}
              onChange={(checked) =>
                updateAppearanceSetting("backgroundBlurEnabled", checked)
              }
            />

            {/* ぼかし強度スライダー */}
            {backgroundBlurEnabled && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">
                    ぼかし強度
                  </label>
                  <span className="text-sm text-purple-400">
                    {backgroundBlur}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={backgroundBlur}
                  onChange={(e) =>
                    updateAppearanceSetting(
                      "backgroundBlur",
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}

            {/* 透明度スライダー */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  背景透明度
                </label>
                <span className="text-sm text-purple-400">
                  {backgroundOpacity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={backgroundOpacity}
                onChange={(e) =>
                  updateAppearanceSetting(
                    "backgroundOpacity",
                    parseInt(e.target.value)
                  )
                }
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* 🎬 動画背景設定 */}
        {backgroundType === "video" && (
          <div className="space-y-3 p-4 bg-slate-800/30 rounded-lg">
            {/* デスクトップ用動画URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                🖥️ デスクトップ用動画URL（横長動画推奨）
              </label>
              <input
                type="text"
                value={appearanceSettings.background?.video?.desktop || ''}
                onChange={(e) => {
                  const currentBg = (appearanceSettings.background || {}) as NonNullable<typeof appearanceSettings.background>;
                  const currentVideo = (currentBg?.video || {}) as NonNullable<typeof currentBg.video>;
                  const currentImage = currentBg?.image || { url: '', desktop: '', mobile: '', blur: 10, blurEnabled: false, opacity: 100 };
                  const currentGradient = currentBg?.gradient || { value: appearanceSettings.backgroundGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
                  updateAppearanceSettings({
                    background: {
                      ...currentBg,
                      type: 'video',
                      image: currentImage,
                      gradient: currentGradient,
                      video: {
                        ...currentVideo,
                        desktop: e.target.value,
                        url: currentVideo.url || '',
                        mobile: currentVideo.mobile || '',
                        opacity: currentVideo.opacity ?? 100,
                        loop: currentVideo.loop ?? true,
                        muted: currentVideo.muted ?? true,
                        autoplay: currentVideo.autoplay ?? true,
                        playbackRate: currentVideo.playbackRate ?? 1.0,
                      }
                    }
                  });
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="https://example.com/desktop-bg.mp4"
              />
              {/* ファイルアップロードボタン */}
              <div className="mt-2">
                <input
                  ref={desktopFileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/mov"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const url = await uploadFile(file);
                        const currentBg = (appearanceSettings.background || {}) as NonNullable<typeof appearanceSettings.background>;
                        const currentVideo = (currentBg?.video || {}) as NonNullable<typeof currentBg.video>;
                        const currentImage = currentBg?.image || { url: '', desktop: '', mobile: '', blur: 10, blurEnabled: false, opacity: 100 };
                        const currentGradient = currentBg?.gradient || { value: appearanceSettings.backgroundGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
                        updateAppearanceSettings({
                          background: {
                            ...currentBg,
                            type: 'video',
                            image: currentImage,
                            gradient: currentGradient,
                            video: {
                              ...currentVideo,
                              desktop: url,
                              url: currentVideo.url || '',
                              mobile: currentVideo.mobile || '',
                              opacity: currentVideo.opacity ?? 100,
                              loop: currentVideo.loop ?? true,
                              muted: currentVideo.muted ?? true,
                              autoplay: currentVideo.autoplay ?? true,
                              playbackRate: currentVideo.playbackRate ?? 1.0,
                            }
                          }
                        });
                      } catch (error) {
                        console.error('動画アップロードエラー:', error);
                        alert(error instanceof Error ? error.message : '動画アップロードに失敗しました');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => desktopFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>アップロード中... {progress}%</span>
                    </>
                  ) : (
                    <>
                      <span>🎬</span>
                      <span>動画を選択してアップロード</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  ※ 10MB以下のMP4/WEBM動画をアップロード可能
                </p>
              </div>
            </div>

            {/* モバイル用動画URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                📱 モバイル用動画URL（縦長動画推奨）
              </label>
              <input
                type="text"
                value={appearanceSettings.background?.video?.mobile || ''}
                onChange={(e) => {
                  const currentBg = (appearanceSettings.background || {}) as NonNullable<typeof appearanceSettings.background>;
                  const currentVideo = (currentBg?.video || {}) as NonNullable<typeof currentBg.video>;
                  const currentImage = currentBg?.image || { url: '', desktop: '', mobile: '', blur: 10, blurEnabled: false, opacity: 100 };
                  const currentGradient = currentBg?.gradient || { value: appearanceSettings.backgroundGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
                  updateAppearanceSettings({
                    background: {
                      ...currentBg,
                      type: 'video',
                      image: currentImage,
                      gradient: currentGradient,
                      video: {
                        ...currentVideo,
                        mobile: e.target.value,
                        url: currentVideo.url || '',
                        desktop: currentVideo.desktop || '',
                        opacity: currentVideo.opacity ?? 100,
                        loop: currentVideo.loop ?? true,
                        muted: currentVideo.muted ?? true,
                        autoplay: currentVideo.autoplay ?? true,
                        playbackRate: currentVideo.playbackRate ?? 1.0,
                      }
                    }
                  });
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="https://example.com/mobile-bg.mp4"
              />
              {/* ファイルアップロードボタン */}
              <div className="mt-2">
                <input
                  ref={mobileFileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/mov"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const url = await uploadFile(file);
                        const currentBg = (appearanceSettings.background || {}) as NonNullable<typeof appearanceSettings.background>;
                        const currentVideo = (currentBg?.video || {}) as NonNullable<typeof currentBg.video>;
                        const currentImage = currentBg?.image || { url: '', desktop: '', mobile: '', blur: 10, blurEnabled: false, opacity: 100 };
                        const currentGradient = currentBg?.gradient || { value: appearanceSettings.backgroundGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
                        updateAppearanceSettings({
                          background: {
                            ...currentBg,
                            type: 'video',
                            image: currentImage,
                            gradient: currentGradient,
                            video: {
                              ...currentVideo,
                              mobile: url,
                              url: currentVideo.url || '',
                              desktop: currentVideo.desktop || '',
                              opacity: currentVideo.opacity ?? 100,
                              loop: currentVideo.loop ?? true,
                              muted: currentVideo.muted ?? true,
                              autoplay: currentVideo.autoplay ?? true,
                              playbackRate: currentVideo.playbackRate ?? 1.0,
                            }
                          }
                        });
                      } catch (error) {
                        console.error('動画アップロードエラー:', error);
                        alert(error instanceof Error ? error.message : '動画アップロードに失敗しました');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => mobileFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>アップロード中... {progress}%</span>
                    </>
                  ) : (
                    <>
                      <span>🎬</span>
                      <span>動画を選択してアップロード</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  ※ 10MB以下のMP4/WEBM動画をアップロード可能
                </p>
              </div>
            </div>

            {/* 共通動画URL（フォールバック用） */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                🔄 共通動画URL（フォールバック用）
              </label>
              <input
                type="text"
                value={appearanceSettings.background?.video?.url || ''}
                onChange={(e) => {
                  const currentBg = (appearanceSettings.background || {}) as NonNullable<typeof appearanceSettings.background>;
                  const currentVideo = (currentBg?.video || {}) as NonNullable<typeof currentBg.video>;
                  const currentImage = currentBg?.image || { url: '', desktop: '', mobile: '', blur: 10, blurEnabled: false, opacity: 100 };
                  const currentGradient = currentBg?.gradient || { value: appearanceSettings.backgroundGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
                  updateAppearanceSettings({
                    background: {
                      ...currentBg,
                      type: 'video',
                      image: currentImage,
                      gradient: currentGradient,
                      video: {
                        ...currentVideo,
                        url: e.target.value,
                        desktop: currentVideo.desktop || '',
                        mobile: currentVideo.mobile || '',
                        opacity: currentVideo.opacity ?? 100,
                        loop: currentVideo.loop ?? true,
                        muted: currentVideo.muted ?? true,
                        autoplay: currentVideo.autoplay ?? true,
                        playbackRate: currentVideo.playbackRate ?? 1.0,
                      }
                    }
                  });
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="https://example.com/bg-video.mp4"
              />
              <p className="text-xs text-gray-500 mt-1">
                ※ デスクトップ/モバイル用URLが未設定の場合に使用されます
              </p>
              {/* ファイルアップロードボタン */}
              <div className="mt-2">
                <input
                  ref={commonFileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/mov"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const url = await uploadFile(file);
                        const currentBg = (appearanceSettings.background || {}) as NonNullable<typeof appearanceSettings.background>;
                        const currentVideo = (currentBg?.video || {}) as NonNullable<typeof currentBg.video>;
                        const currentImage = currentBg?.image || { url: '', desktop: '', mobile: '', blur: 10, blurEnabled: false, opacity: 100 };
                        const currentGradient = currentBg?.gradient || { value: appearanceSettings.backgroundGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
                        updateAppearanceSettings({
                          background: {
                            ...currentBg,
                            type: 'video',
                            image: currentImage,
                            gradient: currentGradient,
                            video: {
                              ...currentVideo,
                              url: url,
                              desktop: currentVideo.desktop || '',
                              mobile: currentVideo.mobile || '',
                              opacity: currentVideo.opacity ?? 100,
                              loop: currentVideo.loop ?? true,
                              muted: currentVideo.muted ?? true,
                              autoplay: currentVideo.autoplay ?? true,
                              playbackRate: currentVideo.playbackRate ?? 1.0,
                            }
                          }
                        });
                      } catch (error) {
                        console.error('動画アップロードエラー:', error);
                        alert(error instanceof Error ? error.message : '動画アップロードに失敗しました');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => commonFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>アップロード中... {progress}%</span>
                    </>
                  ) : (
                    <>
                      <span>🎬</span>
                      <span>動画を選択してアップロード</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  ※ 10MB以下のMP4/WEBM動画をアップロード可能
                </p>
              </div>
            </div>

            {/* 動画設定 */}
            <div className="space-y-4 pt-4 border-t border-gray-700">
              {/* ループ再生 */}
              <SettingItem
                title="ループ再生"
                description="動画を繰り返し再生します"
                checked={appearanceSettings.background?.video?.loop ?? true}
                onChange={(checked) => {
                  const currentBg = (appearanceSettings.background || {}) as NonNullable<typeof appearanceSettings.background>;
                  const currentVideo = (currentBg?.video || {}) as NonNullable<typeof currentBg.video>;
                  const currentImage = currentBg?.image || { url: '', desktop: '', mobile: '', blur: 10, blurEnabled: false, opacity: 100 };
                  const currentGradient = currentBg?.gradient || { value: appearanceSettings.backgroundGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
                  updateAppearanceSettings({
                    background: {
                      ...currentBg,
                      type: 'video',
                      image: currentImage,
                      gradient: currentGradient,
                      video: {
                        ...currentVideo,
                        loop: checked,
                        url: currentVideo.url || '',
                        desktop: currentVideo.desktop || '',
                        mobile: currentVideo.mobile || '',
                        opacity: currentVideo.opacity ?? 100,
                        muted: currentVideo.muted ?? true,
                        autoplay: currentVideo.autoplay ?? true,
                        playbackRate: currentVideo.playbackRate ?? 1.0,
                      }
                    }
                  });
                }}
              />

              {/* 動画透明度 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">
                    動画透明度
                  </label>
                  <span className="text-sm text-purple-400">
                    {appearanceSettings.background?.video?.opacity ?? 100}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={appearanceSettings.background?.video?.opacity ?? 100}
                  onChange={(e) => {
                    const currentBg = (appearanceSettings.background || {}) as NonNullable<typeof appearanceSettings.background>;
                    const currentVideo = (currentBg?.video || {}) as NonNullable<typeof currentBg.video>;
                    const currentImage = currentBg?.image || { url: '', desktop: '', mobile: '', blur: 10, blurEnabled: false, opacity: 100 };
                    const currentGradient = currentBg?.gradient || { value: appearanceSettings.backgroundGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
                    updateAppearanceSettings({
                      background: {
                        ...currentBg,
                        type: 'video',
                        image: currentImage,
                        gradient: currentGradient,
                        video: {
                          ...currentVideo,
                          opacity: parseInt(e.target.value),
                          url: currentVideo.url || '',
                          desktop: currentVideo.desktop || '',
                          mobile: currentVideo.mobile || '',
                          loop: currentVideo.loop ?? true,
                          muted: currentVideo.muted ?? true,
                          autoplay: currentVideo.autoplay ?? true,
                          playbackRate: currentVideo.playbackRate ?? 1.0,
                        }
                      }
                    });
                  }}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* 再生速度 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">
                    再生速度
                  </label>
                  <span className="text-sm text-purple-400">
                    {appearanceSettings.background?.video?.playbackRate ?? 1.0}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={appearanceSettings.background?.video?.playbackRate ?? 1.0}
                  onChange={(e) => {
                    const currentBg = (appearanceSettings.background || {}) as NonNullable<typeof appearanceSettings.background>;
                    const currentVideo = (currentBg?.video || {}) as NonNullable<typeof currentBg.video>;
                    const currentImage = currentBg?.image || { url: '', desktop: '', mobile: '', blur: 10, blurEnabled: false, opacity: 100 };
                    const currentGradient = currentBg?.gradient || { value: appearanceSettings.backgroundGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
                    updateAppearanceSettings({
                      background: {
                        ...currentBg,
                        type: 'video',
                        image: currentImage,
                        gradient: currentGradient,
                        video: {
                          ...currentVideo,
                          playbackRate: parseFloat(e.target.value),
                          url: currentVideo.url || '',
                          desktop: currentVideo.desktop || '',
                          mobile: currentVideo.mobile || '',
                          loop: currentVideo.loop ?? true,
                          muted: currentVideo.muted ?? true,
                          autoplay: currentVideo.autoplay ?? true,
                          opacity: currentVideo.opacity ?? 100,
                        }
                      }
                    });
                  }}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
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
          checked={appearanceSettings.enableAnimations ?? true}
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
                e.target.value as unknown as typeof appearanceSettings.transitionDuration
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
