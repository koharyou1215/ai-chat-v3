'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
// シンプルなスピナー
const Spinner: React.FC<{ label?: string }> = ({ label }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, pointerEvents: 'none' }}>
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400" />
    {label && <span className="ml-3 text-white/80 text-xs bg-black/40 px-2 py-1 rounded">{label}</span>}
  </div>
);
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Copy, Volume2, Pause, Edit, CornerUpLeft, Trash2 } from 'lucide-react';
import { UnifiedMessage } from '@/types';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { RichMessage } from './RichMessage';
import { MessageEffects } from './MessageEffects';
import { HologramMessage, ParticleText } from './AdvancedEffects';
import { EmotionDisplay, EmotionReactions } from '@/components/emotion/EmotionDisplay';
import { EmotionResult } from '@/services/emotion/EmotionAnalyzer';
import { useEffectSettings } from '@/contexts/EffectSettingsContext';

interface MessageBubbleProps {
  message: UnifiedMessage;
  previousMessage?: UnifiedMessage;
  isLatest: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  _previousMessage,
  isLatest 
}) => {
  // ローディング・再生状態
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceSettings = useAppStore(state => state.voice);
  
  // **Zustandストアからの取得を最適化**
  const characters = useAppStore(state => state.characters);
  const getSelectedPersona = useAppStore(state => state.getSelectedPersona);
  const _deleteMessage = useAppStore(state => state.deleteMessage);
  const regenerateLastMessage = useAppStore(state => state.regenerateLastMessage);
  // Lazy imports handled within functions where they're needed
  const trackerManagers = useAppStore(state => state.trackerManagers);
  const activeSessionId = useAppStore(state => state.active_session_id);
  const activeCharacterId = useAppStore(state => state.active_character_id);
  const clearActiveConversation = useAppStore(state => state.clearActiveConversation);
  const clearLayer = useAppStore(state => state.clearLayer);
  const _addMessageToLayers = useAppStore(state => state.addMessageToLayers);

  const isUser = message.role === 'user';
  const persona = getSelectedPersona();
  const character = characters.get(message.character_id || '');

  // useMemoで計算結果をメモ化
  const { avatarUrl, displayName, initial } = useMemo(() => {
    const avatar = isUser ? persona?.avatar_url : character?.avatar_url;
    const name = isUser ? persona?.name : character?.name;
    const init = name?.[0] || (isUser ? 'U' : 'A');
    return { avatarUrl: avatar, displayName: name, initial: init };
  }, [isUser, persona, character]);
  
  // --- アクションハンドラ群 ---
  // 再生成本実装
  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await regenerateLastMessage();
    } finally {
      setIsRegenerating(false);
    }
  };
  // 続きを出力本実装
  const handleContinue = async () => {
    setIsContinuing(true);
    try {
      const session = useAppStore.getState().sessions.get(activeSessionId || '');
      if (!session) return;
      const trackerManager = trackerManagers.get(activeSessionId);
      // 最後のAIメッセージを探す
      const lastAiMsg = [...session.messages].reverse().find(m => m.role === 'assistant');
      if (!lastAiMsg) {
        alert('AIメッセージが見つかりません');
        return;
      }
      // プロンプトを再構築し、AI応答のみ生成
      const { promptBuilderService } = await import('@/services/prompt-builder.service');
      const { apiManager } = await import('@/services/api-manager');
      
      const systemPrompt = await promptBuilderService.buildPrompt(
        session,
        lastAiMsg.content,
        trackerManager
      );
      const aiResponseContent = await apiManager.generateMessage(
        systemPrompt,
        lastAiMsg.content,
        session.messages.slice(-10).map(msg => ({ role: msg.role, content: msg.content }))
      );
      // AIメッセージを追加
      const newMessage = {
        ...lastAiMsg,
        id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: aiResponseContent,
        regeneration_count: (lastAiMsg.regeneration_count || 0) + 1
      };
      useAppStore.setState(state => {
        const updatedSession = {
          ...session,
          messages: [...session.messages, newMessage],
          message_count: session.message_count + 1,
          updated_at: new Date().toISOString(),
        };
        return {
          sessions: new Map(state.sessions).set(session.id, updatedSession)
        };
      });
    } finally {
      setIsContinuing(false);
    }
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    alert('コピーしました');
  };
  const handleSpeak = async () => {
    console.log('Voice settings:', voiceSettings);
    
    if (isSpeaking) {
      // 停止
      if (audioObj) {
        audioObj.pause();
        audioObj.currentTime = 0;
        setIsSpeaking(false);
        setAudioObj(null);
      } else if (speechRef.current) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        speechRef.current = null;
      }
      return;
    }
    
    // 再生 - VoiceVoxの場合
    if (voiceSettings?.provider?.toLowerCase() === 'voicevox') {
      setIsSpeaking(true);
      try {
        const res = await fetch('/api/voice/voicevox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: message.content,
            speakerId: voiceSettings.voicevox?.speaker || 1,
            settings: {
              speed: voiceSettings.voicevox?.speed || 1.0,
              pitch: voiceSettings.voicevox?.pitch || 0.0,
              intonation: voiceSettings.voicevox?.intonation || 1.0,
              volume: voiceSettings.voicevox?.volume || 1.0
            }
          })
        });
        const data = await res.json();
        if (data.success && data.audioData) {
          const audio = new window.Audio(data.audioData);
          setAudioObj(audio);
          audio.volume = Math.min(1.0, Math.max(0.0, voiceSettings.voicevox?.volume || 1.0));
          audio.play();
          audio.onended = () => {
            setIsSpeaking(false);
            setAudioObj(null);
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            setAudioObj(null);
            console.error('音声再生エラー');
          };
        } else {
          alert('音声合成に失敗しました: ' + (data.error || 'APIエラー'));
          setIsSpeaking(false);
        }
      } catch (error) {
        console.error('VoiceVox音声合成通信エラー:', error);
        alert('音声合成通信エラー');
        setIsSpeaking(false);
      }
    } 
    // 再生 - ElevenLabsの場合
    else if (voiceSettings?.provider?.toLowerCase() === 'elevenlabs') {
      setIsSpeaking(true);
      try {
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
        const data = await res.json();
        if (data.success && data.audioData) {
          const audio = new window.Audio(data.audioData);
          setAudioObj(audio);
          audio.play();
          audio.onended = () => {
            setIsSpeaking(false);
            setAudioObj(null);
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            setAudioObj(null);
            console.error('ElevenLabs音声再生エラー');
          };
        } else {
          alert('ElevenLabs音声合成に失敗しました: ' + (data.error || 'APIエラー'));
          setIsSpeaking(false);
        }
      } catch (error) {
        console.error('ElevenLabs音声合成通信エラー:', error);
        alert('ElevenLabs音声合成通信エラー');
        setIsSpeaking(false);
      }
    } 
    // フォールバック - ブラウザ内蔵音声合成
    else if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      const utter = new window.SpeechSynthesisUtterance(message.content);
      speechRef.current = utter;
      
      // ブラウザ内蔵音声の詳細設定を適用
      if (voiceSettings?.voicevox) {
        utter.rate = voiceSettings.voicevox.speed || 1.0;
        utter.pitch = Math.max(0, Math.min(2, (voiceSettings.voicevox.pitch || 0) / 100 + 1));
        utter.volume = voiceSettings.voicevox.volume || 1.0;
      }
      
      utter.onend = () => { setIsSpeaking(false); speechRef.current = null; };
      utter.onerror = () => { setIsSpeaking(false); speechRef.current = null; };
      window.speechSynthesis.speak(utter);
    } else {
      alert('音声再生はこのブラウザでサポートされていません');
    }
  };
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  
  const handleEdit = () => {
    setIsEditing(true);
    setEditText(message.content);
  };
  
  const handleSaveEdit = () => {
    if (editText.trim() === '') return;
    
    const session = useAppStore.getState().sessions.get(activeSessionId || '');
    if (!session) return;
    
    const updatedMessages = session.messages.map(msg => 
      msg.id === message.id 
        ? { 
            ...msg, 
            content: editText.trim(),
            updated_at: new Date().toISOString(),
            edit_history: [
              ...msg.edit_history,
              {
                previous_content: message.content,
                edited_at: new Date().toISOString(),
                edit_reason: 'user_edit'
              }
            ]
          }
        : msg
    );
    
    useAppStore.setState(state => ({
      sessions: new Map(state.sessions).set(session.id, {
        ...session,
        messages: updatedMessages,
        updated_at: new Date().toISOString(),
      })
    }));
    
    setIsEditing(false);
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(message.content);
  };
  // ここまで戻る本実装
  const handleRollback = () => {
    if (!message.id) {
      alert('メッセージIDが取得できません');
      return;
    }
    // チャット履歴を該当メッセージまで残す
    const session = useAppStore.getState().sessions.get(activeSessionId || '');
    if (!session) return;
    const idx = session.messages.findIndex(m => m.id === message.id);
    if (idx === -1) {
      alert('該当メッセージが見つかりません');
      return;
    }
    const rollbackMessages = session.messages.slice(0, idx + 1);
    useAppStore.setState(state => ({
      sessions: new Map(state.sessions).set(session.id, {
        ...session,
        messages: rollbackMessages,
        message_count: rollbackMessages.length,
        updated_at: new Date().toISOString(),
      })
    }));
    // メモリレイヤーも巻き戻し
    ['immediate_memory','working_memory','episodic_memory','semantic_memory','permanent_memory'].forEach(layer => {
      useAppStore.getState().clearLayer(layer);
    });
    rollbackMessages.forEach(msg => {
      useAppStore.getState().addMessageToLayers?.(msg);
    });
    // トラッカーも巻き戻し（初期化のみ、詳細な履歴復元は今後拡張可）
    if (activeSessionId && trackerManagers.has(activeSessionId) && activeCharacterId) {
      const manager = trackerManagers.get(activeSessionId);
      if (manager) {
        manager.initializeTrackerSet(activeCharacterId, []); // 初期化
      }
    }
    alert('このメッセージまで巻き戻しました');
  };
  // オールクリア本実装
  const handleClearAll = () => {
    // チャット履歴クリア
    clearActiveConversation();
    // メモリレイヤー全クリア
    ['immediate_memory','working_memory','episodic_memory','semantic_memory','permanent_memory'].forEach(layer => {
      clearLayer(layer);
    });
    // トラッカー：現在のキャラクターのみリセット
    if (activeSessionId && trackerManagers.has(activeSessionId) && activeCharacterId) {
      const manager = trackerManagers.get(activeSessionId);
      if (manager) {
        manager.initializeTrackerSet(activeCharacterId, []); // アクティブキャラのみ初期化
      }
    }
    alert('このキャラクターのチャット・メモリ・トラッカーを全てリセットしました');
  };
  const [showActions, setShowActions] = useState(false);
  const [formattedTimestamp, setFormattedTimestamp] = useState('');
  const [effectTrigger, setEffectTrigger] = useState('');
  const [effectPosition, setEffectPosition] = useState({ x: 0, y: 0 });
  const [detectedEmotion, setDetectedEmotion] = useState<EmotionResult | null>(null);
  const { settings } = useEffectSettings();
  
  // エフェクトのトリガー設定
  useEffect(() => {
    if (settings.particleEffects && isLatest && effectTrigger !== message.content) {
      setEffectTrigger(message.content);
      // 位置は画面中央付近に設定
      setEffectPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      });
    }
  }, [message.content, isLatest, settings.particleEffects, effectTrigger]);

  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setFormattedTimestamp(
        new Date(message.created_at).toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit'
        })
      );
    }
  }, [message.created_at]);
  

  // 動的絵文字の決定
  const getDynamicEmoji = () => {
    const emotion = message.expression?.emotion;
    if (!emotion) return '🤔'; // デフォルト

    const emojiMap: { [key: string]: string[] } = {
      happy: ['😊', '😄', '😃', '🙂', '😌', '☺️'],
      love: ['😍', '🥰', '💕', '❤️', '😘', '💖'],
      sad: ['😢', '😞', '😔', '😟', '😿', '💔'],
      excited: ['🤩', '😆', '🎉', '✨', '🔥', '⚡'],
      angry: ['😠', '😡', '💢', '👿', '😤', '🔴'],
      surprised: ['😲', '😮', '😯', '🤯', '😵', '🙀'],
      thinking: ['🤔', '💭', '🧐', '💡', '🤯', '🎯'],
      confused: ['😕', '🤨', '😵‍💫', '😶', '🙄', '❓'],
      neutral: ['😐', '😑', '🙂', '😊', '🤔', '😌']
    };

    const emojis = emojiMap[emotion.primary] || emojiMap.neutral;
    const intensity = emotion.score || 0.5;
    const index = Math.floor(intensity * emojis.length);
    
    return emojis[Math.min(index, emojis.length - 1)];
  };

  // 感情に基づくアニメーション効果（安全な実装）
  const getEmotionAnimation = () => {
    const emotion = message.expression?.emotion;
    if (!emotion || !settings.emotionBasedStyling || settings.effectQuality === 'low') return {};

    // セーフモード検出
    const safeMode = typeof window !== 'undefined' && localStorage.getItem('safe-mode') === 'true';
    if (safeMode) return {};

    // 無限ループを避けて限定回数のアニメーション
    const animationMap: { [key: string]: object } = {
      happy: { 
        scale: [1, 1.01, 1], 
        transition: { duration: 2, repeat: 2, repeatType: 'reverse' as const, ease: 'easeInOut' } 
      },
      love: { 
        scale: [1, 1.015, 1], 
        transition: { duration: 3, repeat: 1, repeatType: 'reverse' as const, ease: 'easeInOut' }
      },
      excited: { 
        y: [0, -1, 0], 
        transition: { duration: 1.5, repeat: 1, repeatType: 'reverse' as const, ease: 'easeInOut' }
      },
      sad: { 
        opacity: [1, 0.9, 1], 
        transition: { duration: 2.5, repeat: 1, repeatType: 'reverse' as const, ease: 'easeInOut' } 
      }
    };

    return animationMap[emotion.primary] || {};
  };

  return (
    <>
      <motion.div
        initial={isLatest ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'flex gap-3',
          isUser ? 'justify-end' : 'justify-start'
        )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        style={{ position: 'relative' }}
      >
      {/* アバター */}
      {!isUser && character && (
        <motion.div
          initial={isLatest ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          className="flex-shrink-0"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={avatarUrl} 
                alt={displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white text-sm font-bold">
                {initial}
              </span>
            )}
          </div>
        </motion.div>
      )}

      {isUser && persona && (
         <motion.div
          initial={isLatest ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          className="flex-shrink-0"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={avatarUrl} 
                alt={displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white text-sm font-bold">
                {initial}
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* メッセージ本体 */}
      <div className={cn(
        'group relative max-w-[70%]',
        isUser && 'items-end'
      )}>
        {/* ローディング・再生アニメーション */}
        {(isRegenerating || isContinuing || isSpeaking) && (
          <Spinner label={isRegenerating ? '再生成中...' : isContinuing ? '続きを出力中...' : '音声再生中...'} />
        )}
        {/* メッセージバブル */}
        <motion.div
          layout
          className={cn(
            'relative px-4 py-3 rounded-2xl border',
            settings.bubbleBlur ? 'backdrop-blur-sm' : ''
          )}
          style={{
            background: isUser 
              ? `linear-gradient(135deg, rgba(37, 99, 235, ${settings.bubbleOpacity / 100}) 0%, rgba(6, 182, 212, ${settings.bubbleOpacity / 100}) 100%)`
              : `linear-gradient(135deg, rgba(168, 85, 247, ${settings.bubbleOpacity / 100}) 0%, rgba(236, 72, 153, ${settings.bubbleOpacity / 100}) 100%)`,
            borderColor: isUser ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)',
            boxShadow: `0 0 30px ${isUser ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)'}`
          }}
          animate={!isUser && settings.emotionBasedStyling ? getEmotionAnimation() : {}}
        >
          {/* 重要度インジケーター */}
          {message.memory.importance.score > 0.8 && (
            <motion.div
              initial={isLatest ? { scale: 0 } : false}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-500 rounded-full"
              title="重要なメッセージ"
            />
          )}

          {/* 3Dホログラムメッセージ - AIメッセージのみ */}
          {!isUser && settings.hologramMessages && isLatest ? (
            <HologramMessage text={message.content} />
          ) : (
            <>
              {/* 画像表示 */}
              {message.image_url && (
                <div className="mb-3">
                  <img
                    src={message.image_url}
                    alt="Attached image"
                    className="max-w-full max-h-64 rounded-lg object-contain"
                  />
                </div>
              )}

              {/* メッセージテキスト - 編集モードと通常表示 */}
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full bg-black/20 text-white/90 border border-white/20 rounded p-2 min-h-[100px] resize-none focus:outline-none focus:border-white/40"
                    placeholder="メッセージを編集..."
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {!isUser && (settings.colorfulBubbles || settings.fontEffects || settings.typewriterEffect) ? (
                    <RichMessage
                      content={message.content}
                      role={message.role}
                      characterColor='#8b5cf6'
                      enableEffects={isLatest}
                      typingSpeed={isLatest ? 30 : 0}
                    />
                  ) : (
                    <div className="text-white/90 whitespace-pre-wrap">
                      {message.content}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* パーティクルテキストエフェクト - AIメッセージのみ */}
          {!isUser && settings.particleText && isLatest && (
            <ParticleText 
              text={message.content} 
              trigger={effectTrigger.length > 0}
            />
          )}

          {/* 感情分析表示 - AIメッセージのみ */}
          {!isUser && settings.realtimeEmotion && (
            <div className="mt-2">
              <EmotionDisplay
                message={message.content}
                onEmotionDetected={(emotion) => {
                  setDetectedEmotion(emotion);
                  // エフェクトトリガーの更新
                  if (emotion.intensity > 0.7) {
                    setEffectTrigger(message.content);
                  }
                }}
              />
            </div>
          )}

          {/* 感情タグ（動的絵文字付き） */}
          {!settings.realtimeEmotion && message.expression?.emotion && (
            <div className="mt-2 flex gap-1">
              <motion.span 
                className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-white/70 flex items-center gap-1"
                animate={settings.emotionBasedStyling && settings.effectQuality !== 'low' ? {} : {}}
              >
                <span className="text-sm">{getDynamicEmoji()}</span>
                <span>{message.expression.emotion.primary}</span>
                {message.expression.emotion.score && (
                  <span className="text-xs opacity-60">
                    ({Math.round(message.expression.emotion.score * 100)}%)
                  </span>
                )}
              </motion.span>
            </div>
          )}
          
          {/* タイムスタンプ */}
          <div className="mt-1 text-xs text-white/40">
            {formattedTimestamp}
          </div>
        </motion.div>

        {/* アクションメニュー */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                'absolute top-0 flex gap-1 z-50',
                isUser ? 'left-0 -translate-x-full' : 'right-0 translate-x-full',
                'max-w-[90vw]'
              )}
            >
              <ActionButton icon={RefreshCw} onClick={handleRegenerate} title="再生成" />
              <ActionButton icon={CornerUpLeft} onClick={handleContinue} title="続きを出力" />
              <ActionButton icon={Copy} onClick={handleCopy} title="コピー" />
              <ActionButton icon={isSpeaking ? Pause : Volume2} onClick={handleSpeak} title={isSpeaking ? "停止" : "音声再生"} />
              <ActionButton icon={Edit} onClick={handleEdit} title="チャット編集" />
              <ActionButton icon={CornerUpLeft} onClick={handleRollback} title="ここまで戻る" />
              <ActionButton icon={Trash2} onClick={handleClearAll} title="オールクリア" />
              {/* <ActionButton icon={MoreVertical} onClick={() => {}} title="その他" /> */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

        {/* パーティクルエフェクト */}
        {settings.particleEffects && effectTrigger && (
          <MessageEffects
            trigger={effectTrigger}
            position={effectPosition}
          />
        )}

        {/* 感情リアクション - AIメッセージのみ */}
        {!isUser && detectedEmotion && settings.autoReactions && (
          <EmotionReactions
            emotion={detectedEmotion}
            onReactionTriggered={(reaction) => {
              // リアクションに応じて追加のエフェクトを実行
              if (reaction.type === 'visual') {
                setEffectTrigger(prev => prev + '🎉');
              }
            }}
          />
        )}
      </motion.div>
    </>
  );
};
const ActionButton: React.FC<{
  icon: React.ElementType;
  onClick: () => void;
  title: string;
}> = ({ icon: Icon, onClick, title }) => (
  <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
    title={title}
  >
    <Icon className="w-4 h-4 text-white/70" />
  </motion.button>
);
