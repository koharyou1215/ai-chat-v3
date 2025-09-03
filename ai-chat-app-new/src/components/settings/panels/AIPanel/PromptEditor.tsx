"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Cpu, Shield, Lightbulb, Edit3, Eye, EyeOff, Save } from "lucide-react";
import { SystemPrompts } from "@/types/core/settings.types";

interface PromptEditorProps {
  systemPrompts: SystemPrompts;
  enableSystemPrompt: boolean;
  enableJailbreakPrompt: boolean;
  promptMode: "default" | "custom" | "both";
  showSystemPrompt: boolean;
  showJailbreakPrompt: boolean;
  showReplySuggestionPrompt: boolean;
  showTextEnhancementPrompt: boolean;
  onUpdateSystemPrompts: (prompts: SystemPrompts) => void;
  onSetEnableSystemPrompt: (enable: boolean) => void;
  onSetEnableJailbreakPrompt: (enable: boolean) => void;
  onSetPromptMode: (mode: "default" | "custom" | "both") => void;
  onToggleSystemPrompt: () => void;
  onToggleJailbreakPrompt: () => void;
  onToggleReplySuggestionPrompt: () => void;
  onToggleTextEnhancementPrompt: () => void;
  onSavePrompts: () => void;
}

/**
 * プロンプトエディターコンポーネント
 * システムプロンプト、脱獄プロンプト、返信提案・文章強化プロンプトの管理
 */
export const PromptEditor: React.FC<PromptEditorProps> = ({
  systemPrompts,
  enableSystemPrompt,
  enableJailbreakPrompt,
  promptMode,
  showSystemPrompt,
  showJailbreakPrompt,
  showReplySuggestionPrompt,
  showTextEnhancementPrompt,
  onUpdateSystemPrompts,
  onSetEnableSystemPrompt,
  onSetEnableJailbreakPrompt,
  onSetPromptMode,
  onToggleSystemPrompt,
  onToggleJailbreakPrompt,
  onToggleReplySuggestionPrompt,
  onToggleTextEnhancementPrompt,
  onSavePrompts,
}) => {
  const handlePromptChange = (key: keyof SystemPrompts, value: string) => {
    onUpdateSystemPrompts({ ...systemPrompts, [key]: value });
  };

  return (
    <div className="border-t border-white/10 pt-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white">AI設定</h3>
        <Button onClick={onSavePrompts} size="sm">
          <Save className="w-4 h-4 mr-2" />
          プロンプトを保存
        </Button>
      </div>

      {/* プロンプトモード選択 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-purple-500" />
          <label className="text-sm font-medium">プロンプトモード</label>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onSetPromptMode("default")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
              promptMode === "default"
                ? "bg-purple-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}>
            デフォルトのみ
          </button>
          <button
            onClick={() => onSetPromptMode("custom")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
              promptMode === "custom"
                ? "bg-purple-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}>
            カスタムのみ
          </button>
          <button
            onClick={() => onSetPromptMode("both")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
              promptMode === "both"
                ? "bg-purple-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}>
            両方使用
          </button>
        </div>
        <p className="text-xs text-gray-400">
          {promptMode === "default" &&
            "デフォルトのシステムプロンプトのみを使用します"}
          {promptMode === "custom" &&
            "カスタムプロンプトのみを使用します（空の場合はデフォルトにフォールバック）"}
          {promptMode === "both" &&
            "デフォルトとカスタムの両方を結合して使用します"}
        </p>
      </div>

      {/* システムプロンプト */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-blue-500" />
            <label className="text-sm font-medium">
              カスタムシステムプロンプト
            </label>
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
          <textarea
            value={systemPrompts.system}
            onChange={(e) => handlePromptChange("system", e.target.value)}
            className="w-full h-32 px-3 py-2 bg-slate-800 border border-gray-600 rounded text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            placeholder="システムプロンプトを入力..."
          />
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
  );
};