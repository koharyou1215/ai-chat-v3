"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import {
  SystemPrompts,
  EffectSettings,
} from "@/types/core/settings.types";
import { geminiCacheManager } from "@/services/api/gemini-cache-manager";

// Import all panel components
import {
  EffectsPanel,
  ThreeDPanel,
  EmotionPanel,
  TrackerPanel,
  PerformancePanel,
  AIPanel,
  ChatPanel,
  AppearancePanel,
  LanguagePanel,
  VoicePanel,
  DataManagementPanel,
  CharacterManagementPanel,
} from "./SettingsModal/panels";

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
    unifiedSettings,
    updateCategory,
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

    // 🔥 Cache Invalidation: システムプロンプト変更時にすべてのキャッシュを無効化
    geminiCacheManager.invalidateAll();
    console.log('💾 [Cache] Invalidated all caches due to system prompt changes');

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
            style={{ WebkitOverflowScrolling: "touch" }}>
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
              <div
                className="flex-1 p-6 overflow-y-auto"
                style={{
                  WebkitOverflowScrolling: "touch",
                  overscrollBehavior: "contain",
                }}>
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
                    emotionalIntelligence={unifiedSettings.emotionalIntelligence}
                    updateEmotionalIntelligence={(updates) => updateCategory('emotionalIntelligence', updates)}
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

export default SettingsModal;
