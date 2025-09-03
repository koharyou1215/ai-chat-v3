'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { motion, AnimatePresence, TargetAndTransition } from 'framer-motion';
import { RefreshCw, Copy, Volume2, Pause, Edit, CornerUpLeft, X, ChevronRight } from 'lucide-react';
import { UnifiedMessage } from '@/types';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { replaceVariablesInMessage } from '@/utils/variable-replacer';
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

// Simple spinner component used inside the bubble
const Spinner: React.FC<{ label?: string }> = ({ label }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, pointerEvents: 'none' }}>
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400" />
    {label && <span className="ml-3 text-white/80 text-xs bg-black/40 px-2 py-1 rounded">{label}</span>}
  </div>
);

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
  const regenerateMessage = useAppStore(state => state.regenerateMessage);
  const is_generating = useAppStore(state => state.is_generating);
  const group_generating = useAppStore(state => state.group_generating);
  const trackerManagers = useAppStore(state => state.trackerManagers);
  const activeSessionId = useAppStore(state => state.active_session_id);
  const rollbackSession = useAppStore(state => state.rollbackSession);
  const deleteMessage = useAppStore(state => state.deleteMessage);
  const continueLastMessage = useAppStore(state => state.continueLastMessage);
  const getSelectedCharacter = useAppStore(state => state.getSelectedCharacter);
  const editMessage = useAppStore(state => state.editMessage);
  // TODO: addMessageメソッドがChatSliceに定義されていないため一時的に無効化
  // const addMessage = useAppStore(state => state.addMessage);
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // クリップボードアクセスが失敗した場合は無視
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
    state.emotionalIntelligenceFlags?.emotion_analysis_enabled ?? false
  );

  // マージンと要素選択のキャッシュ
  const menuRef = useRef<HTMLDivElement>(null);
  // メニューの遅延非表示タイマー参照
  const hideMenuTimeoutRef = useRef<number | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (hideMenuTimeoutRef.current) {
      clearTimeout(hideMenuTimeoutRef.current);
      hideMenuTimeoutRef.current = null;
    }
  }, []);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTextSelection, setSelectedTextSelection] = useState<Selection | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [showFullActions, setShowFullActions] = useState(false);
  const [menuSide, setMenuSide] = useState<'left' | 'right'>('right');
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [pointerLeft, setPointerLeft] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<'center' | 'top' | 'bottom'>('center');

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
      // メッセージ処理でエラーが発生した場合、元のコンテンツを返す
      return message.content; // フォールバック
    }
  }, [message.content, character, getSelectedPersona]);

  // Ref for bubble element
  const bubbleRef = useRef<HTMLDivElement>(null);

  // メニュー位置の計算を削除（インラインメニューに変更）
  const updateMenuPosition = useCallback(() => {
    // ポジション計算を無効化（インラインメニューに移行）
  }, []);

  // スクロール/リサイズのイベントリスナーを削除（インラインメニューには不要）

  // ヘッダーで表示するユーザー名を既存のセレクターから取得
  const selectedUserName = getSelectedPersona ? getSelectedPersona()?.name || 'You' : 'You';

  // ホバー状態の管理
  const handleMouseEnter = useCallback(() => {
    clearHideTimeout();
    
    // メニューの位置を動的に計算
    if (bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const menuHeight = 200; // メニューの推定高さ
      
      // 画面下部に近い場合（下端から150px以内）は上寄りに表示
      if (rect.bottom + menuHeight > viewportHeight - 50) {
        setMenuPosition('top');
      }
      // 画面上部に近い場合（上端から150px以内）は下寄りに表示
      else if (rect.top < 150) {
        setMenuPosition('bottom');
      }
      // それ以外は中央に表示
      else {
        setMenuPosition('center');
      }
    }
    
    setShowMenu(true);
  }, [clearHideTimeout]);

  const handleMouseLeave = useCallback(() => {
    // 即時に閉じず、少し待ってから閉じる
    if (hideMenuTimeoutRef.current) clearTimeout(hideMenuTimeoutRef.current);
    hideMenuTimeoutRef.current = window.setTimeout(() => setShowMenu(false), 300) as unknown as number;
  }, []);
  
  // 感情分析結果の解析
  const emotionResult = useMemo((): EmotionResult | null => {
    if (!emotionAnalysisEnabled || !('emotion_analysis' in message)) return null;
    
    try {
      const emotionData = message.expression?.emotion;
      if (typeof emotionData === 'string') {
        return JSON.parse(emotionData);
      }
      return emotionData as unknown as EmotionResult || null;
    } catch (error) {
      // 感情分析のパースに失敗した場合はnullを返す
      return null;
    }
  }, [message, emotionAnalysisEnabled]);

  // メッセージアクション: 再生成
  const handleRegenerate = useCallback(async () => {
    // Allow per-message regeneration: target this message if it's an assistant message
    if (!isAssistant) return;

    setIsRegenerating(true);
    try {
      if (isGroupChat && active_group_session_id) {
        // fallback to group-level regenerate if per-message not implemented
        if (regenerateLastGroupMessage) {
          await regenerateLastGroupMessage();
        }
      } else {
        if (regenerateMessage) {
          await regenerateMessage(message.id);
        } else {
          await regenerateLastMessage();
        }
      }
    } catch (error) {
      // 再生成に失敗した場合は静かに処理を終了
    } finally {
      setIsRegenerating(false);
    }
  }, [isAssistant, isGroupChat, active_group_session_id, regenerateLastGroupMessage, regenerateLastMessage, regenerateMessage, message.id]);

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
      // 続きの生成に失敗した場合は静かに処理を終了
    } finally {
      setIsContinuing(false);
    }
  }, [isLatest, isAssistant, isGroupChat, active_group_session_id, continueLastGroupMessage, continueLastMessage]);

  // メッセージアクション: 削除
  const handleDelete = useCallback(async () => {
    if (!confirm('このメッセージを削除しますか？')) return;
    
    try {
      if (isGroupChat && active_group_session_id) {
        // グループメッセージ削除は未実装
      } else {
        deleteMessage(message.id);
      }
    } catch (error) {
      // メッセージ削除に失敗した場合は静かに処理を終了
    }
  }, [isGroupChat, active_group_session_id, deleteMessage, message.id]);

  // メッセージアクション: ロールバック
  const handleRollback = useCallback(async () => {
    if (!confirm('この地点まで会話をロールバックしますか？')) return;
    
    try {
      await rollbackSession(message.id);
    } catch (error) {
      // ロールバックに失敗した場合は静かに処理を終了
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

  // コンポーネントアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (hideMenuTimeoutRef.current) {
        clearTimeout(hideMenuTimeoutRef.current);
        hideMenuTimeoutRef.current = null;
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
      // コピーに失敗した場合は静かに処理を終了
    }
  }, [selectedText, processedContent]);

  // メッセージの編集開始
  const handleEdit = useCallback(async () => {
    if (!isUser) return; // ユーザーメッセージのみ編集可能
    
    const newContent = prompt('メッセージを編集してください:', message.content);
    if (newContent && newContent !== message.content) {
      // メッセージ編集後のアクション（以前の設定を維持）
      await editMessage(message.id, newContent);
    }
  }, [isUser, message.content, message.id, editMessage]);

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
        // TODO: addMessageメソッド実装後に有効化
        // if (addMessage) addMessage({
        //   id: Date.now().toString(),
        //   content: result,
        //   role: 'assistant',
        //   timestamp: Date.now(),
        //   character_id: character?.id
        // });
      }
    } catch (error) {
      // アクション適用に失敗した場合は静かに処理を終了
    } finally {
      setSelectedText('');
      setShowFullActions(false);
    }
  }, [selectedTextSelection, selectedText, getSelectedCharacter]);

  return (
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
          "flex flex-col min-w-0 flex-1 relative",
          isUser ? "items-end" : "items-start",
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
              isLatest={isLatest}
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
            {effectSettings.particleEffects && (
              <Suspense fallback={<EffectLoadingFallback />}>
                {/* メッセージエフェクト: バブル位置を渡してエフェクトをバブル近傍に表示 */}
                <MessageEffects 
                  trigger={processedContent}
                  position={bubbleRef.current ? (() => {
                    const r = bubbleRef.current!.getBoundingClientRect();
                    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
                  })() : { x: 0, y: 0 }}
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
            
            {/* 横メニューバー（ホバー時表示） */}
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: isUser ? 10 : -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: isUser ? 10 : -10 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "absolute z-10",
                    "bg-slate-800/90 backdrop-blur-sm border border-white/20 rounded-lg",
                    "shadow-lg p-1",
                    isUser ? "-left-12" : "-right-12",
                    // 位置を動的に調整
                    menuPosition === 'top' ? 'top-0' :
                    menuPosition === 'bottom' ? 'bottom-0' :
                    'top-1/2 -translate-y-1/2'
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white/70 transition-colors"
                      title="コピー"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    
                    {/* ユーザーメッセージの編集機能 */}
                    {isUser && (
                      <button
                        onClick={handleEdit}
                        className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white/70 transition-colors"
                        title="編集"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    )}
                    
                    {/* アシスタントメッセージの音声機能 */}
                    {isAssistant && voice.enabled && (
                      <button
                        onClick={handleSpeak}
                        disabled={isSpeaking}
                        className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white/70 transition-colors disabled:opacity-50"
                        title={isSpeaking ? "再生中" : "音声再生"}
                      >
                        {isSpeaking ? <Pause className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      </button>
                    )}
                    
                    {/* アシスタントメッセージの再生成・続き生成 */}
                    {isAssistant && isLatest && !generateIsActive && (
                      <>
                        <button
                          onClick={handleRegenerate}
                          disabled={isRegenerating || generateIsActive}
                          className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white/70 transition-colors disabled:opacity-50"
                          title="再生成"
                        >
                          <RefreshCw className={cn("w-3 h-3", isRegenerating && "animate-spin")} />
                        </button>
                        <button
                          onClick={handleContinue}
                          disabled={isContinuing || generateIsActive}
                          className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white/70 transition-colors disabled:opacity-50"
                          title="続きを生成"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    
                    {/* ここまで戻るボタン */}
                    <button
                      onClick={handleRollback}
                      className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white/70 transition-colors"
                      title="ここまで戻る"
                    >
                      <CornerUpLeft className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
  );
};

MessageBubbleComponent.displayName = 'MessageBubble';

export const MessageBubble = React.memo(MessageBubbleComponent);
