"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  X,
  Palette,
  Volume2,
  Cpu,
  Database,
  Shield,
  Bell,
  Globe,
  Code,
  Save,
  Sparkles,
  Brain,
  Activity,
  Gauge,
  Wand2,
  Lightbulb,
  Edit3,
  Eye,
  EyeOff,
  TestTube2,
  Upload,
  Download,
  RefreshCw,
  FileText,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import {
  SystemPrompts,
  APIConfig,
  APIProvider,
} from "@/types/core/settings.types";
import { getModelPricing } from "@/constants/model-pricing";
import {
  ModelPricingDisplay,
  CompactModelPricing,
} from "./ModelPricingDisplay";
// Effect and appearance settings types are now handled by unified settings
import { StorageManager } from "@/utils/storage-cleanup";

// Type definitions for settings
interface EffectSettings {
  colorfulBubbles: boolean;
  fontEffects: boolean;
  particleEffects: boolean;
  typewriterEffect: boolean;
  colorfulBubblesIntensity: number;
  fontEffectsIntensity: number;
  particleEffectsIntensity: number;
  typewriterIntensity: number;
  bubbleOpacity: number;
  bubbleBlur: boolean;
  hologramMessages: boolean;
  particleText: boolean;
  rippleEffects: boolean;
  backgroundParticles: boolean;
  hologramIntensity: number;
  particleTextIntensity: number;
  rippleIntensity: number;
  backgroundParticlesIntensity: number;
  progressiveResponse?: boolean;
  progressiveResponseSpeed?: number;
  shadowEffects?: boolean;
  shadowEffectsIntensity?: number;
  glowEffects?: boolean;
  glowEffectsIntensity?: number;
  neonText?: boolean;
  neonTextIntensity?: number;
  enableEmotionDisplay?: boolean;
  enableEmotionParticles?: boolean;
  emotionDisplayIntensity?: number;
  emotionParticlesIntensity?: number;
  backgroundDim?: boolean;
  backgroundDimIntensity?: number;
  backgroundImage?: string | null;
  backgroundImageOpacity?: number;
  backgroundImageBlur?: number;
  [key: string]: any;
}

interface AppearanceSettings {
  theme: "dark" | "light" | "midnight" | "cosmic" | "sunset" | "custom";
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  secondaryTextColor: string;
  borderColor: string;
  shadowColor: string;
  fontFamily: string;
  fontSize: "small" | "medium" | "large" | "x-large";
  fontWeight: "light" | "normal" | "medium" | "bold";
  lineHeight: "compact" | "normal" | "relaxed";
  layoutDensity?: "compact" | "comfortable" | "spacious";
  borderRadius?: "none" | "small" | "medium" | "large" | "x-large";
  animationSpeed?: "instant" | "fast" | "normal" | "slow";
  glassmorphism?: boolean;
  glassmorphismIntensity?: number;
  backgroundPattern?: string;
  backgroundPatternOpacity?: number;
}

// エフェクト強度調整用スライダーコンポーネント
interface IntensitySliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

const IntensitySlider: React.FC<IntensitySliderProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}) => {
  return (
    <div className="flex items-center justify-between space-x-4 py-2">
      <div className="flex-1">
        <label className="text-sm text-white/70 mb-1 block">{label}</label>
        <div className="flex items-center space-x-3">
          <input
            type="range"
            min={min}
            max={max}
            value={value || 0}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider-thumb:appearance-none slider-thumb:h-4 slider-thumb:w-4 slider-thumb:bg-blue-500 slider-thumb:rounded-full slider-thumb:cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${value}%, rgba(255,255,255,0.2) ${value}%, rgba(255,255,255,0.2) 100%)`,
            }}
          />
          <span className="text-white/80 text-sm min-w-[3rem] text-right">
            {value}%
          </span>
        </div>
      </div>
    </div>
  );
};

// フォントエフェクト専用スライダーコンポーネント
interface FontEffectSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const FontEffectSlider: React.FC<FontEffectSliderProps> = ({
  value,
  onChange,
}) => {
  const getEffectDescription = (intensity: number) => {
    if (intensity < 30) return "無効";
    if (intensity < 40) return "基本グラデーション";
    if (intensity < 50) return "グラデーション + シャドウ";
    if (intensity < 60) return "グラデーション + シャドウ + アニメーション";
    if (intensity < 70)
      return "グラデーション + シャドウ + アニメーション + 3D変形";
    return "全効果 + フィルター";
  };

  return (
    <div className="flex items-center justify-between space-x-4 py-2">
      <div className="flex-1">
        <label className="text-sm text-white/70 mb-1 block">
          フォントエフェクト強度
        </label>
        <div className="flex items-center space-x-3">
          <input
            type="range"
            min={0}
            max={100}
            value={value || 0}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider-thumb:appearance-none slider-thumb:h-4 slider-thumb:w-4 slider-thumb:bg-blue-500 slider-thumb:rounded-full slider-thumb:cursor-pointer"
            style={{
              background: `linear-gradient(to right, #ff6b6b 0%, #4ecdc4 25%, #45b7d1 50%, #96ceb4 75%, #feca57 100%)`,
            }}
          />
          <span className="text-white/80 text-sm min-w-[3rem] text-right">
            {value}%
          </span>
        </div>
        <div className="text-xs text-gray-400 mt-1 text-center">
          {getEffectDescription(value)}
        </div>
      </div>
    </div>
  );
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
  onEffectSettingsChange?: (settings: EffectSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = "effects",
  onEffectSettingsChange,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const {
    systemPrompts,
    enableSystemPrompt,
    enableJailbreakPrompt,
    updateSystemPrompts,
    setEnableSystemPrompt,
    setEnableJailbreakPrompt,
    apiConfig,
    setTemperature,
    setMaxTokens,
    setTopP,
    openRouterApiKey,
    setOpenRouterApiKey,
    geminiApiKey,
    setGeminiApiKey,
    useDirectGeminiAPI,
    setUseDirectGeminiAPI,
    setAPIModel,
    setAPIProvider,
    effectSettings,
    updateEffectSettings,
  } = useAppStore();

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const [localSystemPrompts, setLocalSystemPrompts] =
    useState<SystemPrompts>(systemPrompts);

  useEffect(() => {
    if (isOpen) {
      setLocalSystemPrompts(systemPrompts);
    }
  }, [isOpen, systemPrompts]);

  const [_showSystemPrompt, _setShowSystemPrompt] = useState(false);
  const [_showJailbreakPrompt, _setShowJailbreakPrompt] = useState(false);
  const [_showReplySuggestionPrompt, _setShowReplySuggestionPrompt] =
    useState(false);
  const [_showTextEnhancementPrompt, _setShowTextEnhancementPrompt] =
    useState(false);

  // エフェクト設定のローカル状態 - Zustandストアから取得
  const [localEffectSettings, setLocalEffectSettings] =
    useState<EffectSettings>(effectSettings);

  // ストアの設定が変更された場合はローカル状態を更新
  useEffect(() => {
    if (isOpen) {
      setLocalEffectSettings(effectSettings);
    }
  }, [isOpen, effectSettings]);

  const tabs = [
    { id: "effects", label: "エフェクト", icon: Sparkles },
    { id: "3d", label: "3D機能", icon: Wand2 },
    { id: "emotion", label: "感情分析", icon: Brain },
    { id: "tracker", label: "トラッカー", icon: Activity },
    { id: "performance", label: "パフォーマンス", icon: Gauge },
    { id: "chat", label: "チャット", icon: Brain },
    { id: "characters", label: "キャラクター管理", icon: Edit3 },
    { id: "appearance", label: "外観", icon: Palette },
    { id: "voice", label: "音声", icon: Volume2 },
    { id: "ai", label: "AI", icon: Cpu },
    { id: "data", label: "データ", icon: Database },
    { id: "privacy", label: "プライバシー", icon: Shield },
    { id: "notifications", label: "通知", icon: Bell },
    { id: "language", label: "言語・地域", icon: Globe },
    { id: "developer", label: "開発者", icon: Code },
  ];

  const updateEffectSetting = <K extends keyof EffectSettings>(
    key: K,
    value: EffectSettings[K]
  ) => {
    const newSettings = {
      ...localEffectSettings,
      [key]: value,
    };
    setLocalEffectSettings(newSettings);

    // Zustandストアに即座に保存（永続化される）
    updateEffectSettings(newSettings);

    if (onEffectSettingsChange) {
      onEffectSettingsChange(newSettings);
    }
  };

  const handleSave = () => {
    // AI設定（プロンプト）を保存
    updateSystemPrompts(localSystemPrompts);

    // エフェクト設定を保存
    if (onEffectSettingsChange) {
      onEffectSettingsChange(localEffectSettings);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[80vh] md:max-h-[80vh] max-h-[90vh] bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* ヘッダー */}
            <div className="px-6 py-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-white">設定</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>
              
              {/* モバイル用タブバー */}
              <div className="md:hidden overflow-x-auto scrollbar-thin scrollbar-thumb-purple-400/20">
                <div className="flex gap-2 pb-2 min-w-max">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors",
                        activeTab === tab.id
                          ? "bg-purple-500/20 text-purple-400"
                          : "text-white/60 bg-white/5"
                      )}>
                      <tab.icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 flex overflow-hidden md:overflow-hidden overflow-y-auto">
              {/* サイドバー - モバイルでは非表示 */}
              <div className="hidden md:block w-48 border-r border-white/10 p-4 overflow-y-auto">
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                        activeTab === tab.id
                          ? "bg-purple-500/20 text-purple-400"
                          : "text-white/60 hover:bg-white/5 hover:text-white/80"
                      )}>
                      <tab.icon className="w-4 h-4" />
                      <span className="text-sm">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* 設定パネル */}
              <div className="flex-1 p-6 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
                {activeTab === "effects" && (
                  <EffectsPanel
                    settings={localEffectSettings}
                    updateSetting={updateEffectSetting}
                  />
                )}
                {activeTab === "3d" && (
                  <ThreeDPanel
                    settings={localEffectSettings}
                    updateSetting={updateEffectSetting}
                  />
                )}
                {activeTab === "emotion" && (
                  <EmotionPanel
                    settings={localEffectSettings}
                    updateSetting={updateEffectSetting}
                  />
                )}
                {activeTab === "tracker" && (
                  <TrackerPanel
                    settings={localEffectSettings}
                    updateSetting={updateEffectSetting}
                  />
                )}
                {activeTab === "performance" && (
                  <PerformancePanel
                    settings={localEffectSettings}
                    updateSetting={updateEffectSetting}
                  />
                )}
                {activeTab === "chat" && <ChatPanel />}
                {activeTab === "appearance" && <AppearancePanel />}
                {activeTab === "voice" && <VoicePanel />}
                {activeTab === "ai" && (
                  <AIPanel
                    systemPrompts={localSystemPrompts}
                    enableSystemPrompt={enableSystemPrompt}
                    enableJailbreakPrompt={enableJailbreakPrompt}
                    apiConfig={apiConfig}
                    openRouterApiKey={openRouterApiKey ?? ""}
                    geminiApiKey={geminiApiKey ?? ""}
                    showSystemPrompt={_showSystemPrompt}
                    showJailbreakPrompt={_showJailbreakPrompt}
                    showReplySuggestionPrompt={_showReplySuggestionPrompt}
                    showTextEnhancementPrompt={_showTextEnhancementPrompt}
                    onUpdateSystemPrompts={setLocalSystemPrompts}
                    onSetEnableSystemPrompt={setEnableSystemPrompt}
                    onSetEnableJailbreakPrompt={setEnableJailbreakPrompt}
                    onSetTemperature={setTemperature}
                    onSetMaxTokens={setMaxTokens}
                    onSetTopP={setTopP}
                    onToggleSystemPrompt={() =>
                      _setShowSystemPrompt(!_showSystemPrompt)
                    }
                    onToggleJailbreakPrompt={() =>
                      _setShowJailbreakPrompt(!_showJailbreakPrompt)
                    }
                    onToggleReplySuggestionPrompt={() =>
                      _setShowReplySuggestionPrompt(!_showReplySuggestionPrompt)
                    }
                    onToggleTextEnhancementPrompt={() =>
                      _setShowTextEnhancementPrompt(!_showTextEnhancementPrompt)
                    }
                    setAPIModel={setAPIModel}
                    setAPIProvider={setAPIProvider}
                    setOpenRouterApiKey={setOpenRouterApiKey}
                    setGeminiApiKey={setGeminiApiKey}
                    useDirectGeminiAPI={useDirectGeminiAPI ?? false}
                    setUseDirectGeminiAPI={setUseDirectGeminiAPI}
                  />
                )}
                {activeTab === "language" && <LanguagePanel />}
                {activeTab === "characters" && <CharacterManagementPanel />}
                {activeTab === "data" && <DataManagementPanel />}
                {["privacy", "notifications", "developer"].includes(
                  activeTab
                ) && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      {tabs.find((t) => t.id === activeTab)?.label}設定
                    </h3>
                    <p className="text-gray-400">この設定は開発中です。</p>
                  </div>
                )}
              </div>
            </div>

            {/* フッター */}
            <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-white/60 hover:text-white/80 transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2">
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// エフェクト設定パネル
const EffectsPanel: React.FC<{
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(
    key: K,
    value: EffectSettings[K]
  ) => void;
}> = ({ settings, updateSetting }) => (
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
      <div className="ml-6 mb-4">
        <FontEffectSlider
          value={settings.fontEffectsIntensity}
          onChange={(value) => updateSetting("fontEffectsIntensity", value)}
        />
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
        title="背景ぼかし効果"
        description="吹き出し背景にぼかし効果を適用します（半透明時により美しい見た目になります）"
        checked={settings.bubbleBlur}
        onChange={(checked) => updateSetting("bubbleBlur", checked)}
      />
    </div>
  </div>
);

// 3D機能設定パネル
const ThreeDPanel: React.FC<{
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(
    key: K,
    value: EffectSettings[K]
  ) => void;
}> = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-white mb-4">3D機能</h3>

    <SettingItem
      title="ホログラムメッセージ"
      description="WebGLを使用した立体的なメッセージ表示"
      checked={settings.hologramMessages}
      onChange={(checked) => updateSetting("hologramMessages", checked)}
      badge="実験的"
    />

    <SettingItem
      title="パーティクルテキスト"
      description="文字が粒子化して集合・分散するエフェクト"
      checked={settings.particleText}
      onChange={(checked) => updateSetting("particleText", checked)}
      badge="実験的"
    />

    <SettingItem
      title="リップルエフェクト"
      description="タッチ位置から波紋が広がるニューモーフィック効果"
      checked={settings.rippleEffects}
      onChange={(checked) => updateSetting("rippleEffects", checked)}
    />

    <SettingItem
      title="背景パーティクル"
      description="3D空間に浮遊するパーティクル背景を表示"
      checked={settings.backgroundParticles}
      onChange={(checked) => updateSetting("backgroundParticles", checked)}
      badge="実験的"
    />
  </div>
);

// 感情分析設定パネル
const EmotionPanel: React.FC<{
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(
    key: K,
    value: EffectSettings[K]
  ) => void;
}> = ({ settings, updateSetting }) => (
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

    <SettingItem
      title="自動リアクション"
      description="感情に応じて自動的にビジュアルエフェクトを発動します"
      checked={settings.autoReactions}
      onChange={(checked) => updateSetting("autoReactions", checked)}
    />
  </div>
);

// トラッカー設定パネル
const TrackerPanel: React.FC<{
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(
    key: K,
    value: EffectSettings[K]
  ) => void;
}> = ({ settings, updateSetting }) => (
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

// パフォーマンス設定パネル
const PerformancePanel: React.FC<{
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(
    key: K,
    value: EffectSettings[K]
  ) => void;
}> = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-white mb-4">パフォーマンス</h3>

    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          エフェクト品質
        </label>
        <select
          value={settings.effectQuality}
          onChange={(e) =>
            updateSetting(
              "effectQuality",
              e.target.value as "low" | "medium" | "high"
            )
          }
          className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
          <option value="low">低品質（軽快）</option>
          <option value="medium">中品質（推奨）</option>
          <option value="high">高品質（重い）</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          アニメーション速度: {settings.animationSpeed}x
        </label>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={settings.animationSpeed}
          onChange={(e) =>
            updateSetting("animationSpeed", parseFloat(e.target.value))
          }
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  </div>
);

// 設定項目コンポーネント
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
        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
      </label>
    </div>
  </div>
);

// AI設定パネル
const AIPanel: React.FC<{
  systemPrompts: SystemPrompts;
  enableSystemPrompt: boolean;
  enableJailbreakPrompt: boolean;
  apiConfig: APIConfig; // APIConfig型を使用
  openRouterApiKey: string; // openRouterApiKey を追加
  geminiApiKey: string; // geminiApiKey を追加
  showSystemPrompt: boolean;
  showJailbreakPrompt: boolean;
  showReplySuggestionPrompt: boolean;
  showTextEnhancementPrompt: boolean;
  onUpdateSystemPrompts: (prompts: SystemPrompts) => void;
  onSetEnableSystemPrompt: (enable: boolean) => void;
  onSetEnableJailbreakPrompt: (enable: boolean) => void;
  onSetTemperature: (temp: number) => void;
  onSetMaxTokens: (tokens: number) => void;
  onSetTopP: (topP: number) => void;
  onToggleSystemPrompt: () => void;
  onToggleJailbreakPrompt: () => void;
  onToggleReplySuggestionPrompt: () => void;
  onToggleTextEnhancementPrompt: () => void;
  setAPIModel: (model: string) => void; // setAPIModel を追加
  setAPIProvider: (provider: APIProvider) => void; // setAPIProvider を追加
  setOpenRouterApiKey: (key: string) => void; // setOpenRouterApiKey を追加
  setGeminiApiKey: (key: string) => void; // setGeminiApiKey を追加
  useDirectGeminiAPI: boolean; // useDirectGeminiAPI を追加
  setUseDirectGeminiAPI: (enabled: boolean) => void; // setUseDirectGeminiAPI を追加
}> = ({
  systemPrompts,
  enableSystemPrompt,
  enableJailbreakPrompt,
  apiConfig,
  openRouterApiKey,
  geminiApiKey,
  showSystemPrompt,
  showJailbreakPrompt,
  showReplySuggestionPrompt,
  showTextEnhancementPrompt,
  onUpdateSystemPrompts,
  onSetEnableSystemPrompt,
  onSetEnableJailbreakPrompt,
  onSetTemperature,
  onSetMaxTokens,
  onSetTopP,
  onToggleSystemPrompt,
  onToggleJailbreakPrompt,
  onToggleReplySuggestionPrompt,
  onToggleTextEnhancementPrompt,
  setAPIModel,
  setAPIProvider,
  setOpenRouterApiKey,
  setGeminiApiKey,
  useDirectGeminiAPI,
  setUseDirectGeminiAPI,
}) => {
  const [localOpenRouterApiKey, setLocalOpenRouterApiKey] = useState(
    openRouterApiKey || ""
  );
  const [localGeminiApiKey, setLocalGeminiApiKey] = useState(
    geminiApiKey || ""
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);

  // apiConfig がなければ何も表示しない
  if (!apiConfig) {
    return null;
  }

  const handleModelChange = (modelId: string) => {
    setAPIModel(modelId);
    if (modelId.includes("gemini")) {
      setAPIProvider("gemini");
    } else {
      setAPIProvider("openrouter");
    }
  };

  const handleApiKeyChange = (key: string) => {
    setLocalOpenRouterApiKey(key);
    setOpenRouterApiKey(key);
  };

  const handleGeminiApiKeyChange = (key: string) => {
    setLocalGeminiApiKey(key);
    setGeminiApiKey(key);
  };

  const isGemini = apiConfig.provider === "gemini";

  const handlePromptChange = (key: keyof SystemPrompts, value: string) => {
    onUpdateSystemPrompts({ ...systemPrompts, [key]: value });
  };

  const handleSavePrompts = () => {
    console.log("Saving custom prompts:", systemPrompts);
  };

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto">
      {/* API設定セクション */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">API設定</h4>

        {/* モデル選択 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              モデル選択
            </label>
            <select
              value={apiConfig.model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
              <optgroup label="Google">
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-flash-light">
                  Gemini 2.5 Flash Light
                </option>
              </optgroup>
              <optgroup label="Anthropic (OpenRouter)">
                <option value="anthropic/claude-opus-4">Claude Opus 4</option>
                <option value="anthropic/claude-sonnet-4">
                  Claude Sonnet 4
                </option>
              </optgroup>
              <optgroup label="xAI (OpenRouter)">
                <option value="x-ai/grok-4">Grok-4</option>
              </optgroup>
              <optgroup label="OpenAI (OpenRouter)">
                <option value="openai/gpt-5-chat">GPT-5</option>
                <option value="openai/gpt-5-mini">GPT-5 Mini</option>
              </optgroup>
              <optgroup label="Standard (OpenRouter)">
                <option value="deepseek/deepseek-chat-v3.1">
                  DeepSeek Chat v3
                </option>
                <option value="mistralai/mistral-medium-3.1">
                  Mistral Medium 3.1
                </option>
                <option value="meta-llama/llama-4-maverick">
                  Llama 4 Maverick
                </option>
              </optgroup>
              <optgroup label="Specialized (OpenRouter)">
                <option value="qwen/qwen3-max">qwen3-max</option>
                <option value="qwen/qwen3-30b-a3b-thinking-2507">
                  Qwen3 30B A3B Thinking
                </option>
                <option value="qwen/qwen3-30b-a3b-instruct-2507">
                  Qwen3 30B A3B
                </option>
                <option value="x-ai/grok-code-fast-1">Grok Code Fast</option>
                <option value="nousresearch/hermes-4-405b">
                  Hermes 4 405B
                </option>
                <option value="z-ai/glm-4.5">GLM-4.5</option>
                <option value="moonshotai/kimi-k2-0905">Kimi K2</option>
              </optgroup>
            </select>
            {isGemini ? (
              <p className="text-xs text-blue-400 mt-1">
                Gemini APIを使用します。APIキーは{" "}
                <code className="bg-gray-700 px-1 rounded">
                  gemini-api-key.txt
                </code>{" "}
                から読み込まれます。
              </p>
            ) : (
              <p className="text-xs text-purple-400 mt-1">
                OpenRouter APIを使用します。
              </p>
            )}
          </div>

          {/* 選択されたモデルの価格情報 */}
          {(() => {
            const modelInfo = getModelPricing(apiConfig.model);
            if (!modelInfo) return null;

            return (
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 shadow-lg">
                <h5 className="text-lg font-semibold text-white mb-4 flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Cpu className="w-5 h-5 text-purple-400" />
                  </div>
                  {modelInfo.name} - 価格情報
                </h5>
                <ModelPricingDisplay modelInfo={modelInfo} />
              </div>
            );
          })()}
        </div>

        {/* Gemini API直接使用トグル */}
        {isGemini && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Gemini APIを直接使用
              </label>
              <button
                onClick={() => setUseDirectGeminiAPI(!useDirectGeminiAPI)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  useDirectGeminiAPI ? "bg-purple-600" : "bg-gray-600"
                }`}>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useDirectGeminiAPI ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-gray-400">
              {useDirectGeminiAPI
                ? "🔥 ON: Gemini APIを直接使用します（高速）"
                : "🌐 OFF: OpenRouter経由でGeminiを使用します"}
            </p>
          </div>
        )}

        {/* Gemini APIキー入力 */}
        <AnimatePresence>
          {isGemini && useDirectGeminiAPI && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden">
              <label className="block text-sm font-medium text-gray-300">
                Gemini APIキー
              </label>
              <div className="relative">
                <input
                  type={showGeminiApiKey ? "text" : "password"}
                  value={localGeminiApiKey}
                  onChange={(e) => handleGeminiApiKeyChange(e.target.value)}
                  className="w-full px-3 py-2 pr-10 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="AIza..."
                />
                <button
                  onClick={() => setShowGeminiApiKey(!showGeminiApiKey)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
                  {showGeminiApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Google AI Studioで取得したAPIキーを入力してください。
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OpenRouter APIキー入力 */}
        <AnimatePresence>
          {!isGemini && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden">
              <label className="block text-sm font-medium text-gray-300">
                OpenRouter APIキー
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={localOpenRouterApiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  className="w-full px-3 py-2 pr-10 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="OpenRouterのAPIキーを入力してください"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400">
                OpenRouterのAPIキーを入力してください。キーは暗号化されてローカルに保存されます。
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-white/10 pt-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">AI設定</h3>
          <Button onClick={handleSavePrompts} size="sm">
            <Save className="w-4 h-4 mr-2" />
            プロンプトを保存
          </Button>
        </div>

        {/* AI パラメータ */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-white">生成パラメータ</h4>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Temperature: {apiConfig.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={apiConfig.temperature}
              onChange={(e) => onSetTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-1">
              創造性の度合い (0: 保守的, 2: 創造的)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Tokens: {apiConfig.max_tokens}
            </label>
            <input
              type="range"
              min="256"
              max="8192"
              step="256"
              value={apiConfig.max_tokens}
              onChange={(e) => onSetMaxTokens(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-1">最大出力トークン数</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Top-p: {apiConfig.top_p}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={apiConfig.top_p}
              onChange={(e) => onSetTopP(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-1">
              語彙の多様性 (0.1: 制限的, 1.0: 多様)
            </p>
          </div>
        </div>

        {/* システムプロンプト */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-blue-500" />
              <label className="text-sm font-medium">システムプロンプト</label>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSystemPrompt}
                  onChange={(e) => onSetEnableSystemPrompt(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
              <button
                onClick={onToggleSystemPrompt}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center gap-1">
                {showSystemPrompt ? <EyeOff size={12} /> : <Eye size={12} />}
                {showSystemPrompt ? "隠す" : "表示"}
              </button>
            </div>
          </div>
          {showSystemPrompt && (
            <>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => console.log('詳細版プロンプトの機能は現在利用できません')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition-colors flex items-center gap-1.5"
                  title="詳細版ロールプレイプロンプトを使用">
                  <Cpu size={14} />
                  詳細版プロンプト
                </button>
                <button
                  onClick={() => console.log('要約版プロンプトの機能は現在利用できません')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors flex items-center gap-1.5"
                  title="要約版プロンプトを使用">
                  <FileText size={14} />
                  要約版プロンプト
                </button>
                <button
                  onClick={() => handlePromptChange("system", "")}
                  className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors flex items-center gap-1.5"
                  title="プロンプトをクリア">
                  <Trash2 size={14} />
                  クリア
                </button>
              </div>
              <textarea
                value={systemPrompts.system}
                onChange={(e) => handlePromptChange("system", e.target.value)}
                className="w-full h-32 px-3 py-2 bg-slate-800 border border-gray-600 rounded text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                placeholder="システムプロンプトを入力..."
              />
            </>
          )}
        </div>

        {/* 脱獄プロンプト */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-red-500" />
              <label className="text-sm font-medium">脱獄プロンプト</label>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableJailbreakPrompt}
                  onChange={(e) => onSetEnableJailbreakPrompt(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
              </label>
              <button
                onClick={onToggleJailbreakPrompt}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center gap-1">
                {showJailbreakPrompt ? <EyeOff size={12} /> : <Eye size={12} />}
                {showJailbreakPrompt ? "隠す" : "表示"}
              </button>
            </div>
          </div>
          {showJailbreakPrompt && (
            <textarea
              value={systemPrompts.jailbreak}
              onChange={(e) => handlePromptChange("jailbreak", e.target.value)}
              className="w-full h-20 px-3 py-2 bg-slate-800 border border-gray-600 rounded text-xs text-white focus:outline-none focus:border-red-500"
              placeholder="脱獄プロンプトを入力..."
            />
          )}
        </div>

        {/* 返信提案プロンプト */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-yellow-600" />
            <label className="text-sm font-medium">返信提案💡プロンプト</label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleReplySuggestionPrompt}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center gap-1">
              {showReplySuggestionPrompt ? (
                <EyeOff size={12} />
              ) : (
                <Eye size={12} />
              )}
              {showReplySuggestionPrompt ? "隠す" : "表示"}
            </button>
          </div>
          {showReplySuggestionPrompt && (
            <textarea
              value={systemPrompts.replySuggestion}
              onChange={(e) =>
                handlePromptChange("replySuggestion", e.target.value)
              }
              className="w-full h-32 px-3 py-2 bg-slate-800 border border-gray-600 rounded text-xs font-mono text-white focus:outline-none focus:border-yellow-500"
              placeholder="返信提案プロンプトを入力..."
            />
          )}
        </div>

        {/* 文章強化プロンプト */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Edit3 size={16} className="text-green-600" />
            <label className="text-sm font-medium">文章強化✨プロンプト</label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleTextEnhancementPrompt}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center gap-1">
              {showTextEnhancementPrompt ? (
                <EyeOff size={12} />
              ) : (
                <Eye size={12} />
              )}
              {showTextEnhancementPrompt ? "隠す" : "表示"}
            </button>
          </div>
          {showTextEnhancementPrompt && (
            <textarea
              value={systemPrompts.textEnhancement}
              onChange={(e) =>
                handlePromptChange("textEnhancement", e.target.value)
              }
              className="w-full h-32 px-3 py-2 bg-slate-800 border border-gray-600 rounded text-xs font-mono text-white focus:outline-none focus:border-green-500"
              placeholder="文章強化プロンプトを入力..."
            />
          )}
        </div>
      </div>
    </div>
  );
};

// チャット設定パネル
const ChatPanel: React.FC = () => {
  const {
    chat,
    updateChatSettings,
    _systemPrompts: systemPrompts,
    _enableSystemPrompt: enableSystemPrompt,
    _enableJailbreakPrompt: enableJailbreakPrompt,
    updateSystemPrompts,
    _setEnableSystemPrompt: setEnableSystemPrompt,
    _setEnableJailbreakPrompt: setEnableJailbreakPrompt,
  } = useAppStore();

  const [_showSystemPrompt, _setShowSystemPrompt] = useState(false);
  const [_showJailbreakPrompt, _setShowJailbreakPrompt] = useState(false);
  const [_showReplySuggestionPrompt, _setShowReplySuggestionPrompt] =
    useState(false);
  const [_showTextEnhancementPrompt, _setShowTextEnhancementPrompt] =
    useState(false);

  const handleMemoryLimitChange = (key: string, value: number) => {
    const currentLimits = chat.memory_limits || {
      max_working_memory: 6,
      max_memory_cards: 50,
      max_relevant_memories: 5,
      max_prompt_tokens: 32000,
      max_context_messages: 40,
    };

    updateChatSettings({
      memory_limits: {
        ...currentLimits,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">チャット設定</h3>

      {/* 記憶容量設定 */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">記憶容量制限</h4>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              作業記憶 (メッセージ数)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={chat.memory_limits?.max_working_memory || 6}
              onChange={(e) =>
                handleMemoryLimitChange(
                  "max_working_memory",
                  parseInt(e.target.value)
                )
              }
              className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400">
              最新の会話メッセージを保持する数
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              メモリーカード上限
            </label>
            <input
              type="number"
              min="10"
              max="200"
              value={chat.memory_limits?.max_memory_cards || 50}
              onChange={(e) =>
                handleMemoryLimitChange(
                  "max_memory_cards",
                  parseInt(e.target.value)
                )
              }
              className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400">
              保存できるメモリーカードの最大数
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              関連記憶検索数
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={chat.memory_limits?.max_relevant_memories || 5}
              onChange={(e) =>
                handleMemoryLimitChange(
                  "max_relevant_memories",
                  parseInt(e.target.value)
                )
              }
              className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400">
              プロンプトに含める関連記憶の数
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              プロンプト最大トークン
            </label>
            <input
              type="number"
              min="8000"
              max="128000"
              step="1000"
              value={chat.memory_limits?.max_prompt_tokens || 32000}
              onChange={(e) =>
                handleMemoryLimitChange(
                  "max_prompt_tokens",
                  parseInt(e.target.value)
                )
              }
              className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400">
              プロンプト全体のトークン制限
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              会話履歴上限 (メッセージ数)
            </label>
            <input
              type="number"
              min="5"
              max="100"
              value={chat.memory_limits?.max_context_messages || 40}
              onChange={(e) =>
                handleMemoryLimitChange(
                  "max_context_messages",
                  parseInt(e.target.value)
                )
              }
              className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400">
              プロンプトに含める会話履歴の数
            </p>
          </div>
        </div>
      </div>

      {/* プログレッシブモード設定 */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">
          プログレッシブ応答設定
        </h4>

        {/* プログレッシブモード有効化 */}
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="progressive-enabled"
            checked={chat.progressiveMode?.enabled || false}
            onChange={(e) =>
              updateChatSettings({
                progressiveMode: {
                  enabled: e.target.checked,
                  showIndicators: chat.progressiveMode?.showIndicators ?? true,
                  highlightChanges:
                    chat.progressiveMode?.highlightChanges ?? true,
                  glowIntensity:
                    chat.progressiveMode?.glowIntensity ?? "medium",
                  stageDelays: chat.progressiveMode?.stageDelays ?? {
                    reflex: 0,
                    context: 1000,
                    intelligence: 2000,
                  },
                },
              })
            }
            className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 rounded border-gray-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <label
              htmlFor="progressive-enabled"
              className="text-sm font-medium text-gray-300">
              3段階プログレッシブ応答を有効化
            </label>
            <p className="text-xs text-gray-400 mt-1">
              反射→文脈→洞察の3段階で回答が進化します（APIコスト3倍）
            </p>
          </div>
        </div>

        {/* プログレッシブモード詳細設定 */}
        {chat.progressiveMode?.enabled && (
          <div className="pl-7 space-y-3">
            {/* ステージインジケーター表示 */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="show-indicators"
                checked={chat.progressiveMode?.showIndicators !== false}
                onChange={(e) =>
                  updateChatSettings({
                    progressiveMode: {
                      enabled: chat.progressiveMode?.enabled ?? true,
                      showIndicators: e.target.checked,
                      highlightChanges:
                        chat.progressiveMode?.highlightChanges ?? true,
                      glowIntensity:
                        chat.progressiveMode?.glowIntensity ?? "medium",
                      stageDelays: chat.progressiveMode?.stageDelays ?? {
                        reflex: 0,
                        context: 1000,
                        intelligence: 2000,
                      },
                    },
                  })
                }
                className="w-4 h-4 text-blue-600 bg-gray-700 rounded border-gray-600"
              />
              <label
                htmlFor="show-indicators"
                className="text-sm text-gray-300">
                ステージインジケーターを表示
              </label>
            </div>

            {/* 変更箇所ハイライト */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="highlight-changes"
                checked={chat.progressiveMode?.highlightChanges !== false}
                onChange={(e) =>
                  updateChatSettings({
                    progressiveMode: {
                      enabled: chat.progressiveMode?.enabled ?? true,
                      showIndicators:
                        chat.progressiveMode?.showIndicators ?? true,
                      highlightChanges: e.target.checked,
                      glowIntensity:
                        chat.progressiveMode?.glowIntensity ?? "medium",
                      stageDelays: chat.progressiveMode?.stageDelays ?? {
                        reflex: 0,
                        context: 1000,
                        intelligence: 2000,
                      },
                    },
                  })
                }
                className="w-4 h-4 text-blue-600 bg-gray-700 rounded border-gray-600"
              />
              <label
                htmlFor="highlight-changes"
                className="text-sm text-gray-300">
                変更箇所をハイライト表示
              </label>
            </div>

            {/* グロー効果強度 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                グロー効果強度
              </label>
              <select
                value={chat.progressiveMode?.glowIntensity || "medium"}
                onChange={(e) =>
                  updateChatSettings({
                    progressiveMode: {
                      enabled: chat.progressiveMode?.enabled ?? true,
                      showIndicators:
                        chat.progressiveMode?.showIndicators ?? true,
                      highlightChanges:
                        chat.progressiveMode?.highlightChanges ?? true,
                      glowIntensity: e.target.value as
                        | "none"
                        | "soft"
                        | "medium"
                        | "strong",
                      stageDelays: chat.progressiveMode?.stageDelays ?? {
                        reflex: 0,
                        context: 1000,
                        intelligence: 2000,
                      },
                    },
                  })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500">
                <option value="none">なし</option>
                <option value="soft">ソフト</option>
                <option value="medium">ミディアム</option>
                <option value="strong">ストロング</option>
              </select>
            </div>

            {/* ステージ遅延設定 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                ステージ遅延設定 (ミリ秒)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-400">反射</label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    step="100"
                    value={chat.progressiveMode?.stageDelays?.reflex || 0}
                    onChange={(e) =>
                      updateChatSettings({
                        progressiveMode: {
                          enabled: chat.progressiveMode?.enabled ?? true,
                          showIndicators:
                            chat.progressiveMode?.showIndicators ?? true,
                          highlightChanges:
                            chat.progressiveMode?.highlightChanges ?? true,
                          glowIntensity:
                            chat.progressiveMode?.glowIntensity ?? "medium",
                          stageDelays: {
                            reflex: parseInt(e.target.value),
                            context:
                              chat.progressiveMode?.stageDelays?.context ??
                              1000,
                            intelligence:
                              chat.progressiveMode?.stageDelays?.intelligence ??
                              2000,
                          },
                        },
                      })
                    }
                    className="w-full px-2 py-1 bg-slate-800 border border-gray-600 rounded text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">文脈</label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    step="100"
                    value={chat.progressiveMode?.stageDelays?.context || 1000}
                    onChange={(e) =>
                      updateChatSettings({
                        progressiveMode: {
                          enabled: chat.progressiveMode?.enabled ?? true,
                          showIndicators:
                            chat.progressiveMode?.showIndicators ?? true,
                          highlightChanges:
                            chat.progressiveMode?.highlightChanges ?? true,
                          glowIntensity:
                            chat.progressiveMode?.glowIntensity ?? "medium",
                          stageDelays: {
                            reflex:
                              chat.progressiveMode?.stageDelays?.reflex ?? 0,
                            context: parseInt(e.target.value),
                            intelligence:
                              chat.progressiveMode?.stageDelays?.intelligence ??
                              2000,
                          },
                        },
                      })
                    }
                    className="w-full px-2 py-1 bg-slate-800 border border-gray-600 rounded text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">洞察</label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    step="100"
                    value={
                      chat.progressiveMode?.stageDelays?.intelligence || 2000
                    }
                    onChange={(e) =>
                      updateChatSettings({
                        progressiveMode: {
                          enabled: chat.progressiveMode?.enabled ?? true,
                          showIndicators:
                            chat.progressiveMode?.showIndicators ?? true,
                          highlightChanges:
                            chat.progressiveMode?.highlightChanges ?? true,
                          glowIntensity:
                            chat.progressiveMode?.glowIntensity ?? "medium",
                          stageDelays: {
                            reflex:
                              chat.progressiveMode?.stageDelays?.reflex ?? 0,
                            context:
                              chat.progressiveMode?.stageDelays?.context ??
                              1000,
                            intelligence: parseInt(e.target.value),
                          },
                        },
                      })
                    }
                    className="w-full px-2 py-1 bg-slate-800 border border-gray-600 rounded text-white text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* その他のチャット設定 */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">一般設定</h4>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            記憶容量: {chat.memoryCapacity}
          </label>
          <input
            type="range"
            min="10"
            max="500"
            value={chat.memoryCapacity}
            onChange={(e) =>
              updateChatSettings({ memoryCapacity: parseInt(e.target.value) })
            }
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none slider-thumb"
          />
          <p className="text-xs text-gray-400">
            従来の記憶容量設定（レガシー）
          </p>
        </div>
      </div>
    </div>
  );
};

// 言語・地域設定パネル
const LanguagePanel: React.FC = () => {
  const { languageSettings, updateLanguageSettings } = useAppStore();

  const languages = [
    { code: "ja", name: "日本語", flag: "🇯🇵" },
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
    { code: "ko", name: "한국어", flag: "🇰🇷" },
  ];

  const timezones = [
    { value: "Asia/Tokyo", label: "東京 (UTC+9)" },
    { value: "America/New_York", label: "ニューヨーク (UTC-5)" },
    { value: "Europe/London", label: "ロンドン (UTC+0)" },
    { value: "Asia/Shanghai", label: "上海 (UTC+8)" },
    { value: "Asia/Seoul", label: "ソウル (UTC+9)" },
  ];

  const dateFormats = [
    { value: "YYYY/MM/DD", label: "2024/12/25" },
    { value: "MM/DD/YYYY", label: "12/25/2024" },
    { value: "DD/MM/YYYY", label: "25/12/2024" },
    { value: "YYYY-MM-DD", label: "2024-12-25" },
  ];

  const currencies = [
    { value: "JPY", label: "日本円 (¥)" },
    { value: "USD", label: "米ドル ($)" },
    { value: "EUR", label: "ユーロ (€)" },
    { value: "CNY", label: "人民元 (¥)" },
    { value: "KRW", label: "韓国ウォン (₩)" },
  ];

  const getCurrentTime = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: languageSettings.timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: languageSettings.timeFormat === "12",
    };
    return now.toLocaleTimeString(
      languageSettings.language === "ja" ? "ja-JP" : "en-US",
      options
    );
  };

  const getCurrentDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: languageSettings.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    return now.toLocaleDateString(
      languageSettings.language === "ja" ? "ja-JP" : "en-US",
      options
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">言語・地域設定</h3>

      {/* 現在の時刻表示 */}
      <div className="p-4 bg-slate-800/50 rounded-lg border border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">
          現在の設定プレビュー
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">現在時刻:</span>
            <span className="ml-2 text-white font-mono">
              {getCurrentTime()}
            </span>
          </div>
          <div>
            <span className="text-gray-400">現在日付:</span>
            <span className="ml-2 text-white font-mono">
              {getCurrentDate()}
            </span>
          </div>
        </div>
      </div>

      {/* 言語選択 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          表示言語
        </label>
        <div className="grid grid-cols-2 gap-3">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() =>
                updateLanguageSettings({
                  language: lang.code as "ja" | "en" | "zh" | "ko",
                })
              }
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                languageSettings.language === lang.code
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                  : "bg-slate-800/50 border-gray-700 text-white/80 hover:bg-slate-700/50"
              )}>
              <span className="text-lg">{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* タイムゾーン設定 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          タイムゾーン
        </label>
        <select
          value={languageSettings.timezone}
          onChange={(e) => updateLanguageSettings({ timezone: e.target.value })}
          className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
          {timezones.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* 日付形式設定 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          日付形式
        </label>
        <select
          value={languageSettings.dateFormat}
          onChange={(e) =>
            updateLanguageSettings({ dateFormat: e.target.value })
          }
          className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
          {dateFormats.map((format) => (
            <option key={format.value} value={format.value}>
              {format.label}
            </option>
          ))}
        </select>
      </div>

      {/* 時刻形式設定 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          時刻形式
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => updateLanguageSettings({ timeFormat: "24" })}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg border transition-colors",
              languageSettings.timeFormat === "24"
                ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                : "bg-slate-800/50 border-gray-700 text-white/80 hover:bg-slate-700/50"
            )}>
            24時間表示 (18:30)
          </button>
          <button
            onClick={() => updateLanguageSettings({ timeFormat: "12" })}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg border transition-colors",
              languageSettings.timeFormat === "12"
                ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                : "bg-slate-800/50 border-gray-700 text-white/80 hover:bg-slate-700/50"
            )}>
            12時間表示 (6:30 PM)
          </button>
        </div>
      </div>

      {/* 通貨設定 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">通貨</label>
        <select
          value={languageSettings.currency}
          onChange={(e) => updateLanguageSettings({ currency: e.target.value })}
          className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
          {currencies.map((currency) => (
            <option key={currency.value} value={currency.value}>
              {currency.label}
            </option>
          ))}
        </select>
      </div>

      {/* 追加情報 */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h4 className="text-sm font-medium text-blue-300 mb-2">💡 ヒント</h4>
        <ul className="text-xs text-blue-200 space-y-1">
          <li>• 言語設定はアプリケーション全体に反映されます</li>
          <li>• タイムゾーンはメッセージの時刻表示に影響します</li>
          <li>• 設定は自動的に保存されます</li>
        </ul>
      </div>
    </div>
  );
};

// 音声設定パネル
const VoicePanel: React.FC = () => {
  const { voice, updateVoiceSettings } = useAppStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceVoxStatus, setVoiceVoxStatus] = useState<
    "unknown" | "available" | "unavailable"
  >("unknown");

  // VoiceVox接続状態をチェック
  const checkVoiceVoxStatus = async () => {
    try {
      const response = await fetch("/api/voice/voicevox/check", {
        method: "GET",
      });
      setVoiceVoxStatus(response.ok ? "available" : "unavailable");
    } catch (_err) {
      setVoiceVoxStatus("unavailable");
    }
  };

  // コンポーネントマウント時にVoiceVox状態をチェック
  React.useEffect(() => {
    if (voice.provider === "voicevox") {
      checkVoiceVoxStatus();
    }
  }, [voice.provider]);

  const handleTestVoice = async () => {
    setIsPlaying(true);
    const text =
      "こんにちは、音声テスト中です。設定が正しく反映されているかテストしています。";

    try {
      if (voice.provider === "voicevox") {
        // VoiceVox API呼び出し
        const response = await fetch("/api/voice/voicevox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            speakerId: voice.voicevox.speaker,
            settings: {
              speedScale: voice.voicevox.speed,
              pitchScale: voice.voicevox.pitch,
              intonationScale: voice.voicevox.intonation,
              volumeScale: voice.voicevox.volume,
            },
          }),
        });

        // Safe JSON parsing with proper error handling
        let data;
        try {
          if (!response.ok) {
            // Try to get error text even if not JSON
            const errorText = await response.text();
            throw new Error(
              `VoiceVox APIエラー (${response.status}): ${
                errorText || response.statusText
              }`
            );
          }

          // Check content type before parsing JSON
          const contentType = response.headers.get("content-type");
          if (!contentType?.includes("application/json")) {
            const errorText = await response.text();
            throw new Error(
              `VoiceVox APIがJSON以外のレスポンスを返しました: ${errorText}`
            );
          }

          data = await response.json();
        } catch (parseError) {
          console.error("VoiceVox JSON parse error:", parseError);
          if (parseError instanceof SyntaxError) {
            throw new Error(
              "VoiceVox APIレスポンスの解析に失敗しました。サーバーエラーの可能性があります。"
            );
          }
          throw parseError;
        }

        if (data && data.success && data.audioData) {
          const audio = new Audio(data.audioData);
          audio.play();
          audio.onended = () => setIsPlaying(false);
          audio.onerror = () => {
            console.error("音声の再生に失敗しました。");
            setIsPlaying(false);
          };
        } else {
          const errorMessage =
            data?.error || "VoiceVox APIからエラーが返されました";
          throw new Error(errorMessage);
        }
      } else {
        // システム音声をフォールバック
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = voice.system.rate;
        utterance.pitch = voice.system.pitch;
        utterance.volume = voice.system.volume;
        speechSynthesis.speak(utterance);
        utterance.onend = () => setIsPlaying(false);
      }
    } catch (err) {
      console.error(
        "VoiceVox音声テスト失敗、システム音声でフォールバック:",
        err
      );

      // VoiceVoxが失敗した場合、システム音声でフォールバック
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = voice.system?.rate || 1.0;
        utterance.pitch = voice.system?.pitch || 1.0;
        utterance.volume = voice.system?.volume || 1.0;
        speechSynthesis.speak(utterance);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
      } catch (systemErr) {
        console.error("システム音声も失敗しました:", systemErr);
        setIsPlaying(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">音声設定</h3>

      {/* 基本設定 */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">基本設定</h4>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="voice-enabled"
            checked={voice.enabled}
            onChange={(e) => updateVoiceSettings({ enabled: e.target.checked })}
            className="w-4 h-4 text-blue-500 bg-slate-700 border-gray-600 rounded focus:ring-blue-500"
          />
          <label
            htmlFor="voice-enabled"
            className="text-sm font-medium text-gray-300">
            音声機能を有効にする
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="voice-autoplay"
            checked={voice.autoPlay}
            onChange={(e) =>
              updateVoiceSettings({ autoPlay: e.target.checked })
            }
            className="w-4 h-4 text-blue-500 bg-slate-700 border-gray-600 rounded focus:ring-blue-500"
          />
          <label
            htmlFor="voice-autoplay"
            className="text-sm font-medium text-gray-300">
            メッセージを自動再生
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            音声プロバイダー
          </label>
          <select
            value={voice.provider}
            onChange={(e) =>
              updateVoiceSettings({
                provider: e.target.value as "voicevox" | "elevenlabs",
              })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
            <option value="voicevox">VoiceVox</option>
            <option value="elevenlabs">ElevenLabs</option>
            <option value="system">システム音声</option>
          </select>
        </div>
      </div>

      {/* VoiceVox設定 */}
      {voice.provider === "voicevox" && (
        <div className="space-y-4 border-t border-gray-600 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-white">VoiceVox設定</h4>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  voiceVoxStatus === "available"
                    ? "bg-green-500"
                    : voiceVoxStatus === "unavailable"
                    ? "bg-red-500"
                    : "bg-gray-500"
                }`}></div>
              <span className="text-xs text-gray-400">
                {voiceVoxStatus === "available"
                  ? "接続済み"
                  : voiceVoxStatus === "unavailable"
                  ? "未接続"
                  : "確認中..."}
              </span>
              <button
                onClick={checkVoiceVoxStatus}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors">
                再確認
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                話者: {voice.voicevox.speaker}
              </label>
              <input
                type="range"
                min="0"
                max="46"
                value={voice.voicevox.speaker}
                onChange={(e) =>
                  updateVoiceSettings({
                    voicevox: {
                      ...voice.voicevox,
                      speaker: parseInt(e.target.value),
                    },
                  })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                話速: {voice.voicevox.speed.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={voice.voicevox.speed}
                onChange={(e) =>
                  updateVoiceSettings({
                    voicevox: {
                      ...voice.voicevox,
                      speed: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                音程: {voice.voicevox.pitch.toFixed(1)}
              </label>
              <input
                type="range"
                min="-0.15"
                max="0.15"
                step="0.01"
                value={voice.voicevox.pitch}
                onChange={(e) =>
                  updateVoiceSettings({
                    voicevox: {
                      ...voice.voicevox,
                      pitch: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                抑揚: {voice.voicevox.intonation.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.1"
                value={voice.voicevox.intonation}
                onChange={(e) =>
                  updateVoiceSettings({
                    voicevox: {
                      ...voice.voicevox,
                      intonation: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* テストボタンと状態表示 */}
      <div className="border-t border-gray-600 pt-4 space-y-3">
        {voice.provider === "voicevox" && voiceVoxStatus === "unavailable" && (
          <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
            <p className="text-sm text-yellow-200">
              ⚠️ VoiceVoxエンジンに接続できません。システム音声でテストします。
            </p>
            <p className="text-xs text-yellow-300 mt-1">
              VoiceVoxエンジンが起動していることを確認してください。
            </p>
          </div>
        )}

        <button
          onClick={handleTestVoice}
          disabled={isPlaying}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2">
          {isPlaying ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              音声テスト中...
            </>
          ) : (
            <>
              <TestTube2 className="w-4 h-4" />
              {voice.provider === "voicevox" && voiceVoxStatus === "unavailable"
                ? "システム音声でテスト"
                : "音声テスト"}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// 外観設定パネル
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

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                背景ぼかし: {appearanceSettings.backgroundBlur}px
              </label>
              <input
                type="range"
                min="0"
                max="20"
                value={appearanceSettings.backgroundBlur}
                onChange={(e) =>
                  updateAppearanceSetting(
                    "backgroundBlur",
                    parseInt(e.target.value)
                  )
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                背景透明度: {appearanceSettings.backgroundOpacity}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={appearanceSettings.backgroundOpacity}
                onChange={(e) =>
                  updateAppearanceSetting(
                    "backgroundOpacity",
                    parseInt(e.target.value)
                  )
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
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
                fontSize: fontSizeMap[appearanceSettings.fontSize as keyof typeof fontSizeMap],
                fontWeight: appearanceSettings.fontWeight,
              }}>
              これはサンプルメッセージです。
            </div>
            <div
              className="p-2 rounded text-right"
              style={{
                backgroundColor: appearanceSettings.primaryColor,
                color: "white",
                fontSize: fontSizeMap[appearanceSettings.fontSize as keyof typeof fontSizeMap],
              }}>
              ユーザーメッセージのプレビュー
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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

// データ管理パネル
const DataManagementPanel: React.FC = () => {
  const [storageInfo, setStorageInfo] = useState<{
    totalSize: number;
    sizeInMB: number;
    itemCount: number;
    mainStorageSize: number;
  }>({ totalSize: 0, sizeInMB: 0, itemCount: 0, mainStorageSize: 0 });

  const [isCleaningUp, setIsCleaningUp] = useState(false);

  useEffect(() => {
    const updateStorageInfo = () => {
      const info = StorageManager.getStorageInfo();
      setStorageInfo(info);
    };

    updateStorageInfo();
    // 定期的に更新
    const interval = setInterval(updateStorageInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCleanup = async () => {
    if (
      !confirm(
        "古いチャット履歴とメモリーカードを削除してストレージを最適化します。続行しますか？"
      )
    ) {
      return;
    }

    setIsCleaningUp(true);
    try {
      const success = StorageManager.cleanupOldData();
      if (success) {
        // 情報を更新
        const info = StorageManager.getStorageInfo();
        setStorageInfo(info);
        alert("ストレージのクリーンアップが完了しました。");
      } else {
        alert("クリーンアップに失敗しました。");
      }
    } catch (error) {
      console.error("Cleanup error:", error);
      alert("クリーンアップ中にエラーが発生しました。");
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleClearAll = async () => {
    if (
      !confirm(
        "⚠️ 警告: すべてのチャット履歴、設定、データが完全に削除されます。\n\nこの操作は取り消せません。続行しますか？"
      )
    ) {
      return;
    }

    if (!confirm("本当によろしいですか？すべてのデータが失われます。")) {
      return;
    }

    try {
      const success = StorageManager.clearAllData();
      if (success) {
        alert("すべてのデータが削除されました。ページが再読み込みされます。");
        window.location.reload();
      } else {
        alert("データの削除に失敗しました。");
      }
    } catch (error) {
      console.error("Clear all error:", error);
      alert("データ削除中にエラーが発生しました。");
    }
  };

  const isNearLimit = StorageManager.isStorageNearLimit();
  const usagePercentage = Math.min((storageInfo.sizeInMB / 5) * 100, 100); // 5MBを100%として計算

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Database className="w-6 h-6 text-blue-400" />
        <h3 className="text-xl font-semibold text-white">ストレージ管理</h3>
      </div>

      {/* ストレージ使用量表示 */}
      <div className="bg-slate-800/50 p-4 rounded-lg border border-gray-600">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300">ストレージ使用量</span>
          <span
            className={`text-sm font-mono ${
              isNearLimit ? "text-yellow-400" : "text-gray-400"
            }`}>
            {storageInfo.sizeInMB.toFixed(2)} MB
          </span>
        </div>

        <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
          <div
            className={`h-2 rounded-full transition-all ${
              usagePercentage > 80
                ? "bg-red-500"
                : usagePercentage > 60
                ? "bg-yellow-500"
                : "bg-blue-500"
            }`}
            style={{ width: `${usagePercentage}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">アプリデータ:</span>
            <span className="ml-2 text-white font-mono">
              {(storageInfo.mainStorageSize / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
          <div>
            <span className="text-gray-400">項目数:</span>
            <span className="ml-2 text-white font-mono">
              {storageInfo.itemCount}
            </span>
          </div>
        </div>

        {isNearLimit && (
          <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-600/50 rounded text-sm text-yellow-200">
            ⚠️
            ストレージ使用量が上限に近づいています。クリーンアップをお勧めします。
          </div>
        )}
      </div>

      {/* 個別削除機能 */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">個別データ削除</h4>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              if (confirm("すべてのチャット履歴を削除しますか？")) {
                const store = useAppStore.getState();
                store.sessions.clear();
                store.active_session_id = null;
                alert("チャット履歴を削除しました");
                window.location.reload();
              }
            }}
            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors">
            チャット履歴を削除
          </button>

          <button
            onClick={() => {
              if (confirm("すべてのメモリーカードを削除しますか？")) {
                const store = useAppStore.getState();
                if (store.memoryCards) {
                  store.memoryCards = [];
                }
                if (store.memories) {
                  store.memories = [];
                }
                alert("メモリーカードを削除しました");
                window.location.reload();
              }
            }}
            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors">
            メモリーカードを削除
          </button>
        </div>

        <div className="w-full">
          <button
            onClick={() => {
              if (
                confirm(
                  "アップロードされた画像をすべて削除しますか？大幅に容量を節約できます。"
                )
              ) {
                let deletedCount = 0;
                let savedMB = 0;
                for (let i = localStorage.length - 1; i >= 0; i--) {
                  const key = localStorage.key(i);
                  if (key) {
                    const value = localStorage.getItem(key) || "";
                    if (
                      key.includes("image") ||
                      key.includes("upload") ||
                      value.startsWith("data:image")
                    ) {
                      const sizeMB = new Blob([value]).size / (1024 * 1024);
                      localStorage.removeItem(key);
                      deletedCount++;
                      savedMB += sizeMB;
                    }
                  }
                }
                alert(
                  `画像${deletedCount}個を削除し、${savedMB.toFixed(
                    2
                  )}MBを節約しました`
                );
                window.location.reload();
              }
            }}
            className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
            🌇 アップロード画像を削除（大幅に容量削減）
          </button>
        </div>
      </div>

      {/* クリーンアップオプション */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">データ管理</h4>

        <div className="space-y-3">
          <button
            onClick={handleCleanup}
            disabled={isCleaningUp}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2">
            {isCleaningUp ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                クリーンアップ中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                ストレージを最適化
              </>
            )}
          </button>
          <p className="text-xs text-gray-400 text-center">
            古いチャット履歴とメモリーカードを削除してストレージ容量を確保します
          </p>
        </div>

        <div className="border-t border-gray-600 pt-4">
          <button
            onClick={handleClearAll}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
            <X className="w-4 h-4" />
            全データを削除
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            ⚠️ すべてのチャット履歴、設定、データが完全に削除されます
          </p>
        </div>
      </div>

      {/* ヘルプ情報 */}
      <div className="bg-slate-900/50 p-4 rounded-lg border border-gray-700">
        <h5 className="text-sm font-medium text-white mb-2">
          💡 ストレージについて
        </h5>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• チャット履歴は最新10セッションまで自動保持</li>
          <li>• メモリーカードは最新100件まで自動保持</li>
          <li>• ストレージが満杯になると自動でクリーンアップされます</li>
          <li>• 設定とAPIキーは常に保持されます</li>
        </ul>
      </div>
    </div>
  );
};

// キャラクター管理パネルコンポーネント
const CharacterManagementPanel: React.FC = () => {
  const {
    characters,
    addCharacter,
    loadCharactersFromPublic,
    isCharactersLoaded,
  } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const handleJsonUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("ファイルを読み込み中...");

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);

          // キャラクターデータを検証
          if (!json.name) {
            throw new Error("キャラクターファイルに名前が含まれていません");
          }

          // 新しいIDを生成
          const characterId = `imported-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;

          // Character型に変換
          const character = {
            id: characterId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: 1,
            name: json.name || "名前なし",
            age: json.age || "不明",
            occupation: json.occupation || "不明",
            catchphrase: json.catchphrase || json.first_message || "",
            personality: json.personality || "",
            external_personality: json.external_personality || "",
            internal_personality: json.internal_personality || "",
            strengths: Array.isArray(json.strengths)
              ? json.strengths
              : typeof json.strengths === "string"
              ? json.strengths.split(",").map((s: string) => s.trim())
              : [],
            weaknesses: Array.isArray(json.weaknesses)
              ? json.weaknesses
              : typeof json.weaknesses === "string"
              ? json.weaknesses.split(",").map((s: string) => s.trim())
              : [],
            hobbies: Array.isArray(json.hobbies)
              ? json.hobbies
              : typeof json.hobbies === "string"
              ? json.hobbies.split(",").map((s: string) => s.trim())
              : [],
            likes: Array.isArray(json.likes)
              ? json.likes
              : typeof json.likes === "string"
              ? json.likes.split(",").map((s: string) => s.trim())
              : [],
            dislikes: Array.isArray(json.dislikes)
              ? json.dislikes
              : typeof json.dislikes === "string"
              ? json.dislikes.split(",").map((s: string) => s.trim())
              : [],
            appearance: json.appearance || "",
            avatar_url: json.avatar_url || "",
            background_url: json.background_url || "/images/default-bg.jpg",
            speaking_style: json.speaking_style || "",
            first_person: json.first_person || "私",
            second_person: json.second_person || "あなた",
            verbal_tics: Array.isArray(json.verbal_tics)
              ? json.verbal_tics
              : typeof json.verbal_tics === "string"
              ? json.verbal_tics.split(",").map((s: string) => s.trim())
              : [],
            background: json.background || "",
            scenario: json.scenario || "",
            system_prompt: json.system_prompt || "",
            first_message: json.first_message || "",
            tags: Array.isArray(json.tags)
              ? json.tags
              : typeof json.tags === "string"
              ? json.tags.split(",").map((s: string) => s.trim())
              : [],
            trackers: Array.isArray(json.trackers) ? json.trackers : [],
            nsfw_profile: json.nsfw_profile,
            statistics: {
              usage_count: 0,
              last_used: new Date().toISOString(),
              favorite_count: 0,
              average_session_length: 0,
            },
          };

          // キャラクターを追加
          addCharacter(character);

          setUploadStatus(
            `✅ キャラクター「${character.name}」を正常にインポートしました`
          );

          // 3秒後にステータスをクリア
          setTimeout(() => {
            setUploadStatus("");
          }, 3000);
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          setUploadStatus(
            `❌ ファイルの解析に失敗しました: ${
              parseError instanceof Error ? parseError.message : "不明なエラー"
            }`
          );
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("File upload error:", error);
      setUploadStatus(
        `❌ ファイルの読み込みに失敗しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`
      );
    } finally {
      setIsUploading(false);
      // ファイル入力をリセット
      event.target.value = "";
    }
  };

  const handleRefreshCharacters = async () => {
    setIsUploading(true);
    setUploadStatus("キャラクターを再読み込み中...");

    try {
      await loadCharactersFromPublic();
      setUploadStatus("✅ キャラクターの再読み込みが完了しました");

      setTimeout(() => {
        setUploadStatus("");
      }, 3000);
    } catch (error) {
      console.error("Refresh error:", error);
      setUploadStatus(
        `❌ 再読み込みに失敗しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportCharacters = () => {
    try {
      const charactersArray = Array.from(characters.values());
      const dataStr = JSON.stringify(charactersArray, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `characters-export-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setUploadStatus("✅ キャラクターをエクスポートしました");
      setTimeout(() => setUploadStatus(""), 3000);
    } catch (error) {
      console.error("Export error:", error);
      setUploadStatus(
        `❌ エクスポートに失敗しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">
          キャラクター管理
        </h3>
        <p className="text-gray-400 text-sm">
          キャラクターのインポート、エクスポート、再読み込みを行えます
        </p>
      </div>

      {/* ステータス表示 */}
      {uploadStatus && (
        <div
          className={`p-3 rounded-lg text-sm ${
            uploadStatus.startsWith("✅")
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}>
          {uploadStatus}
        </div>
      )}

      {/* アクションボタン */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* JSONファイルアップロード */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white">
            JSONファイルをインポート
          </label>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleJsonUpload}
              disabled={isUploading}
              className="hidden"
              id="character-json-upload"
            />
            <label
              htmlFor="character-json-upload"
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                isUploading
                  ? "border-gray-500 text-gray-400 cursor-not-allowed"
                  : "border-purple-400/50 text-purple-400 hover:border-purple-400 hover:bg-purple-400/10"
              }`}>
              <Upload className="w-4 h-4" />
              <span className="text-sm">
                {isUploading ? "処理中..." : "ファイルを選択"}
              </span>
            </label>
          </div>
        </div>

        {/* キャラクター再読み込み */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white">
            キャラクターを再読み込み
          </label>
          <button
            onClick={handleRefreshCharacters}
            disabled={isUploading}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
              isUploading
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}>
            <RefreshCw
              className={`w-4 h-4 ${isUploading ? "animate-spin" : ""}`}
            />
            <span className="text-sm">
              {isUploading ? "読み込み中..." : "再読み込み"}
            </span>
          </button>
        </div>

        {/* キャラクターエクスポート */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white">
            キャラクターをエクスポート
          </label>
          <button
            onClick={handleExportCharacters}
            disabled={isUploading || characters.size === 0}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
              isUploading || characters.size === 0
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}>
            <Download className="w-4 h-4" />
            <span className="text-sm">
              {characters.size === 0 ? "キャラクターなし" : "エクスポート"}
            </span>
          </button>
        </div>
      </div>

      {/* キャラクター統計 */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h4 className="text-lg font-medium text-white mb-3">
          キャラクター統計
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-400">総キャラクター数</div>
            <div className="text-white font-semibold">{characters.size}</div>
          </div>
          <div>
            <div className="text-gray-400">読み込み状態</div>
            <div
              className={`font-semibold ${
                isCharactersLoaded ? "text-green-400" : "text-yellow-400"
              }`}>
              {isCharactersLoaded ? "完了" : "読み込み中"}
            </div>
          </div>
          <div>
            <div className="text-gray-400">アバター設定済み</div>
            <div className="text-white font-semibold">
              {
                Array.from(characters.values()).filter((c) => c.avatar_url)
                  .length
              }
            </div>
          </div>
          <div>
            <div className="text-gray-400">背景設定済み</div>
            <div className="text-white font-semibold">
              {
                Array.from(characters.values()).filter(
                  (c) =>
                    c.background_url &&
                    c.background_url !== "/images/default-bg.jpg"
                ).length
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
