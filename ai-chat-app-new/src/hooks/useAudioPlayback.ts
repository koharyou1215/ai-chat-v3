
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
        // Safe JSON parsing with error handling
        let data;
        try {
          if (!res.ok) {
            const errorText = await res.text();
            console.error('🚨 Voicevox API エラー:', errorText);
            throw new Error(`Voicevox API error (${res.status}): ${errorText}`);
          }

          const contentType = res.headers.get('content-type');
          if (!contentType?.includes('application/json')) {
            const errorText = await res.text();
            throw new Error(`API returned non-JSON response: ${errorText}`);
          }

          data = await res.json();
        } catch (parseError) {
          console.error('🚨 Voicevox API エラー詳細:', parseError);
          if (parseError instanceof SyntaxError) {
            throw new Error('Voicevox APIのレスポンス解析に失敗しました。');
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
          const errorMsg = data.error || 'APIエラー';
          console.error('🚨 Voicevox 音声合成失敗:', errorMsg);
          throw new Error(`Voicevox音声合成失敗: ${errorMsg}`);
        }
      } else if (voiceSettings?.provider?.toLowerCase() === 'elevenlabs') {
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
        // Safe JSON parsing with error handling
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
        // Safari最適化マネージャーまたはSystem TTSを使用
        console.log('🎤 System TTS 音声再生開始 (voiceSettings?.provider === "system")');

        if (!safariTTSManager) {
          safariTTSManager = new SafariTTSManager();
        }

        try {
          console.log('🎤 Safari TTS 音声再生開始:', {
            textLength: message.content.length,
            rate: voiceSettings?.system?.rate || 1.0,
            pitch: voiceSettings?.system?.pitch || 1.0,
            volume: voiceSettings?.system?.volume || 1.0,
            voiceName: voiceSettings?.system?.voice,
          });

          await safariTTSManager.speak(message.content, {
            rate: voiceSettings?.system?.rate || 1.0,
            pitch: voiceSettings?.system?.pitch || 1.0,
            volume: voiceSettings?.system?.volume || 1.0,
            voiceName: voiceSettings?.system?.voice || undefined,
            lang: 'ja-JP',
            maxChunkLength: 200 // Safari対策: 長文自動分割
          });

          console.log('✅ Safari TTS 音声再生完了');
          setIsSpeaking(false);
        } catch (error) {
          console.error('🚨 Safari TTS エラー詳細:', {
            error,
            errorMessage: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            contentLength: message.content?.length,
          });
          setIsSpeaking(false);
        }
      } else {
        alert('音声再生はこのブラウザでサポートされていません');
        setIsSpeaking(false);
      }
    } catch (error) {
        console.error('🚨 音声合成エラー詳細:', {
          error,
          provider: voiceSettings?.provider,
          contentLength: message.content?.length,
          errorMessage: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });

        // システム音声にフォールバック
        if ('speechSynthesis' in window && voiceSettings?.provider !== 'system') {
          console.log('🔄 システム音声でフォールバックします');
          try {
            if (!safariTTSManager) {
              safariTTSManager = new SafariTTSManager();
            }
            await safariTTSManager.speak(message.content, {
              rate: voiceSettings?.system?.rate || 1.0,
              pitch: voiceSettings?.system?.pitch || 1.0,
              volume: voiceSettings?.system?.volume || 1.0,
              lang: 'ja-JP',
              maxChunkLength: 200
            });
            setIsSpeaking(false);
            return; // フォールバック成功
          } catch (fallbackError) {
            console.error('システム音声フォールバックも失敗:', fallbackError);
          }
        }

        // フォールバックも失敗した場合はエラー表示
        const errorMsg = error instanceof Error ? error.message : '不明なエラー';

        // Voicevoxエラーの場合は詳細なメッセージを表示
        if (voiceSettings?.provider?.toLowerCase() === 'voicevox' && errorMsg.includes('Voicevox')) {
          alert(
            `❌ Voicevox音声合成エラー\n\n` +
            `【原因】\n` +
            `Voicevoxエンジンが起動していない可能性があります。\n\n` +
            `【対処方法】\n` +
            `1. Voicevoxエンジンを起動してください (localhost:50021)\n` +
            `2. 設定画面で「System TTS」に切り替えてください\n` +
            `3. ElevenLabsを使用してください\n\n` +
            `詳細: ${errorMsg}`
          );
        } else {
          alert(
            `音声合成通信エラー\n\n` +
            `プロバイダー: ${voiceSettings?.provider || '不明'}\n` +
            `詳細: ${errorMsg}\n\n` +
            `システム音声に切り替えてお試しください。`
          );
        }
        setIsSpeaking(false);
    }
  }, [isSpeaking, message.content, voiceSettings]);

  // 自動再生ロジック - ループ防止修正
  useEffect(() => {
    // 既存のタイマーをクリア
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }

    // デバッグ: 自動再生の条件をすべてログ出力
    const conditions = {
      isLatest,
      isAssistantMessage: message.role !== 'user',
      autoPlayEnabled: voiceSettings?.autoPlay,
      notAlreadyPlayed: !autoPlayedRef.current.has(message.id),
      messageId: message.id,
      messageRole: message.role,
      voiceProvider: voiceSettings?.provider,
    };

    console.log('🔍 自動再生条件チェック:', conditions);

    // 条件を満たし、まだ再生されていない場合のみ再生
    if (isLatest && message.role !== 'user' && voiceSettings?.autoPlay && !autoPlayedRef.current.has(message.id)) {
      console.log('✅ 自動再生条件を満たしました。再生を開始します。');

      // 再生済みとしてマークしてからタイマーを開始（ループ防止）
      autoPlayedRef.current.add(message.id);

      autoPlayTimerRef.current = setTimeout(() => {
        handleSpeak().catch((error) => {
          console.error('🚨 自動再生エラー:', error);
          // Safari のユーザーインタラクション要件エラーを検出
          if (error && error.toString().includes('user interaction')) {
            console.warn('⚠️ Safari: ユーザーインタラクションが必要です。手動で音声ボタンを押してください。');
          }
        });
        autoPlayTimerRef.current = null;
      }, 800);

      return () => {
        if (autoPlayTimerRef.current) {
          clearTimeout(autoPlayTimerRef.current);
          autoPlayTimerRef.current = null;
        }
      };
    } else {
      console.log('❌ 自動再生条件を満たしていません:', {
        reason: !isLatest
          ? '最新メッセージではない'
          : message.role === 'user'
          ? 'ユーザーメッセージ'
          : !voiceSettings?.autoPlay
          ? '自動再生が無効'
          : autoPlayedRef.current.has(message.id)
          ? '既に再生済み'
          : '不明',
      });
    }

    // isLatestでなくなった場合は再生を停止
    if (!isLatest) {
        stopGlobalPlayback();
        setIsSpeaking(false);
    }

  }, [isLatest, message.id, message.role, voiceSettings?.autoPlay, voiceSettings?.provider]);
  
  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      // タイマーとオーディオをクリーンアップ
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      stopGlobalPlayback();
    };
  }, []);

  return { isSpeaking, handleSpeak };
};
