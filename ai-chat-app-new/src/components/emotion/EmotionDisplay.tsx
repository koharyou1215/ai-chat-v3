'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain } from 'lucide-react';
import { EmotionResult, EmotionAnalyzer, MoodTimeline } from '@/services/emotion/EmotionAnalyzer';
import { useEffectSettings } from '@/contexts/EffectSettingsContext';

interface EmotionDisplayProps {
  message: string;
  onEmotionDetected?: (emotion: EmotionResult) => void;
}

export const EmotionDisplay: React.FC<EmotionDisplayProps> = ({
  message,
  onEmotionDetected
}) => {
  const { settings } = useEffectSettings();
  const [currentEmotion, setCurrentEmotion] = useState<EmotionResult | null>(null);
  const [moodTimeline, setMoodTimeline] = useState<MoodTimeline | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzerRef = useRef<EmotionAnalyzer>(new EmotionAnalyzer());

  useEffect(() => {
    if (!settings.realtimeEmotion || !message.trim()) return;

    const analyzeEmotion = async () => {
      setIsAnalyzing(true);
      try {
        const emotion = await analyzerRef.current.analyzeEmotion(message);
        setCurrentEmotion(emotion);
        
        // ムードタイムラインを更新
        const timeline = analyzerRef.current.trackConversationMood();
        setMoodTimeline(timeline);
        
        // 親コンポーネントに通知
        if (onEmotionDetected) {
          onEmotionDetected(emotion);
        }
      } catch (error) {
        console.error('Emotion analysis failed:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    // デバウンス処理
    const timeout = setTimeout(analyzeEmotion, 500);
    return () => clearTimeout(timeout);
  }, [message, settings.realtimeEmotion, onEmotionDetected]);

  if (!settings.realtimeEmotion) return null;

  return (
    <div className="space-y-1">
      {/* コンパクト感情表示 */}
      <AnimatePresence>
        {currentEmotion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2 text-xs"
          >
            <CompactEmotionBadge emotion={currentEmotion} />
            <CompactMoodIndicator timeline={moodTimeline} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 分析中インジケーター */}
      {isAnalyzing && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="flex items-center gap-1 text-xs text-gray-500"
        >
          <Brain className="w-3 h-3" />
          <span>分析中...</span>
        </motion.div>
      )}
    </div>
  );
};

/**
 * コンパクト感情バッジ（絵文字 + 感情名のみ）
 */
const CompactEmotionBadge: React.FC<{ emotion: EmotionResult }> = ({ emotion }) => {
  const emotionEmojis: Record<string, string> = {
    joy: '😊',
    love: '💕',
    surprise: '😮',
    sadness: '😢',
    anger: '😠',
    fear: '😨',
    excitement: '🎉',
    curiosity: '🤔',
    gratitude: '🙏',
    confusion: '😵',
    agitated: '😤'
  };

  const emoji = emotionEmojis[emotion.primary] || '😐';
  const intensity = Math.round(emotion.intensity * 100);

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded-full border border-white/10"
      title={`${emotion.primary} (強度: ${intensity}%)`}
    >
      <span className="text-sm">{emoji}</span>
      <span className="text-xs text-white/70 capitalize">{emotion.primary}</span>
    </motion.div>
  );
};

/**
 * コンパクトムード表示（1行の色付きバーのみ）
 */
const CompactMoodIndicator: React.FC<{ timeline: MoodTimeline | null }> = ({ timeline }) => {
  if (!timeline) return null;

  const moodColor = timeline.overallMood === 'positive' ? 'bg-green-400' :
                   timeline.overallMood === 'negative' ? 'bg-red-400' : 'bg-gray-400';

  return (
    <div 
      className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded-full border border-white/10"
      title={timeline.recommendation}
    >
      <div className={`w-2 h-2 rounded-full ${moodColor}`} />
      <span className="text-xs text-white/70 capitalize">{timeline.overallMood}</span>
    </div>
  );
};

/**
 * 感情バッジコンポーネント
 */
/*
const EmotionBadge: React.FC<{ emotion: EmotionResult }> = ({ emotion }) => {
  const emotionEmojis: Record<string, string> = {
    joy: '😊',
    love: '💕',
    surprise: '😮',
    sadness: '😢',
    anger: '😠',
    fear: '😨',
    excitement: '🎉',
    curiosity: '🤔',
    gratitude: '🙏',
    confusion: '😵'
  };

  const emotionColors: Record<string, string> = {
    joy: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    love: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    surprise: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    sadness: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    anger: 'bg-red-500/20 text-red-300 border-red-500/30',
    fear: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    excitement: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    curiosity: 'bg-green-500/20 text-green-300 border-green-500/30',
    gratitude: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    confusion: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  };

  const emoji = emotionEmojis[emotion.primary] || '😐';
  const colorClass = emotionColors[emotion.primary] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        'px-2 py-1 rounded-full border text-xs font-medium flex items-center gap-1',
        colorClass
      )}
    >
      <span>{emoji}</span>
      <span className="capitalize">{emotion.primary}</span>
    </motion.div>
  );
};
*/

/**
 * 強度バーコンポーネント
 */
/*
const IntensityBar: React.FC<{ intensity: number }> = ({ intensity }) => {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-500">強度:</span>
      <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${intensity * 100}%` }}
          className={cn(
            'h-full rounded-full',
            intensity > 0.7 ? 'bg-red-400' :
            intensity > 0.4 ? 'bg-yellow-400' : 'bg-green-400'
          )}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="text-xs text-gray-400">{Math.round(intensity * 100)}%</span>
    </div>
  );
};
*/

/**
 * 信頼度インジケーター
 */
/*
const ConfidenceIndicator: React.FC<{ confidence: number }> = ({ confidence }) => {
  const dots = Array.from({ length: 3 }, (_, i) => (
    <motion.div
      key={i}
      initial={{ scale: 0 }}
      animate={{ 
        scale: confidence > (i + 1) / 3 ? 1 : 0.3,
        backgroundColor: confidence > (i + 1) / 3 ? '#22c55e' : '#374151'
      }}
      className="w-1.5 h-1.5 rounded-full"
      transition={{ delay: i * 0.1 }}
    />
  ));

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-500">信頼度:</span>
      <div className="flex gap-0.5">
        {dots}
      </div>
    </div>
  );
};
*/

/**
 * 感情の流れ表示
 */
/*
const EmotionFlow: React.FC<{ flow: EmotionResult['flow'] }> = ({ flow }) => {
  const TrendIcon = flow.trend === 'rising' ? TrendingUp : 
                   flow.trend === 'falling' ? TrendingDown : Minus;

  const trendColor = flow.trend === 'rising' ? 'text-green-400' :
                    flow.trend === 'falling' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="flex items-center gap-1">
      <span className="capitalize">{flow.previous}</span>
      <span>→</span>
      <span className="capitalize">{flow.current}</span>
      <TrendIcon className={cn('w-3 h-3', trendColor)} />
    </div>
  );
};
*/

/**
 * ムード可視化コンポーネント
 */
/*
const MoodVisualization: React.FC<{ timeline: MoodTimeline }> = ({ timeline }) => {
  const recentPoints = timeline.timeline.slice(-10); // 最新10ポイント

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="p-3 bg-gray-800/50 rounded-lg space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">会話のムード</span>
        <span className="text-xs text-purple-400 capitalize">{timeline.overallMood}</span>
      </div>
      
      <div className="flex items-end gap-1 h-8">
        {recentPoints.map((point, index) => (
          <motion.div
            key={point.timestamp}
            initial={{ height: 0 }}
            animate={{ height: `${Math.abs(point.valence) * 100}%` }}
            className={cn(
              'flex-1 rounded-t',
              point.valence > 0 ? 'bg-green-400/60' : 'bg-red-400/60'
            )}
            transition={{ delay: index * 0.05 }}
          />
        ))}
      </div>
      
      {timeline.recommendation && (
        <p className="text-xs text-gray-300 italic">
          {timeline.recommendation}
        </p>
      )}
    </motion.div>
  );
};
*/

/**
 * 感情に基づく自動リアクション表示
 */
export const EmotionReactions: React.FC<{ 
  emotion: EmotionResult;
  onReactionTriggered?: (reaction: EmotionResult['suggestedReactions'][0]) => void;
}> = ({ emotion, onReactionTriggered }) => {
  const { settings } = useEffectSettings();

  useEffect(() => {
    if (!settings.autoReactions) return;

    // 自動リアクションを実行
    emotion.suggestedReactions.forEach((reaction, index) => {
      setTimeout(() => {
        if (onReactionTriggered) {
          onReactionTriggered(reaction);
        }
      }, index * 200);
    });
  }, [emotion, settings.autoReactions, onReactionTriggered]);

  if (!settings.autoReactions) return null;

  return (
    <AnimatePresence>
      {emotion.suggestedReactions.map((reaction, index) => (
        <motion.div
          key={`${reaction.type}-${index}`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ delay: index * 0.1 }}
          className="absolute top-0 right-0 pointer-events-none"
        >
          {reaction.type === 'visual' && (
            <div 
              className="w-6 h-6 rounded-full animate-pulse"
              style={{ backgroundColor: reaction.color }}
            />
          )}
        </motion.div>
      ))}
    </AnimatePresence>
  );
};