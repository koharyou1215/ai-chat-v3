'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
// シンプルなスピナー
const Spinner: React.FC<{ label?: string }> = ({ label }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, pointerEvents: 'none' }}>
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400" />
    {label && <span className="ml-3 text-white/80 text-xs bg-black/40 px-2 py-1 rounded">{label}</span>}
  </div>
);
import { motion, AnimatePresence, TargetAndTransition } from 'framer-motion';
import { RefreshCw, Copy, Volume2, Pause, Edit, CornerUpLeft, X, MoreVertical, MoreHorizontal } from 'lucide-react';
import { UnifiedMessage } from '@/types';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { replaceVariablesInMessage, getVariableContext } from '@/utils/variable-replacer';
import { RichMessage } from './RichMessage';
import { MessageEffects } from './MessageEffects';
import { HologramMessage, ParticleText } from './AdvancedEffects';
import { EmotionDisplay, EmotionReactions } from '@/components/emotion/EmotionDisplay';
import { EmotionResult } from '@/services/emotion/EmotionAnalyzer';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';

interface MessageBubbleProps {
  message: UnifiedMessage;
  previousMessage?: UnifiedMessage;
  isLatest: boolean;
  isGroupChat?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ 
  message, 
  previousMessage: _previousMessage,
  isLatest,
  isGroupChat = false
}) => {
  // ローディング・再生状態
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const { isSpeaking, handleSpeak } = useAudioPlayback({ message, isLatest });
  
  // **Zustandストアからの取得を最適化**
  const characters = useAppStore(state => state.characters);
  const getSelectedPersona = useAppStore(state => state.getSelectedPersona);
  const _deleteMessage = useAppStore(state => state.deleteMessage);
  const regenerateLastMessage = useAppStore(state => state.regenerateLastMessage);
  const is_generating = useAppStore(state => state.is_generating); // ソロチャット生成状態
  const group_generating = useAppStore(state => state.group_generating); // グループチャット生成状態
  // Lazy imports handled within functions where they're needed
  const trackerManagers = useAppStore(state => state.trackerManagers);
  const activeSessionId = useAppStore(state => state.active_session_id);
  const rollbackSession = useAppStore(state => state.rollbackSession); // 新しいアクションを取得
  const rollbackGroupSession = useAppStore(state => state.rollbackGroupSession); // グループ用アクションを取得
  const activeCharacterId = useAppStore(state => state.active_character_id);
  const _clearActiveConversation = useAppStore(state => state.clearActiveConversation);
  const _clearLayer = useAppStore(state => state.clearLayer);
  const _addMessageToLayers = useAppStore(state => state.addMessageToLayers);

  const isUser = message.role === 'user';
  const persona = getSelectedPersona();
  const character = characters.get(message.character_id || '');
  
  // 変数置換コンテキストを取得
  const variableContext = getVariableContext(useAppStore.getState);
  
  // メッセージ内容の変数置換
  const processedContent = replaceVariablesInMessage(message.content, variableContext);

  // 🎭 グループチャット対応の改善されたキャラクター情報取得
  const { avatarUrl, displayName, initial, characterColor } = useMemo(() => {
    if (isUser) {
      return {
        avatarUrl: persona?.avatar_url,
        displayName: persona?.name,
        initial: persona?.name?.[0] || 'U',
        characterColor: '#3b82f6' // ユーザー用青色
      };
    }
    
    // グループチャット：メッセージに埋め込まれたキャラクター情報を優先使用
    if (isGroupChat && (message.character_name || message.character_avatar)) {
      const name = message.character_name || character?.name || 'AI';
      const avatar = message.character_avatar || character?.avatar_url;
      const colorHash = message.character_id ? message.character_id.slice(-6) : 'purple';
      const color = `#${colorHash.padEnd(6, '0').slice(0, 6)}`;
      
      return {
        avatarUrl: avatar,
        displayName: name,
        initial: name[0]?.toUpperCase() || 'A',
        characterColor: color
      };
    }
    
    // フォールバック：通常のキャラクター取得
    const name = character?.name || 'AI';
    return {
      avatarUrl: character?.avatar_url,
      displayName: name,
      initial: name[0]?.toUpperCase() || 'A',
      characterColor: '#8b5cf6' // デフォルト紫色
    };
  }, [isUser, persona, character, isGroupChat, message.character_name, message.character_avatar, message.character_id]);
  
  // --- アクションハンドラ群 ---
  // 再生成本実装（ソロ・グループ分離）
  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const state = useAppStore.getState();
      if (state.is_group_mode && state.active_group_session_id) {
        // グループチャット用再生成
        await state.regenerateLastGroupMessage();
      } else {
        // ソロチャット用再生成
        await regenerateLastMessage();
      }
    } finally {
      setIsRegenerating(false);
    }
  };
  // 続きを出力本実装（ソロ・グループ分離）
  const handleContinue = async () => {
    setIsContinuing(true);
    try {
      const state = useAppStore.getState();
      if (state.is_group_mode && state.active_group_session_id) {
        // グループチャット用続きを生成
        await state.continueLastGroupMessage();
      } else {
        // ソロチャット用続きを生成（既存の複雑な実装を維持）
        const session = state.sessions.get(activeSessionId || '');
        if (!session) return;
        const trackerManager = trackerManagers.get(activeSessionId || '');
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
          session.messages.slice(-10).filter(msg => msg.role === 'user' || msg.role === 'assistant').map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content }))
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
      }
    } finally {
      setIsContinuing(false);
    }
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(processedContent);
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(processedContent);
  const [showEditOptions, setShowEditOptions] = useState(false);
  
  const handleEdit = () => {
    setIsEditing(true);
    setEditText(processedContent);
  };
  
  const handleSaveEdit = async (shouldRegenerate = false) => {
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
    
    // 編集後に再生成する場合
    if (shouldRegenerate) {
      // 編集されたメッセージ以降を削除してから再生成
      const messageIndex = session.messages.findIndex(msg => msg.id === message.id);
      if (messageIndex !== -1) {
        const truncatedMessages = updatedMessages.slice(0, messageIndex + 1);
        
        useAppStore.setState(state => ({
          sessions: new Map(state.sessions).set(session.id, {
            ...session,
            messages: truncatedMessages,
            message_count: truncatedMessages.length,
            updated_at: new Date().toISOString(),
          })
        }));
        
        // 再生成を実行
        try {
          await useAppStore.getState().regenerateLastMessage();
        } catch (error) {
          console.error('再生成エラー:', error);
        }
      }
    }
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(processedContent);
  };
  // ここまで戻る本実装 (新しいロックに更新)
  const handleRollback = () => {
    if (!message.id) {
      alert('メッセージIDが取得できません');
      return;
    }
    
    const confirmMessage = isGroupChat
      ? 'このメッセージまでグループチャットの履歴を戻しますか？'
      : 'このメッセージまで会話履歴を戻しますか？\n（メモリやキャラクターの関係値もこの時点の状態に近づくようにリセットされます）';
      
    if (confirm(confirmMessage)) {
      if (isGroupChat) {
        rollbackGroupSession(message.id);
      } else {
        rollbackSession(message.id);
      }
      alert('このメッセージまで巻き戻しました');
    }
  };
  /*
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
  */

  // 個別メッセージ削除機能
  const handleDeleteMessage = () => {
    if (!confirm('このメッセージを削除しますか？')) return;
    
    const session = useAppStore.getState().sessions.get(activeSessionId || '');
    if (!session) return;
    
    const updatedMessages = session.messages.filter(msg => msg.id !== message.id);
    
    useAppStore.setState(state => ({
      sessions: new Map(state.sessions).set(session.id, {
        ...session,
        messages: updatedMessages,
        message_count: updatedMessages.length,
        updated_at: new Date().toISOString(),
      })
    }));
    
    // メモリレイヤーからも削除メッセージを除去（簡易版）
    // TODO: より精密なメモリ管理が必要な場合は拡張
    alert('メッセージを削除しました');
  };
  
  // メニュー表示位置を確認（上か下か）
  const checkMenuPosition = () => {
    if (messageRef.current) {
      const rect = messageRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      const menuHeight = 60; // メニューのおおよその高さ
      
      setMenuPosition(spaceBelow < menuHeight ? 'top' : 'bottom');
    }
  };
  const [showActions, setShowActions] = useState(false);
  const [formattedTimestamp, setFormattedTimestamp] = useState('');
  const [effectTrigger, setEffectTrigger] = useState('');
  const [effectPosition, setEffectPosition] = useState({ x: 0, y: 0 });
  const [menuPosition, setMenuPosition] = useState<'bottom' | 'top'>('bottom');
  const messageRef = useRef<HTMLDivElement>(null);
  const [detectedEmotion, setDetectedEmotion] = useState<EmotionResult | null>(null);
  const { effectSettings } = useAppStore();
  
  // エフェクトのトリガー設定
  useEffect(() => {
    if (effectSettings.particleEffects && isLatest && effectTrigger !== message.content) {
      setEffectTrigger(message.content);
      // 位置は画面中央付近に設定
      setEffectPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      });
    }
  }, [message.content, isLatest, effectSettings.particleEffects, effectTrigger]);

  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { languageSettings } = useAppStore.getState();
      const locale = languageSettings?.language === 'ja' ? 'ja-JP' : 
                    languageSettings?.language === 'zh' ? 'zh-CN' :
                    languageSettings?.language === 'ko' ? 'ko-KR' : 'en-US';
      
      setFormattedTimestamp(
        new Date(message.created_at).toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: languageSettings?.timeFormat === '12' || false,
          timeZone: languageSettings?.timezone || 'Asia/Tokyo'
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
    const intensity = emotion.score ?? emotion.intensity ?? 0.5;
    const index = Math.floor(intensity * emojis.length);
    
    return emojis[Math.min(index, emojis.length - 1)];
  };

  // 感情に基づくアニメーション効果（安全な実装）
  const getEmotionAnimation = (): TargetAndTransition => {
    const emotion = message.expression?.emotion;
    if (!emotion || !effectSettings.emotionBasedStyling || effectSettings.effectQuality === 'low') return {};

    // セーフモード検出
    const safeMode = typeof window !== 'undefined' && localStorage.getItem('safe-mode') === 'true';
    if (safeMode) return {};

    // 無限ループを避けて限定回数のアニメーション
    const animationMap: { [key: string]: TargetAndTransition } = {
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
        ref={messageRef}
        initial={isLatest ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'flex gap-3',
          isUser ? 'justify-end' : 'justify-start'
        )}
        // メニューはクリックで表示/非表示を切り替えるので、バブル自体はタッチイベントを処理しない
        style={{ position: 'relative' }}
      >
      {/* アバター */}
      {!isUser && (character || (isGroupChat && message.character_name)) && (
        <motion.div
          initial={isLatest ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          className="flex-shrink-0"
        >
          <div className="flex flex-col items-center">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-opacity-60"
              style={{
                background: isGroupChat && characterColor 
                  ? (() => {
                      const color = characterColor.replace('#', '');
                      const r = parseInt(color.slice(0, 2), 16);
                      const g = parseInt(color.slice(2, 4), 16);
                      const b = parseInt(color.slice(4, 6), 16);
                      return `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.9) 0%, rgba(${Math.min(r + 40, 255)}, ${Math.min(g + 30, 255)}, ${Math.min(b + 50, 255)}, 0.9) 100%)`;
                    })()
                  : 'linear-gradient(135deg, rgba(168, 85, 247, 0.9) 0%, rgba(236, 72, 153, 0.9) 100%)',
                boxShadow: `0 0 0 2px ${isGroupChat && characterColor ? characterColor + '60' : 'rgba(168, 85, 247, 0.6)'}`
              }}
            >
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
            {/* 🎭 改善されたグループチャットキャラクター名表示 */}
            {isGroupChat && displayName && !isUser && (
              <motion.div
                initial={isLatest ? { opacity: 0, y: -5 } : false}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-center"
              >
                <span 
                  className="text-xs font-medium px-2 py-1 rounded-full bg-black/20 border max-w-[80px] truncate inline-block"
                  style={{ 
                    borderColor: characterColor + '40',
                    color: characterColor,
                    backgroundColor: characterColor + '15'
                  }}
                  title={displayName}
                >
                  {displayName}
                </span>
              </motion.div>
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
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-blue-400 ring-opacity-60"
            style={{
              background: isGroupChat 
                ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.9) 0%, rgba(6, 182, 212, 0.9) 100%)'
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(6, 182, 212, 0.9) 100%)',
            }}
          >
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
        'group relative max-w-[70%] transition-all duration-200',
        isUser && 'items-end'
      )}>
        {/* ローディング・再生アニメーション */}
        {(isRegenerating || isContinuing || isSpeaking) && (
          <Spinner label={isRegenerating ? '再生成中...' : isContinuing ? '続きを出力中...' : '音声再生中...'} />
        )}
        {/* メッセージバブル */}
        <motion.div
          className={cn(
            'relative px-4 py-3 rounded-2xl',
            effectSettings.bubbleBlur ? 'backdrop-blur-md' : '',
          )}
          style={{
            background: isUser 
              ? `linear-gradient(135deg, rgba(37, 99, 235, ${(100 - effectSettings.bubbleOpacity) / 100}) 0%, rgba(6, 182, 212, ${(100 - effectSettings.bubbleOpacity) / 100}) 100%)` // 透明度を修正
              : isGroupChat && characterColor && characterColor !== '#8b5cf6'
                ? (() => {
                    const color = characterColor.replace('#', '');
                    const r = parseInt(color.slice(0, 2), 16);
                    const g = parseInt(color.slice(2, 4), 16);
                    const b = parseInt(color.slice(4, 6), 16);
                    const opacity = (100 - effectSettings.bubbleOpacity) / 100; // 透明度を修正: bubbleOpacityが高いほど透明に
                    return `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, ${opacity}) 0%, rgba(${Math.min(r + 30, 255)}, ${Math.min(g + 20, 255)}, ${Math.min(b + 40, 255)}, ${opacity}) 100%)`;
                  })()
                : `linear-gradient(135deg, rgba(168, 85, 247, ${(100 - effectSettings.bubbleOpacity) / 100}) 0%, rgba(236, 72, 153, ${(100 - effectSettings.bubbleOpacity) / 100}) 100%)`, // 透明度を修正
            borderColor: isUser 
              ? 'rgba(255, 255, 255, 0.2)' 
              : isGroupChat && characterColor 
                ? `${characterColor}40` // 透明度を少し上げる
                : 'rgba(255, 255, 255, 0.2)',
            boxShadow: isUser 
              ? '0 0 30px rgba(59, 130, 246, 0.1)' // 影を少し弱める
              : isGroupChat && characterColor
                ? `0 0 30px ${characterColor}20` // 影を少し弱める
                : '0 0 30px rgba(168, 85, 247, 0.1)' // 影を少し弱める
          }}
          animate={
            !isUser && 
            effectSettings.emotionBasedStyling && 
            !effectSettings.typewriterEffect && 
            !effectSettings.particleEffects 
              ? getEmotionAnimation()
              : {}
          }
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
          {!isUser && effectSettings.hologramMessages && isLatest ? (
            <HologramMessage text={processedContent} />
          ) : (
            <>
              {/* 画像表示 */}
              {message.image_url && (
                <div className="mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
                    className="w-full bg-black/20 text-white/90 border border-purple-400/30 rounded p-2 min-h-[100px] resize-none focus:outline-none focus:border-purple-400/60"
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
                      onClick={() => setShowEditOptions(true)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      保存
                    </button>
                  </div>
                  
                  {/* 編集オプション選択 */}
                  {showEditOptions && (
                    <div className="mt-2 p-3 bg-black/30 rounded border border-purple-400/30">
                      <p className="text-sm text-white/70 mb-2">編集後の動作を選択:</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            handleSaveEdit(false);
                            setShowEditOptions(false);
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                        >
                          保存のみ
                        </button>
                        <button
                          onClick={() => {
                            handleSaveEdit(true);
                            setShowEditOptions(false);
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                        >
                          保存して再生成
                        </button>
                        <button
                          onClick={() => setShowEditOptions(false)}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {!isUser && (effectSettings.colorfulBubbles || effectSettings.fontEffects || effectSettings.typewriterEffect) ? (
                    <RichMessage
                      key={`${message.id}-${processedContent.length}`} // keyを追加して再レンダリングを制御
                      content={processedContent}
                      role={message.role as 'user' | 'assistant'}
                      characterColor='#8b5cf6'
                      enableEffects={isLatest && effectSettings.typewriterEffect} // タイプライター効果の条件を明確化
                      typingSpeed={isLatest && effectSettings.typewriterEffect ? 30 : 0}
                    />
                  ) : isUser && (effectSettings.colorfulBubbles || effectSettings.fontEffects) ? (
                    <RichMessage
                      key={`${message.id}-${processedContent.length}`} // keyを追加して再レンダリングを制御
                      content={processedContent}
                      role={message.role as 'user' | 'assistant'}
                      characterColor='#3b82f6'
                      enableEffects={false} // ユーザーメッセージはタイプライター効果無効
                      typingSpeed={0}
                    />
                  ) : (
                    <div className="text-white/90 whitespace-pre-wrap select-none">
                      {processedContent}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* パーティクルテキストエフェクト - AIメッセージのみ */}
          {!isUser && effectSettings.particleText && isLatest && (
            <ParticleText 
              text={processedContent} 
              trigger={effectTrigger.length > 0}
            />
          )}

          {/* 感情分析表示 - AIメッセージのみ */}
          {!isUser && effectSettings.realtimeEmotion && (
            <div className="mt-2">
              <EmotionDisplay
                message={processedContent}
                onEmotionDetected={(emotion) => {
                  setDetectedEmotion(emotion);
                  // エフェクトトリガーの更新
                  if (emotion.intensity > 0.7) {
                    setEffectTrigger(processedContent);
                  }
                }}
              />
            </div>
          )}

          {/* 感情タグ（動的絵文字付き） */}
          {!effectSettings.realtimeEmotion && message.expression?.emotion && (
            <div className="mt-2 flex gap-1">
              <motion.span 
                className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-white/70 flex items-center gap-1"
                animate={effectSettings.emotionBasedStyling && effectSettings.effectQuality !== 'low' ? {} : {}}
              >
                <span className="text-sm">{getDynamicEmoji()}</span>
                <span>{message.expression.emotion.primary}</span>
                {(message.expression.emotion.score ?? message.expression.emotion.intensity) && (
                  <span className="text-xs opacity-60">
                    ({Math.round((message.expression.emotion.score ?? message.expression.emotion.intensity) * 100)}%)
                  </span>
                )}
              </motion.span>
            </div>
          )}
          
          {/* タイムスタンプとメニューボタン */}
          <div className="flex items-center justify-between mt-1">
            <div className="text-xs text-white/40">
              {formattedTimestamp}
            </div>
            {/* ケバブメニューボタン */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                checkMenuPosition();
                setShowActions(!showActions);
              }}
              className="ml-2 p-1 rounded-full hover:bg-white/10 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
              title="メニューを表示"
            >
              <MoreVertical className="w-3 h-3 text-white/60" />
            </button>
          </div>
        </motion.div>

        {/* モバイル対応アクションメニュー - バブル下部に配置 */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'absolute left-1/2 -translate-x-1/2 z-50',
                'bg-slate-800/95 backdrop-blur-sm rounded-lg border border-purple-400/20 shadow-lg',
                'p-1 flex gap-1 justify-center',
                'max-w-[calc(100vw-2rem)] overflow-hidden',
                menuPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
              )}
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              <ActionButton icon={Copy} onClick={handleCopy} title="コピー" compact />
              <ActionButton icon={isSpeaking ? Pause : Volume2} onClick={handleSpeak} title={isSpeaking ? "停止" : "音声再生"} compact />
              <ActionButton icon={Edit} onClick={handleEdit} title="チャット編集" compact />
              <ActionButton icon={X} onClick={handleDeleteMessage} title="このメッセージを削除" compact />
              <ActionButton icon={RefreshCw} onClick={handleRegenerate} title="再生成" compact disabled={isRegenerating || is_generating || group_generating} />
              <ActionButton icon={MoreHorizontal} onClick={handleContinue} title="続きを出力" compact disabled={isContinuing || is_generating || group_generating} />
              <ActionButton icon={CornerUpLeft} onClick={handleRollback} title="ここまで戻る" compact />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

        {/* パーティクルエフェクト */}
        {effectSettings.particleEffects && effectTrigger && (
          <MessageEffects
            trigger={effectTrigger}
            position={effectPosition}
          />
        )}

        {/* 感情リアクション - AIメッセージのみ */}
        {!isUser && detectedEmotion && effectSettings.autoReactions && (
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
});

MessageBubble.displayName = 'MessageBubble';

const ActionButton: React.FC<{
  icon: React.ElementType;
  onClick: () => void;
  title: string;
  compact?: boolean;
  disabled?: boolean;
}> = ({ icon: Icon, onClick, title, compact = false, disabled = false }) => (
  <motion.button
    whileHover={{ scale: disabled ? 1 : 1.1 }}
    whileTap={{ scale: disabled ? 1 : 0.95 }}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors",
      compact ? "p-1" : "p-2",
      disabled && "opacity-50 cursor-not-allowed"
    )}
    title={title}
  >
    <Icon className={cn("text-white/70", compact ? "w-3 h-3" : "w-4 h-4")} />
  </motion.button>
);
