// src/components/emotion/SoloEmotionalEffects.tsx
'use client';

import React, { useEffect, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnifiedMessage, Character } from '@/types/core/chat.types';
import { MultiLayerEmotionResult } from '@/types/core/group-emotional-intelligence.types';
import { EmotionIntelligenceSystem } from '@/services/emotion';

interface SoloEmotionalEffectsProps {
  message: UnifiedMessage;
  character?: Character;
  emotionResult?: MultiLayerEmotionResult | null;
}

/**
 * ソロチャット専用感情効果コンポーネント
 * 1対1の会話における微細な感情表現を視覚化
 */
export const SoloEmotionalEffects = memo(function SoloEmotionalEffects({
  message,
  character,
  emotionResult
}: SoloEmotionalEffectsProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [effects, setEffects] = useState<SoloEmotionEffect[]>([]);

  useEffect(() => {
    // 機能フラグチェック
    const systemStatus = EmotionIntelligenceSystem.getSystemStatus();
    if (!systemStatus.visualEffects || !emotionResult) {
      setIsVisible(false);
      return;
    }

    // ソロチャット用の控えめな効果を生成
    const soloEffects = generateSoloEmotionEffects(emotionResult, character);
    setEffects(soloEffects);
    setIsVisible(true);

    // 効果の自動フェードアウト（5秒後）
    const fadeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(fadeTimer);
  }, [emotionResult, character]);

  if (!isVisible || effects.length === 0) {
    return null;
  }

  return (
    <div className="solo-emotional-effects-container absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {effects.map((effect, index) => (
          <SoloEffectRenderer
            key={`${effect.id}-${index}`}
            effect={effect}
            message={message}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

interface SoloEffectRendererProps {
  effect: SoloEmotionEffect;
  message: UnifiedMessage;
}

/**
 * 個別効果レンダラー
 */
const SoloEffectRenderer = memo(function SoloEffectRenderer({
  effect,
  message
}: SoloEffectRendererProps) {
  
  switch (effect.type) {
    case 'subtle_aura':
      return <SubtleEmotionalAura effect={effect} />;
    
    case 'gentle_particles':
      return <GentleEmotionParticles effect={effect} />;
    
    case 'intimacy_glow':
      return <IntimacyGlow effect={effect} />;
    
    case 'conversation_depth':
      return <ConversationDepthIndicator effect={effect} />;
    
    case 'relationship_pulse':
      return <RelationshipPulse effect={effect} />;
    
    default:
      return null;
  }
});

/**
 * 微細な感情オーラ（控えめな背景効果）
 */
const SubtleEmotionalAura = memo(function SubtleEmotionalAura({
  effect
}: {
  effect: SoloEmotionEffect;
}) {
  return (
    <motion.div
      className="absolute inset-0 rounded-lg"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: effect.intensity * 0.1, // 非常に控えめ
        scale: 1,
        background: `radial-gradient(circle at center, ${effect.color}20, transparent 70%)`
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 2, ease: "easeInOut" }}
    />
  );
});

/**
 * 優しい感情パーティクル（少数の小さな粒子）
 */
const GentleEmotionParticles = memo(function GentleEmotionParticles({
  effect
}: {
  effect: SoloEmotionEffect;
}) {
  const particleCount = Math.min(Math.floor(effect.intensity * 5), 8); // 最大8個

  return (
    <div className="absolute inset-0">
      {Array.from({ length: particleCount }, (_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            backgroundColor: effect.color,
            left: `${20 + (i * 10)}%`,
            top: `${30 + (i % 3) * 20}%`,
          }}
          initial={{ opacity: 0, scale: 0, y: 10 }}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0, 1, 0],
            y: [10, -20, -30],
            x: [0, (i % 2 === 0 ? 5 : -5), (i % 2 === 0 ? 10 : -10)]
          }}
          transition={{
            duration: 3 + (i * 0.2),
            delay: i * 0.3,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );
});

/**
 * 親密度グロー（関係性が深いほど温かい光）
 */
const IntimacyGlow = memo(function IntimacyGlow({
  effect
}: {
  effect: SoloEmotionEffect;
}) {
  return (
    <motion.div
      className="absolute -inset-1 rounded-xl"
      initial={{ opacity: 0 }}
      animate={{
        opacity: effect.intensity * 0.05, // 非常に微細
        boxShadow: `0 0 ${effect.intensity * 20}px ${effect.color}30`,
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 4, ease: "easeInOut" }}
    />
  );
});

/**
 * 会話深度インジケーター（境界線の微細な変化）
 */
const ConversationDepthIndicator = memo(function ConversationDepthIndicator({
  effect
}: {
  effect: SoloEmotionEffect;
}) {
  return (
    <motion.div
      className="absolute inset-0 rounded-lg border-2 border-transparent"
      initial={{ borderColor: 'transparent' }}
      animate={{
        borderColor: `${effect.color}20`,
        borderWidth: Math.max(1, effect.intensity * 2)
      }}
      exit={{ borderColor: 'transparent' }}
      transition={{ duration: 3, ease: "easeInOut" }}
    />
  );
});

/**
 * 関係性パルス（ハートビートのような微細な動き）
 */
const RelationshipPulse = memo(function RelationshipPulse({
  effect
}: {
  effect: SoloEmotionEffect;
}) {
  return (
    <motion.div
      className="absolute top-2 right-2 w-2 h-2 rounded-full"
      style={{ backgroundColor: effect.color }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.4, 0],
        scale: [0.8, 1.2, 0.8],
      }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
});

// 型定義
interface SoloEmotionEffect {
  id: string;
  type: 'subtle_aura' | 'gentle_particles' | 'intimacy_glow' | 'conversation_depth' | 'relationship_pulse';
  intensity: number; // 0-1
  color: string;
  duration: number;
  delay: number;
}

/**
 * ソロチャット用感情効果生成器
 */
function generateSoloEmotionEffects(
  emotionResult: MultiLayerEmotionResult,
  character?: Character
): SoloEmotionEffect[] {
  const effects: SoloEmotionEffect[] = [];
  const { deep } = emotionResult;
  
  // 主要感情に基づく効果選択（控えめに）
  const dominantEmotion = getDominantEmotion(deep);
  const emotionColor = getEmotionColor(dominantEmotion);
  
  // 感情強度が閾値を超えた場合のみ表示（スパムを防ぐ）
  if (deep.intensity > 0.3) {
    
    // 1. 基本的な感情オーラ（常に表示）
    effects.push({
      id: 'base_aura',
      type: 'subtle_aura',
      intensity: deep.intensity,
      color: emotionColor,
      duration: 4000,
      delay: 0
    });

    // 2. 高い信頼度の場合は親密度グロー
    if (deep.trust > 0.5 && deep.confidence > 0.7) {
      effects.push({
        id: 'intimacy',
        type: 'intimacy_glow', 
        intensity: deep.trust,
        color: '#ff9999', // 暖色
        duration: 6000,
        delay: 500
      });
    }

    // 3. 強い感情の場合は微細なパーティクル
    if (deep.intensity > 0.6) {
      effects.push({
        id: 'particles',
        type: 'gentle_particles',
        intensity: deep.intensity,
        color: emotionColor,
        duration: 3000,
        delay: 1000
      });
    }

    // 4. 深い会話の場合は境界線効果
    if (emotionResult.conversation_context?.relationship_stage === 'close_relationship' ||
        emotionResult.conversation_context?.relationship_stage === 'deep_bond') {
      effects.push({
        id: 'depth',
        type: 'conversation_depth',
        intensity: 0.5,
        color: emotionColor,
        duration: 5000,
        delay: 1500
      });
    }

    // 5. 期待感が高い場合は関係性パルス
    if (deep.anticipation > 0.7) {
      effects.push({
        id: 'pulse',
        type: 'relationship_pulse',
        intensity: deep.anticipation,
        color: '#66b3ff', // 青系
        duration: 4000,
        delay: 2000
      });
    }
  }

  return effects;
}

/**
 * 支配的な感情を特定
 */
function getDominantEmotion(emotion: any): string {
  const emotions = {
    joy: emotion.joy,
    sadness: emotion.sadness,
    anger: emotion.anger,
    fear: emotion.fear,
    surprise: emotion.surprise,
    disgust: emotion.disgust,
    trust: emotion.trust,
    anticipation: emotion.anticipation
  };

  return Object.entries(emotions).reduce((a, b) => 
    emotions[a[0] as keyof typeof emotions] > emotions[b[0] as keyof typeof emotions] ? a : b
  )[0];
}

/**
 * 感情に対応する色を取得
 */
function getEmotionColor(emotion: string): string {
  const emotionColors = {
    joy: '#ffeb3b',      // 明るい黄色
    sadness: '#2196f3',   // 青
    anger: '#f44336',     // 赤
    fear: '#9c27b0',      // 紫
    surprise: '#ff9800',  // オレンジ
    disgust: '#4caf50',   // 緑
    trust: '#00bcd4',     // シアン
    anticipation: '#e91e63' // ピンク
  };

  return emotionColors[emotion as keyof typeof emotionColors] || '#757575';
}