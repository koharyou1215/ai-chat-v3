/**
 * 互換性フック - EffectSettingsContextからZustandへの移行用
 * 既存のコンポーネントが動作し続けるようにする
 */

import { useAppStore } from '@/store';

export function useEffectSettings() {
  const effectSettings = useAppStore((state) => state.effectSettings);
  const updateEffectSettings = useAppStore((state) => state.updateEffectSettings);

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
      hologramMessages: false,
      particleText: false,
      rippleEffects: false,
      backgroundParticles: false,
      hologramIntensity: 40,
      particleTextIntensity: 35,
      rippleIntensity: 60,
      backgroundParticlesIntensity: 25,
      realtimeEmotion: false,
      emotionBasedStyling: false,
      autoReactions: false,
      emotionStylingIntensity: 45,
      autoTrackerUpdate: true,
      showTrackers: true,
      effectQuality: 'medium',
      animationSpeed: 1.0,
      textFormatting: 'readable',
    });
  };

  return {
    settings: effectSettings,
    updateSettings: updateEffectSettings,
    resetSettings,
  };
}

export default useEffectSettings;