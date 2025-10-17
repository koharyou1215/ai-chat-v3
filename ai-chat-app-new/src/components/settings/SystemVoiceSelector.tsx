'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { SafariTTSManager } from '@/services/tts/safari-tts-manager';

/**
 * システム音声選択コンポーネント
 * ブラウザにインストールされている音声を選択できる
 *
 * Features:
 * - 利用可能な音声の自動検出
 * - 日本語音声の優先表示
 * - ローカル/クラウド音声の区別表示
 */
export const SystemVoiceSelector: React.FC = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { voice, updateVoiceSettings } = useAppStore();

  useEffect(() => {
    const loadVoices = async () => {
      setIsLoading(true);

      try {
        const availableVoices = await SafariTTSManager.getAvailableVoices();

        // 日本語音声を優先してソート
        const sortedVoices = availableVoices.sort((a, b) => {
          const aIsJa = a.lang.startsWith('ja');
          const bIsJa = b.lang.startsWith('ja');

          // 日本語音声を先頭に
          if (aIsJa && !bIsJa) return -1;
          if (!aIsJa && bIsJa) return 1;

          // 同じ言語内では名前順
          return a.name.localeCompare(b.name);
        });

        setVoices(sortedVoices);
      } catch (error) {
        console.error('Failed to load voices:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVoices();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-white/50">
        音声を読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        システム音声
        <span className="ml-2 text-xs text-gray-500">
          ({voices.length}個の音声が利用可能)
        </span>
      </label>

      <select
        value={voice.system.voice || ''}
        onChange={(e) => updateVoiceSettings({
          system: { ...voice.system, voice: e.target.value }
        })}
        className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
      >
        <option value="">デフォルト音声</option>

        {voices.map((v) => (
          <option key={v.name} value={v.name}>
            {v.name}
            {' '}
            ({v.lang})
            {' '}
            {v.localService ? '📱 ローカル' : '☁️ クラウド'}
          </option>
        ))}
      </select>

      {voice.system.voice && (
        <p className="text-xs text-gray-400">
          選択中: {voices.find(v => v.name === voice.system.voice)?.name || 'デフォルト'}
        </p>
      )}
    </div>
  );
};
