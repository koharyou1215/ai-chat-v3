"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Cpu,
  Shield,
  Lightbulb,
  Edit3,
  Eye,
  EyeOff,
  Save,
  FileText,
  Trash2,
} from "lucide-react";
import {
  SystemPrompts,
  APIConfig,
  APIProvider,
} from "@/types/core/settings.types";
import { getModelPricing } from "@/constants/model-pricing";
import {
  ModelPricingDisplay,
} from "../../ModelPricingDisplay";

interface AIPanelProps {
  systemPrompts: SystemPrompts;
  enableSystemPrompt: boolean;
  enableJailbreakPrompt: boolean;
  apiConfig: APIConfig;
  openRouterApiKey: string;
  geminiApiKey: string;
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
  setAPIModel: (model: string) => void;
  setAPIProvider: (provider: APIProvider) => void;
  setOpenRouterApiKey: (key: string) => void;
  setGeminiApiKey: (key: string) => void;
  useDirectGeminiAPI: boolean;
  setUseDirectGeminiAPI: (enabled: boolean) => void;
}

export const AIPanel: React.FC<AIPanelProps> = ({
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

  // 🔧 FIX: propsの変更を監視してローカル状態を同期
  useEffect(() => {
    setLocalOpenRouterApiKey(openRouterApiKey || "");
  }, [openRouterApiKey]);

  useEffect(() => {
    setLocalGeminiApiKey(geminiApiKey || "");
  }, [geminiApiKey]);

  // apiConfig がなければ何も表示しない
  if (!apiConfig) {
    return null;
  }

  const handleModelChange = (modelId: string) => {
    setAPIModel(modelId);
    // 🔧 FIX: Geminiモデル選択時にproviderを自動変更しない
    // useDirectGeminiAPIトグルで判断する
    // OpenRouter経由でもGeminiモデルを使用可能にする
  };

  const handleApiKeyChange = (key: string) => {
    setLocalOpenRouterApiKey(key);
    setOpenRouterApiKey(key);
  };

  const handleGeminiApiKeyChange = (key: string) => {
    setLocalGeminiApiKey(key);
    setGeminiApiKey(key);
  };

  // 🔧 FIX: Gemini直接APIモデルかどうかを判定（"google/"プレフィックスなし）
  const isGeminiDirectModel = apiConfig.model?.startsWith("gemini-");

  // 🔧 FIX: Geminiモデル全般（直接API + OpenRouter経由）
  const isGeminiModel = apiConfig.model?.includes("gemini");

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
              <optgroup label="Google Gemini（直接API）">
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-flash-light">Gemini 2.5 Flash Light</option>
              </optgroup>

              <optgroup label="Google（OpenRouter経由）">
                <option value="google/gemini-2.5-pro">Gemini 2.5 Pro (OpenRouter)</option>
                <option value="google/gemini-2.5-flash-preview-09-2025">Gemini 2.5 Flash (OpenRouter)</option>
                <option value="google/gemini-2.5-flash-lite-preview-09-2025">Gemini 2.5 Flash Light (OpenRouter)</option>
              </optgroup>

              <optgroup label="Anthropic (OpenRouter)">
                <option value="anthropic/claude-opus-4">Claude Opus 4</option>
                <option value="anthropic/claude-sonnet-4.5">Claude Sonnet 4.5</option>
                <option value="anthropic/claude-haiku-4.5">Claude Haiku 4.5</option>
              </optgroup>

              <optgroup label="xAI (OpenRouter)">
                <option value="x-ai/grok-4">Grok-4</option>
                <option value="x-ai/grok-4-fast">grok-4-fast</option>
              </optgroup>

              <optgroup label="OpenAI (OpenRouter)">
                <option value="openai/gpt-5-chat">GPT-5</option>
                <option value="openai/gpt-5-mini">GPT-5 Mini</option>
              </optgroup>

              <optgroup label="Standard (OpenRouter)">
                <option value="deepseek/deepseek-v3.2-exp">DeepSeek v3.2 Experimental</option>
                <option value="mistralai/mistral-medium-3.1">Mistral Medium 3.1</option>
                <option value="meta-llama/llama-4-maverick">Llama 4 Maverick</option>
              </optgroup>

              <optgroup label="Specialized (OpenRouter)">
                <option value="qwen/qwen3-max">qwen3-max</option>
                <option value="qwen/qwen3-vl-8b-instruct">Qwen 3 VL 8B</option>
                <option value="qwen/qwen3-vl-30b-a3b-instruct">Qwen 30b</option>
                <option value="qwen/qwen3-vl-235b-a22b-instruct">Qwen 235b</option>
                <option value="opengvlab/internvl3-78b">opengvlab/internvl</option>
                <option value="nousresearch/hermes-4-405b">Hermes 4 405B</option>
                <option value="z-ai/glm-4.6">GLM-4.6</option>
                <option value="moonshotai/kimi-k2-0905">Kimi K2</option>
                <option value="baidu/ernie-4.5-21b-a3b-thinking">ERNIE 4.5 21B Thinking</option>
                <option value="inclusionai/ling-1t">Ling-1T</option>
                <option value="nvidia/llama-3.3-nemotron-super-49b-v1.5">Llama 3.3 Nemotron Super 49B v1.5</option>
                <option value="minimax/minimax-m2:free">MiniMax M2（無料版）</option>
              </optgroup>
            </select>
            {isGeminiModel ? (
              <p className="text-xs text-blue-400 mt-1">
                {useDirectGeminiAPI ? (
                  <>
                    🔥 Gemini API直接使用 - 高速・低レイテンシ
                  </>
                ) : (
                  <>
                    🌐 OpenRouter経由でGeminiを使用 - 複数モデル統合管理
                  </>
                )}
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

        {/* Gemini API直接使用トグル - Gemini直接APIモデル選択時のみ表示 */}
        {isGeminiDirectModel && (
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
                ? "🔥 ON: Gemini APIを直接使用（高速・低レイテンシ）"
                : "🌐 OFF: OpenRouter経由でGemini使用（統合管理）"}
            </p>
          </div>
        )}

        {/* Gemini APIキー入力 - Gemini直接APIモデル && 直接API使用ON時のみ表示 */}
        <AnimatePresence>
          {isGeminiDirectModel && useDirectGeminiAPI && (
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

        {/* OpenRouter APIキー入力 - 非Gemini直接APIモデル or Gemini直接APIモデル&&直接API使用OFF時に表示 */}
        <AnimatePresence>
          {(!isGeminiDirectModel || (isGeminiDirectModel && !useDirectGeminiAPI)) && (
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
                OpenRouterのAPIキーを入力してください。
                {!isGeminiDirectModel && (
                  <span className="text-blue-400"> (Claude, GPT, Grok, Gemini等全モデル対応)</span>
                )}
                キーは暗号化されてローカルに保存されます。
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
                  onClick={() =>
                    console.log("詳細版プロンプトの機能は現在利用できません")
                  }
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition-colors flex items-center gap-1.5"
                  title="詳細版ロールプレイプロンプトを使用">
                  <Cpu size={14} />
                  詳細版プロンプト
                </button>
                <button
                  onClick={() =>
                    console.log("要約版プロンプトの機能は現在利用できません")
                  }
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
