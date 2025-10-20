'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffectSettings } from '@/hooks/useEffectSettings';
import { EmotionResult } from '@/services/emotion/EmotionAnalyzer';

interface MessageEffectsProps {
  trigger: string;
  position: { x: number; y: number };
  emotion?: EmotionResult; // 感情分析結果からの自動エフェクト
}

export const MessageEffects: React.FC<MessageEffectsProps> = ({
  trigger,
  position,
  emotion
}) => {
  const { settings, emotionalIntelligenceFlags } = useEffectSettings();
  const [effects, setEffects] = useState<Array<{ id: string; type?: string; delay?: number; x?: number; y?: number; angle?: number; distance?: number }>>([]);
  const timeoutsRef = React.useRef<NodeJS.Timeout[]>([]);

  // 感情ベースの自動エフェクトトリガー
  useEffect(() => {
    if (!settings || !settings.emotion.autoReactions || !emotionalIntelligenceFlags.visual_effects_enabled) return;
    if (!emotion || emotion.intensity < 0.5) return; // 低強度は無視

    const emotionEffectMap: Record<string, () => void> = {
      'joy': () => createSparkles(),
      'love': () => createHeartShower(),
      'excitement': () => createConfetti(),
      'surprise': () => createStarBurst(),
      'gratitude': () => createSparkles(),
      'happiness': () => createRainbow(),
    };

    const effectFn = emotionEffectMap[emotion.primary];
    if (effectFn) {
      effectFn();
    }
  }, [emotion, settings, emotionalIntelligenceFlags.visual_effects_enabled]);

  // キーワードベースのエフェクトトリガー（既存機能）
  useEffect(() => {
    // 防御的チェック：settings が未定義の場合は無視
    if (!settings || !settings.particleEffects || !trigger) return;

    // effects.length チェックは副作用の重複トリガーを防げない場合があるため、
    // 明示的なキーワードベースの発火管理を使用する
    const effectMap: Record<string, () => void> = {
      '愛してる': () => createHeartShower(),
      'おめでとう': () => createConfetti(),
      'ありがとう': () => createSparkles(),
      '素晴らしい': () => createStarBurst(),
      '最高': () => createRainbow(),
    };

    // 文字列マッチングは大文字小文字の差を考慮
    const lowered = trigger.toLowerCase();

    for (const keyword of Object.keys(effectMap)) {
      if (lowered.includes(keyword)) {
        effectMap[keyword]();
        break; // 一つだけトリガー
      }
    }
  }, [trigger, settings]);

  // コンポーネントアンマウント時のクリーンアップ
  React.useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, []);

  const createHeartShower = () => {
    const hearts = Array.from({ length: 8 }, (_, i) => ({
      id: `heart-${Date.now()}-${i}`,
      delay: i * 150,
      x: Math.random() * 150 - 75,
      y: Math.random() * 80
    }));

    setEffects(prev => [...prev, ...hearts]);
    const timeoutId = setTimeout(() => {
      setEffects(prev => prev.filter(e => !hearts.find(h => h.id === e.id)));
    }, 2500);
    timeoutsRef.current.push(timeoutId);
  };

  const createSparkles = () => {
    const sparkles = Array.from({ length: 6 }, (_, i) => ({
      id: `sparkle-${Date.now()}-${i}`,
      delay: i * 100,
      x: Math.random() * 120 - 60,
      y: Math.random() * 120 - 60
    }));

    setEffects(prev => [...prev, ...sparkles]);
    const timeoutId = setTimeout(() => {
      setEffects(prev => prev.filter(e => !sparkles.find(s => s.id === e.id)));
    }, 1800);
    timeoutsRef.current.push(timeoutId);
  };

  const createStarBurst = () => {
    const stars = Array.from({ length: 5 }, (_, i) => ({
      id: `star-${Date.now()}-${i}`,
      angle: (360 / 5) * i,
      distance: 80
    }));

    setEffects(prev => [...prev, ...stars]);
    const timeoutId = setTimeout(() => {
      setEffects(prev => prev.filter(e => !stars.find(s => s.id === e.id)));
    }, 1200);
    timeoutsRef.current.push(timeoutId);
  };

  const createConfetti = () => {
    setEffects(prev => [...prev, { id: `confetti-${Date.now()}`, type: 'confetti' }]);
    const timeoutId = setTimeout(() => {
      setEffects(prev => prev.filter(e => !e.id.startsWith('confetti')));
    }, 2000);
    timeoutsRef.current.push(timeoutId);
  };

  const createRainbow = () => {
    setEffects(prev => [...prev, { id: `rainbow-${Date.now()}`, type: 'rainbow' }]);
    const timeoutId = setTimeout(() => {
      setEffects(prev => prev.filter(e => !e.id.startsWith('rainbow')));
    }, 3000);
    timeoutsRef.current.push(timeoutId);
  };

  return (
    <AnimatePresence>
      {effects.map(effect => {
        if (effect.id.startsWith('heart')) {
          return (
            <motion.div
              key={effect.id}
              initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              animate={{ 
                x: effect.x ?? 0,
                y: -(effect.y ?? 0) - 100,
                scale: [0, 1.5, 0.5],
                opacity: [0, 1, 1, 0]
              }}
              transition={{ 
                duration: Math.max(1.5, 2.5 / settings.animationSpeed),
                delay: (effect.delay || 0) / 1000,
                ease: 'easeOut'
              }}
              className="absolute pointer-events-none text-3xl"
              style={{ left: position.x, top: position.y, zIndex: 1000 }}
            >
              💕
            </motion.div>
          );
        }

        if (effect.id.startsWith('sparkle')) {
          return (
            <motion.div
              key={effect.id}
              initial={{ x: position.x, y: position.y, scale: 0, opacity: 0 }}
              animate={{
                x: position.x + (effect.x ?? 0),
                y: position.y + (effect.y ?? 0),
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: Math.max(1.0, 1.5 / settings.animationSpeed),
                delay: (effect.delay || 0) / 1000,
                ease: 'easeOut'
              }}
              className="absolute pointer-events-none text-2xl"
              style={{ zIndex: 1000 }}
            >
              ✨
            </motion.div>
          );
        }

        if (effect.id.startsWith('star')) {
          const rad = ((effect.angle ?? 0) * Math.PI) / 180;
          const x = Math.cos(rad) * (effect.distance ?? 100);
          const y = Math.sin(rad) * (effect.distance ?? 100);

          return (
            <motion.div
              key={effect.id}
              initial={{ x: position.x, y: position.y, scale: 0, opacity: 1 }}
              animate={{
                x: position.x + x,
                y: position.y + y,
                scale: [0, 1.5, 0],
                opacity: [1, 1, 0],
                rotate: 360
              }}
              transition={{ duration: 1.5 / settings.animationSpeed, ease: 'easeOut' }}
              className="absolute pointer-events-none text-2xl"
              style={{ zIndex: 1000 }}
            >
              ⭐
            </motion.div>
          );
        }

        if (effect.type === 'confetti') {
          return (
            <motion.div
              key={effect.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.5, 1.5, 0] }}
              transition={{ duration: 2 / settings.animationSpeed }}
              className="absolute pointer-events-none text-6xl"
              style={{ left: position.x - 30, top: position.y - 30, zIndex: 999 }}
            >
              🎉
            </motion.div>
          );
        }

        if (effect.type === 'rainbow') {
          return (
            <motion.div
              key={effect.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.5, 1.5, 0] }}
              transition={{ duration: 3 / settings.animationSpeed }}
              className="absolute pointer-events-none text-6xl"
              style={{ left: position.x - 50, top: position.y - 30, zIndex: 999 }}
            >
              🌈
            </motion.div>
          );
        }

        return null;
      })}
    </AnimatePresence>
  );
};

export default MessageEffects;