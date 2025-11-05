/**
 * 互換性フック - EffectSettingsContextからZustandへの移行用
 * 既存のコンポーネントが動作し続けるようにする
 */

import { useAppStore } from '@/store';

export function useEffectSettings() {
  const effectSettings = useAppStore((state) => state.effectSettings);
  const updateEffectSettings = useAppStore((state) => state.updateEffectSettings);
  const emotionalIntelligence = useAppStore((state) => state.unifiedSettings.emotionalIntelligence);

  // 🔍 DEBUG: 設定値をログ出力
  console.log('🎨 [useEffectSettings] Current effectSettings:', {
    colorfulBubbles: effectSettings.colorfulBubbles,
    particleEffects: effectSettings.particleEffects,
    typewriterEffect: effectSettings.typewriterEffect,
    bubbleOpacity: effectSettings.bubbleOpacity,
  });

  // 🔄 後方互換性: 古いemotionalIntelligenceFlagsインターフェースを維持
  const emotionalIntelligenceFlags = {
    emotion_analysis_enabled: emotionalIntelligence.enabled && emotionalIntelligence.analysis.basic,
    emotional_memory_enabled: emotionalIntelligence.memoryEnabled,
    basic_effects_enabled: effectSettings.emotion.displayMode !== 'none',
    contextual_analysis_enabled: emotionalIntelligence.analysis.contextual,
    adaptive_performance_enabled: emotionalIntelligence.adaptivePerformance,
    visual_effects_enabled: effectSettings.emotion.displayMode === 'rich' || effectSettings.emotion.displayMode === 'standard',
    predictive_analysis_enabled: emotionalIntelligence.analysis.predictive,
    advanced_effects_enabled: effectSettings.emotion.displayMode === 'rich',
    multi_layer_analysis_enabled: emotionalIntelligence.analysis.multiLayer,
    safe_mode: emotionalIntelligence.safeMode,
    fallback_to_legacy: emotionalIntelligence.fallbackToLegacy,
    performance_monitoring: emotionalIntelligence.performanceMonitoring,
    debug_mode: emotionalIntelligence.debugMode,
  };

  const resetSettings = () => {
    // デフォルト設定にリセット
    updateEffectSettings({
      colorfulBubbles: false,
      fontEffects: false,
      particleEffects: false,
      typewriterEffect: false,
      colorfulBubblesIntensity: 50,
      fontEffectsIntensity: 50,
      particleEffectsIntensity: 30,
      typewriterIntensity: 70,
      bubbleOpacity: 85,
      bubbleBlur: true,
      threeDEffects: {
        enabled: true,
        hologram: {
          enabled: false,
          intensity: 40,
        },
        particleText: {
          enabled: false,
          intensity: 35,
        },
        ripple: {
          enabled: false,
          intensity: 60,
        },
        backgroundParticles: {
          enabled: false,
          intensity: 25,
        },
        depth: {
          enabled: true,
        },
        quality: 'medium',
      },
      emotion: {
        displayMode: 'none',
        display: {
          showText: false,
          applyColors: false,
          showIcon: false,
        },
        realtimeDetection: false,
        autoReactions: false,
        intensity: 50,
      },
      autoTrackerUpdate: true,
      showTrackers: true,
      effectQuality: 'medium',
      animationSpeed: 1.0,
      webglEnabled: true,
      adaptivePerformance: true,
      maxParticles: 2000,
      textFormatting: 'readable',
    });
  };

  return {
    settings: effectSettings,
    updateSettings: updateEffectSettings,
    resetSettings,
    emotionalIntelligenceFlags,
  };
}

export default useEffectSettings;