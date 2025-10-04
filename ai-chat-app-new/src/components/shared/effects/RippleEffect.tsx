"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMessageEffects } from "@/hooks/useMessageEffects";

export interface RippleEffectProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}

interface Ripple {
  x: number;
  y: number;
  id: number;
}

/**
 * ニューモーフィックリップルエフェクト
 * タッチ位置から波紋が広がるエフェクト
 */
export const RippleEffect: React.FC<RippleEffectProps> = ({
  children,
  className = "",
  intensity,
}) => {
  const {
    isEffectEnabled,
    calculateEffectValues,
    scheduleCleanup,
    settings
  } = useMessageEffects();

  const [ripples, setRipples] = useState<Ripple[]>([]);
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  const effectIntensity = intensity ?? settings.threeDEffects?.ripple.intensity ?? 60;
  const { scaledDuration, opacityValue } = calculateEffectValues(effectIntensity);

  const handleClick = (e: React.MouseEvent) => {
    if (!isEffectEnabled('ripple')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple = { x, y, id: Math.random() };
    setRipples((prev) => [...prev, newRipple]);

    scheduleCleanup(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, scaledDuration * 1000);
  };

  // コンポーネントアンマウント時にタイマーをクリーンアップ
  useEffect(() => {
    return () => {
      const timeouts = timeoutsRef.current;
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      timeouts.clear();
    };
  }, []);

  if (!isEffectEnabled('ripple')) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onClick={handleClick}
    >
      {children}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            className="absolute pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              x: "-50%",
              y: "-50%",
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: scaledDuration,
              ease: "easeOut",
            }}
          >
            <div
              className="w-20 h-20 rounded-full"
              style={{
                background: `radial-gradient(circle, rgba(139, 92, 246, ${opacityValue * 0.3}) 0%, transparent 70%)`,
                boxShadow: `
                  inset 0 0 ${effectIntensity * 0.2}px rgba(139, 92, 246, ${opacityValue * 0.2}),
                  0 0 ${effectIntensity * 0.4}px rgba(139, 92, 246, ${opacityValue * 0.3})
                `,
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};