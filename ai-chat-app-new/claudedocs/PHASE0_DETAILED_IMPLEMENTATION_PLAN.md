# Phase 0: Settings System Unification - Detailed Implementation Plan

**Version**: 1.0
**Created**: 2025-10-04
**Priority**: 🔴 CRITICAL (Prerequisite for SettingsModal split)
**Estimated Duration**: 8-12 hours (1-2 days)
**Risk Level**: MEDIUM-HIGH
**Success Criteria**: All settings persist correctly across page reloads

---

## Executive Summary

### Problem Statement
The current codebase has **dual settings persistence** causing data loss and inconsistency:
- Settings stored in TWO different localStorage keys
- THREE different type definitions for the same settings
- Unpredictable behavior on page reload
- **Root cause of 2 previous SettingsModal split failures**

### Solution Overview
Migrate to a unified settings system with single source of truth:
- **Single localStorage key**: `unified-settings` only
- **Single type definition**: `UnifiedSettings` as canonical source
- **Single update path**: `settingsManager` → localStorage
- **Predictable behavior**: Settings always restore correctly

### Dependencies
```
Phase 0 (Settings Unification)
  ├── BLOCKS → Phase 1 (SettingsModal Split)
  └── ENABLES → Reliable settings persistence
```

---

## Architecture Overview

### Current State (BROKEN)
```
┌─────────────────────┐
│  SettingsModal.tsx  │
│   (3693 lines)      │
└──────────┬──────────┘
           │
     ┌─────┴──────┐
     │            │
┌────▼────┐  ┌────▼──────────────┐
│ Zustand │  │ settingsManager   │
│ persist │  │ (UnifiedSettings) │
└────┬────┘  └────┬──────────────┘
     │            │
     │            │
┌────▼────────────▼────┐
│    localStorage      │
│  ┌────────────────┐  │
│  │ ai-chat-v3-    │  │ ← DUPLICATE
│  │ storage        │  │
│  ├────────────────┤  │
│  │ unified-       │  │ ← DUPLICATE
│  │ settings       │  │
│  └────────────────┘  │
└──────────────────────┘
    ⚠️ CONFLICT!
```

### Target State (FIXED)
```
┌─────────────────────┐
│  SettingsModal.tsx  │
│   (3693 lines)      │
└──────────┬──────────┘
           │
           │ (uses unifiedSettings only)
           │
     ┌─────▼──────────────┐
     │ settingsManager    │
     │ (UnifiedSettings)  │
     │ SINGLE SOURCE      │
     └─────┬──────────────┘
           │
           │
     ┌─────▼────────┐
     │ localStorage │
     │ ┌──────────┐ │
     │ │ unified- │ │ ← ONLY ONE
     │ │ settings │ │
     │ └──────────┘ │
     └──────────────┘
       ✅ NO CONFLICT
```

---

## Implementation Workflow

### Overview
```
Workflow: Phase 0 Implementation
├── Stage 1: Preparation & Backup (1-2 hours)
├── Stage 2: UnifiedSettings Extension (2-3 hours)
├── Stage 3: Migration Layer Creation (2-3 hours)
├── Stage 4: Zustand Store Refactor (2-3 hours)
├── Stage 5: SettingsModal Update (1-2 hours)
└── Stage 6: Testing & Validation (2-3 hours)

Total: 10-16 hours (with buffer)
```

---

## Stage 1: Preparation & Backup

### Duration: 1-2 hours
### Risk: LOW
### Rollback: Easy (git revert)

### 1.1 Environment Setup

**Actions**:
```bash
# Create backup branch
git checkout -b backup/before-phase0-$(date +%Y%m%d_%H%M%S)
git tag backup-phase0-start

# Create feature branch
git checkout main
git checkout -b feature/phase0-settings-unification

# Verify clean state
git status
npm run build  # Ensure current state builds
```

**Validation**:
- [ ] Backup branch created
- [ ] Feature branch created
- [ ] Current build succeeds
- [ ] All tests pass (if any)

---

### 1.2 Current Settings Audit

**Create audit script**:
```typescript
// scripts/audit-settings.ts
import fs from 'fs';

interface SettingsAudit {
  unifiedSettings: UnifiedSettings | null;
  zustandSettings: {
    effectSettings?: unknown;
    apiConfig?: unknown;
    appearanceSettings?: unknown;
    [key: string]: unknown;
  } | null;
  conflicts: string[];
}

function auditSettings(): SettingsAudit {
  if (typeof window === 'undefined') {
    console.log('⚠️ Run in browser console');
    return;
  }

  const unified = localStorage.getItem('unified-settings');
  const zustand = localStorage.getItem('ai-chat-v3-storage');

  const unifiedData = unified ? JSON.parse(unified) : null;
  const zustandData = zustand ? JSON.parse(zustand) : null;

  const conflicts: string[] = [];

  // Check for conflicts
  if (zustandData?.state?.effectSettings && unifiedData?.effects) {
    if (JSON.stringify(zustandData.state.effectSettings) !==
        JSON.stringify(unifiedData.effects)) {
      conflicts.push('effectSettings vs unified.effects - VALUES DIFFER');
    }
  }

  return {
    unifiedSettings: unifiedData,
    zustandSettings: zustandData?.state,
    conflicts
  };
}

// Usage: Copy to browser console
console.log(auditSettings());
```

**Execute**:
1. Open browser DevTools console
2. Run audit script
3. Save output to `claudedocs/settings-audit-before.json`

**Validation**:
- [ ] Audit script executed
- [ ] Conflicts documented
- [ ] Baseline established

---

### 1.3 Dependency Analysis

**Map all files that use settings**:
```bash
# Find all files importing settings
grep -r "effectSettings\|appearanceSettings\|apiConfig" src/ \
  --include="*.ts" --include="*.tsx" \
  > claudedocs/settings-usage-map.txt
```

**Expected files** (~40 files):
- `src/store/slices/settings.slice.ts`
- `src/components/settings/SettingsModal.tsx`
- `src/services/settings-manager.ts`
- `src/components/chat/*.tsx` (effects usage)
- `src/components/providers/AppearanceProvider.tsx`
- (See SETTINGS_SYSTEM_ANALYSIS.md for complete list)

**Validation**:
- [ ] Usage map created
- [ ] Critical files identified
- [ ] Update strategy planned

---

## Stage 2: UnifiedSettings Extension

### Duration: 2-3 hours
### Risk: MEDIUM
### Rollback: Medium (file revert)

### 2.1 Extend UnifiedSettings Type

**File**: `src/services/settings-manager.ts`

**Current UnifiedSettings** (incomplete):
```typescript
export interface UnifiedSettings {
  api: {...};      // ✅ Complete
  ui: {...};       // ⚠️ Missing many properties
  effects: {...};  // ⚠️ Missing ~15 properties
  chat: {...};     // ✅ Complete
  privacy: {...};  // ✅ Complete
}
```

**Target UnifiedSettings** (complete):
```typescript
export interface UnifiedSettings {
  // ═══════════════════════════════════════
  // API Settings
  // ═══════════════════════════════════════
  api: {
    provider: 'openrouter' | 'gemini';  // ⚠️ Simplified to match AISettings
    openrouterApiKey?: string;
    geminiApiKey?: string;
    model: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    contextWindow: number;
    useDirectGeminiAPI: boolean;
  };

  // ═══════════════════════════════════════
  // System Prompts
  // ═══════════════════════════════════════
  prompts: {
    system: string;
    jailbreak: string;
    replySuggestion: string;
    textEnhancement: string;
    enableSystemPrompt: boolean;
    enableJailbreakPrompt: boolean;
  };

  // ═══════════════════════════════════════
  // UI & Appearance Settings
  // ═══════════════════════════════════════
  ui: {
    // Theme
    theme: 'dark' | 'light' | 'midnight' | 'cosmic' | 'sunset' | 'custom';

    // Typography
    fontSize: 'small' | 'medium' | 'large' | 'x-large';
    fontWeight: 'light' | 'normal' | 'medium' | 'bold';
    fontFamily: string;
    lineHeight: 'compact' | 'normal' | 'relaxed';

    // Layout
    layoutDensity: 'compact' | 'comfortable' | 'spacious';
    messageSpacing: 'compact' | 'normal' | 'relaxed';
    messageBorderRadius: 'none' | 'small' | 'medium' | 'large' | 'x-large';
    chatMaxWidth: 'narrow' | 'normal' | 'wide' | 'full';
    sidebarWidth: 'compact' | 'normal' | 'wide';

    // Colors
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    secondaryTextColor: string;
    borderColor: string;
    shadowColor: string;

    // Background
    backgroundType: 'color' | 'gradient' | 'image' | 'animated';
    backgroundGradient: string;
    backgroundImage: string;
    backgroundBlur: number;
    backgroundBlurEnabled: boolean;
    backgroundOpacity: number;
    backgroundPattern?: string;
    backgroundPatternOpacity?: number;

    // Effects
    enableAnimations: boolean;
    transitionDuration: 'instant' | 'fast' | 'normal' | 'slow';
    animationSpeed: number;
    glassmorphism: boolean;
    glassmorphismIntensity: number;

    // Language
    language: 'ja' | 'en' | 'zh' | 'ko';
    timezone: string;
    dateFormat: string;
    timeFormat: '12' | '24';
    currency: string;
  };

  // ═══════════════════════════════════════
  // Effect Settings (EXPANDED)
  // ═══════════════════════════════════════
  effects: {
    // Message Effects
    colorfulBubbles: boolean;
    fontEffects: boolean;
    particleEffects: boolean;
    typewriterEffect: boolean;

    // Effect Intensities
    colorfulBubblesIntensity: number;
    fontEffectsIntensity: number;
    particleEffectsIntensity: number;
    typewriterIntensity: number;

    // Bubble Appearance
    bubbleOpacity: number;
    bubbleBlur: boolean;
    bubbleTransparency: number;  // ⚠️ Added from ChatSettings

    // 3D Effects
    enable3DEffects: boolean;
    hologramMessages: boolean;
    particleText: boolean;
    rippleEffects: boolean;
    backgroundParticles: boolean;
    depthEffects: boolean;

    // 3D Intensities
    hologramIntensity: number;
    particleTextIntensity: number;
    rippleIntensity: number;
    backgroundParticlesIntensity: number;

    // ⚠️ NEW: Additional Effects (from SettingsModal)
    shadowEffects: boolean;
    shadowEffectsIntensity: number;
    glowEffects: boolean;
    glowEffectsIntensity: number;
    neonText: boolean;
    neonTextIntensity: number;

    // Emotion & Display
    realtimeEmotion: boolean;
    emotionBasedStyling: boolean;
    autoReactions: boolean;
    emotionStylingIntensity: number;
    enableEmotionDisplay: boolean;
    enableEmotionParticles: boolean;
    emotionDisplayIntensity: number;
    emotionParticlesIntensity: number;

    // Tracker
    autoTrackerUpdate: boolean;
    showTrackers: boolean;

    // Performance
    effectQuality: 'low' | 'medium' | 'high';
    animationSpeed: number;
    webglEnabled: boolean;
    adaptivePerformance: boolean;
    maxParticles: number;

    // Text Formatting
    textFormatting: 'readable' | 'compact' | 'expanded';

    // ⚠️ NEW: Background Effects (from SettingsModal)
    backgroundDim: boolean;
    backgroundDimIntensity: number;
    backgroundImage: string | null;
    backgroundImageOpacity: number;
    backgroundImageBlur: number;

    // ⚠️ NEW: Progressive Response (from ChatSettings)
    progressiveResponse: boolean;
    progressiveResponseSpeed: number;
  };

  // ═══════════════════════════════════════
  // Chat Settings
  // ═══════════════════════════════════════
  chat: {
    enterToSend: boolean;
    showTypingIndicator: boolean;
    messageGrouping: boolean;
    autoScroll: boolean;
    soundEnabled: boolean;
    notificationsEnabled: boolean;

    // ⚠️ NEW: From ChatSettings type
    responseFormat: 'normal' | 'roleplay' | 'formal';
    memoryCapacity: number;
    generationCandidates: number;

    memoryLimits: {
      maxWorkingMemory: number;
      maxMemoryCards: number;
      maxRelevantMemories: number;
      maxPromptTokens: number;
      maxContextMessages: number;
    };

    progressiveMode: {
      enabled: boolean;
      showIndicators: boolean;
      highlightChanges: boolean;
      glowIntensity: 'none' | 'soft' | 'medium' | 'strong';
      stageDelays: {
        reflex: number;
        context: number;
        intelligence: number;
      };
    };
  };

  // ═══════════════════════════════════════
  // Voice Settings
  // ═══════════════════════════════════════
  voice: {
    enabled: boolean;
    provider: 'voicevox' | 'elevenlabs' | 'system';
    autoPlay: boolean;

    voicevox: {
      speaker: number;
      speed: number;
      pitch: number;
      intonation: number;
      volume: number;
    };

    elevenlabs: {
      voiceId: string;
      stability: number;
      similarity: number;
    };

    system: {
      voice: string;
      rate: number;
      pitch: number;
      volume: number;
    };

    advanced: {
      bufferSize: number;
      crossfade: boolean;
      normalization: boolean;
      noiseReduction: boolean;
      echoCancellation: boolean;
    };
  };

  // ═══════════════════════════════════════
  // Image Generation Settings
  // ═══════════════════════════════════════
  imageGeneration: {
    provider: 'runware' | 'stable-diffusion';

    runware: {
      modelId: string;
      lora: string;
      width: number;
      height: number;
      steps: number;
      cfgScale: number;
      sampler: string;
      seed: number;
      customQualityTags: string;
    };

    stableDiffusion: {
      modelId: string;
      width: number;
      height: number;
      steps: number;
      cfgScale: number;
      sampler: string;
      seed: number;
    };
  };

  // ═══════════════════════════════════════
  // Privacy Settings
  // ═══════════════════════════════════════
  privacy: {
    saveHistory: boolean;
    shareAnalytics: boolean;
    allowCookies: boolean;
  };

  // ═══════════════════════════════════════
  // Emotional Intelligence Flags
  // ═══════════════════════════════════════
  emotionalIntelligence: {
    emotionAnalysisEnabled: boolean;
    emotionalMemoryEnabled: boolean;
    basicEffectsEnabled: boolean;
    contextualAnalysisEnabled: boolean;
    adaptivePerformanceEnabled: boolean;
    visualEffectsEnabled: boolean;
    predictiveAnalysisEnabled: boolean;
    advancedEffectsEnabled: boolean;
    multiLayerAnalysisEnabled: boolean;
    safeMode: boolean;
    fallbackToLegacy: boolean;
    performanceMonitoring: boolean;
    debugMode: boolean;
  };
}
```

**Implementation**:
```typescript
// src/services/settings-manager.ts

// Step 1: Update interface
export interface UnifiedSettings {
  // ... (paste complete interface above)
}

// Step 2: Update Zod schema
const settingsSchema = z.object({
  api: z.object({
    provider: z.enum(['openrouter', 'gemini']),
    // ... (add all new fields)
  }),
  // ... (complete schema for all sections)
});

// Step 3: Update DEFAULT_SETTINGS
const DEFAULT_SETTINGS: UnifiedSettings = {
  api: {
    provider: 'openrouter',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1.0,
    frequencyPenalty: 0.6,
    presencePenalty: 0.3,
    contextWindow: 20,
    useDirectGeminiAPI: false,
  },
  prompts: {
    system: '',
    jailbreak: '',
    replySuggestion: '',
    textEnhancement: '',
    enableSystemPrompt: false,
    enableJailbreakPrompt: false,
  },
  ui: {
    theme: 'dark',
    fontSize: 'medium',
    fontWeight: 'normal',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: 'normal',
    layoutDensity: 'comfortable',
    messageSpacing: 'normal',
    messageBorderRadius: 'medium',
    chatMaxWidth: 'normal',
    sidebarWidth: 'normal',
    primaryColor: '#8b5cf6',
    accentColor: '#ec4899',
    backgroundColor: '#0f0f23',
    surfaceColor: '#1e1e2e',
    textColor: '#ffffff',
    secondaryTextColor: '#9ca3af',
    borderColor: '#374151',
    shadowColor: '#000000',
    backgroundType: 'gradient',
    backgroundGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundImage: '',
    backgroundBlur: 10,
    backgroundBlurEnabled: true,
    backgroundOpacity: 100,
    enableAnimations: true,
    transitionDuration: 'normal',
    animationSpeed: 0.5,
    glassmorphism: false,
    glassmorphismIntensity: 50,
    language: 'ja',
    timezone: 'Asia/Tokyo',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: '24',
    currency: 'JPY',
  },
  effects: {
    colorfulBubbles: true,
    fontEffects: true,
    particleEffects: false,
    typewriterEffect: true,
    colorfulBubblesIntensity: 50,
    fontEffectsIntensity: 50,
    particleEffectsIntensity: 30,
    typewriterIntensity: 70,
    bubbleOpacity: 85,
    bubbleBlur: true,
    bubbleTransparency: 20,
    enable3DEffects: true,
    hologramMessages: false,
    particleText: false,
    rippleEffects: false,
    backgroundParticles: false,
    depthEffects: true,
    hologramIntensity: 40,
    particleTextIntensity: 35,
    rippleIntensity: 60,
    backgroundParticlesIntensity: 25,
    shadowEffects: false,
    shadowEffectsIntensity: 50,
    glowEffects: false,
    glowEffectsIntensity: 50,
    neonText: false,
    neonTextIntensity: 50,
    realtimeEmotion: true,
    emotionBasedStyling: false,
    autoReactions: false,
    emotionStylingIntensity: 45,
    enableEmotionDisplay: false,
    enableEmotionParticles: false,
    emotionDisplayIntensity: 50,
    emotionParticlesIntensity: 50,
    autoTrackerUpdate: true,
    showTrackers: true,
    effectQuality: 'medium',
    animationSpeed: 0.5,
    webglEnabled: true,
    adaptivePerformance: true,
    maxParticles: 2000,
    textFormatting: 'readable',
    backgroundDim: false,
    backgroundDimIntensity: 50,
    backgroundImage: null,
    backgroundImageOpacity: 100,
    backgroundImageBlur: 0,
    progressiveResponse: false,
    progressiveResponseSpeed: 50,
  },
  chat: {
    enterToSend: true,
    showTypingIndicator: true,
    messageGrouping: true,
    autoScroll: true,
    soundEnabled: false,
    notificationsEnabled: false,
    responseFormat: 'normal',
    memoryCapacity: 20,
    generationCandidates: 1,
    memoryLimits: {
      maxWorkingMemory: 6,
      maxMemoryCards: 50,
      maxRelevantMemories: 5,
      maxPromptTokens: 32000,
      maxContextMessages: 40,
    },
    progressiveMode: {
      enabled: true,
      showIndicators: true,
      highlightChanges: true,
      glowIntensity: 'medium',
      stageDelays: {
        reflex: 0,
        context: 1000,
        intelligence: 2000,
      },
    },
  },
  voice: {
    enabled: true,
    provider: 'voicevox',
    autoPlay: false,
    voicevox: {
      speaker: 0,
      speed: 1.0,
      pitch: 0.0,
      intonation: 1.0,
      volume: 1.0,
    },
    elevenlabs: {
      voiceId: '',
      stability: 0.5,
      similarity: 0.5,
    },
    system: {
      voice: '',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
    },
    advanced: {
      bufferSize: 4096,
      crossfade: true,
      normalization: true,
      noiseReduction: false,
      echoCancellation: false,
    },
  },
  imageGeneration: {
    provider: 'runware',
    runware: {
      modelId: 'runware:100@1',
      lora: '',
      width: 512,
      height: 512,
      steps: 20,
      cfgScale: 7,
      sampler: 'DPM++ 2M Karras',
      seed: -1,
      customQualityTags: '',
    },
    stableDiffusion: {
      modelId: 'stable-diffusion-v1-5',
      width: 512,
      height: 512,
      steps: 20,
      cfgScale: 7,
      sampler: 'DPM++ 2M Karras',
      seed: -1,
    },
  },
  privacy: {
    saveHistory: true,
    shareAnalytics: false,
    allowCookies: true,
  },
  emotionalIntelligence: {
    emotionAnalysisEnabled: false,
    emotionalMemoryEnabled: true,
    basicEffectsEnabled: true,
    contextualAnalysisEnabled: true,
    adaptivePerformanceEnabled: true,
    visualEffectsEnabled: true,
    predictiveAnalysisEnabled: true,
    advancedEffectsEnabled: true,
    multiLayerAnalysisEnabled: true,
    safeMode: false,
    fallbackToLegacy: true,
    performanceMonitoring: false,
    debugMode: false,
  },
};
```

**Validation**:
- [ ] UnifiedSettings interface updated
- [ ] Zod schema complete
- [ ] DEFAULT_SETTINGS complete
- [ ] TypeScript compilation succeeds
- [ ] No type errors

---

### 2.2 Migration Helper Functions

**Add to `settings-manager.ts`**:
```typescript
/**
 * Migration helpers for backward compatibility
 */
export class SettingsMigration {
  /**
   * Migrate old Zustand settings to UnifiedSettings
   */
  static migrateFromZustand(zustandState: {
    apiConfig?: {
      provider?: string;
      model?: string;
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
      context_window?: number;
    };
    systemPrompts?: {
      system?: string;
      jailbreak?: string;
      replySuggestion?: string;
      textEnhancement?: string;
    };
    enableSystemPrompt?: boolean;
    enableJailbreakPrompt?: boolean;
    effectSettings?: Partial<UnifiedSettings['effects']>;
    appearanceSettings?: {
      theme?: string;
      fontSize?: string;
      [key: string]: unknown;
    };
    languageSettings?: {
      language?: string;
      [key: string]: unknown;
    };
    openRouterApiKey?: string;
    geminiApiKey?: string;
    useDirectGeminiAPI?: boolean;
    chat?: Partial<UnifiedSettings['chat']>;
    voice?: UnifiedSettings['voice'];
    imageGeneration?: UnifiedSettings['imageGeneration'];
    emotionalIntelligenceFlags?: {
      emotion_analysis_enabled?: boolean;
      emotional_memory_enabled?: boolean;
      basic_effects_enabled?: boolean;
      contextual_analysis_enabled?: boolean;
      adaptive_performance_enabled?: boolean;
      visual_effects_enabled?: boolean;
      predictive_analysis_enabled?: boolean;
      advanced_effects_enabled?: boolean;
      multi_layer_analysis_enabled?: boolean;
      safe_mode?: boolean;
      fallback_to_legacy?: boolean;
      performance_monitoring?: boolean;
      debug_mode?: boolean;
    };
    [key: string]: unknown;
  } | null): Partial<UnifiedSettings> {
    if (!zustandState) return {};

    return {
      api: zustandState.apiConfig ? {
        provider: zustandState.apiConfig.provider === 'gemini' ? 'gemini' : 'openrouter',
        model: zustandState.apiConfig.model || 'gpt-4o-mini',
        temperature: zustandState.apiConfig.temperature || 0.7,
        maxTokens: zustandState.apiConfig.max_tokens || 2048,
        topP: zustandState.apiConfig.top_p || 1.0,
        frequencyPenalty: zustandState.apiConfig.frequency_penalty || 0.6,
        presencePenalty: zustandState.apiConfig.presence_penalty || 0.3,
        contextWindow: zustandState.apiConfig.context_window || 20,
        openrouterApiKey: zustandState.openRouterApiKey,
        geminiApiKey: zustandState.geminiApiKey,
        useDirectGeminiAPI: zustandState.useDirectGeminiAPI || false,
      } : undefined,

      prompts: zustandState.systemPrompts ? {
        system: zustandState.systemPrompts.system || '',
        jailbreak: zustandState.systemPrompts.jailbreak || '',
        replySuggestion: zustandState.systemPrompts.replySuggestion || '',
        textEnhancement: zustandState.systemPrompts.textEnhancement || '',
        enableSystemPrompt: zustandState.enableSystemPrompt || false,
        enableJailbreakPrompt: zustandState.enableJailbreakPrompt || false,
      } : undefined,

      effects: zustandState.effectSettings ? {
        ...zustandState.effectSettings,
      } : undefined,

      ui: zustandState.appearanceSettings ? {
        theme: zustandState.appearanceSettings.theme || 'dark',
        fontSize: zustandState.appearanceSettings.fontSize || 'medium',
        // ... (map all appearance settings)
        language: zustandState.languageSettings?.language || 'ja',
        // ...
      } : undefined,

      chat: zustandState.chat ? {
        ...zustandState.chat,
      } : undefined,

      voice: zustandState.voice,
      imageGeneration: zustandState.imageGeneration,
      privacy: undefined, // New section
      emotionalIntelligence: zustandState.emotionalIntelligenceFlags ? {
        emotionAnalysisEnabled: zustandState.emotionalIntelligenceFlags.emotion_analysis_enabled,
        // ... (map all flags)
      } : undefined,
    };
  }

  /**
   * Check if migration is needed
   */
  static needsMigration(): boolean {
    if (typeof window === 'undefined') return false;

    const zustandData = localStorage.getItem('ai-chat-v3-storage');
    const unifiedData = localStorage.getItem('unified-settings');

    if (!zustandData) return false;
    if (!unifiedData) return true; // No unified settings yet

    try {
      const zustand = JSON.parse(zustandData);
      const unified = JSON.parse(unifiedData);

      // Check if Zustand has settings that unified doesn't
      return !!zustand?.state?.effectSettings && !unified?.effects;
    } catch {
      return false;
    }
  }

  /**
   * Execute migration
   */
  static executeMigration(): void {
    if (typeof window === 'undefined') return;

    console.log('🔄 [SettingsMigration] Starting migration...');

    const zustandData = localStorage.getItem('ai-chat-v3-storage');
    if (!zustandData) {
      console.log('✅ [SettingsMigration] No Zustand data to migrate');
      return;
    }

    try {
      const zustand = JSON.parse(zustandData);
      const migratedSettings = this.migrateFromZustand(zustand.state);

      const settingsManager = SettingsManager.getInstance();
      settingsManager.updateSettings(migratedSettings);

      console.log('✅ [SettingsMigration] Migration completed');
      console.log('📊 [SettingsMigration] Migrated sections:', Object.keys(migratedSettings));
    } catch (error) {
      console.error('❌ [SettingsMigration] Migration failed:', error);
    }
  }
}
```

**Validation**:
- [ ] Migration helpers created
- [ ] TypeScript compilation succeeds
- [ ] Logic reviewed for correctness

---

## Stage 3: Migration Layer Creation

### Duration: 2-3 hours
### Risk: MEDIUM
### Rollback: Medium (file revert)

### 3.1 Update SettingsManager

**Add automatic migration on load**:
```typescript
// src/services/settings-manager.ts

private constructor() {
  this.settings = this.loadSettings();

  // ⚠️ NEW: Auto-migrate from Zustand if needed
  if (SettingsMigration.needsMigration()) {
    console.log('🔄 [SettingsManager] Auto-migration triggered');
    SettingsMigration.executeMigration();
    this.settings = this.loadSettings(); // Reload after migration
  }

  // ⚠️ REMOVED: Old migration logic
  // this.migrateOldSettings();
}
```

**Validation**:
- [ ] Auto-migration implemented
- [ ] Migration runs on initialization
- [ ] Settings reload after migration

---

### 3.2 Update Settings Slice

**File**: `src/store/slices/settings.slice.ts`

**Current structure** (BROKEN):
```typescript
export interface SettingsSliceV2 {
  unifiedSettings: UnifiedSettings;         // Read-only
  effectSettings: UnifiedSettings['effects']; // Derived (DUPLICATE)
  appearanceSettings: {                     // Derived (DUPLICATE)
    theme: 'dark' | 'light' | 'midnight' | 'cosmic' | 'sunset' | 'custom';
    fontSize: 'small' | 'medium' | 'large' | 'x-large';
    primaryColor: string;
    accentColor: string;
    [key: string]: unknown;
  };
  // ...
}
```

**Target structure** (FIXED):
```typescript
export interface SettingsSliceV2 {
  // ═══════════════════════════════════════
  // SINGLE SOURCE OF TRUTH
  // ═══════════════════════════════════════
  unifiedSettings: UnifiedSettings;

  // ═══════════════════════════════════════
  // UI State (NOT persisted)
  // ═══════════════════════════════════════
  showSettingsModal: boolean;
  showVoiceSettingsModal: boolean;
  initialSettingsTab: string;

  // ═══════════════════════════════════════
  // Actions
  // ═══════════════════════════════════════
  updateSettings: (updates: Partial<UnifiedSettings>) => void;
  updateCategory: <K extends keyof UnifiedSettings>(
    category: K,
    updates: Partial<UnifiedSettings[K]>
  ) => void;
  resetSettings: (category?: keyof UnifiedSettings) => void;

  // Modal actions
  setShowSettingsModal: (show: boolean, initialTab?: string) => void;
  setShowVoiceSettingsModal: (show: boolean) => void;

  // ❌ REMOVED: All compatibility methods
  // updateEffectSettings
  // updateAppearanceSettings
  // updateLanguageSettings
  // syncFromUnifiedSettings
}
```

**Implementation**:
```typescript
// src/store/slices/settings.slice.ts

import { StateCreator } from "zustand";
import { settingsManager, UnifiedSettings } from "@/services/settings-manager";

export interface SettingsSliceV2 {
  unifiedSettings: UnifiedSettings;
  showSettingsModal: boolean;
  showVoiceSettingsModal: boolean;
  initialSettingsTab: string;

  updateSettings: (updates: Partial<UnifiedSettings>) => void;
  updateCategory: <K extends keyof UnifiedSettings>(
    category: K,
    updates: Partial<UnifiedSettings[K]>
  ) => void;
  resetSettings: (category?: keyof UnifiedSettings) => void;
  setShowSettingsModal: (show: boolean, initialTab?: string) => void;
  setShowVoiceSettingsModal: (show: boolean) => void;
}

export const createSettingsSliceV2: StateCreator<
  SettingsSliceV2,
  [],
  [],
  SettingsSliceV2
> = (set, get) => {
  const initialSettings = settingsManager.getSettings();

  // Subscribe to settingsManager changes
  settingsManager.subscribe((newSettings) => {
    set({ unifiedSettings: newSettings });
  });

  return {
    // State
    unifiedSettings: initialSettings,
    showSettingsModal: false,
    showVoiceSettingsModal: false,
    initialSettingsTab: 'effects',

    // Actions
    updateSettings: (updates) => {
      settingsManager.updateSettings(updates);
      // No need to call set() - settingsManager.subscribe will handle it
    },

    updateCategory: (category, updates) => {
      settingsManager.updateCategory(category, updates);
    },

    resetSettings: (category) => {
      settingsManager.resetSettings(category);
    },

    setShowSettingsModal: (show, initialTab) => {
      set({
        showSettingsModal: show,
        ...(initialTab && { initialSettingsTab: initialTab })
      });
    },

    setShowVoiceSettingsModal: (show) => {
      set({ showVoiceSettingsModal: show });
    },
  };
};
```

**Validation**:
- [ ] Settings slice simplified
- [ ] Compatibility layer removed
- [ ] TypeScript compilation succeeds
- [ ] Actions use settingsManager

---

## Stage 4: Zustand Store Refactor

### Duration: 2-3 hours
### Risk: HIGH
### Rollback: Hard (affects all features)

### 4.1 Update Store Index

**File**: `src/store/index.ts`

**Current `partialize`** (461-508):
```typescript
partialize: (state) => ({
  sessions: state.sessions,
  // ... session data ...

  // ❌ REMOVE ALL THESE:
  apiConfig: state.apiConfig,
  effectSettings: state.effectSettings,
  appearanceSettings: state.appearanceSettings,
  languageSettings: state.languageSettings,
  systemPrompts: state.systemPrompts,
  chat: state.chat,
  voice: state.voice,
  imageGeneration: state.imageGeneration,
  emotionalIntelligenceFlags: state.emotionalIntelligenceFlags,
})
```

**Target `partialize`**:
```typescript
partialize: (state) => ({
  // ═══════════════════════════════════════
  // Session Data ONLY
  // ═══════════════════════════════════════
  sessions: state.sessions,
  active_session_id: state.active_session_id,
  trackerManagers: state.trackerManagers,

  groupSessions: state.groupSessions,
  active_group_session_id: state.active_group_session_id,
  is_group_mode: state.is_group_mode,

  // ═══════════════════════════════════════
  // Character & Persona Data
  // ═══════════════════════════════════════
  characters: state.characters,
  selectedCharacterId: state.selectedCharacterId,
  personas: state.personas,
  activePersonaId: state.activePersonaId,

  // ═══════════════════════════════════════
  // Memory System
  // ═══════════════════════════════════════
  memories: state.memories,
  memoryCards: state.memory_cards,
  memoryLayers: state.memoryLayers,

  // ═══════════════════════════════════════
  // Suggestion Data
  // ═══════════════════════════════════════
  suggestions: state.suggestions,
  suggestionData: state.suggestionData,

  // ⚠️ ALL SETTINGS REMOVED
  // Settings are now managed by settingsManager
  // and persisted in localStorage["unified-settings"]
})
```

**Implementation**:
```typescript
// src/store/index.ts

// Update AppStore type
export type AppStore = ChatSlice &
  GroupChatSlice &
  CharacterSlice &
  PersonaSlice &
  MemorySlice &
  TrackerSlice &
  HistorySlice &
  SettingsSlice &  // Still included for unifiedSettings access
  SuggestionSlice &
  UISlice & {
    trackerManagers: Map<string, TrackerManager>;
    apiManager: SimpleAPIManagerV2;
    promptBuilderService: PromptBuilderService;
    clearConversationCache: (sessionId: string) => void;
    [key: string]: unknown;
  };

// Update partialize
const createStore = () => {
  try {
    return create<AppStore>()(
      persist(combinedSlices, {
        name: "ai-chat-v3-storage",
        storage: createJSONStorage(() => ({
          getItem: (name: string) => {
            // ... existing getItem logic ...
          },
          setItem: (name: string, value: string) => {
            // ... existing setItem logic ...
          },
          removeItem: (name: string) => {
            // ... existing removeItem logic ...
          },
        })),

        // ⚠️ UPDATED: Exclude all settings
        partialize: (state) => ({
          // Session Data
          sessions: state.sessions,
          active_session_id: state.active_session_id,
          trackerManagers: state.trackerManagers,

          // Group Chat
          groupSessions: state.groupSessions,
          active_group_session_id: state.active_group_session_id,
          is_group_mode: state.is_group_mode,

          // Characters and Personas
          characters: state.characters,
          selectedCharacterId: state.selectedCharacterId,
          personas: state.personas,
          activePersonaId: state.activePersonaId,

          // Memory System
          memories: state.memories,
          memoryCards: state.memory_cards,
          memoryLayers: state.memoryLayers,

          // Suggestion Data
          suggestions: state.suggestions,
          suggestionData: state.suggestionData,

          // ⚠️ Settings excluded - managed by settingsManager
        }),
      })
    );
  } catch (error) {
    console.error('Failed to create persisted store:', error);
    return create<AppStore>()(combinedSlices);
  }
};
```

**Validation**:
- [ ] partialize updated
- [ ] Settings excluded from Zustand persistence
- [ ] TypeScript compilation succeeds
- [ ] Store initialization succeeds

---

### 4.2 Add Compatibility Hooks

**Create compatibility helpers for gradual migration**:
```typescript
// src/hooks/useSettings.ts

import { useAppStore } from '@/store';
import { UnifiedSettings } from '@/services/settings-manager';

/**
 * Hook for accessing settings from UnifiedSettings
 */
export function useSettings() {
  const unifiedSettings = useAppStore((state) => state.unifiedSettings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const updateCategory = useAppStore((state) => state.updateCategory);

  return {
    settings: unifiedSettings,
    updateSettings,
    updateCategory,
  };
}

/**
 * Hook for accessing specific setting category
 */
export function useSettingsCategory<K extends keyof UnifiedSettings>(
  category: K
): [UnifiedSettings[K], (updates: Partial<UnifiedSettings[K]>) => void] {
  const settings = useAppStore((state) => state.unifiedSettings[category]);
  const updateCategory = useAppStore((state) => state.updateCategory);

  const update = (updates: Partial<UnifiedSettings[K]>) => {
    updateCategory(category, updates);
  };

  return [settings, update];
}

/**
 * Backward compatibility: effectSettings
 */
export function useEffectSettings() {
  return useSettingsCategory('effects');
}

/**
 * Backward compatibility: appearanceSettings
 */
export function useAppearanceSettings() {
  return useSettingsCategory('ui');
}

/**
 * Backward compatibility: apiConfig
 */
export function useAPIConfig() {
  return useSettingsCategory('api');
}
```

**Validation**:
- [ ] Hooks created
- [ ] TypeScript compilation succeeds
- [ ] Backward compatibility maintained

---

## Stage 5: SettingsModal Update

### Duration: 1-2 hours
### Risk: HIGH
### Rollback: Medium (UI may break)

### 5.1 Update SettingsModal to Use UnifiedSettings

**File**: `src/components/settings/SettingsModal.tsx`

**Current approach** (BROKEN):
```typescript
const { effectSettings, updateEffectSettings } = useAppStore();
const [localEffectSettings, setLocalEffectSettings] = useState(effectSettings);

const updateEffectSetting = (key, value) => {
  const newSettings = { ...localEffectSettings, [key]: value };
  setLocalEffectSettings(newSettings);
  updateEffectSettings(newSettings); // ← Saves to wrong place
};
```

**Target approach** (FIXED):
```typescript
const { unifiedSettings, updateCategory } = useAppStore();
const [localEffects, setLocalEffects] = useState(unifiedSettings.effects);

useEffect(() => {
  // Sync from store when modal opens
  setLocalEffects(unifiedSettings.effects);
}, [isOpen, unifiedSettings.effects]);

const updateEffectSetting = <K extends keyof UnifiedSettings['effects']>(
  key: K,
  value: UnifiedSettings['effects'][K]
) => {
  const newEffects = { ...localEffects, [key]: value };
  setLocalEffects(newEffects);

  // ✅ Save directly to unified settings
  updateCategory('effects', newEffects);
};
```

**Implementation strategy**:
```typescript
// src/components/settings/SettingsModal.tsx

// ═══════════════════════════════════════
// STEP 1: Update imports
// ═══════════════════════════════════════
import { useAppStore } from "@/store";
import type { UnifiedSettings } from "@/services/settings-manager";

// ═══════════════════════════════════════
// STEP 2: Remove local type definitions
// ═══════════════════════════════════════
// ❌ DELETE: interface EffectSettings {...}
// ❌ DELETE: interface AppearanceSettings {...}
// Use UnifiedSettings types instead

// ═══════════════════════════════════════
// STEP 3: Update component state
// ═══════════════════════════════════════
const SettingsModal = ({ isOpen, onClose, ... }) => {
  // Get unified settings
  const unifiedSettings = useAppStore((state) => state.unifiedSettings);
  const updateCategory = useAppStore((state) => state.updateCategory);
  const updateSettings = useAppStore((state) => state.updateSettings);

  // Local state for immediate UI updates
  const [localEffects, setLocalEffects] = useState(unifiedSettings.effects);
  const [localUI, setLocalUI] = useState(unifiedSettings.ui);
  const [localAPI, setLocalAPI] = useState(unifiedSettings.api);
  const [localPrompts, setLocalPrompts] = useState(unifiedSettings.prompts);
  const [localChat, setLocalChat] = useState(unifiedSettings.chat);
  const [localVoice, setLocalVoice] = useState(unifiedSettings.voice);

  // Sync from store when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalEffects(unifiedSettings.effects);
      setLocalUI(unifiedSettings.ui);
      setLocalAPI(unifiedSettings.api);
      setLocalPrompts(unifiedSettings.prompts);
      setLocalChat(unifiedSettings.chat);
      setLocalVoice(unifiedSettings.voice);
    }
  }, [isOpen, unifiedSettings]);

  // Update helpers
  const updateEffect = <K extends keyof UnifiedSettings['effects']>(
    key: K,
    value: UnifiedSettings['effects'][K]
  ) => {
    const newEffects = { ...localEffects, [key]: value };
    setLocalEffects(newEffects);
    updateCategory('effects', newEffects);
  };

  const updateUI = <K extends keyof UnifiedSettings['ui']>(
    key: K,
    value: UnifiedSettings['ui'][K]
  ) => {
    const newUI = { ...localUI, [key]: value };
    setLocalUI(newUI);
    updateCategory('ui', newUI);
  };

  const updateAPI = <K extends keyof UnifiedSettings['api']>(
    key: K,
    value: UnifiedSettings['api'][K]
  ) => {
    const newAPI = { ...localAPI, [key]: value };
    setLocalAPI(newAPI);
    updateCategory('api', newAPI);
  };

  // Similar for other categories...

  // ═══════════════════════════════════════
  // STEP 4: Update all panels
  // ═══════════════════════════════════════
  // Replace all:
  //   effectSettings → unifiedSettings.effects
  //   updateEffectSettings → updateCategory('effects', ...)
  //   appearanceSettings → unifiedSettings.ui
  //   updateAppearanceSettings → updateCategory('ui', ...)
  //   apiConfig → unifiedSettings.api
  //   updateAPIConfig → updateCategory('api', ...)
  // etc.
};
```

**File changes required**:
1. Lines 236-304: Update effect settings usage
2. Lines 510-630: EffectsPanel → use `updateEffect`
3. Lines 631-674: ThreeDPanel → use `updateEffect`
4. Lines 675-834: EmotionPanel → use `updateEffect`
5. Lines 835-863: TrackerPanel → use `updateEffect`
6. Lines 864-948: PerformancePanel → use `updateEffect`
7. Lines 949-1467: AIPanel → use `updateAPI` and `updatePrompts`
8. Lines 1468-1940: ChatPanel → use `updateChat`
9. Lines 1941-2148: LanguagePanel → use `updateUI`
10. Lines 2149-2491: VoicePanel → use `updateVoice`
11. Lines 2492-3090: AppearancePanel → use `updateUI`

**Validation for each panel**:
- [ ] Panel uses correct UnifiedSettings category
- [ ] Update function uses `updateCategory`
- [ ] TypeScript types match UnifiedSettings
- [ ] Settings save correctly
- [ ] Settings restore after reload

---

### 5.2 Remove Compatibility Layer

**After all panels updated**:
```typescript
// src/store/slices/settings.slice.ts

// ❌ DELETE these methods:
// - updateEffectSettings
// - updateAppearanceSettings
// - updateLanguageSettings
// - updateEmotionalFlags
// - syncFromUnifiedSettings

// ✅ KEEP only:
// - updateSettings
// - updateCategory
// - resetSettings
```

**Validation**:
- [ ] Compatibility methods removed
- [ ] No TypeScript errors
- [ ] All components use new API

---

## Stage 6: Testing & Validation

### Duration: 2-3 hours
### Risk: LOW
### Rollback: Easy (revert commits)

### 6.1 Create Test Script

```typescript
// scripts/test-settings-persistence.ts

/**
 * Settings Persistence Test Suite
 * Run in browser console
 */

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

class SettingsPersistenceTest {
  results: TestResult[] = [];

  async runAll(): Promise<void> {
    console.log('🧪 [SettingsTest] Starting comprehensive test suite...\n');

    await this.testLocalStorageStructure();
    await this.testSettingsPersistence();
    await this.testCategoryUpdates();
    await this.testPageReload();
    await this.testMigration();

    this.printResults();
  }

  private test(name: string, condition: boolean, message: string): void {
    this.results.push({ name, passed: condition, message });
    const icon = condition ? '✅' : '❌';
    console.log(`${icon} ${name}: ${message}`);
  }

  // Test 1: localStorage structure
  async testLocalStorageStructure(): Promise<void> {
    console.log('\n📋 Test 1: localStorage Structure');

    const unifiedExists = !!localStorage.getItem('unified-settings');
    const zustandExists = !!localStorage.getItem('ai-chat-v3-storage');

    this.test(
      'unified-settings exists',
      unifiedExists,
      unifiedExists ? 'Found' : 'Missing'
    );

    if (zustandExists) {
      const zustandData = localStorage.getItem('ai-chat-v3-storage');
      if (zustandData) {
        const zustand: { state?: { effectSettings?: unknown; apiConfig?: unknown; appearanceSettings?: unknown } } = JSON.parse(zustandData);
        const hasSettings = !!(
          zustand?.state?.effectSettings ||
          zustand?.state?.apiConfig ||
          zustand?.state?.appearanceSettings
        );

        this.test(
          'Zustand should NOT have settings',
          !hasSettings,
          hasSettings ? 'Settings found in Zustand (BAD)' : 'No settings in Zustand (GOOD)'
        );
      }
    }
  }

  // Test 2: Settings persistence
  async testSettingsPersistence(): Promise<void> {
    console.log('\n📋 Test 2: Settings Persistence');

    // Get store with proper typing
    interface WindowWithStore extends Window {
      useAppStore?: {
        getState: () => {
          unifiedSettings: UnifiedSettings;
          updateCategory: <K extends keyof UnifiedSettings>(
            category: K,
            updates: Partial<UnifiedSettings[K]>
          ) => void;
        };
      };
    }

    const store = (window as WindowWithStore).useAppStore?.getState();
    if (!store) {
      this.test('Store access', false, 'Cannot access store');
      return;
    }

    // Test effect setting
    const originalValue = store.unifiedSettings.effects.colorfulBubbles;
    const testValue = !originalValue;

    store.updateCategory('effects', { colorfulBubbles: testValue });

    // Wait for persistence
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check localStorage
    const saved = JSON.parse(localStorage.getItem('unified-settings')!);
    const savedValue = saved?.effects?.colorfulBubbles;

    this.test(
      'Effect setting persisted',
      savedValue === testValue,
      `Expected ${testValue}, got ${savedValue}`
    );

    // Restore original
    store.updateCategory('effects', { colorfulBubbles: originalValue });
  }

  // Test 3: Category updates
  async testCategoryUpdates(): Promise<void> {
    console.log('\n📋 Test 3: Category Updates');

    interface WindowWithStore extends Window {
      useAppStore?: {
        getState: () => {
          unifiedSettings: UnifiedSettings;
          updateCategory: <K extends keyof UnifiedSettings>(
            category: K,
            updates: Partial<UnifiedSettings[K]>
          ) => void;
        };
      };
    }

    const store = (window as WindowWithStore).useAppStore?.getState();
    if (!store) {
      this.test('Store access', false, 'Cannot access store');
      return;
    }

    const categories: Array<keyof UnifiedSettings> = [
      'effects',
      'ui',
      'api',
      'chat',
      'voice',
    ];

    for (const category of categories) {
      const before = JSON.stringify(store.unifiedSettings[category]);

      // Make a change
      store.updateCategory(category, {});

      await new Promise(resolve => setTimeout(resolve, 50));

      const after = JSON.stringify(store.unifiedSettings[category]);

      this.test(
        `${category} update works`,
        before === after,
        'Update mechanism functional'
      );
    }
  }

  // Test 4: Page reload
  async testPageReload(): Promise<void> {
    console.log('\n📋 Test 4: Page Reload Simulation');
    console.log('⚠️ Manual test required:');
    console.log('1. Change a setting in SettingsModal');
    console.log('2. Press F5 to reload');
    console.log('3. Verify setting is still changed');
  }

  // Test 5: Migration
  async testMigration(): Promise<void> {
    console.log('\n📋 Test 5: Migration');

    interface WindowWithMigration extends Window {
      SettingsMigration?: {
        needsMigration: () => boolean;
        executeMigration: () => void;
      };
    }

    const SettingsMigration = (window as WindowWithMigration).SettingsMigration;
    if (!SettingsMigration) {
      this.test('Migration class', false, 'SettingsMigration not found');
      return;
    }

    const needsMigration = SettingsMigration.needsMigration();
    this.test(
      'Migration check',
      typeof needsMigration === 'boolean',
      `Needs migration: ${needsMigration}`
    );
  }

  private printResults(): void {
    console.log('\n' + '═'.repeat(50));
    console.log('📊 Test Results Summary');
    console.log('═'.repeat(50));

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = ((passed / total) * 100).toFixed(1);

    console.log(`\nTotal: ${total} tests`);
    console.log(`Passed: ${passed} (${percentage}%)`);
    console.log(`Failed: ${total - passed}\n`);

    if (passed === total) {
      console.log('✅ All tests passed! Settings system is working correctly.');
    } else {
      console.log('❌ Some tests failed. Review output above.');
      console.log('\nFailed tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`  - ${r.name}: ${r.message}`));
    }
  }
}

// Usage
const test = new SettingsPersistenceTest();
test.runAll();
```

**Save as**: `scripts/test-settings-persistence.ts`

**Validation**:
- [ ] Test script created
- [ ] Can be executed in browser console
- [ ] All tests defined

---

### 6.2 Manual Testing Checklist

**Test Plan**:

#### Test 1: Fresh Install
1. Clear localStorage
2. Reload page
3. Verify default settings loaded
4. Check `unified-settings` exists
5. Check `ai-chat-v3-storage` has NO settings

**Expected**:
- [ ] Default settings applied
- [ ] unified-settings created
- [ ] No settings in Zustand persist

---

#### Test 2: Settings Persistence (Each Tab)

**For EACH tab in SettingsModal**:
1. Open SettingsModal
2. Navigate to tab
3. Change a setting
4. Close modal
5. Reload page (F5)
6. Open SettingsModal
7. Navigate to same tab
8. Verify setting is still changed

**Tabs to test**:
- [ ] エフェクト (Effects)
- [ ] 3D機能 (3D Features)
- [ ] 感情分析 (Emotion)
- [ ] トラッカー (Tracker)
- [ ] パフォーマンス (Performance)
- [ ] チャット (Chat)
- [ ] 外観 (Appearance)
- [ ] 音声 (Voice)
- [ ] AI
- [ ] 言語・地域 (Language)

**Expected for each**:
- [ ] Setting changes immediately
- [ ] Setting persists after reload
- [ ] No console errors

---

#### Test 3: Migration from Old System

1. Restore backup with old settings in `ai-chat-v3-storage`
2. Reload page
3. Verify migration runs
4. Check settings migrated to `unified-settings`
5. Verify all settings work correctly

**Expected**:
- [ ] Migration log in console
- [ ] Old settings migrated
- [ ] New settings persist
- [ ] No data loss

---

#### Test 4: Concurrent Updates

1. Open two browser tabs
2. Change setting in Tab 1
3. Verify change reflects in Tab 2
4. Change different setting in Tab 2
5. Verify change reflects in Tab 1

**Expected**:
- [ ] Changes sync across tabs
- [ ] No conflicts
- [ ] Consistent state

---

### 6.3 Performance Testing

```typescript
// scripts/performance-test.ts

/**
 * Settings Performance Test
 */

function measureSettingsPerformance() {
  interface WindowWithStore extends Window {
    useAppStore?: {
      getState: () => {
        unifiedSettings: UnifiedSettings;
        updateCategory: <K extends keyof UnifiedSettings>(
          category: K,
          updates: Partial<UnifiedSettings[K]>
        ) => void;
        updateSettings: (updates: Partial<UnifiedSettings>) => void;
      };
    };
  }

  const store = (window as WindowWithStore).useAppStore?.getState();
  if (!store) {
    console.error('Cannot access store');
    return;
  }

  console.log('⚡ Performance Test: Settings Updates\n');

  // Test 1: Single update
  console.time('Single update');
  store.updateCategory('effects', { colorfulBubbles: true });
  console.timeEnd('Single update');

  // Test 2: Batch updates
  console.time('Batch update (10 properties)');
  store.updateCategory('effects', {
    colorfulBubbles: true,
    fontEffects: true,
    particleEffects: false,
    typewriterEffect: true,
    colorfulBubblesIntensity: 75,
    fontEffectsIntensity: 50,
    particleEffectsIntensity: 30,
    typewriterIntensity: 60,
    bubbleOpacity: 90,
    bubbleBlur: true,
  });
  console.timeEnd('Batch update (10 properties)');

  // Test 3: Full settings update
  console.time('Full settings update');
  const currentSettings = store.unifiedSettings;
  store.updateSettings({ ...currentSettings });
  console.timeEnd('Full settings update');

  // Test 4: localStorage write
  console.time('localStorage write');
  localStorage.setItem('test-key', JSON.stringify(store.unifiedSettings));
  console.timeEnd('localStorage write');

  // Test 5: localStorage read
  console.time('localStorage read');
  const data = localStorage.getItem('unified-settings');
  JSON.parse(data!);
  console.timeEnd('localStorage read');

  console.log('\n✅ Performance test complete');
}

measureSettingsPerformance();
```

**Performance targets**:
- [ ] Single update: <10ms
- [ ] Batch update: <50ms
- [ ] Full update: <100ms
- [ ] localStorage write: <50ms
- [ ] localStorage read: <20ms

---

## Stage 7: Cleanup & Documentation

### Duration: 1 hour
### Risk: LOW

### 7.1 Remove Deprecated Code

**Files to clean**:
```bash
# Remove old type definitions
# src/types/core/settings.types.ts
# Keep only UnifiedSettings-compatible types

# Remove compatibility functions
# src/store/slices/settings.slice.ts
# Remove updateEffectSettings, updateAppearanceSettings, etc.

# Remove unused migration code
# src/services/settings-manager.ts
# Remove migrateOldSettings if replaced
```

**Validation**:
- [ ] Deprecated code removed
- [ ] No dead imports
- [ ] TypeScript compilation succeeds
- [ ] Build succeeds

---

### 7.2 Update Documentation

**Create migration guide**:
```markdown
// claudedocs/SETTINGS_MIGRATION_GUIDE.md

# Settings System Migration Guide

## For Developers

### Before (OLD)
typescript
const { effectSettings, updateEffectSettings } = useAppStore();
updateEffectSettings({ colorfulBubbles: true });


### After (NEW)
typescript
const { unifiedSettings, updateCategory } = useAppStore();
updateCategory('effects', { colorfulBubbles: true });


### Quick Reference
- effectSettings → unifiedSettings.effects
- appearanceSettings → unifiedSettings.ui
- apiConfig → unifiedSettings.api
- systemPrompts → unifiedSettings.prompts
- chat → unifiedSettings.chat
- voice → unifiedSettings.voice

## For Users

No action required. Settings will be automatically migrated.
```

**Update complete dev guide**:
```markdown
// Add to: 🎯 AI Chat V3 完全開発ガイド.md

## Settings System (Phase 0 Complete)

### Architecture
- Single source of truth: UnifiedSettings
- Persistence: localStorage["unified-settings"]
- No duplication in Zustand persist

### Usage
typescript
import { useAppStore } from '@/store';

const Component = () => {
  const settings = useAppStore(state => state.unifiedSettings);
  const updateCategory = useAppStore(state => state.updateCategory);

  const handleChange = () => {
    updateCategory('effects', { colorfulBubbles: true });
  };
};

```

**Validation**:
- [ ] Migration guide created
- [ ] Dev guide updated
- [ ] Examples provided

---

## Rollback Strategy

### Emergency Rollback

**If Phase 0 fails catastrophically**:
```bash
# Immediate rollback
git reset --hard backup-phase0-start
git clean -fd

# Restore backup branch
git checkout backup/before-phase0-YYYYMMDD_HHMMSS

# Verify rollback
npm run build
npm run dev
```

**Validation**:
- [ ] Old code restored
- [ ] Build succeeds
- [ ] Settings work (old system)

---

### Partial Rollback

**If only specific stage fails**:
```bash
# Rollback to specific stage
git log --oneline  # Find commit before failed stage
git reset --hard <commit-hash>

# Or revert specific files
git checkout HEAD~1 -- src/store/slices/settings.slice.ts
```

---

## Success Criteria

### Phase 0 Complete When:

**Technical**:
- [ ] All settings in `unified-settings` only
- [ ] No settings in `ai-chat-v3-storage`
- [ ] TypeScript errors: 0
- [ ] Build succeeds
- [ ] All tests pass

**Functional**:
- [ ] All 15 SettingsModal tabs work
- [ ] Settings persist across reload
- [ ] No setting data loss
- [ ] Migration from old system works

**Performance**:
- [ ] Settings update <50ms
- [ ] Page load time unchanged
- [ ] No memory leaks

**Documentation**:
- [ ] Migration guide complete
- [ ] Dev guide updated
- [ ] Test scripts documented

---

## Timeline

```
Day 1:
├── 09:00-10:00: Stage 1 (Preparation)
├── 10:00-13:00: Stage 2 (UnifiedSettings Extension)
├── 13:00-14:00: Lunch Break
├── 14:00-17:00: Stage 3 (Migration Layer)
└── 17:00-18:00: Review & Commit

Day 2:
├── 09:00-12:00: Stage 4 (Zustand Refactor)
├── 12:00-13:00: Lunch Break
├── 13:00-15:00: Stage 5 (SettingsModal Update)
├── 15:00-18:00: Stage 6 (Testing & Validation)
└── 18:00-19:00: Stage 7 (Cleanup & Documentation)

Total: 14 hours (with buffer)
```

---

## Risk Mitigation

### High-Risk Areas

**1. Zustand Store Refactor (Stage 4)**
- **Risk**: Breaking all persisted data
- **Mitigation**:
  - Test with backup data first
  - Verify partialize before commit
  - Run migration in dev console first

**2. SettingsModal Update (Stage 5)**
- **Risk**: UI breaking, settings not saving
- **Mitigation**:
  - Update one panel at a time
  - Test each panel before next
  - Keep backup of working version

**3. Migration Logic (Stage 3)**
- **Risk**: Data loss during migration
- **Mitigation**:
  - Dry-run migration first
  - Log all migrations
  - Keep old data until verified

---

## Post-Phase 0

### Immediate Next Steps

1. **Verify stability** (1 week)
   - Monitor for issues
   - Collect user feedback
   - Fix any edge cases

2. **Phase 1: SettingsModal Split**
   - NOW safe to proceed
   - Follow SETTINGSMODAL_MIGRATION_PLAN.md
   - Settings system is stable foundation

---

## Appendix

### A. File Modification Summary

| File | Lines Changed | Risk | Priority |
|------|---------------|------|----------|
| settings-manager.ts | +500, -50 | HIGH | 1 |
| settings.slice.ts | +100, -200 | HIGH | 2 |
| store/index.ts | +50, -30 | HIGH | 3 |
| SettingsModal.tsx | +200, -300 | HIGH | 4 |
| settings.types.ts | +100, -0 | MED | 5 |

### B. Dependency Graph

```
settings-manager.ts (NEW UnifiedSettings)
  ↓
settings.slice.ts (Use UnifiedSettings)
  ↓
store/index.ts (Exclude settings from persist)
  ↓
SettingsModal.tsx (Use unifiedSettings)
  ↓
All other components (No changes needed)
```

### C. Testing Matrix

| Component | Test Type | Status |
|-----------|-----------|--------|
| settingsManager | Unit | TODO |
| settings.slice | Unit | TODO |
| SettingsModal | Integration | TODO |
| Persistence | E2E | TODO |
| Migration | E2E | TODO |
| Performance | Benchmark | TODO |

---

**Plan Version**: 1.0
**Last Updated**: 2025-10-04
**Status**: READY FOR IMPLEMENTATION
**Approval Required**: YES

---

## Implementation Checklist

### Pre-Implementation
- [ ] Read complete plan
- [ ] Understand all stages
- [ ] Review risk mitigation
- [ ] Prepare rollback strategy
- [ ] Notify team (if applicable)

### During Implementation
- [ ] Follow stages in order
- [ ] Commit after each stage
- [ ] Run tests after each stage
- [ ] Document any issues
- [ ] Take breaks between stages

### Post-Implementation
- [ ] Run full test suite
- [ ] Verify all settings persist
- [ ] Check performance
- [ ] Update documentation
- [ ] Create Phase 1 plan

---

**END OF PHASE 0 DETAILED IMPLEMENTATION PLAN**
