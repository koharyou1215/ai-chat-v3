/**
 * 互換性フック - EffectSettingsContextからZustandへの移行用
 * 既存のコンポーネントが動作し続けるようにする
 */

import { useAppStore } from '@/store';

export function useEffectSettings() {
  const effectSettings = useAppStore((state) => state.effectSettings);
  const updateEffectSettings = useAppStore((state) => state.updateEffectSettings);
  const emotionalIntelligenceFlags = useAppStore((state) => state.emotionalIntelligenceFlags);

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
      realtimeEmotion: false,
      emotionBasedStyling: false,
      autoReactions: false,
      emotionStylingIntensity: 45,
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