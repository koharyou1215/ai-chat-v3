'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Copy, Volume2, Pause, Edit, CornerUpLeft, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageMenuProps {
  showMenu: boolean;
  isUser: boolean;
  isAssistant: boolean;
  isLatest: boolean;
  isSpeaking: boolean;
  isRegenerating: boolean;
  isContinuing: boolean;
  generateIsActive: boolean;
  voiceEnabled: boolean;
  menuPosition: 'center' | 'top' | 'bottom';
  onCopy: () => void;
  onEdit?: () => void;
  onSpeak?: () => void;
  onRegenerate?: () => void;
  onContinue?: () => void;
  onDelete?: () => void;
  onRollback?: () => void;
}

export const MessageMenu: React.FC<MessageMenuProps> = ({
  showMenu,
  isUser,
  isAssistant,
  isLatest,
  isSpeaking,
  isRegenerating,
  isContinuing,
  generateIsActive,
  voiceEnabled,
  menuPosition,
  onCopy,
  onEdit,
  onSpeak,
  onRegenerate,
  onContinue,
  onDelete,
  onRollback,
}) => {
  return (
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
            menuPosition === 'top' ? 'top-0' :
            menuPosition === 'bottom' ? 'bottom-0' :
            'top-1/2 -translate-y-1/2'
          )}
        >
          <div className="flex flex-col gap-1">
            <button
              onClick={onCopy}
              className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white/70 transition-colors"
              title="コピー"
            >
              <Copy className="w-3 h-3" />
            </button>
            
            {/* ユーザーメッセージの編集機能 */}
            {isUser && onEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white/70 transition-colors"
                title="編集"
              >
                <Edit className="w-3 h-3" />
              </button>
            )}
            
            {/* アシスタントメッセージの音声機能 */}
            {isAssistant && voiceEnabled && onSpeak && (
              <button
                onClick={onSpeak}
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
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    disabled={isRegenerating || generateIsActive}
                    className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white/70 transition-colors disabled:opacity-50"
                    title="再生成"
                  >
                    <RefreshCw className={cn("w-3 h-3", isRegenerating && "animate-spin")} />
                  </button>
                )}
                {onContinue && (
                  <button
                    onClick={onContinue}
                    disabled={isContinuing || generateIsActive}
                    className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white/70 transition-colors disabled:opacity-50"
                    title="続きを生成"
                  >
                    <ChevronRight className={cn("w-3 h-3", isContinuing && "animate-spin")} />
                  </button>
                )}
              </>
            )}
            
            {/* 削除・ロールバック機能 */}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded hover:bg-red-500/20 text-red-400/70 hover:text-red-400 transition-colors"
                title="削除"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            
            {onRollback && (
              <button
                onClick={onRollback}
                className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white/70 transition-colors"
                title="この地点にロールバック"
              >
                <CornerUpLeft className="w-3 h-3" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};