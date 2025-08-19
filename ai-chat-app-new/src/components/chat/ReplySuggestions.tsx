'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Brain, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReplySuggestion } from '@/services/suggestion.service';

interface ReplySuggestionsProps {
  suggestions: ReplySuggestion[];
  isGenerating: boolean;
  onSelectSuggestion: (content: string) => void;
  onClose: () => void;
}

const suggestionConfig = {
  empathy: { 
    icon: Heart, 
    color: 'from-pink-500 to-rose-500',
    label: '共感・受容型'
  },
  exploration: { 
    icon: Brain, 
    color: 'from-blue-500 to-cyan-500',
    label: '探求・開発型'
  },
  provocative: { 
    icon: Zap, 
    color: 'from-orange-500 to-red-500',
    label: '挑発・逸脱型'
  },
  affection: { 
    icon: Star, 
    color: 'from-purple-500 to-pink-500',
    label: '甘え・依存型'
  }
};

export const ReplySuggestions: React.FC<ReplySuggestionsProps> = ({
  suggestions,
  isGenerating,
  onSelectSuggestion,
  onClose
}) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="mb-4 p-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white/80">返信提案</h3>
          <button
            onClick={onClose}
            className="text-xs text-white/50 hover:text-white/70 transition-colors"
          >
            閉じる
          </button>
        </div>

        {isGenerating ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="ml-3 text-sm text-white/60">提案を生成中...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestions.map((suggestion, index) => {
              const config = suggestionConfig[suggestion.type];
              const Icon = config.icon;
              
              return (
                <motion.button
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    transition: { delay: index * 0.1 }
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectSuggestion(suggestion.content)}
                  className="group relative p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-white/20 transition-all text-left"
                >
                  {/* アイコンとラベル */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn(
                      'p-1.5 rounded-lg bg-gradient-to-r',
                      config.color,
                      'opacity-80 group-hover:opacity-100'
                    )}>
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs text-white/50 font-medium">
                      {config.label}
                    </span>
                  </div>
                  
                  {/* 提案内容 */}
                  <p className="text-sm text-white/80 group-hover:text-white/90 leading-relaxed line-clamp-3">
                    {suggestion.content}
                  </p>
                  
                  {/* ホバーエフェクト */}
                  <div className={cn(
                    'absolute inset-0 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity',
                    'bg-gradient-to-r',
                    config.color
                  )} />
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};