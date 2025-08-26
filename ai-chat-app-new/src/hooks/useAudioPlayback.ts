
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store';
import { UnifiedMessage } from '@/types';

type UseAudioPlaybackProps = {
  message: UnifiedMessage;
  isLatest: boolean;
};

// グローバルに再生中のオーディオインスタンスを管理
let globalAudio: HTMLAudioElement | null = null;
let globalSpeechUtterance: SpeechSynthesisUtterance | null = null;

const stopGlobalPlayback = () => {
  if (globalAudio) {
    globalAudio.pause();
    globalAudio.src = ''; // メモリ解放
    globalAudio = null;
  }
  if (globalSpeechUtterance) {
    window.speechSynthesis.cancel();
    globalSpeechUtterance = null;
  }
};

export const useAudioPlayback = ({ message, isLatest }: UseAudioPlaybackProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceSettings = useAppStore(state => state.voice);
  const autoPlayedRef = useRef<Set<string>>(new Set());

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
        const utter = new SpeechSynthesisUtterance(message.content);
        globalSpeechUtterance = utter;
        if (voiceSettings?.voicevox) {
            utter.rate = voiceSettings.voicevox.speed || 1.0;
            utter.pitch = Math.max(0, Math.min(2, (voiceSettings.voicevox.pitch || 0) / 100 + 1));
            utter.volume = voiceSettings.voicevox.volume || 1.0;
        }
        utter.onend = () => {
          setIsSpeaking(false);
          globalSpeechUtterance = null;
        };
        utter.onerror = () => {
          console.error('Speech synthesis error');
          setIsSpeaking(false);
          globalSpeechUtterance = null;
        };
        window.speechSynthesis.speak(utter);
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

  // 自動再生ロジック
  useEffect(() => {
    // 条件を満たし、まだ再生されていない場合のみ再生
    if (isLatest && message.role !== 'user' && voiceSettings?.autoPlay && !autoPlayedRef.current.has(message.id)) {
      const timer = setTimeout(() => {
        autoPlayedRef.current.add(message.id);
        handleSpeak();
      }, 800);

      return () => clearTimeout(timer);
    }
    
    // isLatestでなくなった場合は再生を停止
    if (!isLatest) {
        stopGlobalPlayback();
        setIsSpeaking(false);
    }

  }, [isLatest, message.id, message.role, voiceSettings?.autoPlay, handleSpeak]);
  
  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      stopGlobalPlayback();
    };
  }, []);

  return { isSpeaking, handleSpeak };
};
