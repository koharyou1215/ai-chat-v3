"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store";

/**
 * ChatPanel Component
 *
 * チャット設定パネル - 記憶容量制限、プログレッシブモード設定、一般チャット設定を管理
 *
 * Features:
 * - Memory capacity limits (作業記憶、メモリーカード、関連記憶検索など)
 * - Progressive response mode settings (3段階プログレッシブ応答設定)
 * - General chat settings (記憶容量レガシー設定)
 */
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
            onChange={(e) => {
              const newEnabled = e.target.checked;
              console.log("🔧 Progressive Mode Setting Changed:", {
                oldValue: chat.progressiveMode?.enabled,
                newValue: newEnabled,
                timestamp: new Date().toISOString(),
              });

              const newSettings = {
                progressiveMode: {
                  enabled: newEnabled,
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
              };

              console.log("🔧 Updating chat settings with:", newSettings);
              updateChatSettings(newSettings);

              // Add a slight delay to verify the setting was applied
              setTimeout(() => {
                console.log("🔧 Progressive Mode Setting Verification:", {
                  appliedValue: chat.progressiveMode?.enabled,
                  expectedValue: newEnabled,
                  settingApplied: chat.progressiveMode?.enabled === newEnabled,
                });

                // Optional: Add visual feedback (you could set a state here for a checkmark)
                if (chat.progressiveMode?.enabled === newEnabled) {
                  console.log(
                    "✅ Progressive mode setting successfully applied"
                  );
                } else {
                  console.warn(
                    "⚠️ Progressive mode setting may not have been applied correctly"
                  );
                }
              }, 100);
            }}
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

export default ChatPanel;
