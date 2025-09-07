/**
 * Progressive Message Bubble Component
 * 3段階プログレッシブ応答の表示コンポーネント
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProgressiveMessage } from '@/types/progressive-message.types';
import { messageTransitionService } from '@/services/message-transition.service';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ProgressiveMessageBubbleProps {
  message: ProgressiveMessage;
  isLatest?: boolean;
}

export const ProgressiveMessageBubble: React.FC<ProgressiveMessageBubbleProps> = ({
  message,
  isLatest = false
}) => {
  const [displayContent, setDisplayContent] = useState('');
  const [previousContent, setPreviousContent] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const [showDiff, setShowDiff] = useState(false);
  
  // コンテンツ更新の監視と表示
  useEffect(() => {
    if (message.content && message.content !== previousContent) {
      setPreviousContent(displayContent);
      
      // アニメーション効果を適用
      if (contentRef.current && previousContent) {
        // 差分がある場合はトランジション
        const diff = messageTransitionService.detectChanges(previousContent, message.content);
        if (diff.changeRatio > 0.1 && isLatest) {
          // モーフィングアニメーション
          messageTransitionService.morphTransition(
            contentRef.current,
            previousContent,
            message.content,
            700
          );
        } else {
          // 即座に更新
          setDisplayContent(message.content);
        }
      } else {
        // 初回表示
        setDisplayContent(message.content);
      }
      
      // グロー効果
      if (contentRef.current && isLatest && message.ui.glowIntensity !== 'none') {
        messageTransitionService.applyGlowEffect(
          contentRef.current,
          message.ui.glowIntensity,
          1000
        );
      }
    }
  }, [message.content, previousContent, displayContent, isLatest, message.ui.glowIntensity]);
  
  // ステージインジケーターの色を取得
  const getStageColor = (stage: 'reflex' | 'context' | 'intelligence', isComplete: boolean) => {
    if (!isComplete) return 'bg-gray-600';
    
    switch (stage) {
      case 'reflex':
        return 'bg-green-500';
      case 'context':
        return 'bg-blue-500';
      case 'intelligence':
        return 'bg-purple-500';
      default:
        return 'bg-gray-600';
    }
  };
  
  // ステージラベルの取得
  const getStageLabel = (stage: 'reflex' | 'context' | 'intelligence') => {
    switch (stage) {
      case 'reflex':
        return '反射';
      case 'context':
        return '文脈';
      case 'intelligence':
        return '洞察';
      default:
        return '';
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`progressive-message-bubble relative ${
        message.ui.isUpdating ? 'updating' : ''
      }`}
    >
      {/* ステージインジケーター */}
      {message.ui.showIndicator && (
        <div className="stage-indicator flex gap-3 mb-3">
          {(['reflex', 'context', 'intelligence'] as const).map((stage) => (
            <div key={stage} className="stage-item flex items-center gap-1">
              <motion.div
                className={`stage-dot w-3 h-3 rounded-full transition-all duration-300 ${
                  getStageColor(stage, !!message.stages[stage])
                }`}
                animate={{
                  scale: message.currentStage === stage ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  duration: 0.5,
                  repeat: message.currentStage === stage && message.ui.isUpdating ? Infinity : 0,
                }}
              />
              <span className="stage-label text-xs text-gray-400">
                {getStageLabel(stage)}
              </span>
              {message.stages[stage] && (
                <span className="stage-tokens text-xs text-gray-500">
                  ({message.stages[stage]?.tokens}t)
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* メッセージコンテンツ */}
      <div 
        ref={contentRef}
        className={`message-content relative overflow-hidden ${
          message.ui.highlightChanges ? 'highlight-changes' : ''
        }`}
      >
        {/* アバター */}
        {message.character_avatar && (
          <div className="absolute -left-12 top-0 w-10 h-10 rounded-full overflow-hidden">
            <img 
              src={message.character_avatar} 
              alt={message.character_name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* テキストコンテンツ */}
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {displayContent || '...'}
          </ReactMarkdown>
        </div>
        
        {/* 差分表示（開発モード） */}
        {process.env.NODE_ENV === 'development' && showDiff && message.stages.context?.diff && (
          <div className="diff-display mt-2 p-2 bg-gray-800 rounded text-xs">
            <div className="additions text-green-400">
              + {message.stages.context.diff.additions.join(' ')}
            </div>
            <div className="deletions text-red-400">
              - {message.stages.context.diff.deletions.join(' ')}
            </div>
          </div>
        )}
      </div>
      
      {/* 更新中インジケーター */}
      {message.ui.isUpdating && (
        <motion.div 
          className="updating-indicator mt-3 flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="loading-dots flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="dot w-2 h-2 bg-blue-400 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
          <span className="text-sm text-gray-400">
            {message.currentStage === 'reflex' && '記憶を検索中...'}
            {message.currentStage === 'context' && '深い洞察を生成中...'}
            {message.currentStage === 'intelligence' && '最終調整中...'}
          </span>
        </motion.div>
      )}
      
      {/* メタデータ（開発モード） */}
      {process.env.NODE_ENV === 'development' && message.metadata && (
        <div className="metadata mt-3 p-2 bg-gray-900 rounded text-xs text-gray-400">
          <div className="flex gap-4">
            <span>Total Tokens: {message.metadata.totalTokens}</span>
            <span>Total Time: {message.metadata.totalTime}ms</span>
            {message.metadata.stageTimings && (
              <>
                <span>R: {message.metadata.stageTimings.reflex}ms</span>
                <span>C: {message.metadata.stageTimings.context}ms</span>
                <span>I: {message.metadata.stageTimings.intelligence}ms</span>
              </>
            )}
          </div>
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="mt-1 text-blue-400 hover:text-blue-300"
          >
            {showDiff ? 'Hide' : 'Show'} Diff
          </button>
        </div>
      )}
      
      {/* 波紋エフェクトのオーバーレイ */}
      <AnimatePresence>
        {message.ui.isUpdating && message.currentStage === 'context' && (
          <motion.div
            className="ripple-overlay absolute inset-0 pointer-events-none"
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            style={{
              background: 'radial-gradient(circle, rgba(100,200,255,0.3) 0%, transparent 70%)',
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProgressiveMessageBubble;