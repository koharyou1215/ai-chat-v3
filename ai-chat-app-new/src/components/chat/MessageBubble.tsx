'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
// シンプルなスピナー
const Spinner: React.FC<{ label?: string }> = ({ label }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, pointerEvents: 'none' }}>
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400" />
    {label && <span className="ml-3 text-white/80 text-xs bg-black/40 px-2 py-1 rounded">{label}</span>}
  </div>
);
import { motion, AnimatePresence, TargetAndTransition } from 'framer-motion';
import { RefreshCw, Copy, Volume2, Pause, Edit, CornerUpLeft, X, MoreVertical, ChevronRight } from 'lucide-react';
import { UnifiedMessage } from '@/types';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { replaceVariablesInMessage, getVariableContext } from '@/utils/variable-replacer';
import { RichMessage } from './RichMessage';

// Lazy imports for heavy effect components
import { 
  HologramMessage, 
  ParticleText,
  MessageEffects,
  EmotionDisplay,
  EffectLoadingFallback
} from '../lazy/LazyEffects';

import { EmotionReactions } from '@/components/emotion/EmotionDisplay';
import { EmotionResult } from '@/services/emotion/EmotionAnalyzer';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';

interface MessageBubbleProps {
  message: UnifiedMessage;
  previousMessage?: UnifiedMessage;
  isLatest: boolean;
  isGroupChat?: boolean;
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({ 
  message, 
  previousMessage: _previousMessage,
  isLatest,
  isGroupChat = false
}) => {
  // ローディング・再生状態
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const { isSpeaking, handleSpeak } = useAudioPlayback({ message, isLatest });
  
  // **安全な個別セレクター（無限ループ回避）**
  const characters = useAppStore(state => state.characters);
  const getSelectedPersona = useAppStore(state => state.getSelectedPersona);
  const _deleteMessage = useAppStore(state => state.deleteMessage);
  const regenerateLastMessage = useAppStore(state => state.regenerateLastMessage);
  const is_generating = useAppStore(state => state.is_generating);
  const group_generating = useAppStore(state => state.group_generating);
  const trackerManagers = useAppStore(state => state.trackerManagers);
  const activeSessionId = useAppStore(state => state.active_session_id);
  const rollbackSession = useAppStore(state => state.rollbackSession);
  const deleteMessage = useAppStore(state => state.deleteMessage);
  const continueLastMessage = useAppStore(state => state.continueLastMessage);
  const getSelectedCharacter = useAppStore(state => state.getSelectedCharacter);
  const addMessage = useAppStore(state => (state as any).addMessage);
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };
  const effectSettings = useAppStore(state => state.effectSettings);
  const appearanceSettings = useAppStore(state => state.appearanceSettings);
  const voice = useAppStore(state => state.voice);

  // グループチャット用のセレクター
  const is_group_mode = useAppStore(state => state.is_group_mode);
  const active_group_session_id = useAppStore(state => state.active_group_session_id);
  const groupSessions = useAppStore(state => state.groupSessions);
  const regenerateLastGroupMessage = useAppStore(state => state.regenerateLastGroupMessage);
  const continueLastGroupMessage = useAppStore(state => state.continueLastGroupMessage);

  const emotionAnalysisEnabled = useAppStore(state => 
    // @ts-expect-error - emotionalIntelligenceFlags is optional
    state.settings?.emotionalIntelligenceFlags?.emotion_analysis_enabled ?? false
  );

  // マージンと要素選択のキャッシュ
  const menuRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTextSelection, setSelectedTextSelection] = useState<Selection | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [showFullActions, setShowFullActions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAssistant = message.role === 'assistant';
  const isUser = message.role === 'user';

  // キャラクター情報の取得
  const character = useMemo(() => {
    if (isGroupChat && message.metadata?.character_id && typeof message.metadata.character_id === 'string') {
      return characters.get(message.metadata.character_id);
    }
    return getSelectedCharacter();
  }, [characters, message.metadata?.character_id, isGroupChat, getSelectedCharacter]);

  // メッセージ内容の処理（変数置換）
  const processedContent = useMemo(() => {
    try {
      const persona = getSelectedPersona();
      const variableContext = {
        user: persona ?? undefined,
        character: character ?? undefined
      };
      const processed = replaceVariablesInMessage(message.content, variableContext);
      return processed;
    } catch (error) {
      console.error('Error processing message content:', error);
      return message.content; // フォールバック
    }
  }, [message.content, character, getSelectedPersona]);

  // Ref for bubble element
  const bubbleRef = useRef<HTMLDivElement>(null);


  // ホバー状態の管理（改善版）
  const handleMouseEnter = useCallback(() => {
    // 既存のタイマーをクリア
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
    setShowMenu(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // 200ms遅延してからメニューを非表示
    menuTimeoutRef.current = setTimeout(() => {
      setShowMenu(false);
    }, 200);
  }, []);
  
  // 感情分析結果の解析
  const emotionResult = useMemo((): EmotionResult | null => {
    const messageWithEmotion = message as any;
    if (!emotionAnalysisEnabled || !messageWithEmotion.emotion_analysis) return null;
    
    try {
      const emotionData = message.expression?.emotion;
      if (typeof emotionData === 'string') {
        return JSON.parse(emotionData);
      }
      return emotionData as unknown as EmotionResult || null;
    } catch (error) {
      console.error('Failed to parse emotion analysis:', error);
      return null;
    }
  }, [message, emotionAnalysisEnabled]);

  // メッセージアクション: 再生成
  const handleRegenerate = useCallback(async () => {
    if (!isLatest || !isAssistant) return;
    
    setIsRegenerating(true);
    try {
      if (isGroupChat && active_group_session_id) {
        await regenerateLastGroupMessage();
      } else {
        await regenerateLastMessage();
      }
    } catch (error) {
      console.error('再生成に失敗しました:', error);
    } finally {
      setIsRegenerating(false);
    }
  }, [isLatest, isAssistant, isGroupChat, active_group_session_id, regenerateLastGroupMessage, regenerateLastMessage]);

  // メッセージアクション: 続きを生成
  const handleContinue = useCallback(async () => {
    if (!isLatest || !isAssistant) return;
    
    setIsContinuing(true);
    try {
      if (isGroupChat && active_group_session_id) {
        await continueLastGroupMessage();
      } else {
        await continueLastMessage();
      }
    } catch (error) {
      console.error('続きの生成に失敗しました:', error);
    } finally {
      setIsContinuing(false);
    }
  }, [isLatest, isAssistant, isGroupChat, active_group_session_id, continueLastGroupMessage, continueLastMessage]);

  // メッセージアクション: 削除
  const handleDelete = useCallback(async () => {
    if (!confirm('このメッセージを削除しますか？')) return;
    
    try {
      if (isGroupChat && active_group_session_id) {
        console.warn('Group message deletion not implemented');
      } else {
        deleteMessage(message.id);
      }
    } catch (error) {
      console.error('メッセージの削除に失敗しました:', error);
    }
  }, [isGroupChat, active_group_session_id, deleteMessage, message.id]);

  // メッセージアクション: ロールバック
  const handleRollback = useCallback(async () => {
    if (!confirm('この地点まで会話をロールバックしますか？')) return;
    
    try {
      await rollbackSession(message.id);
    } catch (error) {
      console.error('ロールバックに失敗しました:', error);
    }
  }, [rollbackSession, message.id]);

  // テキスト選択イベント
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || '';
    setSelectedText(selectedText);
    setSelectedTextSelection(selection);
    setShowFullActions(selectedText.length > 0);
  }, []);

  // メニューの外側クリックでの閉じる処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowFullActions(false);
        setSelectedText('');
      }
    };

    if (showFullActions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFullActions]);

  // タイマーのクリーンアップ
  useEffect(() => {
    return () => {
      if (menuTimeoutRef.current) {
        clearTimeout(menuTimeoutRef.current);
      }
    };
  }, []);

  const generateIsActive = is_generating || group_generating;
  const isCurrentlyGenerating = generateIsActive && isLatest;

  // プロフィール画像の表示判定（グループチャット用）
  const shouldShowAvatar = isAssistant && (isGroupChat || character?.avatar_url);

  // メッセージ間の時間差計算
  const timeSincePrevious = useMemo(() => {
    if (!_previousMessage) return null;
    const current = new Date(message.created_at || Date.now());
    const previous = new Date(_previousMessage.created_at || Date.now());
    const diffMinutes = Math.abs(current.getTime() - previous.getTime()) / (1000 * 60);
    return diffMinutes > 5 ? diffMinutes : null; // 5分以上の場合のみ表示
  }, [message, _previousMessage]);

  // グループチャットでの発言者名表示判定
  const shouldShowSpeakerName = isGroupChat && isAssistant && character && (
    !_previousMessage || 
    _previousMessage.role !== 'assistant' || 
    _previousMessage.metadata?.character_id !== message.metadata?.character_id ||
    (timeSincePrevious && timeSincePrevious > 5)
  );

  // アニメーション設定の最適化
  const bubbleAnimation: TargetAndTransition = useMemo(() => ({
    scale: [0.95, 1],
    opacity: [0, 1],
    y: [20, 0],
  }), []);

  const bubbleTransition = useMemo(() => ({
    duration: 0.3,
    ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
  }), []);

  // クリップボードコピー
  const handleCopy = useCallback(async () => {
    try {
      const textToCopy = selectedText || processedContent;
      await copyToClipboard(textToCopy);
    } catch (error) {
      console.error('コピーに失敗しました:', error);
    }
  }, [selectedText, processedContent]);

  // メッセージの編集開始
  const handleEdit = useCallback(() => {
    if (selectedText) {
      console.log('テキスト選択編集:', selectedText);
    } else {
      console.log('メッセージ全体編集:', processedContent);
    }
  }, [selectedText, processedContent]);

  // 選択範囲へのアクション適用
  const handleApplyToSelection = useCallback(async (action: string) => {
    if (!selectedTextSelection || !selectedText) return;

    try {
      const character = getSelectedCharacter();
      const systemPrompt = `あなたは選択されたテキストに対して${action === 'enhance' ? '強化・改善' : action === 'translate' ? '翻訳' : action === 'explain' ? '詳細説明' : action}を行うアシスタントです。`;
      
      let userPrompt = '';
      switch (action) {
        case 'enhance':
          userPrompt = `次のテキストをより良く改善してください：\n\n"${selectedText}"`;
          break;
        case 'translate':
          userPrompt = `次のテキストを自然な日本語に翻訳してください：\n\n"${selectedText}"`;
          break;
        case 'explain':
          userPrompt = `次のテキストについて詳しく説明してください：\n\n"${selectedText}"`;
          break;
      }
      
      const response = await fetch('/api/chat/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userPrompt,
          characterId: character?.id,
          systemPrompt
        })
      });
      
      if (response.ok) {
        const result = await response.text();
        if (addMessage) addMessage({
          id: Date.now().toString(),
          content: result,
          role: 'assistant',
          timestamp: Date.now(),
          character_id: character?.id
        });
      }
    } catch (error) {
      console.error(`Failed to apply ${action}:`, error);
    } finally {
      setSelectedText('');
      setShowFullActions(false);
    }
  }, [selectedTextSelection, selectedText, getSelectedCharacter, addMessage]);

  return (
    <AnimatePresence>
      <motion.div
        ref={bubbleRef}
        initial={bubbleAnimation}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={bubbleTransition}
        className={cn(
          "group relative flex items-start gap-3 mb-4 max-w-[85%] md:max-w-[75%]",
          isUser ? "ml-auto flex-row-reverse" : "mr-auto",
          "overflow-visible" // メニューがはみ出すことを許可
        )}
        onMouseUp={handleTextSelection}
        onTouchEnd={handleTextSelection}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* プロフィール画像（アシスタントのみ、条件付き表示） */}
        {shouldShowAvatar && (
          <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-purple-400/30">
            {character?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={character.avatar_url} 
                alt={character.name} 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                {character?.name?.[0] || 'AI'}
              </div>
            )}
          </div>
        )}

        <div className={cn(
          "flex flex-col min-w-0",
          isUser ? "items-end" : "items-start flex-1",
          "overflow-visible" // メニューがはみ出すことを許可
        )}>
          {/* 発言者名とタイムスタンプ（グループチャット用） */}
          {shouldShowSpeakerName && (
            <div className="flex items-center gap-2 mb-1 text-xs text-white/60">
              <span className="font-medium text-purple-300">
                {character?.name || 'AI'}
              </span>
              {timeSincePrevious && timeSincePrevious > 5 && (
                <span className="text-white/40">
                  {Math.round(timeSincePrevious)}分前
                </span>
              )}
            </div>
          )}

          {/* メッセージバブル本体 */}
          <div
            ref={menuRef}
            className={cn(
              "relative px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-200",
              isUser 
                ? "bg-gradient-to-br from-purple-600/80 to-blue-600/80 text-white border border-purple-400/30" 
                : "bg-slate-800/60 text-white border border-slate-600/30",
              "hover:shadow-xl group-hover:scale-[1.02]",
              selectedText ? "ring-2 ring-yellow-400/50" : "",
              "overflow-visible" // メニューがはみ出すことを許可
            )}
          >
            {/* リッチメッセージ表示 */}
            <RichMessage 
              content={processedContent} 
              role={message.role === 'user' || message.role === 'assistant' ? message.role : 'assistant'}
              isExpanded={isExpanded}
              onToggleExpanded={() => setIsExpanded(!isExpanded)}
            />

            {/* 感情表示（lazily loaded） */}
            {emotionResult && effectSettings.realtimeEmotion && (
              <Suspense fallback={<EffectLoadingFallback />}>
                <div className="mt-2">
                  <EmotionDisplay 
                    message={processedContent}
                  />
                </div>
              </Suspense>
            )}

            {/* ホログラムエフェクト（lazily loaded） */}
            {effectSettings.hologramMessages && isAssistant && (
              <Suspense fallback={<EffectLoadingFallback />}>
                <div className="mt-2">
                  <HologramMessage text={processedContent} />
                </div>
              </Suspense>
            )}

            {/* パーティクルエフェクト（lazily loaded） */}
            {effectSettings.particleEffects && (
              <Suspense fallback={<EffectLoadingFallback />}>
                <ParticleText text={processedContent} trigger={isLatest} />
              </Suspense>
            )}

            {/* メッセージエフェクト（lazily loaded） */}
            {effectSettings.typewriterEffect && (
              <Suspense fallback={<EffectLoadingFallback />}>
                <MessageEffects 
                  trigger={processedContent}
                  position={{ x: 0, y: 0 }}
                />
              </Suspense>
            )}

            {/* ローディングオーバーレイ */}
            {(isRegenerating || isContinuing || isCurrentlyGenerating) && (
              <Spinner label={
                isRegenerating ? '再生成中...' : 
                isContinuing ? '続きを生成中...' : 
                '生成中...'
              } />
            )}

            {/* メニューを相対位置で配置 - バブル内に移動 */}
            {showMenu && (
              <div
                className={cn(
                  "absolute top-0 z-50 flex flex-col gap-0.5 pointer-events-auto",
                  isUser ? "right-full mr-1" : "left-full ml-1"
                )}
                onMouseEnter={() => {
                  // メニューにホバーしたらタイマーをクリア
                  if (menuTimeoutRef.current) {
                    clearTimeout(menuTimeoutRef.current);
                    menuTimeoutRef.current = null;
                  }
                  setShowMenu(true);
                }}
                onMouseLeave={() => {
                  // メニューから離れても遅延して非表示
                  menuTimeoutRef.current = setTimeout(() => {
                    setShowMenu(false);
                  }, 200);
                }}
              >
                <div className="bg-slate-900/95 backdrop-blur-sm border border-white/10 rounded-lg p-1 shadow-xl hover:shadow-2xl transition-shadow duration-200">
                  {/* 基本アクション */}
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-md hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                    title="コピー"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {/* 音声再生（アシスタントメッセージのみ） */}
                  {isAssistant && voice.autoPlay && (
                    <button
                      onClick={handleSpeak}
                      className="p-2 rounded-md hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                      title={isPlaying ? '停止' : '再生'}
                    >
                      {isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  )}

                  {/* 編集ボタン */}
                  <button
                    onClick={handleEdit}
                    className="p-2 rounded-md hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                    title="編集"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {/* 再生成（アシスタントの最後のメッセージのみ） */}
                  {canRegenerate && (
                    <button
                      onClick={handleRegenerate}
                      className="p-2 rounded-md hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                      title="再生成"
                      disabled={isRegenerating}
                    >
                      <RefreshCw className={cn("w-4 h-4", isRegenerating && "animate-spin")} />
                    </button>
                  )}

                  {/* 続きを生成（アシスタントの最後のメッセージのみ） */}
                  {canContinue && (
                    <button
                      onClick={handleContinue}
                      className="p-2 rounded-md hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                      title="続きを生成"
                      disabled={isContinuing}
                    >
                      <ChevronRight className={cn("w-4 h-4", isContinuing && "animate-pulse")} />
                    </button>
                  )}

                  {/* 削除・ロールバック */}
                  <div className="w-full h-px bg-white/5" />
                  <button
                    onClick={handleDelete}
                    className="p-2 rounded-md hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                    title="削除"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleRollback}
                    className="p-2 rounded-md hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 transition-colors"
                    title="ここまでロールバック"
                  >
                    <CornerUpLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* 感情リアクション（lazily loaded） */}
          {emotionResult && effectSettings.autoReactions && (
            <Suspense fallback={<EffectLoadingFallback />}>
              <div className="mt-2">
                <EmotionReactions 
                  emotion={emotionResult}
                />
              </div>
            </Suspense>
          )}
        </div>

        {/* 選択テキスト用のフローティングメニュー - 一時的に無効化 */}
        {false && selectedText && showFullActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-50 bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-lg p-2 shadow-xl"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-white/60">選択テキスト:</span>
              <span className="text-xs text-white/80 max-w-32 truncate">
                {selectedText}
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleApplyToSelection('enhance')}
                className="px-3 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded transition-colors"
              >
                強化
              </button>
              <button
                onClick={() => handleApplyToSelection('translate')}
                className="px-3 py-1 text-xs bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded transition-colors"
              >
                翻訳
              </button>
              <button
                onClick={() => handleApplyToSelection('explain')}
                className="px-3 py-1 text-xs bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 rounded transition-colors"
              >
                説明
              </button>
              <button
                onClick={handleCopy}
                className="px-3 py-1 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded transition-colors"
              >
                コピー
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

MessageBubbleComponent.displayName = 'MessageBubble';

export const MessageBubble = React.memo(MessageBubbleComponent);