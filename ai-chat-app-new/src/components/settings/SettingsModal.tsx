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
  Sparkles,
  Brain,
  Activity,
  Gauge,
  Wand2,
  Edit3,
  Save,
  Eye,
  EyeOff,
  Lightbulb,
  TestTube2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import {
  SystemPrompts,
  APIConfig,
  APIProvider,
} from "@/types/core/settings.types";
import {
  EffectSettings,
  AppearanceSettings,
} from "@/store/slices/settings.slice";
import { StorageManager } from "@/utils/storage-cleanup";

import { EffectsPanel } from "./panels/EffectsPanel";
import { AIPanel } from "./panels/AIPanel/AIPanel";

// ローカル定義を使用
interface SettingItemProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

const SettingItem: React.FC<SettingItemProps> = ({
  label,
  description,
  children,
  className,
}) => (
  <div className={cn("space-y-2", className)}>
    <label className="text-sm font-medium text-gray-300">{label}</label>
    {description && <p className="text-xs text-gray-500">{description}</p>}
    {children}
  </div>
);

// 古いインラインコンポーネント定義は削除済み
// 新しいモジュラーコンポーネントを使用

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
  onEffectSettingsChange?: (settings: EffectSettings) => void;
}

// Settings tabs configuration
const tabsConfig = [
  { id: "ai", label: "AI", icon: Cpu },
  { id: "voice", label: "音声", icon: Volume2 },
  { id: "effects", label: "エフェクト", icon: Sparkles },
  { id: "appearance", label: "外観", icon: Palette },
  { id: "system", label: "システム", icon: Database },
  { id: "chat", label: "チャット", icon: Globe },
  { id: "security", label: "セキュリティ", icon: Shield },
  { id: "notifications", label: "通知", icon: Bell },
  { id: "advanced", label: "高度", icon: Code },
  { id: "memory", label: "メモリー", icon: Brain },
  { id: "emotion", label: "感情AI", icon: Activity },
  { id: "performance", label: "パフォーマンス", icon: Gauge },
  { id: "tracker", label: "トラッカー", icon: Wand2 },
  { id: "layout", label: "レイアウト", icon: Edit3 },
];

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = "ai",
  onEffectSettingsChange,
}) => {
  const {
    apiConfig,
    updateAPIConfig,
    systemPrompts,
    updateSystemPrompts,
    effectSettings,
    updateEffectSettings,
    appearanceSettings,
    updateAppearanceSettings,
    // 追加: APIキーとモデル/プロバイダー/パラメータのストア操作
    openRouterApiKey,
    geminiApiKey,
    setOpenRouterApiKey,
    setGeminiApiKey,
    setAPIProvider,
    setAPIModel,
    setTemperature,
    setMaxTokens,
    setTopP,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [localApiConfig, setLocalApiConfig] = useState<APIConfig>(apiConfig);
  const [localSystemPrompts, setLocalSystemPrompts] =
    useState<SystemPrompts>(systemPrompts);

  useEffect(() => {
    if (isOpen) {
      setLocalSystemPrompts(systemPrompts);
      setActiveTab(initialTab);
    }
  }, [isOpen, systemPrompts, initialTab]);

  const [localEffectSettings, setLocalEffectSettings] =
    useState<EffectSettings>(effectSettings);

  useEffect(() => {
    if (isOpen) {
      setLocalEffectSettings(effectSettings);
    }
  }, [isOpen, effectSettings]);

  const handleSave = () => {
    updateAPIConfig(localApiConfig);
    updateSystemPrompts(localSystemPrompts);
    updateEffectSettings(localEffectSettings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
            <h2 className="text-2xl font-bold text-white">設定</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2">
                <Save className="w-4 h-4" />
                保存
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="flex h-[calc(90vh-120px)]">
            {/* Sidebar */}
            <div className="w-64 border-r border-slate-700/50 p-4">
              <div className="space-y-2">
                {tabsConfig.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left",
                      activeTab === tab.id
                        ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                        : "text-gray-400 hover:bg-slate-700/30 hover:text-gray-300"
                    )}>
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {activeTab === "ai" && (
                  <AIPanel
                    systemPrompts={localSystemPrompts}
                    enableSystemPrompt={true}
                    enableJailbreakPrompt={false}
                    promptMode="default"
                    apiConfig={localApiConfig}
                    openRouterApiKey={openRouterApiKey || ""}
                    geminiApiKey={geminiApiKey || ""}
                    showSystemPrompt={true}
                    showJailbreakPrompt={false}
                    showReplySuggestionPrompt={false}
                    showTextEnhancementPrompt={false}
                    onUpdateSystemPrompts={(prompts) =>
                      setLocalSystemPrompts(prompts)
                    }
                    onSetEnableSystemPrompt={() => {}}
                    onSetEnableJailbreakPrompt={() => {}}
                    onSetPromptMode={() => {}}
                    onSetTemperature={(t) => {
                      setLocalApiConfig({ ...localApiConfig, temperature: t });
                      setTemperature(t);
                    }}
                    onSetMaxTokens={(v) => {
                      setLocalApiConfig({ ...localApiConfig, max_tokens: v });
                      setMaxTokens(v);
                    }}
                    onSetTopP={(v) => {
                      setLocalApiConfig({ ...localApiConfig, top_p: v });
                      setTopP(v);
                    }}
                    onToggleSystemPrompt={() => {}}
                    onToggleJailbreakPrompt={() => {}}
                    updateAPIConfig={(updates) => {
                      setLocalApiConfig({ ...localApiConfig, ...updates });
                      updateAPIConfig(updates);
                    }}
                    onToggleReplySuggestionPrompt={() => {}}
                    onToggleTextEnhancementPrompt={() => {}}
                    setAPIModel={(model) => {
                      setLocalApiConfig({ ...localApiConfig, model });
                      setAPIModel(model);
                    }}
                    setAPIProvider={(provider) => {
                      setLocalApiConfig({ ...localApiConfig, provider });
                      setAPIProvider(provider);
                    }}
                    setOpenRouterApiKey={(key) => setOpenRouterApiKey(key)}
                    setGeminiApiKey={(key) => setGeminiApiKey(key)}
                  />
                )}

                {activeTab === "effects" && (
                  <EffectsPanel
                    settings={localEffectSettings}
                    updateSetting={(key, value) =>
                      setLocalEffectSettings({
                        ...localEffectSettings,
                        [key]: value,
                      })
                    }
                  />
                )}

                {/* Add other tab contents as needed */}
                {activeTab !== "ai" && activeTab !== "effects" && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🚧</div>
                      <h3 className="text-xl font-semibold text-gray-400 mb-2">
                        開発中
                      </h3>
                      <p className="text-gray-500">
                        この設定パネルは開発中です。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SettingsModal;
