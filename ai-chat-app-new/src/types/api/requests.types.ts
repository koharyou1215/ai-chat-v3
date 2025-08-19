// src/types/api/requests.types.ts
import { Character } from '../core/character.types';
import { Persona } from '../core/persona.types';
import { ConversationContext } from '../core/context.types';

// AIパラメータ型
export interface AIParameters {
  model: string;
  temperature: number;
  max_tokens: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop_sequences?: string[];
  stream?: boolean;
}

// AI生成リクエスト型
export interface AIGenerationRequest {
  prompt: string;
  system_prompt?: string;
  character?: Character;
  persona?: Persona;
  context?: ConversationContext;
  parameters?: AIParameters;
}

// 音声合成リクエスト型
export interface VoiceSynthesisRequest {
  text: string;
  voice_id?: string;
  speaker_id?: number;
  language?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  format?: 'mp3' | 'wav' | 'ogg';
}

// 画像生成リクエスト型
export interface ImageGenerationRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg_scale?: number;
  seed?: number;
  model?: string;
}
