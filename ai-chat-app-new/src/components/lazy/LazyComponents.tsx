'use client';

/**
 * Centralized lazy loading definitions for code splitting optimization
 * This file contains all lazy-loaded components to improve initial bundle size
 */

import { lazy } from 'react';

// ===== MODAL COMPONENTS (Heavy UI Components) =====

// Character-related modals
export const CharacterGalleryModal = lazy(() => 
  import('../character/CharacterGalleryModal').then(module => ({ 
    default: module.CharacterGalleryModal 
  }))
);

export const CharacterForm = lazy(() => 
  import('../character/CharacterForm').then(module => ({ 
    default: module.CharacterForm 
  }))
);

// Persona-related modals
export const PersonaGalleryModal = lazy(() => 
  import('../persona/PersonaGalleryModal').then(module => ({ 
    default: module.PersonaGalleryModal 
  }))
);

export const PersonaDetailModal = lazy(() => 
  import('../persona/PersonaDetailModal').then(module => ({ 
    default: module.PersonaDetailModal 
  }))
);

// Settings and configuration modals
export const SettingsModal = lazy(() => 
  import('../settings/SettingsModal')
);

export const VoiceSettingsModal = lazy(() => 
  import('../voice/VoiceSettingsModal').then(module => ({ 
    default: module.VoiceSettingsModal 
  }))
);

// Chat-related modals
export const ChatHistoryModal = lazy(() => 
  import('../history/ChatHistoryModal').then(module => ({ 
    default: module.ChatHistoryModal 
  }))
);

export const SuggestionModal = lazy(() => 
  import('../chat/SuggestionModal').then(module => ({ 
    default: module.SuggestionModal 
  }))
);

export const ScenarioSetupModal = lazy(() => 
  import('../chat/ScenarioSetupModal').then(module => ({ 
    default: module.ScenarioSetupModal 
  }))
);

export const CharacterReselectionModal = lazy(() => 
  import('../chat/CharacterReselectionModal').then(module => ({ 
    default: module.CharacterReselectionModal 
  }))
);

// ===== GALLERY COMPONENTS (Content-heavy) =====

export const CharacterGallery = lazy(() => 
  import('../character/CharacterGallery').then(module => ({ 
    default: module.CharacterGallery 
  }))
);

export const PersonaGallery = lazy(() => 
  import('../persona/PersonaGallery').then(module => ({ 
    default: module.PersonaGallery 
  }))
);

export const MemoryGallery = lazy(() => 
  import('../memory/MemoryGallery').then(module => ({ 
    default: module.MemoryGallery 
  }))
);

// ===== EFFECT COMPONENTS (Animation-heavy) =====

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

export const MessageEffects = lazy(() => 
  import('../chat/MessageEffects').then(module => ({ 
    default: module.MessageEffects 
  }))
);

export const SoloEmotionalEffects = lazy(() => 
  import('../emotion/SoloEmotionalEffects').then(module => ({ 
    default: module.SoloEmotionalEffects 
  }))
);

// ===== ANALYSIS & TRACKING COMPONENTS =====

export const TrackerDisplay = lazy(() => 
  import('../tracker/TrackerDisplay').then(module => ({ 
    default: module.TrackerDisplay 
  }))
);

export const MemoryLayerDisplay = lazy(() => 
  import('../memory/MemoryLayerDisplay').then(module => ({ 
    default: module.MemoryLayerDisplay 
  }))
);

export const HistorySearch = lazy(() => 
  import('../history/HistorySearch').then(module => ({ 
    default: module.HistorySearch 
  }))
);

// ===== VOICE COMPONENTS =====

export const VoiceCallInterface = lazy(() => 
  import('../voice/VoiceCallInterface').then(module => ({ 
    default: module.VoiceCallInterface 
  }))
);

export const VoiceCallModal = lazy(() => 
  import('../voice/VoiceCallModal').then(module => ({ 
    default: module.VoiceCallModal 
  }))
);

// ===== GROUP CHAT COMPONENTS =====

export const GroupChatInterface = lazy(() => 
  import('../chat/GroupChatInterface').then(module => ({ 
    default: module.GroupChatInterface 
  }))
);

// ===== SPECIALIZED PANELS =====

export const AppearancePanel = lazy(() => 
  import('../character/AppearancePanel').then(module => ({ 
    default: module.AppearancePanel 
  }))
);

export const BasicInfoPanel = lazy(() => 
  import('../character/BasicInfoPanel').then(module => ({ 
    default: module.BasicInfoPanel 
  }))
);

export const PersonalityPanel = lazy(() => 
  import('../character/PersonalityPanel').then(module => ({ 
    default: module.PersonalityPanel 
  }))
);

export const TrackersPanel = lazy(() => 
  import('../character/TrackersPanel').then(module => ({ 
    default: module.TrackersPanel 
  }))
);

// ===== UTILITY COMPONENTS WITH LOADING FALLBACKS =====

// Loading fallback for modals
export const ModalLoadingFallback: React.FC = () => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      <span className="text-white/70 text-sm">読み込み中...</span>
    </div>
  </div>
);

// Loading fallback for panels
export const PanelLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-32">
    <div className="flex flex-col items-center gap-2">
      <div className="w-6 h-6 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      <span className="text-white/50 text-xs">パネルを読み込み中...</span>
    </div>
  </div>
);

// Loading fallback for galleries
export const GalleryLoadingFallback: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="bg-slate-800/50 border border-white/10 rounded-lg p-4 animate-pulse">
        <div className="w-full h-32 bg-slate-700/50 rounded-lg mb-3" />
        <div className="h-4 bg-slate-700/50 rounded mb-2" />
        <div className="h-3 bg-slate-700/30 rounded w-3/4" />
      </div>
    ))}
  </div>
);

// Loading fallback for effects
export const EffectLoadingFallback: React.FC = () => (
  <div className="w-full h-8 bg-gradient-to-r from-transparent via-purple-400/10 to-transparent animate-pulse rounded" />
);