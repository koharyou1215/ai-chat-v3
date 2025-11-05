"use client";

import React, { useState, useEffect } from "react";
import { TestTube2 } from "lucide-react";
import { useAppStore } from "@/store";
import { SystemVoiceSelector } from "@/components/settings/SystemVoiceSelector";

/**
 * 音声設定パネル
 * VoiceVox、ElevenLabs、システム音声の設定を管理
 */
export const VoicePanel: React.FC = () => {
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
  useEffect(() => {
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
            speaker: voice.voicevox.speaker,
            settings: {
              speed: voice.voicevox.speed,
              pitch: voice.voicevox.pitch,
              intonation: voice.voicevox.intonation,
              volume: voice.voicevox.volume,
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

      {/* システム音声設定 */}
      {voice.provider === "system" && (
        <div className="space-y-4 border-t border-gray-600 pt-4">
          <h4 className="text-lg font-medium text-white">システム音声設定</h4>

          {/* 音声選択UI */}
          <SystemVoiceSelector />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                話速: {voice.system.rate.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={voice.system.rate}
                onChange={(e) =>
                  updateVoiceSettings({
                    system: {
                      ...voice.system,
                      rate: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                音程: {voice.system.pitch.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.1"
                value={voice.system.pitch}
                onChange={(e) =>
                  updateVoiceSettings({
                    system: {
                      ...voice.system,
                      pitch: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                音量: {voice.system.volume.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.1"
                value={voice.system.volume}
                onChange={(e) =>
                  updateVoiceSettings({
                    system: {
                      ...voice.system,
                      volume: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-900/30 border border-blue-600/50 rounded-lg">
            <p className="text-sm text-blue-200">
              💡 システム音声は本番環境でも無料で利用できます
            </p>
            <p className="text-xs text-blue-300 mt-1">
              Safari iOS/macOSで最適化された長文分割機能が有効です
            </p>
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
