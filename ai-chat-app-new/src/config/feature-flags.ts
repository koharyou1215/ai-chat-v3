// src/config/feature-flags.ts (新規作成)
export const FEATURE_FLAGS = {
  USE_MEM0_MEMORY_GENERATION: false, // Phase 2で切り替え
  USE_OPTIMIZED_PROMPT: false,        // Phase 3で切り替え
  USE_UNIFIED_VECTOR_STORE: false,    // Phase 4で切り替え
} as const;
