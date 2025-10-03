/**
 * UnifiedSettings用カスタムフック
 * Phase 0: Settings System Unification
 */

import { useAppStore } from '@/store';
import { UnifiedSettings } from '@/services/settings-manager';

/**
 * 統一設定全体にアクセスするフック
 */
export function useSettings() {
  const unifiedSettings = useAppStore((state) => state.unifiedSettings);
  const updateSettings = useAppStore((state) => state.updateUnifiedSettings);
  const updateCategory = useAppStore((state) => state.updateCategory);

  return {
    settings: unifiedSettings,
    updateSettings,
    updateCategory,
  };
}

/**
 * 特定のカテゴリのみにアクセスするフック
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

// ═══════════════════════════════════════
// 後方互換性フック
// ═══════════════════════════════════════

/**
 * @deprecated Use useSettingsCategory('effects') instead
 */
export function useEffectSettings() {
  return useSettingsCategory('effects');
}

/**
 * @deprecated Use useSettingsCategory('ui') instead
 */
export function useAppearanceSettings() {
  return useSettingsCategory('ui');
}

/**
 * @deprecated Use useSettingsCategory('api') instead
 */
export function useAPIConfig() {
  return useSettingsCategory('api');
}

/**
 * @deprecated Use useSettingsCategory('prompts') instead
 */
export function useSystemPrompts() {
  return useSettingsCategory('prompts');
}

/**
 * @deprecated Use useSettingsCategory('chat') instead
 */
export function useChatSettings() {
  return useSettingsCategory('chat');
}

/**
 * @deprecated Use useSettingsCategory('voice') instead
 */
export function useVoiceSettings() {
  return useSettingsCategory('voice');
}

/**
 * @deprecated Use useSettingsCategory('imageGeneration') instead
 */
export function useImageGenerationSettings() {
  return useSettingsCategory('imageGeneration');
}

/**
 * @deprecated Use useSettingsCategory('emotionalIntelligence') instead
 */
export function useEmotionalIntelligenceFlags() {
  return useSettingsCategory('emotionalIntelligence');
}
