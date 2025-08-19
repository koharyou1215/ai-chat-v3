// src/types/core/expression.types.ts

export interface EmotionState {
    primary: string;
    secondary?: string;
    intensity: number; // 0-1
    emoji?: string;
}

export interface VoiceData {
    url: string;
    duration: number;
    provider: 'voicevox' | 'elevenlabs';
}
