"use client";

import React from "react";
import { useMessageEffects } from "@/hooks/useMessageEffects";
import { ClientOnly } from "@/components/utils/ClientOnly";

export interface HologramEffectProps {
  text: string;
  className?: string;
  intensity?: number;
}

/**
 * 3Dホログラムメッセージ
 * WebGLを使用した立体的なメッセージ表示
 */
export const HologramEffect: React.FC<HologramEffectProps> = ({
  text: _text,
  className = "",
  intensity,
}) => {
  const {
    isEffectEnabled,
    animationSpeed,
    calculateEffectValues,
    settings
  } = useMessageEffects();

  // 3D機能は無効化されているため、軽量版を表示
  if (!isEffectEnabled('hologram')) return null;

  const effectIntensity = intensity ?? settings.threeDEffects?.hologram.intensity ?? 40;
  const { scaledDuration, opacityValue } = calculateEffectValues(effectIntensity);

  return (
    <ClientOnly
      fallback={
        <div className="w-full h-48 bg-slate-800/20 rounded-lg animate-pulse" />
      }>
      <div className={`w-full h-48 relative ${className}`}>
        <div className="w-full h-full bg-slate-800/20 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div
              className="text-2xl font-bold text-green-400 mb-2"
              style={{
                textShadow: `0 0 ${effectIntensity * 0.2}px #00ff88`,
                filter: `brightness(${1 + (effectIntensity / 100)})`,
              }}
            >
              Hologram Effect
            </div>
            <div className="text-sm text-gray-400">
              3D機能は現在無効化されています
            </div>
          </div>
        </div>

        {/* ホログラム効果のオーバーレイ */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="w-full h-full"
            style={{
              opacity: opacityValue * 0.2,
              background:
                "linear-gradient(45deg, transparent 40%, #00ff88 50%, transparent 60%)",
              animation: `hologram-scan ${scaledDuration}s infinite linear`,
            }}
          />
        </div>

        {/* グリッド効果 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: opacityValue * 0.1,
            backgroundImage: `
              linear-gradient(0deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        {/* スキャンライン効果 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: opacityValue * 0.3,
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 255, 136, 0.05) 2px,
              rgba(0, 255, 136, 0.05) 4px
            )`,
          }}
        />

        <style jsx>{`
          @keyframes hologram-scan {
            0% {
              transform: translateY(-100%);
            }
            100% {
              transform: translateY(100%);
            }
          }
        `}</style>
      </div>
    </ClientOnly>
  );
};