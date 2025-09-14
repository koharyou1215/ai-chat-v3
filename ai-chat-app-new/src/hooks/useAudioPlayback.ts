/**
 * Audio Playback Hook
 * MediaOrchestratorを使用した音声再生フック
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store';
import { UnifiedMessage } from '@/types';
import { Character } from '@/types/core/character.types';
import { MediaOrchestrator } from '@/services/media';

type UseAudioPlaybackProps = {
  message: UnifiedMessage;
  isLatest: boolean;
};

export const useAudioPlayback = ({ message, isLatest }: UseAudioPlaybackProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceSettings = useAppStore(state => state.voice);
  const currentCharacter = useAppStore(state => state.currentCharacter as Character | null);
  const autoPlayedRef = useRef<Set<string>>(new Set());
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const orchestratorRef = useRef<MediaOrchestrator | null>(null);

  // MediaOrchestratorのインスタンスを取得
  useEffect(() => {
    orchestratorRef.current = MediaOrchestrator.getInstance();
    orchestratorRef.current.initialize().catch(console.error);
  }, []);

  const handleSpeak = useCallback(async () => {
    // コンテンツが空の場合は処理を中断
    if (!message.content || message.content.trim() === '') {
      return;
    }

    if (!orchestratorRef.current) {
      console.error('MediaOrchestrator not initialized');
      return;
    }

    // 他のインスタンスが再生中なら停止
    if (isSpeaking) {
      orchestratorRef.current.stopAudio();
      setIsSpeaking(false);
      return;
    }

    // グローバルな再生を停止してから新しい再生を開始
    orchestratorRef.current.stopAudio();
    setIsSpeaking(true);

    try {
      // MediaOrchestratorを使用して音声再生
      const voiceType = voiceSettings?.provider?.toLowerCase() === 'voicevox'
        ? 'voicevox' as const
        : 'browser' as const;

      const options = {
        voiceType,
        speakerId: voiceSettings?.voicevox?.speaker || 1,
        speed: voiceSettings?.voicevox?.speed || 1.0,
        pitch: voiceSettings?.voicevox?.pitch || 1.0,
        volume: voiceSettings?.voicevox?.volume || 1.0,
        lang: 'ja-JP',
      };

      await orchestratorRef.current.playAudio(
        message.content,
        currentCharacter || undefined,
        options
      );

      setIsSpeaking(false);
    } catch (error) {
      console.error('音声再生エラー:', error);
      setIsSpeaking(false);

      // エラーメッセージの表示
      if (error instanceof Error) {
        if (error.message.includes('VOICEVOX')) {
          console.warn('VOICEVOXが利用できません。ブラウザのTTSにフォールバックしました。');
        }
      }
    }
  }, [isSpeaking, message.content, voiceSettings, currentCharacter]);

  // 自動再生ロジック
  useEffect(() => {
    // 既存のタイマーをクリア
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }

    // 条件を満たし、まだ再生されていない場合のみ再生
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

    // isLatestでなくなった場合は再生を停止
    if (!isLatest && orchestratorRef.current) {
      orchestratorRef.current.stopAudio();
      setIsSpeaking(false);
    }

  }, [isLatest, message.id, message.role, voiceSettings?.autoPlay, handleSpeak]);

  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      // タイマーとオーディオをクリーンアップ
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      if (orchestratorRef.current) {
        orchestratorRef.current.stopAudio();
      }
    };
  }, []);

  return { isSpeaking, handleSpeak };
};