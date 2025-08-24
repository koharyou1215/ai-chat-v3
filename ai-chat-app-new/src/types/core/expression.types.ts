// src/types/core/expression.types.ts

export interface EmotionState {
    primary: string;
    secondary?: string;
    intensity: number; // 0-1
    score?: number; // 0-1, 下位互換性のため（intensityのエイリアス）
    emoji?: string;
}

