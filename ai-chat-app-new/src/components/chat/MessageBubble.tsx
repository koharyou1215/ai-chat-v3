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
    // 再生
    if (voiceSettings?.provider?.toLowerCase() === 'voicevox') {
      setIsSpeaking(true);
      try {
        const res = await fetch('/api/voice/voicevox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: message.content,
            speakerId: voiceSettings.voicevox?.speakerId || 1,
            settings: voiceSettings.voicevox || {}
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
          };
        } else {
          alert('音声合成に失敗しました: ' + (data.error || 'APIエラー'));
          setIsSpeaking(false);
        }
      } catch (_e) {
        alert('音声合成通信エラー');
        setIsSpeaking(false);
      }
    } else if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      const utter = new window.SpeechSynthesisUtterance(message.content);
      speechRef.current = utter;
      utter.onend = () => { setIsSpeaking(false); speechRef.current = null; };
      utter.onerror = () => { setIsSpeaking(false); speechRef.current = null; };
      window.speechSynthesis.speak(utter);
    } else {
      alert('音声再生はこのブラウザでサポートされていません');
    }
  };
  const handleEdit = () => {
    alert('チャット編集: 編集UIを実装');
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
  
  // 感情に基づく色の決定
  const getEmotionGradient = () => {
    const emotion = message.expression?.emotion;
    if (!emotion) return 'from-purple-600/20 to-blue-600/20';
    
    const emotionGradients: { [key: string]: string } = {
      happy: 'from-yellow-500/20 to-orange-500/20',
      love: 'from-pink-500/20 to-red-500/20',
      sad: 'from-blue-600/20 to-indigo-600/20',
      excited: 'from-purple-500/20 to-pink-500/20',
      neutral: 'from-gray-600/20 to-slate-600/20'
    };
    
    return emotionGradients[emotion.primary] || emotionGradients.neutral;
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
            'relative px-4 py-3 rounded-2xl',
            'backdrop-blur-sm border',
            isUser ? [
              'bg-gradient-to-br from-blue-600/20 to-cyan-600/20',
              'border-blue-400/30'
            ] : [
              `bg-gradient-to-br ${getEmotionGradient()}`,
              'border-purple-400/30'
            ]
          )}
          style={{
            boxShadow: `0 0 30px ${isUser ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)'}`
          }}
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
              {/* メッセージテキスト - ユーザーメッセージはシンプル表示、AIメッセージのみエフェクト適用 */}
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

          {/* 感情タグ（従来の表示） */}
          {!settings.realtimeEmotion && message.expression?.emotion && (
            <div className="mt-2 flex gap-1">
              <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-white/70">
                {message.expression.emotion.emoji} {message.expression.emotion.primary}
              </span>
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
