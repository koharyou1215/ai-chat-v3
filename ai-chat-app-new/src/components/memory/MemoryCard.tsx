'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pin, 
  PinOff, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Tag, 
  Calendar,
  Star,
  MessageSquare
} from 'lucide-react';
import { MemoryCard, MemoryCategory } from '@/types';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

interface MemoryCardProps {
  memory: MemoryCard;
  onEdit?: (memory: MemoryCard) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

const categoryColors: Record<MemoryCategory, string> = {
  personal_info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  preference: 'bg-green-500/20 text-green-400 border-green-500/30',
  event: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  relationship: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  promise: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  important_date: 'bg-red-500/20 text-red-400 border-red-500/30',
  emotion: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  decision: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  knowledge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  other: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
};

const categoryLabels: Record<MemoryCategory, string> = {
  personal_info: '個人情報',
  preference: '好み・嗜好',
  event: '出来事',
  relationship: '関係性',
  promise: '約束',
  important_date: '重要な日付',
  emotion: '感情的な内容',
  decision: '決定事項',
  knowledge: '知識・情報',
  other: 'その他'
};

export const MemoryCardComponent: React.FC<MemoryCardProps> = ({ 
  memory, 
  onEdit, 
  onDelete,
  className 
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  
  const { updateMemoryCard, deleteMemoryCard } = useAppStore();
  
  const handlePinToggle = () => {
    updateMemoryCard(memory.id, { is_pinned: !memory.is_pinned });
  };
  
  const handleVisibilityToggle = () => {
    updateMemoryCard(memory.id, { is_hidden: !memory.is_hidden });
  };
  
  const handleDelete = () => {
    if (onDelete) {
      onDelete(memory.id);
    } else {
      deleteMemoryCard(memory.id);
    }
  };
  
  const importanceColor = memory.importance.score > 0.8 ? 'text-yellow-400' :
                         memory.importance.score > 0.6 ? 'text-orange-400' :
                         memory.importance.score > 0.4 ? 'text-blue-400' : 'text-gray-400';
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'relative bg-white/5 backdrop-blur-sm rounded-xl border border-white/10',
        'p-4 transition-all duration-300 hover:bg-white/10',
        memory.is_pinned && 'ring-2 ring-purple-500/50 bg-purple-500/10',
        memory.is_hidden && 'opacity-50',
        className
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-white font-medium text-sm leading-tight mb-1">
            {memory.title}
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <span className={cn(
              'px-2 py-1 rounded-full border text-xs font-medium',
              categoryColors[memory.category]
            )}>
              {categoryLabels[memory.category]}
            </span>
            <div className="flex items-center gap-1 text-white/50">
              <Star className="w-3 h-3" />
              <span className={importanceColor}>
                {Math.round(memory.importance.score * 100)}%
              </span>
            </div>
          </div>
        </div>
        
        {/* アクションボタン */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex gap-1"
            >
              <button
                onClick={handlePinToggle}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  memory.is_pinned 
                    ? 'bg-purple-500/20 text-purple-400' 
                    : 'hover:bg-white/10 text-white/50 hover:text-white/70'
                )}
                title={memory.is_pinned ? 'ピン留め解除' : 'ピン留め'}
              >
                {memory.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
              </button>
              
              <button
                onClick={handleVisibilityToggle}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  memory.is_hidden 
                    ? 'bg-orange-500/20 text-orange-400' 
                    : 'hover:bg-white/10 text-white/50 hover:text-white/70'
                )}
                title={memory.is_hidden ? '表示' : '非表示'}
              >
                {memory.is_hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </button>
              
              {onEdit && (
                <button
                  onClick={() => onEdit(memory)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/70 transition-colors"
                  title="編集"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
              
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                title="削除"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* 内容 */}
      <div className="mb-3">
        <p className="text-white/80 text-sm leading-relaxed">
          {showFullContent ? memory.summary : 
            memory.summary.length > 100 ? 
              `${memory.summary.substring(0, 100)}...` : 
              memory.summary
          }
        </p>
        
        {memory.summary.length > 100 && (
          <button
            onClick={() => setShowFullContent(!showFullContent)}
            className="text-xs text-purple-400 hover:text-purple-300 mt-1 transition-colors"
          >
            {showFullContent ? '折りたたむ' : '続きを読む'}
          </button>
        )}
      </div>
      
      {/* タグ */}
      <div className="flex flex-wrap gap-1 mb-3">
        {memory.keywords.slice(0, 3).map((keyword, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/70"
          >
            {keyword}
          </span>
        ))}
        {memory.keywords.length > 3 && (
          <span className="px-2 py-1 bg-white/5 rounded-full text-xs text-white/50">
            +{memory.keywords.length - 3}
          </span>
        )}
      </div>
      
      {/* フッター */}
      <div className="flex items-center justify-between text-xs text-white/50">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3" />
          <span>{new Date(memory.created_at).toLocaleDateString('ja-JP')}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3 h-3" />
          <span>{memory.original_message_ids.length} メッセージ</span>
          
          {memory.user_notes && (
            <Tag className="w-3 h-3 text-blue-400" title="ユーザーメモあり" />
          )}
        </div>
      </div>
      
      {/* 重要度バー */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 rounded-b-xl overflow-hidden">
        <div 
          className={cn(
            'h-full transition-all duration-300',
            memory.importance.score > 0.8 ? 'bg-yellow-500' :
            memory.importance.score > 0.6 ? 'bg-orange-500' :
            memory.importance.score > 0.4 ? 'bg-blue-500' : 'bg-gray-500'
          )}
          style={{ width: `${memory.importance.score * 100}%` }}
        />
      </div>
    </motion.div>
  );
};


