"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Edit3,
  Eye,
  EyeOff,
  Lightbulb,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  APIConfig,
  APIProvider,
  ChatSystemPromptMode,
  SystemPrompts,
} from "@/types/core/settings.types";
import {
  MODEL_SELECT_GROUPS,
  getModelPricing,
} from "@/constants/model-pricing";
import {
  PROMPT_PRESETS,
  getPromptPreset,
  inferPromptPresetId,
} from "@/constants/prompt-presets";
import { useAppStore } from "@/store";
import { ModelPricingDisplay } from "../../ModelPricingDisplay";

interface AIPanelProps {
  systemPrompts: SystemPrompts;
  enableSystemPrompt: boolean;
  chatSystemPromptMode: ChatSystemPromptMode;
  enableAnchorPrompt: boolean;
  anchorDepth: number;
  apiConfig: APIConfig;
  openRouterApiKey: string;
  geminiApiKey: string;
  googleCloudApiKey: string;
  showSystemPrompt: boolean;
  showAnchorPrompt: boolean;
  showReplySuggestionPrompt: boolean;
  showTextEnhancementPrompt: boolean;
  selectedPromptPresetId: string | null;
  onUpdateSystemPrompts: (prompts: SystemPrompts) => void;
  onSelectPromptPreset: (presetId: string | null) => void;
  onSetEnableSystemPrompt: (enable: boolean) => void;
  onSetChatSystemPromptMode: (mode: ChatSystemPromptMode) => void;
  onSetEnableAnchorPrompt: (enable: boolean) => void;
  onSetAnchorDepth: (depth: number) => void;
  onSetTemperature: (temp: number) => void;
  onSetMaxTokens: (tokens: number) => void;
  onSetTopP: (topP: number) => void;
  onToggleSystemPrompt: () => void;
  onToggleAnchorPrompt: () => void;
  onToggleReplySuggestionPrompt: () => void;
  onToggleTextEnhancementPrompt: () => void;
  setAPIModel: (model: string) => void;
  setAPIProvider: (provider: APIProvider) => void;
  setOpenRouterApiKey: (key: string) => void;
  setGeminiApiKey: (key: string) => void;
  setGoogleCloudApiKey: (key: string) => void;
  useDirectGeminiAPI: boolean;
  setUseDirectGeminiAPI: (enabled: boolean) => void;
  onSetInspirationUseFixedModel: (enabled: boolean) => void;
  onSetInspirationFixedModel: (model: string, provider?: APIProvider) => void;
  onSetInspirationFixedUseDirectGeminiAPI: (enabled: boolean) => void;
}

export const AIPanel: React.FC<AIPanelProps> = ({
  systemPrompts,
  enableSystemPrompt,
  chatSystemPromptMode,
  enableAnchorPrompt,
  anchorDepth,
  apiConfig,
  openRouterApiKey,
  geminiApiKey,
  showSystemPrompt,
  showAnchorPrompt,
  showReplySuggestionPrompt,
  showTextEnhancementPrompt,
  selectedPromptPresetId,
  onUpdateSystemPrompts,
  onSelectPromptPreset,
  onSetEnableSystemPrompt,
  onSetChatSystemPromptMode,
  onSetEnableAnchorPrompt,
  onSetAnchorDepth,
  onSetTemperature,
  onSetMaxTokens,
  onSetTopP,
  onToggleSystemPrompt,
  onToggleAnchorPrompt,
  onToggleReplySuggestionPrompt,
  onToggleTextEnhancementPrompt,
  setAPIModel,
  setAPIProvider,
  setOpenRouterApiKey,
  setGeminiApiKey,
  useDirectGeminiAPI,
  setUseDirectGeminiAPI,
  onSetInspirationUseFixedModel,
  onSetInspirationFixedModel,
  onSetInspirationFixedUseDirectGeminiAPI,
}) => {
  const [localOpenRouterApiKey, setLocalOpenRouterApiKey] = useState(
    openRouterApiKey || ""
  );
  const [localGeminiApiKey, setLocalGeminiApiKey] = useState(
    geminiApiKey || ""
  );
  const [showOpenRouterApiKey, setShowOpenRouterApiKey] = useState(false);
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);

  useEffect(() => {
    setLocalOpenRouterApiKey(openRouterApiKey || "");
  }, [openRouterApiKey]);

  useEffect(() => {
    setLocalGeminiApiKey(geminiApiKey || "");
  }, [geminiApiKey]);

  if (!apiConfig) {
    return null;
  }

  const selectedPreset = getPromptPreset(selectedPromptPresetId);
  const isGeminiDirectModel = apiConfig.model.startsWith("gemini-");
  const isGoogleOpenRouterModel = apiConfig.model.startsWith("google/");
  const isGeminiModel = isGeminiDirectModel || isGoogleOpenRouterModel;
  const modelInfo = getModelPricing(apiConfig.model);
  const inspirationConfig = apiConfig.inspiration;
  const inspirationUsesFixedModel = inspirationConfig?.useFixedModel ?? false;
  const inspirationModel = inspirationConfig?.fixedModel || apiConfig.model;
  const inspirationIsDirectGeminiModel =
    inspirationModel.startsWith("gemini-");
  const inspirationIsGoogleOpenRouterModel =
    inspirationModel.startsWith("google/");
  const inspirationUsesDirectGeminiAPI = inspirationIsGoogleOpenRouterModel
    ? false
    : inspirationConfig?.fixedUseDirectGeminiAPI ??
      inspirationIsDirectGeminiModel;
  const inspirationModelInfo = getModelPricing(inspirationModel);
  const showBaseModelPricing =
    !!modelInfo &&
    (!inspirationUsesFixedModel || inspirationModelInfo?.id !== modelInfo.id);

  const handlePromptChange = (key: keyof SystemPrompts, value: string) => {
    const nextPrompts = { ...systemPrompts, [key]: value };
    onUpdateSystemPrompts(nextPrompts);
    onSelectPromptPreset(inferPromptPresetId(nextPrompts));
  };

  const applyPromptPreset = (presetId: string) => {
    const preset = getPromptPreset(presetId);
    if (!preset) {
      return;
    }

    onUpdateSystemPrompts({
      ...systemPrompts,
      system: preset.prompts.system,
      anchor: preset.prompts.anchor,
    });
    onSelectPromptPreset(preset.id);
  };

  const handleModelChange = (modelId: string) => {
    setAPIModel(modelId);

    if (modelId.startsWith("gemini-")) {
      setAPIProvider("gemini");
      setUseDirectGeminiAPI(true);
      return;
    }

    setAPIProvider("openrouter");
    if (modelId.startsWith("google/")) {
      setUseDirectGeminiAPI(false);
    }
  };

  const handleInspirationModelChange = (modelId: string) => {
    const provider: APIProvider = modelId.startsWith("gemini-")
      ? "gemini"
      : "openrouter";

    onSetInspirationFixedModel(modelId, provider);

    if (modelId.startsWith("google/")) {
      onSetInspirationFixedUseDirectGeminiAPI(false);
      return;
    }

    if (modelId.startsWith("gemini-")) {
      onSetInspirationFixedUseDirectGeminiAPI(true);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-lg font-medium text-white">
            <Cpu className="h-5 w-5 text-purple-400" />
            Model
          </h4>
          <p className="text-sm text-slate-400">
            The dropdown is now sourced from shared model metadata.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-200">
            Model selection
          </label>
          <select
            value={apiConfig.model}
            onChange={(event) => handleModelChange(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            {MODEL_SELECT_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="text-xs text-slate-400">
            {isGeminiModel
              ? useDirectGeminiAPI && isGeminiDirectModel
                ? "Using the direct Gemini API path."
                : "Using the OpenRouter path for this model."
              : "Using the OpenRouter provider path."}
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-white/10 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-200">
                インスピレーション機能のモデル設定
              </label>
              <p className="text-xs text-slate-400">
                返信提案・文章強化機能でのみこのモデルを使用します
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onSetInspirationUseFixedModel(!inspirationUsesFixedModel)
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                inspirationUsesFixedModel ? "bg-yellow-500" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  inspirationUsesFixedModel ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {inspirationUsesFixedModel ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  インスピレーション用モデル
                </label>
                <select
                  value={inspirationModel}
                  onChange={(event) =>
                    handleInspirationModelChange(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-yellow-500 focus:outline-none"
                >
                  {MODEL_SELECT_GROUPS.map((group) => (
                    <optgroup
                      key={`inspiration-${group.label}`}
                      label={group.label}
                    >
                      {group.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="text-xs text-slate-400">
                  通常会話のモデルとは別に、返信提案と文章強化でだけこのモデルを使用します
                </p>
              </div>

              {inspirationModelInfo ? (
                <div className="rounded-lg border border-white/10 bg-slate-950/40 p-4">
                  <h5 className="mb-3 text-sm font-semibold text-white">
                    {inspirationModelInfo.name} の料金情報
                  </h5>
                  <ModelPricingDisplay modelInfo={inspirationModelInfo} />
                </div>
              ) : null}

              {inspirationIsDirectGeminiModel ? (
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/40 p-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-200">
                      インスピレーションで Gemini 直接 API を使う
                    </label>
                    <p className="text-xs text-slate-400">
                      `google/` モデルは常に OpenRouter 経由です
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onSetInspirationFixedUseDirectGeminiAPI(
                        !inspirationUsesDirectGeminiAPI
                      )
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      inspirationUsesDirectGeminiAPI
                        ? "bg-yellow-500"
                        : "bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        inspirationUsesDirectGeminiAPI
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {showBaseModelPricing && modelInfo ? (
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
            <h5 className="mb-4 text-sm font-semibold text-white">
              {modelInfo.name} pricing
            </h5>
            <ModelPricingDisplay modelInfo={modelInfo} />
          </div>
        ) : null}

        {/* Gemini API直接使用トグル - Gemini直接APIモデル選択時のみ表示 */}
        {isGeminiDirectModel && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-200">
                Gemini APIを直接使用
              </label>
              <button
                type="button"
                onClick={() => setUseDirectGeminiAPI(!useDirectGeminiAPI)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${useDirectGeminiAPI ? "bg-purple-600" : "bg-slate-600"
                  }`}>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useDirectGeminiAPI ? "translate-x-6" : "translate-x-1"
                    }`}
                />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              {useDirectGeminiAPI
                ? "🔥 ON: プレフィックスなしGeminiモデルは直接API使用（高速・低レイテンシ）"
                : "🌐 OFF: 全てのGeminiモデルでOpenRouter使用（統合管理）"}
              <br />
              <span className="text-blue-400">
                ※ google/プレフィックスモデルは常にOpenRouter経由
              </span>
            </p>
          </div>
        )}

        {/* Gemini APIキー入力 - Gemini直接APIモデル（プレフィックスなし） && 直接API使用ON時のみ表示 */}
        <AnimatePresence>
          {isGeminiDirectModel && !apiConfig.model.startsWith('google/') && useDirectGeminiAPI && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden">
              <label className="block text-sm font-medium text-slate-200">
                Gemini APIキー（直接API用）
              </label>
              <div className="relative">
                <input
                  type={showGeminiApiKey ? "text" : "password"}
                  value={localGeminiApiKey}
                  onChange={(event) => {
                    const value = event.target.value;
                    setLocalGeminiApiKey(value);
                    setGeminiApiKey(value);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 pr-10 text-sm text-white focus:border-purple-500 focus:outline-none"
                  placeholder="AIza..."
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiApiKey(!showGeminiApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showGeminiApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Google AI Studioで取得したAPIキーを入力してください。
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OpenRouter APIキー入力 - google/プレフィックスモデル or 非Gemini直接APIモデル or 直接API使用OFF時に表示 */}
        <AnimatePresence>
          {(apiConfig.model.startsWith('google/') || !isGeminiDirectModel || (isGeminiDirectModel && !useDirectGeminiAPI)) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden">
              <label className="block text-sm font-medium text-slate-200">
                OpenRouter APIキー
                {apiConfig.model.startsWith('google/') && <span className="text-blue-400 ml-2">（このモデルで使用）</span>}
              </label>
              <div className="relative">
                <input
                  type={showOpenRouterApiKey ? "text" : "password"}
                  value={localOpenRouterApiKey}
                  onChange={(event) => {
                    const value = event.target.value;
                    setLocalOpenRouterApiKey(value);
                    setOpenRouterApiKey(value);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 pr-10 text-sm text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Enter your OpenRouter API key"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenRouterApiKey(!showOpenRouterApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showOpenRouterApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                OpenRouterのAPIキーを入力してください。
                {apiConfig.model.startsWith('google/') ? (
                  <span className="text-blue-400"> (google/プレフィックスモデルはこのキーを使用)</span>
                ) : !isGeminiDirectModel && (
                  <span className="text-blue-400"> (Claude, GPT, Grok, Gemini等全モデル対応)</span>
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="space-y-4 border-t border-white/10 pt-6">
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-lg font-medium text-white">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            プロンプトプリセット
          </h4>
          <p className="text-sm text-slate-400">
            system prompt と anchor prompt をプリセット単位でまとめて切り替えます
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PROMPT_PRESETS.map((preset) => {
            const isSelected = selectedPromptPresetId === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPromptPreset(preset.id)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? "border-yellow-400 bg-yellow-500/10 text-white"
                    : "border-white/10 bg-slate-900/40 text-slate-200 hover:border-white/30 hover:bg-slate-900/70"
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>

        <div className="space-y-3 rounded-lg border border-white/10 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
            <span>
              {selectedPreset
                ? `現在のプリセット: ${selectedPreset.name}`
                : "現在のプリセット: カスタム"}
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (selectedPromptPresetId) {
                  applyPromptPreset(selectedPromptPresetId);
                }
              }}
              disabled={!selectedPromptPresetId}
            >
              再適用
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            {selectedPreset
              ? selectedPreset.description
              : "system prompt または anchor prompt を編集するとカスタム扱いになります"}
          </p>
        </div>
      </section>

      <section className="space-y-6 border-t border-white/10 pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-400" />
              <label className="text-sm font-medium text-white">
                System prompt
              </label>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={enableSystemPrompt}
                  onChange={(event) =>
                    onSetEnableSystemPrompt(event.target.checked)
                  }
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-slate-600 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-500 peer-checked:after:translate-x-full" />
              </label>
              <button
                type="button"
                onClick={onToggleSystemPrompt}
                className="flex items-center gap-1 rounded bg-slate-700 px-3 py-1 text-xs text-white transition-colors hover:bg-slate-600"
              >
                {showSystemPrompt ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
                {showSystemPrompt ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-300">
              Normal chat fallback mode
            </div>
            <div className="flex gap-2">
              {(["legacy", "minimal"] as const).map((mode) => {
                const selected = chatSystemPromptMode === mode;

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onSetChatSystemPromptMode(mode)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? "border-blue-500 bg-blue-500/20 text-blue-200"
                        : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Custom system prompt 以外の通常チャット fallback を切り替えます。
            </p>
          </div>

          {showSystemPrompt ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePromptChange("system", "")}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-white transition-colors hover:bg-slate-600"
                  title="Clear the system prompt"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>
              <textarea
                value={systemPrompts.system}
                onChange={(event) =>
                  handlePromptChange("system", event.target.value)
                }
                className="h-40 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-white focus:border-blue-500 focus:outline-none"
                placeholder="Enter the system prompt"
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-400" />
              <label className="text-sm font-medium text-white">
                Anchor prompt
              </label>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={enableAnchorPrompt}
                  onChange={(event) =>
                    onSetEnableAnchorPrompt(event.target.checked)
                  }
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-slate-600 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-red-500 peer-checked:after:translate-x-full" />
              </label>
              <button
                type="button"
                onClick={onToggleAnchorPrompt}
                className="flex items-center gap-1 rounded bg-slate-700 px-3 py-1 text-xs text-white transition-colors hover:bg-slate-600"
              >
                {showAnchorPrompt ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
                {showAnchorPrompt ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Anchor depth: {anchorDepth}
            </label>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={anchorDepth}
              onChange={(event) =>
                onSetAnchorDepth(Number(event.target.value))
              }
              className="w-full cursor-pointer"
            />
          </div>

          {showAnchorPrompt ? (
            <textarea
              value={systemPrompts.anchor}
              onChange={(event) =>
                handlePromptChange("anchor", event.target.value)
              }
              className="h-28 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
              placeholder="Enter the anchor prompt"
            />
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-400" />
            <label className="text-sm font-medium text-white">
              返信提案プロンプト
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleReplySuggestionPrompt}
              className="flex items-center gap-1 rounded bg-slate-700 px-3 py-1 text-xs text-white transition-colors hover:bg-slate-600"
            >
              {showReplySuggestionPrompt ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
              {showReplySuggestionPrompt ? "非表示" : "表示"}
            </button>
          </div>
          {showReplySuggestionPrompt ? (
            <textarea
              value={systemPrompts.replySuggestion}
              onChange={(event) =>
                handlePromptChange("replySuggestion", event.target.value)
              }
              className="h-32 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-white focus:border-yellow-500 focus:outline-none"
              placeholder="返信提案プロンプトを入力..."
            />
          ) : null}
        </div>

        {/* 💡 インスピレーション機能のモデル設定 */}
        <div className="space-y-4 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <label className="text-sm font-medium text-white">インスピレーション機能のモデル設定</label>
          </div>

          {/* 固定モデル使用トグル */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-300">
                専用モデルを固定使用
              </label>
              <p className="text-xs text-slate-500">
                {apiConfig.inspiration?.useFixedModel
                  ? `🔒 固定: ${apiConfig.inspiration?.fixedModel || '未設定'}`
                  : `🔄 チャットと同じ: ${apiConfig.model}`
                }
              </p>
            </div>
            <button
              onClick={() => {
                const current = apiConfig.inspiration?.useFixedModel ?? false;
                useAppStore.getState().setInspirationUseFixedModel(!current);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${apiConfig.inspiration?.useFixedModel ? "bg-amber-600" : "bg-slate-600"
                }`}>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${apiConfig.inspiration?.useFixedModel ? "translate-x-6" : "translate-x-1"
                  }`}
              />
            </button>
          </div>

          {/* 固定モデル選択（トグルON時のみ） */}
          <AnimatePresence>
            {apiConfig.inspiration?.useFixedModel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden">
                <label className="block text-sm font-medium text-slate-300">
                  固定モデル選択
                </label>
                <select
                  value={apiConfig.inspiration?.fixedModel || apiConfig.model}
                  onChange={(e) => {
                    const model = e.target.value;
                    const provider = model.startsWith('gemini-') ? 'gemini' as APIProvider : 'openrouter' as APIProvider;
                    useAppStore.getState().setInspirationFixedModel(model, provider);
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500">
                  <optgroup label="Google Gemini（直接API）">
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.5-flash-preview-09-2025">Gemini 2.5 Flash Preview</option>
                    <option value="gemini-3.1-flash-lite-preview">gemini-3.1-flash-lite-preview Preview</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                  </optgroup>

                  <optgroup label="Google（OpenRouter経由）">
                    <option value="google/gemini-2.5-flash-preview-09-2025">Gemini 2.5 Flash Preview</option>
                    <option value="google/gemini-3.1-flash-lite-preview">gemini-3.1-flash-lite-preview Preview</option>
                    <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="google/gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                    <option value="google/gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                  </optgroup>

                  <optgroup label="Anthropic (OpenRouter)">
                    <option value="anthropic/claude-opus-4">Claude Opus 4</option>
                    <option value="anthropic/claude-sonnet-4.6">Claude Sonnet 4.6</option>
                    <option value="anthropic/claude-haiku-4.5">Claude Haiku 4.5</option>
                  </optgroup>

                  <optgroup label="xAI (OpenRouter)">
                    <option value="x-ai/grok-4.20-beta">Grok 4.20 Beta</option>
                  </optgroup>

                  <optgroup label="OpenAI (OpenRouter)">
                    <option value="openai/gpt-5.2-chat">GPT-5.2</option>
                    <option value="openai/gpt-5.1-chat">GPT-5.1</option>
                    <option value="openai/gpt-5-mini">GPT-5 Mini</option>
                  </optgroup>

                  <optgroup label="Standard (OpenRouter)">
                    <option value="deepseek/deepseek-v3.2">DeepSeek v3.2</option>
                    <option value="deepseek/deepseek-v3.2-speciale">DeepSeek v3.2 Speciale</option>
                    <option value="mistralai/mistral-large-2512">Mistral Large 3 (2512)</option>
                    <option value="mistralai/ministral-14b-2512">Ministral 14B</option>
                    <option value="z-ai/glm-5">GLM-5</option>
                    <option value="tngtech/tng-r1t-chimera:free">TNG R1T Chimera (Free)</option>
                  </optgroup>
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  💡 返信提案・文章強化機能でのみこのモデルを使用します
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-green-400" />
            <label className="text-sm font-medium text-white">
              文章強化プロンプト
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleTextEnhancementPrompt}
              className="flex items-center gap-1 rounded bg-slate-700 px-3 py-1 text-xs text-white transition-colors hover:bg-slate-600"
            >
              {showTextEnhancementPrompt ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
              {showTextEnhancementPrompt ? "非表示" : "表示"}
            </button>
          </div>
          {showTextEnhancementPrompt ? (
            <textarea
              value={systemPrompts.textEnhancement}
              onChange={(event) =>
                handlePromptChange("textEnhancement", event.target.value)
              }
              className="h-32 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-white focus:border-green-500 focus:outline-none"
              placeholder="文章強化プロンプトを入力..."
            />
          ) : null}
        </div>
      </section>

      <section className="space-y-4 border-t border-white/10 pt-6">
        <h4 className="text-lg font-medium text-white">Generation parameters</h4>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Temperature: {apiConfig.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={apiConfig.temperature}
            onChange={(event) => onSetTemperature(Number(event.target.value))}
            className="w-full cursor-pointer"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Max tokens: {apiConfig.max_tokens}
          </label>
          <input
            type="range"
            min="256"
            max="8192"
            step="256"
            value={apiConfig.max_tokens}
            onChange={(event) => onSetMaxTokens(Number(event.target.value))}
            className="w-full cursor-pointer"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Top-p: {apiConfig.top_p}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={apiConfig.top_p}
            onChange={(event) => onSetTopP(Number(event.target.value))}
            className="w-full cursor-pointer"
          />
        </div>
      </section>
    </div>
  );
};
