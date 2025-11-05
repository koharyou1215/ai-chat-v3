/**
 * メッセージエフェクト用の共通フック
 * エフェクト設定の管理とユーティリティ関数を提供
 */

import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useEffectSettings } from './useEffectSettings';

export interface EffectConfig {
  enabled: boolean;
  intensity: number;
  animationSpeed: number;
  quality: 'low' | 'medium' | 'high';
}

export interface EffectCalculations {
  scaledIntensity: number;
  adjustedSpeed: number;
  scaledDuration: number;
  opacityValue: number;
}

export function useMessageEffects() {
  const { settings } = useEffectSettings();
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());

  // エフェクト設定の計算（メモ化）
  const effectConfig = useMemo((): EffectConfig => ({
    enabled: settings.particleEffects || settings.fontEffects || settings.threeDEffects?.hologram.enabled,
    intensity: Math.max(
      settings.particleEffectsIntensity,
      settings.fontEffectsIntensity,
      settings.threeDEffects?.hologram.intensity || 0
    ),
    animationSpeed: settings.animationSpeed,
    quality: settings.effectQuality,
  }), [
    settings.particleEffects,
    settings.fontEffects,
    settings.threeDEffects?.hologram.enabled,
    settings.particleEffectsIntensity,
    settings.fontEffectsIntensity,
    settings.threeDEffects?.hologram.intensity,
    settings.animationSpeed,
    settings.effectQuality,
  ]);

  // 個別エフェクトチェック（最適化）
  const effects = useMemo(() => ({
    particles: settings.particleEffects,
    font: settings.fontEffects,
    hologram: settings.threeDEffects?.hologram.enabled,
    typewriter: settings.typewriterEffect,
    ripple: settings.threeDEffects?.ripple.enabled,
    background: settings.threeDEffects?.backgroundParticles.enabled,
    particleText: settings.threeDEffects?.particleText.enabled,
    colorfulBubbles: settings.colorfulBubbles,
    realtimeEmotion: settings.emotion?.realtimeDetection ?? settings.realtimeEmotion,
    autoReactions: settings.emotion?.autoReactions ?? settings.autoReactions,
  }), [
    settings.particleEffects,
    settings.fontEffects,
    settings.threeDEffects?.hologram.enabled,
    settings.typewriterEffect,
    settings.threeDEffects?.ripple.enabled,
    settings.threeDEffects?.backgroundParticles.enabled,
    settings.threeDEffects?.particleText.enabled,
    settings.colorfulBubbles,
    settings.emotion?.realtimeDetection,
    settings.realtimeEmotion,
    settings.emotion?.autoReactions,
    settings.autoReactions,
  ]);

  // エフェクト計算ユーティリティ
  const calculateEffectValues = useCallback((baseIntensity: number): EffectCalculations => {
    const intensity = baseIntensity || effectConfig.intensity;
    return {
      scaledIntensity: Math.max(0, Math.min(100, intensity)),
      adjustedSpeed: Math.max(0.1, effectConfig.animationSpeed),
      scaledDuration: Math.max(0.5, 3 / effectConfig.animationSpeed),
      opacityValue: Math.max(0.1, Math.min(1, intensity / 100)),
    };
  }, [effectConfig.intensity, effectConfig.animationSpeed]);

  // フォントエフェクトスタイル計算
  const calculateFontEffects = useCallback((intensity?: number) => {
    if (!effects.font) return {};

    const effectIntensity = intensity || settings.fontEffectsIntensity;
    const calculations = calculateEffectValues(effectIntensity);

    return {
      background: effectIntensity > 30
        ? `linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3)`
        : "none",
      backgroundClip: effectIntensity > 30 ? "text" : "initial",
      WebkitBackgroundClip: effectIntensity > 30 ? "text" : "initial",
      color: effectIntensity > 30 ? "transparent" : "inherit",
      animation: effectIntensity > 50
        ? `rainbow-text ${calculations.scaledDuration}s ease-in-out infinite`
        : "none",
      textShadow: effectIntensity > 40
        ? `0 0 5px rgba(255,255,255,${calculations.opacityValue * 0.5}),
           0 0 10px rgba(255,255,255,${calculations.opacityValue * 0.3}),
           0 0 15px rgba(255,255,255,${calculations.opacityValue * 0.1})`
        : "none",
      transform: effectIntensity > 60 ? "perspective(100px) rotateX(5deg)" : "none",
      filter: effectIntensity > 70
        ? `drop-shadow(0 0 8px rgba(255,255,255,${calculations.opacityValue * 0.6}))
           brightness(1.2) contrast(1.1)`
        : "none",
    };
  }, [effects.font, settings.fontEffectsIntensity, calculateEffectValues]);

  // タイマー管理ユーティリティ
  const scheduleCleanup = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      callback();
      timersRef.current.delete(timer);
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // エフェクト有効性チェック関数
  const isEffectEnabled = useCallback((effectType: keyof typeof effects) => {
    return effects[effectType] && effectConfig.enabled;
  }, [effects, effectConfig.enabled]);

  // 品質に基づくパフォーマンス調整
  const getQualityMultiplier = useCallback(() => {
    switch (effectConfig.quality) {
      case 'low': return 0.5;
      case 'medium': return 1.0;
      case 'high': return 1.5;
      default: return 1.0;
    }
  }, [effectConfig.quality]);

  return {
    // 設定
    settings,
    effectConfig,
    effects,

    // 計算関数
    calculateEffectValues,
    calculateFontEffects,

    // ユーティリティ
    isEffectEnabled,
    getQualityMultiplier,
    scheduleCleanup,
    clearAllTimers,

    // 便利なゲッター
    isAnyEffectEnabled: effectConfig.enabled,
    animationSpeed: effectConfig.animationSpeed,
    globalIntensity: effectConfig.intensity,
  };
}

export default useMessageEffects;