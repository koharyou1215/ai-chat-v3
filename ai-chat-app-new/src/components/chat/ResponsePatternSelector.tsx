'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Sparkles, Palette, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ResponsePattern = 'friendly' | 'professional' | 'creative' | 'empathetic';

interface ResponsePatternSelectorProps {
  currentPattern: ResponsePattern;
  onPatternChange: (pattern: ResponsePattern) => void;
  className?: string;
  compact?: boolean;
}

const patternConfig: Record<ResponsePattern, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  color: string;
}> = {
  friendly: {
    icon: MessageCircle,
    label: 'フレンドリー',
    description: '親しみやすく温かい返答',
    color: 'from-yellow-500 to-orange-500'
  },
  professional: {
    icon: Sparkles,
    label: 'プロフェッショナル',
    description: '丁寧で洗練された返答',
    color: 'from-blue-500 to-indigo-500'
  },
  creative: {
    icon: Palette,
    label: 'クリエイティブ',
    description: '独創的で想像力豊かな返答',
    color: 'from-purple-500 to-pink-500'
  },
  empathetic: {
    icon: Heart,
    label: '共感的',
    description: '感情に寄り添う優しい返答',
    color: 'from-pink-500 to-rose-500'
  }
};

export const ResponsePatternSelector: React.FC<ResponsePatternSelectorProps> = ({
  currentPattern,
  onPatternChange,
  className,
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (compact) {
    // コンパクトモード（メッセージ入力欄の近く用）
    return (
      <div className={cn("relative", className)}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-purple-400/20 transition-all"
          title="返答パターンを選択"
        >
          {React.createElement(patternConfig[currentPattern].icon, {
            className: "w-4 h-4 text-purple-400"
          })}
          <span className="text-xs text-white/60">
            {patternConfig[currentPattern].label}
          </span>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-full mb-2 left-0 z-50 w-48 bg-black/90 backdrop-blur-xl rounded-lg border border-purple-400/30 p-2"
            >
              {(Object.keys(patternConfig) as ResponsePattern[]).map((pattern) => {
                const config = patternConfig[pattern];
                const Icon = config.icon;
                const isSelected = pattern === currentPattern;

                return (
                  <button
                    key={pattern}
                    onClick={() => {
                      onPatternChange(pattern);
                      setIsExpanded(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                      isSelected
                        ? "bg-purple-500/20 text-white"
                        : "hover:bg-white/10 text-white/70"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs flex-1 text-left">{config.label}</span>
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // フルモード（設定画面用）
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {(Object.keys(patternConfig) as ResponsePattern[]).map((pattern) => {
        const config = patternConfig[pattern];
        const Icon = config.icon;
        const isSelected = pattern === currentPattern;

        return (
          <motion.button
            key={pattern}
            onClick={() => onPatternChange(pattern)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "relative p-4 rounded-xl border transition-all",
              isSelected
                ? "bg-purple-500/10 border-purple-400/50"
                : "bg-white/5 border-purple-400/20 hover:bg-white/10"
            )}
          >
            {/* 選択マーク */}
            {isSelected && (
              <div className="absolute top-2 right-2">
                <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </div>
            )}

            {/* アイコン */}
            <div className={cn(
              "w-10 h-10 rounded-lg bg-gradient-to-r flex items-center justify-center mb-3",
              config.color
            )}>
              <Icon className="w-5 h-5 text-white" />
            </div>

            {/* ラベルと説明 */}
            <h4 className="text-sm font-medium text-white/90 mb-1">
              {config.label}
            </h4>
            <p className="text-xs text-white/50 leading-relaxed">
              {config.description}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
};