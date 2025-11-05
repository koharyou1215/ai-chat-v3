# 🛠️ TTS機能 実装ガイド

## 📋 概要

このドキュメントは、AI Chat V3の音声読み上げ（TTS）機能を改善するための**実装手順**を提供します。

**前提**: 既に`system`プロバイダー（Web Speech API）は実装済みで、本番環境でも動作可能です。このガイドでは、**Safari対応の強化とUX向上**を目的とした改善を行います。

---

## 🎯 実装フェーズ

### Phase 1: Safari最適化（必須）
- Safari iOS/macOS向けの長文分割機能
- 音声選択UI改善
- エラーハンドリング強化

### Phase 2: UX向上（推奨）
- 視覚的フィードバック
- 再生速度コントロール
- 音声プレビュー機能

### Phase 3: 高度な機能（オプション）
- SSML対応（ブラウザ依存）
- 音声キャッシング
- キャラクター専用音声設定

---

## 🚀 Phase 1: Safari最適化（必須実装）

### 1.1 Safari専用TTSマネージャーの作成

#### ファイル作成: `src/services/tts/safari-tts-manager.ts`

```typescript
/**
 * Safari TTS Manager
 * Safari iOS/macOSでの音声読み上げを最適化
 */

export interface SafariTTSOptions {
  rate?: number;          // 速度 (0.5 - 2.0)
  pitch?: number;         // ピッチ (0.0 - 2.0)
  volume?: number;        // 音量 (0.0 - 1.0)
  lang?: string;          // 言語 ('ja-JP', 'en-US', etc.)
  voiceName?: string;     // 音声名
  maxChunkLength?: number; // 最大チャンク長（デフォルト200文字）
}

export class SafariTTSManager {
  private queue: string[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPaused: boolean = false;
  private isProcessing: boolean = false;

  /**
   * テキストを音声で読み上げ
   * 長文は自動的に分割して順次再生
   */
  async speak(text: string, options: SafariTTSOptions = {}): Promise<void> {
    // 既存の再生を停止
    this.stop();

    // 長文を自動分割
    const chunks = this.splitTextForSafari(
      text,
      options.maxChunkLength || 200
    );

    this.queue = chunks;
    await this.processQueue(options);
  }

  /**
   * キューを順次処理
   */
  private async processQueue(options: SafariTTSOptions): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const chunk = this.queue.shift()!;

      try {
        await this.speakChunk(chunk, options);
      } catch (error) {
        console.error('Safari TTS chunk error:', error);
        // エラーが発生してもキューを継続
      }
    }

    this.isProcessing = false;
  }

  /**
   * 単一チャンクを再生（Promiseベース）
   */
  private speakChunk(text: string, options: SafariTTSOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);

      // パラメーター設定
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 1.0;
      utterance.lang = options.lang ?? 'ja-JP';

      // 音声選択
      if (options.voiceName) {
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.name === options.voiceName);
        if (voice) {
          utterance.voice = voice;
        }
      }

      // イベントハンドラー
      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('Safari TTS error:', event);
        this.currentUtterance = null;
        reject(event);
      };

      // Safari対策: 再生前に短い遅延を入れる
      setTimeout(() => {
        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      }, 100);
    });
  }

  /**
   * Safari用テキスト分割アルゴリズム
   *
   * Safari/iOSでは15秒以上の長文で再生が途切れる問題があるため、
   * 適切な長さに分割する。
   *
   * 分割ルール:
   * 1. 句点（。！？）で分割を優先
   * 2. maxLengthを超えない範囲で結合
   * 3. 改行も分割ポイントとして扱う
   */
  private splitTextForSafari(text: string, maxLength: number): string[] {
    // 句点・改行で分割
    const sentences = text.match(/[^。！？\n]+[。！？\n]?/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const combinedLength = currentChunk.length + sentence.length;

      if (combinedLength > maxLength && currentChunk.length > 0) {
        // 現在のチャンクを保存して新しいチャンクを開始
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        // 現在のチャンクに追加
        currentChunk += sentence;
      }
    }

    // 最後のチャンクを追加
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * 再生停止
   */
  stop(): void {
    window.speechSynthesis.cancel();
    this.queue = [];
    this.currentUtterance = null;
    this.isProcessing = false;
    this.isPaused = false;
  }

  /**
   * 一時停止
   */
  pause(): void {
    if (!this.isPaused && this.currentUtterance) {
      window.speechSynthesis.pause();
      this.isPaused = true;
    }
  }

  /**
   * 再開
   */
  resume(): void {
    if (this.isPaused) {
      window.speechSynthesis.resume();
      this.isPaused = false;
    }
  }

  /**
   * 再生中かどうか
   */
  isSpeaking(): boolean {
    return window.speechSynthesis.speaking;
  }

  /**
   * 利用可能な音声のリストを取得
   */
  static async getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      let voices = window.speechSynthesis.getVoices();

      if (voices.length > 0) {
        resolve(voices);
      } else {
        // Safariでは非同期で音声リストが読み込まれる
        window.speechSynthesis.onvoiceschanged = () => {
          voices = window.speechSynthesis.getVoices();
          resolve(voices);
        };
      }
    });
  }

  /**
   * 日本語音声を取得
   */
  static async getJapaneseVoices(): Promise<SpeechSynthesisVoice[]> {
    const voices = await SafariTTSManager.getAvailableVoices();
    return voices.filter(v => v.lang.startsWith('ja'));
  }
}
```

---

### 1.2 `useAudioPlayback`フックの改善

#### ファイル修正: `src/hooks/useAudioPlayback.ts`

既存の実装を改善して、SafariTTSManagerを統合します。

```typescript
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store';
import { UnifiedMessage } from '@/types';
import { SafariTTSManager } from '@/services/tts/safari-tts-manager';

type UseAudioPlaybackProps = {
  message: UnifiedMessage;
  isLatest: boolean;
};

// グローバルに再生中のオーディオインスタンスを管理
let globalAudio: HTMLAudioElement | null = null;
let safariTTSManager: SafariTTSManager | null = null;

const stopGlobalPlayback = () => {
  if (globalAudio) {
    globalAudio.pause();
    globalAudio.src = ''; // メモリ解放
    globalAudio = null;
  }

  if (safariTTSManager) {
    safariTTSManager.stop();
  } else {
    window.speechSynthesis.cancel();
  }
};

export const useAudioPlayback = ({ message, isLatest }: UseAudioPlaybackProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceSettings = useAppStore(state => state.voice);
  const autoPlayedRef = useRef<Set<string>>(new Set());
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSpeak = useCallback(async () => {
    // コンテンツが空の場合は処理を中断
    if (!message.content || message.content.trim() === '') {
      return;
    }

    // 他のインスタンスが再生中なら停止
    if (isSpeaking) {
      stopGlobalPlayback();
      setIsSpeaking(false);
      return;
    }

    // グローバルな再生を停止してから新しい再生を開始
    stopGlobalPlayback();
    setIsSpeaking(true);

    try {
      if (voiceSettings?.provider?.toLowerCase() === 'voicevox') {
        // VoiceVox処理（既存のまま）
        const res = await fetch('/api/voice/voicevox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: message.content,
            speaker: voiceSettings.voicevox?.speaker || 1,
            settings: {
              speed: voiceSettings.voicevox?.speed || 1.0,
              pitch: voiceSettings.voicevox?.pitch || 0.0,
              intonation: voiceSettings.voicevox?.intonation || 1.0,
              volume: voiceSettings.voicevox?.volume || 1.0
            }
          })
        });

        // JSON解析とエラーハンドリング（既存のまま）
        let data;
        try {
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`API error (${res.status}): ${errorText}`);
          }

          const contentType = res.headers.get('content-type');
          if (!contentType?.includes('application/json')) {
            const errorText = await res.text();
            throw new Error(`API returned non-JSON response: ${errorText}`);
          }

          data = await res.json();
        } catch (parseError) {
          console.error('Audio API JSON parse error:', parseError);
          if (parseError instanceof SyntaxError) {
            throw new Error('Failed to parse API response.');
          }
          throw parseError;
        }

        if (data && data.success && data.audioData) {
          const audio = new Audio(data.audioData);
          globalAudio = audio;
          audio.volume = Math.min(1.0, Math.max(0.0, voiceSettings.voicevox?.volume || 1.0));
          audio.play().catch(e => {
            console.error("Audio play failed:", e);
            setIsSpeaking(false);
          });
          audio.onended = () => {
            setIsSpeaking(false);
            globalAudio = null;
          };
          audio.onerror = () => {
            console.error('音声再生エラー');
            setIsSpeaking(false);
            globalAudio = null;
          };
        } else {
          alert('音声合成に失敗しました: ' + (data.error || 'APIエラー'));
          setIsSpeaking(false);
        }
      } else if (voiceSettings?.provider?.toLowerCase() === 'elevenlabs') {
        // ElevenLabs処理（既存のまま）
        const res = await fetch('/api/voice/elevenlabs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: message.content,
                voice_id: voiceSettings.elevenlabs?.voiceId || 'default',
                stability: voiceSettings.elevenlabs?.stability || 0.5,
                similarity_boost: voiceSettings.elevenlabs?.similarity || 0.75
            })
        });

        let data;
        try {
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`API error (${res.status}): ${errorText}`);
          }

          const contentType = res.headers.get('content-type');
          if (!contentType?.includes('application/json')) {
            const errorText = await res.text();
            throw new Error(`API returned non-JSON response: ${errorText}`);
          }

          data = await res.json();
        } catch (parseError) {
          console.error('Audio API JSON parse error:', parseError);
          if (parseError instanceof SyntaxError) {
            throw new Error('Failed to parse API response.');
          }
          throw parseError;
        }

        if (data && data.success && data.audioData) {
            const audio = new Audio(data.audioData);
            globalAudio = audio;
            audio.play().catch(e => {
                console.error("Audio play failed:", e);
                setIsSpeaking(false);
            });
            audio.onended = () => {
                setIsSpeaking(false);
                globalAudio = null;
            };
            audio.onerror = () => {
                console.error('ElevenLabs音声再生エラー');
                setIsSpeaking(false);
                globalAudio = null;
            };
        } else {
            alert('ElevenLabs音声合成に失敗しました: ' + (data.error || 'APIエラー'));
            setIsSpeaking(false);
        }
      } else if ('speechSynthesis' in window) {
        // 🆕 Safari最適化マネージャーを使用
        if (!safariTTSManager) {
          safariTTSManager = new SafariTTSManager();
        }

        try {
          await safariTTSManager.speak(message.content, {
            rate: voiceSettings?.system?.rate || 1.0,
            pitch: voiceSettings?.system?.pitch || 1.0,
            volume: voiceSettings?.system?.volume || 1.0,
            voiceName: voiceSettings?.system?.voice || undefined,
            lang: 'ja-JP',
            maxChunkLength: 200 // Safari対策
          });

          setIsSpeaking(false);
        } catch (error) {
          console.error('Safari TTS error:', error);
          setIsSpeaking(false);
        }
      } else {
        alert('音声再生はこのブラウザでサポートされていません');
        setIsSpeaking(false);
      }
    } catch (error) {
        console.error('音声合成通信エラー:', error);
        alert('音声合成通信エラー');
        setIsSpeaking(false);
    }
  }, [isSpeaking, message.content, voiceSettings]);

  // 自動再生ロジック（既存のまま）
  useEffect(() => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }

    if (isLatest && message.role !== 'user' && voiceSettings?.autoPlay && !autoPlayedRef.current.has(message.id)) {
      autoPlayTimerRef.current = setTimeout(() => {
        autoPlayedRef.current.add(message.id);
        handleSpeak();
        autoPlayTimerRef.current = null;
      }, 800);

      return () => {
        if (autoPlayTimerRef.current) {
          clearTimeout(autoPlayTimerRef.current);
          autoPlayTimerRef.current = null;
        }
      };
    }

    if (!isLatest) {
        stopGlobalPlayback();
        setIsSpeaking(false);
    }

  }, [isLatest, message.id, message.role, voiceSettings?.autoPlay, handleSpeak]);

  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      stopGlobalPlayback();
    };
  }, []);

  return { isSpeaking, handleSpeak };
};
```

---

### 1.3 音声選択UIの改善

#### ファイル作成: `src/components/settings/SystemVoiceSelector.tsx`

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { SafariTTSManager } from '@/services/tts/safari-tts-manager';

/**
 * システム音声選択コンポーネント
 * ブラウザにインストールされている音声を選択できる
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
```

---

### 1.4 VoicePanelの改善

#### ファイル修正: `src/components/settings/SettingsModal/panels/VoicePanel.tsx`

SystemVoiceSelectorコンポーネントを統合します。

```typescript
// 既存のインポートに追加
import { SystemVoiceSelector } from '@/components/settings/SystemVoiceSelector';

// ... 既存のコード ...

// システム音声設定のセクション（242-263行目付近）を以下に置き換え
<TabsContent value="system">
  <div className="space-y-4">
    {/* 🆕 音声選択UIを改善 */}
    <SystemVoiceSelector />

    <SettingRow label={`速度: ${voice.system.rate.toFixed(1)}`}>
      <Slider
        value={voice.system.rate}
        onChange={v => updateVoiceSettings({
          system: { ...voice.system, rate: v }
        })}
        min={0.5}
        max={2.0}
        step={0.1}
      />
    </SettingRow>

    <SettingRow label={`ピッチ: ${voice.system.pitch.toFixed(1)}`}>
      <Slider
        value={voice.system.pitch}
        onChange={v => updateVoiceSettings({
          system: { ...voice.system, pitch: v }
        })}
        min={0}
        max={2}
        step={0.1}
      />
    </SettingRow>

    <SettingRow label={`音量: ${voice.system.volume.toFixed(1)}`}>
      <Slider
        value={voice.system.volume}
        onChange={v => updateVoiceSettings({
          system: { ...voice.system, volume: v }
        })}
        min={0}
        max={1}
        step={0.1}
      />
    </SettingRow>
  </div>
</TabsContent>
```

---

## 🎨 Phase 2: UX向上（推奨実装）

### 2.1 視覚的フィードバックの追加

#### ファイル作成: `src/components/chat/TTSIndicator.tsx`

```typescript
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';

interface TTSIndicatorProps {
  isSpeaking: boolean;
}

/**
 * TTS再生中の視覚的フィードバック
 */
export const TTSIndicator: React.FC<TTSIndicatorProps> = ({ isSpeaking }) => {
  return (
    <AnimatePresence>
      {isSpeaking && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 border border-purple-500/30 rounded-full backdrop-blur-sm"
        >
          <Volume2 className="w-4 h-4 text-purple-400" />

          {/* アニメーション波形 */}
          <div className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-0.5 bg-purple-400 rounded-full"
                animate={{
                  height: [8, 16, 8],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.8,
                  delay: i * 0.15,
                  ease: 'easeInOut'
                }}
              />
            ))}
          </div>

          <span className="text-xs font-medium text-purple-300">
            読み上げ中
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

#### MessageBubbleへの統合

`src/components/chat/MessageBubble.tsx`または`src/components/optimized/OptimizedMessageBubble.tsx`にインジケーターを追加：

```typescript
import { TTSIndicator } from './TTSIndicator';

// ... 既存のコード ...

// メッセージバブルの下部に追加
<div className="flex items-center gap-2 mt-2">
  <TTSIndicator isSpeaking={isSpeaking} />

  {/* 既存のスピーカーボタンなど */}
</div>
```

---

### 2.2 再生速度コントロールUI

#### ファイル作成: `src/components/settings/TTSSpeedControl.tsx`

```typescript
'use client';

import React from 'react';
import { useAppStore } from '@/store';

/**
 * TTS再生速度コントロール
 * モバイルフレンドリーなボタン形式
 */
export const TTSSpeedControl: React.FC = () => {
  const { voice, updateVoiceSettings } = useAppStore();

  const speeds = [
    { label: '0.5x', value: 0.5, description: 'ゆっくり' },
    { label: '0.75x', value: 0.75, description: '少し遅い' },
    { label: '1.0x', value: 1.0, description: '標準' },
    { label: '1.25x', value: 1.25, description: '少し速い' },
    { label: '1.5x', value: 1.5, description: '速い' },
    { label: '2.0x', value: 2.0, description: '高速' }
  ];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        再生速度
      </label>

      <div className="grid grid-cols-3 gap-2">
        {speeds.map(({ label, value, description }) => (
          <button
            key={value}
            onClick={() => updateVoiceSettings({
              system: { ...voice.system, rate: value }
            })}
            className={`
              px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${voice.system.rate === value
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }
            `}
          >
            <div className="text-center">
              <div className="font-bold">{label}</div>
              <div className="text-xs opacity-70 mt-0.5">{description}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-400 mt-2">
        現在の速度: <span className="font-medium text-purple-400">{voice.system.rate}x</span>
      </div>
    </div>
  );
};
```

#### VoicePanelへの追加

`src/components/settings/SettingsModal/panels/VoicePanel.tsx`のシステム音声タブに追加：

```typescript
import { TTSSpeedControl } from '@/components/settings/TTSSpeedControl';

// ... 既存のコード ...

<TabsContent value="system">
  <div className="space-y-4">
    <SystemVoiceSelector />

    {/* 🆕 再生速度コントロール */}
    <TTSSpeedControl />

    <SettingRow label={`ピッチ: ${voice.system.pitch.toFixed(1)}`}>
      {/* ... 既存のコード ... */}
    </SettingRow>

    <SettingRow label={`音量: ${voice.system.volume.toFixed(1)}`}>
      {/* ... 既存のコード ... */}
    </SettingRow>
  </div>
</TabsContent>
```

---

### 2.3 音声プレビュー機能

#### ファイル作成: `src/components/settings/VoicePreview.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { Play, Square } from 'lucide-react';
import { useAppStore } from '@/store';
import { SafariTTSManager } from '@/services/tts/safari-tts-manager';

/**
 * 音声プレビューコンポーネント
 * 設定変更時にリアルタイムで音声をテスト
 */
export const VoicePreview: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const { voice } = useAppStore();

  const previewTexts = [
    'こんにちは。私はAIアシスタントです。',
    'この設定で音声が読み上げられます。いかがでしょうか？',
    '設定を変更して、お好みの音声を見つけてください。'
  ];

  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  const handlePreview = async () => {
    if (isPlaying) {
      // 停止
      if (voice.provider === 'system') {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);

    try {
      if (voice.provider === 'system') {
        const manager = new SafariTTSManager();

        await manager.speak(previewTexts[currentTextIndex], {
          rate: voice.system.rate,
          pitch: voice.system.pitch,
          volume: voice.system.volume,
          voiceName: voice.system.voice || undefined,
          lang: 'ja-JP'
        });

        setIsPlaying(false);

        // 次のテキストに進む
        setCurrentTextIndex((prev) => (prev + 1) % previewTexts.length);
      } else {
        // VoiceVox/ElevenLabsの場合は既存のテスト処理
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Preview error:', error);
      setIsPlaying(false);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-slate-800/50 border border-white/5 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">
          音声プレビュー
        </span>

        <button
          onClick={handlePreview}
          disabled={isPlaying}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
            ${isPlaying
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isPlaying ? (
            <>
              <Square className="w-4 h-4" />
              停止
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              再生
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-gray-400">
        {previewTexts[currentTextIndex]}
      </p>
    </div>
  );
};
```

---

## 🧪 テストと検証

### テスト項目チェックリスト

#### ✅ 機能テスト

- [ ] **短文の読み上げ**: 50文字以下の短いテキスト
- [ ] **長文の読み上げ**: 500文字以上の長いテキスト（自動分割）
- [ ] **音声選択**: 異なる音声での読み上げ
- [ ] **速度調整**: 0.5x〜2.0xの速度変更
- [ ] **ピッチ調整**: ピッチの変更
- [ ] **音量調整**: 音量の変更
- [ ] **自動再生**: AIメッセージの自動読み上げ
- [ ] **再生停止**: 再生中の停止機能
- [ ] **一時停止/再開**: 一時停止と再開（ブラウザ依存）

#### ✅ Safari互換性テスト

- [ ] **Safari iOS (iPhone 15 Pro Max)**: 実機テスト
- [ ] **Safari macOS**: デスクトップテスト
- [ ] **長文分割**: 15秒以上の長文で途切れないか確認
- [ ] **音声リスト取得**: 日本語音声が正しく取得できるか
- [ ] **自動再生制約**: ユーザーインタラクション必須の確認

#### ✅ 本番環境テスト

- [ ] **Vercel Preview環境**: プレビューデプロイでの動作確認
- [ ] **Vercel Production環境**: 本番デプロイでの動作確認
- [ ] **エラーハンドリング**: APIエラー時のフォールバック
- [ ] **メモリリーク**: 長時間使用時のメモリ使用量

---

## 🚀 デプロイ手順

### 1. ローカル開発環境でのテスト

```bash
# 開発サーバー起動
npm run dev

# ブラウザで動作確認
# - http://localhost:3000
# - Safari, Chrome, Edgeで確認
```

### 2. 型チェックとビルド

```bash
# TypeScript型チェック
npx tsc --noEmit

# 本番ビルド
npm run build
```

### 3. Vercelプレビューデプロイ

```bash
# Preview環境にデプロイ
vercel

# デプロイされたURLでテスト
# Safari iOS実機でアクセスして動作確認
```

### 4. 本番デプロイ

```bash
# 本番環境にデプロイ
vercel --prod
```

---

## 📝 トラブルシューティング

### 問題: 音声が途中で止まる（Safari）

**原因**: 長文（15秒以上）の読み上げでSafariが自動停止

**解決策**:
- `SafariTTSManager`の`maxChunkLength`を調整（デフォルト200文字）
- より細かく分割する場合は100-150文字に設定

```typescript
await manager.speak(text, { maxChunkLength: 150 });
```

---

### 問題: 音声リストが空（Safari）

**原因**: Safariでは音声リストが非同期で読み込まれる

**解決策**:
- `SafariTTSManager.getAvailableVoices()`を使用（Promise対応済み）
- `voiceschanged`イベントで音声リストを再取得

---

### 問題: 自動再生が動作しない（Safari iOS）

**原因**: iOSではユーザーインタラクションなしでの音声再生が制限される

**解決策**:
- 自動再生はボタンクリック後に有効化
- 初回のユーザーアクション後は自動再生が可能になる

```typescript
// 初回クリックでSpeech APIを初期化
const handleFirstInteraction = () => {
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
  window.speechSynthesis.cancel();
};
```

---

### 問題: 本番環境で音声が再生されない

**原因**: ブラウザのセキュリティポリシーやHTTPS必須

**解決策**:
- Vercelは自動的にHTTPSを提供するため問題なし
- ブラウザのコンソールでエラーを確認
- `speechSynthesis in window`でサポート確認

---

## 📚 追加リソース

### 公式ドキュメント

- [MDN: Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [MDN: SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
- [Safari Web Speech API](https://webkit.org/blog/7956/html5-speech-recognition/)

### 参考実装

- [Google TTS Demo](https://codepen.io/matt-west/pen/wGzuJ)
- [Safari Speech Synthesis Examples](https://developer.apple.com/documentation/webkit)

---

## ✅ 実装完了チェックリスト

### Phase 1: Safari最適化（必須）

- [ ] `SafariTTSManager`クラスの作成
- [ ] `useAudioPlayback`フックの改善
- [ ] `SystemVoiceSelector`コンポーネントの作成
- [ ] `VoicePanel`への統合
- [ ] Safari実機テスト

### Phase 2: UX向上（推奨）

- [ ] `TTSIndicator`コンポーネントの作成
- [ ] `TTSSpeedControl`コンポーネントの作成
- [ ] `VoicePreview`コンポーネントの作成
- [ ] MessageBubbleへの統合

### Phase 3: デプロイ

- [ ] ローカル開発環境テスト
- [ ] 型チェック・ビルド成功
- [ ] Vercel Previewデプロイ
- [ ] Safari iOS実機テスト
- [ ] 本番デプロイ

---

**本ガイドに従って実装することで、Safari対応が強化された高品質なTTS機能を本番環境で提供できます。**
