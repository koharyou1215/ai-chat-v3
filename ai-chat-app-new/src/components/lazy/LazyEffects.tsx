'use client';

/**
 * Lazy-loaded effect components that include heavy animation dependencies
 * These are separated for even more granular code splitting
 */

import { lazy } from 'react';

// Advanced effect components with heavy dependencies - removed invalid default import

export const HologramMessage = lazy(() => 
  import('../chat/AdvancedEffects').then(module => ({ 
    default: module.HologramMessage 
  }))
);

export const ParticleText = lazy(() => 
  import('../chat/AdvancedEffects').then(module => ({ 
    default: module.ParticleText 
  }))
);

export const NeumorphicRipple = lazy(() => 
  import('../chat/AdvancedEffects').then(module => ({ 
    default: module.NeumorphicRipple 
  }))
);

export const BackgroundParticles = lazy(() => 
  import('../chat/AdvancedEffects').then(module => ({ 
    default: module.BackgroundParticles 
  }))
);

// Emotion effect components
export const SoloEmotionalEffects = lazy(() => 
  import('../emotion/SoloEmotionalEffects').then(module => ({ default: module.SoloEmotionalEffects }))
);

export const EmotionDisplay = lazy(() => 
  import('../emotion/EmotionDisplay').then(module => ({ default: module.EmotionDisplay }))
);

// Message effects
export const MessageEffects = lazy(() => 
  import('../chat/MessageEffects').then(module => ({ 
    default: module.MessageEffects 
  }))
);

// Rich message components
export const RichMessage = lazy(() => 
  import('../chat/RichMessage').then(module => ({ default: module.RichMessage }))
);

// Loading fallback for effects
export const EffectLoadingFallback: React.FC = () => (
  <div className="w-full h-6 bg-gradient-to-r from-transparent via-purple-400/5 to-transparent animate-pulse rounded" />
);

// Heavy loading fallback for complex effects
export const HeavyEffectLoadingFallback: React.FC = () => (
  <div className="w-full h-32 bg-slate-800/10 border border-white/5 rounded-lg flex items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <div className="w-8 h-8 border-3 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      <span className="text-white/40 text-xs">エフェクトを読み込み中...</span>
    </div>
  </div>
);